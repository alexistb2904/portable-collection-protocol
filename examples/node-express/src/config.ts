import "dotenv/config";
import { z } from "zod";
import { privateKeyFromBase64Pkcs8 } from "@wikicard/portable-collection-core";

const env = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	PORT: z.coerce.number().int().positive().default(3200),
	REDIS_URL: z.string().min(1),
	PORTABLE_COLLECTION_ISSUER: z.string().url(),
	PORTABLE_COLLECTION_WEB_ORIGIN: z.string().url(),
	PORTABLE_COLLECTION_PRIVATE_KEY_BASE64: z.string().min(1),
	PORTABLE_COLLECTION_TRUSTED_CLIENTS: z.string().default(""),
	PORTABLE_COLLECTION_TRUSTED_ISSUERS: z.string().default(""),
}).parse(process.env);

if (env.NODE_ENV === "production") {
	throw new Error("Replace the Express demo authentication adapter before enabling NODE_ENV=production.");
}

const list = (value: string) => new Set(value.split(",").map((item) => item.trim().replace(/\/+$/, "")).filter(Boolean));

export const config = {
	...env,
	issuer: env.PORTABLE_COLLECTION_ISSUER.replace(/\/+$/, ""),
	webOrigin: env.PORTABLE_COLLECTION_WEB_ORIGIN.replace(/\/+$/, ""),
	privateKey: privateKeyFromBase64Pkcs8(env.PORTABLE_COLLECTION_PRIVATE_KEY_BASE64),
	trustedClients: list(env.PORTABLE_COLLECTION_TRUSTED_CLIENTS),
	trustedIssuers: list(env.PORTABLE_COLLECTION_TRUSTED_ISSUERS),
};
