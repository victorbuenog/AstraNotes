# AstraNotes — test planning

This document aligns automated testing with the product baseline in `[AstraNotes Planning/refined_requirements.md](AstraNotes%20Planning/refined_requirements.md)` and `[AstraNotes Planning/user-stories.md](AstraNotes%20Planning/user-stories.md)`. Tooling and conventions follow `[AGENTS.md](AGENTS.md)`.

---

## Testing strategy

AstraNotes splits risk across **fast deterministic tests** that run in CI and **broader manual or future E2E** checks for full-browser flows (Web Crypto, sessions, and layout).

1. **Prefer the right layer.** Pure logic and crypto run in **Vitest unit tests** (`jsdom` on the client side, `node` for the API). Anything that needs HTTP routes, cookies, and SQLite uses **integration tests** (`supertest` + temp DB). Full **feature-level** coverage is a combination of integration tests (API + real `createApp`) plus, when needed, **React Testing Library** component tests or **Playwright** (not required for the outlines below but useful for `AppGate`, unlock, and autosave UX).
2. **Security-sensitive assertions.** API tests must treat the server as untrusted for note content: list/detail responses should carry **ciphertext / v2 payload**, not plaintext titles or bodies; decrypt only inside the test client with the user’s vault key (see `[server/app.test.ts](server/app.test.ts)`).
3. **Traceability.** Each planned test set lists **functional requirements (FR)**, **security constraints (Sec)** where relevant, and **user stories (US)** so sprint work maps to automated checks.
4. **Breadth over duplication.** Reuse the real `Vault`, `openDb`, and `createApp` in integration tests rather than mocking the whole stack; reserve mocks for network boundaries in narrow unit tests.

---

## First test sets (outlines)

Below are **concrete next steps**: one set that **extends what already exists** and one **new file** for a high-value pure function module that currently has no dedicated test.

### Test set A — API: encrypted persistence and session isolation

**Intent:** Prove that notes are stored and returned as opaque payloads, saves are session-scoped, and cross-user mutations are rejected.


| #   | Test outline                                                                                                                                                         | Status                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| A1  | Register user A, `PUT` encrypted note, `GET /api/notes` — assert `payload` has `ivB64` / `ciphertextB64` (or documented v2 shape), **no** plaintext `title` in JSON. | Covered in `server/app.test.ts`                                                  |
| A2  | Same as A1 — decrypt in test with `Vault` and assert round-trip content.                                                                                             | Covered in `server/app.test.ts`                                                  |
| A3  | Second user attempts `PUT` to first user’s note id — expect **403**.                                                                                                 | Covered in `server/app.test.ts`                                                  |
| A4  | Unauthenticated `PUT` / `GET` / `DELETE` — expect **401**.                                                                                                           | Covered in `server/app.test.ts`                                                  |
| A5  | DELETE removes a note; re-delete returns 404; cross-user delete returns 404.                                                                                         | Covered in `server/app.test.ts`                                                  |
| A6  | Malformed PUT payload (wrong version, missing fields, garbage) — expect **400**.                                                                                     | Covered in `server/app.test.ts`                                                  |


**Requirements and stories**


| Artifact             | IDs                                | Relevance                                                   |
| -------------------- | ---------------------------------- | ----------------------------------------------------------- |
| Refined requirements | **FR6-S**, **Sec 1**               | Opaque ciphertext at rest; decryption client-side           |
| Refined requirements | **FR1** (persistence slice)        | Saved note survives list fetch                              |
| User stories         | **US-5** (acceptance criteria 1–3) | Ciphertext on server; no plaintext from API; cross-user 403 |
| User stories         | **US-1** (acceptance criterion 6)  | Automated server path for authorization scope               |


**Level:** **Integration** (Express app + SQLite + supertest + cookie jar; uses real crypto in-process).

**When it typically runs:** **Every push / CI** (`npm run test`) and locally when touching `server/app.ts`, routes, or DB schema. Runs in **seconds**; ideal for pre-commit if you run the full suite or `npx vitest run server/app.test.ts`.

---

### Test set B — Client: search helpers (title + body, query rules)

**Intent:** Lock **FR2a** behavior for `clampSearchQuery`, `noteMatchesSearch`, and `collectAllTags` in `[src/search/noteSearch.ts](src/search/noteSearch.ts)` without spinning up the API or React.


| #   | Test outline                                                                                               | Status                                              |
| --- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| B1  | Empty or whitespace-only query → all notes match (`noteMatchesSearch`).                                    | Covered in `src/search/noteSearch.test.ts`          |
| B2  | Case-insensitive substring match on **title** and on **primary Markdown body**.                            | Covered in `src/search/noteSearch.test.ts`          |
| B3  | Query longer than **500** characters is clamped (`MAX_SEARCH_QUERY_LENGTH`); matching uses clamped string. | Covered in `src/search/noteSearch.test.ts`          |
| B4  | Unicode / simple punctuation in query and in note text — no throw; sensible match behavior.                | Covered in `src/search/noteSearch.test.ts`          |
| B5  | `collectAllTags` — dedupes, sorts, empty notes → `[]`.                                                     | Covered in `src/search/noteSearch.test.ts`          |


**Requirements and stories**


