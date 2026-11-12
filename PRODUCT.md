# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Harbor is a Tauri 2 desktop app (Windows and macOS). The UI is a React web view inside a native window.

## Users

Everyday people first. They have a messy Downloads folder and want to set Harbor up once and forget it. Most of the time Harbor runs in the tray or menu bar, and they open the window only to check what happened or to change a rule.

Power users second. They write regex patterns and size limits, read the activity log, and import or export rules. Advanced matching must be available without getting in the way of the everyday path.

## Product Purpose

Harbor watches one folder, normally Downloads. It moves new files into destination folders based on ordered rules (extension, filename pattern, size). Success means the user's Downloads folder stays tidy without them thinking about it, and they trust Harbor never to lose or overwrite a file.

## Positioning

- Free and open source (MIT), with no account and no paywall.
- Safe by design: preview before moving, never overwrites an existing file, skips partial downloads, and can undo the last batch after checking file contents.
- Cross-platform: the same app and rules on Windows and macOS.
- Set and forget: sensible default rules out of the box and quiet background monitoring.

## Operating Context

- The app usually starts minimized at login and lives in the tray or menu bar. Closing the window keeps it running; Quit exits.
- Main areas: Rules, Activity, Settings, and Info & Guide (User Guide and About).
- Changing the watched folder, importing rules, or undoing a batch pauses monitoring until the user turns it back on.
- Configuration is a YAML file in the app data folder, with a `.bak` backup. Invalid configuration pauses Harbor and shows a recovery message.

## Capabilities and Constraints

- Rules: name, extensions, optional regex pattern, optional min/max size, destination folder, optional symlink at the original location, and an enabled toggle. Ordered; rules with a pattern or size condition take priority, then order breaks ties.
- Activity: search, status filters (moved, skipped, failed), and background failures.
- Settings: watched folder, preview moves, organize now, undo the last batch, import/export rules, monitoring control with diagnostics, theme (light/dark/system), reduce transparency, window-size presets, launch at login, update checks, config reload, factory reset.
- Keep the native OS window frame and title-bar controls.
- Must work at the minimum window size of 1000×700, as well as at larger presets.
- Fonts, icons, and images ship with the app. Nothing loads from a CDN at runtime, and the existing CSP stays.
- Builds are currently unsigned.

## Brand Commitments

- Name: Harbor.
- The user asked for a glassy look with a water, beach, sand, and harbor feel. It must not look childish: the first concept was rejected for a cartoon scene, a rainbow of icon colours, and nautical puns in the copy.
- Logo: keep the existing "H" mark (`assets/Harbor.icon`). Alternatives were explored and declined.
- Voice: plain and direct. No nautical puns in interface copy.

## Evidence on Hand

- Current UI screenshot: `assets/UI/rules_mangement.png`.
- Logo sources: `assets/Harbor.icon`, `assets/harbor.svg`.
- No user testimonials, download counts, or press exist. Do not invent any.

## Product Principles

1. Trust comes first: every move can be previewed, explained, and undone.
2. Quiet by default: Harbor works in the background and asks for attention only when something needs a decision.
3. Simple path first, power on demand.
4. The same experience on Windows and macOS.

## Accessibility & Inclusion

Keyboard operable throughout, with visible focus. Respect reduced motion and a Reduce transparency setting. Keep text contrast readable on glass surfaces in both themes.
