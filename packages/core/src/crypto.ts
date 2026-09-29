import { createHash, createPrivateKey, createPublicKey, sign, timingSafeEqual, verify, type KeyObject } from "node:crypto";
import {
	AUTHORIZATION_SIGNATURE_CONTEXT,
	COLLECTION_SIGNATURE_CONTEXT,
} from "./constants.js";
import { canonicalizeJson } from "./canonical-json.js";
import {
	collectionPayloadSchema,
	importAuthorizationPayloadSchema,
	signedCollectionSchema,
	signedImportAuthorizationSchema,
} from "./schemas.js";
import type {
	CollectionPayload,
	ImportAuthorizationPayload,
	PublicEd25519Jwk,
	SignedCollection,
	SignedImportAuthorization,
} from "./types.js";

function equalText(left: string, right: string): boolean {
	const a = Buffer.from(left);
	const b = Buffer.from(right);
	return a.length === b.length && timingSafeEqual(a, b);
}

export function privateKeyFromBase64Pkcs8(value: string): KeyObject {
	return createPrivateKey({
		key: Buffer.from(value, "base64"),
		format: "der",
		type: "pkcs8",
	});
}

export function publicJwkFromPrivateKey(privateKey: KeyObject): PublicEd25519Jwk {
	const jwk = createPublicKey(privateKey).export({ format: "jwk" });
	if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || !jwk.x) {
		throw new TypeError("Expected an Ed25519 private key");
	}
	return { kty: "OKP", crv: "Ed25519", x: jwk.x };
}

export function keyIdForJwk(jwk: PublicEd25519Jwk): string {
	const canonical = canonicalizeJson({ crv: jwk.crv, kty: jwk.kty, x: jwk.x });
	return `ed25519-sha256-${createHash("sha256").update(canonical).digest("base64url")}`;
}

function signPayload<T extends object>(payload: T, context: string, privateKey: KeyObject) {
	const input = Buffer.from(context + canonicalizeJson(payload), "utf8");
	const publicJwk = publicJwkFromPrivateKey(privateKey);
	return {
		type: "Ed25519Signature" as const,
		algorithm: "Ed25519" as const,
		canonicalization: "WIKICARD-C14N-JSON-1" as const,
		keyId: keyIdForJwk(publicJwk),
		payloadHash: createHash("sha256").update(input).digest("base64url"),
		signature: sign(null, input, privateKey).toString("base64url"),
	};
}

function verifyPayload<T extends object>(
	payload: T,
	proof: SignedCollection["proof"],
	context: string,
	publicJwk: PublicEd25519Jwk
): boolean {
	if (proof.keyId !== keyIdForJwk(publicJwk)) return false;
	const input = Buffer.from(context + canonicalizeJson(payload), "utf8");
	const expectedHash = createHash("sha256").update(input).digest("base64url");
	if (!equalText(expectedHash, proof.payloadHash)) return false;

	try {
		const publicKey = createPublicKey({ key: publicJwk, format: "jwk" });
		return verify(null, input, publicKey, Buffer.from(proof.signature, "base64url"));
	} catch {
		return false;
	}
}

export function signCollection(payload: CollectionPayload, privateKey: KeyObject): SignedCollection {
	const valid = collectionPayloadSchema.parse(payload);
	return { payload: valid, proof: signPayload(valid, COLLECTION_SIGNATURE_CONTEXT, privateKey) };
}

export function verifyCollection(value: unknown, publicJwk: PublicEd25519Jwk): SignedCollection | null {
	const parsed = signedCollectionSchema.safeParse(value);
	if (!parsed.success) return null;
	return verifyPayload(parsed.data.payload, parsed.data.proof, COLLECTION_SIGNATURE_CONTEXT, publicJwk)
		? parsed.data
		: null;
}

export function signImportAuthorization(
	payload: ImportAuthorizationPayload,
	privateKey: KeyObject
): SignedImportAuthorization {
	const valid = importAuthorizationPayloadSchema.parse(payload);
	return { payload: valid, proof: signPayload(valid, AUTHORIZATION_SIGNATURE_CONTEXT, privateKey) };
}

export function verifyImportAuthorization(
	value: unknown,
	publicJwk: PublicEd25519Jwk
): SignedImportAuthorization | null {
	const parsed = signedImportAuthorizationSchema.safeParse(value);
	if (!parsed.success) return null;
	return verifyPayload(parsed.data.payload, parsed.data.proof, AUTHORIZATION_SIGNATURE_CONTEXT, publicJwk)
		? parsed.data
		: null;
}
