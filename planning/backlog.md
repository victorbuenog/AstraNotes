# Prioritized backlog (early)

**Status note (2026):** Many **P0/P1** items (encryption/isolation, autosave, Markdown, **search**, **tags**, **export/import**, plugin doc) are **implemented** in the current codebase; this backlog remains for **ordering**, **icebox** ideas, and **future** work (voice, scale, sync). See [`refined_requirements.md`](./refined_requirements.md) and root [`README.md`](../README.md).

Items are ordered **top to bottom** within each priority band. IDs match `planning/user-stories.md`.

## P0 — Must have for a coherent “secure notes” MVP


| Order | ID    | Item                                   | Notes                                                                              |
| ----- | ----- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| 1     | US-5  | **Encryption + user isolation**        | Hardening, tests, README threat model; aligns with existing architecture.          |
| 2     | US-1  | **Reliable Markdown notes + autosave** | Close gaps vs acceptance criteria; **archive** (reversible, archive view) vs **delete permanently** (DB row removed, irreversible) are defined in requirements and stories. |
| 3     | US-2 | **Markdown preview toggle**            | High UX value; dependency-light.                                                   |


## P1 — Next milestone (usable at growing note count)


| Order | ID   | Item                | Notes                                                               |
| ----- | ---- | ------------------- | ------------------------------------------------------------------- |
| 4     | US-3 | **Search**          | Start with title + body; index strategy TBD (SQLite FTS vs client). |
| 5     | US-4 | **Tags or folders** | **Recommendation:** tags first (smaller schema change).             |
| 6     | US-6 | **Export / import** | Unblocks backup and future sync; define format v1.                  |


## P2 — Foundation for plugins and scale


| Order | ID   | Item                      | Notes                                         |
| ----- | ---- | ------------------------- | --------------------------------------------- |
| 7     | US-7 | **Plugin-ready boundary** | Doc + types + refactors; no Voice plugin yet. |


## Icebox (valuable, not early baseline)


| Item                         | Initial req refs | When to pull in                                           |
| ---------------------------- | ---------------- | --------------------------------------------------------- |
| Voice record/playback        | FR5              | After US-7 and stable media block storage.                |
| 10k notes, sub-500 ms search | FR2, NFR1        | After search exists + representative dataset + profiling. |
| Offline-first + sync         | FR8              | After export/import and conflict policy.                  |
| Full plugin sandbox          | Sec 2            | After plugin API is used by a second note type.           |
| Audit/governance UI          | Sec 4            | After server-side security event logging exists.          |
| Automated integrity backups  | Sec 3            | After export + ops runbook.                               |


## Definition of Ready (for pulling into a sprint)

- Story maps to a **user story** with acceptance criteria.
- **API/schema** impacts noted if any.
- **Security/privacy** impact called out when touching auth, crypto, or storage.

## Definition of Done (backlog item)

See `planning/Definition of Done.md` and team working agreement; backlog items close when acceptance criteria are met and docs/tests updated as required.