# Agent Guide — FastAPI

Reference: `examples/python-fastapi/`.

## Existing auth

Replace the demo dependency with the application's existing dependency:

```py
async def current_user(...):
    ...
```

Then inject it with `Depends`.

## Service lifetime

Create Redis/httpx/protocol services at application startup or in lifespan state.

Do not open a new Redis connection for every request.

## Validation

FastAPI/Pydantic request validation can wrap framework-facing DTOs, but signed payload verification must use the SDK models without normalizing signed strings.

## Exceptions

Map protocol validation failures to controlled 4xx responses.

Do not expose stack traces in production.

## Persistence

Persist verified external links through SQLAlchemy/SQLModel/Tortoise or the existing ORM; do not keep the example dictionary.
