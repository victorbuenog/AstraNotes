---
aliases:
  - Software Design Document
  - SDD
tags:
  - astranotes
  - planning
  - design
  - architecture
---

# AstraNotes — Software Design Document

> [!info] Related notes
> Home: [[README]]
> Requirement and traceability context: [[prd]] · [[refined_requirements]] · [[uml_traceability_validation]]
> Governance and review: [[governance_ethics_memo]] · [[architecture-review]]
> Supporting references: [[LOG]] · [[Definition of Done]]

| Field | Value |
| --- | --- |
| **Version** | 1.0 |
| **Date** | 2026-04-29 |
| **Status** | Baseline for implementation planning |
| **Primary artifacts** | Lucid UML package (see `scripts/astranotes-uml-lucid-import.json`), traceability validation, governance memo, repository architecture |

## Related documents

| Document | Path | Role |
| --- | --- | --- |
| UML traceability validation | [[uml_traceability_validation]] | Requirements-to-UML matrix and gap metrics |
| Governance and ethics | [[governance_ethics_memo]] | Privacy, PII, AI, licensing expectations |
| Agent / developer runbook | `AGENTS.md` | Stack, commands, testing, operational constraints |
| Lucid UML import (source of diagram content) | `scripts/astranotes-uml-lucid-import.json` | Machine-readable UML package used for validation |

---

## 1. Executive summary

AstraNotes is a **browser-based secure notes application** with a **React single-page application (SPA)**, an **Express REST API**, and **SQLite** persistence. Note bodies are **encrypted in the client** using Web Crypto (PBKDF2 + AES-GCM); the server stores **opaque ciphertext** and authenticates users via **HTTP-only session cookies**.

The **Lucid UML design package** (rationale, class, object, use case, activity, deployment) is **coherent and well aligned** with the highest-priority security requirement (**FR6-S**: ciphertext at rest on server, decryption only on client, session-bound access). The model **moderately** supports implementation planning for **core encrypted create-read-update and autosave**; several functional and non-functional areas remain **partially specified**, **weakly traced**, or **intentionally scoped** until behavioral specs, platform strategy, or export/import contracts are completed.

---

## 2. Purpose and scope of this document

### 2.1 Purpose

This software design document (SDD):

- Records the **intended architecture** and **trust boundaries** for AstraNotes.
- Maps **baseline requirements** to **UML views** (structural, behavioral, deployment) and to the **implemented stack** described in `AGENTS.md`.
- States **traceability status** and **known gaps** so implementers and reviewers can prioritize work and acceptance criteria.

### 2.2 In scope

- Logical structure of client and server domains relevant to notes and encryption.
- Primary user-visible capabilities reflected in use cases and the autosave activity.
- Self-hosted deployment pattern (browser, Node/Express, SQLite).
- Security posture for note payloads, sessions, and stakeholder governance themes.

### 2.3 Out of scope (unless later added by amendment)

- Legal opinions, formal DPIA, or institutional compliance sign-off (see governance memo).
- Detailed UI mockups beyond what UML behavior implies.
- Multi-region high availability, horizontal scaling, or non-SQLite persistence (not part of the current deployment model).

---

## 3. System overview

### 3.1 Context

**Actors:** A student or operator using a standards-compliant browser.

**System boundary:** “AstraNotes” as modeled is a **React SPA plus REST API** behind a single logical origin in production (HTTPS).

**Data sensitivity:** Notes may include academic or personal content; design assumes **minimization of server-side readability** of note bodies and **user control** over export.

### 3.2 High-level architecture (implementation)

The following is the authoritative **as-built / as-targeted** stack summary from `AGENTS.md`:

| Layer | Technology | Entry / notes |
| --- | --- | --- |
| Client | React 19, Vite 6 | `src/main.tsx` → `App.tsx` |
| API | Express, better-sqlite3 | `server/index.ts`, `server/app.ts` |
| Dev transport | Vite proxy | `/api` → `http://127.0.0.1:3001` |
| Authentication | express-session | HTTP-only cookie `astranotes.sid`; `fetch` with `credentials: 'include'` |
| Note encryption | Web Crypto in client | PBKDF2 + AES-GCM in `src/crypto/vault.ts` |
| Database | SQLite | Default `data/astranotes.db`; `ASTRANOTES_DB_PATH`; WAL on local disk, DELETE journal fallback on network filesystems |

**Production Docker:** SPA and API are served together; default port **4173**; `SESSION_SECRET` required in production.

