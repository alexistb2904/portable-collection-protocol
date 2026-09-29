# Publishing as a Standalone Project

The `portable-collection-protocol` directory is intentionally self-contained and outside the WikiCard pnpm workspace.

## Extract it into its own repository

From a checkout of WikiCard:

    cp -R portable-collection-protocol ../portable-collection-protocol
    cd ../portable-collection-protocol
    git init
    pnpm install
    pnpm build
    pnpm test
    pnpm docs:build

`pnpm install` will create the standalone lockfile that should then be committed in the dedicated repository.

## Before making the repository public

Decide and document:

- repository name and organization;
- software/documentation license;
- final npm package scope if packages will be published;
- canonical documentation domain;
- protocol security contact;
- release and key-rotation policy.

The reference code currently uses the `@wikicard/*` package scope and WikiCard protocol identifiers. Keep them if WikiCard remains the protocol authority, or perform a deliberate versioned rename before the first public release.

## Deploy the documentation portal

Build the provided docs image:

    docker build -f infra/Dockerfile.docs -t portable-collection-docs .
    docker run --rm -p 8080:80 portable-collection-docs

Or use:

    docker compose -f infra/docker-compose.yml up --build docs

Place it behind your normal HTTPS reverse proxy and documentation domain.

## GitHub Pages / static hosting

VitePress outputs static files to:

    docs/.vitepress/dist

That directory can be deployed to any static hosting provider.

## Python package

The Python SDK is under `python-sdk/`.

Before publishing it to a package index, choose the final distribution name and run:

```bash
pip install -e "./python-sdk[dev]"
pytest python-sdk/tests
```

## Publish SDK packages

If you later publish the TypeScript SDK:

1. choose the final package scope;
2. add the chosen project license;
3. run the standalone CI;
4. build packages;
5. inspect package contents with `pnpm pack`;
6. publish `core` before `server` because `server` depends on it.

Do not publish production private keys, environment files or partner allowlists.

## Keep protocol and implementation releases separate

A website redesign or SDK bug fix does not require a new wire-protocol version.

Use `docs/versioning.md` to decide when a format/protocol version change is actually required.
