# Initial Requirement Set

**Living implementation and traceability:** [GitHub: victorbuenog/AstraNotes](https://github.com/victorbuenog/AstraNotes) · [`refined_requirements.md`](./refined_requirements.md) · [`requirements.md`](./requirements.md).

## Functional requirements

1. **Create, edit, archive, and permanently delete notes**  
   The system shall allow users to create and edit notes written in Markdown, persisting changes locally in near real time. Users shall be able to **archive** a note (hide it from the default list while retaining it in storage; archived notes remain viewable in a dedicated archive view) and **unarchive** to restore it to the main list. Users shall be able to **delete** a note **permanently**, which removes the note from the database and **cannot be undone**.

2. **Organize and search thousands of notes**  
   The system shall allow users to tag notes, group them into notebooks or folders, and perform full-text and filtered search (by tag, date, plugin type, etc.) over at least 10,000 notes with results returned in under 500 ms on typical hardware.

3. **Markdown rendering and preview**  
   The system shall render Markdown into a formatted preview (headings, lists, code blocks, images, links) and allow toggling between raw Markdown and rendered view.

4. **Plugin-based note types (Text, Voice, Secure)**  
   The system shall support a plugin architecture where each plugin defines its own note type (e.g. Text Note, Voice Note, Secure Note), including input UI, storage schema, and rendering behavior.

5. **Voice note capture and playback (Voice plugin)**  
   The system shall allow users to record audio notes, store them locally as voice notes via the Voice plugin, and play them back in the application.

6. **End-to-end encrypted secure notes (Secure plugin)**  
   The system shall allow Secure Notes whose content is encrypted at rest using a key derived from a user-provided passphrase and decrypted only in memory when the user opens the note.

7. **Cross-platform data portability**  
   The system shall support exporting and importing the full note database (metadata and plugin-specific data) in a documented format so notes can move between supported platforms without data loss.

8. **Conflict-free local-first sync (optional / extendable)**  
   The system shall support a local-first model where notes are always available offline and can later sync with a remote backend or file store, resolving conflicts deterministically (e.g. versioning or CRDTs).

## Non-functional requirements

1. **Performance and scalability**  
   Average latency under 200 ms for open, edit, and save of individual notes; under 1 second for search over at least 10,000 notes on a mid-range laptop (e.g. 4 cores, 8 GB RAM).

2. **Cross-platform support**  
   Run natively (or via a common runtime) on at least three platforms (e.g. Windows, macOS, Linux) with consistent UX and features.

3. **Extensibility of plugin architecture**  
   Expose a documented plugin interface (APIs, lifecycle hooks, data contracts) so new note-type plugins can be added without changing core application code.

## Security, privacy, reliability, and governance

1. **Local-first encryption and key handling**  
   Store Secure Note content only in encrypted form on disk using authenticated encryption (e.g. AES-GCM). Derive keys from user credentials; never store keys in plaintext; hold keys in process memory only as long as needed for decryption.

2. **Least-privilege plugin sandboxing**  
   Run plugins in a restricted context so each plugin accesses only note data and system resources granted by the plugin API, preventing arbitrary filesystem or network access unless the user explicitly allows it.

3. **Data integrity and backup**  
   Implement periodic local backups and integrity checks (e.g. checksums or hashes) on the note store so corruption can be detected and users can restore from recent backups.

4. **Auditability and configuration governance**  
   Log security-relevant events (e.g. failed decryption, plugin install/remove, encryption setting changes) in a local audit log, and provide a configuration view to review and manage installed plugins and security settings.
