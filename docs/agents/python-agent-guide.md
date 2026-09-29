# Python Agent Guide

Use this guide for FastAPI, Flask or Django.

## First audit

Identify:

- Python version;
- framework and version;
- existing authentication/session mechanism;
- ORM or repository layer;
- current ownership query;
- Redis availability;
- sync vs async application style;
- public API and web origins;
- deployment server/process topology.

## SDK

Use the local reference package:

```bash
pip install -e ./python-sdk
```

or publish/install the final package when available.

The package exposes:

- Pydantic wire models;
- cross-language canonical JSON;
- Ed25519 signing/verification;
- source authorization server;
- destination importer;
- Redis and memory protocol stores.

## Canonicalization

Do not replace the SDK canonicalizer with ordinary `json.dumps(sort_keys=True)`.

Signature bytes must match implementations in other languages.

## FastAPI

Use `examples/python-fastapi`.

Recommended:

- existing auth through `Depends`;
- async Redis;
- Pydantic models;
- application lifespan for connection setup/cleanup in a production app.

## Flask

Use `examples/python-flask`.

The example uses async views and `ThreadedRedisProtocolStore` around the synchronous Redis client to avoid sharing a `redis.asyncio` loop-bound pool across Flask's per-request async execution.

Reuse Flask-Login/JWT/session authentication in production.

## Django

Use `examples/python-django`.

Recommended:

- use `request.user`;
- keep protocol routes in a dedicated Django app;
- persist external links as Django models;
- keep normal Django CSRF/session middleware;
- use async-safe ORM/service patterns if async views are retained.

Django 6.1 requires Python 3.12+.

## Database mapping

Do not copy source card ownership into destination tables merely because the export verifies.

Persist the verified external relationship first.

If the product later exposes external cards in gameplay, preserve the authoritative source issuer and instance ID.

## Exceptions

Translate SDK `ValueError`/validation failures into normal application 4xx responses.

Do not expose stack traces, tokens, private keys or raw secret configuration.

## Production guard

Demo examples intentionally use `X-Demo-User-Id`.

An agent must remove that mechanism before claiming production readiness.

## Final agent report

Include:

- selected framework reference;
- auth integration;
- source collection query;
- sync/async Redis strategy;
- persistence model;
- environment variables;
- tests run;
- trust-list contents;
- unresolved security/operational assumptions.
