import { issuerDocumentSchema, signedCollectionSchema } from "./schemas.js";
import type { IssuerDocument, SignedCollection } from "./types.js";

export function normalizeIssuer(value: string): string {
	return value.replace(/\/+$/, "");
}

export function validateCollectionStructure(value: unknown): SignedCollection {
	const exported = signedCollectionSchema.parse(value);
	if (exported.payload.collection.count !== exported.payload.collection.cards.length) {
		throw new Error("collection.count does not match collection.cards.length");
	}

	const ids = new Set<string>();
	for (const card of exported.payload.collection.cards) {
		if (ids.has(card.instanceId)) throw new Error(`Duplicate card instanceId: ${card.instanceId}`);
		ids.add(card.instanceId);

		const expected = card.definition.wikidataId
			? `wikidata:${card.definition.wikidataId}`
			: `wikipedia:${card.definition.source.language}:${card.definition.source.pageId}`;
		if (card.definition.canonicalId !== expected) {
			throw new Error(`Invalid canonicalId for card ${card.instanceId}`);
		}
	}
	return exported;
}

export function validateIssuerDocument(value: unknown, expectedIssuer?: string): IssuerDocument {
	const document = issuerDocumentSchema.parse(value) as IssuerDocument;
	if (expectedIssuer && normalizeIssuer(document.issuer) !== normalizeIssuer(expectedIssuer)) {
		throw new Error("Issuer discovery document does not match the expected issuer");
	}
	return document;
}

export function assertTrustedIssuer(issuer: string, trustedIssuers: Iterable<string>): void {
	const normalized = normalizeIssuer(issuer);
	const trusted = new Set([...trustedIssuers].map(normalizeIssuer));
	if (!trusted.has(normalized)) throw new Error(`Untrusted collection issuer: ${normalized}`);
}
