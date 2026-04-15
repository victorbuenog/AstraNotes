# AstraNotes — planning baseline (early)

This document distills the **Initial Requirements** into a **practical near-term baseline** for the current stack (React + Vite client, Express + SQLite API, session-scoped users, client-side encryption). It is not a full specification; it sets **what “good enough for the next phase” means**.

**Implementation:** the live app tracks this baseline and [`refined_requirements.md`](./refined_requirements.md); source of truth for commands and layout is the repository **[README](../README.md)** at `https://github.com/victorbuenog/AstraNotes`.

## Product intent

AstraNotes is a **local-first–friendly, multi-user** note app where **note bodies are not readable on the server** (encrypted payload), users get a **fast, minimal** editing experience with **Markdown**, and the **data model** can grow toward **plugins**, **search at scale**, and **portability** without rewrites.

### Note lifecycle: archive vs delete

- **Archive:** Hides the note from the **main** list; the note **remains stored**. The user can view archived notes (e.g. **Show archived**) and **unarchive** to bring a note back (**reversible**).
- **Delete permanently:** Removes the note **from the database**; there is **no** in-app recovery (**irreversible**). The UI should confirm before executing.

## Early baseline — selected requirements

These items are **in scope for planning** until the first major milestone after Sprint Zero. They map to the numbered requirements in `Initial Requirements.md`.

| Priority | Theme | Initial req refs | Rationale |
| --- | --- | --- | --- |
| P0 | **Notes lifecycle + autosave** | FR1, NFR1 (latency intent) | Core value; must be reliable before layering search/plugins. |
| P0 | **Markdown edit + preview** | FR3 | Expected UX for Markdown notes; reduces format errors. |
| P0 | **Encryption & isolation** | Sec 1, FR6 (intent) | Aligns with “only the user can access their notes”; server stores ciphertext; sessions scope data. |
| P1 | **Find notes (search)** | FR2 (subset) | Unlocks usability before 10k-note scale work; full 500 ms @ 10k is a **later** performance target. |
| P1 | **Light organization** | FR2 (tags *or* folders/notebooks) | Needed before “thousands of notes”; start with one mechanism (e.g. tags) to limit scope. |
| P1 | **Export / import** | FR7 | Backup and portability; supports course/demo needs and future sync. |
| P2 | **Plugin-ready boundary** | FR4, NFR3 | Documented extension surface so Voice / Secure variants do not require core rewrites. |

## Explicitly deferred (still valid, not baseline)

- **Voice plugin** (FR5): after plugin boundary and stable note model.
- **10k-note / 500 ms search** (FR2, NFR1): target for a dedicated performance iteration once schema and indexing exist.
- **Conflict-free sync** (FR8): optional; depends on export/import and clear versioning story.
- **Full plugin sandbox** (Sec 2): staged; start with **API contracts and least privilege by design**, not a full sandbox runtime.
- **Periodic backups + integrity hashes** (Sec 3): can begin with **export** + optional **server-side backup** runbook; automated integrity passes later.
- **Audit log UI** (Sec 4): log **security-relevant** server events first (e.g. auth failures); rich governance UI later.

## Quality bar (early)

- **Security:** No cross-user note access; ciphertext on wire/storage for note bodies; keys not persisted in plaintext (see current vault design).
- **UX:** Clear errors (with codes), autosave feedback, accessible theme toggle and core flows.
- **Testability:** Automated tests for crypto, API auth/isolation, and critical client flows where feasible.
- **Docs:** README + LOG updated when behavior or contracts change (per working agreement).

## Traceability

Detailed acceptance criteria and backlog ordering live in:

- `planning/user-stories.md`
- `planning/backlog.md`
- `planning/sprint-zero-plan.md`
