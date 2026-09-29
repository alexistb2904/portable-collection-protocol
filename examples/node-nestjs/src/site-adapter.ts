import { createHash, randomUUID } from "node:crypto";
import type { Request } from "express";
import type { CollectionPayload } from "@wikicard/portable-collection-core";
import type { CollectionSourceAdapter } from "@wikicard/portable-collection-server";

function stableUuid(seed: string): string {
	const chars = createHash("sha256").update(seed).digest("hex").slice(0, 32).split("");
	chars[12] = "5";
	chars[16] = ((Number.parseInt(chars[16]!, 16) & 0x3) | 0x8).toString(16);
	const value = chars.join("");
	return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function requireSiteUser(request: Request) {
	const id = request.header("x-demo-user-id");
	if (!id) throw Object.assign(new Error("Demo user header required"), { statusCode: 401 });
	return { id, username: `demo_${id.slice(0, 8)}` };
}

export function createCollectionSource(issuer: string): CollectionSourceAdapter {
	return {
		subjectIdForUser(userId) {
			return `${issuer}:user:${userId}`;
		},
		async buildCurrentCollection(userId): Promise<CollectionPayload> {
			const instanceId = stableUuid(`nest-demo:${userId}:Q937`);
			const cards = [{
				id: `urn:uuid:${instanceId}`,
				instanceId,
				serialNumber: "1",
				mintedAt: "2026-01-01T00:00:00.000Z",
				definition: {
					id: stableUuid("nest-demo:definition:Q937"),
					canonicalId: "wikidata:Q937",
					wikidataId: "Q937",
					source: { provider: "wikipedia" as const, language: "en", pageId: "736", url: "https://en.wikipedia.org/wiki/Albert_Einstein" },
					presentation: { title: "Albert Einstein", description: "German-born theoretical physicist", imageUrl: null },
				},
				extensions: { "com.example.nest.v1": { rarity: "legendary" } },
			}];

			return {
				format: "org.wikicard.collection",
				version: "1.0.0",
				exportId: randomUUID(),
				issuer: { id: issuer, name: "NestJS Example" },
				subject: { id: `${issuer}:user:${userId}`, username: `demo_${userId.slice(0, 8)}` },
				issuedAt: new Date().toISOString(),
				collection: { count: cards.length, cards },
			};
		},
	};
}
