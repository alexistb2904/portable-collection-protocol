import { Injectable } from "@nestjs/common";
import { Redis } from "ioredis";
import { signCollection } from "@wikicard/portable-collection-core";
import {
	CollectionAuthorizationServer,
	CollectionDestinationImporter,
	RedisProtocolStore,
	type VerifiedExternalCollection,
} from "@wikicard/portable-collection-server";
import { config } from "./config.js";
import { createCollectionSource } from "./site-adapter.js";

@Injectable()
export class ProtocolService {
	readonly source = createCollectionSource(config.issuer);
	readonly linked = new Map<string, VerifiedExternalCollection>();

	private readonly redis = new Redis(config.REDIS_URL);
	private readonly store = new RedisProtocolStore(this.redis, "nest:portable-collection:");

	readonly authorizationServer = new CollectionAuthorizationServer({
		issuer: config.issuer,
		webOrigin: config.webOrigin,
		privateKey: config.privateKey,
		store: this.store,
		source: this.source,
		trustedClients: config.trustedClients,
	});

	readonly importer = new CollectionDestinationImporter({
		issuer: config.issuer,
		store: this.store,
		trustedIssuers: config.trustedIssuers,
	});

	async exportFor(userId: string) {
		return signCollection(await this.source.buildCurrentCollection(userId), config.privateKey);
	}
}
