import Fastify from "fastify";
import { Redis } from "ioredis";
import {
	signCollection,
	type SignedCollection,
} from "@wikicard/portable-collection-core";
import {
	CollectionAuthorizationServer,
	CollectionDestinationImporter,
	RedisProtocolStore,
	type VerifiedExternalCollection,
} from "@wikicard/portable-collection-server";
import { z } from "zod";
import { config } from "./config.js";
import { createCollectionSource, requireSiteUser } from "./site-adapter.js";

const app = Fastify({ logger: true, bodyLimit: 8 * 1024 * 1024 });
const redis = new Redis(config.REDIS_URL);
const store = new RedisProtocolStore(redis, "example:portable-collection:");
const source = createCollectionSource(config.issuer);

const authorizationServer = new CollectionAuthorizationServer({
	issuer: config.issuer,
	webOrigin: config.webOrigin,
	privateKey: config.privateKey,
	store,
	source,
	trustedClients: config.trustedClients,
});

const importer = new CollectionDestinationImporter({
	issuer: config.issuer,
	store,
	trustedIssuers: config.trustedIssuers,
});

const linked = new Map<string, VerifiedExternalCollection>();

app.get("/healthz", async () => ({ ok: true }));

app.get("/.well-known/wikicard-issuer.json", async (_request, reply) => {
	reply.header("Cache-Control", "public, max-age=300");
	reply.header("Access-Control-Allow-Origin", "*");
	return authorizationServer.issuerDocument();
});

app.get("/collection/export", async (request, reply) => {
	const user = await requireSiteUser(request);
	const payload = await source.buildCurrentCollection(user.id);
	const exported: SignedCollection = signCollection(payload, config.privateKey);
	reply.header("Cache-Control", "no-store");
	reply.header("Content-Disposition", `attachment; filename="portable-collection-${user.id}.json"`);
	return exported;
});

app.post("/collection-transfer/authorize/preview", async (request, reply) => {
	reply.header("Cache-Control", "no-store");
	const user = await requireSiteUser(request);
	return authorizationServer.inspect(user.id, request.body);
});

app.post("/collection-transfer/authorize", async (request, reply) => {
	reply.header("Cache-Control", "no-store");
	const user = await requireSiteUser(request);
	return authorizationServer.authorize(user.id, request.body);
});

app.post("/collection-transfer/token", async (request, reply) => {
	reply.header("Cache-Control", "no-store");
	reply.header("Pragma", "no-cache");
	return authorizationServer.exchangeCode(request.body);
});

app.get("/collection-transfer/current", async (request, reply) => {
	reply.header("Cache-Control", "no-store");
	reply.header("Pragma", "no-cache");
	const auth = request.headers.authorization;
	if (!auth?.startsWith("Bearer ")) throw Object.assign(new Error("Bearer token required"), { statusCode: 401 });
	return authorizationServer.consumeLiveCollection(auth.slice(7));
});

app.post("/collection/import/start", async (request) => {
	const user = await requireSiteUser(request);
	const destinationAccount = `${config.issuer}:user:${user.id}`;
	return importer.start(user.id, destinationAccount, request.body);
});

app.get("/collection-transfer/callback", async (request, reply) => {
	const { code, state } = z.object({ code: z.string().min(32), state: z.string().min(32) }).parse(request.query);
	const verified = await importer.complete(code, state);
	linked.set(verified.destinationAccount, verified);
	return reply.redirect("/integration-complete");
});

app.get("/linked-collection", async (request) => {
	const user = await requireSiteUser(request);
	return linked.get(`${config.issuer}:user:${user.id}`) ?? null;
});

app.get("/integration-complete", async (_request, reply) => {
	reply.type("text/html").send("<!doctype html><html><body><h1>Collection verified</h1><p>The live source authorization completed successfully.</p></body></html>");
});

await app.listen({ host: "0.0.0.0", port: config.PORT });
