# WikiCard Portable Collection Protocol

Portable, signed collectible-card collections that can be understood by multiple websites without turning a downloadable backup into a duplication exploit.

The protocol is designed for games and services that want to let users reuse or link a collection across different applications while keeping one simple rule:

> **A file can prove what an issuer signed. It cannot, by itself, prove that the uploader still owns those cards today.**

That is why the protocol has two layers:

1. a **signed portable collection file** for interoperability;
2. a **live authorization flow** for current ownership.

The project includes production-oriented SDKs, framework examples, machine-readable schemas, security guidance and a developer documentation website.

### Live export viewer

A static browser-only viewer is included for understanding the data produced by an export:

**https://alexistb2904.github.io/portable-collection-protocol/viewer/**

It loads a representative demo by default and can open a local export without uploading it anywhere. The viewer displays the proof envelope but deliberately does **not** claim cryptographic verification or current ownership.

---

## Quick example

Imagine two services:

- **Game A** owns the authoritative collection;
- **Game B** wants to let the player use cards from Game A.

Alice exports this file from Game A:

```json
{
  "payload": {
    "format": "org.wikicard.collection",
    "version": "1.0.0",
    "issuer": {
      "id": "https://game-a.example/api",
      "name": "Game A"
    },
    "subject": {
      "id": "https://game-a.example/api:user:123",
      "username": "alice"
    },
    "issuedAt": "2026-09-29T12:00:00.000Z",
    "collection": {
      "count": 42,
      "cards": []
    }
  },
  "proof": {
    "type": "Ed25519Signature",
    "algorithm": "Ed25519",
    "keyId": "ed25519-sha256-...",
    "payloadHash": "...",
    "signature": "..."
  }
}
```

Game B can verify that Game A really signed that file.

But Alice could have:

- sold a card after exporting;
- recycled a card after exporting;
- copied the file to someone else;
- uploaded the same file multiple times.

So Game B does **not** create ownership from the file.

Instead:

```text
Alice                     Game B                     Game A
  |                          |                          |
  | upload signed file       |                          |
  |------------------------->|                          |
  |                          | verify issuer + signature|
  |                          |                          |
  |<-------------------------| redirect to Game A       |
  |---------------------------------------------------->|
  |                          |                          | authenticate Alice
  |                          |                          | verify subject.id
  |                          |                          | ask for consent
  |<----------------------------------------------------| one-time code
  |------------------------->|                          |
  |                          | PKCE code exchange       |
  |                          |------------------------->|
  |                          |<-------------------------| one-time token
  |                          | request current collection
  |                          |------------------------->|
  |                          |<-------------------------| fresh signed collection
  |                          |                          | + signed authorization
  |                          | verify everything        |
  |<-------------------------| collection linked        |
```

The old export becomes an **entry point**, not the final source of truth.

---

## What this protocol solves

### Edited collection files

The collection payload is signed with **Ed25519**.

Changing a card, serial number, subject, issuer or signed property invalidates the signature.

A simple hash would not be enough because an attacker could edit the JSON and calculate another hash.

### Stolen exports

The uploaded file contains the signed source account in `subject.id`.

The live authorization flow requires the user to authenticate on the source website as that exact account.

Possessing the JSON file is not enough.

### Old backups

After authorization, the source application rebuilds the collection from its **current database state**.

It does not resend or trust the uploaded backup.

A card sold six months after the export therefore does not reappear.

### Replay attacks

Authorization state, authorization codes and live access tokens are:

- cryptographically random;
- short-lived;
- single-use.

The reference implementations use atomic Redis consumption.

### Importing into another account

The final signed authorization contains:

- the source issuer;
- the source subject;
- the destination service;
- the **exact destination account**;
- the original export hash;
- the new live collection hash;
- issue and expiry timestamps.

An authorization created for one destination account cannot be reused for another.

### Fake websites

A valid Ed25519 signature only proves control of a key.

It does **not** mean the issuer should be trusted.

Every destination keeps an explicit trusted issuer list. Unknown issuers are denied by default.

---

# Portable card model

A card has two different identities:

```text
instanceId
   ↓
the exact owned copy

canonicalId
   ↓
the represented concept
```

Example:

