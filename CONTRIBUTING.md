# Contributing

Protocol changes should be reviewed more strictly than ordinary implementation changes.

## Before opening a change

1. Identify whether the change affects:
   - wire format;
   - canonicalization;
   - signature context;
   - trust semantics;
   - authorization bindings;
   - SDK implementation only;
   - documentation only.
2. Read `docs/versioning.md`.
3. Update machine-readable schemas when the wire contract changes.
4. Add or update security tests.
5. Update the conformance checklist if a new mandatory behavior is introduced.

## Local validation

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm docs:build

python -m venv .venv
source .venv/bin/activate
pip install -e "./python-sdk[dev]"
pytest python-sdk/tests
python -m compileall python-sdk/src examples/python-fastapi examples/python-flask examples/python-django
```

## Security-sensitive changes

Changes to signing, canonicalization, issuer trust, redirect validation, PKCE, one-time state or destination-account binding should include an explicit security rationale in the pull request.

## Compatibility

Do not make a breaking v1 change while keeping the same required protocol identifiers.