**Operational constraint:** `crypto.subtle` requires a **secure context**; non-localhost **HTTP** (e.g., LAN without TLS) is incompatible with the current encryption design—**HTTPS** (or localhost) is assumed for real use.

---

## 4. UML design package

The Lucid package (import JSON) is organized for **read order** and **view consistency**:

| Page order | Title | View type | Summary |
| --- | --- | --- | --- |
| 0 | Rationale | Narrative | Explains how the package now closes the major traceability gaps for notes lifecycle, preview semantics, import/export validation, and cross-platform delivery. |
| 1 | Class diagram | Structural | Client: `Note`, `NoteDocument`, `NoteBlock` hierarchy, `EditorSession`, `Vault`, `VaultExportFile`. Server: `UserAccount`, `EncryptedNoteRow`. |
| 2 | Object diagram | Structural (instance) | Snapshot: `u1`, `n1`, `doc1`, `b1`, `sess1`, `v`, `row1`, `exp1`; caption states **plaintext only in browser memory** until explicit export. |
| 3 | Use case diagram | Behavioral | Actor: student/operator. Use cases now make archive/restore, permanent delete, preview, export/import, validation, and idempotent upsert explicit. |
| 4 | Activity diagram (edit / preview / autosave) | Behavioral | Edit → preview from current draft → debounce → vault unlocked? → serialize/encrypt/PUT → saved or error banner. |
| 5 | Activity diagram (vault import validation) | Behavioral | Pick JSON → parse → validate `formatVersion` + note schema → confirm replacement policy → save/upsert notes → reload or error. |
| 6 | Deployment + platform delivery | Physical | Windows / macOS / Linux browsers ↔ shared Node 22 + Express origin ↔ SQLite, with Docker / Dev Container noted as an optional common maintainer runtime. |

---

## 5. Structural design

### 5.1 Client domain

- **`Note`:** Identifier, `title`, `tags[]`, `archived`, `createdAt`, `updatedAt`.
- **`NoteDocument`:** `version`, `blocks: NoteBlock[]` (composition under `Note`).
- **`NoteBlock` (abstract):** Block identity; generalized by **`MarkdownBlock`** (`text`) and **`ImageBlock`** (`ref`, optional `alt`).
- **`EditorSession`:** UI state for one note editor instance: Write / Split / Read mode, draft text, split ratio, and save feedback (`saving`, `lastSavedAt`).
- **`Vault`:** Optional `CryptoKey`; `unlock(pass, meta)`, `lock()`, `encrypt(plain)`, `decrypt(ivB64, ctB64)`—association from `Note` for encrypt/decrypt of serialized note JSON.
- **`VaultExportFile`:** Versioned plaintext interchange contract: `formatVersion`, `exportedAt`, `app`, and `notes[]`; used to model validated import/export behavior.

**Implementation mapping (UML annotations):** client types and crypto align with `src/types`, `src/crypto/vault.ts`; editor/session semantics align with `src/components/NoteEditor.tsx`; export/import contract aligns with `src/vault/exportFormat.ts`.

### 5.2 Server persistence

- **`UserAccount`:** `id`, `username`, `passwordHash`, optional `encryptionMeta` (vault metadata).
- **`EncryptedNoteRow`:** UUID `id`, `userId`, `payload` (JSON **v2** ciphertext envelope), `updatedAt`; aggregated under `UserAccount` (1..*).

**Implementation mapping:** `server/db.ts`, `server/app.ts`.

### 5.3 Structural support for requirements

| Requirement | Structural contribution |
| --- | --- |
| **FR1** | Composed note aggregate plus `EditorSession` define what is edited, saved, archived, restored, and deleted. |
| **FR2b** | `Note.tags` models tag persistence. |
| **FR3** | `EditorSession.mode` and `draftMarkdown` make Write / Split / Read preview state explicit. |
| **FR7** | `VaultExportFile` gives versioned import/export a named structural contract instead of a label-only use case. |
| **FR4** | `NoteBlock` hierarchy defines extension locus for new block types. |
| **FR6-S** | Separation of `Vault` from `EncryptedNoteRow.payload` encodes ciphertext-on-server, keys-in-client. |

---

## 6. Behavioral design

### 6.1 Use cases