```json
{
  "id": "urn:uuid:cd010935-0063-4eaf-bca9-4d2b4ef59e66",
  "instanceId": "cd010935-0063-4eaf-bca9-4d2b4ef59e66",
  "serialNumber": "42",
  "mintedAt": "2026-09-29T12:00:00.000Z",
  "definition": {
    "id": "21d59ef3-4805-49c0-b8ba-f9a81799a995",
    "canonicalId": "wikidata:Q937",
    "wikidataId": "Q937",
    "source": {
      "provider": "wikipedia",
      "language": "en",
      "pageId": "736",
      "url": "https://en.wikipedia.org/wiki/Albert_Einstein"
    },
    "presentation": {
      "title": "Albert Einstein",
      "description": "German-born theoretical physicist",
      "imageUrl": null
    }
  },
  "extensions": {
    "org.wikicard.game.v1": {
      "rarity": "LEGENDARY",
      "attack": 8400
    }
  }
}
```

## Why Wikidata?

Wikipedia titles depend on language and can change.

Wikidata gives a much better cross-service identity:

```text
wikidata:Q937
```

A French site and an English site can therefore agree that a card represents the same entity while displaying different localized titles or descriptions.

If a Wikidata QID is not available, the fallback format is:

```text
wikipedia:<language>:<pageId>
```

Example:

```text
wikipedia:fr:123456
```

## Game-specific data

Different games do not need the same rarity, stats or balancing.

Application-specific data belongs in namespaced extensions:

```json
{
  "extensions": {
    "org.wikicard.game.v1": {
      "rarity": "LEGENDARY"
    },
    "com.example.rpg.v2": {
      "element": "science"
    }
  }
}
```

Consumers ignore namespaces they do not understand.

Portable identity stays independent from one game's balancing rules.

---

# Choose your integration role

A service can be:

### Issuer

Your service owns the authoritative collection.

You want users to export it and authorize another application to read their current collection.

You need:

- an Ed25519 signing key;
- signed export generation;
- issuer discovery;
- source-account authorization;
- a current ownership query;
- trusted destination clients.

### Destination

Your service consumes collections from other trusted issuers.

You need:

- file upload;
- schema/signature verification;
- trusted issuer configuration;
- PKCE import flow;
- fresh live collection verification;
- persistent external collection links.

### Both

Most collectible ecosystems can support both directions.

The SDKs support this.

---

# Installation

## Node.js / TypeScript

The standalone project uses pnpm.

```bash
cd portable-collection-protocol
pnpm install
pnpm build
pnpm test
```

Reference packages:

```text
@wikicard/portable-collection-core
@wikicard/portable-collection-server
```

Inside this repository they are workspace packages.

When published, a Node integration will use the equivalent of:

```bash
pnpm add @wikicard/portable-collection-core
pnpm add @wikicard/portable-collection-server
```

### Core package

Use it for:

- canonical JSON;
- schemas;
- Ed25519 signatures;
- collection verification;
- import authorization verification.

### Server package

Use it for:

- authorization-code flow;
- PKCE;
- issuer discovery;
- Redis-backed one-time state;
- destination import orchestration.

---

## Python

Python 3.11+ is supported by the SDK.

Django 6.1 requires Python 3.12+.

Create an environment:

```bash
cd portable-collection-protocol

python -m venv .venv
source .venv/bin/activate
```

On Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Install the Python SDK:

```bash
pip install -e "./python-sdk[dev]"
```

Run its tests:

```bash
pytest python-sdk/tests
```

The SDK provides:

- Pydantic wire models;
- cross-language canonical JSON;
- Ed25519 signing and verification;
- issuer discovery;
- source authorization server;
- destination importer;
- async Redis store;
- thread-backed Redis store for appropriate Flask/Django setups;
- in-memory store for tests only.

---

# Generate a signing key

Each issuer needs an Ed25519 private key.

For local development with Node:

```bash
node -e "const {generateKeyPairSync}=require('node:crypto');const {privateKey}=generateKeyPairSync('ed25519');console.log(privateKey.export({format:'der',type:'pkcs8'}).toString('base64'))"
```

Store the result as a secret:

```env
PORTABLE_COLLECTION_PRIVATE_KEY_BASE64=<secret>
```

Do not commit it.

In production, prefer generating and storing the private key directly in your secret-management/deployment platform.

---

