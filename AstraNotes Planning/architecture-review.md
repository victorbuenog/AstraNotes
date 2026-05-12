---
aliases:
  - Architecture Review
  - Maintainability Review
tags:
  - astranotes
  - planning
  - architecture
  - maintainability
---

# AstraNotes Architecture Review

> [!info] Related notes
> Home: [[README]]
> Requirement context: [[refined_requirements]] · [[prd]]
> Design context: [[astranotes-design-document]] · [[uml_traceability_validation]]
> Governance context: [[governance_ethics_memo]]

## Scope

This review covers the current runtime code in `src/` and `server/`. It focuses on:

- model, view, and controller responsibilities
- coupling and overlap between modules
- maintainability risks and likely refactoring seams

It intentionally excludes planning docs, tests, config-only files, and `*.d.ts` declaration files.

## Executive summary

AstraNotes only partially matches classic MVC. The codebase is most accurately described as:

- a React SPA with context-based state and orchestration
- a client-side crypto and API layer that crosses model and controller concerns
- a thin Express + SQLite backend with route handlers that also embed validation and persistence rules

The strongest maintainability risks are concentrated in a few hotspot files rather than spread evenly across the project. That is good news: a relatively small number of targeted refactors would remove most of the current change coupling.

## MVC responsibility map

### Model

These modules primarily define data shape, persistence rules, crypto behavior, export/import formats, preferences, or storage infrastructure.

- `src/types/note.ts`
- `src/types/noteWire.ts`
- `src/types/tags.ts`
- `src/search/noteSearch.ts`
- `src/crypto/vault.ts`
- `src/vault/exportFormat.ts`
- `src/vault/noteMarkdownExport.ts`
- `src/preferences/privatePin.ts`
- `src/preferences/deleteConfirm.ts`
- `src/preferences/editorAppearance.ts`
- `src/errors/AppError.ts`
- `src/errors/codes.ts`
- `server/db.ts`
- `server/journalMode.ts`

### View

These files are primarily presentational and mostly render state that is passed in from props or context.

- `src/components/BlockPreview.tsx`
- `src/components/ErrorBanner.tsx`
- `src/components/PasswordInput.tsx`
- `src/index.css`

### Controller

These files mostly coordinate startup, state transitions, environment sync, or interaction rules without being the main home for domain data.

- `src/main.tsx`
- `src/context/AuthContext.tsx`
- `src/context/ThemeContext.tsx`
- `src/hooks/useDebouncedCallback.ts`
- `src/utils/markdownListEnter.ts`

### Mixed / cross-layer

These files span multiple layers and are the main reason the app does not fit strict MVC cleanly.

- `src/App.tsx`
- `src/api/client.ts`
- `src/context/NotesContext.tsx`
- `src/components/AuthScreen.tsx`
- `src/components/UnlockScreen.tsx`
- `src/components/Sidebar.tsx`
- `src/components/NoteEditor.tsx`
- `src/components/SettingsMenu.tsx`
- `server/app.ts`
- `server/index.ts`

### Why the app is not strict MVC

The frontend is closer to React plus Context state containers than classic MVC. In particular:

- `AuthContext` and `ThemeContext` behave like lightweight controllers/stores.
- `NotesContext` behaves like a combined controller, service layer, and application state store.
- `src/api/client.ts` is not just a transport wrapper; it also encrypts, decrypts, migrates, and maps errors.
- `server/app.ts` is not only a controller layer; it also validates requests, mutates sessions, and talks directly to SQLite.

## Coupling, overlap, and maintainability risks

### 1. `NotesContext` is a frontend god-provider

**Severity:** High

`src/context/NotesContext.tsx` currently owns too many concerns in one place:

- note loading and saving
- autosave and flush behavior
- selected note state
- archived/search/tag filter state
- private vault open/closed state
- PIN setup/reset behavior
- import/export flows
- global note-related error state

This creates two major problems:

1. unrelated features are coupled together, so changing import/export, private vault behavior, or autosave often requires touching the same file
2. many consumers rerender from one broad provider contract, which increases blast radius for small changes

**Modules involved:**

- `src/context/NotesContext.tsx`
- `src/App.tsx`
- `src/components/Sidebar.tsx`
- `src/components/NoteEditor.tsx`
- `src/components/SettingsMenu.tsx`
- `src/components/ErrorBanner.tsx`

**Suggested boundary:**

Split it into at least:

- a notes data/repository layer
- a notes view-state layer for selection and filters
- a private-vault/PIN layer

### 2. `server/app.ts` is a backend god-module

**Severity:** High

`server/app.ts` currently combines:

