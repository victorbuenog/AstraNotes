# Planning and project glossary

Short definitions for acronyms and shorthand used in `planning/*.md`, `LOG.md`, and project READMEs.

## Planning and process

| Term | Meaning |
| --- | --- |
| **FR** | **Functional requirement** — what the system must do (numbered in `Initial Requirements.md`: FR1, FR2, …). |
| **NFR** | **Non-functional requirement** — qualities such as performance, platforms, extensibility (NFR1, NFR2, …). |
| **Sec** | **Security, privacy, reliability, governance** section in `Initial Requirements.md` (Sec 1, Sec 2, …). Section label used for traceability, not a universal industry acronym. |
| **US** / **US-1**, **US-2**, … | **User story** identifiers in `user-stories.md` and `backlog.md`. |
| **P0, P1, P2** | **Priority bands**: P0 = must-have first, P1 = next milestone, P2 = later foundation work. |
| **MVP** | **Minimum viable product** — smallest version that still delivers core value. |
| **Sprint Zero** | Short initial sprint for alignment, audits, and spikes rather than large feature drops. |
| **Spike** | Time-boxed research or experiment to answer a technical question before committing to implementation. |
| **ADR** | **Architecture decision record** — brief document capturing an important technical choice and rationale. |
| **DoR** | **Definition of ready** — when a backlog item is clear enough to pull into a sprint. |
| **DoD** | **Definition of done** — when work is truly complete (see `Definition of Done.md`). |
| **CI** | **Continuous integration** — automated build and test on each change (e.g. “CI green”). |

## Stack and product

| Term | Meaning |
| --- | --- |
| **Docker** | **Container platform** — packages the app’s **Linux** runtime so **native Node addons** (e.g. `better-sqlite3`) build consistently on Mac and Windows dev machines. This repo includes a `Dockerfile` and `docker-compose.yml` (optional). |
| **Docker Compose** | Tool to run multi-service stacks from **`docker-compose.yml`**; here, one service runs **Vite + API** for development. |
| **Dev Container** | VS Code / Cursor feature to open the repo **inside** a container; configured under **`.devcontainer/`**. |
| **WAL** | **Write-ahead log** — SQLite journal mode; fast on **local disks** but **not reliable on network filesystems** (SMB/NAS); the API may use **DELETE** journal mode instead on those paths. |
| **SPA** | **Single-page application** — one loaded page with client-side navigation (React + Vite UI). |
| **API** | **Application programming interface** — here, mostly HTTP routes on the Express server (`/api/...`). |
| **UX** | **User experience** — flows, feedback, and clarity of the interface. |
| **CRUD** | **Create, read, update, delete** — basic data lifecycle (often for notes). |
| **Archive (verb)** | Mark a note **archived**: it is **hidden** from the main note list but **remains in the database**; the user can open it from an **archive** view and **unarchive** to return it to the main list (**reversible**). |
| **Delete permanently** | Remove a note row from the database (e.g. HTTP `DELETE`); **not** recoverable through the app (**irreversible**). Distinct from **archive**. |
| **SQLite** | Embedded relational database engine (`astranotes.db`). |
| **FTS** | **Full-text search** — indexed text search (e.g. SQLite FTS). |
| **JSON** | **JavaScript Object Notation** — text format for API payloads and export files. |
| **GFM** | **GitHub-flavored Markdown** — Markdown extensions (tables, task lists, etc.). |

## Security and crypto

| Term | Meaning |
| --- | --- |
| **AES-GCM** | **Advanced Encryption Standard** in **Galois/Counter Mode** — symmetric encryption with authentication (integrity). |
| **PBKDF2** | **Password-based key derivation function 2** — derives keys from passwords and slows brute-force guessing. |
| **HTTP** / **HTTPS** | **Hypertext Transfer Protocol**; **HTTPS** adds TLS encryption on the wire. |
| **403** | HTTP **Forbidden** — request understood but not allowed (e.g. another user’s note). |
| **GET**, **POST**, **PUT**, **PATCH** | Common **HTTP methods** for read, create/replace-style writes, update, and partial update. |

## Deferred / advanced (requirements text)

| Term | Meaning |
| --- | --- |
| **CRDT** | **Conflict-free replicated data type** — structure designed so copies can merge edits without manual conflict resolution; sometimes used for sync. |

## Related planning files

- `requirements.md` — early baseline and traceability to FR / NFR / Sec.
- `user-stories.md` — US-* stories and acceptance criteria.
- `backlog.md` — prioritized work and icebox.
- `sprint-zero-plan.md` — first sprint focus and spikes.
- `Initial Requirements.md` — source FR / NFR / Sec numbering.
