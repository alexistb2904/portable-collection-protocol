from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone

from fastapi import Header, HTTPException
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


async def require_site_user(x_demo_user_id: str | None = Header(default=None)) -> dict[str, str]:
    if not x_demo_user_id:
        raise HTTPException(status_code=401, detail="Demo user header required")
    return {"id": x_demo_user_id, "username": f"demo_{x_demo_user_id[:8]}"}


class DemoCollectionSource:
    def __init__(self, issuer: str) -> None:
        self.issuer = issuer.rstrip("/")

    def subject_id_for_user(self, user_id: str) -> str:
        return f"{self.issuer}:user:{user_id}"

    async def build_current_collection(self, user_id: str) -> CollectionPayload:
        instance_id = stable_uuid(f"fastapi-demo:{user_id}:Q937")
        card = PortableCard(
            id=f"urn:uuid:{instance_id}",
            instanceId=instance_id,
            serialNumber="1",
            mintedAt="2026-01-01T00:00:00.000Z",
            definition=CardDefinition(
                id=stable_uuid("fastapi-demo:definition:Q937"),
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
            extensions={"com.example.fastapi.v1": {"rarity": "legendary"}},
        )
        return CollectionPayload(
            exportId=str(uuid.uuid4()),
            issuer=IssuerIdentity(id=self.issuer, name="FastAPI Example"),
            subject=SubjectIdentity(
                id=self.subject_id_for_user(user_id),
                username=f"demo_{user_id[:8]}",
            ),
            issuedAt=datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            collection=CollectionBody(count=1, cards=[card]),
        )
