from __future__ import annotations

import os

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request
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

from site_adapter import DemoCollectionSource, require_site_user

load_dotenv()

if os.getenv("ENVIRONMENT") == "production":
    raise RuntimeError("Replace the Flask demo authentication adapter before production.")

ISSUER = os.environ["PORTABLE_COLLECTION_ISSUER"].rstrip("/")
WEB_ORIGIN = os.environ.get("PORTABLE_COLLECTION_WEB_ORIGIN", ISSUER).rstrip("/")
PRIVATE_KEY = private_key_from_base64_pkcs8(os.environ["PORTABLE_COLLECTION_PRIVATE_KEY_BASE64"])
TRUSTED_CLIENTS = {v.strip().rstrip("/") for v in os.getenv("PORTABLE_COLLECTION_TRUSTED_CLIENTS", "").split(",") if v.strip()}
TRUSTED_ISSUERS = {v.strip().rstrip("/") for v in os.getenv("PORTABLE_COLLECTION_TRUSTED_ISSUERS", "").split(",") if v.strip()}

redis = Redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"), decode_responses=True)
store = ThreadedRedisProtocolStore(redis, "flask:portable-collection:")
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

app = Flask(__name__)


@app.errorhandler(ValueError)
def value_error(error: ValueError):
    return jsonify({"message": str(error)}), 400


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/.well-known/wikicard-issuer.json")
def issuer_document():
    response = jsonify(authorization_server.issuer_document())
    response.headers["Cache-Control"] = "public, max-age=300"
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


@app.get("/collection/export")
async def export_collection():
    user = require_site_user()
    signed = sign_collection(await source.build_current_collection(user["id"]), PRIVATE_KEY)
    response = jsonify(signed.model_dump(mode="json"))
    response.headers["Cache-Control"] = "no-store"
    response.headers["Content-Disposition"] = f'attachment; filename="portable-collection-{user["id"]}.json"'
    return response


@app.post("/collection-transfer/authorize/preview")
def preview_authorization():
    user = require_site_user()
    response = jsonify(authorization_server.inspect(user["id"], request.get_json(force=True)))
    response.headers["Cache-Control"] = "no-store"
    return response


@app.post("/collection-transfer/authorize")
async def authorize():
    user = require_site_user()
    response = jsonify(await authorization_server.authorize(user["id"], request.get_json(force=True)))
    response.headers["Cache-Control"] = "no-store"
    return response


@app.post("/collection-transfer/token")
async def token():
    response = jsonify(await authorization_server.exchange_code(request.get_json(force=True)))
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return response


@app.get("/collection-transfer/current")
async def current_collection():
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return jsonify({"message": "Bearer token required"}), 401
    live = await authorization_server.consume_live_collection(authorization[7:])
    response = jsonify(live.model_dump(mode="json"))
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return response


@app.post("/collection/import/start")
async def start_import():
    user = require_site_user()
    destination_account = f'{ISSUER}:user:{user["id"]}'
    return jsonify(await importer.start(user["id"], destination_account, request.get_json(force=True)))


@app.get("/collection-transfer/callback")
async def callback():
    code = request.args.get("code", "")
    state = request.args.get("state", "")
    verified = await importer.complete(code, state)
    linked[verified["destinationAccount"]] = verified
    return redirect("/integration-complete")


@app.get("/linked-collection")
def linked_collection():
    user = require_site_user()
    return jsonify(linked.get(f'{ISSUER}:user:{user["id"]}'))


@app.get("/integration-complete")
def integration_complete():
    return {"ok": True, "message": "Collection verified and linked."}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "3500")), debug=True)
