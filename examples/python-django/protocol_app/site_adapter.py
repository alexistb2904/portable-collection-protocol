from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone

from django.http import HttpRequest
from wikicard_portable_collection import (
    ArticleSource,
    CardDefinition,
    CollectionBody,
    CollectionPayload,
    IssuerIdentity,
    PortableCard,
    Presentation,
    SubjectIdentity,
)


def stable_uuid(seed: str) -> str:
    return str(uuid.UUID(hashlib.sha256(seed.encode()).hexdigest()[:32], version=5))


def require_site_user(request: HttpRequest) -> dict[str, str]:
    user_id = request.headers.get("X-Demo-User-Id")
    if not user_id:
        raise PermissionError("Demo user header required")
    return {"id": user_id, "username": f"demo_{user_id[:8]}"}


class DemoCollectionSource:
    def __init__(self, issuer: str) -> None:
        self.issuer = issuer.rstrip("/")

    def subject_id_for_user(self, user_id: str) -> str:
        return f"{self.issuer}:user:{user_id}"

    async def build_current_collection(self, user_id: str) -> CollectionPayload:
        instance_id = stable_uuid(f"django-demo:{user_id}:Q937")
        card = PortableCard(
            id=f"urn:uuid:{instance_id}",
            instanceId=instance_id,
            serialNumber="1",
            mintedAt="2026-01-01T00:00:00.000Z",
            definition=CardDefinition(
                id=stable_uuid("django-demo:definition:Q937"),
                canonicalId="wikidata:Q937",
                wikidataId="Q937",
                source=ArticleSource(
                    provider="wikipedia",
                    language="en",
                    pageId="736",
                    url="https://en.wikipedia.org/wiki/Albert_Einstein",
                ),
                presentation=Presentation(
                    title="Albert Einstein",
                    description="German-born theoretical physicist",
                    imageUrl=None,
                ),
            ),
            extensions={"com.example.django.v1": {"rarity": "legendary"}},
        )
        return CollectionPayload(
            exportId=str(uuid.uuid4()),
            issuer=IssuerIdentity(id=self.issuer, name="Django Example"),
            subject=SubjectIdentity(
                id=self.subject_id_for_user(user_id),
                username=f"demo_{user_id[:8]}",
            ),
            issuedAt=datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            collection=CollectionBody(count=1, cards=[card]),
        )
