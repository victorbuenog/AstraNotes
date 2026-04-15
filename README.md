# AstraNotes

AstraNotes is a **multi-user** note-taking web app: **register or log in** with a **username and password**. On **register** or **log in**, the **client** derives the encryption key and unlocks the vault in the **same** flow (no second password step). If you **reload** the page while still signed in, a short **unlock** screen asks for your password once—the session cookie does not carry the crypto key. **Note bodies** are **AES-GCM** ciphertext in **SQLite** (`data/` by default); the server stores **opaque blobs** and does not have the key. The API still enforces **auth**: each session only accesses that user’s rows (no cross-user reads or writes).

The UI stays minimal: a left **sidebar** (notes by last modified), a **markdown** editor with **preview**, **light/dark** theme, **Log out**, and clear **error messages with stable codes** for debugging.

> **Work log:** day-to-day notes live in [`planning/LOG.md`](./planning/LOG.md). **Refined requirements** (FR/NFR, traceability) are in [`planning/refined_requirements.md`](./planning/refined_requirements.md).

## Functionality

| Area | Behavior |
|------|----------|
| **Accounts** | **Register** (username + password + confirm) or **Log in**. Usernames: 3–32 chars, `[a-zA-Z0-9_-]`. Passwords: min 8 chars. |
| **Encryption** | **Web Crypto** (`src/crypto/vault.ts`): **PBKDF2** + **AES-GCM**. Per-user **salt + verifier** metadata is stored in `users.encryption_meta` (server cannot decrypt). **Log in** unlocks the vault in one step using the same password. If you **reload** the page while still signed in, the app asks for your password once more (the key is not stored in the session). |
| **Session** | After login, the API sets an **HTTP-only session cookie** (`astranotes.sid`). The SPA calls `/api/*` with `credentials: 'include'`. |
| **Notes** | Create and edit notes; **Archive** hides a note from the main list (it stays in the DB and can be shown via **Show archived**; **Unarchive** restores). **Delete** removes the note **permanently** from the database (cannot be undone; UI confirms). Each note is encrypted as JSON **before** `PUT`; the server stores `{ v:2, ivB64, ciphertextB64 }` plus `updated_at`. Sidebar lists active notes sorted by **updated** time (newest first). |
| **Search (FR2a)** | Client-side filter over **title** and primary **markdown** body. **Empty search** shows the full list for the current archive filter. Queries are capped (500 chars); the server never sees the search string. |
| **Tags (FR2b)** | Comma-separated **tags** on each note; stored in the encrypted note JSON, normalized (**lowercase**, deduped, length/count limits in `src/types/tags.ts`). **Tag filter** in the sidebar narrows the list. |
| **Export / import (FR7)** | **Export vault** downloads `formatVersion: 1` JSON (plaintext notes — confirm dialog). **Import** merges by **note id** (upsert); other notes are unchanged. See `src/vault/exportFormat.ts`. |
| **Autosave** | Edits are **debounced** (~450 ms) and persisted via the API; the header shows **Saving…** / **Saved**. If the **session expires**, save fails with a clear error (copy edits, sign in again). |
| **Markdown** | Each note uses a **versioned document** with a **block** array; the MVP edits the primary **markdown** block. **Write / Split / Read** modes: preview uses the same in-memory note as you type (keystrokes update state before the debounced save). GFM via `react-markdown` / `remark-gfm`. Remote images in preview follow normal `<img>` rules (use HTTPS sources you trust). |
| **Plugins (FR4)** | Extension points for block types and the note document are described in [`docs/plugins.md`](./docs/plugins.md). |
| **Future media** | **Image**, **audio**, and **LaTeX** block types exist in the type system as extension points; payloads remain JSON documents so new block kinds can land with **targeted schema/version** changes. |
| **Theme** | **Light** / **dark** toggle; styling uses CSS variables (`ThemeContext`). |
| **Errors** | Failures use **`AppError`** and **`ErrorCodes`** (e.g. `AN_NOTE_002`, `AN_AUTH_001`); **`ErrorBanner`** shows user-facing text **with codes**. |
| **Tests** | **Vitest** (jsdom for UI, **node** for `server/app.test.ts`), **Testing Library** where applicable; **`fake-indexeddb`** remains for any client tests that need it. API tests assert **ciphertext** in the DB response, not plaintext titles. |

## Tech stack

- **React 19**, **TypeScript**, **Vite 6**
- **Express**, **better-sqlite3**, **bcryptjs**, **express-session**, **Web Crypto** (PBKDF2 / AES-GCM in the browser)
- **ESLint 9**, **Vitest**, **Supertest** (API tests)

## Running the app

**Development (recommended):** starts the API and Vite together; the dev server **proxies** `/api` to the API on port **3001**.

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). Ensure nothing else uses port **3001** (or set `PORT` and match `vite.config.ts` proxy target).

### Mac, Windows, and “cross‑platform”

The **product** is still a normal web app: users only need a browser. **Cross‑platform** does *not* mean “one `node_modules` folder works everywhere.”

