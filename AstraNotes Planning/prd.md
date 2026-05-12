---
aliases:
  - PRD
  - Product Requirements Document
tags:
  - astranotes
  - planning
  - prd
  - traceability
---

# AstraNotes — Product Requirements Document (outline)

> [!info] Related notes
> Home: [[README]]
> Requirement chain: [[Initial Requirements]] · [[requirements]] · [[refined_requirements]]
> Acceptance and planning: [[user-stories]] · [[backlog]] · [[sprint-zero-plan]]
> Supporting references: [[glossary]] · [[governance_ethics_memo]] · [[Definition of Done]] · [[Working Agreement]] · [[LOG]] · [[uml_traceability_validation]] · [[astranotes-design-document]] · [[architecture-review]]

**Status:** Draft aligned to the CSEN 296B planning baseline.  
**Supersedes:** Nothing. This PRD **summarizes intent** and **maps each section** to existing course artifacts; the numbered source of truth for requirements remains `Initial Requirements.md`, refined in `refined_requirements.md`, with acceptance detail in `user-stories.md` and ordering in `backlog.md`.

---

## Course artifact index (traceability sources)

Every section below cites one or more of these **existing** artifacts. Paths are relative to the repo root unless noted.

| Artifact | Role in traceability |
| --- | --- |
| [[Initial Requirements]] | Original **FR1–FR8**, **NFR1–NFR3**, **Sec 1–Sec 4** numbering. |
| [[requirements]] | Near-term **P0–P2** priority overlay for the current stack; product intent and archive/delete definitions. |
| [[refined_requirements]] | Testable baseline; **FR2a–FR2c**, **FR6-S / FR6-P** splits; ambiguity and edge-case tables; implementation snapshot (2026-04). |
| [[user-stories]] | **US-1–US-7** with acceptance criteria. |
| [[backlog]] | Prioritized backlog bands, **icebox**, **Definition of Ready** (DoR) pointers. |
| [[sprint-zero-plan]] | First execution slice; **Sprint Zero out-of-scope** list; spikes for search/tags/export. |
| [[governance_ethics_memo]] | Privacy, export control, PII, leakage, licensing, AI guardrails. |
| [[Definition of Done]] | **DoD** completion criteria (tests, security, logs/README/LOG updates). |
| [[Working Agreement]] | Process: feature list hygiene, AI use for planning/code/docs, verification before new features. |
| [[glossary]] | Definitions for FR/NFR/Sec, US, P0–P2, DoR/DoD, archive vs delete, stack terms. |
| [[README]] | Course/planning copy of product overview (mirrors root README at a point in time). |
| [[LOG]] | Dated implementation and decision narrative (supports “as-built” traceability). |
| [[uml_traceability_validation]] | UML vs refined requirements matrix; **gaps** inform risk and modeling debt. |
| [`README.md`](../README.md) | **Canonical** as-built behavior (auth, unlock, search limits, export formats, private vault PIN, errors). |

**Legend:** If a PRD bullet lists **— (implementation detail)**, the behavior is documented in **`README.md`** / [[README]] / [[LOG]] but **not** as a separate line item in [[Initial Requirements]].

---

## 1. Problem statement

### Summary

- Users need **Markdown note-taking** with **reliable persistence** and a **minimal** editing experience.
- Hosted or shared deployments create a **trust gap** when note bodies are readable on the server; AstraNotes targets **opaque ciphertext at rest** with **client-side decryption** and **session-scoped isolation**.
- Users still need **discovery and organization** (search, tags) and **portability** (export/import) without over-promising **offline-first** or **large-scale search SLAs** before they are measured.

### Course artifact traceability

| PRD element | Primary artifacts | IDs / pointers |
| --- | --- | --- |
| Trust / plaintext-on-server gap | `Initial Requirements.md` (FR6, Sec 1); `requirements.md` (product intent); `refined_requirements.md` (FR6-S, Sec 1, ambiguity table: local-first vs server-backed) | FR6, Sec 1 → **FR6-S** in refined doc |
| Archive vs permanent delete clarity | `requirements.md`; `refined_requirements.md` (FR1, ambiguity review); `user-stories.md` (US-1) | FR1 |
| Honest scope (no premature 10k/500 ms claim) | `refined_requirements.md` (FR2a, NFR1, deferred FR2c); `backlog.md` (icebox) | FR2a, FR2c, NFR1 |
| Portability without sync yet | `Initial Requirements.md` (FR7, FR8); `refined_requirements.md` (FR7, FR8 deferred) | FR7 vs **FR8** roadmap |

**UML note:** `uml_traceability_validation.md` now shows the package explicitly covering the previously missing FR1 / FR3 / FR7 / NFR2 behaviors; the remaining modeling debt is concentrated in FR2a search semantics and FR4 extension/runtime contracts.

---

## 2. Users and stakeholders

### Summary

