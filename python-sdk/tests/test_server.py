import base64
import hashlib
import uuid

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
)


ISSUER = "https://source.example/api"
CLIENT = "https://destination.example/api"
VERIFIER = "a" * 64
CHALLENGE = base64.urlsafe_b64encode(hashlib.sha256(VERIFIER.encode()).digest()).rstrip(b"=").decode()


class Source:
    def subject_id_for_user(self, user_id: str) -> str:
        return f"{ISSUER}:user:{user_id}"

    async def build_current_collection(self, user_id: str) -> CollectionPayload:
        return CollectionPayload(
            exportId=str(uuid.uuid4()),
            issuer=IssuerIdentity(id=ISSUER, name="Source"),
            subject=SubjectIdentity(id=self.subject_id_for_user(user_id), username="alice"),
            issuedAt="2026-09-29T12:00:00Z",
            collection=CollectionBody(count=0, cards=[]),
        )


def request_for(user_id: str) -> dict:
    return {
        "client_id": CLIENT,
        "redirect_uri": f"{CLIENT}/collection-transfer/callback",
        "response_type": "code",
        "scope": "collection:read",
        "state": "s" * 48,
        "code_challenge": CHALLENGE,
        "code_challenge_method": "S256",
        "subject_id": f"{ISSUER}:user:{user_id}",
        "destination_account": f"{CLIENT}:user:destination",
        "export_hash": "A" * 43,
    }


@pytest.mark.asyncio
async def test_code_and_token_are_one_time():
    user_id = str(uuid.uuid4())
    server = CollectionAuthorizationServer(
        AuthorizationServerOptions(
            issuer=ISSUER,
            web_origin="https://source.example",
            private_key=Ed25519PrivateKey.generate(),
            store=MemoryProtocolStore(),
            source=Source(),
            trusted_clients={CLIENT},
        )
    )

    granted = await server.authorize(user_id, request_for(user_id))
    from urllib.parse import parse_qs, urlparse

    code = parse_qs(urlparse(granted["redirectUrl"]).query)["code"][0]

    token = await server.exchange_code(
        {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": CLIENT,
            "redirect_uri": f"{CLIENT}/collection-transfer/callback",
            "code_verifier": VERIFIER,
        }
    )

    with pytest.raises(ValueError, match="already used"):
        await server.exchange_code(
            {
                "grant_type": "authorization_code",
                "code": code,
                "client_id": CLIENT,
                "redirect_uri": f"{CLIENT}/collection-transfer/callback",
                "code_verifier": VERIFIER,
            }
        )

    live = await server.consume_live_collection(token["access_token"])
    assert str(live.authorization.payload.audience).rstrip("/") == CLIENT
    assert live.authorization.payload.destinationAccount == f"{CLIENT}:user:destination"

    with pytest.raises(ValueError, match="already used"):
        await server.consume_live_collection(token["access_token"])


@pytest.mark.asyncio
async def test_source_account_mismatch_is_rejected():
    server = CollectionAuthorizationServer(
        AuthorizationServerOptions(
            issuer=ISSUER,
            web_origin="https://source.example",
            private_key=Ed25519PrivateKey.generate(),
            store=MemoryProtocolStore(),
            source=Source(),
            trusted_clients={CLIENT},
        )
    )

    with pytest.raises(ValueError, match="does not match export subject"):
        await server.authorize(str(uuid.uuid4()), request_for(str(uuid.uuid4())))
