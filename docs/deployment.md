# Deployment

The protocol can be deployed in two ways.

## Option A — integrate into your existing backend

Recommended for most services.

Advantages:

- reuses your existing login/session;
- direct database access to current ownership;
- fewer trust boundaries;
- simpler user experience.

Use `@wikicard/portable-collection-core` and `@wikicard/portable-collection-server` inside your backend.

## Option B — standalone protocol gateway

Useful when several products share one collection authority.

The gateway still needs a secure application adapter for:

- source-user authentication;
- current collection retrieval;
- persistence of verified destination links.

Do not deploy a gateway with a demo adapter in production.

## Required production configuration

```env
PORTABLE_COLLECTION_ISSUER=https://cards.example.com/api
PORTABLE_COLLECTION_PRIVATE_KEY_BASE64=<secret>
PORTABLE_COLLECTION_TRUSTED_ISSUERS=
PORTABLE_COLLECTION_TRUSTED_CLIENTS=
REDIS_URL=redis://redis:6379
```

## Reverse proxy

Expose one stable public API base. Do not sign exports with internal Docker hostnames.

Typical routing:

```text
https://cards.example.com/
  /collection/authorize                 -> web application
  /api/.well-known/...                  -> protocol backend
  /api/collection/export                -> protocol backend
  /api/collection-transfer/*            -> protocol backend
```

Then use:

```env
PORTABLE_COLLECTION_ISSUER=https://cards.example.com/api
```

## Redis

Redis stores ephemeral one-time state:

- authorization codes;
- access tokens;
- destination import state.

Persistence is not required for correctness across long periods, but Redis must be shared by all protocol API replicas.

Do not use in-memory storage when horizontally scaling.

## Signing keys

Private keys must be injected as secrets. They should not be baked into container images.

## Health and readiness

A production service should distinguish:

- liveness — process is running;
- readiness — Redis and required collection data sources are reachable.

## Docker

See `infra/docker-compose.yml` and the Fastify reference example for a minimal containerized layout.
