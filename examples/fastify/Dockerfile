FROM node:22-alpine AS build
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY examples/fastify ./examples/fastify
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @wikicard/portable-collection-core build
RUN pnpm --filter @wikicard/portable-collection-server build
RUN pnpm --filter @wikicard/portable-collection-fastify-example build

FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY --from=build /workspace /app
EXPOSE 3100
CMD ["pnpm", "--filter", "@wikicard/portable-collection-fastify-example", "start"]
