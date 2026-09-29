import {
	issuerDocumentSchema,
	normalizeIssuer,
	type IssuerDocument,
	type PublicEd25519Jwk,
} from "@wikicard/portable-collection-core";
import type { FetchLike } from "./types.js";

export async function readJsonLimited(response: Response, maxBytes: number): Promise<unknown> {
	const declared = Number(response.headers.get("content-length") ?? "0");
	if (Number.isFinite(declared) && declared > maxBytes) throw new Error(`Response exceeds ${maxBytes} bytes`);

	if (!response.body) {
		const text = await response.text();
		if (Buffer.byteLength(text, "utf8") > maxBytes) throw new Error(`Response exceeds ${maxBytes} bytes`);
		return JSON.parse(text);
	}

	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		if (!value) continue;
		total += value.byteLength;
		if (total > maxBytes) {
			await reader.cancel("response too large").catch(() => undefined);
			throw new Error(`Response exceeds ${maxBytes} bytes`);
		}
		chunks.push(value);
	}

	const merged = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
	return JSON.parse(merged.toString("utf8"));
}

export async function fetchIssuerDocument(
	issuer: string,
	fetcher: FetchLike = fetch,
	timeoutMs = 5_000
): Promise<IssuerDocument> {
	const normalized = normalizeIssuer(issuer);
	const response = await fetcher(`${normalized}/.well-known/wikicard-issuer.json`, {
		headers: { accept: "application/json" },
		redirect: "error",
		signal: AbortSignal.timeout(timeoutMs),
	});
	if (!response.ok) throw new Error(`Issuer discovery failed with HTTP ${response.status}`);

	const raw = await readJsonLimited(response, 65_536);
	const parsed = issuerDocumentSchema.parse(raw) as IssuerDocument;
	if (normalizeIssuer(parsed.issuer) !== normalized) throw new Error("Issuer discovery identity mismatch");
	return parsed;
}

export function findIssuerSigningKey(document: IssuerDocument, keyId: string): PublicEd25519Jwk {
	const key = document.keys.find((candidate) => candidate.id === keyId);
	if (!key) throw new Error(`Signing key not found: ${keyId}`);
	return { kty: "OKP", crv: "Ed25519", x: key.x };
}

export function assertEndpointOnIssuerOrigin(endpoint: string, issuer: string): void {
	if (new URL(endpoint).origin !== new URL(issuer).origin) {
		throw new Error("Server-to-server endpoint must remain on the trusted issuer origin");
	}
}
