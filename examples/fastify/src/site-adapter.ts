import { createHash, randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import type { CollectionPayload } from "@wikicard/portable-collection-core";
import type { CollectionSourceAdapter } from "@wikicard/portable-collection-server";

export type AuthenticatedSiteUser = {
	id: string;
	username: string;
};

function stableUuid(seed: string): string {
	const chars = createHash("sha256").update(seed).digest("hex").slice(0, 32).split("");
	chars[12] = "5";
	const variant = Number.parseInt(chars[16]!, 16);
	chars[16] = ((variant & 0x3) | 0x8).toString(16);
	const value = chars.join("");
	return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

/**
 * Replace this function with the host application's existing authentication.
 *
 * The demo header MUST NOT be used in production. The reference server refuses
 * to start with NODE_ENV=production until this adapter is replaced.
 */
export async function requireSiteUser(request: FastifyRequest): Promise<AuthenticatedSiteUser> {
	const userId = request.headers["x-demo-user-id"];
	if (typeof userId !== "string" || !userId) throw Object.assign(new Error("Demo user header required"), { statusCode: 401 });
	return { id: userId, username: `demo_${userId.slice(0, 8)}` };
}

export function createCollectionSource(issuer: string): CollectionSourceAdapter {
	return {
		subjectIdForUser(userId) {
			return `${issuer}:user:${userId}`;
		},

		async buildCurrentCollection(userId): Promise<CollectionPayload> {
			/*
			 * Replace this demo card with an authoritative DB query.
			 *
			 * Critical rule: this method is called AFTER live authorization.
			 * It must rebuild current ownership and must never read the uploaded backup.
			 */
			const user = { id: userId, username: `demo_${userId.slice(0, 8)}` };
			const instanceId = stableUuid(`demo-instance:${userId}:Q937`);
			const definitionId = stableUuid("demo-definition:Q937");
			const serialNumber = BigInt(`0x${createHash("sha256").update(instanceId).digest("hex").slice(0, 12)}`).toString();
			const cards = [
				{
					id: `urn:uuid:${instanceId}`,
					instanceId,
					serialNumber,
					mintedAt: "2026-01-01T00:00:00.000Z",
					definition: {
						id: definitionId,
						canonicalId: "wikidata:Q937",
						wikidataId: "Q937",
						source: {
							provider: "wikipedia" as const,
							language: "en",
							pageId: "736",
							url: "https://en.wikipedia.org/wiki/Albert_Einstein",
						},
						presentation: {
							title: "Albert Einstein",
							description: "German-born theoretical physicist",
							imageUrl: null,
						},
					},
					extensions: {
						"com.example.demo.v1": { rarity: "legendary" },
					},
				},
			];

			return {
				format: "org.wikicard.collection",
				version: "1.0.0",
				exportId: randomUUID(),
				issuer: { id: issuer, name: "Fastify Protocol Example" },
				subject: { id: `${issuer}:user:${user.id}`, username: user.username },
				issuedAt: new Date().toISOString(),
				collection: { count: cards.length, cards },
			};
		},
	};
}
