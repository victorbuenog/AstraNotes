---
aliases:
  - Governance and Ethics Memo
tags:
  - astranotes
  - planning
  - governance
  - ethics
  - security
---

# Governance & Ethics Review — AstraNotes

> [!info] Related notes
> Home: [[README]]
> Product and requirement context: [[prd]] · [[refined_requirements]]
> Design and validation: [[astranotes-design-document]] · [[uml_traceability_validation]]
> Architecture risk follow-up: [[architecture-review]]

**Date:** April 15, 2026  
**Scope:** Privacy, personally identifiable information (PII), data leakage, licensing, and responsible use of AI (including automation and agents).  
**Audience:** Engineering, product, and any party handling user data or dependencies.

## 1. Purpose and governance posture

This memo records **ethical and compliance-oriented expectations** for how AstraNotes handles accounts, notes, exports, and any future automation. It is not a substitute for legal counsel or a formal DPIA; it is intended to **align engineering choices** with user trust and institutional norms (e.g., academic integrity, FERPA-style sensitivity if used in educational contexts).

**Principles:**

1. **Data minimization:** Collect and retain only what is needed to run the service.
2. **User sovereignty:** The user is the primary authority for **export** and **meaningful consent** before human or automated review of note content.
3. **Defense in depth:** No single layer (encryption, policy, or “trust the team”) should be the only control.
4. **No misuse of AI:** Capabilities that could be used to bypass security, decrypt data, or “hack into” systems must not be directed at user data or production systems.

## 2. Privacy — export and access control

**Requirement (stakeholder):** User data must not be exportable by anyone **other than the user** (or their explicit delegate, if you ever add such a role).

**Implications:**

- **Administrative and backup paths:** Database dumps, replicas, and support tooling must be treated as **highly sensitive**. Access should be role-based, logged, and limited; ideally **no routine** full-text access to note bodies for operations staff.
- **Application exports:** Features such as vault JSON export/import (or single-note export) should remain **user-initiated**, with clear warnings that exported files are plaintext-equivalent on disk.
- **API design:** Endpoints that return note payloads must enforce **session-bound identity** (`user_id` matches session) and must not expose cross-tenant data through ID guessing or missing checks.

**Residual risk:** Anyone with **server filesystem or DB access** can still read ciphertext and metadata; the product’s **client-side encryption** limits server readability of note content but does not remove the need for **operational discipline** and access control.

## 3. PII and sensitive data handling

**Stakeholder requirements:**

- User identifiers and secrets must **not** be stored or displayed in careless ways in **plain text** where avoidable.
- If note content must be accessed (e.g., support, legal, safety), access should be **with user consent** and, where automation is used, a **local** model should assist with **redaction** of personal information before wider sharing.

**Current alignment (product design):**

- **Passwords:** Should be stored only as **strong one-way hashes** (e.g., bcrypt), never reversible.
- **Note bodies:** Encrypted **before** upload so the server stores **opaque blobs**; this supports the goal that **routine server storage is not plaintext notes**.
- **Usernames:** Often stored in plaintext for login lookup; this is common but is still **PII**. Mitigations include strict access controls, avoiding logging usernames in URLs or verbose logs, and clear privacy notices.

**Gaps / decisions to document:**

- **Legacy or migration paths:** Any plaintext or legacy note format should be **migrated** to encrypted storage and **deprecated** in documentation.
- **“Consent + local redaction” workflow:** If implemented, define: what triggers access, how consent is recorded, **which** local model/process runs redaction, and **retention** of redacted vs. raw artifacts (ideally **minimize retention** of raw).

## 4. Data leakage vectors (beyond “encryption on”)


| Area               | Risk                                                          | Mitigation themes                                                                |
| ------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Logs**           | Request/response logging could capture fragments of user data | Structured logging without bodies; PII scrubbing; short retention                |
| **Errors**         | Stack traces or client error reports might include content    | Sanitize; avoid sending note text to third-party crash reporters without consent |
| **Backups**        | Copies multiply exposure                                      | Encrypt backups at rest; restrict restore access; key management policy          |
| **Client devices** | Export files, screenshots, shared machines                    | UX warnings; optional screen-lock / timeout (product decision)                   |
| **Dependencies**   | Supply-chain or telemetry in libraries                        | See licensing section; pin versions; audit network calls                         |


## 5. Licensing and intellectual property

**Open-source and third-party components**

- Maintain an **inventory** of dependencies (direct and transitive) with their **licenses** (MIT, Apache-2.0, GPL, etc.).
- Ensure **compatibility** between your distribution model and copyleft terms (e.g., GPL may impose obligations if you distribute combined works in certain ways).
- **Attribution:** Keep required **NOTICE** / license files for bundled dependencies where required.

**User-generated content**

- Terms should clarify **who owns** notes (typically the user) and what **license** you need to operate the service (e.g., hosting, displaying back to the user only).
- If you add **AI features** that train on data, that requires **explicit** policy and consent; default should be **no training on user notes** unless clearly opted in.

## 6. AI use — ethics and guardrails

**Stakeholder position:** AI systems can assist with many tasks but must **not** be used to **hack**, **decrypt**, or **circumvent protections** on user data. They should **not** be given tasks that **directly touch** raw user information **without** a controlled pipeline and clear purpose.

**Recommended policy:**

1. **Prohibited uses:** No prompts or agents whose goal is to break encryption, guess passwords, scrape other users’ data, or bypass authentication.
2. **Data plane:** Any AI that processes note text should run in a **defined environment** (e.g., **local** or **dedicated** processing with **no** retention in vendor logs, or with **consent** and **DPA** if cloud is used).
3. **Human review:** High-risk actions (account recovery, content disclosure) should involve **human** approval, not fully automated decisions.
4. **Transparency:** If AI assists with summarization or redaction, disclose **what** is sent **where** and **for how long** it is retained.
5. **Security realism:** Do not rely on “AI can’t decrypt” as a guarantee; **cryptography and access control** remain authoritative.

## 7. Summary table — stakeholder requirements vs. implementation themes


| Theme                   | Requirement                                             | Implementation direction                                                         |
| ----------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Privacy / export**    | Only the user (or explicit delegate) exports data       | User-initiated export; no silent admin export of note plaintext; locked-down ops |
| **PII**                 | No plaintext passwords; minimize plaintext PII exposure | Password hashing; encrypted note payloads; careful logging                       |
| **Access with consent** | Access + local redaction if notes must be seen          | Documented workflow; local redaction step; minimal retention                     |
| **Data leakage**        | Reduce incidental exposure                              | Log hygiene, backup encryption, dependency review                                |
| **Licensing**           | Compliant use of OSS and clear UGC terms                | SBOM/license audit; terms of service                                             |
| **AI**                  | No hacking/decrypt; no unfettered access to user data   | Policy + architecture: boundary between “security crypto” and “AI features”      |


## 8. Next steps (optional)

- Add a short **“Responsible use / AI”** subsection to internal runbooks.
- Track **legacy plaintext** note handling until fully retired.
- If the app is used in **regulated** contexts, run a **formal** privacy review with institutional privacy officers.