| Use case | Notes |
| --- | --- |
| Register or log in | Account lifecycle. |
| Unlock encrypted vault | Preconditions encryption/autosave/import path. |
| Browse, search, filter tags | Discovery; see traceability for search semantics gaps. |
| Write markdown note | Primary editing capability. |
| Preview note (Split / Read) | Makes unsaved-draft preview behavior explicit. |
| Autosave encrypted note | **Includes** relationship from writing. |
| Archive or restore note | Models reversible hide/show behavior. |
| Delete note permanently | Models irreversible remove-from-DB behavior. |
| Confirm irreversible delete | Included by permanent delete. |
| Export vault JSON | Includes plaintext warning acknowledgement. |
| Import vault JSON | Includes validation and idempotent upsert behavior. |

### 6.2 Activity: edit / preview / autosave

1. Start → edit title/tags/markdown.
2. Preview re-renders from the **current in-memory draft** (Write / Split / Read semantics explicit).
3. Wait for debounce (NotesContext).
4. Decision: **Vault unlocked?** If no → skip save until unlock → end. If yes → continue.
5. Serialize note, **Vault.encrypt**, **PUT `/api/notes/:id`** with session cookie.
6. Decision: **HTTP 204 OK?** If yes → update `lastSavedAt` / saved pill. If no → show **ErrorBanner**.
7. End.

### 6.3 Activity: vault import validation

1. Pick JSON file from Settings.
2. Parse JSON text.
3. Decision: `formatVersion = 1`, `app = "astranotes"`, and `notes[]` valid? If no → show **Import failed** modal → end.
4. Confirm import policy: replace same ids, keep others unchanged.
5. For each note: `migrateNoteShape(note)` → `api.saveNote(vault, note)` (upsert by id).
6. Decision: save succeeded? If no → show **ErrorBanner** / session-ended message. If yes → continue loop or reload.
7. Reload notes; end.

### 6.3 Behavioral support for requirements

| Requirement | Behavioral contribution |
| --- | --- |
| **FR1** | Write, archive/restore, delete, confirm-delete, and autosave use cases make the notes lifecycle explicit. |
| **FR2a/b** | Use case names browse/search/tags; does not specify query grammar. |
| **FR3** | Preview use case and edit/preview/autosave activity define Write / Split / Read semantics and draft safety. |
| **FR6-S** | Unlock vault + encrypt-on-PUT path with cookie models **authenticated encrypted wire** behavior. |
| **FR7** | Export/import, confirmation, validation, and upsert behavior are modeled in both use cases and the import activity. |

---

## 7. Deployment design

### 7.1 Production pattern (UML)

- **Windows user device:** Browser running the React SPA with Web Crypto and same-origin `fetch` with credentials.
- **macOS user device:** Same browser-delivered SPA and behavior surface.
- **Linux user device:** Same browser-delivered SPA and behavior surface.
- **Docker host:** Node.js 22, Express (`server/app.ts`): `express-session`, bcrypt, serves `dist/` and REST `/api/*`.
- **SQLite:** Users and notes (ciphertext) via `better-sqlite3`.

**Caption:** Single HTTPS origin serves UI and API; production **PORT** defaults to **4173** in Dockerfile (aligned with `AGENTS.md`).

### 7.2 Development pattern

- Vite dev server (e.g., **5173**) and API (**3001**); note in UML deployment note on dev vs prod.

### 7.3 Intentional deployment scope

- **Single-node** self-hosting; no UML for clustering, read replicas, or external identity providers.
- **NFR2** is traced via named browser delivery on **Windows / macOS / Linux**; native packaging is still out of model because the current product constraint is satisfied by the shared web runtime.
- **Maintainer runtime note:** Docker / Dev Container is documented as an optional common Linux environment for Mac and Windows developers, not as the end-user delivery path.

---

## 8. Security and trust model

### 8.1 FR6-S (design centerpiece)

**Requirement (paraphrased):** Server stores ciphertext; client decrypts; cross-user access is denied.

**Evidence:**

- **Structural:** `Vault.encrypt/decrypt`; `EncryptedNoteRow.payload` as ciphertext; object caption on plaintext-in-browser-only.
- **Behavioral:** Unlock vault; activity encrypt + `PUT` with cookie.
- **Deployment:** Web Crypto in browser; session auth; SQLite rows hold ciphertext.

**Residual (governance):** Operators with filesystem or raw DB access can read **ciphertext and metadata**; client-side encryption **reduces** routine server readability of bodies but does **not** remove operational risk—**access control, backup policy, and logging discipline** remain necessary.

### 8.2 Session and API

- Session-bound identity: endpoints returning or mutating note payloads must enforce **`user_id` matches session** and resist **ID guessing** (behavior diagrams do not show explicit `403` alternate flows; implement and test explicitly).

