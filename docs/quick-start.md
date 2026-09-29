# Quick Start

This page gives the minimum implementation path.

## 1. Choose your role

Your service can be:

- **Issuer only** — users export collections from your service.
- **Destination only** — users link collections from trusted issuers.
- **Both** — users can move or reuse collections in both directions.

## 2. Choose the reference SDK

### Node.js / TypeScript

```bash
pnpm add @wikicard/portable-collection-core
pnpm add @wikicard/portable-collection-server
```

Until packages are published, use the workspace packages in this repository.

### Python

From the standalone checkout:

```bash
pip install -e ./python-sdk
```

The Python SDK implements the same signed objects and live authorization flow.

Framework examples are available for Express, Fastify, NestJS, FastAPI, Flask and Django.

## 3. Configure an issuer identity

Use one stable HTTPS API base:

```env
PORTABLE_COLLECTION_ISSUER=https://cards.example.com/api
```

This exact URI becomes part of signed exports and trust decisions. Treat changing it as a protocol migration.

## 4. Generate an Ed25519 key

```bash
node -e "const {generateKeyPairSync}=require('node:crypto');const {privateKey}=generateKeyPairSync('ed25519');console.log(privateKey.export({format:'der',type:'pkcs8'}).toString('base64'))"
```

Store the result in your secret manager. Never commit it.

## 5. Expose issuer discovery

Every issuer publishes:

```text
GET <issuer>/.well-known/wikicard-issuer.json
```

The response publishes public signing keys and optional live authorization endpoints.

## 6. Export collections

Build a `CollectionPayload` from your database and sign it with Ed25519.

The preferred cross-site identity is:

```text
wikidata:Q937
```

If no Wikidata QID exists, use:

```text
wikipedia:<language>:<pageId>
```

Keep game-specific data under a namespaced `extensions` key.

## 7. Do not trust uploaded files as current ownership

A destination verifies the export signature first, but then redirects the user to the source issuer using `WIKICARD-AUTH-CODE-1`.

The source user authenticates and consents. The destination then receives a **fresh signed collection**.

## 8. Start with no trusted partners

```env
PORTABLE_COLLECTION_TRUSTED_ISSUERS=
PORTABLE_COLLECTION_TRUSTED_CLIENTS=
```

Add partners only after reviewing their identity model, signing-key handling, collection rules and authorization endpoints.

## Next

Continue with [Integration Guide](/integration-guide) for framework wiring and [Security](/security) before production.
