import { createHash, randomBytes, randomUUID, type KeyObject } from "node:crypto";
import { z } from "zod";
import {
	AUTHORIZATION_PROTOCOL,
	COLLECTION_FORMAT,
	COLLECTION_VERSION,
	keyIdForJwk,
	normalizeIssuer,
	publicJwkFromPrivateKey,
	signCollection,
	signImportAuthorization,
	type IssuerDocument,
	type PublicEd25519Jwk,
} from "@wikicard/portable-collection-core";
import { hashOpaqueToken } from "./store.js";
import type { CollectionSourceAdapter, ProtocolStore } from "./types.js";

const requestSchema = z
	.object({
		client_id: z.string().url().max(2048),
		redirect_uri: z.string().url().max(2048),
		response_type: z.literal("code"),
		scope: z.literal("collection:read"),
		state: z.string().min(32).max(512),
		code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
		code_challenge_method: z.literal("S256"),
		subject_id: z.string().min(1).max(2048),
		destination_account: z.string().min(1).max(2048),
		export_hash: z.string().regex(/^[A-Za-z0-9_-]+$/).max(128),
	})
	.strict();

const tokenSchema = z
	.object({
		grant_type: z.literal("authorization_code"),
		code: z.string().min(32).max(512),
		client_id: z.string().url().max(2048),
		redirect_uri: z.string().url().max(2048),
		code_verifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
	})
	.strict();

type StoredCode = {
	userId: string;
	clientId: string;
	redirectUri: string;
	subjectId: string;
	destinationAccount: string;
	exportHash: string;
	codeChallenge: string;
};

type StoredToken = Omit<StoredCode, "redirectUri" | "codeChallenge">;

export type AuthorizationServerOptions = {
	issuer: string;
	webOrigin: string;
	privateKey: KeyObject;
	store: ProtocolStore;
	source: CollectionSourceAdapter;
	trustedClients: ReadonlySet<string>;
	additionalPublishedKeys?: ReadonlyArray<PublicEd25519Jwk>;
	codeTtlSeconds?: number;
	tokenTtlSeconds?: number;
};

function secureToken(bytes: number): string {
	return randomBytes(bytes).toString("base64url");
}

function pkceS256(value: string): string {
	return createHash("sha256").update(value).digest("base64url");
}

export class CollectionAuthorizationServer {
	private readonly issuer: string;
	private readonly codeTtl: number;
	private readonly tokenTtl: number;

	constructor(private readonly options: AuthorizationServerOptions) {
		this.issuer = normalizeIssuer(options.issuer);
		this.codeTtl = options.codeTtlSeconds ?? 180;
		this.tokenTtl = options.tokenTtlSeconds ?? 300;
	}

	private trustedClient(clientId: string): boolean {
		const normalized = normalizeIssuer(clientId);
		return [...this.options.trustedClients].map(normalizeIssuer).includes(normalized);
	}

	private expectedRedirect(clientId: string): string {
		return `${normalizeIssuer(clientId)}/collection-transfer/callback`;
	}

	private validate(userId: string, raw: unknown) {
		const request = requestSchema.parse(raw);
		const clientId = normalizeIssuer(request.client_id);
		if (!this.trustedClient(clientId)) throw new Error("Destination client is not trusted");
		if (this.options.webOrigin.startsWith("https://") && new URL(clientId).protocol !== "https:") {
			throw new Error("Production destination clients must use HTTPS");
		}
		if (request.redirect_uri !== this.expectedRedirect(clientId)) {
			throw new Error("Invalid destination redirect URI");
		}
		if (!request.destination_account.startsWith(`${clientId}:user:`)) {
			throw new Error("Destination account is outside the destination client namespace");
		}
		const subjectId = this.options.source.subjectIdForUser(userId);
		if (request.subject_id !== subjectId) throw new Error("Authenticated source account does not match export subject");
		return { request, clientId, subjectId };
	}

	inspect(userId: string, raw: unknown) {
		const { request, clientId } = this.validate(userId, raw);
		return {
			clientId,
			clientHost: new URL(clientId).hostname,
			scope: request.scope,
			codeExpiresIn: this.codeTtl,
		};
	}

