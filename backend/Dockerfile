# ─────────────────────────────────────────────────────────────────────────────
# Lingo2 Backend — Production Dockerfile
# Build context: monorepo root  (docker build -f backend/Dockerfile .)
# Multi-stage build: builder (compile) → runner (minimal Alpine image)
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable pnpm

WORKDIR /app

# Install all workspace deps using the root lockfile (cache layer).
# Copying only manifests first maximises layer cache hits.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json  ./backend/
COPY frontend/package.json ./frontend/
COPY shared/package.json   ./shared/
# prisma generate runs as postinstall — schema must exist before `pnpm install`
COPY backend/prisma/schema.prisma ./backend/prisma/schema.prisma
# postinstall runs `prisma generate`, producing the Alpine-native binary.
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY backend/ ./backend/
COPY shared/  ./shared/

WORKDIR /app/backend
RUN pnpm build

# Produce a minimal standalone deployment dir (prod deps only, no devDeps).
# --ignore-scripts skips postinstall in the new dir; we copy the already-
# generated Prisma binary from the builder's node_modules manually below.
WORKDIR /app
RUN pnpm --filter @memozi/backend deploy --prod --ignore-scripts --legacy /standalone

# Copy the Alpine-native Prisma engine generated during `pnpm install` above.
# In pnpm workspaces, .prisma can live under virtual-store paths, so resolve it dynamically.
RUN PRISMA_DIR="$(find /app -type d -path '*/node_modules/.prisma' | head -n 1)" \
  && test -n "$PRISMA_DIR" \
  && mkdir -p /standalone/node_modules \
  && cp -r "$PRISMA_DIR" /standalone/node_modules/.prisma

# Copy prisma schema + migrations so `prisma migrate deploy` works at runtime.
RUN cp -r /app/backend/prisma /standalone/prisma

# ── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 fastify

WORKDIR /app

# Copy the fully self-contained standalone bundle.
COPY --from=builder /standalone ./

USER fastify

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
