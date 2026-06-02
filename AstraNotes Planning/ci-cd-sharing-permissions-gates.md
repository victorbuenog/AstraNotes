# AstraNotes CI/CD Gate Plan: Sharing Permission Safety

## Repo State Summary

AstraNotes is a single-package npm workspace with a React + Vite SPA in `src/` and an Express + SQLite API in `server/`. The existing scripts already expose the main quality gates we can use for CI: `npm run build`, `npm run typecheck`, `npm run test`, and `npm run lint`. The repository currently has workflow files for `opencode` and Docker publishing, but no dedicated general CI workflow that runs app quality checks.

## Selected Problem Scenario

A future sharing feature could accidentally deliver a note to the wrong user or the wrong course member. That is a permission-integrity problem, not just a UI bug, so CI should emphasize access-control tests, integration smoke checks, and review evidence that shows the right subject, course, and recipient were exercised.

## Commit-Level Checks

These should run on every push and every PR commit.

- Typecheck the client and server.
- Run unit tests that cover permission helpers, note-sharing rules, and recipient selection.
- Run a targeted build or startup check so the app still compiles after permission changes.
- Run the new `ci.yml` workflow draft against the affected branch to prove the basic pipeline is healthy.

## Check Matrix

| Stage | Check | Advisory or Blocking? | Why? | Evidence Produced |
|---|---|---|---|---|
| Commit | build/startup check | blocking | catches obvious breakage quickly | build log |
| Commit | stable permission unit tests | blocking | fast and high-signal for wrong-recipient bugs | test result |
| PR | integration smoke test for note sharing | blocking | proves the share flow works for the intended user and course member | test report |
| PR | exploratory UI checks for edge cases | advisory | useful for review, but not stable enough to block merge | reviewer note |
| Release | feature workflow test in staging | blocking | validates the user-visible path before promotion | release evidence |
| Release | permission audit of share targets | blocking | confirms the release path does not leak notes across users or courses | audit log |

## Pull-Request Checks

These should run before merge and produce evidence reviewers can inspect.

- Critical permission tests that verify the sender, recipient, and course membership checks reject cross-course or cross-user leakage.
- Integration smoke checks for the share flow, including a positive path and at least one negative path.
- API-level checks that confirm the backend stores and resolves the share target correctly.
- A short PR evidence note that names the test cases and states which identities were used.

## Release-Readiness Checks

These are reserved for the release branch or a pre-release promotion job.

- Full build and packaged artifact validation.
- End-to-end smoke test against a deployed preview or staging environment.
- Manual review of permission-sensitive changes when the sharing surface or authorization model changes.
- Log and metric review for share failures, rejected requests, and unexpected recipient lookups.

## Advisory vs Blocking Gates

### Blocking

- Permission regression tests for cross-user and cross-course access.
- Integration smoke checks for the share endpoint and UI path.
- Typecheck and build success.
- Any test that shows the wrong recipient can receive a note.

### Advisory

- Broader lint warnings that do not affect authorization logic.
- Documentation and changelog reminders.
- Extra exploratory checks for edge cases outside the share path.
- Release note wording that depends on product timing.

## Draft Pipeline Outline

```text
on: pull_request, push to main, workflow_dispatch

jobs:
  ci:
    checkout
    setup Node runtime
    install dependencies
    run typecheck
    run unit and integration tests
    run build or startup check

  permission-smoke:
    run critical permission tests
    run note-sharing integration smoke checks
    upload PR evidence summary

  release-readiness:
    only on release branches or tagged promotion
    run full build artifact check
    run staging smoke test
    record approval evidence
```

## Operational Risk Note

**Risk:**
Sharing tests may pass in CI while still using stale fixture identities or an overly broad mock that does not match real course membership rules.

**Why it matters:**
- It can create false confidence, allowing a permission bug to reach users and expose notes to the wrong recipient.

**Control:**
- Use at least one integration smoke test with realistic user and course fixtures, and require a reviewer-visible evidence note that names the identities and expected recipient.

**Owner:**
- The backend owner for authorization logic, plus the reviewer approving the share feature.