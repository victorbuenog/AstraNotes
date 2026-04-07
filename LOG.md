# AstraNotes — work log

## Summary (vs. original brief)

AstraNotes is a **TypeScript-first** web app (React + Vite) for personal note-taking. It implements the core lifecycle from the brief: **create, edit, archive, and permanent delete** of notes.

**Storage and access control.** Notes live in the browser in **IndexedDB** (`idb`), but payloads are **encrypted at rest** with **Web Crypto** (PBKDF2 key derivation, AES-GCM). A **vault passphrase** gates the app (`VaultScreen`); only someone with the passphrase can decrypt local data. This matches “robust and secure” in the sense of **client-side encryption** and **origin-scoped** browser storage (not a multi-user server; isolation is per-browser profile and passphrase).

**Autosave.** Edits are **debounced** (~450 ms) and persisted through `NotesContext`, with a visible **Saving… / Saved** indicator.

**Markdown and future media.** Notes use a **versioned `NoteDocument`** with a **block array**. The MVP edits the primary **markdown** block; **image, audio, and LaTeX** block types are defined in the type system as **extensibility hooks** so new media can be added later with **targeted schema/version bumps** rather than replacing storage.

**UI/UX.** **Left sidebar** lists notes sorted by **last modified** (`updatedAt` descending). **Light/Dark** theme is toggled from the main chrome (`ThemeContext`, CSS variables). Layout is intentionally **minimal**.

**Errors and debugging.** Failures surface through **`AppError`** and **stable `ErrorCodes`** (e.g. `AN_NOTE_002`); the **`ErrorBanner`** shows user-facing messages **with codes** for support and debugging.

**Testing.** The project uses **Vitest**, **Testing Library**, and **`fake-indexeddb`** for unit/integration-style tests (vault, store, errors, note types, and related modules). Scripts: `npm test`, `npm run test:watch`.

---

## Log

### 2026-04-07 — Initial implementation snapshot

*You are an advanced software developer. Develop a web-based note-taking app called AstraNotes using mainly TypeScript. The user should be able to create, edit, archive, and fully delete notes. Storage should be robust and secure (only the user can access their notes), and notes should be autosaved in real time as the user modifies them. The notes should support markdown, and implement a skeleton so other forms of media can be added to the notes in the future – such as images, audio/voice recordings, and LaTeX equations – without completely changing the storage solution. The app should be minimalist and easy to use, feature a sidebar on the left with notes ordered by last modified, it should also feature a Light/Dark mode toggle. Errors should be handled elegantly and codes should be presented to the user for clear debugging, and the project should be fully testable. Create an LOG.md file in the root to log the work done, start with a summary of what was done based on the mentioned prompt*

- Scaffolded **Vite + React 19 + TypeScript** app with ESLint and Vitest.
- Implemented **encrypted vault** (`src/crypto/vault.ts`) and **IndexedDB note store** (`src/storage/noteStore.ts`, `schema.ts`).
- Added **note model** with extensible **blocks** (`src/types/note.ts`) and **autosaving** note operations (`src/context/NotesContext.tsx`).
- Built UI: **vault unlock/create**, **sidebar** (archive filter, actions), **markdown editor** with **preview** (`NoteEditor`, `BlockPreview`), **theme toggle**, **error banner**.
- Added **error taxonomy** (`src/errors/AppError.ts`, `codes.ts`) and **tests** for crypto, storage, and core types.
- Created this **LOG.md** to record scope and ongoing changes.

---

*Append new dated entries below as work continues. For each entry, repeat the **prompt** that drove that work in italics at the top of the entry (same as below when the work matches the original brief).*
