# AstraNotes — OpenCode Instructions

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` if overriding defaults.

## Commands

```bash
npm run dev          # API (tsx watch :3001) + Vite dev server concurrently
npm run dev:api      # API only
npm run dev:web      # Vite only
npm run build        # typecheck (app + server) + vite build
npm run typecheck    # tsc --noEmit for both tsconfigs
npm run test         # vitest run
npm run test:watch   # vitest
npm run lint         # eslint . (excludes server/)
npm run docker:up    # docker compose up --build (dev)
npm run docker:prod  # docker compose --profile prod up --build
npm run docker:ghcr  # docker compose with pre-built GHCR image
```

## Architecture

- **SPA**: React 19 + Vite 6. Entry: `src/main.tsx` → `App.tsx`
- **API**: Express + better-sqlite3. Entry: `server/index.ts`, routes in `server/app.ts`
- **Vite proxy**: `/api` → `http://127.0.0.1:3001`
- **Auth**: HTTP-only session cookie (`astranotes.sid`). API calls use `credentials: 'include'`.
- **Encryption**: Web Crypto (PBKDF2 + AES-GCM) in `src/crypto/vault.ts`. Server stores opaque ciphertext only.
- **DB**: SQLite at `data/astranotes.db` (configurable via `ASTRANOTES_DB_PATH`). WAL auto-selected on local disks; falls back to DELETE on network filesystems.
- **TypeScript**: three configs — `tsconfig.app.json` (client), `tsconfig.server.json` (server), `tsconfig.node.json` (Vite). Run `npm run typecheck` to check both.

## Testing

- Client tests run in **jsdom**, server tests (`server/**/*.test.ts`) run in **node** (configured in `vite.config.ts`).
- Client test setup (`src/test/setup.ts`) loads `fake-indexeddb/auto` + `@testing-library/jest-dom/vitest`.
- API tests use `supertest` with `request.agent(app)` and a temp DB in `os.tmpdir()`.
- API tests assert **ciphertext** in DB responses, not plaintext titles.
- To run a single test file: `npx vitest run src/path/to/file.test.ts`

## Gotchas

- **ESLint excludes `server/`**. Lint only the client side with `npm run lint`; server linting is not configured.
- **`better-sqlite3` is native**. On Windows: `npm rebuild better-sqlite3` or delete `node_modules` + `npm install` if you get `ERR_DLOPEN_FAILED`. Never copy `node_modules` between OSes.
- **Port 3001** must be free for local dev (API). If Vite shows `ECONNREFUSED`, the API crashed — check the `[0]` terminal output.
- **Production Docker** serves SPA + API on port **4173** (not 3001). Set `SESSION_SECRET` in production.
- **Non-localhost HTTP** (LAN/NAS) breaks `crypto.subtle` — use HTTPS via reverse proxy.
- **`npm run build`** does typecheck (`--noEmit`) before vite build; type errors block the build.
- **`npm run preview`** still proxies `/api` to `:3001` — run the API separately.
