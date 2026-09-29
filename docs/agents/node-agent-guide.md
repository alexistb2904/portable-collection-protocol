# Node Agent Guide

Use this guide when integrating into Node.js or TypeScript.

## First audit

Identify:

- framework and major version;
- authentication middleware/session provider;
- authenticated user ID type;
- card ownership tables/services;
- Redis client and deployment topology;
- API public origin;
- frontend route that can host consent UI;
- persistence layer for external collection links.

## Package choice

Use:

```text
@wikicard/portable-collection-core
@wikicard/portable-collection-server
```

The core package owns signed object semantics.

The server package owns one-time authorization/import orchestration.

## Host adapters

Implement a collection source:

```ts
interface CollectionSourceAdapter {
  subjectIdForUser(userId: string): string;
  buildCurrentCollection(userId: string): Promise<CollectionPayload>;
}
```

Use the application's real current-ownership service in `buildCurrentCollection`.

Never read the uploaded export from this method.

## Framework patterns

### Fastify

Use `examples/fastify`.

Keep protocol routes in a Fastify plugin/module if the application already organizes routes that way.

Use the application's existing `requireUser` function.

### Express

Use `examples/node-express`.

Prefer a dedicated `Router` in a real application instead of placing everything in the root server file.

Reuse existing error middleware and authentication middleware.

### NestJS

Use `examples/node-nestjs`.

Recommended structure:

```text
PortableCollectionModule
├── PortableCollectionController
├── PortableCollectionService
├── HostCollectionAdapter
└── ExternalCollectionRepository
```

Inject existing user/card services instead of querying unrelated tables directly from the controller.

## Persistence

Do not keep verified external links in a JavaScript `Map` in production.

Store at least:

- destination user ID;
- source issuer;
- source subject ID;
- source username/display metadata;
- live collection hash;
- source issued time;
- last verified time;
- card count.

Use a unique constraint that prevents duplicate link records for the same destination account/source subject relationship.

## Redis

Use an existing shared Redis if available.

The protocol needs atomic take/consume semantics for:

- import state;
- authorization code;
- live access token.

Do not use process memory when the API has multiple replicas.

## HTTP

Use the host app's normal JSON/error conventions, but preserve:

- endpoint paths or advertised equivalents;
- `Cache-Control: no-store` on sensitive responses;
- exact redirects;
- body-size limits;
- server-to-server timeouts;
- redirect refusal for discovery/token/live requests.

## Final agent report

Report:

- files changed;
- database migration;
- environment variables;
- routes added;
- auth adapter used;
- ownership query used;
- tests executed and results;
- partners trusted by configuration;
- remaining production limitations.