### 8.3 Governance alignment (summary)

Principles from [[governance_ethics_memo]] that constrain design:

1. **Data minimization** — retain only what is needed.
2. **User sovereignty** — export and meaningful consent before automated or human review of note content (where applicable).
3. **Defense in depth** — encryption plus policy plus access control.
4. **No misuse of AI** — no automation aimed at breaking encryption or bypassing auth on user data.

**Stakeholder-derived implementation themes:** user-initiated export with plaintext-equivalent warnings; password hashing (e.g., bcrypt); structured logging without bodies; SBOM/license awareness; default **no training on user notes** if AI features are introduced without explicit opt-in.

**Explicit non-completion in governance doc:** not a substitute for legal counsel or formal DPIA; consent+redaction workflow and legacy plaintext migration are **decisions to document** when applicable.

---

## 9. Requirements traceability

### 9.1 Matrix (baseline vs UML evidence)

The table below reproduces the validated traceability from [[uml_traceability_validation]].

| Requirement ID | Requirement | Class/Object evidence | Use case / activity evidence | Deployment evidence | Status | Gap note |
| --- | --- | --- | --- | --- | --- | --- |
| FR1 | Create/read/update Markdown notes with autosave, archive/unarchive, permanent delete | `Note` (`title`, `archived`, `updatedAt`); `EditorSession`; snapshot `n1/doc1/b1/sess1` | `Write markdown note`; `Archive or restore note`; `Delete note permanently`; `Autosave encrypted note`; confirm-delete use case; edit/autosave activity | SPA → Express → SQLite | **Fully traced** | Delete-confirmation skip preference is UI detail, but the baseline notes lifecycle is explicit |
| FR2a | Search by text with defined empty-query behavior | `Note.title`, body in `MarkdownBlock.text` imply search fields | `Browse, search, filter tags` | Same-origin implies execution locus, not semantics | **Partially traced** | Empty query, special characters, title vs body scope not specified |
| FR2b | Tag organization and filtering | `Note.tags`; object example tags | `filter tags` | No special deployment constraint | **Fully traced** | Tag normalization (case, duplicates, limits) not in diagrams |
| FR3 | Toggle/split Markdown preview without losing unsaved work | `EditorSession.mode`, `draftMarkdown`; snapshot `sess1`; `MarkdownBlock` / `NoteDocument` remain the source model | `Preview note (Split / Read)`; edit/preview/autosave activity re-renders preview from current draft | SPA in browser on Windows / macOS / Linux | **Fully traced** | Link/image security policy remains documented outside UML, but draft-safe preview semantics are explicit |
| FR6-S | Server ciphertext; client decrypt; deny cross-user access | `Vault`; `EncryptedNoteRow.payload`; plaintext-in-browser caption | Unlock vault; encrypt + PUT with cookie | Web Crypto, session, SQLite ciphertext | **Fully traced** | `403` / cross-user denial implied, not drawn as alternate flow |
| FR7 | Versioned export/import with validation and idempotency | `VaultExportFile`; snapshot `exp1` | `Export vault JSON`; `Import vault JSON`; `Confirm plaintext warning`; `Validate formatVersion + note schema`; `Upsert same ids; keep others`; import activity | Browser -> API -> SQLite upsert path | **Fully traced** | Alternate strategies beyond upsert-by-id are intentionally out of scope |
| FR4 | Stable extension model for note types/blocks | `abstract NoteBlock`; `MarkdownBlock`, `ImageBlock` | No extension/plugin workflow | No plugin sandbox in deployment | **Partially traced** | Runtime contracts for extensions not modeled |
| NFR2 | Consistent across ≥ three platforms | Browser-centric client model is portable across the shared runtime | Same user-visible flows apply regardless of OS | Deployment names Windows, macOS, Linux browser delivery; Docker / Dev Container documented for maintainers | **Fully traced** | Native packaging remains out of model, but named three-platform browser delivery satisfies the refined requirement |

### 9.2 Traceability metrics

| Metric | Count |
| --- | ---: |
| Requirements reviewed | 8 |
| Fully traced | 6 |
| Partially traced | 2 |
| Weakly traced | 0 |
| Not traced | 0 |
| UML element without prioritized requirement | 0 |

### 9.3 Readiness assessment

- **Strong:** Notes lifecycle (**FR1**), preview semantics (**FR3**), secure persistence (**FR6-S**), import/export contract (**FR7**), and cross-platform delivery (**NFR2**).
- **Still open:** **FR2a** search semantics and **FR4** extension/runtime contracts remain only partially modeled.
- **Overall:** **High** readiness—suitable for planning current encrypted CRUD, preview, import/export, and platform-parity acceptance tests without major supplemental UML.

