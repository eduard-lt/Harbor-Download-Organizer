---
version: 1
slug: "packages-ui-src"
primary_target: "packages/ui/src"
related_targets: []
---

# Harbor desktop app UI

Scope: every screen in `packages/ui/src` (Rules, Activity, Settings, Info & Guide, dialogs, onboarding, toasts). Visitor mode: Operate.

Audience and task: everyday users first, power users second (see PRODUCT.md). Visits split evenly between checking what moved and editing rules, so neither Rules nor Activity dominates the shell.

Constraints: native window frame; works at 1000×700; fonts and icons bundled offline under the existing CSP; Reduce transparency and reduced motion honoured; light and dark themes.

Logo: keep the existing Harbor "H" mark (decided after reviewing alternatives on the canvas).

Must not feel: childish (no cartoon scenery, toy colours, puns), generic SaaS, dark-and-techy, or glass that hurts reading.

Reference: the Control Deck shell from commit `43d11b1` (horizontal frosted nav merged with the native title bar), which the user prefers over the sidebar layout. The concept canvas https://claude.ai/artifact/MBVWgjhKqeTZah92Gk5zdR and `.impeccable/mocks/decision/model-pick.html` still set the backdrop, glass and type.

## Direction contract

THESIS: Control Deck with a glow-up: a calm native utility seen through frosted glass, with a bright shoreline blurred behind it. It refuses the category default of a grey sidebar plus card dashboard, a near-black "pro" look, and the earlier cartoon-harbour look.

OWN-WORLD: Backdrop of large, heavily blurred colour fields read as an aerial shoreline: sunlit sand bottom-left, turquoise shallows, sea-blue top-right. Light is airy and sunny; dark is a teal-blue dusk, never near-black. A frosted top bar (more transparent) above an opaque-leaning content sheet; tables and forms sit on near-solid surfaces. Sora, 14px body, 24px titles, weights 400–600. One sea-teal accent; muted state colours. Monochrome line icons, hairlines, 14px panel radius, 7–8px control radius.

STORY: The user sees at once whether Harbor is watching, where files went, and can change a rule or undo a batch without hunting.

FIRST VIEWPORT: Top, a frosted Control Deck bar merged with the native title bar (caption, border and canvas band share one colour on Windows and macOS): logo, four destination pills, a monitoring chip with its toggle, update, GitHub and support icons. Below, a content sheet: title with count, search, primary "New rule"; watched-folder strip with Preview and Organize now; ordered rules table; footer with last batch and Undo.

SIGNATURE MOVE: The shoreline backdrop carries monitoring state. Active: the tide is in and water reaches across the frame. Paused: the tide eases out, water draws back and sunlit sand widens, still in colour, a calm change of scene, never a grey-out. On first run, "off" is an invitation: the monitoring chip reads "Ready to start" with a Start monitoring button until the user starts. Errors tint only the monitoring chip. With Reduce transparency on, the same state appears as a top bar tint.

FORM: Shoreline Glass, position 1 on my ordered list (chosen as Impeccable's pick over the rolled Harbour Yard). seed:1c0c0058c5140051

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Native macOS rendering of the caption band under the transparent title bar is unverified (built and checked on Windows only).
