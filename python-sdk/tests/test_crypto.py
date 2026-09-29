from datetime import datetime, timedelta, timezone
import uuid

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from wikicard_portable_collection import (
    CollectionBody,
    CollectionPayload,
    ImportAuthorizationPayload,
    IssuerIdentity,
    SubjectIdentity,
    public_jwk,
    sign_collection,
    sign_import_authorization,
    verify_collection,
    verify_import_authorization,
)


def empty_payload() -> CollectionPayload:
    return CollectionPayload(
        exportId=str(uuid.uuid4()),
        issuer=IssuerIdentity(id="https://source.example/api", name="Source"),
        subject=SubjectIdentity(id="https://source.example/api:user:123", username="alice"),
        issuedAt=datetime.now(timezone.utc),
        collection=CollectionBody(count=0, cards=[]),
    )


def test_collection_signature_detects_tampering():
    private_key = Ed25519PrivateKey.generate()
    jwk = public_jwk(private_key)
    signed = sign_collection(empty_payload(), private_key)

    assert verify_collection(signed.model_dump(mode="json"), jwk) is not None

    tampered = signed.model_dump(mode="json")
    tampered["payload"]["subject"]["username"] = "mallory"
    assert verify_collection(tampered, jwk) is None


def test_import_authorization_binds_destination_account():
    private_key = Ed25519PrivateKey.generate()
    jwk = public_jwk(private_key)
    now = datetime.now(timezone.utc)

    signed = sign_import_authorization(
        ImportAuthorizationPayload(
            authorizationId=str(uuid.uuid4()),
            issuer="https://source.example/api",
            subjectId="https://source.example/api:user:123",
            audience="https://destination.example/api",
            destinationAccount="https://destination.example/api:user:abc",
            requestedExportHash="A" * 43,
            liveCollectionHash="B" * 43,
            issuedAt=now,
            expiresAt=now + timedelta(minutes=5),
        ),
        private_key,
    )

    assert verify_import_authorization(signed.model_dump(mode="json"), jwk) is not None

    tampered = signed.model_dump(mode="json")
    tampered["payload"]["destinationAccount"] = "https://destination.example/api:user:other"
    assert verify_import_authorization(tampered, jwk) is None
