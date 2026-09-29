import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import {
	liveCollectionResponseSchema,
	normalizeIssuer,
	validateCollectionStructure,
	verifyCollection,
	verifyImportAuthorization,
} from "@wikicard/portable-collection-core";
import { assertEndpointOnIssuerOrigin, fetchIssuerDocument, findIssuerSigningKey, readJsonLimited } from "./http.js";
import { hashOpaqueToken } from "./store.js";
import type { FetchLike, ProtocolStore, VerifiedExternalCollection } from "./types.js";

const tokenResponseSchema = z
	.object({
		access_token: z.string().min(32),
		token_type: z.literal("Bearer"),
		expires_in: z.number().int().positive().max(900),
		scope: z.literal("collection:read"),
	})
	.strict();

type ImportState = {
	userId: string;
	issuer: string;
	subjectId: string;
	destinationAccount: string;
	originalExportHash: string;
	codeVerifier: string;
	tokenEndpoint: string;
	collectionEndpoint: string;
};

export type DestinationImporterOptions = {
	issuer: string;
	store: ProtocolStore;
	trustedIssuers: ReadonlySet<string>;
	fetcher?: FetchLike;
	importStateTtlSeconds?: number;
	maxLiveAgeMs?: number;
};

function secureToken(bytes: number): string {
	return randomBytes(bytes).toString("base64url");
}

function pkceS256(value: string): string {
	return createHash("sha256").update(value).digest("base64url");
}

export class CollectionDestinationImporter {
	private readonly issuer: string;
	private readonly fetcher: FetchLike;
	private readonly stateTtl: number;
	private readonly maxLiveAge: number;

	constructor(private readonly options: DestinationImporterOptions) {
		this.issuer = normalizeIssuer(options.issuer);
		this.fetcher = options.fetcher ?? fetch;
		this.stateTtl = options.importStateTtlSeconds ?? 600;
		this.maxLiveAge = options.maxLiveAgeMs ?? 120_000;
	}

	private isTrusted(issuer: string): boolean {
		const target = normalizeIssuer(issuer);
		return [...this.options.trustedIssuers].map(normalizeIssuer).includes(target);
	}

	async verifyUploadedExport(value: unknown) {
		const exported = validateCollectionStructure(value);
		const issuer = normalizeIssuer(exported.payload.issuer.id);
		if (!this.isTrusted(issuer)) throw new Error("Collection issuer is not trusted");

		const document = await fetchIssuerDocument(issuer, this.fetcher);
		const key = findIssuerSigningKey(document, exported.proof.keyId);
		const verified = verifyCollection(exported, key);
		if (!verified) throw new Error("Collection signature is invalid");
		return { exported: verified, issuerDocument: document };
	}

	async start(userId: string, destinationAccount: string, value: unknown) {
		if (!destinationAccount.startsWith(`${this.issuer}:user:`)) {
			throw new Error("Destination account must be namespaced under the destination issuer");
		}
		const { exported, issuerDocument } = await this.verifyUploadedExport(value);
		const capabilities = issuerDocument.authorization;
		if (!capabilities || !capabilities.codeChallengeMethods.includes("S256")) {
			throw new Error("Source issuer does not support WIKICARD-AUTH-CODE-1 with PKCE S256");
		}

		assertEndpointOnIssuerOrigin(capabilities.tokenEndpoint, issuerDocument.issuer);
		assertEndpointOnIssuerOrigin(capabilities.collectionEndpoint, issuerDocument.issuer);
		if (new URL(issuerDocument.issuer).protocol === "https:" && new URL(capabilities.authorizationEndpoint).protocol !== "https:") {
			throw new Error("Production authorization endpoint must use HTTPS");
		}

		const verifier = secureToken(48);
		const state = secureToken(32);
		const stored: ImportState = {
			userId,
			issuer: normalizeIssuer(issuerDocument.issuer),
			subjectId: exported.payload.subject.id,
			destinationAccount,
			originalExportHash: exported.proof.payloadHash,
			codeVerifier: verifier,
			tokenEndpoint: capabilities.tokenEndpoint,
			collectionEndpoint: capabilities.collectionEndpoint,
		};
		await this.options.store.put(`import-state:${hashOpaqueToken(state)}`, JSON.stringify(stored), this.stateTtl);

		const url = new URL(capabilities.authorizationEndpoint);
		url.searchParams.set("client_id", this.issuer);
		url.searchParams.set("redirect_uri", `${this.issuer}/collection-transfer/callback`);
		url.searchParams.set("response_type", "code");
		url.searchParams.set("scope", "collection:read");
		url.searchParams.set("state", state);
		url.searchParams.set("code_challenge", pkceS256(verifier));
		url.searchParams.set("code_challenge_method", "S256");
		url.searchParams.set("subject_id", exported.payload.subject.id);
		url.searchParams.set("destination_account", destinationAccount);
		url.searchParams.set("export_hash", exported.proof.payloadHash);

		return { authorizationUrl: url.toString(), stateExpiresIn: this.stateTtl };
	}

