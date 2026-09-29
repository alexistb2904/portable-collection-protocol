import type {
	AUTHORIZATION_FORMAT,
	AUTHORIZATION_PROTOCOL,
	AUTHORIZATION_VERSION,
	CANONICALIZATION,
	COLLECTION_FORMAT,
	COLLECTION_VERSION,
} from "./constants.js";

export type PublicEd25519Jwk = {
	kty: "OKP";
	crv: "Ed25519";
	x: string;
};

export type PortableCard = {
	id: string;
	instanceId: string;
	serialNumber: string;
	mintedAt: string;
	definition: {
		id: string;
		canonicalId: string;
		wikidataId: string | null;
		source: {
			provider: "wikipedia";
			language: string;
			pageId: string;
			url: string;
		};
		presentation: {
			title: string;
			description: string | null;
			imageUrl: string | null;
		};
	};
	extensions: Record<string, unknown>;
};

export type CollectionPayload = {
	format: typeof COLLECTION_FORMAT;
	version: typeof COLLECTION_VERSION;
	exportId: string;
	issuer: { id: string; name: string };
	subject: { id: string; username: string };
	issuedAt: string;
	collection: {
		count: number;
		cards: PortableCard[];
	};
};

export type SignatureProof = {
	type: "Ed25519Signature";
	algorithm: "Ed25519";
	canonicalization: typeof CANONICALIZATION;
	keyId: string;
	payloadHash: string;
	signature: string;
};

export type SignedCollection = {
	payload: CollectionPayload;
	proof: SignatureProof;
};

export type AuthorizationCapabilities = {
	protocol: typeof AUTHORIZATION_PROTOCOL;
	authorizationEndpoint: string;
	tokenEndpoint: string;
	collectionEndpoint: string;
	codeChallengeMethods: Array<"S256">;
};

export type IssuerDocument = {
	issuer: string;
	protocol: typeof COLLECTION_FORMAT;
	version: typeof COLLECTION_VERSION;
	keys: Array<{
		id: string;
		use: "sig";
		alg: "EdDSA";
		kty: "OKP";
		crv: "Ed25519";
		x: string;
	}>;
	verification?: {
		signatureContext?: string;
		canonicalization?: string;
		schema?: string;
	};
	authorization?: AuthorizationCapabilities;
	contact?: {
		discord?: string;
		email?: string;
	};
};

export type ImportAuthorizationPayload = {
	format: typeof AUTHORIZATION_FORMAT;
	version: typeof AUTHORIZATION_VERSION;
	authorizationId: string;
	issuer: string;
	subjectId: string;
	audience: string;
	destinationAccount: string;
	requestedExportHash: string;
	liveCollectionHash: string;
	issuedAt: string;
	expiresAt: string;
};

export type SignedImportAuthorization = {
	payload: ImportAuthorizationPayload;
	proof: SignatureProof;
};

export type LiveCollectionResponse = {
	authorization: SignedImportAuthorization;
	collection: SignedCollection;
};
