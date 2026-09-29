from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from redis.asyncio import Redis
from wikicard_portable_collection import (
    AuthorizationServerOptions,
    CollectionAuthorizationServer,
    CollectionDestinationImporter,
    DestinationImporterOptions,
    RedisProtocolStore,
    private_key_from_base64_pkcs8,
    sign_collection,
)

from site_adapter import DemoCollectionSource, require_site_user

load_dotenv()

if os.getenv("ENVIRONMENT") == "production":
    raise RuntimeError("Replace the FastAPI demo authentication adapter before production.")

ISSUER = os.environ["PORTABLE_COLLECTION_ISSUER"].rstrip("/")
WEB_ORIGIN = os.environ.get("PORTABLE_COLLECTION_WEB_ORIGIN", ISSUER).rstrip("/")
PRIVATE_KEY = private_key_from_base64_pkcs8(os.environ["PORTABLE_COLLECTION_PRIVATE_KEY_BASE64"])
TRUSTED_CLIENTS = {v.strip().rstrip("/") for v in os.getenv("PORTABLE_COLLECTION_TRUSTED_CLIENTS", "").split(",") if v.strip()}
TRUSTED_ISSUERS = {v.strip().rstrip("/") for v in os.getenv("PORTABLE_COLLECTION_TRUSTED_ISSUERS", "").split(",") if v.strip()}

redis = Redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"), decode_responses=True)
store = RedisProtocolStore(redis, "fastapi:portable-collection:")
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

app = FastAPI(title="Portable Collection Protocol - FastAPI Example")


@app.exception_handler(ValueError)
async def value_error_handler(_request: Request, error: ValueError):
    return JSONResponse({"message": str(error)}, status_code=400)


@app.get("/healthz")
async def healthz():
    return {"ok": True}


@app.get("/.well-known/wikicard-issuer.json")
async def issuer_document():
    return JSONResponse(
        authorization_server.issuer_document(),
        headers={"Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*"},
    )


@app.get("/collection/export")
async def export_collection(user=Depends(require_site_user)):
    signed = sign_collection(await source.build_current_collection(user["id"]), PRIVATE_KEY)
    return JSONResponse(
        signed.model_dump(mode="json"),
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="portable-collection-{user["id"]}.json"',
        },
    )


@app.post("/collection-transfer/authorize/preview")
async def preview_authorization(request: Request, user=Depends(require_site_user)):
    return JSONResponse(
        authorization_server.inspect(user["id"], await request.json()),
        headers={"Cache-Control": "no-store"},
    )


@app.post("/collection-transfer/authorize")
async def authorize(request: Request, user=Depends(require_site_user)):
    return JSONResponse(
        await authorization_server.authorize(user["id"], await request.json()),
        headers={"Cache-Control": "no-store"},
    )


@app.post("/collection-transfer/token")
async def token(request: Request):
    return JSONResponse(
        await authorization_server.exchange_code(await request.json()),
        headers={"Cache-Control": "no-store", "Pragma": "no-cache"},
    )


@app.get("/collection-transfer/current")
async def current_collection(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")
    live = await authorization_server.consume_live_collection(authorization[7:])
    return JSONResponse(
        live.model_dump(mode="json"),
        headers={"Cache-Control": "no-store", "Pragma": "no-cache"},
    )


@app.post("/collection/import/start")
async def start_import(request: Request, user=Depends(require_site_user)):
    destination_account = f'{ISSUER}:user:{user["id"]}'
    return await importer.start(user["id"], destination_account, await request.json())


@app.get("/collection-transfer/callback")
async def callback(code: str, state: str):
    verified = await importer.complete(code, state)
    linked[verified["destinationAccount"]] = verified
    return RedirectResponse("/integration-complete")


@app.get("/linked-collection")
async def linked_collection(user=Depends(require_site_user)):
    return linked.get(f'{ISSUER}:user:{user["id"]}')


@app.get("/integration-complete")
async def integration_complete():
    return {"ok": True, "message": "Collection verified and linked."}