# Basic configuration

Example:

```env
PORTABLE_COLLECTION_ISSUER=https://cards.example.com/api
PORTABLE_COLLECTION_PRIVATE_KEY_BASE64=<secret>

PORTABLE_COLLECTION_TRUSTED_ISSUERS=
PORTABLE_COLLECTION_TRUSTED_CLIENTS=

REDIS_URL=redis://redis:6379
```

## Important: trust lists start empty

This is intentional.

```env
PORTABLE_COLLECTION_TRUSTED_ISSUERS=
PORTABLE_COLLECTION_TRUSTED_CLIENTS=
```

A cryptographically valid unknown website is still unknown.

After reviewing a partner:

```env
PORTABLE_COLLECTION_TRUSTED_ISSUERS=https://partner.example/api
PORTABLE_COLLECTION_TRUSTED_CLIENTS=https://partner.example/api
```

Do not automatically add issuers discovered from uploaded files.

---

# Integrating as an issuer

The host application keeps its existing authentication.

The protocol only needs an adapter that can answer two questions:

```ts
interface CollectionSourceAdapter {
  subjectIdForUser(userId: string): string;

  buildCurrentCollection(
    userId: string
  ): Promise<CollectionPayload>;
}
```

Example:

```ts
const source = {
  subjectIdForUser(userId: string) {
    return `${ISSUER}:user:${userId}`;
  },

  async buildCurrentCollection(userId: string) {
    const cards = await db.cards.findOwnedByUser(userId);

    return {
      format: "org.wikicard.collection",
      version: "1.0.0",
      exportId: crypto.randomUUID(),

      issuer: {
        id: ISSUER,
        name: "Example Game"
      },

      subject: {
        id: `${ISSUER}:user:${userId}`,
        username: await getUsername(userId)
      },

      issuedAt: new Date().toISOString(),

      collection: {
        count: cards.length,
        cards: cards.map(toPortableCard)
      }
    };
  }
};
```

The important part is:

> `buildCurrentCollection()` must query current authoritative ownership.

It must never rebuild ownership from the uploaded backup.

---

## Issuer discovery

Publish:

```text
GET <issuer>/.well-known/wikicard-issuer.json
```

Example:

```json
{
  "issuer": "https://game-a.example/api",
  "protocol": "org.wikicard.collection",
  "version": "1.0.0",
  "keys": [
    {
      "id": "ed25519-sha256-...",
      "use": "sig",
      "alg": "EdDSA",
      "kty": "OKP",
      "crv": "Ed25519",
      "x": "..."
    }
  ],
  "authorization": {
    "protocol": "WIKICARD-AUTH-CODE-1",
    "authorizationEndpoint": "https://game-a.example/collection/authorize",
    "tokenEndpoint": "https://game-a.example/api/collection-transfer/token",
    "collectionEndpoint": "https://game-a.example/api/collection-transfer/current",
    "codeChallengeMethods": ["S256"]
  }
}
```

Only the public key appears here.

---

# Integrating as a destination

Suppose a user uploads:

```text
alice-game-a-collection.json
```

Do **not** do this:

```text
verify signature
↓
insert cards into local ownership table
```

Do this:

```text
parse file
↓
identify issuer
↓
is issuer trusted?
↓
discover public key
↓
verify signature
↓
create PKCE + state
↓
redirect to source
↓
source authenticates user
↓
receive one-time code
↓
exchange code
↓
request fresh collection
↓
verify fresh collection + signed authorization
↓
store verified external relationship
```

Node example:

```ts
const started = await importer.start(
  currentUser.id,
  `${DESTINATION_ISSUER}:user:${currentUser.id}`,
  uploadedJson
);

return redirect(started.authorizationUrl);
```

Callback:

```ts
const verified = await importer.complete(code, state);

await externalCollections.upsert({
  destinationUserId: currentUser.id,
  sourceIssuer: verified.issuer,
  sourceSubjectId: verified.subjectId,
  liveCollectionHash: verified.liveCollectionHash,
  verifiedAt: verified.verifiedAt
});
```

Use:

```ts
verified.liveCollection
```

for current ownership.

Do not use the original uploaded file for that decision.

---

# Framework examples

Use the framework your application already uses.

Do not migrate frameworks just to use an example.

## Node.js

