from __future__ import annotations

import hashlib
import json
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol
from urllib.parse import urlencode, urlparse

import httpx
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from pydantic import BaseModel, ConfigDict, Field

from .constants import AUTHORIZATION_PROTOCOL, COLLECTION_FORMAT, COLLECTION_VERSION
from .crypto import (
    key_id_for_jwk,
    public_jwk,
    sign_collection,
    sign_import_authorization,
    verify_collection,
    verify_import_authorization,
)
from .models import (
    CollectionPayload,
    ImportAuthorizationPayload,
    IssuerDocument,
    LiveCollectionResponse,
    SignedCollection,
    UrlString,
)
from .store import ProtocolStore, hash_opaque_token


def normalize_url(value: str) -> str:
    return value.rstrip("/")


def _pkce_s256(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("utf-8")).digest()
    import base64

    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def _secure_token(nbytes: int) -> str:
    return secrets.token_urlsafe(nbytes)


def _iso_utc(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


class CollectionSourceAdapter(Protocol):
    def subject_id_for_user(self, user_id: str) -> str: ...

    async def build_current_collection(self, user_id: str) -> CollectionPayload: ...


class AuthorizationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    client_id: UrlString
    redirect_uri: UrlString
    response_type: str
    scope: str
    state: str = Field(min_length=32, max_length=512)
    code_challenge: str = Field(min_length=43, max_length=128)
    code_challenge_method: str
    subject_id: str
    destination_account: str
    export_hash: str


class TokenRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    grant_type: str
    code: str
    client_id: UrlString
    redirect_uri: UrlString
    code_verifier: str = Field(min_length=43, max_length=128)


@dataclass
class AuthorizationServerOptions:
    issuer: str
    web_origin: str
    private_key: Ed25519PrivateKey
    store: ProtocolStore
    source: CollectionSourceAdapter
    trusted_clients: set[str]
    code_ttl_seconds: int = 180
    token_ttl_seconds: int = 300


class CollectionAuthorizationServer:
    def __init__(self, options: AuthorizationServerOptions) -> None:
        self.options = options
        self.issuer = normalize_url(options.issuer)

    def _expected_redirect(self, client_id: str) -> str:
        return f"{normalize_url(client_id)}/collection-transfer/callback"

    def _validate(self, user_id: str, raw: Any) -> tuple[AuthorizationRequest, str, str]:
        request = AuthorizationRequest.model_validate(raw)
        client_id = normalize_url(str(request.client_id))

        if client_id not in {normalize_url(v) for v in self.options.trusted_clients}:
            raise ValueError("Destination client is not trusted")
        if self.options.web_origin.startswith("https://") and urlparse(client_id).scheme != "https":
            raise ValueError("Production destination clients must use HTTPS")
        if str(request.redirect_uri) != self._expected_redirect(client_id):
            raise ValueError("Invalid destination redirect URI")
        if request.response_type != "code" or request.scope != "collection:read":
            raise ValueError("Unsupported authorization request")
        if request.code_challenge_method != "S256":
            raise ValueError("PKCE S256 is required")
        if not request.destination_account.startswith(f"{client_id}:user:"):
            raise ValueError("Destination account is outside the destination client namespace")

        subject_id = self.options.source.subject_id_for_user(user_id)
        if request.subject_id != subject_id:
            raise ValueError("Authenticated source account does not match export subject")
        return request, client_id, subject_id

    def inspect(self, user_id: str, raw: Any) -> dict[str, Any]:
        request, client_id, _ = self._validate(user_id, raw)
        return {
            "clientId": client_id,
            "clientHost": urlparse(client_id).hostname,
            "scope": request.scope,
            "codeExpiresIn": self.options.code_ttl_seconds,
        }

    async def authorize(self, user_id: str, raw: Any) -> dict[str, Any]:
        request, client_id, subject_id = self._validate(user_id, raw)
        code = _secure_token(32)
        stored = {
            "userId": user_id,
            "clientId": client_id,
            "redirectUri": str(request.redirect_uri),
            "subjectId": subject_id,
            "destinationAccount": request.destination_account,
            "exportHash": request.export_hash,
            "codeChallenge": request.code_challenge,
        }
        await self.options.store.put(
            f"auth-code:{hash_opaque_token(code)}",
            json.dumps(stored, separators=(",", ":")),
            self.options.code_ttl_seconds,
        )
        query = urlencode({"code": code, "state": request.state})
        return {
            "redirectUrl": f"{request.redirect_uri}?{query}",
            "expiresIn": self.options.code_ttl_seconds,
        }

    async def exchange_code(self, raw: Any) -> dict[str, Any]:
        request = TokenRequest.model_validate(raw)
        if request.grant_type != "authorization_code":
            raise ValueError("Unsupported grant type")

        stored_raw = await self.options.store.take(f"auth-code:{hash_opaque_token(request.code)}")
        if not stored_raw:
            raise ValueError("Authorization code is invalid, expired or already used")
        stored = json.loads(stored_raw)

        if normalize_url(str(request.client_id)) != stored["clientId"]:
            raise ValueError("Authorization code client binding mismatch")
        if str(request.redirect_uri) != stored["redirectUri"]:
            raise ValueError("Authorization code redirect binding mismatch")
        if not secrets.compare_digest(_pkce_s256(request.code_verifier), stored["codeChallenge"]):
            raise ValueError("PKCE verification failed")

        access_token = _secure_token(48)
        token_data = {
            "userId": stored["userId"],
            "clientId": stored["clientId"],
            "subjectId": stored["subjectId"],
            "destinationAccount": stored["destinationAccount"],
            "exportHash": stored["exportHash"],
        }
        await self.options.store.put(
            f"access-token:{hash_opaque_token(access_token)}",
            json.dumps(token_data, separators=(",", ":")),
            self.options.token_ttl_seconds,
        )
        return {
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": self.options.token_ttl_seconds,
            "scope": "collection:read",
        }

    async def consume_live_collection(self, access_token: str) -> LiveCollectionResponse:
        stored_raw = await self.options.store.take(f"access-token:{hash_opaque_token(access_token)}")
        if not stored_raw:
            raise ValueError("Live collection token is invalid, expired or already used")
        stored = json.loads(stored_raw)

        payload = await self.options.source.build_current_collection(stored["userId"])
        if payload.subject.id != stored["subjectId"]:
            raise ValueError("Collection source returned a different subject")
        collection = sign_collection(payload, self.options.private_key)

        now = datetime.now(timezone.utc)
        authorization = sign_import_authorization(
            ImportAuthorizationPayload(
                authorizationId=str(uuid.uuid4()),
                issuer=self.issuer,
                subjectId=stored["subjectId"],
                audience=stored["clientId"],
                destinationAccount=stored["destinationAccount"],
                requestedExportHash=stored["exportHash"],
                liveCollectionHash=collection.proof.payloadHash,
                issuedAt=_iso_utc(now),
                expiresAt=_iso_utc(now + timedelta(seconds=self.options.token_ttl_seconds)),
            ),
            self.options.private_key,
        )
        return LiveCollectionResponse(authorization=authorization, collection=collection)

    def issuer_document(self) -> dict[str, Any]:
        jwk = public_jwk(self.options.private_key)
        return {
            "issuer": self.issuer,
            "protocol": COLLECTION_FORMAT,
            "version": COLLECTION_VERSION,
            "keys": [
                {
                    "id": key_id_for_jwk(jwk),
                    "use": "sig",
                    "alg": "EdDSA",
                    **jwk,
                }
            ],
            "authorization": {
                "protocol": AUTHORIZATION_PROTOCOL,
                "authorizationEndpoint": f"{normalize_url(self.options.web_origin)}/collection/authorize",
                "tokenEndpoint": f"{self.issuer}/collection-transfer/token",
                "collectionEndpoint": f"{self.issuer}/collection-transfer/current",
                "codeChallengeMethods": ["S256"],
            },
            "contact": {
                "discord": "alexistb2904",
                "email": "wikicard@alexistb.com",
            },
        }


@dataclass
class DestinationImporterOptions:
    issuer: str
    store: ProtocolStore
    trusted_issuers: set[str]
    import_state_ttl_seconds: int = 600
    max_live_age_seconds: int = 120
    timeout_seconds: float = 10.0


class CollectionDestinationImporter:
    def __init__(self, options: DestinationImporterOptions) -> None:
        self.options = options
        self.issuer = normalize_url(options.issuer)

    def _trusted(self, issuer: str) -> bool:
        return normalize_url(issuer) in {normalize_url(v) for v in self.options.trusted_issuers}

    async def _issuer_document(self, issuer: str, client: httpx.AsyncClient) -> IssuerDocument:
        response = await client.get(
            f"{normalize_url(issuer)}/.well-known/wikicard-issuer.json",
            headers={"accept": "application/json"},
        )
        response.raise_for_status()
        if len(response.content) > 65536:
            raise ValueError("Issuer discovery document exceeds 64 KiB")
        document = IssuerDocument.model_validate(response.json())
        if normalize_url(str(document.issuer)) != normalize_url(issuer):
            raise ValueError("Issuer discovery identity mismatch")
        return document

    @staticmethod
    def _public_jwk(document: IssuerDocument, key_id: str) -> dict[str, str]:
        for key in document.keys:
            if key.id == key_id:
                return {"kty": key.kty, "crv": key.crv, "x": key.x}
        raise ValueError("Signing key not found")

    async def verify_uploaded_export(self, value: Any) -> tuple[SignedCollection, IssuerDocument]:
        signed = SignedCollection.model_validate(value)
        issuer = normalize_url(str(signed.payload.issuer.id))
        if not self._trusted(issuer):
            raise ValueError("Collection issuer is not trusted")
        if signed.payload.collection.count != len(signed.payload.collection.cards):
            raise ValueError("Collection count mismatch")

        seen: set[str] = set()
        for card in signed.payload.collection.cards:
            if card.instanceId in seen:
                raise ValueError("Duplicate instanceId")
            seen.add(card.instanceId)
            expected = (
                f"wikidata:{card.definition.wikidataId}"
                if card.definition.wikidataId
                else f"wikipedia:{card.definition.source.language}:{card.definition.source.pageId}"
            )
            if card.definition.canonicalId != expected:
                raise ValueError("Invalid canonicalId")

        async with httpx.AsyncClient(
            timeout=self.options.timeout_seconds,
            follow_redirects=False,
        ) as client:
            document = await self._issuer_document(issuer, client)
        verified = verify_collection(
            value,
            self._public_jwk(document, signed.proof.keyId),
        )
        if not verified:
            raise ValueError("Collection signature is invalid")
        return verified, document

    async def start(self, user_id: str, destination_account: str, value: Any) -> dict[str, Any]:
        if not destination_account.startswith(f"{self.issuer}:user:"):
            raise ValueError("Destination account must be namespaced under destination issuer")

        exported, document = await self.verify_uploaded_export(value)
        capabilities = document.authorization
        if capabilities is None or "S256" not in capabilities.codeChallengeMethods:
            raise ValueError("Source issuer does not support WIKICARD-AUTH-CODE-1")

        issuer_origin = urlparse(str(document.issuer))
        for endpoint in (capabilities.tokenEndpoint, capabilities.collectionEndpoint):
            parsed = urlparse(str(endpoint))
            if (parsed.scheme, parsed.netloc) != (issuer_origin.scheme, issuer_origin.netloc):
                raise ValueError("Server-to-server endpoint must remain on issuer origin")

        verifier = _secure_token(48)
        state = _secure_token(32)
        stored = {
            "userId": user_id,
            "issuer": normalize_url(str(document.issuer)),
            "subjectId": exported.payload.subject.id,
            "destinationAccount": destination_account,
            "originalExportHash": exported.proof.payloadHash,
            "codeVerifier": verifier,
            "tokenEndpoint": str(capabilities.tokenEndpoint),
            "collectionEndpoint": str(capabilities.collectionEndpoint),
        }
        await self.options.store.put(
            f"import-state:{hash_opaque_token(state)}",
            json.dumps(stored, separators=(",", ":")),
            self.options.import_state_ttl_seconds,
        )

        query = urlencode(
            {
                "client_id": self.issuer,
                "redirect_uri": f"{self.issuer}/collection-transfer/callback",
                "response_type": "code",
                "scope": "collection:read",
                "state": state,
                "code_challenge": _pkce_s256(verifier),
                "code_challenge_method": "S256",
                "subject_id": exported.payload.subject.id,
                "destination_account": destination_account,
                "export_hash": exported.proof.payloadHash,
            }
        )
        return {
            "authorizationUrl": f"{capabilities.authorizationEndpoint}?{query}",
            "stateExpiresIn": self.options.import_state_ttl_seconds,
        }

    async def complete(self, code: str, state: str) -> dict[str, Any]:
        stored_raw = await self.options.store.take(f"import-state:{hash_opaque_token(state)}")
        if not stored_raw:
            raise ValueError("Import state is invalid, expired or already used")
        stored = json.loads(stored_raw)

        async with httpx.AsyncClient(
            timeout=self.options.timeout_seconds,
            follow_redirects=False,
        ) as client:
            token_response = await client.post(
                stored["tokenEndpoint"],
                json={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": self.issuer,
                    "redirect_uri": f"{self.issuer}/collection-transfer/callback",
                    "code_verifier": stored["codeVerifier"],
                },
                headers={"accept": "application/json"},
            )
            token_response.raise_for_status()
            if len(token_response.content) > 65536:
                raise ValueError("Token response too large")
            token = token_response.json()

            live_response = await client.get(
                stored["collectionEndpoint"],
                headers={
                    "authorization": f"Bearer {token['access_token']}",
                    "accept": "application/json",
                },
            )
            live_response.raise_for_status()
            if len(live_response.content) > 16 * 1024 * 1024:
                raise ValueError("Live collection response too large")
            raw_live = live_response.json()
            live = LiveCollectionResponse.model_validate(raw_live)

            document = await self._issuer_document(stored["issuer"], client)

        collection_jwk = self._public_jwk(document, live.collection.proof.keyId)
        verified_collection = verify_collection(
            raw_live["collection"],
            collection_jwk,
        )
        if not verified_collection:
            raise ValueError("Live collection signature is invalid")
        if normalize_url(str(verified_collection.payload.issuer.id)) != stored["issuer"]:
            raise ValueError("Live issuer mismatch")
        if verified_collection.payload.subject.id != stored["subjectId"]:
            raise ValueError("Live subject mismatch")

        now = datetime.now(timezone.utc)
        live_issued = _parse_datetime(verified_collection.payload.issuedAt)
        if live_issued.tzinfo is None:
            live_issued = live_issued.replace(tzinfo=timezone.utc)
        if live_issued > now + timedelta(minutes=5):
            raise ValueError("Live collection timestamp is invalid")
        if now - live_issued > timedelta(seconds=self.options.max_live_age_seconds):
            raise ValueError("Live collection is stale")

        authorization_jwk = self._public_jwk(document, live.authorization.proof.keyId)
        authorization = verify_import_authorization(
            raw_live["authorization"],
            authorization_jwk,
        )
        if not authorization:
            raise ValueError("Import authorization signature is invalid")

        payload = authorization.payload
        if normalize_url(str(payload.issuer)) != stored["issuer"]:
            raise ValueError("Authorization issuer mismatch")
        if normalize_url(str(payload.audience)) != self.issuer:
            raise ValueError("Authorization audience mismatch")
        if payload.subjectId != stored["subjectId"]:
            raise ValueError("Authorization subject mismatch")
        if payload.destinationAccount != stored["destinationAccount"]:
            raise ValueError("Destination account mismatch")
        if payload.requestedExportHash != stored["originalExportHash"]:
            raise ValueError("Original export hash mismatch")
        if payload.liveCollectionHash != verified_collection.proof.payloadHash:
            raise ValueError("Live collection hash mismatch")

        issued_at = _parse_datetime(payload.issuedAt)
        if issued_at.tzinfo is None:
            issued_at = issued_at.replace(tzinfo=timezone.utc)
        if issued_at > now + timedelta(minutes=5):
            raise ValueError("Import authorization timestamp is invalid")

        expires_at = _parse_datetime(payload.expiresAt)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= now:
            raise ValueError("Import authorization expired")

        return {
            "issuer": stored["issuer"],
            "subjectId": stored["subjectId"],
            "subjectUsername": verified_collection.payload.subject.username,
            "destinationAccount": stored["destinationAccount"],
            "requestedExportHash": stored["originalExportHash"],
            "liveCollectionHash": verified_collection.proof.payloadHash,
            "liveCollection": verified_collection.model_dump(mode="json"),
            "verifiedAt": now.isoformat(),
        }
