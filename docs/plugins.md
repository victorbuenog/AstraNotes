# Plugin-ready note model (FR4 / NFR3)

This document is the **extension boundary** for AstraNotes: new note kinds (e.g. voice, per-note passphrase) should plug in **without** rewriting core storage or the default Markdown path.

## Core guarantees

- **Single JSON document per note** (`Note` in `src/types/note.ts`): `id`, `title`, `tags`, `archived`, timestamps, and a **versioned** `document` with a `blocks[]` array.
- **Default path:** the MVP edits the **primary `markdown` block** (`getPrimaryMarkdown` / `setPrimaryMarkdown`). Keep using this for plain text notes.
- **Wire format:** notes are encrypted as a whole with the user vault (`PUT /api/notes/:id` v2 payload). Plugins **must** serialize into the same `Note` / `NoteDocument` shape (or extend it with optional fields that older clients ignore).

## Adding a block type

1. Add a discriminated variant to `NoteBlock` in `src/types/note.ts` (`type: 'audio' | …`).
2. Bump `NOTE_DOCUMENT_VERSION` only if existing documents **cannot** be read without migration.
3. Provide a **renderer** in `BlockPreview` (or a small registry) for the new block.
4. Provide **save/load** helpers that keep the block list consistent.

## Trust model (not a sandbox)

Plugins run **in-process** in the SPA. There is **no** separate plugin sandbox or permission system yet (see Sec 2 in planning). Treat plugins as **trusted code** shipped with the app until a sandbox story exists.

## Related files

- `src/types/note.ts` — `Note`, `NoteDocument`, blocks
- `src/types/noteWire.ts` — encrypted payload wire shape
- `src/context/NotesContext.tsx` — default save/load path
- `planning/refined_requirements.md` — FR4, FR2, FR6-S / FR6-P splits
