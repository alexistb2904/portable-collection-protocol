# Framework Examples

The standalone kit includes equivalent integrations for the most common Node.js and Python server frameworks.

## Node.js

| Framework | Example | Recommended integration shape |
| --- | --- | --- |
| Fastify | `examples/fastify` | route plugin + existing auth hook + shared services |
| Express 5 | `examples/node-express` | Router + middleware + protocol service |
| NestJS 12 | `examples/node-nestjs` | dedicated Module + Controller + injected Service |

All Node examples reuse:

- `@wikicard/portable-collection-core`;
- `@wikicard/portable-collection-server`.

## Python

| Framework | Example | Recommended integration shape |
| --- | --- | --- |
| FastAPI | `examples/python-fastapi` | dependency auth + async service lifetime |
| Flask 3 | `examples/python-flask` | Blueprint + async views + existing auth extension |
| Django 6.1 | `examples/python-django` | dedicated Django app + async views + ORM model |

All Python examples reuse:

- `python-sdk/`;
- Pydantic wire validation;
- Ed25519 signatures;
- RFC 8785/JCS-compatible canonicalization;
- async Redis/httpx protocol services.

## What the examples deliberately do not provide

They do not try to guess your application's:

- user/session schema;
- ORM;
- card tables;
- account recovery;
- production CSRF configuration;
- external collection database model.

Those are application boundaries, not protocol concerns.

Every example marks the code that must be replaced before production.

## Browser UI

`examples/browser-ui` is framework-neutral and demonstrates:

- issuer consent;
- validated client preview;
- destination file selection/import start.

For production, integrate the same flow into the host application's design system.

## Agent guides

Coding agents should start with root `AGENTS.md` and then read `docs/agents/` instead of mechanically copying an example.

Each framework example also contains a local `AGENT.md` with framework-specific replacement points.
