# Express example

Production wiring example for **Express 5** using the shared Node protocol packages.

## Application-specific files

Replace `src/site-adapter.ts`:

- `requireSiteUser()` → your real session/JWT/SSO middleware;
- `buildCurrentCollection()` → an authoritative database query;
- demo card mapping → your real portable card mapping.

Replace the in-memory `linked` map in `server.ts` with persistent storage.

The example refuses production mode while demo authentication is still present.

## Run

```bash
pnpm install
pnpm --filter @wikicard/portable-collection-core build
pnpm --filter @wikicard/portable-collection-server build
pnpm --filter @wikicard/portable-collection-express-example dev
```

Authenticated demo routes expect `X-Demo-User-Id`. Never use that mechanism in production.