### Fastify

```text
examples/fastify/
```

Useful for existing Fastify applications and service-oriented APIs.

### Express

```text
examples/node-express/
```

Useful for middleware/router-based Express APIs.

### NestJS

```text
examples/node-nestjs/
```

Useful for applications organized around modules, controllers, providers and dependency injection.

## Python

### FastAPI

```text
examples/python-fastapi/
```

Uses async Python, Pydantic and dependency-based authentication wiring.

### Flask

```text
examples/python-flask/
```

Uses Flask async views and a Redis store suitable for the example's execution model.

### Django

```text
examples/python-django/
```

Keeps the protocol in a dedicated Django app so it can be integrated with normal Django authentication and ORM models.

## Browser UI

```text
examples/browser-ui/
```

Framework-neutral examples for:

- import file selection;
- validated authorization preview;
- explicit source consent.

---

# What should be stored?

A destination normally stores the **verified relationship**, not cloned source ownership.

Example:

```text
ExternalCollectionLink
  destinationUserId
  sourceIssuer
  sourceSubjectId
  sourceUsername
  lastVerifiedAt
  sourceIssuedAt
  liveCollectionHash
  cardCount
```

For individual externally authoritative cards:

```text
ExternalCardReference
  sourceIssuer
  sourceSubjectId
  sourceInstanceId
  canonicalId
  lastVerifiedAt
```

If your game has local XP, skins or battle stats, keep them separately from portable identity.

---

# HTTP endpoints

The reference protocol uses these logical endpoints:

```text
GET  /.well-known/wikicard-issuer.json
GET  /collection/export

POST /collection-transfer/authorize/preview
POST /collection-transfer/authorize
POST /collection-transfer/token
GET  /collection-transfer/current

POST /collection/import/start
GET  /collection-transfer/callback
```

The complete machine-readable contract is available in:

```text
spec/openapi.yaml
```

JSON Schemas:

```text
spec/collection-export.schema.json
spec/issuer-document.schema.json
spec/import-authorization.schema.json
```

---

# Production checklist

Before enabling real partners:

- [ ] production issuer URI is stable and HTTPS;
- [ ] private signing key is stored in secrets management;
- [ ] public issuer discovery works externally;
- [ ] old public keys remain available during key rotation;
- [ ] source user authentication uses the application's real auth;
- [ ] destination user authentication uses the application's real auth;
- [ ] `subject_id` is checked against the authenticated source user;
- [ ] callback URI is exact;
- [ ] PKCE S256 is enabled;
- [ ] Redis/shared one-time state is available to all replicas;
- [ ] sensitive responses use `Cache-Control: no-store`;
- [ ] upload and remote response sizes are limited;
- [ ] outbound requests have timeouts;
- [ ] server-to-server redirects are disabled;
- [ ] token/live endpoints remain on the reviewed issuer origin;
- [ ] live collection freshness is checked;
- [ ] external links are persisted in the database;
- [ ] demo authentication is removed;
- [ ] trusted issuer/client lists are reviewed manually;
- [ ] security tests pass.

The more detailed checklist lives in:

```text
docs/conformance.md
```

---

# Run the documentation website

The documentation is built with VitePress.

```bash
pnpm install
pnpm docs:dev
```

Production build:

```bash
pnpm docs:build
```

Docker:

```bash
docker compose -f infra/docker-compose.yml up --build docs
```

The standalone publishing guide is in:

```text
docs/publishing.md
```

---

# Q&A

## Is this a blockchain or NFT protocol?

No.

The protocol uses JSON, HTTPS, SHA-256 and Ed25519.

A blockchain ownership backend could be added later, but it is not required.

## Does a valid signed file prove current ownership?

No.

It proves:

> this issuer signed this snapshot at this time.

Current ownership requires the live authorization flow.

## Why is the file useful if it cannot be trusted as current ownership?

Because it is portable discovery and historical evidence.

It tells another service:

- which issuer to contact;
- which source account is represented;
- which cards were present;
- which canonical identities they use;
- which key signed the snapshot.

The live flow then upgrades that historical snapshot into fresh current ownership information.

## Why not just use a SHA-256 hash?

Because an attacker can edit a file and calculate another hash.

A signature requires the issuer's private key.

## Can someone import another player's file?

They can upload it.