- route registration
- session configuration
- auth checks
- request validation
- response shaping
- direct SQL queries
- ownership checks

This works for a small app, but every new endpoint is more likely to duplicate validation or forget a rule that currently exists only in one route handler.

**Modules involved:**

- `server/app.ts`
- `server/db.ts`

**Key structural risk:**

The schema makes note ids globally unique:

- `notes.id TEXT PRIMARY KEY`

Ownership is then enforced in route logic instead of primarily in the schema. That means tenancy rules are partly structural and partly conventional. Future write paths could accidentally bypass those expectations.

**Suggested boundary:**

Split backend responsibilities into:

- `authRouter`
- `notesRouter`
- validator helpers
- repository/service functions

Also consider moving note tenancy into the schema more directly, for example with a composite uniqueness rule tied to `user_id`.

### 3. `api/client.ts` mixes too many layers

**Severity:** High

`src/api/client.ts` is doing all of the following:

- fetch setup and credentials handling
- HTTP status to `AppError` mapping
- auth endpoint logic
- encrypted note decoding
- encrypted note encoding
- legacy note migration handling

That makes transport behavior tightly coupled to crypto behavior and model migration. It also makes the file harder to reuse and harder to test in isolation.

**Modules involved:**

- `src/api/client.ts`
- `src/crypto/vault.ts`
- `src/types/note.ts`
- `src/types/noteWire.ts`

**Suggested boundary:**

Split it into:

- `httpClient`
- `authApi`
- encrypted note wire codec
- notes repository that depends on a `Vault`

### 4. Auth and vault bootstrap logic is duplicated

**Severity:** Medium

The logic for session readiness and vault readiness is spread across multiple places:

- `src/components/AuthScreen.tsx`
- `src/components/UnlockScreen.tsx`
- `src/context/AuthContext.tsx`
- `src/App.tsx`

This creates drift risk because login, register, session recovery, and first-time encryption metadata setup are not owned by a single orchestration layer.

**Likely maintenance cost:**

- behavior differences between sign-in and unlock flows
- repeated fixes in more than one screen
- extra complexity when adding password reset, session refresh, or account migration logic

**Suggested boundary:**

Create a single auth/vault session service or hook responsible for:

- `registerAndBootstrap`
- `loginAndBootstrap`
- `resumeSessionAndUnlock`
- `logoutAndLock`

### 5. Selection and visibility rules are distributed

**Severity:** Medium

The app has an implicit rule that the selected note should stay compatible with current visibility state, including:

- archive filter
- search query
- tag filter
- private vault open/closed state

Today those rules are spread across:

- `src/context/NotesContext.tsx`
- `src/components/Sidebar.tsx`
- `src/App.tsx`

That makes it easier to introduce edge cases such as:

- a selected note that is no longer visible
- surprising jumps in selection after a filter or private-vault transition
- empty editor states that are hard to reason about

**Suggested boundary:**

Centralize selectors and transitions such as:

- `visibleNotes`
- `selectedVisibleNote`
- `togglePrivateVault`
- `selectNextVisibleNote`

## Overlap to watch

The app does not only have large files; it also has duplicated ownership in a few areas.

### Modal and interaction management

`Sidebar` and `SettingsMenu` both implement their own modal lifecycle, backdrop behavior, Escape handling, and click-outside logic. That duplication is manageable now, but it can drift over time as the number of dialogs grows.

### Import/export flow ownership

Import/export behavior is split between `SettingsMenu` and `NotesContext`. The UI owns file picking and confirmation flow, while the context owns parsing and persistence. That is workable, but the boundary is not especially sharp.

### Auth-to-vault transition ownership

`App`, `AuthScreen`, and `UnlockScreen` all participate in the transition from authenticated session to unlocked vault. That makes readiness state harder to reason about than it needs to be.

## Recommended refactor order

If the goal is to reduce risk with minimal churn, the best order is:

1. Split `src/api/client.ts` by concern.
2. Extract notes persistence and save/load behavior from `src/context/NotesContext.tsx`.
3. Move notes selection/filter logic behind dedicated selectors or a reducer-like state module.
4. Introduce a single auth/vault session orchestration layer.
5. Break `server/app.ts` into routers, validators, and repository/service helpers.

## Bottom line

The current architecture is still understandable, but it is maintained through a handful of high-coupling hubs:

- `src/context/NotesContext.tsx`
- `src/api/client.ts`
- `server/app.ts`

Those files are the best candidates for near-term architectural cleanup. Refactoring them would reduce overlap, make the app easier to test and extend, and lower the chance that unrelated features regress each other during future changes.
