from __future__ import annotations

import base64
import hashlib
import hmac
from typing import Any

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

from .canonical import canonicalize_json
from .constants import AUTHORIZATION_SIGNATURE_CONTEXT, COLLECTION_SIGNATURE_CONTEXT
from .models import (
    CollectionPayload,
    ImportAuthorizationPayload,
    SignatureProof,
    SignedCollection,
    SignedImportAuthorization,
)


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * ((4 - len(value) % 4) % 4)
    return base64.urlsafe_b64decode(value + padding)


def private_key_from_base64_pkcs8(value: str) -> Ed25519PrivateKey:
    key = serialization.load_der_private_key(base64.b64decode(value), password=None)
    if not isinstance(key, Ed25519PrivateKey):
        raise TypeError("Expected an Ed25519 PKCS#8 private key")
    return key


def public_jwk(private_key: Ed25519PrivateKey) -> dict[str, str]:
    raw = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return {"kty": "OKP", "crv": "Ed25519", "x": _b64url(raw)}


def key_id_for_jwk(jwk: dict[str, str]) -> str:
    canonical = canonicalize_json({"crv": jwk["crv"], "kty": jwk["kty"], "x": jwk["x"]})
    digest = hashlib.sha256(canonical.encode("utf-8")).digest()
    return "ed25519-sha256-" + _b64url(digest)


def _sign_payload(payload: dict[str, Any], context: str, private_key: Ed25519PrivateKey) -> SignatureProof:
    data = (context + canonicalize_json(payload)).encode("utf-8")
    jwk = public_jwk(private_key)
    return SignatureProof(
        keyId=key_id_for_jwk(jwk),
        payloadHash=_b64url(hashlib.sha256(data).digest()),
        signature=_b64url(private_key.sign(data)),
    )


def _verify_payload(payload: dict[str, Any], proof: SignatureProof, context: str, jwk: dict[str, str]) -> bool:
    if proof.keyId != key_id_for_jwk(jwk):
        return False
    data = (context + canonicalize_json(payload)).encode("utf-8")
    expected = _b64url(hashlib.sha256(data).digest())
    if not hmac.compare_digest(expected, proof.payloadHash):
        return False
    try:
        key = Ed25519PublicKey.from_public_bytes(_b64url_decode(jwk["x"]))
        key.verify(_b64url_decode(proof.signature), data)
        return True
    except Exception:
        return False


def sign_collection(payload: CollectionPayload, private_key: Ed25519PrivateKey) -> SignedCollection:
    raw = payload.model_dump(mode="json")
    return SignedCollection(payload=payload, proof=_sign_payload(raw, COLLECTION_SIGNATURE_CONTEXT, private_key))


def verify_collection(value: Any, jwk: dict[str, str]) -> SignedCollection | None:
    try:
        raw_envelope = value.model_dump(mode="json") if isinstance(value, SignedCollection) else value
        signed = SignedCollection.model_validate(raw_envelope)
        raw_payload = raw_envelope["payload"]
    except Exception:
        return None
    return signed if _verify_payload(raw_payload, signed.proof, COLLECTION_SIGNATURE_CONTEXT, jwk) else None


def sign_import_authorization(
    payload: ImportAuthorizationPayload,
    private_key: Ed25519PrivateKey,
) -> SignedImportAuthorization:
    raw = payload.model_dump(mode="json")
    return SignedImportAuthorization(
        payload=payload,
        proof=_sign_payload(raw, AUTHORIZATION_SIGNATURE_CONTEXT, private_key),
    )


def verify_import_authorization(value: Any, jwk: dict[str, str]) -> SignedImportAuthorization | None:
    try:
        raw_envelope = value.model_dump(mode="json") if isinstance(value, SignedImportAuthorization) else value
        signed = SignedImportAuthorization.model_validate(raw_envelope)
        raw_payload = raw_envelope["payload"]
    except Exception:
        return None
    return signed if _verify_payload(raw_payload, signed.proof, AUTHORIZATION_SIGNATURE_CONTEXT, jwk) else None
