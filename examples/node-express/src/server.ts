import express, { type NextFunction, type Request, type Response } from "express";
import { Redis } from "ioredis";
import { z } from "zod";
import { signCollection } from "@wikicard/portable-collection-core";
import {
	CollectionAuthorizationServer,
	CollectionDestinationImporter,
	RedisProtocolStore,
	type VerifiedExternalCollection,
} from "@wikicard/portable-collection-server";
import { config } from "./config.js";
import { createCollectionSource, requireSiteUser } from "./site-adapter.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "8mb" }));

const redis = new Redis(config.REDIS_URL);
const store = new RedisProtocolStore(redis, "express:portable-collection:");
const source = createCollectionSource(config.issuer);
const linked = new Map<string, VerifiedExternalCollection>();

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

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.get("/.well-known/wikicard-issuer.json", (_req, res) => {
	res.set("Cache-Control", "public, max-age=300");
	res.set("Access-Control-Allow-Origin", "*");
	res.json(authorizationServer.issuerDocument());
});

app.get("/collection/export", async (req, res) => {
	const user = requireSiteUser(req);
	const signed = signCollection(await source.buildCurrentCollection(user.id), config.privateKey);
	res.set("Cache-Control", "no-store");
	res.attachment(`portable-collection-${user.id}.json`).json(signed);
});

app.post("/collection-transfer/authorize/preview", async (req, res) => {
	res.set("Cache-Control", "no-store");
	const user = requireSiteUser(req);
	res.json(authorizationServer.inspect(user.id, req.body));
});

app.post("/collection-transfer/authorize", async (req, res) => {
	res.set("Cache-Control", "no-store");
	const user = requireSiteUser(req);
	res.json(await authorizationServer.authorize(user.id, req.body));
});

app.post("/collection-transfer/token", async (req, res) => {
	res.set("Cache-Control", "no-store");
	res.set("Pragma", "no-cache");
	res.json(await authorizationServer.exchangeCode(req.body));
});

app.get("/collection-transfer/current", async (req, res) => {
	res.set("Cache-Control", "no-store");
	const authorization = req.header("authorization");
	if (!authorization?.startsWith("Bearer ")) throw Object.assign(new Error("Bearer token required"), { statusCode: 401 });
	res.json(await authorizationServer.consumeLiveCollection(authorization.slice(7)));
});

app.post("/collection/import/start", async (req, res) => {
	const user = requireSiteUser(req);
	res.json(await importer.start(user.id, `${config.issuer}:user:${user.id}`, req.body));
});

app.get("/collection-transfer/callback", async (req, res) => {
	const query = z.object({ code: z.string().min(32), state: z.string().min(32) }).parse(req.query);
	const verified = await importer.complete(query.code, query.state);
	linked.set(verified.destinationAccount, verified);
	res.redirect("/integration-complete");
});

app.get("/linked-collection", (req, res) => {
	const user = requireSiteUser(req);
	res.json(linked.get(`${config.issuer}:user:${user.id}`) ?? null);
});

app.get("/integration-complete", (_req, res) => {
	res.type("html").send("<!doctype html><h1>Collection verified</h1><p>Live authorization completed.</p>");
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
	const status = typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode: unknown }).statusCode) : 400;
	const message = error instanceof Error ? error.message : "Request failed";
	res.status(Number.isFinite(status) ? status : 400).json({ message });
});

app.listen(config.PORT, () => {
	console.log(`Express protocol example listening on :${config.PORT}`);
});
