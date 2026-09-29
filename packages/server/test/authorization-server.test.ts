import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomUUID } from "node:crypto";
import test from "node:test";
import type { CollectionPayload } from "@wikicard/portable-collection-core";
import {
	CollectionAuthorizationServer,
	MemoryProtocolStore,
	type CollectionSourceAdapter,
} from "../src/index.js";

const issuer = "https://source.example/api";
const client = "https://destination.example/api";
const verifier = "a".repeat(64);
const challenge = createHash("sha256").update(verifier).digest("base64url");

function source(): CollectionSourceAdapter {
	return {
		subjectIdForUser(userId) {
			return `${issuer}:user:${userId}`;
		},
		async buildCurrentCollection(userId): Promise<CollectionPayload> {
			return {
				format: "org.wikicard.collection",
				version: "1.0.0",
				exportId: randomUUID(),
				issuer: { id: issuer, name: "Source" },
				subject: { id: `${issuer}:user:${userId}`, username: "alice" },
				issuedAt: new Date().toISOString(),
				collection: { count: 0, cards: [] },
			};
		},
	};
}

function request(userId: string) {
	return {
		client_id: client,
		redirect_uri: `${client}/collection-transfer/callback`,
		response_type: "code" as const,
		scope: "collection:read" as const,
		state: "s".repeat(48),
		code_challenge: challenge,
		code_challenge_method: "S256" as const,
		subject_id: `${issuer}:user:${userId}`,
		destination_account: `${client}:user:destination`,
		export_hash: "A".repeat(43),
	};
}

test("authorization code and live token are one-time and destination-bound", async () => {
	const { privateKey } = generateKeyPairSync("ed25519");
	const server = new CollectionAuthorizationServer({
		issuer,
		webOrigin: "https://source.example",
		privateKey,
		store: new MemoryProtocolStore(),
		source: source(),
		trustedClients: new Set([client]),
	});
	const userId = randomUUID();
	const granted = await server.authorize(userId, request(userId));
	const code = new URL(granted.redirectUrl).searchParams.get("code");
	assert.ok(code);

	const token = await server.exchangeCode({
		grant_type: "authorization_code",
		code,
		client_id: client,
		redirect_uri: `${client}/collection-transfer/callback`,
		code_verifier: verifier,
	});

	await assert.rejects(
		() =>
			server.exchangeCode({
				grant_type: "authorization_code",
				code,
				client_id: client,
				redirect_uri: `${client}/collection-transfer/callback`,
				code_verifier: verifier,
			}),
		/already used/
	);

	const live = await server.consumeLiveCollection(token.access_token);
	assert.equal(live.authorization.payload.audience, client);
	assert.equal(live.authorization.payload.destinationAccount, `${client}:user:destination`);
	assert.equal(live.collection.payload.subject.id, `${issuer}:user:${userId}`);

	await assert.rejects(() => server.consumeLiveCollection(token.access_token), /already used/);
});

test("source account mismatch is rejected", async () => {
	const { privateKey } = generateKeyPairSync("ed25519");
	const server = new CollectionAuthorizationServer({
		issuer,
		webOrigin: "https://source.example",
		privateKey,
		store: new MemoryProtocolStore(),
		source: source(),
		trustedClients: new Set([client]),
	});

	await assert.rejects(
		() => server.authorize(randomUUID(), request(randomUUID())),
		/does not match export subject/
	);
});