They cannot complete ownership authorization unless they can authenticate as the signed source account.

## Can someone restore an old backup after selling cards?

The old file can start the flow, but the source rebuilds the current collection after authentication.

Sold or deleted cards will no longer be present.

## Can the same authorization be imported twice?

Not with the reference flow.

State, codes and access tokens are one-time and short-lived.

## Can an authorization for my account be used on another account on the same destination?

No.

The exact `destinationAccount` is included in the signed authorization.

## Can any website become an issuer?

Any website can technically create a key and sign JSON.

Destinations still choose who they trust.

A valid signature is not the same as an approved economy or trusted issuer.

## Do all games need the same rarity and stats?

No.

Those belong in application-specific extension namespaces or can be recomputed locally.

## Why use Wikidata instead of the Wikipedia title?

Because titles vary by language and can change.

Wikidata QIDs are much better cross-site identities.

## What happens if the source website is offline?

Historical files may still be cryptographically verifiable if the public key is available.

Fresh current-ownership authorization cannot complete while the authoritative source is offline.

Each destination should define how long an already verified relationship remains usable during outages.

## Does linking a collection transfer ownership away from the source game?

No.

Protocol v1 verifies and links externally authoritative ownership.

It does not define destructive cross-service transfer semantics.

## Can I implement this in Java, Go, Rust, PHP or C#?

Yes.

The wire protocol is language-neutral.

Use:

- `docs/protocol.md`;
- the JSON Schemas;
- `spec/openapi.yaml`.

The Node and Python SDKs are reference implementations.

## Where can I ask for integration help?

- Discord: **alexistb2904**
- Email: **wikicard@alexistb.com**

---

# Repository structure

```text
portable-collection-protocol/
├── README.md
├── AGENTS.md
├── SECURITY.md
├── CONTRIBUTING.md
├── CHANGELOG.md
│
├── packages/
│   ├── core/                Node/TypeScript cryptography + validation
│   └── server/              Node authorization/import services
│
├── python-sdk/              Python reference SDK
│
├── examples/
│   ├── fastify/
│   ├── node-express/
│   ├── node-nestjs/
│   ├── python-fastapi/
│   ├── python-flask/
│   ├── python-django/
│   └── browser-ui/
│
├── docs/
│   ├── protocol.md
│   ├── security.md
│   ├── integration-guide.md
│   ├── framework-examples.md
│   ├── card-model.md
│   ├── conformance.md
│   └── agents/
│
├── spec/
│   ├── collection-export.schema.json
│   ├── issuer-document.schema.json
│   ├── import-authorization.schema.json
│   └── openapi.yaml
│
└── infra/
```

---

# Instructions for coding agents

If you are an AI coding agent, **do not begin by copying a server example**.

Start here:

```text
AGENTS.md
```

Then detect the host framework using:

```text
docs/agents/framework-selection.md
```

Choose the matching reference:

```text
Fastify  → examples/fastify
Express  → examples/node-express
NestJS   → examples/node-nestjs

FastAPI  → examples/python-fastapi
Flask    → examples/python-flask
Django   → examples/python-django
```

Then read:

```text
docs/agents/node-agent-guide.md
```

or:

```text
docs/agents/python-agent-guide.md
```

Each framework example also contains its own:

```text
AGENT.md
```

## Agent rules

Preserve the application's existing:

- framework;
- authentication;
- user model;
- database architecture;
- deployment model;
- Redis infrastructure when suitable.

Normally replace only:

1. authentication adapter;
2. current ownership query;
3. portable-card mapping;
4. external-link persistence;
5. partner trust configuration;
6. framework route/middleware wiring.

Do not weaken:

- Ed25519;
- canonicalization;
- PKCE S256;
- exact redirect URI;
- trusted issuer/client allowlists;
- one-time state/code/token;
- source-account matching;
- live ownership refresh;
- exact destination-account binding;
- original/live hash binding.

Before declaring the integration complete, compare it with:

```text
docs/conformance.md
```

A reusable agent task template is available at:

```text
docs/agents/integration-task-template.md
```

A longer ready-to-paste AI integration prompt is available at:

```text
docs/ai-integration-prompt.md
```

Do not claim production readiness if demo authentication, in-memory persistence or unverified deployment assumptions remain.
