# AGENT.md — FastAPI integration

Read `../../AGENTS.md`, `../../docs/agents/python-agent-guide.md`, `../../docs/protocol.md` and `../../docs/security.md` before editing.

Use the shared `../../python-sdk`; do not reimplement cryptography inside framework routes.

## Replace

- `X-Demo-User-Id` with the existing Depends/session/JWT dependency;
- `DemoCollectionSource` with the authoritative current-ownership query;
- demo card data with stable real card instance IDs;
- in-memory external-link storage with the application's database/ORM layer;
- trust lists only after explicit partner review.

## Preserve

- the host FastAPI application structure;
- raw-wire signature verification;
- Ed25519;
- PKCE S256;
- exact callback URI;
- one-time Redis state/code/token;
- fresh live collection after authorization;
- exact destination-account binding.

## Before completion

Run Python tests and framework checks, verify deployment configuration, and do not claim production readiness while demo auth or in-memory persistence remains.
