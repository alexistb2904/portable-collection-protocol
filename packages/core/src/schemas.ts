import { z } from "zod";
import {
	AUTHORIZATION_FORMAT,
	AUTHORIZATION_PROTOCOL,
	AUTHORIZATION_VERSION,
	CANONICALIZATION,
	COLLECTION_FORMAT,
	COLLECTION_VERSION,
} from "./constants.js";

export const portableCardSchema = z
	.object({
		id: z.string().min(1).max(256),
		instanceId: z.string().uuid(),
		serialNumber: z.string().regex(/^[0-9]+$/).max(40),
		mintedAt: z.string().datetime(),
		definition: z
			.object({
				id: z.string().uuid(),
				canonicalId: z.string().min(1).max(256),
				wikidataId: z.string().regex(/^Q[1-9][0-9]*$/).nullable(),
				source: z
					.object({
						provider: z.literal("wikipedia"),
						language: z.string().min(2).max(16),
						pageId: z.string().regex(/^[0-9]+$/).max(40),
						url: z.string().url().max(2048),
					})
					.strict(),
				presentation: z
					.object({
						title: z.string().max(1000),
						description: z.string().max(5000).nullable(),
						imageUrl: z.string().max(4096).nullable(),
					})
					.strict(),
			})
			.strict(),
		extensions: z.record(z.string().max(200), z.unknown()),
	})
	.strict();

export const collectionPayloadSchema = z
	.object({
		format: z.literal(COLLECTION_FORMAT),
		version: z.literal(COLLECTION_VERSION),
		exportId: z.string().uuid(),
		issuer: z.object({ id: z.string().url().max(2048), name: z.string().min(1).max(200) }).strict(),
		subject: z.object({ id: z.string().min(1).max(2048), username: z.string().min(1).max(200) }).strict(),
		issuedAt: z.string().datetime(),
		collection: z
			.object({
				count: z.number().int().min(0).max(20_000),
				cards: z.array(portableCardSchema).max(20_000),
			})
			.strict(),
	})
	.strict();

export const signatureProofSchema = z
	.object({
		type: z.literal("Ed25519Signature"),
		algorithm: z.literal("Ed25519"),
		canonicalization: z.literal(CANONICALIZATION),
		keyId: z.string().regex(/^ed25519-sha256-[A-Za-z0-9_-]+$/).max(160),
		payloadHash: z.string().regex(/^[A-Za-z0-9_-]+$/).max(128),
		signature: z.string().regex(/^[A-Za-z0-9_-]+$/).max(256),
	})
	.strict();

export const signedCollectionSchema = z.object({ payload: collectionPayloadSchema, proof: signatureProofSchema }).strict();

export const authorizationCapabilitiesSchema = z
	.object({
		protocol: z.literal(AUTHORIZATION_PROTOCOL),
		authorizationEndpoint: z.string().url().max(2048),
		tokenEndpoint: z.string().url().max(2048),
		collectionEndpoint: z.string().url().max(2048),
		codeChallengeMethods: z.array(z.literal("S256")).min(1).max(4),
	})
	.strict();

export const issuerDocumentSchema = z
	.object({
		issuer: z.string().url().max(2048),
		protocol: z.literal(COLLECTION_FORMAT),
		version: z.literal(COLLECTION_VERSION),
		keys: z
			.array(
				z
					.object({
						id: z.string().max(160),
						use: z.literal("sig"),
						alg: z.literal("EdDSA"),
						kty: z.literal("OKP"),
						crv: z.literal("Ed25519"),
						x: z.string().regex(/^[A-Za-z0-9_-]+$/).max(128),
					})
					.strict()
			)
			.max(32),
		verification: z.record(z.string(), z.unknown()).optional(),
		authorization: authorizationCapabilitiesSchema.optional(),
		contact: z
			.object({
				discord: z.string().max(200).optional(),
				email: z.string().email().max(320).optional(),
			})
			.strict()
			.optional(),
	})
	.passthrough();

export const importAuthorizationPayloadSchema = z
	.object({
		format: z.literal(AUTHORIZATION_FORMAT),
		version: z.literal(AUTHORIZATION_VERSION),
		authorizationId: z.string().uuid(),
		issuer: z.string().url().max(2048),
		subjectId: z.string().min(1).max(2048),
		audience: z.string().url().max(2048),
		destinationAccount: z.string().min(1).max(2048),
		requestedExportHash: z.string().regex(/^[A-Za-z0-9_-]+$/).max(128),
		liveCollectionHash: z.string().regex(/^[A-Za-z0-9_-]+$/).max(128),
		issuedAt: z.string().datetime(),
		expiresAt: z.string().datetime(),
	})
	.strict();

export const signedImportAuthorizationSchema = z
	.object({ payload: importAuthorizationPayloadSchema, proof: signatureProofSchema })
	.strict();

export const liveCollectionResponseSchema = z
	.object({
		authorization: signedImportAuthorizationSchema,
		collection: signedCollectionSchema,
	})
	.strict();
