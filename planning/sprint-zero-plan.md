# Sprint Zero plan

**Goal:** Align the codebase with the **early baseline** (`planning/requirements.md`), close obvious gaps against **US-1, US-2, US-5**, and leave **search, organization, export, and plugin docs** ready for Sprint 1 with minimal unknowns.

**Duration:** Short (suggest **3–5 focused working days** or **1 calendar week**; adjust to course cadence).

**Out of scope for Sprint Zero:** New features for voice, 10k-note performance guarantees, full sync, plugin sandbox runtime.

---

## Objectives

1. **Verify** current behavior against acceptance criteria for encryption/isolation, autosave, and Markdown editing.
2. **Document** gaps as concrete tasks (linked to user stories).
3. **Stabilize** developer workflow: run, test, and deploy story documented (including optional **Docker Compose** / **Dev Container** for a single Linux environment on Mac and Windows—see root `README.md`).
4. **Spike** search and tags (time-boxed) to pick an approach for Sprint 1.

---

## Work breakdown

### 1. Baseline audit (half day)

- [ ] Walk through **US-1, US-2, US-5**; mark each acceptance criterion **pass / partial / fail**.
- [ ] List failures as issues with IDs **US-x** in the issue tracker or a bullet list in `LOG.md`.
- [ ] Confirm README matches actual auth, unlock-after-refresh, and encryption behavior.
- [ ] Confirm **archive** (reversible; hidden from main list; **Show archived**) vs **delete permanently** (DB row removed; irreversible; confirm dialog) matches `requirements.md` and **US-1**.

### 2. Test and security pass (half day)

- [ ] Run full test suite (`vitest`, server tests); fix flaky or broken tests.
- [ ] Add or extend tests where US-5 is weak (cross-user PUT, ciphertext shape on list).
- [ ] Quick manual pass: register two users, confirm no data bleed in UI and API.

### 3. Markdown preview (half day — if gaps exist)

- [ ] Implement or polish toggle/split per **US-2**; document image/link policy in README if not already.

### 4. Spikes (time-box: 2–3 hours each)

| Spike | Question to answer | Output |
| --- | --- | --- |
| **Search** | SQLite FTS vs client-side filter vs hybrid for current scale? | 1-page decision in `LOG.md` or ADR snippet; rough effort for US-3. |
| **Tags** | Single `tags` column (JSON) vs join table? | Schema sketch + migration approach for US-4. |
| **Export** | Plaintext zip vs encrypted bundle vs server-assisted? | Recommended FR7 approach + user-visible warning if plaintext. |

### 5. Backlog grooming (half day)

- [ ] Reorder `planning/backlog.md` if audit changes priorities.
- [ ] Split **US-3 / US-4 / US-6** into implementation tasks with estimates.
- [ ] Schedule **US-7** doc task early if refactors are needed before Sprint 1 feature work.

---

## Sprint Zero deliverables

| Deliverable | Location / form |
| --- | --- |
| Audit results | `LOG.md` section or checklist under planning |
| Search/tags/export decisions | Short notes in `LOG.md` or `planning/` ADR |
| Updated tests | Repository |
| Sprint 1 candidate backlog | `planning/backlog.md` + refined tasks |

---

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Search at scale is underestimated | Defer 10k/500 ms; ship honest “current scale” search first. |
| Export format churn | Version field (`formatVersion: 1`) in export JSON from day one. |
| Plugin boundary unclear | US-7 doc in Sprint Zero or first week of Sprint 1—do not start Voice without it. |

---

## Sprint Zero “done”

Sprint Zero is complete when:

1. **US-1, US-2, US-5** audit is recorded and **P0 gaps** are either fixed or explicitly scheduled as Sprint 1 items.
2. **Spikes** have written outcomes that unblock **US-3, US-4, US-6**.
3. CI/tests green; README reflects current security and UX flows.
