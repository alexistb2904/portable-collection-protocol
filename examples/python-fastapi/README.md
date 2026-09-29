# FastAPI example

Reference integration for **FastAPI** using the Python SDK.

Replace before production:

- `require_site_user()` with your real dependency/session authentication;
- `DemoCollectionSource.build_current_collection()` with an authoritative database query;
- the in-memory `linked` dictionary with persistent storage.

Run:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 3400
```

The issuer consent UI is intentionally separate in `../browser-ui`. Mount/adapt it to your normal authenticated frontend route `/collection/authorize`.

Demo authenticated routes expect `X-Demo-User-Id`. Never use this mechanism in production.
