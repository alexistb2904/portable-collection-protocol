import "dotenv/config";
import { z } from "zod";
import { privateKeyFromBase64Pkcs8 } from "@wikicard/portable-collection-core";

const schema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	PORT: z.coerce.number().int().positive().default(3100),
	REDIS_URL: z.string().min(1),
	PORTABLE_COLLECTION_ISSUER: z.string().url(),
	PORTABLE_COLLECTION_WEB_ORIGIN: z.string().url(),
	PORTABLE_COLLECTION_PRIVATE_KEY_BASE64: z.string().min(1),
	PORTABLE_COLLECTION_TRUSTED_CLIENTS: z.string().default(""),
	PORTABLE_COLLECTION_TRUSTED_ISSUERS: z.string().default(""),
});

const parsed = schema.parse(process.env);
if (parsed.NODE_ENV === "production") {
	throw new Error("The Fastify reference example uses demo authentication. Replace src/site-adapter.ts before running a production build.");
}

function urlSet(value: string): ReadonlySet<string> {
	return new Set(
		value
			.split(",")
			.map((item) => item.trim().replace(/\/+$/, ""))
			.filter(Boolean)
	);
}

export const config = {
	...parsed,
	issuer: parsed.PORTABLE_COLLECTION_ISSUER.replace(/\/+$/, ""),
	webOrigin: parsed.PORTABLE_COLLECTION_WEB_ORIGIN.replace(/\/+$/, ""),
	privateKey: privateKeyFromBase64Pkcs8(parsed.PORTABLE_COLLECTION_PRIVATE_KEY_BASE64),
	trustedClients: urlSet(parsed.PORTABLE_COLLECTION_TRUSTED_CLIENTS),
	trustedIssuers: urlSet(parsed.PORTABLE_COLLECTION_TRUSTED_ISSUERS),
};
