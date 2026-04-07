# AstraNotes

AstraNotes is a **local-first, client-side** note-taking web app. Notes are stored in the browser (**IndexedDB**), **encrypted at rest** with the **Web Crypto API** (PBKDF2 + AES-GCM), and unlocked with a **vault passphrase**. The UI is minimal: a left **sidebar** (notes by last modified), a **markdown** editor with **preview**, **light/dark** theme, and clear **error messages with stable codes** for debugging.

> **Work log:** day-to-day implementation notes and prompts live in [`LOG.md`](./LOG.md). This README is the high-level project overview.

## Functionality

| Area | Behavior |
|------|----------|
| **Vault** | Create or unlock the vault with a passphrase before any note data is available (`VaultScreen`). |
| **Notes** | Create, edit, **archive**, and **permanently delete** notes. Sidebar lists notes sorted by **updated** time (newest first). |
| **Autosave** | Edits are **debounced** (~450 ms) and persisted through app state; the header shows **Saving…** / **Saved**. |
| **Markdown** | Each note uses a **versioned document** with a **block** array; the MVP edits the primary **markdown** block and renders preview (GFM via `react-markdown` / `remark-gfm`). |
| **Future media** | **Image**, **audio**, and **LaTeX** block types exist in the type system as extension points; storage stays document-oriented so new block kinds can land with **targeted schema/version** changes. |
| **Theme** | **Light** / **dark** toggle; styling uses CSS variables (`ThemeContext`). |
| **Errors** | Failures use **`AppError`** and **`ErrorCodes`** (e.g. `AN_NOTE_002`); **`ErrorBanner`** shows user-facing text **with codes**. |
| **Tests** | **Vitest**, **Testing Library**, and **`fake-indexeddb`** cover vault, storage, errors, and note types. |

## Tech stack

- **React 19**, **TypeScript**, **Vite 6**
- **idb** (IndexedDB), **Web Crypto**
- **ESLint 9**, **Vitest**

## Project structure

```text
.
├── index.html              # Vite HTML entry
├── package.json            # Scripts and dependencies
├── vite.config.ts          # Vite + Vitest config
├── tsconfig*.json          # TypeScript project refs
├── eslint.config.js
├── README.md               # This file — overview and structure
├── LOG.md                  # Dated work log (separate from README)
└── src/
    ├── main.tsx            # React root
    ├── App.tsx             # Theme → vault gate → notes shell
    ├── index.css           # Global / theme variables
    ├── components/
    │   ├── VaultScreen.tsx # Passphrase create / unlock
    │   ├── Sidebar.tsx     # Note list, archive filter, actions bar
    │   ├── NoteEditor.tsx  # Title + markdown edit + preview
    │   ├── BlockPreview.tsx
    │   └── ErrorBanner.tsx
    ├── context/
    │   ├── NotesContext.tsx    # Notes CRUD, selection, autosave orchestration
    │   └── ThemeContext.tsx    # Light/dark persistence
    ├── crypto/
    │   └── vault.ts        # Key derivation, encrypt/decrypt helpers
    ├── storage/
    │   ├── schema.ts       # DB name/version, encrypted payload shapes
    │   └── noteStore.ts    # IndexedDB read/write through vault
    ├── types/
    │   └── note.ts         # Note, NoteDocument, block union, helpers
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
npm run dev          # Dev server (Vite)
npm run build        # Typecheck + production build
npm run preview      # Preview production build
npm run typecheck    # TypeScript only
npm run test         # Vitest (once)
npm run test:watch   # Vitest watch mode
npm run lint         # ESLint
```

## Privacy and security (short)

- Data stays **in the browser** for that origin/profile; there is **no** built-in sync or server.
- **Encryption** protects data at rest on disk from casual inspection; strength depends on **passphrase choice** and **device security**.

---

*AstraNotes — CSEN 296B / personal notes tooling.*