	async authorize(userId: string, raw: unknown) {
		const { request, clientId, subjectId } = this.validate(userId, raw);
		const code = secureToken(32);
		const stored: StoredCode = {
			userId,
			clientId,
			redirectUri: request.redirect_uri,
			subjectId,
			destinationAccount: request.destination_account,
			exportHash: request.export_hash,
			codeChallenge: request.code_challenge,
		};
		await this.options.store.put(`auth-code:${hashOpaqueToken(code)}`, JSON.stringify(stored), this.codeTtl);

		const redirect = new URL(request.redirect_uri);
		redirect.searchParams.set("code", code);
		redirect.searchParams.set("state", request.state);
		return { redirectUrl: redirect.toString(), expiresIn: this.codeTtl };
	}

	async exchangeCode(raw: unknown) {
		const request = tokenSchema.parse(raw);
		const storedRaw = await this.options.store.take(`auth-code:${hashOpaqueToken(request.code)}`);
		if (!storedRaw) throw new Error("Authorization code is invalid, expired or already used");
		const stored = JSON.parse(storedRaw) as StoredCode;

		if (normalizeIssuer(request.client_id) !== stored.clientId || request.redirect_uri !== stored.redirectUri) {
			throw new Error("Authorization code client binding mismatch");
		}
		if (pkceS256(request.code_verifier) !== stored.codeChallenge) throw new Error("PKCE verification failed");

		const accessToken = secureToken(48);
		const token: StoredToken = {
			userId: stored.userId,
			clientId: stored.clientId,
			subjectId: stored.subjectId,
			destinationAccount: stored.destinationAccount,
			exportHash: stored.exportHash,
		};
		await this.options.store.put(`access-token:${hashOpaqueToken(accessToken)}`, JSON.stringify(token), this.tokenTtl);
		return {
			access_token: accessToken,
			token_type: "Bearer" as const,
			expires_in: this.tokenTtl,
			scope: "collection:read" as const,
		};
	}

	async consumeLiveCollection(accessToken: string) {
		const raw = await this.options.store.take(`access-token:${hashOpaqueToken(accessToken)}`);
		if (!raw) throw new Error("Live collection token is invalid, expired or already used");
		const stored = JSON.parse(raw) as StoredToken;

		const payload = await this.options.source.buildCurrentCollection(stored.userId);
		if (payload.subject.id !== stored.subjectId) throw new Error("Collection source returned a different subject");
		const collection = signCollection(payload, this.options.privateKey);

		const now = Date.now();
		const authorization = signImportAuthorization(
			{
				format: "org.wikicard.collection-import-authorization",
				version: "1.0.0",
				authorizationId: randomUUID(),
				issuer: this.issuer,
				subjectId: stored.subjectId,
				audience: stored.clientId,
				destinationAccount: stored.destinationAccount,
				requestedExportHash: stored.exportHash,
				liveCollectionHash: collection.proof.payloadHash,
				issuedAt: new Date(now).toISOString(),
				expiresAt: new Date(now + this.tokenTtl * 1000).toISOString(),
			},
			this.options.privateKey
		);

		return { authorization, collection };
	}

	issuerDocument(): IssuerDocument {
		const jwk = publicJwkFromPrivateKey(this.options.privateKey);
		const published = [jwk, ...(this.options.additionalPublishedKeys ?? [])];
		const unique = new Map(published.map((key) => [keyIdForJwk(key), key]));
		return {
			issuer: this.issuer,
			protocol: COLLECTION_FORMAT,
			version: COLLECTION_VERSION,
			keys: [...unique].map(([id, key]) => ({ id, use: "sig" as const, alg: "EdDSA" as const, ...key })),
			authorization: {
				protocol: AUTHORIZATION_PROTOCOL,
				authorizationEndpoint: `${normalizeIssuer(this.options.webOrigin)}/collection/authorize`,
				tokenEndpoint: `${this.issuer}/collection-transfer/token`,
				collectionEndpoint: `${this.issuer}/collection-transfer/current`,
				codeChallengeMethods: ["S256"],
			},
			contact: { discord: "alexistb2904", email: "wikicard@alexistb.com" },
		};
	}
}
