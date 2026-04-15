# AstraNotes (planning copy)

**Public repository:** [github.com/victorbuenog/AstraNotes](https://github.com/victorbuenog/AstraNotes). Clone on any machine with **Node.js** (LTS recommended); run **`npm install`** locally—do not sync `node_modules` across OSes. Optional: **Docker** (see root [README](../README.md)) for a single Linux dev environment on Mac or Windows.

AstraNotes is a **multi-user** note-taking web app: **register or log in** with a **username and password**. On **register** or **log in**, the **client** derives the encryption key and unlocks the vault in the **same** flow (no second password step). If you **reload** the page while still signed in, a short **unlock** screen asks for your password once—the session cookie does not carry the crypto key. **Note bodies** are **AES-GCM** ciphertext in **SQLite** (`data/` by default); the server stores **opaque blobs** and does not have the key. The API still enforces **auth**: each session only accesses that user’s rows (no cross-user reads or writes).

The UI stays minimal: a left **sidebar** (notes by last modified, each row with a **⋯** menu for **Archive** / **Restore** and **Delete**), a **markdown** editor with **preview**, **light/dark** theme, **Log out**, and clear **error messages with stable codes** for debugging. **Delete** is not exposed next to the editor; confirming permanent delete uses a dialog (with optional **Never ask again** stored per **username** in `localStorage` on this browser).

> **Work log:** [`LOG.md`](./LOG.md). **Refined requirements:** [`refined_requirements.md`](./refined_requirements.md). The canonical copy of this overview is the repo root [`README.md`](../README.md).

## Functionality

| Area | Behavior |
|------|----------|
| **Accounts** | **Register** (username + password + confirm) or **Log in**. Usernames: 3–32 chars, `[a-zA-Z0-9_-]`. Passwords: min 8 chars. Password fields support **show/hide** (Auth and Unlock screens). |
| **Encryption** | **Web Crypto** (`src/crypto/vault.ts`): **PBKDF2** + **AES-GCM**. Per-user **salt + verifier** metadata is stored in `users.encryption_meta` (server cannot decrypt). **Log in** unlocks the vault in one step using the same password. If you **reload** the page while still signed in, the app asks for your password once more (the key is not stored in the session). |
| **Session** | After login, the API sets an **HTTP-only session cookie** (`astranotes.sid`). The SPA calls `/api/*` with `credentials: 'include'`. |
| **Notes** | Create and edit notes; **Archive** / **Restore** and **Delete** are available from the **⋯** menu on each sidebar row (not in the editor chrome). **Delete** removes the note **permanently** from the database (cannot be undone). The first time (per browser), a dialog asks for confirmation with **Cancel**, **Confirm**, and **Never ask again** (per signed-in **username**); if that box was checked on a prior confirmation, the next delete runs immediately. Each note is encrypted as JSON **before** `PUT`; the server stores `{ v:2, ivB64, ciphertextB64 }` plus `updated_at`. Sidebar lists active notes sorted by **updated** time (newest first). |
| **Search / tags / export** | See root **README**: client **search** (title + body), **tags** with filter, **export/import** JSON v1, **`docs/plugins.md`**. |
| **Autosave** | Edits are **debounced** (~450 ms) and persisted via the API; the header shows **Saving…** / **Saved**. Session expiry surfaces a clear save error. |
| **Markdown** | Versioned **document** + **blocks**; **Write/Split/Read**; preview tracks editor state (see root README). |
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

**Docker (optional):** same stack inside Linux containers—consistent native modules (e.g. `better-sqlite3`) on Mac and Windows. From the repo root: `mkdir data` (if needed), then `docker compose up --build` or `npm run docker:up`. See the root [README](../README.md) for troubleshooting (API not listening, `better-sqlite3` load errors) and the **production preview** profile (`npm run docker:prod`).

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

**Environment (API):** copy [`.env.example`](../.env.example) to `.env` if you want local overrides. Important variables:

| Variable | Purpose |
|----------|---------|
| `SESSION_SECRET` | Signing key for session cookies. **Required in production** (the server refuses the default secret when `NODE_ENV=production`). |
| `PORT` | API listen port (default **3001**). |
| `ASTRANOTES_DB_PATH` | Optional path to the SQLite file (default `./data/astranotes.db`). |
| `ASTRANOTES_SQLITE_JOURNAL_MODE` | Optional: `WAL`, `DELETE`, or `TRUNCATE`. On SMB/NAS/UNC/mapped network drives the API may default to **DELETE** (WAL is unreliable on network filesystems). |

## Project structure

```text
.  (repo root — see root README for full detail)
├── README.md               # Canonical overview (this planning/README is a course/planning copy)
├── planning/
│   ├── README.md           # This file
│   └── LOG.md              # Dated work log
├── Dockerfile              # Dev + production-preview images
├── docker-compose.yml      # Dev stack; optional prod profile
├── .devcontainer/          # Cursor/VS Code Dev Container (optional)
├── index.html              # Vite HTML entry
├── package.json            # Scripts and dependencies
├── vite.config.ts          # Vite + Vitest + dev/preview proxy
├── tsconfig*.json          # App, Node/Vite, and server typecheck
├── eslint.config.js
├── server/
│   ├── index.ts            # API entry (listen)
│   ├── app.ts              # Express app, routes, session
│   ├── db.ts               # SQLite open + schema
│   ├── journalMode.ts      # SQLite journal mode hints (network paths)
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
    │   ├── PasswordInput.tsx # Password field + visibility toggle
    │   ├── UnlockScreen.tsx # Password after session restore (e.g. refresh); skipped right after log-in
    │   ├── Sidebar.tsx     # Note list, ⋯ archive/delete, archive filter, log out
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
    │   └── noteWire.ts     # Encrypted payload wire shape (v2)
    ├── errors/
    │   ├── AppError.ts
    │   └── codes.ts
    ├── hooks/
    │   └── useDebouncedCallback.ts
    ├── preferences/
    │   └── deleteConfirm.ts  # localStorage: skip delete confirmation per username
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
npm run docker:up    # Docker Compose: dev (Vite + API)
npm run docker:prod  # Docker Compose profile prod: preview + API on :4173
```

## Privacy and security (short)

- **Passwords** are stored as **bcrypt** hashes only (authentication).
- **Note contents** are encrypted **in the browser** before upload: **PBKDF2** key derivation and **AES-GCM** (`Vault` in `src/crypto/vault.ts`). The SQLite `notes.payload` column holds **ciphertext** and metadata (`v`, `ivB64`); **plaintext never appears on disk** at the server for v2 payloads.
- **Vault metadata** (`salt`, encrypted verifier) lives in `users.encryption_meta` so the client can check the password; the server still cannot derive the note key from that alone.
- **Sessions** use a signed cookie; treat `SESSION_SECRET` like a key in production. The cookie does **not** carry the vault encryption key—only **AuthScreen** (at log-in) and **UnlockScreen** (after reload with an active session) derive it from your password.
- **Isolation:** note rows are tied to `user_id` from the session; attempts to modify another user’s note id return **403**.
- **Transport:** use **HTTPS** in production so cookies and ciphertext are not exposed on the wire.
- **Threat model:** anyone with **root/SQLite file read** sees ciphertext only; anyone with the **user’s password** (or a live unlocked browser tab) can decrypt. **IndexedDB-only** legacy data from before the server-backed app is **not** migrated automatically.

---

*AstraNotes — CSEN 296B / personal notes tooling.*
