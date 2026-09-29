import type { CollectionPayload, SignedCollection } from "@wikicard/portable-collection-core";

export interface ProtocolStore {
	put(key: string, value: string, ttlSeconds: number): Promise<void>;
	take(key: string): Promise<string | null>;
}

export interface CollectionSourceAdapter {
	subjectIdForUser(userId: string): string;
	buildCurrentCollection(userId: string): Promise<CollectionPayload>;
}

export type TrustedPartyPolicy = {
	trustedIssuers: ReadonlySet<string>;
	trustedClients: ReadonlySet<string>;
};

export type VerifiedExternalCollection = {
	issuer: string;
	subjectId: string;
	subjectUsername: string;
	destinationAccount: string;
	requestedExportHash: string;
	liveCollectionHash: string;
	liveCollection: SignedCollection;
	verifiedAt: string;
};

export type FetchLike = typeof fetch;
