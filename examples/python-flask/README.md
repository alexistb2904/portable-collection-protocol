# Flask example

Reference integration for **Flask 3** using async views and the Python SDK.

Replace before production:

- `require_site_user()` with your real Flask-Login/session/JWT integration;
- `DemoCollectionSource.build_current_collection()` with the authoritative ownership query;
- the in-memory `linked` dictionary with persistent storage.

Run:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The issuer consent UI lives in `../browser-ui` and should be integrated into the site's existing authenticated frontend at `/collection/authorize`.
