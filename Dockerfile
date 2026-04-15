# syntax=docker/dockerfile:1
# Development: Linux Node + npm install; use with docker-compose bind mount + node_modules volume.

FROM node:22-bookworm AS development

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173 3001

CMD ["npm", "run", "dev"]

# --- Production-style preview: built SPA + API (same pattern as npm run build && npm run preview + API)

FROM node:22-bookworm AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm AS production

WORKDIR /app

ENV NODE_ENV=production
# Single process: Express serves built SPA from dist/ and /api (no Vite preview — avoids Host-header blocks behind Tailscale).
ENV PORT=4173

# Full tree from builder so vite, tsx, concurrently, and native modules match the build.
COPY --from=builder /app /app

EXPOSE 4173

CMD ["npx", "tsx", "server/index.ts"]