---

## 10. Known gaps, weaknesses, and intentional scope

### 10.1 Partial specification

| Area | Issue |
| --- | --- |
| FR2a | Search use case only; empty query, escaping, scope rules open |
| FR2b | Normalization and limits for tags open |
| FR4 | Extension structure present; lifecycle, schema versioning, sandbox not defined |
| FR6-S | Explicit forbidden-access / wrong-user flows not diagrammed |

### 10.2 Weak or missing traceability

| Area | Issue |
| --- | --- |
| FR2a | Search semantics still rely on external prose, not explicit behavioral branches |
| FR4 | Plugin lifecycle, schema-version governance, and sandbox/runtime boundary remain outside UML |
| FR6-S | Explicit forbidden-access (`403`) alternate flow is still implicit rather than diagrammed |

### 10.3 Intentional architectural scope (narrowing)

- Monolithic **SPA + API + SQLite** on one host.
- **Client-side** encryption for note payloads; server cannot implement “server reads plaintext body” features without redesign.
- **Cookie-based** sessions; no OAuth/OIDC in the UML package.
- **Single-tenant self-host** deployment diagram; no HA story.
- **Web Crypto** secure-context requirement drives HTTPS for non-localhost deployments.

### 10.4 Governance and operations (design-adjacent)

- Formal **DPIA** / privacy officer review deferred unless regulated context applies.
- **Backup encryption**, log retention, and support access procedures are **directional** in memo, not detailed runbooks in this SDD.

---

## 11. Architecture decisions

The following records major decisions implied by UML, code layout, and governance.

| ID | Decision | Context | Consequences |
| --- | --- | --- | --- |
| ADR-1 | Client-side encryption for note bodies | User trust; limit server readability | Web Crypto vault; export files are plaintext-equivalent; server cannot search inside ciphertext without new design |
| ADR-2 | Express session cookie (`astranotes.sid`) | Same-origin SPA simplicity | `credentials: 'include'` everywhere; CSRF and cookie flags must follow deployment hardening guides |
| ADR-3 | SQLite embedded database | Self-hosted simplicity | WAL vs DELETE on network FS; single-writer scaling limits |
| ADR-4 | Single process serves SPA + API in production Docker | One origin, simpler ops | Port 4173 default; `SESSION_SECRET` mandatory in prod |
| ADR-5 | TypeScript split configs (app, server, node) | Clear client/server boundaries | `npm run typecheck` covers both |
| ADR-6 | User-initiated export; no silent admin plaintext export | Governance principle | Product and ops procedures must align |

---

## 12. Verification and quality

From `AGENTS.md`:

- **Client tests:** Vitest in jsdom; `src/test/setup.ts` with fake IndexedDB and Testing Library matchers.
- **Server tests:** Node environment; `supertest` with `request.agent(app)` and temporary DB under `os.tmpdir()`.
- **Security-relevant assertion pattern:** API tests should assert **ciphertext** in DB responses, not plaintext titles, where applicable.

**Design implication:** acceptance tests for **FR6-S** and autosave should follow the **activity diagram** branches (vault closed, 204, non-204). Additional suites are required for gaps (FR1 archive/delete, FR7 import, FR3 preview) once specified.

---

## 13. Maintenance

When requirements or implementation change:

1. Update the **Lucid** (or authoritative diagram source) and regenerate or export `scripts/astranotes-uml-lucid-import.json` if that file remains the canonical interchange.
2. Re-run **traceability validation** and update [[uml_traceability_validation]].
3. Amend this SDD **version** and **date**; summarize deltas in a short change log section (future revision) or commit message convention.

---

## Appendix A — Glossary

| Term | Definition |
| --- | --- |
| Ciphertext | Encrypted note payload stored in `EncryptedNoteRow.payload` (JSON envelope with IV and ciphertext, e.g. v2) |
| Vault | Client-side cryptographic facade (PBKDF2 + AES-GCM) holding key material only when unlocked |
| SPA | Single-page application (React + Vite) |
| WAL | SQLite write-ahead logging journal mode (preferred on local disk per `AGENTS.md`) |

---

## Appendix B — Requirement IDs (cross-reference)

Use **FR*** / **NFR*** identifiers consistently with [[uml_traceability_validation]] when writing issues, tests, and change requests.

---

*End of document.*
