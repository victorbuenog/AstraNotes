# AstraNotes — work log

## Summary (current product)

AstraNotes is a **TypeScript-first** stack: **React + Vite** SPA plus an **Express** API backed by **SQLite** on disk. Users **register or log in** with **username/password**; **`AuthScreen`** unlocks the vault **inline** after a successful log-in (same password—no duplicate step). **`UnlockScreen`** appears only when a **session cookie** exists without an in-memory key (e.g. **full page reload**). The **client** encrypts/decrypts notes (**PBKDF2 + AES-GCM** via `Vault`). The server stores **ciphertext** in `notes.payload` (wire `v:2`) and **vault metadata** in `users.encryption_meta`; **session cookies** scope rows by `user_id` (**403** on cross-user note id).

**Autosave.** Edits are **debounced** (~450 ms) and saved via encrypted `PUT /api/notes/:id`, with **Saving… / Saved** in the UI.

**Archive vs delete.** **Archive** sets `archived: true`, keeps the row, and hides the note from the default sidebar list (user can **Show archived** and **Unarchive**). **Delete permanently** calls `DELETE /api/notes/:id` and removes the row (**cannot be undone**).

**Markdown and future media.** Notes still use a **versioned `NoteDocument`** with a **block array**; the MVP edits the primary **markdown** block. **Image, audio, LaTeX** blocks remain type-level extension points.

**UI/UX.** **Sidebar** lists notes by **last modified** with **search** (title + body, client-side), **tag filter**, and **collapsible** layout (narrow viewports use a **drawer** + backdrop). **Settings** (sidebar header): **Light/Dark**, **Export vault (JSON)** / **Import vault** (v1, plaintext — confirm), and **Log out**. Each row has a **⋯** menu for **Archive** / **Restore**, **Export note…** (single note as **Markdown** with YAML front matter), and **Delete**; **Delete** uses a modal (cannot be undone) with **Never ask again** stored per **username** in `localStorage` (`src/preferences/deleteConfirm.ts`). **Tags** on each note (comma-separated, normalized) with optional **suggestions** from existing tags. **Note editor**: **Write / Split / Read**, **resizable** split pane (wide layouts), **Enter** continues markdown lists (second **Enter** on an empty item exits the list), **Saving… / Saved** on the **title** row. Signed-in **username** remains in the sidebar. **Log in** does not show a separate unlock step; **refresh** with an active session may.

**Refined requirements alignment.** Implements **FR1** (CRUD, autosave with visible status, archive/delete UX), **FR2a** (search), **FR2b** (tags + filter + normalization), **FR3** (raw vs preview vs split; preview follows editor buffer), **FR7** (versioned vault JSON export/import with confirm; **additional** single-note Markdown export for portability), **FR4** (`docs/plugins.md`), **FR6-S** (opaque ciphertext, client decrypt, session isolation). **Session expiry** on save/import surfaces a clear banner message. **Decrypt** failures use `AN_CRYPTO_003` with an explicit user message. API sets **`Cache-Control: no-store`** on `/api/*`.

**Errors.** **`AppError`** + **`ErrorCodes`** include auth codes (`AN_AUTH_*`); **`ErrorBanner`** shows messages with codes.

**Testing.** **Vitest**: client tests (jsdom), **`server/app.test.ts`** (node + **Supertest**) for registration, **encrypted** save/list (asserts no plaintext title in API JSON), and **cross-user PUT forbidden**. **`src/crypto/vault.test.ts`** exercises **Web Crypto** helpers used by the vault.

**Legacy.** Older **plaintext** note rows (pre-encryption) are **auto re-uploaded** as ciphertext on first load after unlock when possible. The original **IndexedDB-only** vault path remains **removed**; there is **no** automatic migration of that data to the server.

**DevOps / portability.** Optional **Docker** + **Compose** + **Dev Container** document a single **Linux** toolchain for Mac and Windows (`Dockerfile`, `docker-compose.yml`, `.devcontainer/`). **SQLite** journal mode auto-adjusts on **network/SMB paths** (`server/journalMode.ts`, `ASTRANOTES_SQLITE_JOURNAL_MODE`). **Public repo:** `https://github.com/victorbuenog/AstraNotes`.

