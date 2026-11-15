# Harbor Control Deck redesign

Status: first implementation checkpoint completed on `control-deck-redesign` (renamed by the user); remaining stages are pending.

## Implementation progress

- Completed: locally bundled Manrope (including extended language subsets and OFL license), shared macOS-source web logo/favicon, horizontal navigation with monitoring and update controls, semantic glass tokens/fallbacks, compact Rules summary/rows and expandable full destinations, persistent Reduce transparency setting, and page scroll reset on navigation.
- Activity, Settings, and Info now use the shared shell and page spacing; their detailed redesign and the dialog/icon migration remain pending.
- The web logo is now an output of the existing shared icon export script. Remaining native compatibility assets, docs branding, and installer checks are pending.
- Validation: frontend build and lint passed; 236 unit tests passed with coverage above the repository gates. All 25 existing Chromium E2E cases passed; the new compact-window appearance/persistence test also passed after correcting its accessible-name selector. Light/dark Rules screenshots were visually inspected at 1000×700. Follow-up Layout/Sidebar tests passed after fixing retained page scroll.
- The user confirmed the first checkpoint builds on macOS. Native Windows packaging/smoke checks, WebKit coverage, and visual verification of subsequent native title-bar changes remain pending. This checkpoint is not full-plan completion.

### First feedback pass

- Replace brown accents and amber illumination with blue-teal accents and cool sky illumination. Enabled switches use a brighter blue-teal fill.
- Support actions use a coffee mug; the toolbar explicitly labels the action “Buy me a coffee.”
- Match native title-bar color to the app canvas while preserving native controls: transparent macOS title-bar styling with an opaque window background; custom Windows caption/text/border colors on supported systems, with native theme fallback on older Windows.
- Keep a rounded focus ring on the visible switch and suppress the hidden input's rectangular outline. Preserve keyboard accessibility.
- Native appearance follows explicit and system theme changes. Rust workspace tests, Clippy, and formatting pass on Windows; native macOS visual verification is still required for this change.

## Approved direction

Use the approved Control Deck glass concept across the existing desktop app: compact horizontal navigation, frosted chrome, restrained teal/blue ambient light, fine highlights, calm data surfaces, and Manrope typography. Keep all existing capabilities and persisted settings. The concept's sample data and decorative anchor are not production content or branding.

## Design decisions

- Bundle Manrope WOFF2 and its license locally. Use weights 400–700, with system sans-serif fallback. Keep monospace for exact paths, regex, and diagnostics only. No runtime font CDN or CSP relaxation.
- Define semantic light/dark tokens for canvas, glass, solid surfaces, text, borders, focus, brand, success, warning, and danger. Preserve Light/Dark/System selection and native title-bar theme synchronization.
- Use static teal/blue background illumination under a few blurred surfaces. Keep repeated rows and reading/form surfaces substantially opaque. Avoid blur on each row, animated background blobs, or animated blur.
- Provide opaque CSS fallback when backdrop filtering is unavailable. Offer a persisted Reduce transparency setting; honor reduced motion and platform transparency preferences where exposed. Keep controls and focus indicators legible in every mode.
- Use one consistent bundled SVG icon family for interface actions, separate from Harbor's app logo. Do not keep mixed Material icon fonts and SVG conventions.
- Retain native Windows and macOS window decorations. This pass uses in-app frosted glass; desktop wallpaper transparency/native vibrancy is outside this pass.

## Implementation sequence

### 1. Brand and design foundations

Use `assets/Harbor.icon` and its original H artwork as the single brand source. Extend the existing export workflow instead of creating a new logo. Produce matching web SVG/PNG, multi-resolution PNG/ICO, and compatible ICNS assets. Keep the existing Apple asset catalog for supported macOS rendering; derive static exports from the same design for other surfaces.

Inventory and update UI shell, About, onboarding, browser favicon, window/taskbar/Dock icons, tray/menu-bar icons, installers, and repository-owned docs/site branding. Replace the Vite favicon and docs anchor. Use the same H silhouette as a monochrome macOS menu-bar template where required for visibility. Do not change historical screenshots silently; refresh relevant current screenshots after implementation. Check for live references before removing legacy assets.

Primary locations: `assets/`, `tools/icon_windows.py`, `tools/icon_macos.py`, `crates/tauri-app/icons/`, `crates/tauri-app/tauri.conf.json`, native tray setup, `packages/ui/public/`, `packages/ui/index.html`, and `docs/index.html`.

Create semantic CSS tokens and reusable button, input, toggle, panel, badge, dialog, and feedback styles/components. Keep visual concerns out of service and file-organization logic.

