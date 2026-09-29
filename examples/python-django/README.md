# Django example

Reference integration for **Django 5** using async views and the Python SDK.

The protocol is isolated inside the `protocol_app` Django application. In an existing project, copy/adapt that app instead of replacing project-wide settings.

Replace before production:

- `require_site_user()` with `request.user` and your existing authentication;
- `DemoCollectionSource.build_current_collection()` with ORM queries against current ownership;
- the in-memory `linked` dictionary with a Django model;
- the demo settings with your normal CSRF/session/security middleware.

Run:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py runserver 0.0.0.0:3600
```

The minimal example omits production authentication and CSRF wiring on purpose and refuses `ENVIRONMENT=production`. Integrate the protocol routes into your existing authenticated Django application before deployment.
