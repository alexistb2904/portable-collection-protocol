from __future__ import annotations

import json
import os

from django.http import HttpRequest, JsonResponse
from django.shortcuts import redirect
from redis import Redis
from wikicard_portable_collection import (
    AuthorizationServerOptions,
    CollectionAuthorizationServer,
    CollectionDestinationImporter,
    DestinationImporterOptions,
    ThreadedRedisProtocolStore,
    private_key_from_base64_pkcs8,
    sign_collection,
)

from .site_adapter import DemoCollectionSource, require_site_user

ISSUER = os.environ["PORTABLE_COLLECTION_ISSUER"].rstrip("/")
WEB_ORIGIN = os.environ.get("PORTABLE_COLLECTION_WEB_ORIGIN", ISSUER).rstrip("/")
PRIVATE_KEY = private_key_from_base64_pkcs8(os.environ["PORTABLE_COLLECTION_PRIVATE_KEY_BASE64"])
TRUSTED_CLIENTS = {v.strip().rstrip("/") for v in os.getenv("PORTABLE_COLLECTION_TRUSTED_CLIENTS", "").split(",") if v.strip()}
TRUSTED_ISSUERS = {v.strip().rstrip("/") for v in os.getenv("PORTABLE_COLLECTION_TRUSTED_ISSUERS", "").split(",") if v.strip()}

redis = Redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"), decode_responses=True)
store = ThreadedRedisProtocolStore(redis, "django:portable-collection:")
source = DemoCollectionSource(ISSUER)
authorization_server = CollectionAuthorizationServer(
    AuthorizationServerOptions(
        issuer=ISSUER,
        web_origin=WEB_ORIGIN,
        private_key=PRIVATE_KEY,
        store=store,
        source=source,
        trusted_clients=TRUSTED_CLIENTS,
    )
)
importer = CollectionDestinationImporter(
    DestinationImporterOptions(
        issuer=ISSUER,
        store=store,
        trusted_issuers=TRUSTED_ISSUERS,
    )
)
linked: dict[str, dict] = {}


def _body(request: HttpRequest):
    return json.loads(request.body.decode("utf-8"))


def _no_store(data, status=200):
    response = JsonResponse(data, status=status)
    response["Cache-Control"] = "no-store"
    return response


async def healthz(_request: HttpRequest):
    return JsonResponse({"ok": True})


async def issuer_document(_request: HttpRequest):
    response = JsonResponse(authorization_server.issuer_document())
    response["Cache-Control"] = "public, max-age=300"
    response["Access-Control-Allow-Origin"] = "*"
    return response


async def export_collection(request: HttpRequest):
    user = require_site_user(request)
    signed = sign_collection(await source.build_current_collection(user["id"]), PRIVATE_KEY)
    response = _no_store(signed.model_dump(mode="json"))
    response["Content-Disposition"] = f'attachment; filename="portable-collection-{user["id"]}.json"'
    return response


async def preview_authorization(request: HttpRequest):
    user = require_site_user(request)
    return _no_store(authorization_server.inspect(user["id"], _body(request)))


async def authorize(request: HttpRequest):
    user = require_site_user(request)
    return _no_store(await authorization_server.authorize(user["id"], _body(request)))


async def token(request: HttpRequest):
    response = _no_store(await authorization_server.exchange_code(_body(request)))
    response["Pragma"] = "no-cache"
    return response


async def current_collection(request: HttpRequest):
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return JsonResponse({"message": "Bearer token required"}, status=401)
    live = await authorization_server.consume_live_collection(authorization[7:])
    response = _no_store(live.model_dump(mode="json"))
    response["Pragma"] = "no-cache"
    return response


async def start_import(request: HttpRequest):
    user = require_site_user(request)
    destination_account = f'{ISSUER}:user:{user["id"]}'
    return JsonResponse(await importer.start(user["id"], destination_account, _body(request)))


async def callback(request: HttpRequest):
    code = request.GET.get("code", "")
    state = request.GET.get("state", "")
    verified = await importer.complete(code, state)
    linked[verified["destinationAccount"]] = verified
    return redirect("/integration-complete")


async def linked_collection(request: HttpRequest):
    user = require_site_user(request)
    return JsonResponse(linked.get(f'{ISSUER}:user:{user["id"]}') or {})


async def integration_complete(_request: HttpRequest):
    return JsonResponse({"ok": True, "message": "Collection verified and linked."})
