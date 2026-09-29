# Agent Guide — Flask

Reference: `examples/python-flask/`.

## Async support

The protocol services are async.

Use Flask async views or place protocol operations in an ASGI-compatible architecture.

Do not call `asyncio.run()` independently in every request when using shared async Redis/http clients.

## Authentication

Replace the demo helper with Flask-Login, your session middleware, JWT extension or existing application auth.

## Blueprint

In an existing project, place protocol routes in a dedicated Blueprint.

## CSRF

If browser session auth uses Flask-WTF or another CSRF layer, keep CSRF enabled for browser consent actions.

Do not blindly exempt the entire protocol Blueprint.

## Persistence

Replace the example in-memory link map with the existing SQLAlchemy/repository layer.
