# Infrastructure

The infrastructure directory intentionally separates the documentation portal from the protocol integration example.

## Publish the developer portal

From `portable-collection-protocol`:

```bash
docker compose -f infra/docker-compose.yml up --build docs
```

Open:

```text
http://localhost:8080
```

This image is suitable for a simple documentation deployment behind your reverse proxy.

## Run the reference API

The reference API uses a demo authentication adapter and must not be treated as production authentication.

Provide a development signing key, then run:

```bash
docker compose -f infra/docker-compose.yml --profile reference up --build
```

The reference API is exposed at `http://localhost:3100`.

## Production integration

For production, integrate the server package into the host application's backend or replace the Fastify example adapter with real authentication, authoritative ownership queries and persistent external-link storage.

The reference API intentionally refuses `NODE_ENV=production` until its demo authentication adapter has been replaced.
