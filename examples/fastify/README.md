# Fastify integration example

This is a runnable wiring example for the protocol packages.

It deliberately isolates the only application-specific code in `src/site-adapter.ts`.

## Replace before production

You must replace:

- `requireSiteUser()` with your real session/authentication;
- `buildCurrentCollection()` with an authoritative database query;
- the in-memory `linked` map with persistent storage;
- demo card mapping with your real card data.

The example refuses to start with `NODE_ENV=production` until the demo authentication adapter has been replaced.

## Start

Generate an Ed25519 key as described in the root README and configure `.env`.

Then:

```bash
pnpm install
pnpm --filter @wikicard/portable-collection-core build
pnpm --filter @wikicard/portable-collection-server build
pnpm --filter @wikicard/portable-collection-fastify-example dev
```

For demo authenticated routes, send:

```http
X-Demo-User-Id: 550e8400-e29b-41d4-a716-446655440000
```

That header is a teaching aid only and is not a production authentication mechanism.
