# ─────────────────────────────────────────────────────────────────────────────
# MemoZi Frontend — Production Dockerfile
# Build context: monorepo root  (docker build -f frontend/Dockerfile .)
# Multi-stage build: builder (Vite) → runner (nginx static)
#
# Requires monorepo root as context because frontend depends on @memozi/shared.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable pnpm

WORKDIR /app

# Install workspace deps using the root lockfile (cache layer).
# Copying only manifests first maximises layer cache hits.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json  ./backend/
COPY frontend/package.json ./frontend/
COPY shared/package.json   ./shared/
# prisma generate runs as backend postinstall — schema must exist before install.
COPY backend/prisma/schema.prisma ./backend/prisma/schema.prisma
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY frontend/ ./frontend/
COPY shared/   ./shared/

WORKDIR /app/frontend
RUN pnpm build

# ── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM nginx:stable-alpine AS runner

# Copy the Vite build output
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# SPA routing: unknown paths fall back to index.html so the React router works
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  gzip on;\n\
  gzip_types text/plain text/css application/javascript application/json image/svg+xml;\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
