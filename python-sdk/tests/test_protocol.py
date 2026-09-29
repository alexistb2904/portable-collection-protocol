from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from wikicard_portable_collection import (
    AuthorizationServerOptions,
    CollectionAuthorizationServer,
    CollectionBody,
    CollectionPayload,
    IssuerIdentity,
    MemoryProtocolStore,
    SubjectIdentity,
    canonicalize_json,
    public_jwk,
    sign_collection,
    verify_collection,
)


def test_canonicalization_vector_matches_node_contract():
    vector_path = Path(__file__).parents[2] / "spec" / "conformance-vectors.json"
    vector = json.loads(vector_path.read_text())["cases"][0]
    canonical = canonicalize_json(vector["input"])
    assert canonical == vector["canonical"]
    assert hashlib.sha256(canonical.encode()).hexdigest() == vector["sha256Hex"]


def test_signed_collection_detects_tampering():
    key = Ed25519PrivateKey.generate()
    payload = CollectionPayload(
        exportId=str(uuid.uuid4()),
        issuer=IssuerIdentity(id="https://source.example/api", name="Source"),
        subject=SubjectIdentity(id="https://source.example/api:user:123", username="alice"),
        issuedAt="2026-09-29T12:00:00.000Z",
        collection=CollectionBody(count=0, cards=[]),
    )
    signed = sign_collection(payload, key)
    jwk = public_jwk(key)
    assert verify_collection(signed.model_dump(mode="json"), jwk) is not None

    tampered = signed.model_dump(mode="json")
    tampered["payload"]["subject"]["username"] = "mallory"
    assert verify_collection(tampered, jwk) is None


class Source:
    issuer = "https://source.example/api"

    def subject_id_for_user(self, user_id: str) -> str:
        return f"{self.issuer}:user:{user_id}"

    async def build_current_collection(self, user_id: str) -> CollectionPayload:
        return CollectionPayload(
            exportId=str(uuid.uuid4()),
            issuer=IssuerIdentity(id=self.issuer, name="Source"),
            subject=SubjectIdentity(id=self.subject_id_for_user(user_id), username="alice"),
            issuedAt=datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            collection=CollectionBody(count=0, cards=[]),
        )


@pytest.mark.asyncio
async def test_authorization_code_and_token_are_single_use():
    issuer = "https://source.example/api"
    client = "https://destination.example/api"
    user_id = str(uuid.uuid4())
    verifier = "a" * 64
    challenge = __import__("base64").urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()

    server = CollectionAuthorizationServer(
        AuthorizationServerOptions(
            issuer=issuer,
            web_origin="https://source.example",
            private_key=Ed25519PrivateKey.generate(),
            store=MemoryProtocolStore(),
            source=Source(),
            trusted_clients={client},
        )
    )

    request = {
        "client_id": client,
        "redirect_uri": f"{client}/collection-transfer/callback",
        "response_type": "code",
        "scope": "collection:read",
        "state": "s" * 48,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "subject_id": f"{issuer}:user:{user_id}",
        "destination_account": f"{client}:user:destination",
        "export_hash": "A" * 43,
    }

    granted = await server.authorize(user_id, request)
    code = __import__("urllib.parse", fromlist=["urlparse"]).parse_qs(
        __import__("urllib.parse", fromlist=["urlparse"]).urlparse(granted["redirectUrl"]).query
    )["code"][0]

    token = await server.exchange_code(
        {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": client,
            "redirect_uri": f"{client}/collection-transfer/callback",
            "code_verifier": verifier,
        }
    )

    with pytest.raises(ValueError):
        await server.exchange_code(
            {
                "grant_type": "authorization_code",
                "code": code,
                "client_id": client,
                "redirect_uri": f"{client}/collection-transfer/callback",
                "code_verifier": verifier,
            }
        )

    live = await server.consume_live_collection(token["access_token"])
    assert live.authorization.payload.destinationAccount == f"{client}:user:destination"

    with pytest.raises(ValueError):
        await server.consume_live_collection(token["access_token"])
