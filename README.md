# AstraNotes

AstraNotes is a **multi-user** note-taking web app: **register or log in** with a **username and password**. On **register** or **log in**, the **client** derives the encryption key and unlocks the vault in the **same** flow (no second password step). If you **reload** the page while still signed in, a short **unlock** screen asks for your password once—the session cookie does not carry the crypto key. **Note bodies** are **AES-GCM** ciphertext in **SQLite** (`data/` by default); the server stores **opaque blobs** and does not have the key. The API still enforces **auth**: each session only accesses that user’s rows (no cross-user reads or writes).

The UI stays minimal: a left **sidebar** (notes by last modified), a **markdown** editor with **preview**, **light/dark** theme, **Log out**, and clear **error messages with stable codes** for debugging.

> **Work log:** day-to-day implementation notes and prompts live in [`LOG.md`](./LOG.md). This README is the high-level project overview.

## Functionality

| Area | Behavior |
|------|----------|
| **Accounts** | **Register** (username + password + confirm) or **Log in**. Usernames: 3–32 chars, `[a-zA-Z0-9_-]`. Passwords: min 8 chars. |
| **Encryption** | **Web Crypto** (`src/crypto/vault.ts`): **PBKDF2** + **AES-GCM**. Per-user **salt + verifier** metadata is stored in `users.encryption_meta` (server cannot decrypt). **Log in** unlocks the vault in one step using the same password. If you **reload** the page while still signed in, the app asks for your password once more (the key is not stored in the session). |
| **Session** | After login, the API sets an **HTTP-only session cookie** (`astranotes.sid`). The SPA calls `/api/*` with `credentials: 'include'`. |
| **Notes** | Create, edit, **archive**, and **permanently delete** notes. Each note is encrypted as JSON **before** `PUT`; the server stores `{ v:2, ivB64, ciphertextB64 }` plus `updated_at`. Sidebar lists notes sorted by **updated** time (newest first). |
| **Autosave** | Edits are **debounced** (~450 ms) and persisted via the API; the header shows **Saving…** / **Saved**. |
| **Markdown** | Each note uses a **versioned document** with a **block** array; the MVP edits the primary **markdown** block and renders preview (GFM via `react-markdown` / `remark-gfm`). |
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
├── package.json            # Scripts and dependencies
├── vite.config.ts          # Vite + Vitest + dev/preview proxy
├── tsconfig*.json          # App, Node/Vite, and server typecheck
├── eslint.config.js
├── README.md               # This file — overview and structure
├── LOG.md                  # Dated work log (separate from README)
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
    │   └── noteWire.ts     # Encrypted payload wire shape (v2)
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
