# TypeScript SDK Reference

The SDK is a reference implementation of the wire protocol.

## Core package

`@wikicard/portable-collection-core`

Main exports:

- `privateKeyFromBase64Pkcs8()`
- `signCollection()`
- `verifyCollection()`
- `signImportAuthorization()`
- `verifyImportAuthorization()`
- `validateCollectionStructure()`
- `validateIssuerDocument()`
- `assertTrustedIssuer()`
- `normalizeIssuer()`

Trust decisions are intentionally separate from cryptographic signature verification.

## Server package

`@wikicard/portable-collection-server`

### CollectionAuthorizationServer

Source-side authorization server.

Constructor inputs:

- issuer URI;
- public web origin;
- Ed25519 private key;
- protocol state store;
- collection source adapter;
- trusted destination clients.

Main methods:

- `inspect(userId, request)`
- `authorize(userId, request)`
- `exchangeCode(body)`
- `consumeLiveCollection(accessToken)`
- `issuerDocument()`

### CollectionDestinationImporter

Destination-side import orchestrator.

Main methods:

- `verifyUploadedExport(value)`
- `start(userId, destinationAccount, value)`
- `complete(code, state)`

`complete()` returns a `VerifiedExternalCollection`. Persist that result according to your application's ownership model.

## ProtocolStore

The authorization flow requires atomic one-time state consumption.

    interface ProtocolStore {
      put(key: string, value: string, ttlSeconds: number): Promise<void>;
      take(key: string): Promise<string | null>;
    }

The reference package provides:

- `RedisProtocolStore` — recommended for production;
- `MemoryProtocolStore` — development/tests only.

## CollectionSourceAdapter

This is the main integration boundary with an issuer application.

    interface CollectionSourceAdapter {
      subjectIdForUser(userId: string): string;
      buildCurrentCollection(userId: string): Promise<CollectionPayload>;
    }

The second method must query current authoritative ownership. Never read the uploaded export there.

## Framework integration

The SDK does not own HTTP authentication.

Your existing route handler authenticates the user first, then calls the protocol service. This keeps the SDK compatible with session cookies, OAuth, OIDC, passkeys, SSO and application-specific authentication.


## Python SDK

The Python reference implementation lives in `python-sdk/`.

Install locally:

```bash
pip install -e ./python-sdk
```

Main primitives mirror the Node SDK:

```py
from wikicard_portable_collection import (
    sign_collection,
    verify_collection,
    CollectionAuthorizationServer,
    CollectionDestinationImporter,
    RedisProtocolStore,
)
```

Python signed models preserve the original lexical representation of signed URLs and timestamps before canonicalization. Do not replace them with models that normalize those values before signature verification.

For framework wiring see:

- `examples/python-fastapi`
- `examples/python-flask`
- `examples/python-django`


## Python SDK

Directory:

```text
python-sdk/
```

Install from the standalone repository:

```bash
pip install -e "./python-sdk[dev]"
```

Main exports include:

- `sign_collection()`
- `verify_collection()`
- `sign_import_authorization()`
- `verify_import_authorization()`
- `CollectionAuthorizationServer`
- `CollectionDestinationImporter`
- `RedisProtocolStore`
- `ThreadedRedisProtocolStore`
- `MemoryProtocolStore`

The Python SDK uses the same wire objects, Ed25519 proof construction and canonical JSON semantics as the Node reference.

Use:

- `RedisProtocolStore` in async applications such as FastAPI;
- `ThreadedRedisProtocolStore` when async protocol services are invoked from frameworks where a process-global `redis.asyncio` pool could cross event loops, such as the provided Flask/Django examples.

Framework routes should remain thin and delegate protocol behavior to the SDK.