### 2. Shared shell and navigation

Refactor `Layout`, `Header`, and `Sidebar` into the Control Deck shell. Include all four destinations: Rules, Activity, Settings, and Info & Guide. Keep monitoring status and its toggle reachable on every page, including paused, loading, degraded, and error states. Preserve update indicators and access to GitHub/support links.

Use a frosted navigation bar, bounded content width, and one deliberate page scrolling region. Reflow navigation at compact sizes rather than clipping controls. Keep native title-bar controls separate from app interactions. All pages share spacing, headings, action placement, and loading/error presentation.

### 3. Rules and Activity

Rules: replace large duplicate counters with a compact active/total summary and real monitored-folder context. Use compact ordered rows with a type icon, name, readable extension summary, destination, enable toggle, and accessible edit/delete actions. Preserve pointer reordering and explicit keyboard-operable ordering controls. Show complete extension lists and exact destinations through accessible details; avoid hover-only information. Preserve search, first-match priority, CRUD, validation, and confirmations.

Activity: use a compact chronological list with date groups, filename emphasis, clear source-to-destination paths, timestamps, and distinct status labels. Preserve search, filtering, refresh, failure groups, and existing diagnostic details. Display simplified paths without altering underlying full paths or making them inaccessible. Include empty, loading, error, and long-content states.

### 4. Settings

Organize the current settings into readable sections:

- Files and rules: monitored folder, folder picker, preview moves, organize now, undo last batch, import/export.
- Monitoring: service control, lifecycle state, recovery action, and accessible diagnostics including PID and uptime.
- Appearance: Light/Dark/System previews, Reduce transparency, and existing window-size presets.
- Startup and updates: launch at login, automatic checks, manual checks, available-update actions and errors.
- Advanced: configuration reload and clearly separated factory reset.

Preserve dry-run guarantees, undo safeguards and pause behavior, confirmation dialogs, organization result/failure details, and all busy/disabled states. Improve hierarchy without concealing consequential actions behind ambiguous menus.

### 5. Info, About, and secondary surfaces

Retain User Guide/About tabs. Make the guide a concise Download → Match → Organize explanation with rule-priority, destination, extension, and advanced-matching guidance aligned to actual behavior. Give About the shared logo, actual package version, project/support links, and update states.

Apply the same design to rule create/edit dialogs, regex/size validation, delete/reset confirmations, tutorial/onboarding, quit feedback, file preview/undo/import/export results, notifications, and recovery states. Preserve focus trapping/restoration, Escape handling, native folder dialogs, and accessible labels.

### 6. Cross-platform validation and polish

Verify the existing logical window presets: 1000×700, 1400×900, and 1600×1000; also check maximized windows, Windows display scaling, and macOS Retina rendering. Test long Windows drive/UNC paths, macOS POSIX paths, Unicode filenames, and large extension lists without layout clipping.

Run frontend build, lint, and existing unit/coverage and E2E suites. Update assertions affected by intentional navigation changes; add behavioral coverage for new appearance preferences, accessible navigation, and preserved critical flows rather than testing CSS implementation details. Add WebKit browser coverage alongside Chromium for rendering differences; browser tests use mocked Tauri APIs and are not native acceptance tests.

Run repository-required Rust checks and native packaging checks as applicable. Smoke-test a Windows build on Windows and a macOS build on a Mac, including navigation, native dialogs, tray/menu bar, startup, window theme/size restoration, app icons, and file-management workflows using disposable test files. macOS Icon Composer catalog regeneration requires a Mac with Xcode 26+; preserve the verified catalog unless regeneration is needed. Check macOS 15 compatibility assets as well as current macOS icon rendering.

Record native macOS checks as pending until executed on a Mac; do not claim cross-platform acceptance from browser emulation. No publishing or release is included in this UI pass.

## Completion criteria

- Every page and secondary surface follows the approved Control Deck glass direction in light, dark, and reduced-transparency modes.
- Manrope and all visual assets load offline under the existing CSP.
- Every active brand surface uses the macOS-source identity; platform exports remain legible at small sizes.
- Existing operations and safeguards remain intact; no settings/configuration migration loses user data.
- Keyboard navigation, visible focus, readable contrast, and long-content layouts work at supported window sizes.
- Relevant automated checks pass, and native Windows/macOS verification results are explicitly recorded.

## Review checkpoints

First review: brand, fonts, shared shell, and Rules. Second: Activity and Settings. Final: Guide/About, dialogs, platform verification, and refreshed screenshots. Implement in this order so shared styling is established before migrating all screens.
