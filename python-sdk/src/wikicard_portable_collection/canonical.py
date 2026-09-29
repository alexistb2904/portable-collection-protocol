from __future__ import annotations

from typing import Any

import rfc8785


def canonicalize_json_bytes(value: Any) -> bytes:
    """
    Canonicalize a JSON-compatible value using RFC 8785/JCS semantics.

    WIKICARD-C14N-JSON-1 deliberately follows the same key ordering,
    JSON string encoding and ECMAScript number serialization for valid
    JSON values, so Node and Python implementations produce identical bytes.
    """
    return rfc8785.dumps(value)


def canonicalize_json(value: Any) -> str:
    return canonicalize_json_bytes(value).decode("utf-8")
