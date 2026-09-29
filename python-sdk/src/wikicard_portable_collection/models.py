from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, HttpUrl, TypeAdapter

from .constants import (
    AUTHORIZATION_FORMAT,
    AUTHORIZATION_PROTOCOL,
    AUTHORIZATION_VERSION,
    CANONICALIZATION,
    COLLECTION_FORMAT,
    COLLECTION_VERSION,
)


_url_adapter = TypeAdapter(HttpUrl)
_datetime_adapter = TypeAdapter(datetime)


def _validate_url(value: str) -> str:
    _url_adapter.validate_python(value)
    return value


def _validate_datetime(value: str) -> str:
    _datetime_adapter.validate_python(value)
    return value


UrlString = Annotated[str, AfterValidator(_validate_url)]
DateTimeString = Annotated[str, AfterValidator(_validate_datetime)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ArticleSource(StrictModel):
    provider: Literal["wikipedia"]
    language: str = Field(min_length=2, max_length=16)
    pageId: str = Field(pattern=r"^[0-9]+$")
    url: UrlString


class Presentation(StrictModel):
    title: str = Field(max_length=1000)
    description: str | None = Field(default=None, max_length=5000)
    imageUrl: str | None = Field(default=None, max_length=4096)


class CardDefinition(StrictModel):
    id: str
    canonicalId: str
    wikidataId: str | None = Field(default=None, pattern=r"^Q[1-9][0-9]*$")
    source: ArticleSource
    presentation: Presentation


class PortableCard(StrictModel):
    id: str
    instanceId: str
    serialNumber: str = Field(pattern=r"^[0-9]+$")
    mintedAt: DateTimeString
    definition: CardDefinition
    extensions: dict[str, Any]


class IssuerIdentity(StrictModel):
    id: UrlString
    name: str


class SubjectIdentity(StrictModel):
    id: str
    username: str


class CollectionBody(StrictModel):
    count: int = Field(ge=0, le=20000)
    cards: list[PortableCard] = Field(max_length=20000)


class CollectionPayload(StrictModel):
    format: Literal["org.wikicard.collection"] = COLLECTION_FORMAT
    version: Literal["1.0.0"] = COLLECTION_VERSION
    exportId: str
    issuer: IssuerIdentity
    subject: SubjectIdentity
    issuedAt: DateTimeString
    collection: CollectionBody


class SignatureProof(StrictModel):
    type: Literal["Ed25519Signature"] = "Ed25519Signature"
    algorithm: Literal["Ed25519"] = "Ed25519"
    canonicalization: Literal["WIKICARD-C14N-JSON-1"] = CANONICALIZATION
    keyId: str
    payloadHash: str
    signature: str


class SignedCollection(StrictModel):
    payload: CollectionPayload
    proof: SignatureProof


class AuthorizationCapabilities(StrictModel):
    protocol: Literal["WIKICARD-AUTH-CODE-1"] = AUTHORIZATION_PROTOCOL
    authorizationEndpoint: UrlString
    tokenEndpoint: UrlString
    collectionEndpoint: UrlString
    codeChallengeMethods: list[Literal["S256"]]


class IssuerKey(StrictModel):
    id: str
    use: Literal["sig"]
    alg: Literal["EdDSA"]
    kty: Literal["OKP"]
    crv: Literal["Ed25519"]
    x: str


class IssuerDocument(BaseModel):
    model_config = ConfigDict(extra="allow")

    issuer: UrlString
    protocol: Literal["org.wikicard.collection"] = COLLECTION_FORMAT
    version: Literal["1.0.0"] = COLLECTION_VERSION
    keys: list[IssuerKey]
    authorization: AuthorizationCapabilities | None = None
    contact: dict[str, str] | None = None


class ImportAuthorizationPayload(StrictModel):
    format: Literal["org.wikicard.collection-import-authorization"] = AUTHORIZATION_FORMAT
    version: Literal["1.0.0"] = AUTHORIZATION_VERSION
    authorizationId: str
    issuer: UrlString
    subjectId: str
    audience: UrlString
    destinationAccount: str
    requestedExportHash: str
    liveCollectionHash: str
    issuedAt: DateTimeString
    expiresAt: DateTimeString


class SignedImportAuthorization(StrictModel):
    payload: ImportAuthorizationPayload
    proof: SignatureProof


class LiveCollectionResponse(StrictModel):
    authorization: SignedImportAuthorization
    collection: SignedCollection
