# AGENTS.md

## Workspace

- **Manager:** npm (lockfile: `package-lock.json`)
- **Version pin:** **missing** in `package.json` (`packageManager` field not set)
- **Layout:** single-package repo (not monorepo)
- **Node-linker config:** none (`.npmrc`/pnpm/yarn linker config not present)
- **Apps:**
  - SPA client: React + Vite (`src/`)
  - API server: Express + SQLite (`server/`)
- **Packages:** none (`apps/`, `packages/`, `services/`, `tools/` not used)

## Architecture overview

AstraNotes is encrypted note app with React SPA frontend and Express backend. Client derives crypto keys with Web Crypto (PBKDF2 + AES-GCM), encrypts note payload before network write. Server stores opaque ciphertext in SQLite and enforces session-based per-user isolation. Vite dev server proxies `/api` to Express on port 3001 in dev. In production Docker profile, Express serves both `dist/` and `/api` on port 4173.

## Build Commands

```bash
npm install
npm run dev
npm run dev:api
npm run dev:web
npm run build
npm run test
npm run typecheck
npm run lint
# db:migrate: not implemented (schema auto-created in server/db.ts at startup)
```

## CI Order

### Actual GitHub workflows in repo

1. **`.github/workflows/opencode.yml`**
   - Trigger: issue/PR review comment containing `/oc` or `/opencode`
   - Steps: checkout -> run opencode action

2. **`.github/workflows/docker-publish.yml`**
   - Trigger: push to `main`, tags `v*`, manual dispatch
   - Steps (order):
     1. Checkout
     2. Lowercase GHCR image name
     3. GHCR login
     4. Setup QEMU
     5. Setup Buildx
     6. Docker metadata (tags/labels)
     7. Build and push multi-arch production image

### Gap

- No CI workflow currently runs `npm run typecheck`, `npm run test`, `npm run lint`, or `npm run build`.

## Key Paths

| Path | Purpose |
|------|---------|
| `package.json` | scripts, dependencies |
| `package-lock.json` | npm lockfile |
| `src/main.tsx` | SPA entrypoint |
| `src/App.tsx` | root app composition |
| `server/index.ts` | API entrypoint, env parsing, db init, listen |
| `server/app.ts` | Express app + route mounting |
| `server/db.ts` | SQLite open + schema bootstrap (no migration tool) |
| `server/sessionConfig.ts` | cookie/session configuration |
| `vite.config.ts` | Vite config + dev/preview `/api` proxy + Vitest setup |
| `tsconfig.app.json` | client TS config |
| `tsconfig.server.json` | server TS config |
| `tsconfig.node.json` | Vite/node TS config |
| `eslint.config.js` | lint config (server excluded by project convention) |
| `docker-compose.yml` | dev + optional prod profile services |
| `docker-compose.ghcr.yml` | deploy pre-built GHCR image |
| `Dockerfile` | multi-stage dev/builder/production image |
| `.env.example` | env var template |
| `data/astranotes.db` | default SQLite DB path |
| `docs/plugins.md` | plugin extension boundary |
| `AstraNotes Planning/LOG.md` | planning/work log (README currently references stale `planning/LOG.md`) |
| `AstraNotes Planning/refined_requirements.md` | refined requirements (README currently references stale `planning/refined_requirements.md`) |
| `logs/README.md` | session log index (newest-first table) |
| `logs/sessions/` | session entry files |
| `logs/sessions/_TEMPLATE.md` | canonical session entry format |

## Agent progress log (sessions)

- **Index:** `logs/README.md`
- **Entries dir:** `logs/sessions/`
- **Template:** `logs/sessions/_TEMPLATE.md`
- **Filename convention:** `YYYY-MM-DD-HHMM-<short-topic>.md` (24h local time)
- **Index order:** newest-first

### Entry format (required)

```md
# Session <YYYY-MM-DD-HHMM-topic>

SESSION_ID: <YYYY-MM-DD-HHMM-topic>
DATE: <YYYY-MM-DD HH:MM local>
STATUS: <open|done|blocked>
PREVIOUS: <path-or-none>
NEXT: <path-or-none>

## SUMMARY
## CHANGES
## COMMANDS_RUN
## FAILURES
## NEXT_FOR_AGENTS
## NOTES
```

