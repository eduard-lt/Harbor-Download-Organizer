# Release checklist and current status

## 2.2.0 - release validation

This version adds reliability fixes, Windows branding/startup repair, folder selection,
preview, rule import/export, activity search and guarded undo. It removes the legacy
Windows tray/install paths and consolidates obsolete documentation.

Signing credentials are not available. Candidates are unsigned on Windows and ad-hoc
signed on macOS; Apple notarization is not configured. The workflow creates a **draft
prerelease**, not a public release. Signing and native acceptance must be resolved or
explicitly accepted before an official release.

The public release version is **2.2.0**. Version 2.2.1 was used only for local
upgrade tests and an unpublished candidate; that draft and tag are superseded.
Historical test results below retain the version actually tested. Both installers
must be rebuilt from the corrected 2.2.0 tag.

## Windows regression follow-up (2026-10-04)

Actual login startup and unattended upgrade acceptance remain pending. The user accepted
the WebView2 Task Manager grouping limitation for this release on 2026-10-04.
The current user's Run entry was valid when inspected; the exact deleted legacy key
from the reported failure is unknown, so the original incident is not reproduced.

The installer now snapshots the presence of Harbor/HarborTray before running an old
uninstaller, then invokes the newly installed executable in registry-only maintenance
mode. This runs even without launching the GUI. Existing startup preference and raw
StartupApproved bytes are retained; legacy HarborTray is consolidated into Harbor.
Fresh installs without a startup registration remain opted out. Windows startup
migration tests use disposable HKCU fixtures, never production startup keys.

NSIS is the sole Windows distribution format. Tauri's existing MSI detection/uninstall
flow remains for migrations (an old machine-wide MSI may still need administrator
approval). Silent MSI-to-NSIS migration has not been claimed tested.

The NSIS template is vendored from Tauri tauri-cli-v2.11.5 under its MIT license.
Harbor invokes HARBOR_CAPTURE_STARTUP at the beginning of .onInit,
before interactive/passive/silent uninstall paths, and always forwards /UPDATE to the old
NSIS uninstaller when replacing it (preserving startup and user data). Keep these changes when refreshing
the template. Hooks implement the post-install repair; do not move capture to PREINSTALL,
which runs after the old uninstaller and can be too late.

Harbor now sets its explicit Windows application identity before creating windows.
Native inspection of installed 2.2.1 still showed **WebView2 Manager (6)** in Task
Manager. The identity change does not resolve this accepted cosmetic limitation. The Microsoft
grouping issue remains open.

The user completed removal of the old app and installation of 2.2.1 after the old
uninstaller was inaccessible to automation. All 11 rules survived; monitoring was
restored after testing. The installed executable reports version 2.2.1 and description
Harbor. Its quoted HKCU Run command points to the installed executable with
`--minimized`, StartupApproved is enabled, and no HarborTray Run entry remains.
The installed registry-only maintenance command exited successfully and preserved the
registration, leaving one Harbor process. This user-assisted replacement is not proof
of an unattended in-place upgrade. Actual Windows sign-out/sign-in remains untested.

The final rebuilt installer additionally forwards `/UPDATE` on every installer-driven
NSIS removal. This installer-only change was made after the user-assisted installation;
the application binary is unchanged. Its complete replacement flow still needs native
acceptance.

Follow-up checks passed: 102 Rust unit/regression tests plus one documentation test,
235 frontend tests, strict Clippy, version consistency and the four-case NSIS startup
capture harness. The PowerShell harness parsed successfully; local execution policy
blocked running the script directly, so its NSIS harness was compiled and executed
separately. CI runs the checked-in PowerShell harness after bundling.

## Final branch review (2026-10-04)

Local verification passed: 102 Rust tests plus one documentation test, 235 frontend
tests, 25 Chromium E2E tests, all four coverage gates, strict Clippy, Rust formatting,
ESLint and npm audit (zero vulnerabilities). The Windows NSIS bundle was rebuilt.
Remote CI and release packaging must pass on the exact proposed commit before
publication; native acceptance gaps below remain explicit.

