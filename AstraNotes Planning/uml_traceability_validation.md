---
aliases:
  - UML Traceability Validation
tags:
  - astranotes
  - planning
  - uml
  - traceability
---

# AstraNotes UML Traceability Validation

> [!info] Related notes
> Home: [[README]]
> Requirement context: [[Initial Requirements]] · [[requirements]] · [[refined_requirements]] · [[prd]]
> Design context: [[astranotes-design-document]]
> Architecture follow-up: [[architecture-review]]

This validation checks whether the **current** Lucid UML package is traceable to the refined baseline requirements and ready for implementation planning.

## Requirements-to-UML traceability matrix


| Requirement ID | Requirement                                                                               | Class/Object Evidence                                                                                                                                | Use Case/Activity Evidence                                                                                                                                                   | Deployment Evidence                                                                                                          | Status           | Gap Note                                                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| FR1            | Create/read/update Markdown notes with autosave, archive/unarchive, and permanent delete. | `Note` has `title`, `archived`, `updatedAt`; `EditorSession` models save state; object snapshot shows `n1/doc1/b1` plus `sess1`.                    | Use cases `Write markdown note`, `Archive or restore note`, `Delete note permanently`, `Autosave encrypted note`, `Confirm irreversible delete`; edit/autosave activity. | Browser SPA -> Express API -> SQLite still traces the persistence path for active, archived, and deleted note state changes. | Fully Traced     | Delete-confirmation skip preference is UI detail outside UML, but the baseline archive/restore/delete behavior is explicit.      |
| FR2a           | Search notes by text with defined empty-query behavior.                                   | `Note.title` and note body in `MarkdownBlock.text` imply searchable fields.                                                                          | Use case `Browse, search, filter tags` exists.                                                                                                                               | Same-origin SPA/API path implies where search is executed, but not query semantics.                                          | Partially Traced | Empty query, special characters, and exact scope rules (title vs body) remain outside the diagrams.                              |
| FR2b           | Tag-based organization and filtering.                                                     | `Note.tags: string[]`; object `tags = {csen296b, architecture}`.                                                                                     | Use case includes `filter tags`.                                                                                                                                             | Deployment does not add special constraints beyond normal API persistence.                                                   | Fully Traced     | Tag normalization rules (case-folding/duplicates/limits) are not depicted, but core requirement intent is represented.           |
| FR3            | Toggle/split Markdown preview without losing unsaved work.                                | `EditorSession.mode`, `draftMarkdown`, and object `sess1` make Write / Split / Read state explicit alongside `MarkdownBlock`/`NoteDocument`.        | Use case `Preview note (Split / Read)` plus edit/preview/autosave activity step `Render preview from current in-memory draft`.                                              | Browser delivery on Windows / macOS / Linux shows preview as a client-rendered concern in the SPA.                           | Fully Traced     | Image/link security policy for preview remains documented elsewhere, but unsaved-draft preview semantics are now explicit.       |
| FR6-S          | Server stores ciphertext; client decrypts; cross-user access denied.                      | `Vault.encrypt/decrypt`; `EncryptedNoteRow.payload` ciphertext; object caption says plaintext only in browser memory.                                | Use case `Unlock encrypted vault`; edit/autosave activity includes `Vault.encrypt` and `PUT` with cookie.                                                                   | Deployment shows browser Web Crypto vault, express-session auth, SQLite ciphertext rows.                                     | Fully Traced     | Cross-user denial (`403`) is still implied by session/auth instead of shown as a separate alternate-flow branch.                 |
| FR7            | Versioned export/import with validation and idempotent behavior.                          | `VaultExportFile` (`formatVersion`, `app`, `notes`) plus object `exp1 : VaultExportFile`.                                                            | Use cases `Export vault JSON`, `Import vault JSON`, `Confirm plaintext warning`, `Validate formatVersion + note schema`, `Upsert same ids; keep others`; import activity. | Deployment keeps import/export in the browser-to-API flow while the server persists upserted ciphertext rows in SQLite.      | Fully Traced     | Alternate strategies beyond the current upsert-by-id policy are intentionally out of scope for this package revision.            |
| FR4            | Stable extension model for note types/blocks.                                             | `abstract NoteBlock` generalized by `MarkdownBlock` and `ImageBlock` suggests extension surface.                                                     | No plugin lifecycle or extension workflow use case/activity.                                                                                                                 | Deployment has no plugin runtime boundary/sandbox container.                                                                 | Partially Traced | Structure is present, but behavioral and runtime contracts for extension points are not modeled.                                 |
| NFR2           | Run consistently across at least three platforms.                                         | Browser-centric `EditorSession` / `VaultExportFile` model is portable across the client runtime.                                                      | The same user-facing note, preview, autosave, and import/export behaviors are modeled independent of OS.                                                                     | Deployment now names Windows, macOS, and Linux browser delivery, plus Docker / Dev Container as an optional common runtime. | Fully Traced     | Native packaging is still not modeled, but the named three-platform browser delivery satisfies the current refined requirement. |


## Traceability metrics summary

- Total requirements reviewed: **8**
- Fully Traced: **6**
- Partially Traced: **2**
- Weakly Traced: **0**
- Not Traced: **0**
- Major UML elements without a clear requirement reason to exist: **0**

## Brief gap analysis

The package is now materially more balanced across structure, behavior, and deployment. FR1, FR3, FR6-S, FR7, and NFR2 all have explicit evidence paths instead of relying on implicit interpretation.  
The remaining modeling debt is concentrated in **search semantics** (FR2a: empty query, special characters, exact scope) and **extension/runtime contracts** (FR4: lifecycle, schema governance, sandbox boundary).  
Overall readiness is high for acceptance-test planning of the current secure-notes baseline because the previously weak areas now have concrete use-case and activity evidence.

## How AI helped refine this matrix

AI accelerated the validation by comparing the revised Lucid JSON package against the refined requirement baseline using a consistent evidence vocabulary (class/object, behavior, deployment).  
It also helped confirm that the new pages close the earlier FR1 / FR3 / FR7 / NFR2 traceability gaps while leaving genuinely unresolved areas, such as FR2a search semantics and FR4 extension contracts, visible instead of overstated.