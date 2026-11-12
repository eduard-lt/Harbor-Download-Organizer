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

Reference: concept canvas https://claude.ai/artifact/MBVWgjhKqeTZah92Gk5zdR (Rules light, Activity dark, Settings, README banner) and the chosen sketch `.impeccable/mocks/decision/model-pick.html`.

## Direction contract

THESIS: A calm native utility seen through frosted glass, with a beach blurred behind it. It refuses the category default of a grey sidebar plus card dashboard, and the earlier cartoon-harbour look.

OWN-WORLD: Backdrop of large, heavily blurred colour fields read as an aerial shoreline: wet sand bottom-left, turquoise shallows, deep sea-blue top-right. Floating frosted sidebar (more transparent) beside an opaque-leaning content sheet; tables and forms sit on near-solid surfaces. Inter, 13px body, 20px titles, weights 400–600. One sea-teal accent; muted state colours. Monochrome line icons, hairlines, 14px panel radius, 7–8px control radius.

STORY: The user sees at once whether Harbor is watching, where files went, and can change a rule or undo a batch without hunting.

FIRST VIEWPORT: Left, a floating glass sidebar: logo, four destinations, monitoring card with a toggle at the bottom. Right, a content sheet: title with count, search, primary "New rule"; watched-folder strip with Preview and Organize now; ordered rules table; footer with last batch and Undo.

SIGNATURE MOVE: The shoreline backdrop carries monitoring state. Active shows full-colour water; paused lets the tide go out, so the backdrop eases toward desaturated sand. Errors tint only the monitoring card. With Reduce transparency on, the same state appears as a sidebar tint.

FORM: Shoreline Glass, position 1 on my ordered list (chosen as Impeccable's pick over the rolled Harbour Yard). seed:1c0c0058c5140051

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Dark theme backdrop palette is set in the canvas Activity board; confirm during the build.
