from __future__ import annotations

import asyncio
import hashlib
import time
from dataclasses import dataclass
from typing import Protocol

from redis import Redis as SyncRedis
from redis.asyncio import Redis


class ProtocolStore(Protocol):
    async def put(self, key: str, value: str, ttl_seconds: int) -> None: ...
    async def take(self, key: str) -> str | None: ...


def hash_opaque_token(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


class RedisProtocolStore:
    def __init__(self, redis: Redis, prefix: str = "portable-collection:") -> None:
        self.redis = redis
        self.prefix = prefix

    async def put(self, key: str, value: str, ttl_seconds: int) -> None:
        await self.redis.set(self.prefix + key, value, ex=ttl_seconds, nx=True)

    async def take(self, key: str) -> str | None:
        value = await self.redis.getdel(self.prefix + key)
        if isinstance(value, bytes):
            return value.decode("utf-8")
        return value


@dataclass
class _Entry:
    value: str
    expires_at: float


class MemoryProtocolStore:
    def __init__(self) -> None:
        self.entries: dict[str, _Entry] = {}

    async def put(self, key: str, value: str, ttl_seconds: int) -> None:
        self.entries[key] = _Entry(value=value, expires_at=time.time() + ttl_seconds)

    async def take(self, key: str) -> str | None:
        entry = self.entries.pop(key, None)
        if entry is None or entry.expires_at <= time.time():
            return None
        return entry.value


class ThreadedRedisProtocolStore:
    """
    Async ProtocolStore backed by the synchronous Redis client.

    Useful for frameworks such as Flask or Django configurations where async
    views may run on different event loops and a process-global redis.asyncio
    connection pool would be unsafe.
    """

    def __init__(self, redis: SyncRedis, prefix: str = "portable-collection:") -> None:
        self.redis = redis
        self.prefix = prefix

    async def put(self, key: str, value: str, ttl_seconds: int) -> None:
        await asyncio.to_thread(
            self.redis.set,
            self.prefix + key,
            value,
            ex=ttl_seconds,
            nx=True,
        )

    async def take(self, key: str) -> str | None:
        value = await asyncio.to_thread(self.redis.getdel, self.prefix + key)
        if isinstance(value, bytes):
            return value.decode("utf-8")
        return value
