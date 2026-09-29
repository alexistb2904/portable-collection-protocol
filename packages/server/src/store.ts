import { createHash } from "node:crypto";
import type Redis from "ioredis";
import type { ProtocolStore } from "./types.js";

export function hashOpaqueToken(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

export class RedisProtocolStore implements ProtocolStore {
	constructor(
		private readonly redis: Redis,
		private readonly prefix = "portable-collection:"
	) {}

	private key(value: string): string {
		return this.prefix + value;
	}

	async put(key: string, value: string, ttlSeconds: number): Promise<void> {
		await this.redis.set(this.key(key), value, "EX", ttlSeconds, "NX");
	}

	async take(key: string): Promise<string | null> {
		return this.redis.getdel(this.key(key));
	}
}

export class MemoryProtocolStore implements ProtocolStore {
	private readonly entries = new Map<string, { value: string; expiresAt: number }>();

	async put(key: string, value: string, ttlSeconds: number): Promise<void> {
		this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
	}

	async take(key: string): Promise<string | null> {
		const entry = this.entries.get(key);
		this.entries.delete(key);
		if (!entry || entry.expiresAt <= Date.now()) return null;
		return entry.value;
	}
}
