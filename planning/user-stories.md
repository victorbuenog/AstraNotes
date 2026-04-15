# User stories — early baseline

Each story ties to `planning/requirements.md` and **Initial Requirements.md**. Acceptance criteria are written to be **testable** (manual and/or automated).

**UI note:** **Archive** / **delete permanently** are triggered from the sidebar **⋯** menu (not the editor toolbar). **Delete** uses a confirmation dialog (with optional **never ask again** per user on this browser).

---

## Story 1 — Reliable Markdown notes with autosave

**As a** signed-in user, **I want** my note edits to persist quickly and reliably, **so that** I do not lose work.

**Maps to:** FR1, NFR1 (human-scale latency).

### Acceptance criteria

1. Creating a new note adds it to the note list and persists on the server after save completes.
2. Editing note Markdown triggers a debounced save; the UI indicates **saving** and **saved** (or equivalent) states.
3. Reloading the app after save shows the same note content (after unlock/session as required).
4. **Archive** hides the note from the main list, persists the archived state server-side, and the note remains available when the user switches to the **archive** view; **unarchive** moves it back to the main list.
5. **Delete permanently** removes the note from the database via the API; the action is **irreversible** and is confirmed in the UI before execution.
6. Automated tests cover at least one server path for create/update and authorization scope (e.g. wrong user cannot update another user’s note).

---

## Story 2 — Markdown preview toggle

**As a** user, **I want** to switch between raw Markdown and a rendered preview, **so that** I can verify formatting without leaving the editor.

**Maps to:** FR3.

### Acceptance criteria

1. User can toggle between **edit** and **preview** (or split view) for the primary Markdown content.
2. Preview renders common elements: headings, lists, fenced code blocks, links; images follow the app’s security rules (e.g. no arbitrary remote loads without an explicit decision).
3. Toggling does not lose unsaved edits (preview reads current editor state or last saved—behavior is documented in UI or README).
4. At least one client test or stable manual test checklist item documents expected rendering for a small Markdown fixture.

---

## Story 3 — Find my notes (search)

**As a** user with many notes, **I want** to search by text, **so that** I can open the right note without scrolling the entire list.

**Maps to:** FR2 (subset; full-text search MVP).

### Acceptance criteria

1. Search input filters the sidebar (or a dedicated results panel) by **title and/or body** (implementation choice documented).
2. Search runs client-side with acceptable performance for the **current** expected note count (hundreds to low thousands); no claim of 10k / 500 ms until measured.
3. Empty query shows full list (or default sort); no errors on special characters.
4. Selecting a result opens the note and matches user expectations for “current” note highlighting.

---

## Story 4 — Organize notes (tags or folders)

**As a** user, **I want** to assign a simple organizational label to notes, **so that** I can group related work.

**Maps to:** FR2 (tags).

### Acceptance criteria

1. User can add, edit, and remove **tags**.
2. Organization metadata persists across sessions and is included in list/detail API payloads (or client cache) as needed.
3. User can filter the note list by tag in the UI.
4. Migration story documented for existing notes (e.g. default empty tag set).

---

## Story 5 — Encrypted note payloads and user isolation

**As a** user, **I want** my note content protected on the server, **so that** operators or database readers cannot read my notes in plaintext.

**Maps to:** Sec 1, FR6 (architectural intent).

### Acceptance criteria

1. Note bodies on the server remain **opaque ciphertext** (current v2 payload model or successor documented).
2. API responses for list/detail do not expose decrypted plaintext bodies from the server (decryption happens client-side).
3. Cross-user access attempts return **403** (or equivalent) and are covered by tests.
4. README (or security notes) states threat model briefly: what is protected, what is not (e.g. metadata visibility).

---

## Story 6 — Export and import my vault

**As a** user, **I want** to export and later import my notes, **so that** I can back up and move between environments.

**Maps to:** FR7.

### Acceptance criteria

1. Export produces a **documented format** (e.g. versioned JSON or archive) including note ids, metadata needed for restore, and ciphertext or plaintext per agreed threat model (if export is plaintext at rest in file, user is warned).
2. Import validates format version; rejects or skips invalid entries with clear errors.
3. Import is idempotent or documented regarding duplicates (merge vs replace).
4. README documents steps for export/import and any limitations (e.g. single-user file, max size).

---

## Story 7 — Plugin-ready note model boundary

**As a** developer, **I want** a stable boundary for note types and blocks, **so that** future Voice or Secure variants plug in without rewriting core storage.

**Maps to:** FR4, NFR3.

### Acceptance criteria

1. Short **plugin / extension ADR** or `docs/plugins.md` describes: block types, lifecycle hooks, data contracts, and what core guarantees.
2. Core code uses a **single path** for “default Markdown note” that could register alternative renderers/savers later.
3. No commitment to full sandbox (Sec 2); document **current** trust model for plugins.
4. TypeScript types exported or centralized so new block types extend without editing unrelated modules.

---

## Story map (summary)

| # | Story | Primary req refs |
| --- | --- | --- |
| 1 | Reliable Markdown + autosave | FR1, NFR1 |
| 2 | Markdown preview | FR3 |
| 3 | Search | FR2 |
| 4 | Tags or folders | FR2 |
| 5 | Encryption + isolation | Sec 1, FR6 |
| 6 | Export / import | FR7 |
| 7 | Plugin boundary | FR4, NFR3 |
