# Refined requirement baseline — AstraNotes

**Repository:** [github.com/victorbuenog/AstraNotes](https://github.com/victorbuenog/AstraNotes).

This document refines `Initial Requirements.md`, `requirements.md`, `user-stories.md`, `backlog.md`, and `sprint-zero-plan.md` into a **clearer, testable baseline**. It separates **functional** behavior (what the system does for users) from **non-functional** qualities (how well it does it: speed, platforms, extensibility, security posture as *constraints*).

---

## Functional vs non-functional requirements (how we use the terms here)

| Kind | Definition | Examples in AstraNotes |
| --- | --- | --- |
| **Functional** | Observable capabilities, data lifecycle, and user-visible outcomes | Create/edit notes; **archive** (reversible) and **permanent delete**; Markdown preview; search filters the list; tags persist; export produces a file; API returns 403 for another user’s note |
| **Non-functional (NFR)** | Measurable qualities, constraints, and “-ilities” applied to those capabilities | Latency targets; supported OS list; plugin API stability; performance at 10k notes (when claimed) |
| **Security / governance (Sec)** | Cross-cutting policies that often *look* like NFRs but specify **mandatory controls** | Ciphertext-at-rest for note bodies; session-scoped access; audit logging intent; plugin least-privilege *when* a runtime exists |

**Why it matters:** Mixing them weakens defensibility. “Encrypt my notes” is functional *intent*; “AES-GCM, keys only in memory while unlocked” is a **security constraint** that makes FR6 testable. “Search in under 500 ms” is an **NFR** layered on the functional “search exists.”

---

## Refined functional requirement baseline

Statements below are **prioritized** to match the current planning baseline (P0 → P2). IDs align with `Initial Requirements.md` where applicable.

### P0 — Core notes and trust

| ID | Requirement | Notes / acceptance hooks |
| --- | --- | --- |
| **FR1** | Users can **create, read, and update** notes with a primary Markdown body; changes **persist** through the application’s storage layer with **timely** save behavior (debounced autosave with visible saving/saved feedback). Users can **archive** a note (hidden from the main list; still stored; viewable in an archive view; **unarchive** restores) or **delete permanently** (row removed from the database; **cannot be undone**). | Maps to US-1. |
| **FR3** | Users can **switch** between raw Markdown editing and a **rendered preview** (or split view) without losing unsaved work; preview behavior relative to “last saved vs editor buffer” is **documented**. | Maps to US-2; baseline UX: **Write** edits source, **Read** is rendered-only, **Split** combines both; image/link policy must be explicit (security vs UX). |
| **FR6-S** | **Server-side:** Note bodies are stored and transmitted as **opaque ciphertext** for the chosen payload model; **decryption is client-side**; **cross-user access is denied** with a documented HTTP status (e.g. 403). | Aligns Sec 1 + FR6 *as implemented* (multi-user web app). Distinct from “Secure plugin” local passphrase UX if that variant is added later. |

### P1 — Find, organize, move data

| ID | Requirement | Notes / acceptance hooks |
| --- | --- | --- |
| **FR2a** | Users can **search** the note collection by **text** over fields the product defines (e.g. title and/or body), with defined behavior for **empty query** and **special characters**. | Subset of FR2; **no** 10k-note / 500 ms claim until measured (per backlog icebox). |
| **FR2b** | Users can attach **organizational metadata** (baseline recommends **tags** first; folders/notebooks deferred or alternate). Users can **filter** by that metadata. | Schema choice (JSON column vs join table) is an implementation decision with migration for existing notes. |
| **FR7** | Users can **export** their vault to a **versioned, documented** format and **import** it back with defined rules for **validation**, **errors**, and **idempotency** (merge vs replace vs skip). | Export plaintext vs ciphertext must match **threat model** and user-visible warnings. |

### P2 — Extensibility (without committing to full plugins yet)

| ID | Requirement | Notes / acceptance hooks |
| --- | --- | --- |
| **FR4** | The product maintains a **stable conceptual model** for note types / blocks (single path for default Markdown; extension points for renderers/savers/types) documented for developers. | US-7: ADR or `docs/plugins.md`; TypeScript types centralized. **Not** a commitment to Voice or full sandbox. |

### Deferred functional requirements (valid roadmap, out of near-term baseline)

| ID | Requirement | Gate / dependency |
| --- | --- | --- |
| **FR5** | Voice capture, storage, and playback as a plugin-backed note type. | After FR4 boundary + media storage story. |
| **FR2c** | “Thousands of notes” **full-text** and **rich filters** (date, plugin type, etc.) at **stated** latency. | After FR2a + indexing + profiling. |
| **FR8** | Offline-first availability and **deterministic** sync/conflict resolution with a remote store. | After FR7 and versioning/conflict policy. |
| **FR6-P** | **Secure Note (passphrase)** UX: encrypt-at-rest with user passphrase; decrypt only in memory while open—if distinct from current “client ciphertext” model. | Clarify overlap with FR6-S; may be same or a plugin. |

---

## Refined non-functional requirement baseline

| ID | Requirement | Baseline status |
| --- | --- | --- |
| **NFR1** | **Responsiveness:** Human-scale latency for open/edit/save (planning cites ~200 ms average for note operations where applicable); search performance is **honest for current scale** until NFR1-scale targets are validated. | **Active** for MVP UX; **10k / sub-second** search is **deferred** (icebox). |
| **NFR2** | **Cross-platform:** Run on **at least three** of Windows / macOS / Linux via a **defined** delivery (native and/or shared runtime). | **Active** as project constraint; exact packaging TBD. |
| **NFR3** | **Extensibility:** Documented plugin/extension surface (APIs, lifecycle, data contracts) so new note types can be added **without** unrelated core churn. | **P2** documentation + types; not full Sec 2 sandbox. |

---

## Security, privacy, reliability, and governance (refined)

These are **mandatory constraints** for the secure-notes MVP where they apply; several have **staged** maturity.

| ID | Constraint | Near-term baseline | Deferred / staged |
| --- | --- | --- | --- |
| **Sec 1** | Authenticated encryption for note payloads; keys handled per documented vault model; no plaintext bodies on server for protected notes. | **Yes** (align with README + US-5). | — |
| **Sec 2** | Plugin **sandbox** and strict least-privilege **enforcement**. | **Design toward** least privilege in API; **no** full sandbox runtime in Sprint Zero / early baseline. | Icebox: after second note type. |
| **Sec 3** | Backups and **integrity** checks of the note store. | Start with **export** + operational guidance; automated checksum passes **later**. | Post–export + runbook. |
| **Sec 4** | **Auditability** and configuration governance for security-relevant events and plugins. | Server-side security events as feasible; **rich UI** later. | After logging foundation. |

---

## Traceability (summary)

| Planning artifact | Role |
| --- | --- |
| `Initial Requirements.md` | Source numbering (FR/NFR/Sec); long-horizon scope. |
| `requirements.md` | Near-term priority overlay (P0–P2) for the **current stack**. |
| `user-stories.md` | Testable acceptance criteria (US-1 … US-7). |
| `backlog.md` | Order of delivery + icebox for scale/plugins/sync. |
| `sprint-zero-plan.md` | First execution slice: US-1, US-2, US-5 + spikes for US-3, US-4, US-6. |

---

## Ambiguity review

| Topic | What is ambiguous | Suggested resolution |
| --- | --- | --- |
| **“Local-first” vs current architecture** | Initial FR1/FR8 emphasize local persistence and optional sync; `requirements.md` describes a **session-scoped, server-backed** app with **client-side encryption**. | Treat **local-first** as a **roadmap alignment** (offline + sync later), not a claim about the current MVP unless the product explicitly ships offline-capable storage. |
| **Archive vs permanent delete** | _(Resolved.)_ | **Archive** = soft-hide + archive view + unarchive. **Delete** = `DELETE` / DB removal, irreversible. |
| **FR6 “Secure plugin” vs server ciphertext** | Initial text describes passphrase-based secure notes; baseline stories focus on **opaque server payloads** and client decrypt. | Maintain two labels if both exist: **FR6-S** (server opaque ciphertext) vs **FR6-P** (passphrase-gated note type). |
| **“Near real time” (FR1)** | Not numerically bound separately from NFR1. | Tie autosave to debounce + **saved** feedback; optional max staleness only if needed. |
| **Search scope (FR2a)** | Title-only vs body vs both affects privacy and performance. | Document fields searched and whether **server** ever sees plaintext queries for indexed search. |
| **Tags vs folders (FR2b)** | Backlog recommends tags first; Initial Requirements mention notebooks/folders. | **Tags** = baseline; folders = later **or** explicit “labels only” MVP. |
| **Plugin “sandbox”** | NFR3/FR4 vs Sec 2: documentation vs enforcement. | **Honest trust model:** developer guide + types first; sandbox when multiple untrusted plugins exist. |
| **Export/import threat model** | Plaintext export is convenient but weaker than ciphertext backup. | Require **explicit user acknowledgment** for plaintext exports; versioned format in all cases. |

---

## Edge-case review

| Area | Edge case | Risk if unspecified | Suggested baseline behavior |
| --- | --- | --- | --- |
| **Sessions** | Edit while session expires; concurrent tabs | Lost edits or confusing errors | Define save failure UX; optional **read-only** mode when unauthenticated. |
| **Search** | Empty string, Unicode, regex-like characters, very long queries | Errors or misleading “no results” | US-3 already: empty query shows full list; add **explicit** handling for length limits and encoding. |
| **Tags** | Duplicate tags, case sensitivity, max count/length | Inconsistent filters | Define normalization (e.g. case-fold) and limits. |
| **Import** | Duplicate IDs, partial file corruption, version skew | Data loss or duplicates | US-6 calls for validation + idempotency rules; specify **merge vs replace** per format version. |
| **Encryption** | Wrong key / corrupt ciphertext; clipboard exfiltration | User trust failure | Clear **decrypt error** messages; README states what is **not** protected (memory, screenshots). |
| **Multi-user** | Rapid create/archive/delete; listing consistency | Stale UI | HTTP caching assumptions documented for API. |
| **Markdown** | Huge documents, embedded images | UI jank, memory | Optional soft limits or warnings in NFR/UX. |
| **Scale** | First use with **zero** notes | Empty states | Empty list and onboarding copy. |

---

## Full requirement traceability (Initial → refined)

The tables below pair each **code** from `Initial Requirements.md` with its **original** wording (summarized where long) and a **refined** statement that incorporates the [ambiguity review](#ambiguity-review), [edge-case review](#edge-case-review), and the prioritized baseline earlier in this document. **Derived codes** (`FR2a`–`FR2c`, `FR6-S`, `FR6-P`) split FR2 and FR6 where the baseline product architecture (server-backed SPA, phased delivery) requires separate testable statements; they are not separate rows in `Initial Requirements.md`.

### Functional requirements (FR1–FR8)

| Code | Original requirement (`Initial Requirements.md`) | Refined requirement (ambiguity + edge cases) |
| --- | --- | --- |
| **FR1** | Create, edit, archive, and permanently delete Markdown notes; persist changes in near real time; **archive** hides from default list, archive view + unarchive; **delete** removes from DB, irreversible. | **Create/read/update** with timely persistence: debounced autosave and **saving / saved** feedback (binds “near real time” to measurable UX). **Archive** hides from main list, keeps row, archive view + **unarchive**. **Delete permanently** removes row; **cannot be undone**; confirm in UI. **Sessions / tabs (edge cases):** define behavior when save fails (e.g. expired session) and avoid silent loss with concurrent tabs where feasible. **Scale:** empty vault → clear empty states. |
| **FR2** | Tag notes; group into notebooks/folders; full-text and filtered search (tag, date, plugin type, …); **≥10,000** notes; results **under 500 ms** on typical hardware. | Phased: **FR2a** — text search with documented fields (title/body), **empty query** → full list, **Unicode / special characters / length** limits explicit; honest performance at **current** scale (no 10k/500 ms claim until measured). **FR2b** — organization: **tags first** (folders deferred); **duplicate tags, case, max length** normalized and documented. **FR2c** (later) — rich filters + scale/latency targets after indexing + profiling. **Multi-user:** listing/search consistency with API (no stale cross-user data). |
| **FR3** | Render Markdown preview (headings, lists, code, images, links); toggle raw vs rendered. | Toggle or split view **without losing unsaved edits**; baseline interaction is **rendered-only Read** (no raw source textarea in Read mode). Document whether preview reads editor buffer vs last saved. **Images/links:** security rules explicit (e.g. remote loads). **Large notes (edge case):** optional soft limits or warnings to protect UX/memory. |
| **FR4** | Plugin architecture: each plugin defines note type (UI, schema, rendering)—e.g. Text, Voice, Secure. | **Plugin-ready boundary:** stable note/block model, **documented** extension points (ADR or `docs/plugins.md`), centralized types; single path for default Markdown. **Honest trust model:** full **sandbox** not required for MVP (see Sec 2). |
| **FR5** | Record audio, store as Voice plugin, playback in app. | **Deferred** until FR4 boundary + media storage; no change to core encryption story without ADR. |
| **FR6** | Secure Notes: encrypt at rest with key from **user passphrase**; decrypt **in memory** only while open. | Two layers if both apply: **FR6-S** — server stores **opaque ciphertext**; decrypt **client-side**; **403** on cross-user access; API/list never exposes plaintext bodies. **FR6-P** — per-note passphrase **plugin** variant if distinct from vault-wide model; align with README **threat model**. **Edge cases:** corrupt ciphertext / wrong key → clear errors; document what is **not** protected (e.g. memory, screenshots). |
| **FR7** | Export/import full note DB (metadata + plugin data) in **documented** format; portability across platforms without data loss. | **Versioned** export/import; **validation** and clear errors on bad/partial files; **idempotency** (merge vs replace vs skip) per format version; **plaintext export** requires user acknowledgment if used; handles **duplicate IDs** and corruption (edge cases). |
| **FR8** | Local-first: offline availability; later sync to remote; **deterministic** conflict resolution (versioning/CRDTs). | **Roadmap:** treat **local-first** as target architecture, not necessarily current MVP (see ambiguity: server-backed vs offline). Ship **after** FR7 + explicit conflict/versioning policy. |

### Non-functional requirements (NFR1–NFR3)

| Code | Original requirement (`Initial Requirements.md`) | Refined requirement (ambiguity + edge cases) |
| --- | --- | --- |
| **NFR1** | **Under 200 ms** average for open/edit/save per note; **under 1 s** search over **≥10,000** notes on mid-range laptop (4 cores, 8 GB RAM). | **MVP:** human-scale latency for note operations (~200 ms **intent**, measured in context). Search: **honest** targets for **current** dataset until FTS/index + **10k** dataset exists; sub-second **10k** search is **icebox**, not baseline claim. Tie autosave to debounce + **saved** state (links to FR1 edge cases). |
| **NFR2** | Run on **≥3** platforms (e.g. Windows, macOS, Linux); consistent UX/features; native or common runtime. | **Active** project constraint: **≥3** platforms via **named** delivery (e.g. Electron/Tauri/web+server); packaging **TBD**. |
| **NFR3** | Documented plugin interface (APIs, lifecycle, data contracts); add note types **without** changing core code. | **P2:** documentation + types + hooks; **without** unrelated core churn. Coordinated with **FR4**; enforcement vs **Sec 2** sandbox is staged. |

### Security, privacy, reliability, governance (Sec1–Sec4)

| Code | Original requirement (`Initial Requirements.md`) | Refined requirement (ambiguity + edge cases) |
| --- | --- | --- |
| **Sec 1** | Encrypted at rest (**e.g. AES-GCM**); keys from user credentials; never store keys plaintext; keys in memory only while needed for decrypt. | Align with **implemented vault**: authenticated encryption for note payloads; **session-scoped** access; no plaintext bodies on server for protected notes; key lifecycle per README. Overlaps **FR6-S** for server-backed deployment. |
| **Sec 2** | Least-privilege **sandbox**: plugins only access granted note data/API; no arbitrary FS/network unless user allows. | **Staged:** design APIs with **least privilege**; **no** full sandbox runtime in early baseline; **icebox** full sandbox after a **second** note type exercises the boundary. |
| **Sec 3** | Periodic **local backups** + **integrity** checks (checksums/hashes); detect corruption; restore from recent backups. | **Near term:** **export** + operational/runbook backup; **later:** automated integrity passes and scheduled backups (post–export). |
| **Sec 4** | **Audit log** for security events (failed decrypt, plugin install/remove, encryption settings); **configuration UI** for plugins and security settings. | **Near term:** log security-relevant **server** events where feasible; **later:** rich governance UI and full local audit viewer. |

### Derived refinement codes (splits of FR2 / FR6)

These codes appear in this document and backlog/stories but **not** as separate numbers in `Initial Requirements.md`:

| Code | Parent | Purpose in refined baseline |
| --- | --- | --- |
| **FR2a** | FR2 | Text search MVP + empty/special-character/length behavior; scale claims deferred. |
| **FR2b** | FR2 | Tags-first organization + tag normalization and limits. |
| **FR2c** | FR2 | Full-text + rich filters + latency at large scale (after FR2a + indexing). |
| **FR6-S** | FR6 | Server-stored ciphertext, client decrypt, isolation (**403**)—current stack alignment. |
| **FR6-P** | FR6 | Passphrase-gated secure note **plugin** UX if distinct from vault-wide encryption. |

---

## Document control

- **Purpose:** Clarify scope, reduce hidden assumptions, and support sprint planning and acceptance testing.
- **Supersedes nothing:** Refines and interprets `Initial Requirements.md` together with `requirements.md` and user stories; when conflicts arise, **update this file** after team agreement.
- **Implementation snapshot (web app, 2026-04):** The shipping product meets the **P0–P1** functional baseline here for **FR1** (autosave + saved feedback, archive/delete), **FR2a** (client search with documented limits), **FR2b** (tags + filter + normalization), **FR3** (Write / Split / rendered-only Read; preview tracks the editor buffer), **FR6-S** (opaque ciphertext, client decrypt, session isolation), **FR7** (versioned vault JSON export/import with validation and user acknowledgment; single-note **Markdown** export is an additional, documented export path), and **FR4** (see `docs/plugins.md`). Private-vault PIN flows use in-app dialogs (no browser prompt/alert dependency). Deferred items (**FR5**, **FR2c**, **FR8**, **FR6-P**, full **Sec 2** sandbox) remain out of scope. Detailed UI notes and traceability live in [`LOG.md`](./LOG.md) and the root [`README.md`](../README.md).
