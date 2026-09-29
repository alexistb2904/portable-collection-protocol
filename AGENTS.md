# AGENTS.md — Portable Collection Protocol

This file is the starting point for coding agents integrating or modifying this project.

## Mission

Preserve interoperability and security while adapting the protocol to a host application.

Do not treat this repository as a generic authentication starter. The host application's existing authentication and ownership database remain authoritative.

## Read before editing

Read in this order:

1. `README.md`
2. `docs/protocol.md`
3. `docs/security.md`
4. `docs/card-model.md`
5. `docs/conformance.md`
6. the framework-specific guide under `docs/agents/`
7. the matching example under `examples/`

If implementing in an existing application, also inspect its authentication, current card ownership model, Redis/shared state, reverse proxy, deployment configuration and test conventions before editing.

## Framework routing

Node.js / TypeScript:

- Fastify → `examples/fastify`
- Express → `examples/node-express`
- NestJS → `examples/node-nestjs`

Python:

- FastAPI → `examples/python-fastapi`
- Flask → `examples/python-flask`
- Django → `examples/python-django`

Unknown framework:

- use `packages/core` + `packages/server` for Node;
- use `python-sdk` for Python;
- follow `spec/openapi.yaml` in other languages.

## Protocol invariants

Never weaken these invariants:

- Ed25519 signatures.
- `WIKICARD-C14N-JSON-1` canonicalization.
- explicit trusted issuer/client lists.
- uploaded backup is not current ownership.
- authenticated source account must equal signed `subject_id`.
- PKCE S256.
- exact redirect URI.
- one-time short-lived state/code/token.
- fresh source database query after authorization.
- destination issuer and exact destination account binding.
- original export hash binding.
- live collection hash binding.
- HTTPS in production.
- source token/live endpoints remain on the trusted issuer origin.
- private signing key never leaves the server.

## Integration boundaries

A normal integration should change only:

1. authentication adapter;
2. current ownership query;
3. portable-card mapping;
4. persistence of verified external links;
5. trusted partner configuration;
6. framework route/middleware wiring.

Do not fork cryptographic logic unless the target language cannot use the provided SDK.

## Required tests

At minimum:

- valid signed export;
- payload tampering;
- wrong public key;
- unknown issuer;
- unknown client;
- source-account mismatch;
- PKCE mismatch;
- code replay;
- live-token replay;
- state replay;
- destination-account mismatch;
- stale live collection;
- endpoint-origin mismatch.

## Completion rule

Do not claim an integration is production-ready if:

- demo authentication remains;
- external links are only stored in memory;
- trust lists are wildcarded or automatically populated;
- Redis/atomic shared one-time state is absent in a multi-instance deployment;
- signing keys are committed;
- tests did not run;
- production URLs are unknown.

Report those limitations explicitly instead.
