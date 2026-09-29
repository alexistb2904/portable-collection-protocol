# Agent Guide — Django

Reference: `examples/python-django/`.

## Recommended integration

Keep the protocol in a dedicated Django app, for example:

```text
portable_collection/
  urls.py
  views.py
  services.py
  adapters.py
  models.py
```

## Authentication

Use `request.user` and the existing authentication/session stack.

The demo header adapter is only a teaching stub.

## CSRF

The minimal example omits production CSRF wiring.

In a real Django application:

- keep CSRF protection on browser-authenticated authorization actions;
- do not globally disable CSRF for the app;
- treat the token endpoint as server-to-server and design its exemption narrowly if needed.

## ORM

Create a model for verified external collection links.

Use database constraints for the identity tuple appropriate to your application.

## Async

Django async views can call the async protocol services directly.

Ensure the deployment stack and Redis client usage are compatible with your ASGI/worker model.
