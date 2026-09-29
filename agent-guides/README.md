# Agent Guides

These files are written for coding agents working inside an existing application repository.

They complement the human documentation in `docs/`.

## Recommended order

1. Read `00-audit-first.md`.
2. Read either `node.md` or `python.md`.
3. Read the framework-specific guide.
4. Read `security-review.md`.
5. Read `../docs/conformance.md` before declaring the integration complete.

## Framework guides

### Node.js

- `frameworks/express.md`
- `frameworks/fastify.md`
- `frameworks/nestjs.md`

### Python

- `frameworks/fastapi.md`
- `frameworks/flask.md`
- `frameworks/django.md`

## Important instruction for agents

Do not replace the host application's authentication, ORM, user model, session strategy or deployment architecture just to fit the reference examples.

The protocol is an integration layer.

Adapt it to the application while preserving the mandatory protocol security properties.