	async complete(code: string, state: string): Promise<VerifiedExternalCollection> {
		const raw = await this.options.store.take(`import-state:${hashOpaqueToken(state)}`);
		if (!raw) throw new Error("Import state is invalid, expired or already used");
		const stored = JSON.parse(raw) as ImportState;

		const tokenResponse = await this.fetcher(stored.tokenEndpoint, {
			method: "POST",
			headers: { "content-type": "application/json", accept: "application/json" },
			redirect: "error",
			signal: AbortSignal.timeout(7_000),
			body: JSON.stringify({
				grant_type: "authorization_code",
				code,
				client_id: this.issuer,
				redirect_uri: `${this.issuer}/collection-transfer/callback`,
				code_verifier: stored.codeVerifier,
			}),
		});
		if (!tokenResponse.ok) throw new Error(`Authorization code exchange failed with HTTP ${tokenResponse.status}`);
		const token = tokenResponseSchema.parse(await readJsonLimited(tokenResponse, 65_536));

		const liveResponse = await this.fetcher(stored.collectionEndpoint, {
			headers: { authorization: `Bearer ${token.access_token}`, accept: "application/json" },
			redirect: "error",
			signal: AbortSignal.timeout(10_000),
		});
		if (!liveResponse.ok) throw new Error(`Live collection request failed with HTTP ${liveResponse.status}`);
		const live = liveCollectionResponseSchema.parse(await readJsonLimited(liveResponse, 16 * 1024 * 1024));

		const liveExport = validateCollectionStructure(live.collection);
		if (normalizeIssuer(liveExport.payload.issuer.id) !== stored.issuer) throw new Error("Live issuer mismatch");
		if (liveExport.payload.subject.id !== stored.subjectId) throw new Error("Live subject mismatch");
		const liveIssuedAt = Date.parse(liveExport.payload.issuedAt);
		const nowBeforeAuthorization = Date.now();
		if (!Number.isFinite(liveIssuedAt) || liveIssuedAt > nowBeforeAuthorization + 5 * 60_000) throw new Error("Live collection timestamp is invalid");
		if (nowBeforeAuthorization - liveIssuedAt > this.maxLiveAge) throw new Error("Live collection is stale");

		const document = await fetchIssuerDocument(stored.issuer, this.fetcher);
		const collectionKey = findIssuerSigningKey(document, liveExport.proof.keyId);
		const verifiedCollection = verifyCollection(liveExport, collectionKey);
		if (!verifiedCollection) throw new Error("Live collection signature is invalid");

		const authorizationKey = findIssuerSigningKey(document, live.authorization.proof.keyId);
		const authorization = verifyImportAuthorization(live.authorization, authorizationKey);
		if (!authorization) throw new Error("Live import authorization signature is invalid");

		const now = Date.now();
		if (normalizeIssuer(authorization.payload.issuer) !== stored.issuer) throw new Error("Authorization issuer mismatch");
		if (normalizeIssuer(authorization.payload.audience) !== this.issuer) throw new Error("Authorization audience mismatch");
		if (authorization.payload.subjectId !== stored.subjectId) throw new Error("Authorization subject mismatch");
		if (authorization.payload.destinationAccount !== stored.destinationAccount) throw new Error("Destination account mismatch");
		if (authorization.payload.requestedExportHash !== stored.originalExportHash) throw new Error("Original export hash mismatch");
		if (authorization.payload.liveCollectionHash !== verifiedCollection.proof.payloadHash) throw new Error("Live collection hash mismatch");
		const authorizationIssuedAt = Date.parse(authorization.payload.issuedAt);
		if (!Number.isFinite(authorizationIssuedAt) || authorizationIssuedAt > now + 5 * 60_000) throw new Error("Import authorization timestamp is invalid");
		if (Date.parse(authorization.payload.expiresAt) <= now) throw new Error("Import authorization expired");

		return {
			issuer: stored.issuer,
			subjectId: stored.subjectId,
			subjectUsername: verifiedCollection.payload.subject.username,
			destinationAccount: stored.destinationAccount,
			requestedExportHash: stored.originalExportHash,
			liveCollectionHash: verifiedCollection.proof.payloadHash,
			liveCollection: verifiedCollection,
			verifiedAt: new Date().toISOString(),
		};
	}
}