---

## Log

### 2026-04-23 — Read-mode correction, font scope fix, private PIN modal flow

*Align the editor and private-vault UX with the intended behavior and remove browser popup dependencies for PIN operations.*

- **Read mode behavior:** `Read` now renders **formatted Markdown only** (no source textarea). `Write` keeps raw editing; `Split` keeps editor + preview.
- **Font scope:** configurable note font family/size now apply to **Read/preview rendering only**. Source editing in the textarea always uses a stable **monospace** font for readability consistency.
- **Private vault PIN UX:** browser `prompt/alert` for PIN actions was removed. Private vault open/set/reset now use in-app modal dialogs with inline validation and status feedback.
- **Planning alignment:** requirement notes and implementation snapshot were updated to reflect that `Read` is non-editing by default and that PIN interactions avoid browser popups.

---

### 2026-04-15 — UI polish, settings menu, vault import/export placement, per-note Markdown export

*Align the product with refined baseline behavior (FR1, FR3, FR7 UX) and document where features live.*

**Requirements check (passing baseline):**

| Requirement | How the current app satisfies it |
| --- | --- |
| **FR1** | Debounced autosave (~450 ms); **Saving… / Saved** next to the note title; archive + permanent delete (with confirmation / optional skip). |
| **FR3** | **Write / Split / Read**; split pane is **resizable** on wide layouts; preview uses the same in-memory markdown as the editor (unsaved edits visible). |
| **FR7** | **Export vault (JSON)** and **Import vault** remain **formatVersion: 1**, validated, with user confirmation for plaintext backup; **Export note…** adds a **documented** single-note `.md` (YAML front matter + body) without replacing the vault JSON workflow. |
| **FR2a / FR2b** | Unchanged: client search (capped query), tags + filter, normalization in `src/types/tags.ts`. |
| **FR6-S** | Unchanged: ciphertext on the wire/at rest on the server; decrypt in the client; 403 isolation in API tests. |

**Product changes:**

- **Settings menu** (`SettingsMenu.tsx`): theme toggle, **Export vault (JSON)…**, **Import vault…**, **Log out**; moved from standalone sidebar buttons.
- **Sidebar**: optional **collapse** / **drawer** (narrow screens); **⋯** menu includes **Export note…** → downloads one Markdown file (`src/vault/noteMarkdownExport.ts`, `NotesContext.exportNoteMarkdown`).
- **Editor** (`NoteEditor.tsx`): title row + tags + save status; tag **suggestions**; **list continuation** on Enter (`src/utils/markdownListEnter.ts` + tests); resizable **Split** divider.
- **Docs:** this log, root `README.md`, and `planning/README.md` updated to describe the above.

---

### 2026-04-15 — Planning docs sync, GitHub remote, Docker, auth UX

*Align `planning/` with the current product; record repository URL; document Docker and cross-machine workflow.*

