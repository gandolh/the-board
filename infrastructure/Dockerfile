# brief-board's API (Fastify + SQLite): the tickets, the sign-in, and the
# CLI's token check.
#
# Build context is the REPO ROOT (one root lockfile covers shared, server, web
# and cli). Multi-stage: the TypeScript compiler and the native build toolchain
# live in build stages and never reach the runtime image. The board itself is a
# static site that vps-deploy builds and Caddy serves; it is not in this image,
# and neither is the CLI, which runs on the owner's machine.
#
#   docker compose -f infrastructure/docker-compose.yml up brief-board-api
#
# ── Why this container runs as root ─────────────────────────────────────────
#
# On the VPS this runs under a ROOTLESS Docker daemon owned by an unprivileged
# account, where the container's uid 0 maps to that account's own uid on the
# host, so "root" here is already a normal unprivileged user out there.
#
# It has to be uid 0 because /data is a BIND MOUNT of the host's
# /srv/brief-board-api/data, which holds the board's database. Under rootless
# Docker only container-root maps back to the owning account; a non-root
# in-container user maps to a subuid the host sees as a stranger, and the
# service could not write its own database.

# ---------------------------------------------------------------------------
# deps — full workspace install, with the toolchain native modules may need
# ---------------------------------------------------------------------------
FROM node:24-alpine AS deps
# better-sqlite3 13 ships Node-API prebuilds including linuxmusl-x64, so this is
# a fallback rather than the normal path.
RUN apk add --no-cache python3 make g++
WORKDIR /app
# Manifests first, for layer caching: one root lockfile, one npm ci. Every
# workspace manifest is needed because `npm ci` validates the lockfile against
# every workspace the root package.json declares and bails on a missing one.
COPY package.json package-lock.json .npmrc tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY web/package.json ./web/
COPY cli/package.json ./cli/
RUN npm ci

# ---------------------------------------------------------------------------
# builder — compile shared and the server (tsc -b → shared/dist, server/dist)
# ---------------------------------------------------------------------------
FROM deps AS builder
COPY shared ./shared
COPY server ./server
# server/tsconfig.json references shared, so this builds both, in order.
RUN npx tsc -b server

# ---------------------------------------------------------------------------
# proddeps — runtime dependencies only, native modules built here
# ---------------------------------------------------------------------------
FROM node:24-alpine AS proddeps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY web/package.json ./web/
COPY cli/package.json ./cli/
# Scoped to the server workspace: the board's React tree is never run here.
RUN npm ci --omit=dev -w @brief-board/server --include-workspace-root \
 && mkdir -p shared/node_modules server/node_modules
# Drop native build intermediates and the prebuilds for operating systems this
# image can never be. A BLACKLIST of foreign platforms on purpose:
# better-sqlite3 ships prebuilds as FILES (`prebuilds/linuxmusl-x64.node`), and
# a whitelist of names would delete all of them.
RUN cd node_modules \
 && find . -name '*.o' -delete \
 && find . -type d -name obj.target -prune -exec rm -rf {} + \
 && rm -rf better-sqlite3/deps better-sqlite3/src \
 && find . -type d -name prebuilds -exec sh -c \
      'rm -f "$1"/darwin-*.node "$1"/win32-*.node "$1"/android-*.node' _ {} \;

# ---------------------------------------------------------------------------
# prod — slim runtime: no compiler, no test code, no TypeScript
# ---------------------------------------------------------------------------
FROM node:24-alpine AS prod
LABEL org.opencontainers.image.title="brief-board" \
      org.opencontainers.image.description="brief-board API: one board for every corpus brief"
# wget, for the healthcheck below, ships in node:alpine's busybox.
WORKDIR /app
COPY --from=proddeps /app/node_modules ./node_modules
# The root zod in the lockfile is a dev tool's (4.6.5, for eslint), so shared's
# and the server's own zod (4.5.4) sit nested in each workspace. The mkdir above
# makes these copies safe when a later lockfile hoists them.
COPY --from=proddeps /app/shared/node_modules ./shared/node_modules
COPY --from=proddeps /app/server/node_modules ./server/node_modules
COPY package.json ./
# node_modules/@brief-board/shared is a symlink to ../shared, so shared must sit
# at /app/shared with its manifest and compiled output.
COPY shared/package.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY server/package.json ./server/
COPY --from=builder /app/server/dist ./server/dist
# The vendored ward-auth library: the server imports it by relative path
# (../vendor/ward/ward-auth.js from dist), so it sits beside dist.
COPY server/vendor ./server/vendor
# tsc compiles src/**/* including the tests. They import a runner that
# --omit=dev never installed, so shipping them is dead weight.
RUN find ./server/dist ./shared/dist \( -name '*.test.js' -o -name '*.test.js.map' -o -name '*.test.d.ts' \) -delete
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8806 \
    BRIEF_BOARD_DB=/data/brief-board.sqlite
# The board's database: tickets, comments, moves and the accounts. A BIND
# MOUNT on the VPS (the host's /srv/brief-board-api/data), so it survives every
# deploy.
VOLUME /data
EXPOSE 8806
# Shell form, so it follows the runtime PORT rather than a baked constant.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" || exit 1
CMD ["node", "server/dist/index.js"]