- **Dependencies with native code** (here: **`better-sqlite3`**) ship **separate binaries per OS and CPU** (Windows vs macOS vs Linux). That is expected for any Node project using native addons.
- **You should not copy or cloud‑sync `node_modules`** between machines. It is listed in `.gitignore` for that reason. On each computer, after you clone or pull the repo, run **`npm install` once** (or again when dependencies change). That installs the correct build for **that** OS—no manual rebuild unless something is broken.
- Switching from Mac to Windows is: pull latest code → **`npm install`** on Windows → **`npm run dev`**. You are not redoing a special ritual every time unless `node_modules` was copied from the wrong place or corrupted.

If you want **identical dev environments** on every machine, use **Docker** or a **dev container** (Node image + `npm install` inside the container). That’s optional tooling; the app itself remains a browser SPA plus a small Node API.

### Docker (one Linux environment everywhere)

Requires **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (or Docker Engine + Compose v2) on Mac or Windows.

**Development** — API + Vite with hot reload; native modules (e.g. `better-sqlite3`) are built **inside** the Linux container, so Mac and Windows hosts no longer need matching `node_modules`.

```bash
mkdir data
docker compose up --build
# or: npm run docker:up
```

Open **`http://localhost:5173`**. The API is on **`http://localhost:3001`** (also published for debugging).

- The repo is **bind-mounted** into the container; edits on the host reload as usual.
- **`node_modules`** is a **named volume** (`node_modules:/app/node_modules`) so the container keeps **Linux** dependencies and is not overwritten by a host `node_modules` tree.
- **`./data`** is mounted to **`/app/data`** for SQLite (create `data` on the host first if it does not exist).
- Optional **`.env`** in the project root can set `SESSION_SECRET`, `PORT`, `ASTRANOTES_DB_PATH`, etc., the same as local runs (Compose passes the file if you add `env_file: [.env]` to the service, or set variables in `docker-compose.yml`).

**Dev Container (Cursor / VS Code):** open the folder in a container using [`.devcontainer/devcontainer.json`](./.devcontainer/devcontainer.json), which reuses the same Compose service.

**Production Docker image** (Express serves **`dist/`** and **`/api`** on one port — default **4173**; no Vite preview, so reverse proxies like Tailscale do not hit Vite’s Host check):

```bash
docker compose --profile prod up --build
# or: npm run docker:prod
```

Open **`http://localhost:4173`**. Set a strong **`SESSION_SECRET`** in `.env` or the environment for anything beyond local smoke tests. Real deployments still need **HTTPS** for secure cookies in the browser.

**NAS / Raspberry Pi / LAN:** If you open the app as **`http://192.168.x.x:4173`** (or any non-localhost HTTP URL), the browser is **not** a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts), so **`crypto.subtle`** is missing and **register / unlock will fail** with **`AN_CRYPTO_001`**. Put a **reverse proxy** (Caddy, Nginx, NPM, Traefik) in front with **HTTPS** (Let’s Encrypt, Tailscale Serve, or a trusted LAN certificate), or access only via **`https://…`**.

### Troubleshooting

**`AN_CRYPTO_001` / Web Crypto not available (register or unlock on a home server).**  
You are almost certainly on **plain HTTP** to a **non-localhost** URL. Use **HTTPS** in front of the app (see **NAS / Raspberry Pi / LAN** above).

**`http proxy error` / `ECONNREFUSED 127.0.0.1:3001` (often before login).**  
Vite forwards `/api` to the API on port **3001**. This error means **nothing is listening there** — almost always because **`npm run dev:api` crashed** while **`npm run dev:web` kept running**. Scroll the terminal for the **`[0]`** (API) lines, not only `[1]` (Vite).

**`better_sqlite3.node is not a valid Win32 application` / `ERR_DLOPEN_FAILED`.**  
The **`better-sqlite3`** native addon does not match this Windows install (wrong CPU architecture, built for another OS, corrupted file, or **outdated binary for your Node version**). Fix on **this machine**:

```bash
npm rebuild better-sqlite3
```

If it still fails, delete the **`node_modules`** folder and run **`npm install`** again on **this PC** (do not copy `node_modules` from macOS/Linux or another machine; synced or copied native `.node` files often cause this error).

Use **Node.js LTS** (e.g. **22.x** or **20.x**) if problems persist with a very new Node release. After the API starts, you should see `AstraNotes API listening on http://127.0.0.1:3001` in the log.

**Individual processes:**

```bash
npm run dev:api    # API only (tsx watch)
npm run dev:web    # Vite only
```

**Production build (static UI):**

```bash
npm run build
npm run preview    # serves dist/; still proxies /api → 127.0.0.1:3001 — run the API separately
```

**Environment (API):** copy [`.env.example`](./.env.example) to `.env` if you want local overrides. Important variables:

| Variable | Purpose |
|----------|---------|
| `SESSION_SECRET` | Signing key for session cookies. **Required in production** (the server refuses the default secret when `NODE_ENV=production`). |
| `PORT` | API listen port (default **3001**). |
| `ASTRANOTES_DB_PATH` | Optional path to the SQLite file (default `./data/astranotes.db`). |