| Segment | Needs |
| --- | --- |
| **Signed-in end users** | Reliable notes, preview, search, tags, vault export/import, understandable errors; optional **private vault (PIN)** — *(implementation detail, see README)*. |
| **Privacy- or policy-sensitive contexts** | Data minimization, user-initiated exports, careful logging; institutional sensitivity called out in governance memo. |
| **Developers extending the product** | Stable note/block model and documented extension surface (**FR4** / **US-7**). |
| **Operators** | SQLite deployment, ciphertext storage, backup discipline; no assumption of routine plaintext note access. |

### Course artifact traceability

| PRD element | Primary artifacts | IDs / pointers |
| --- | --- | --- |
| “As a user …” framing | `user-stories.md` (US-1–US-7 voice); `glossary.md` (MVP, UX) | US-1 … US-7 |
| Multi-user session model | `requirements.md`; `refined_requirements.md` (FR6-S); root `README.md` | Sec 1 + **FR6-S** |
| Institutional / ethics-sensitive use | `governance_ethics_memo.md` §1–2, §8 summary table | Not FR-numbered; **governance** |
| Private vault PIN | **—** | Documented in **`README.md`** / [[README]]; not a row in [[Initial Requirements]] (track via [[LOG]] if formal FR needed later) |

---

## 3. Core features

### Summary

1. **Accounts and sessions** — Register/login; HTTP-only session cookie; vault unlock after reload (password not in session for crypto key). (**Sec 1**, **FR6-S**, README.)
2. **Notes lifecycle** — Create/read/update Markdown-centric notes; debounced autosave with **Saving / Saved**; **archive** (reversible) vs **permanent delete** (confirmed). (**FR1**, **US-1**, **NFR1** intent.)
3. **Markdown UX** — Write / Split / Read; preview without losing unsaved work; documented link/image posture. (**FR3**, **US-2**.)
4. **Client-side encryption** — Ciphertext on server; client decrypt; cross-user denial. (**FR6-S**, **Sec 1**, **US-5**.)
5. **Search** — Text search over documented fields; empty query and special-character behavior defined; performance honest for current scale. (**FR2a**, **US-3**.)
6. **Tags** — Add/remove/filter; normalization and limits. (**FR2b**, **US-4**.)
7. **Export / import** — Versioned vault JSON; validation and idempotency rules; plaintext-equivalent export warnings. (**FR7**, **US-6**.)
8. **Plugin-ready boundary** — Types + `docs/plugins.md` (per acceptance); no Voice plugin commitment. (**FR4**, **NFR3**, **US-7**.)
9. **Quality** — Stable error codes, tests including API ciphertext assertions where required. (**DoD**; README “Errors” / “Tests”.)

### Course artifact traceability

| Feature theme | User story | Refined / initial req |
| --- | --- | --- |
| Autosave, archive, delete | **US-1** | **FR1** |
| Preview / split | **US-2** | **FR3** |
| Search | **US-3** | **FR2a** ← split of **FR2** |
| Tags | **US-4** | **FR2b** ← split of **FR2** |
| Encryption + isolation | **US-5** | **FR6-S**, **Sec 1** (Initial **FR6** intent) |
| Export/import | **US-6** | **FR7** |
| Plugin boundary | **US-7** | **FR4**, **NFR3** |
| Backlog order (delivery sequencing) | `backlog.md` tables | P0: US-5, US-1, US-2; P1: US-3, US-4, US-6; P2: US-7 |
| Sprint Zero emphasis | `sprint-zero-plan.md` | US-1, US-2, US-5 + spikes toward US-3, US-4, US-6 |

**As-built cross-check:** `refined_requirements.md` → “Implementation snapshot (web app, 2026-04)” and root **`README.md`** “Functionality” table.

---

## 4. Non-functional constraints

### Summary

| Area | Constraint |
| --- | --- |
| **Responsiveness** | Human-scale open/edit/save; search performance **honest for current scale** until FR2c measured. |
| **Platforms** | ≥3 of Windows / macOS / Linux via documented delivery (browser + server / Docker / future packaging). |
| **Extensibility** | Documented extension surface; staged trust model vs full sandbox. |
| **Security / governance (staged)** | Sec 1 near-term; Sec 2–4 partially deferred per refined baseline. |
| **Process “done”** | Meet **DoD** and course **Working Agreement** (tests, verification). |

### Course artifact traceability

| Constraint | Artifacts | IDs |
| --- | --- | --- |
| Latency / honest search | `Initial Requirements.md` (NFR1); `refined_requirements.md` (NFR1, FR2c deferred) | **NFR1** |
| Cross-platform | `Initial Requirements.md` (NFR2); `refined_requirements.md` (NFR2); `uml_traceability_validation.md` (NFR2 now traced via named Windows / macOS / Linux browser delivery) | **NFR2** |
| Plugin API docs without full sandbox | `Initial Requirements.md` (NFR3, Sec 2); `refined_requirements.md` (NFR3, Sec 2 staged); `user-stories.md` (US-7 AC on trust model) | **NFR3**, **Sec 2** |
| Encryption + integrity + audit (staged) | `Initial Requirements.md` (Sec 1–4); `refined_requirements.md` (Sec 1–4 table); `backlog.md` icebox (Sec 2–4 depth) | **Sec 1–Sec 4** |
| Definition of Done | `Definition of Done.md`; `backlog.md` (DoD pointer) | **DoD** |
| Working Agreement (verification before new scope) | `Working Agreement.md` | Process, not FR |