- **Repository:** [victorbuenog/AstraNotes](https://github.com/victorbuenog/AstraNotes) — clone + `npm install` per machine; `data/` and `.env` remain local (gitignored).
- **Planning:** Updated [`planning/README.md`](./README.md) (repo link, Docker, env vars, project tree, scripts); [`glossary.md`](./glossary.md) (Docker terms); [`sprint-zero-plan.md`](./sprint-zero-plan.md) (dev workflow); [`backlog.md`](./backlog.md) (status note); [`requirements.md`](./requirements.md) (implementation pointer); [`Working Agreement.md`](./Working%20Agreement.md) (source location); [`user-stories.md`](./user-stories.md) (delete/archive UI note); [`Definition of Done.md`](./Definition%20of%20Done.md) (planning alignment).
- **Product (already in tree):** Docker image/Compose, Vite `host` for containers, password visibility on Auth/Unlock, sidebar ⋯ actions + delete confirmation preference, SQLite journal heuristics, README troubleshooting for `better-sqlite3` / API not running.

### 2026-04-14 — Sidebar note actions: ⋯ menu, delete modal, “never ask again” (per user)

*Move archive/delete out of the main editor header; add a three-dot menu on each sidebar row; delete confirmation dialog with per-user optional skip via localStorage; update planning README and log.*

- **UI:** Removed **`NoteActionsBar`** from the main pane (`App.tsx`). Sidebar rows are a **select** control plus a **⋮** button opening **Archive** (or **Restore** when **Show archived**) and **Delete…**.
- **Delete flow:** Modal explains permanence; **Cancel** / **Confirm**; **Never ask again** (only persisted when the user confirms) sets `localStorage` key scoped by signed-in **username** (`astranotes.skipDeleteConfirm:<username>`). Subsequent deletes skip the modal for that user on that browser.
- **Code:** `src/preferences/deleteConfirm.ts` (+ Vitest `deleteConfirm.test.ts`); `Sidebar.tsx` menu + backdrop dialog; `index.css` row layout, menu, modal. **Typecheck** passes.

*Definition of Done / Working Agreement:* Change maps to requirements (safer destructive UX), is documented here and in `planning/README.md`, and is verifiable visually and via unit tests for the preference helper. No server or cross-user data exposure for the “never ask again” flag (client-only).

### 2026-04-13 — Refined requirements: search, tags, export/import, plugins doc

*Apply `planning/refined_requirements.md` baseline: FR2a, FR2b, FR7, FR4; edge-case UX for session loss and decrypt errors.*

- **Model:** `Note.tags` (encrypted with note JSON); `migrateNoteShape` for older rows; `src/types/tags.ts` normalization (max count/length, lowercase, dedupe).
- **Search:** `src/search/noteSearch.ts` — title + body, empty query = full list, max query length 500.
- **Vault file:** `src/vault/exportFormat.ts` — `formatVersion: 1`, `app: astranotes`, round-trip tests; export confirms plaintext warning; import upserts by note id.
- **UI:** Sidebar search, tag `<select>`, export/import; `NoteEditor` tags field; empty-state copy when filters match nothing.
- **API client:** `CRYPTO_DECRYPT_FAILED` message on `vault.decrypt` failure; friendlier `AUTH_UNAUTHORIZED` text on save/import.
- **Server:** `Cache-Control: no-store` for all `/api` routes.
- **Docs:** [`docs/plugins.md`](../docs/plugins.md); root [`README.md`](../README.md) updated (threat model, FR pointers, structure).

### 2026-04-07 — Client-side encryption for server-backed notes

*Follow-up: ensure note bodies stay encrypted (zero-knowledge style at rest on the server) while keeping multi-user sessions and SQLite persistence.*

- **Schema:** `users.encryption_meta TEXT` (JSON `VaultMeta`: salt, iterations, verifier iv/ciphertext). `notes.payload` stores **only** `{ v: 2, ivB64, ciphertextB64 }` JSON (plaintext `updated_at` column for sorting).
- **API:** `POST /api/register` requires `encryptionMeta`. `POST /api/login` and `GET /api/me` return `encryptionMeta`. `PATCH /api/me/encryption-meta` for accounts that had no metadata (one-time setup). `GET /api/notes` returns `{ id, updatedAt, payload }`. `PUT /api/notes/:id` requires **v2** encrypted body `{ v, ivB64, ciphertextB64, updatedAt }`.
- **Client:** `AuthScreen` calls `vault.create(password)` on register and sends meta; on **login**, unlocks inline with the same password (`unlock` / `create` + `PATCH` if no meta). **`UnlockScreen`** only for **session restore** (e.g. refresh). **`NotesProvider`** takes `vault`; `api.listNotes` / `saveNote` encrypt and decrypt; **legacy plaintext** rows are re-saved encrypted on load.
- **Files:** `src/types/noteWire.ts`, `src/components/UnlockScreen.tsx`, edits to `App.tsx`, `api/client.ts`, `NotesContext.tsx`, `server/app.ts`, `server/db.ts`, `server/app.test.ts`, `README.md`, `LOG.md`. **`tsconfig.server.json`** excludes `server/**/*.test.ts` from `tsc` so `Vault` imports in tests do not force NodeNext resolution on all of `src`.

---

### 2026-04-07 — Auth UX and API client fixes

*Refinements: avoid asking for the password twice after log-in; fix fetch response handling.*

- **UX:** After **`api.login`**, **`AuthScreen`** runs **`vault.unlock(password, encryptionMeta)`** (or **`vault.create` + `patchEncryptionMeta`** if the account has no metadata) using the password already entered, then sets **`skipVaultUnlock: true`**. **`UnlockScreen`** remains for **reload / session-without-key** only; copy updated to explain that.
- **Bugfix:** **`login`**, **`register`**, and **`getMe`** in [`src/api/client.ts`](src/api/client.ts) had called **`parseJson`** (which reads **`res.text()`**) and then **`res.json()`** on success, which throws **“body stream already read”**. Success paths now use the **single** parsed object returned from **`parseJson`**.
- **Docs:** README intro, structure comments, and this log aligned with the above.

---

### 2026-04-07 — Initial implementation snapshot

*You are an advanced software developer. Develop a web-based note-taking app called AstraNotes using mainly TypeScript. The user should be able to create, edit, archive, and fully delete notes. Storage should be robust and secure (only the user can access their notes), and notes should be autosaved in real time as the user modifies them. The notes should support markdown, and implement a skeleton so other forms of media can be added to the notes in the future – such as images, audio/voice recordings, and LaTeX equations – without completely changing the storage solution. The app should be minimalist and easy to use, feature a sidebar on the left with notes ordered by last modified, it should also feature a Light/Dark mode toggle. Errors should be handled elegantly and codes should be presented to the user for clear debugging, and the project should be fully testable. Create an LOG.md file in the root to log the work done, start with a summary of what was done based on the mentioned prompt*

- Scaffolded **Vite + React 19 + TypeScript** app with ESLint and Vitest.
- Implemented **encrypted vault** (`src/crypto/vault.ts`) and **IndexedDB note store** (`src/storage/noteStore.ts`, `schema.ts`).
- Added **note model** with extensible **blocks** (`src/types/note.ts`) and **autosaving** note operations (`src/context/NotesContext.tsx`).
- Built UI: **vault unlock/create**, **sidebar** (archive filter, actions), **markdown editor** with **preview** (`NoteEditor`, `BlockPreview`), **theme toggle**, **error banner**.
- Added **error taxonomy** (`src/errors/AppError.ts`, `codes.ts`) and **tests** for crypto, storage, and core types.
- Created this **LOG.md** to record scope and ongoing changes.

---

### 2026-04-07 — Multi-user login, SQLite persistence, API refactor

*The app does not support multiple users. Establish a simple login setup with username and password, and save the notes in a secure way so one user cannot access the others'. Notes should be permanently saved even if the server is shutdown/restarted. Update logs and readme accordingly with the implemented changes (comprehensive "dump" in log, feature summary in readme).*

#### Implementation dump

**Dependencies added (runtime):** `express`, `better-sqlite3`, `bcryptjs`, `express-session`.

**Dependencies added (dev):** `tsx`, `concurrently`, `supertest`, `@types/express`, `@types/express-session`, `@types/bcryptjs`, `@types/better-sqlite3`, `@types/node`, `@types/supertest`.

**Dependencies removed:** `idb` (IndexedDB wrapper; no longer used).

**Scripts:**

- `npm run dev` → **concurrently** `dev:api` + `dev:web` (`tsx watch server/index.ts` and `vite`).
- `dev:api`, `dev:web` split for running processes individually.
- `build` / `typecheck` run **both** `tsconfig.app.json` and **`tsconfig.server.json`**.

**Server layout:**

- [`server/index.ts`](server/index.ts): resolve `ASTRANOTES_DB_PATH` or default `data/astranotes.db`, `SESSION_SECRET` (refuses default when `NODE_ENV=production`), `PORT` default **3001**, `openDb`, `createApp`, `listen`.
- [`server/db.ts`](server/db.ts): `mkdir` for parent dir, **WAL** mode, schema:
  - `users(id, username UNIQUE COLLATE NOCASE, password_hash, created_at)`
  - `notes(id TEXT PRIMARY KEY, user_id FK CASCADE, payload TEXT, updated_at)` — `payload` is JSON string of full `Note`.
- [`server/app.ts`](server/app.ts): `express.json`, **`express-session`** cookie name `astranotes.sid`, `httpOnly`, `sameSite: 'lax'`, `secure` when production.
- **Auth:** `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/me`.
- **Notes:** `GET /api/notes` (session user only), `PUT /api/notes/:id` (reject if row exists with different `user_id` → **403**), `DELETE /api/notes/:id`.
- **Validation:** username 3–32, regex `^[a-zA-Z0-9_-]+$`; password min 8; bcrypt cost **10**.
- [`server/session.d.ts`](server/session.d.ts): `SessionData.userId`, `username`.

**Client layout:**

- [`src/api/client.ts`](src/api/client.ts): `fetch` with `credentials: 'include'`, maps HTTP errors to **`AppError`** / new **`ErrorCodes`** (`AN_AUTH_*`).
- [`src/context/AuthContext.tsx`](src/context/AuthContext.tsx): `getMe` on mount, `logout`, `setUser`.
- [`src/components/AuthScreen.tsx`](src/components/AuthScreen.tsx): tabs **Log in** / **Register**, fields, calls `register` / `login`.
- [`src/context/NotesContext.tsx`](src/context/NotesContext.tsx): **`Vault` removed**; uses `listNotes`, `saveNote`, `deleteNote` from API; behavior otherwise unchanged (debounce, flush on visibility, etc.).
- [`src/App.tsx`](src/App.tsx): `ThemeProvider` → `AuthProvider` → loading gate → `AuthScreen` or `NotesProvider` → `MainChrome` (passes `username` / `onLogout` to sidebar).
- [`src/components/Sidebar.tsx`](src/components/Sidebar.tsx): optional **Log out** + username line.
- **Deleted:** `src/components/VaultScreen.tsx`, `src/storage/noteStore.ts`, `src/storage/schema.ts`, `src/storage/noteStore.test.ts`.

**Tooling / config:**

- [`vite.config.ts`](vite.config.ts): `server.proxy` and **`preview.proxy`** for `/api` → `http://127.0.0.1:3001`.
- [`.gitignore`](.gitignore): `/data` for SQLite directory.
- [`.env.example`](.env.example): `SESSION_SECRET`, `PORT`, optional `ASTRANOTES_DB_PATH`.
- [`eslint.config.js`](eslint.config.js): ignore **`server/`** (Node globals not wired in ESLint for this repo).
- [`tsconfig.server.json`](tsconfig.server.json): **NodeNext** module resolution for server + shared `src/types/note.ts`.

**Tests:**

- [`server/app.test.ts`](server/app.test.ts): temp SQLite file, **Supertest** agents with cookies — register, PUT note, GET list; second scenario — user B **403** on PUT with user A’s note id.
- Vitest [`environmentMatchGlobs`](vite.config.ts): `server/**/*.test.ts` → **node**.

**Docs:**

- [`README.md`](README.md): rewritten for **multi-user**, **run instructions**, **env vars**, **security** bullets, **breaking change** vs IndexedDB vault.
- This entry: **feature dump** for the prompt above.

#### Tradeoffs (superseded in part by encryption entry below)

- Initial multi-user cut stored **plaintext** JSON in SQLite; a later entry added **client-side AES-GCM** for note bodies. Isolation remains **auth + SQL**; ciphertext adds **at-rest** protection against DB inspection without the password.
- **Session store** is the default **in-memory** `MemoryStore` from `express-session`; restarting the API **invalidates sessions** (users log in and unlock again). **Notes** remain in SQLite across restarts.

---

*Append new dated entries below as work continues. For each entry, repeat the **prompt** that drove that work in italics at the top of the entry (same as below when the work matches the original brief).*