## Project structure

```text
.
├── index.html              # Vite HTML entry
├── Dockerfile              # Dev image; production = Express + built SPA
├── docker-compose.yml      # Dev stack; optional prod profile
├── .devcontainer/          # Cursor/VS Code Dev Container (optional)
├── package.json            # Scripts and dependencies
├── vite.config.ts          # Vite + Vitest + dev/preview proxy
├── tsconfig*.json          # App, Node/Vite, and server typecheck
├── eslint.config.js
├── README.md               # This file — overview and structure
├── docs/
│   └── plugins.md          # FR4 extension boundary (blocks, trust model)
├── planning/
│   ├── LOG.md              # Dated work log
│   └── refined_requirements.md
├── server/
│   ├── index.ts            # API entry (listen)
│   ├── app.ts              # Express app, routes, session
│   ├── db.ts               # SQLite open + schema
│   ├── session.d.ts        # express-session userId/username
│   └── app.test.ts         # Supertest isolation tests
└── src/
    ├── main.tsx            # React root
    ├── App.tsx             # Theme → auth → [unlock if session-only] → notes shell
    ├── index.css           # Global / theme variables
    ├── api/
    │   └── client.ts       # fetch helpers, credentials, errors
    ├── components/
    │   ├── AuthScreen.tsx  # Register / log in; vault unlock inline after login (same password)
    │   ├── UnlockScreen.tsx # Password after session restore (e.g. refresh); skipped right after log-in
    │   ├── Sidebar.tsx     # Note list, archive filter, log out
    │   ├── NoteEditor.tsx  # Title + markdown edit + preview
    │   ├── BlockPreview.tsx
    │   └── ErrorBanner.tsx
    ├── context/
    │   ├── AuthContext.tsx # Session user, logout, refresh
    │   ├── NotesContext.tsx# Notes CRUD, selection, autosave
    │   └── ThemeContext.tsx
    ├── crypto/
    │   └── vault.ts        # PBKDF2 + AES-GCM encrypt/decrypt for notes
    ├── types/
    │   ├── note.ts         # Note, NoteDocument, block union, helpers
    │   ├── tags.ts         # Tag normalization (FR2b)
    │   └── noteWire.ts     # Encrypted payload wire shape (v2)
    ├── search/
    │   └── noteSearch.ts   # Client-side search helpers (FR2a)
    ├── vault/
    │   └── exportFormat.ts # Export/import JSON v1 (FR7)
    ├── errors/
    │   ├── AppError.ts
    │   └── codes.ts
    ├── hooks/
    │   └── useDebouncedCallback.ts
    └── test/
        └── setup.ts        # Vitest / Testing Library setup
```

## Scripts

```bash
npm install          # Dependencies
npm run dev          # API + Vite (concurrently)
npm run dev:api      # API only
npm run dev:web      # Vite only
npm run build        # Typecheck (app + server) + Vite production build
npm run preview      # Preview production build (proxy /api to 3001)
npm run typecheck    # TypeScript only
npm run test         # Vitest (once)
npm run test:watch   # Vitest watch mode
npm run lint         # ESLint
npm run docker:up    # Docker Compose: dev (Vite + API; see "Docker" section)
npm run docker:prod  # Docker Compose profile prod: Express serves SPA + API on :4173
```

## Privacy and security (short)

- **Passwords** are stored as **bcrypt** hashes only (authentication).
- **Note contents** are encrypted **in the browser** before upload: **PBKDF2** key derivation and **AES-GCM** (`Vault` in `src/crypto/vault.ts`). The SQLite `notes.payload` column holds **ciphertext** and metadata (`v`, `ivB64`); **plaintext never appears on disk** at the server for v2 payloads.
- **Vault metadata** (`salt`, encrypted verifier) lives in `users.encryption_meta` so the client can check the password; the server still cannot derive the note key from that alone.
- **Sessions** use a signed cookie; treat `SESSION_SECRET` like a key in production. The cookie does **not** carry the vault encryption key—only **AuthScreen** (at log-in) and **UnlockScreen** (after reload with an active session) derive it from your password.
- **Isolation:** note rows are tied to `user_id` from the session; attempts to modify another user’s note id return **403**. JSON responses for `/api/notes` use **`Cache-Control: no-store`** so lists stay fresh across tabs.
- **Transport:** use **HTTPS** in production so cookies and ciphertext are not exposed on the wire.
- **Threat model:** anyone with **root/SQLite file read** sees ciphertext only; anyone with the **user’s password** (or a live unlocked browser tab) can decrypt. **Not** protected: contents in **RAM** while the tab is open, **screenshots**, **exported JSON** (plaintext), or malware on the device. Failed decrypt shows a clear error (`AN_CRYPTO_003`). **IndexedDB-only** legacy data from before the server-backed app is **not** migrated automatically.
- **FR6-S vs FR6-P (planning):** today’s app implements **server opaque ciphertext + client decrypt** (FR6-S). A future **per-note passphrase** plugin (FR6-P) would be an add-on on top of the same note model.

---

*AstraNotes — CSEN 296B / personal notes tooling.*