---

## 5. Risks

### Summary

| Risk | Mitigation theme |
| --- | --- |
| Residual exposure (ops with DB/filesystem) | Threat model in README; ops access control; ciphertext + metadata awareness. |
| Session expiry / lost edits | Documented save failure UX; stable error codes. |
| Over-claiming performance | No 10k/sub-500 ms until measured (`backlog.md` icebox; **NFR1** refined). |
| Export files as plaintext-equivalent | User acknowledgment; governance export principles. |
| Plugin / supply chain | Staged sandbox; dependency hygiene; governance licensing section. |
| UML / spec drift | `uml_traceability_validation.md` gap list drives tests and diagram updates. |
| AI misuse (internal or product) | `governance_ethics_memo.md` §6 |

### Course artifact traceability

| Risk category | Artifacts |
| --- | --- |
| Operational access, exports, API identity | `governance_ethics_memo.md` §2–4; `refined_requirements.md` edge-case tables (sessions, import) |
| Performance claims | `refined_requirements.md` (NFR1, FR2c); `backlog.md` icebox |
| Modeling / test gaps | `uml_traceability_validation.md` (FR1, FR2a, FR3, FR7, FR4, NFR2 gap notes) |
| AI ethics | `governance_ethics_memo.md` §6–7 |
| Security regression | `Definition of Done.md` (“does not violate security requirements”); **US-5** AC |

---

## 6. Out of scope (near-term baseline)

### Summary

- **Voice** notes (**FR5**); **10k-note / sub-500 ms** search (**FR2c**, icebox **NFR1** scale claim); **offline-first + deterministic sync** (**FR8**); **full plugin sandbox** (**Sec 2** runtime); **rich audit/governance UI** (**Sec 4** UI); **automated integrity backups** (**Sec 3** automation); optional **FR6-P** passphrase variant unless product merges it with vault model.
- **Sprint Zero** explicitly excluded: voice, 10k guarantees, full sync, plugin sandbox runtime (`sprint-zero-plan.md`).

### Course artifact traceability

| Out-of-scope item | Artifacts | IDs |
| --- | --- | --- |
| Voice | `Initial Requirements.md` (FR5); `refined_requirements.md` (deferred FR5); `backlog.md` icebox | **FR5** |
| Large-scale FTS + latency SLO | `Initial Requirements.md` (FR2, NFR1); refined **FR2c**; `backlog.md` icebox | **FR2**, **NFR1** (scale) |
| Offline + sync | `Initial Requirements.md` (FR8); `refined_requirements.md`; `backlog.md` icebox | **FR8** |
| Full sandbox | `Initial Requirements.md` (Sec 2); `refined_requirements.md`; `backlog.md` icebox | **Sec 2** |
| Governance UI | `Initial Requirements.md` (Sec 4); `backlog.md` icebox | **Sec 4** |
| Automated integrity backups | `Initial Requirements.md` (Sec 3); `backlog.md` icebox | **Sec 3** |
| Sprint Zero boundary | `sprint-zero-plan.md` | Explicit **Out of scope for Sprint Zero** |

---

## 7. Success measures (course-aligned)

| Measure | Traceability |
| --- | --- |
| Acceptance criteria satisfied | `user-stories.md` per **US-x**; closure per **`Definition of Done.md`** |
| Backlog hygiene | **`Working Agreement.md`** (feature list status); **`backlog.md`** DoR |
| Requirements completeness vs model | **`uml_traceability_validation.md`** metrics and gap analysis |
| As-built truth | **`README.md`** + [[LOG]] |

---

## 8. PRD coverage gaps (explicit)

The following PRD concepts are **traceable to implementation docs** but **not** to a dedicated row in `Initial Requirements.md`:

| Topic | Trace to |
| --- | --- |
| **Private vault** (PIN, separate list, reset wipes private notes) | `README.md` / [[README]] |
| **Per-note Markdown export** (sidebar ⋯) | `README.md` / [[README]]; aligns with **FR7** portability theme but not separately numbered in [[Initial Requirements]] |
| **Stable application error codes** | `README.md`; supports **DoD** and governance **log hygiene** themes |

If the course requires **100% Initial Requirements numbering**, treat the above as **implementation extensions** logged in **`LOG.md`** and consider a future planning PR to add explicit FR rows or a short ADR.

---

## Document control

| Field | Value |
| --- | --- |
| **Maintainer** | Course project owner |
| **Related** | `refined_requirements.md` (traceability hub), `user-stories.md` (acceptance), `backlog.md` (order) |
| **Change process** | Update this PRD when planning artifacts change; keep **artifact links** in §0 accurate. |
