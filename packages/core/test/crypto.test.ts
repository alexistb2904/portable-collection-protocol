import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import test from "node:test";
import {
	signCollection,
	signImportAuthorization,
	verifyCollection,
	verifyImportAuthorization,
	type CollectionPayload,
} from "../src/index.js";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const rawJwk = publicKey.export({ format: "jwk" });
assert.equal(rawJwk.kty, "OKP");
assert.equal(rawJwk.crv, "Ed25519");
assert.ok(rawJwk.x);
const jwk = { kty: "OKP" as const, crv: "Ed25519" as const, x: rawJwk.x };

function payload(): CollectionPayload {
	const instanceId = randomUUID();
	return {
		format: "org.wikicard.collection",
		version: "1.0.0",
		exportId: randomUUID(),
		issuer: { id: "https://source.example/api", name: "Source" },
		subject: { id: "https://source.example/api:user:123", username: "alice" },
		issuedAt: new Date().toISOString(),
		collection: {
			count: 1,
			cards: [
				{
					id: `urn:uuid:${instanceId}`,
					instanceId,
					serialNumber: "42",
					mintedAt: new Date().toISOString(),
					definition: {
						id: randomUUID(),
						canonicalId: "wikidata:Q937",
						wikidataId: "Q937",
						source: {
							provider: "wikipedia",
							language: "en",
							pageId: "736",
							url: "https://en.wikipedia.org/wiki/Albert_Einstein",
						},
						presentation: { title: "Albert Einstein", description: null, imageUrl: null },
					},
					extensions: {},
				},
			],
		},
	};
}

test("signed collection verifies and detects tampering", () => {
	const signed = signCollection(payload(), privateKey);
	assert.ok(verifyCollection(signed, jwk));

	const tampered = structuredClone(signed);
	tampered.payload.collection.cards[0]!.serialNumber = "999";
	assert.equal(verifyCollection(tampered, jwk), null);
});

test("import authorization is bound by its signature", () => {
	const now = Date.now();
	const signed = signImportAuthorization(
		{
			format: "org.wikicard.collection-import-authorization",
			version: "1.0.0",
			authorizationId: randomUUID(),
			issuer: "https://source.example/api",
			subjectId: "https://source.example/api:user:123",
			audience: "https://destination.example/api",
			destinationAccount: "https://destination.example/api:user:abc",
			requestedExportHash: "A".repeat(43),
			liveCollectionHash: "B".repeat(43),
			issuedAt: new Date(now).toISOString(),
			expiresAt: new Date(now + 300_000).toISOString(),
		},
		privateKey
	);
	assert.ok(verifyImportAuthorization(signed, jwk));

	const tampered = structuredClone(signed);
	tampered.payload.destinationAccount = "https://destination.example/api:user:other";
	assert.equal(verifyImportAuthorization(tampered, jwk), null);
});
