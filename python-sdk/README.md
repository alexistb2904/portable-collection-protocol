# Python SDK

Python 3.11+ reference implementation of the portable collection protocol.

It provides:

- Pydantic models;
- deterministic canonical JSON;
- Ed25519 signing and verification;
- issuer discovery;
- authorization-code + PKCE helpers;
- Redis-backed one-time protocol state;
- source authorization server and destination importer services.

Install locally from the standalone repository:

```bash
pip install -e ./python-sdk
```

The framework examples under `examples/python-*` use this package.