When finishing meaningful session:
1. Copy `logs/sessions/_TEMPLATE.md` to new timestamped file.
2. Fill required fields/sections with concrete paths, commands, errors.
3. Update `PREVIOUS`/`NEXT` in new and neighbor files.
4. Add row in `logs/README.md` index table.

## Dev tooling

- **Runtime/dev server:** `tsx watch` for API + Vite for SPA, coordinated by `concurrently`.
- **Testing:** Vitest with mixed environments (`jsdom` for client, `node` for `server/**/*.test.ts`), Testing Library, Supertest.
- **Docker:**
  - `docker-compose.yml` for dev and optional prod profile
  - `docker-compose.ghcr.yml` for pre-built image deployments
  - multi-stage `Dockerfile` (`development`, `builder`, `production`)
- **Devcontainer:** `.devcontainer/devcontainer.json`
- **Codegen/helper scripts:** `scripts/generate-lucid-uml-package.mjs` and related Lucid import JSON args/files.

## External dependencies

- **SQLite filesystem access** (`better-sqlite3`) for local DB file.
- **GitHub Container Registry (GHCR)** for image publish/deploy flow.
- **Docker Engine/Compose** for containerized dev/prod paths.
- **Optional reverse proxy/TLS stack** (Caddy/Nginx/Tailscale/etc.) for secure non-localhost deployment; required for Web Crypto on LAN hostnames/IPs.

## Project-specific constraints

- `better-sqlite3` native addon is platform-specific. Never copy `node_modules` across OSes.
- Port `3001` must be free in local dev (`vite` proxy target).
- Production container expects internal `PORT=4173` if host maps `4173:4173`.
- Non-HTTPS non-localhost origins break `crypto.subtle` (`AN_CRYPTO_001`).
- `npm run build` includes both TS typechecks before Vite build.
- `npm run preview` still proxies `/api` to `127.0.0.1:3001`; run API separately.
- README has stale planning paths (`planning/...`), actual directory is `AstraNotes Planning/...`.
- `packageManager` field missing in `package.json` (toolchain pin not enforced).

## Critical gotchas

- Current environment test failures observed:
  - `better_sqlite3.node` load error (`slice is not valid mach-o file`)
  - `localStorage` undefined in preference tests (`Cannot read properties of undefined (reading 'clear')`)
- No dedicated migration command/tool; schema evolves in app startup code.
- CI currently validates Docker image publishing, not app quality gates (lint/test/typecheck/build).

## Environment Variables

| Variable | Required | Default | Used By |
|----------|----------|---------|---------|
| `SESSION_SECRET` | Yes in production | `dev-only-set-SESSION_SECRET-in-production` (code fallback; startup refused in prod if unchanged) | `server/index.ts`, `server/sessionConfig.ts`, docker compose prod configs |
| `PORT` | No (dev), effectively yes in some deploys | `3001` | `server/index.ts`; must be `4173` in default production container mapping |
| `NODE_ENV` | No | unset/`development` behavior | `server/index.ts`, `server/sessionConfig.ts`, docker compose prod |
| `ASTRANOTES_DB_PATH` | No | `<repo>/data/astranotes.db` | `server/index.ts` |
| `ASTRANOTES_SQLITE_JOURNAL_MODE` | No | auto suggestion (`WAL` local, `DELETE` network path) | `server/index.ts` |
| `ASTRANOTES_IMAGE` | Yes for GHCR compose file | none | `docker-compose.ghcr.yml` |
| `ASTRANOTES_HOST_DATA` | Yes for GHCR compose file | none | `docker-compose.ghcr.yml` volume mount |
| `CHOKIDAR_USEPOLLING` | No | `true` in compose service | `docker-compose.yml` dev watcher behavior |
| `WATCHPACK_POLLING` | No | `true` in compose service | `docker-compose.yml` dev watcher behavior |
