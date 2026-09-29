# Agent Framework Selection

Use this page to choose the closest reference implementation.

| Runtime | Framework | Reference | Recommended use |
| --- | --- | --- | --- |
| Node.js | Fastify | `examples/fastify` | Existing Fastify APIs, low-overhead services |
| Node.js | Express | `examples/node-express` | Existing Express REST APIs |
| Node.js | NestJS | `examples/node-nestjs` | Structured modules/controllers/providers |
| Python | FastAPI | `examples/python-fastapi` | Async APIs, Pydantic-heavy applications |
| Python | Flask | `examples/python-flask` | Lightweight Flask applications |
| Python | Django | `examples/python-django` | Django auth/ORM applications |

## Detection hints for agents

Fastify:

- dependency `fastify`;
- routes such as `app.get()`, `app.post()`;
- plugins registered with `app.register()`.

Express:

- dependency `express`;
- `express()`;
- routers/middleware using `req`, `res`, `next`.

NestJS:

- `@nestjs/core`;
- `@Module`, `@Controller`, `@Injectable`;
- providers and dependency injection.

FastAPI:

- `fastapi.FastAPI`;
- decorators such as `@app.get`;
- Pydantic request/response models;
- dependency injection using `Depends`.

Flask:

- `flask.Flask`;
- `@app.route` or method decorators;
- request-local `flask.request`.

Django:

- `manage.py`;
- Django settings;
- URLconf;
- views, apps and ORM models;
- usually `request.user` for authentication.

## Do not migrate frameworks

If the host already uses one of these frameworks, integrate into it.

Do not replace Express with Fastify, Flask with FastAPI, or Django with a standalone microservice merely to copy an example.

The examples demonstrate protocol wiring, not architecture migration.
