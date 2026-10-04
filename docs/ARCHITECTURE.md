# Architecture

Harbor has three crates: `core` (file organization/configuration/platform paths),
`tauri-app` (desktop host and IPC), and `cli` (optional headless downloads commands).
React lives in `packages/ui`. Tauri owns the only desktop tray and startup implementation.
The removed native Windows tray and standalone installers remain in Git history.

## Configuration

`core::config::save` stages and syncs YAML, preserves the previous valid file, then
atomically replaces the live file. The desktop state's configuration transaction
holds an exclusive lock, edits a candidate and publishes it only after saving succeeds.
Failed CRUD/settings saves do not change the configuration seen by monitoring.
Malformed startup configuration is surfaced and blocks operation until recovery.

## File operations

The core scanner shares eligibility/rule selection between preview and organization.
It ignores symlinks/directories, partial downloads, empty files and files younger than
the configured age. Regex/size modifiers affect priority. The first matching rule
wins. Destination publication refuses replacement; cross-volume copies use staging
and verify source size/mtime before deleting the source.

The desktop operation gate serializes organizing, its undo journal, preview and undo.
The journal records source, destination and SHA-256 content checksums for the last
nonempty batch. Undo preflights checksums and source collisions, restores without
replacement and checkpoints after each restored item. It pauses monitoring first.
If journaling fails after a move, the operation reports that undo is unavailable.
Text activity logs are not used to infer undo operations.

## Monitoring and shutdown

The worker starts in Tauri setup, after single-instance ownership is established.
It reads current rules between passes. Configuration edits no longer restart the
worker merely to refresh rules. Lifecycle transitions are serialized; pending joins
cannot be cleared by another stop or replaced by a new worker. Cancellation is checked
between files; a copy already underway is allowed to finish safely. Quit signals stop,
waits for worker/manual file work, and only then exits.

Polling failures and recovery are persisted in Activity and exposed through service
status. An active worker and a healthy scan are distinct states. Config reload and
explicit reset are recovery operations; reset stops monitoring first.

## Platform integration

Windows resolves Downloads through the shell Known Folder API. Folder selection is
also exposed in Settings. Login registration is quoted, repaired after path changes
and respects StartupApproved during migration. macOS uses SMAppService and preserves
legacy login registration data during migration; that is user-data compatibility,
not an additional legacy application implementation.

React contexts own service/startup/update state. Action failures remain visible across
status refreshes. Manual and automatic update checks share one implementation.
Activity search/filtering happens before pagination. Existing text move records remain
readable; structured monitoring/undo events are recorded as JSON lines in the same log.

## Test boundaries

See [CONTRIBUTING.md](../CONTRIBUTING.md) for commands and [RELEASE.md](RELEASE.md)
for measured results and native checks. Windows checks cannot establish macOS runtime
behavior. Mocked browser E2E cannot establish registry, installer or real-file behavior.