## Automated checks

Run all commands in CONTRIBUTING.md and `python tools/version.py check`. Release
packaging depends on the reusable CI workflow: format, frontend lint/build/tests/
coverage/browser E2E/npm audit, Windows and macOS Rust tests/Clippy, cargo-audit and fuzz.
Rust dependencies are locked. Windows candidates use only the per-user NSIS .exe installer; macOS is
built with the universal target and both Rust architectures installed.

Validated on Windows for the 2.2.0 candidate:

- Rust: 101 unit/regression tests plus one documentation test passed, all features enabled.
- Frontend: 235 tests and 25 Chromium browser tests passed. Browser tests mock native IPC.
- Coverage includes all application TypeScript: 76.04% statements, 71.20% branches,
  71.72% functions, 78.70% lines; all four 70% gates passed.
- Rustfmt, strict Clippy, ESLint, production frontend build and version consistency passed.
- npm audit: zero vulnerabilities. Cargo audit: no vulnerability entries, seven upstream
  informational advisories (six maintenance notices and glib 0.18.5 unsoundness on the
  unsupported Linux dependency path). The event-listener advisory was resolved by update.
- Unsigned Windows NSIS and MSI installers built successfully with locked dependencies.
- Settings preview and undo-confirmation UI checked at the minimum 1000 x 700 viewport.
- Workflow YAML parsed locally. GitHub Actions, Linux fuzzing and universal macOS packaging
  have not been executed from this Windows session.

Those results are the earlier 2.2.0 baseline. The 2.2.1 installation and follow-up
checks are recorded above. Real sign-in startup, complete installer upgrade/uninstall
flows, native dialogs and macOS acceptance still require the checks below.

## Native acceptance before publication

- Fresh Windows NSIS installs; upgrades from older NSIS and discontinued MSI installations.
  Ensure config/rules survive. Check uninstall
  behavior and retained user data explicitly.
- Enable/disable login startup in Harbor and Task Manager, then actually sign out/in.
  Verify minimized launch, one process and correct tray/window/installer icons.
- Relocated Downloads and a selected external folder; disconnect/reconnect that folder.
  Check visible scan errors and recovery, locked/read-only targets and partial downloads.
- Preview and execute known rules; test conflicts, cross-volume copies and symlinks.
  Undo unchanged files; ensure changed-file/source-collision refusals preserve all files.
- Pause, rapid rule edits, duplicate app launch and quit during a large transfer.
  Confirm shutdown waits and no replacement worker starts while a join is pending.
- Failed config save, invalid YAML, backup restore, reset, imported invalid rules and
  imported cross-platform destination paths.
- macOS: Intel and Apple Silicon, minimum supported OS, folder permissions, login-item
  approval, menu bar, Cmd+Q/Cmd+W, icon fallback, and eventual signing/notarization.

## Known platform constraints

Windows Task Manager may group child processes under WebView2 Manager. Harbor's own
executable metadata is correct; this is the unresolved upstream grouping report
[WebView2Feedback #5628](https://github.com/MicrosoftEdge/WebView2Feedback/issues/5628).
Renaming Microsoft's runtime is not a supported fix.

The dependency audit can report maintenance advisories in upstream Tauri dependencies.
Undo checkpoints each restored file; a crash can leave a partially restored batch. It
refuses ambiguous retry state rather than overwriting files. It is not a full backup.

Review the actual dependency target and affected APIs; do not equate a zero exit code
with an absence of informational advisories. Linux is not a supported release platform.

## Publishing

Commit reviewed changes, confirm versions agree and complete native acceptance. A new
`v2.2.0` tag or manual release-workflow dispatch builds candidates. Tag runs prepare a
draft prerelease with installers; review its contents before publishing. No credentials
belong in the repository. Add signing through protected repository secrets once Windows
and Apple Developer certificates are available; validate signed artifacts separately.

Deferred scope: multi-folder monitoring, Linux support and notification customization.
