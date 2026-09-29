# Python Agent Guide

Use the reference package under `python-sdk/`.

Install in a standalone checkout:

```bash
pip install -e ./python-sdk
```

## Important signed-data rule

Do not parse a signed URL or timestamp and then serialize a normalized replacement before signature verification.

The Python SDK validates signed URL/date strings while preserving their original lexical value.

This matters for cross-language signature compatibility.

## Canonicalization

The Python reference implementation uses RFC 8785/JCS-compatible canonicalization semantics matching `WIKICARD-C14N-JSON-1` for valid JSON values.

Do not replace it with plain `json.dumps(sort_keys=True)`.

## Async protocol services

The Python authorization/import services are async.

Frameworks should use native async views when available.

Do not repeatedly create and destroy event loops around Redis/httpx calls in production.

## Application boundary

Replace the demo source adapter with:

- existing authenticated user lookup;
- current ORM ownership query;
- stable instance mapping.

## Shared state

Use Redis across all application workers.

Do not use the in-memory store in multi-worker deployment.

## Validation

Pydantic models protect the wire boundary, but trust policy remains an application decision.

A valid model + signature does not make an issuer trusted.
