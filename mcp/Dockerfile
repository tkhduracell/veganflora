# syntax=docker/dockerfile:1

# Built from the REPO ROOT, not from mcp/ — pnpm needs the root lockfile and
# workspace manifest to resolve the `catalog:` protocol.
#   docker build -f mcp/Dockerfile .

FROM node:22-slim AS build
WORKDIR /repo
RUN corepack enable

# Manifests first so the dependency layer caches independently of source edits.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY mcp/package.json mcp/
# --ignore-scripts: none of the transitive postinstall scripts (biome, esbuild,
# protobufjs, re2) are needed to run the server, and pnpm blocks them by default.
RUN pnpm install --filter mcp... --frozen-lockfile --ignore-scripts

COPY mcp/tsconfig.json mcp/tsconfig.build.json mcp/
COPY mcp/src mcp/src
RUN pnpm --filter mcp build

# `deploy` flattens the workspace into a self-contained tree with only
# production deps, so the runtime image carries no pnpm symlink graph.
RUN pnpm --filter mcp deploy --prod --ignore-scripts /out

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Run as an unprivileged user; the node image ships one.
USER node
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
COPY --from=build --chown=node:node /out/package.json ./package.json

# Cloud Run injects PORT; server.ts already honours it and defaults to 8080.
EXPOSE 8080
CMD ["node", "dist/server.js"]
