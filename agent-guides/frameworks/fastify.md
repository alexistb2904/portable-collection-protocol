# Agent Guide — Fastify

Reference: `examples/fastify/`.

## Where to integrate

Create a dedicated Fastify plugin/route module.

Reuse:

- existing `requireUser(request)`;
- existing Zod/type-provider conventions;
- existing Redis client;
- existing logging/error handler.

## Body limit

Fastify supports per-route `bodyLimit`. Prefer that for collection imports.

## Lifecycle

Instantiate protocol services once during app/plugin setup.

Do not create Redis clients or private-key objects per request.

## Consent route

Keep consent UI in the authenticated web app.

Use a server-side preview endpoint before displaying the destination identity.

## Multi-origin deployments

Issuer URI is an authority identifier, not simply the current request Host header.

Use explicit config.
