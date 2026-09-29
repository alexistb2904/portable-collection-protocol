# Agent Framework Selector

Use this file when the user asks to integrate the protocol but does not explicitly name the server framework.

## Detect Node.js

Inspect `package.json`, lockfiles and imports.

### Express

Signals:

- dependency `express`;
- `express()`;
- `Router()`;
- middleware shaped as `(req, res, next)`.

Read:

- `node.md`
- `frameworks/express.md`
- reference `../examples/node-express/`

### Fastify

Signals:

- dependency `fastify`;
- `Fastify()`;
- `app.register()`;
- route handlers using `request, reply`.

Read:

- `node.md`
- `frameworks/fastify.md`
- reference `../examples/fastify/`

### NestJS

Signals:

- dependencies `@nestjs/core`, `@nestjs/common`;
- decorators such as `@Controller`, `@Injectable`, `@Module`.

Read:

- `node.md`
- `frameworks/nestjs.md`
- reference `../examples/node-nestjs/`

## Detect Python

Inspect `pyproject.toml`, `requirements*.txt`, `Pipfile`, imports and application entrypoints.

### FastAPI

Signals:

- dependency/import `fastapi`;
- `FastAPI()`;
- route decorators such as `@app.get`;
- `Depends`.

Read:

- `python.md`
- `frameworks/fastapi.md`
- reference `../examples/python-fastapi/`

### Flask

Signals:

- dependency/import `flask`;
- `Flask(__name__)`;
- Blueprints or `@app.route`.

Read:

- `python.md`
- `frameworks/flask.md`
- reference `../examples/python-flask/`

### Django

Signals:

- dependency `django`;
- `manage.py`;
- `settings.py`;
- `urls.py`;
- Django models/views.

Read:

- `python.md`
- `frameworks/django.md`
- reference `../examples/python-django/`

## Unknown framework

If none match:

1. do not force one of the examples into the project;
2. use `../spec/openapi.yaml` and `../docs/protocol.md`;
3. preserve the same trust, PKCE, signature and one-time-state requirements;
4. isolate the implementation behind application-specific adapters;
5. document the new framework mapping for future integrators.

## Multiple frameworks

If the repository contains more than one server:

- identify which service owns user authentication;
- identify which service owns authoritative card ownership;
- identify which public origin should be the protocol issuer;
- avoid implementing duplicate issuer authorities unless that is an explicit architecture decision.