| Artifact             | IDs                                    | Relevance                                             |
| -------------------- | -------------------------------------- | ----------------------------------------------------- |
| Refined requirements | **FR2a**                               | Client-side text search; empty query; length limit    |
| User stories         | **US-3** (acceptance criteria 1, 3, 4) | Filter by title/body; empty query; special characters |


**Level:** **Unit** (pure functions + `Note` fixtures; no DOM required unless you prefer testing through a thin wrapper).

**When it typically runs:** **Every push / CI** alongside other unit tests; `**npm run test:watch`** while editing `noteSearch.ts` or note type helpers. Fast feedback during **FR2a** or sidebar work.

---

## Test level reference


| Level             | What it proves                                             | Examples in this repo                                                                                                                                                                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**          | Single module behavior, determinism, edge cases            | `[src/crypto/vault.test.ts](src/crypto/vault.test.ts)`, `[src/types/tags.test.ts](src/types/tags.test.ts)`, `[src/search/noteSearch.test.ts](src/search/noteSearch.test.ts)`, `[src/notes/notesViewState.test.ts](src/notes/notesViewState.test.ts)`                                                                  |
| **Integration**   | Multiple real components: HTTP + DB + auth + crypto wiring | `[server/app.test.ts](server/app.test.ts)`                                                                                                                                                                                                             |
| **Feature / E2E** | Full user journey in a browser (sessions, Web Crypto, UI)  | Manual QA from user stories; optional Playwright later for register → unlock → edit → autosave                                                                                                                                                                                                                         |
| **Component**     | React component render + interaction                       | `[src/components/BlockPreview.test.tsx](src/components/BlockPreview.test.tsx)`, `[src/components/NoteEditor.test.tsx](src/components/NoteEditor.test.tsx)`                                                                                                                                                            |
| **Codec**         | Crypto wire format encode/decode with real Vault           | `[src/api/noteWireCodec.test.ts](src/api/noteWireCodec.test.ts)`                                                                                                                                                                                                                                                      |


---

## When tests run during development


| Moment                        | Scope                                                                  | Rationale                                                                          |
| ----------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **While coding**              | `npm run test:watch` on the files you touch                            | Tight loop; catches regressions before commit                                      |
| **Before commit / PR**        | `npm run test` + `npm run typecheck`                                   | Matches release gate in `[AGENTS.md](AGENTS.md)`; typecheck blocks `npm run build` |
| **CI pipeline**               | Full Vitest suite (client `jsdom` + server `node`)                     | Same as local `npm run test`                                                       |
| **Release / manual sign-off** | Story acceptance checks (e.g. US-1 autosave states, US-3 search in UI) | Automate incrementally with RTL or E2E where ROI is clear                          |


---

### Test set C — Scroll position persistence per note

**FR:** FR1 (UX: "pick up where you left off")
**Level:** Component (RTL) — `[src/components/NoteEditor.test.tsx](src/components/NoteEditor.test.tsx)`

| #   | Test outline | Status |
| --- | ------------ | ------ |
| C1  | Restores saved textarea `scrollTop` on mount when a position is stored. | Covered |
| C2  | Leaves `scrollTop` at 0 when no saved position exists. | Covered |
| C3  | Saves textarea `scrollTop` to context on scroll event. | Covered |

**Implementation:** `NoteScrollPositions` stored in a `Map<string, { textarea, preview }>` inside `NotesContext` via `noteScrollPositionsRef`. `NoteEditor` reads on mount via `useEffect` and writes on each scroll event. The Map survives React remounts (keyed by `note.id` in `App.tsx`).

## Coverage gap notes (for later planning)

- **US-1 AC 2–5** (debounced autosave UI, archive, delete confirm): strong candidates for **React Testing Library** on `NotesContext` / `NoteEditor` with fake timers, or E2E if flakiness stays low.
- **US-5** session refresh + **UnlockScreen**: Web Crypto in `jsdom` is already configured; component tests can assert error codes and successful `resumeSessionAndUnlock` flows with mocked `fetch` if needed.
- **FR7 / US-6** export/import: `[src/vault/exportFormat.test.ts](src/vault/exportFormat.test.ts)` already unit-tests format rules; add integration only if import hits the API.
- **`getSelectedVisibleNote`** in `notesViewState.ts` now has basic coverage but the selection reconciliation logic (hidden note → fallback to first visible → null) is exercised through `getSelectedVisibleNoteId`.
- **API client layer** (`authApi.ts`, `notesRepository.ts`, `httpClient.ts`, `vaultSession.ts`) still has zero test coverage — error mapping, network retry, session expiry handling are untested.
- **React contexts** (`AuthContext`, `NotesContext`, `ThemeContext`) and most UI screens (`AuthScreen`, `UnlockScreen`, `Sidebar`, `NoteEditor`) have no component tests.

---
## How AI Helped

The AI Agent was very helpful aligning the tests to the current design plan and project scope, requiring only small adjustments to the priorities and expected outputs. This was particularly helpful since, in the definition of done, there was already a separation between unit, integration, and full tests, so many of the developments already had that testing in mind. Additionally, AI was helpful at flagging gaps for future test planning.

---
*Last aligned with repo layout and requirements as of the current `main`-style baseline; update traceability tables if FR/US IDs change.*