---
name: Harbor
description: A calm desktop utility seen through frosted glass, a frosted Control Deck over a bright shoreline whose tide shows whether Harbor is watching.
colors:
  ink: "#12242c"
  ink-2: "#44575f"
  ink-3: "#55676f"
  ink-on-accent: "#ffffff"
  accent: "#0a6f7b"
  accent-hover: "#075b65"
  accent-text: "#08656f"
  accent-soft: "rgba(10, 111, 123, 0.12)"
  accent-line: "rgba(10, 111, 123, 0.36)"
  ok: "#2a9d73"
  ok-text: "#1a6c4e"
  warn: "#c4703e"
  warn-text: "#8f4a1f"
  warn-soft: "rgba(196, 112, 62, 0.12)"
  danger: "#b23a3a"
  danger-text: "#9c2626"
  danger-soft: "rgba(178, 58, 58, 0.09)"
  danger-line: "rgba(178, 58, 58, 0.36)"
  calm: "#b08f55"
  hair: "rgba(18, 36, 44, 0.08)"
  hair-strong: "rgba(18, 36, 44, 0.14)"
  fill: "rgba(18, 36, 44, 0.045)"
  fill-hover: "rgba(18, 36, 44, 0.065)"
  row-hover: "rgba(10, 111, 123, 0.05)"
  track-off: "rgba(18, 36, 44, 0.24)"
  canvas: "#e9f1f0"
  side: "rgba(255, 255, 255, 0.4)"
  side-edge: "rgba(255, 255, 255, 0.65)"
  side-card: "rgba(255, 255, 255, 0.55)"
  sheet: "rgba(252, 253, 253, 0.68)"
  sheet-edge: "rgba(255, 255, 255, 0.75)"
  solid: "#ffffff"
  control: "rgba(255, 255, 255, 0.8)"
  scrim: "rgba(233, 241, 240, 0.38)"
  shore-sand: "#f3e2bf"
  shore-foam: "#fbf2dc"
  shore-shallows: "#8fdacd"
  shore-sea: "#4cadbf"
  shore-deep: "#227d9a"
  shore-bay: "#7fd0cf"
  ink-dark: "#eaf2f3"
  ink-2-dark: "#c8d7db"
  ink-3-dark: "#bfd0d4"
  ink-2-dark-out: "#eadbc8"
  ink-3-dark-out: "#ddcbb5"
  accent-dark: "#17808a"
  accent-hover-dark: "#1c919c"
  accent-text-dark: "#88d9db"
  ok-dark: "#52cb9c"
  ok-text-dark: "#85dbb8"
  warn-dark: "#e6ad73"
  warn-text-dark: "#f0c08f"
  danger-dark: "#f2a682"
  danger-text-dark: "#f6b89b"
  calm-dark: "#d9bd84"
  canvas-dark: "#0b1c27"
  ground-dark: "#0b1c27"
  side-dark: "rgba(26, 60, 76, 0.42)"
  side-dark-out: "rgba(44, 48, 68, 0.45)"
  sheet-dark: "rgba(20, 52, 66, 0.7)"
  sheet-dark-out: "rgba(32, 36, 54, 0.74)"
  solid-dark: "#112631"
  solid-raised-dark: "#16303d"
  scrim-dark: "rgba(16, 41, 58, 0.45)"
  shore-sand-dark: "#6b5236"
  shore-foam-dark: "#132d40"
  shore-shallows-dark: "#13505a"
  shore-sea-dark: "#145b6c"
  shore-deep-dark: "#15335c"
  shore-bay-dark: "#114552"
typography:
  headline:
    fontFamily: "Inter Variable, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.3px"
  title:
    fontFamily: "Inter Variable, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    letterSpacing: "-0.2px"
  title-section:
    fontFamily: "Inter Variable, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  lead:
    fontFamily: "Inter Variable, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Inter Variable, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "\"cv11\", \"ss01\""
  body-strong:
    fontFamily: "Inter Variable, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.45
  caption:
    fontFamily: "Inter Variable, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Inter Variable, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.5px"
  mono:
    fontFamily: "JetBrains Mono, Cascadia Mono, Consolas, SF Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
rounded:
  pill: "999px"
  deck: "16px"
  panel: "14px"
  chip: "12px"
  card: "10px"
  control: "8px"
  button-small: "7px"
  small: "6px"
  tag: "4px"
spacing:
  hair: "2px"
  xs: "6px"
  sm: "8px"
  frame: "10px"
  md: "12px"
  row: "14px"
  lg: "18px"
  xl: "20px"
  section: "22px"
  gutter: "24px"
components:
  button:
    backgroundColor: "{colors.control}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "30px"
  button-hover:
    backgroundColor: "{colors.fill-hover}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink-on-accent}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "30px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-small:
    rounded: "{rounded.button-small}"
    padding: "0 10px"
    height: "26px"
  button-quiet:
    textColor: "{colors.ink-2}"
    padding: "0 12px"
    height: "30px"
  button-danger:
    backgroundColor: "{colors.control}"
    textColor: "{colors.danger-text}"
    rounded: "{rounded.control}"
    height: "30px"
  button-danger-solid:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.solid}"
    rounded: "{rounded.control}"
    height: "30px"
  icon-button:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.small}"
    size: "28px"
  input:
    backgroundColor: "{colors.solid}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  search:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "30px"
    width: "240px"
  switch:
    backgroundColor: "{colors.track-off}"
    rounded: "{rounded.pill}"
    width: "30px"
    height: "18px"
  switch-on:
    backgroundColor: "{colors.accent}"
  topbar:
    backgroundColor: "{colors.side}"
    rounded: "{rounded.deck}"
    padding: "8px 10px 8px 14px"
    height: "56px"
  nav-link:
    textColor: "{colors.ink-2}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.card}"
    padding: "0 13px"
    height: "36px"
  nav-link-hover:
    backgroundColor: "{colors.fill-hover}"
    textColor: "{colors.ink}"
  nav-link-active:
    backgroundColor: "{colors.solid}"
    textColor: "{colors.accent-text}"
  monitor-chip:
    backgroundColor: "{colors.side-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "0 8px 0 12px"
    height: "40px"
  monitor-start:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink-on-accent}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "28px"
  side-link:
    textColor: "{colors.ink-2}"
    padding: "0 8px"
    height: "34px"
  badge:
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "0 6px"
    height: "18px"
  sample-chip:
    backgroundColor: "{colors.control}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "26px"
  sample-chip-pressed:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-text}"
  sheet:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.panel}"
  group:
    backgroundColor: "{colors.solid}"
    rounded: "{rounded.card}"
  group-row:
    padding: "12px 14px"
    height: "52px"
  tester:
    backgroundColor: "{colors.solid}"
    rounded: "{rounded.panel}"
    padding: "16px"
  dialog:
    backgroundColor: "{colors.solid}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    width: "440px"
  toast:
    backgroundColor: "{colors.solid}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "10px 10px 10px 12px"
  notice:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "10px 12px"
  table-row:
    height: "46px"
    padding: "0 12px"
---

# Design System: Harbor

## Overview

**Creative North Star: "Shoreline Glass"**

Harbor is a calm native utility seen through frosted glass, with a bright aerial shoreline blurred behind it: sunlit sand bottom-left, turquoise shallows and a bay, sea-blue and deep water top-right. The backdrop is six large, heavily blurred colour fields, static at rest. Over it sits the Control Deck: a frosted top bar, the most transparent pane, holding the brand, four destination pills, the monitoring chip and quiet utility links; below it an opaque-leaning content sheet. Tables, forms, grouped settings, the guide's tester and dialogs sit on near-solid surfaces so glass never hurts reading. The native title bar, the window border and the window background all take the canvas colour, and a canvas band at the top of the shell runs under the caption, so the window chrome flows into the app.

The shoreline is not decoration; it carries state. While monitoring runs the tide is in and water reaches across the frame. When monitoring is paused the tide goes out: water draws back toward the top right and sunlit sand widens, still in full colour, a calm change of scene and never a grey-out. In dark theme, a teal-blue dusk rather than near-black, the paused tide also warms the sheet toward a dusk violet-grey and moves secondary ink to warm sand so it still reads at 4.5:1. Errors tint only the monitoring chip. On first run, "off" is an invitation: the chip reads "Ready to start" with a Start monitoring button until monitoring starts. With Reduce transparency on, the backdrop and blurs go away and the same state appears as a top bar tint.

Density is that of a desktop utility: 13px body, 30px controls, 46px table rows, a supported window from 1000×700 to 1600×1000. One sea-teal accent, muted state colours, monochrome line icons, hairlines. Light is airy and sunny; dark is dusk on the water. It refuses the grey-sidebar-plus-card dashboard, the near-black "pro" look, and the earlier cartoon-harbour look: no scenery illustrations, no rainbow of icon colours, no nautical puns in copy.

**Key Characteristics:**
- Six-field blurred shoreline that reports monitoring state through the tide; paused stays colourful.
- Control Deck shell: frosted top bar (blur 40px, saturate 180%) above a denser content sheet (blur 40px, saturate 160%); no sidebar.
- Caption, window border and window background share the canvas colour; a canvas band runs under the native title bar.
- Reading surfaces (groups, inputs, tester, dialogs, toasts) are solid, never glass.
- One sea-teal accent; state colours stay muted and appear as small dots, tinted notices, and text.
- Inter at 13px with weights 400 to 600; JetBrains Mono for paths, patterns and sample file names.
- Light and dark share every rule; dark swaps tokens, and in dark the tide also swaps the sheet and secondary inks.

## Colors

A bright shoreline palette: blue-grey ink on pale sea-glass in light, pale ink on teal-blue dusk in dark, one sea-teal accent, and sand and water fields that live in the backdrop.

### Primary
- **Sea-Teal** (`accent`): the single interactive fill. Primary buttons, the Start monitoring button, the switch when on, checked checkboxes, the selected theme swatch ring, the current stepper segment, and the drop-target line in the rules table. Dark deepens the fill to `accent-dark`.
- **Deep Sea-Teal** (`accent-hover`): hover for accent fills.
- **Teal Text** (`accent-text`): accent as text and icon: the active nav pill label, link buttons, the update dot, guide markers, tester and setup icons. In dark it lifts to the pale lagoon `accent-text-dark`, which is also the dark focus colour.
- **Teal Wash** (`accent-soft`): input focus halo, pressed sample chips, a matching tester result, the setup folder card, preview counts, and the emphasised update link.
- **Teal Line** (`accent-line`): accent badge borders, focused search border, the first-run monitoring chip border, guide flow connectors.

### Secondary
- **Shoreline Fields** (`shore-sand`, `shore-foam`, `shore-shallows`, `shore-sea`, `shore-deep`, `shore-bay`): the six backdrop fields, drawn blurred at 72px behind the glass. Dark uses deeper twins (`*-dark`), with the sand an amber that reads as gold at dusk. The same fields paint the guided-setup hero behind the H mark.

### Tertiary
- **Kelp Green** (`ok`, `ok-text`): monitoring-active dot and success toast icon.
- **Driftwood Amber** (`warn`, `warn-text`, `warn-soft`): restarting dot, warning notices, a partial tester result.
- **Calm Sand** (`calm`): the dot for plain Paused, a warm neutral so a deliberate pause never reads as a warning.
- **Brick** (`danger`, `danger-text`, `danger-soft`, `danger-line`): errors, failed moves, destructive actions, and the error tint on the monitoring chip. Dark shifts it to a warm coral (`danger-dark`).

### Neutral
- **Harbor Ink** (`ink`): primary text and active control labels.
- **Slate Ink** (`ink-2`): secondary text, descriptions, table headers, resting nav labels and icons.
- **Mist Ink** (`ink-3`): tertiary marks such as grips, path arrows, empty-state icons, placeholders, upcoming stepper labels.
- **Dusk Inks** (`ink-2-dark`, `ink-3-dark` with the tide in; `ink-2-dark-out`, `ink-3-dark-out` with the tide out): dark secondary inks, cool teal-white over the teal sheet and warm sand over the dusk sheet, each held at 4.5:1 or better for 13px text.
- **Sea-Glass Canvas** (`canvas`): window ground, native caption colour, window border, and the band under the title bar; dark `canvas-dark`. Dark draws the shell itself on the slightly lighter `ground-dark` beneath the fields.
- **Glass** (`side`, `side-edge`, `side-card`, `sheet`, `sheet-edge`): the top bar, the monitoring chip and the sheet, with their bright 1px edges. Dark: `side-dark`/`sheet-dark` with the tide in, `side-dark-out`/`sheet-dark-out` with it out.
- **Solid** (`solid`; dark `solid-dark`, `solid-raised-dark`): grouped lists, inputs, the tester, the active nav pill, dialogs, toasts, the selected segment.
- **Hairlines and Fills** (`hair`, `hair-strong`, `fill`, `fill-hover`, `row-hover`, `track-off`): low-alpha ink for dividers, control borders, quiet fills, hover states, and the off switch track.
- **Scrim** (`scrim`; dark `scrim-dark`): a light, canvas-tinted dialog backdrop with a 6px blur, so the shoreline stays faintly visible behind a dialog.

### Named Rules
**The One Teal Rule.** Sea-teal is the only accent. Every interactive highlight, selection, and focus ring is teal; nothing else competes. File-type and nav icons stay monochrome.

**The Water Stays Behind the Glass Rule.** Shoreline colours appear only in the blurred backdrop, the guided-setup hero, the Reduce-transparency top bar tint, and the theme preview swatches. They never colour text, controls, or icons.

**The Paused Stays Colourful Rule.** Paused is a change of scene, not an absence: the tide draws back and sand widens, the dot turns Calm Sand, and nothing goes grey. Only errors take Brick, and only on the monitoring chip.

**The Tide Owns the Dusk Rule.** In dark theme the tide sets `--sheet`, `--side`, `--ink-2` and `--ink-3` on `.shell[data-tide]`. Any new secondary text sits on those tokens so it inherits a 4.5:1 pairing in both tides; never hard-code a secondary ink in dark.

## Typography

**Display Font:** none; the system has no display role.
**Body Font:** Inter Variable (with Segoe UI, system-ui, -apple-system), bundled via @fontsource with `cv11` and `ss01` on.
**Label/Mono Font:** JetBrains Mono 400 (with Cascadia Mono, Consolas, SF Mono), bundled via @fontsource.

**Character:** a native-utility sans at small sizes, set tight and quiet; hierarchy comes from weight (400, 500, 600) and ink tone rather than size jumps. Mono marks anything the user would type or that names a place on disk.

### Hierarchy
- **Headline** (600, 20px, 1.25, -0.3px): page titles in the sheet head, paired with a tabular count in Slate Ink; the About name.
- **Title** (600, 16px, -0.2px): dialog titles and the "Harbor" brand word in the top bar (16px/600, -0.3px).
- **Section title** (600, 15px): guide and prose section headings, including the tester. Empty-state headings use 600 at 14px.
- **Lead** (400, 14px, 1.55): the opening sentence of each guided-setup step and the guide intro (1.6).
- **Body** (400, 13px, 1.45): all interface text. Prose blocks use 1.55 and a 68ch measure.
- **Body strong** (500, 13px): buttons, nav pills, field labels, row titles, rule names. The monitoring chip title is 600.
- **Caption** (400 or 600, 12px): hints, errors, toast sub-lines, setup list sub-lines; 600 for group titles and day rows. The monitoring chip's sub-line is 11px.
- **Label** (500, 11px, 0.5px, uppercase): table column headers only. Badges and stepper labels use 11px/500 without uppercase.
- **Mono** (400, 12px): folder paths, patterns, extensions, `kbd`; sample file chips at 11.5px.

### Named Rules
**The Weight Not Size Rule.** The ramp spans 11 to 20px. Emphasis comes from 500 or 600 and from moving between Harbor Ink and Slate Ink, not from larger type.

**The Numbers Line Up Rule.** Counts, order indexes, sizes, preview counts and times use tabular numerals.

## Layout

The shell is a fixed full-window frame: a column with 6px 12px 12px padding and a 10px gap, holding the Control Deck top bar and, beneath it, a flexible content sheet, both over the shoreline. A 120px canvas band fades from the top edge (solid for 6px, 55% at 40px, clear below) so the native title bar flows into the frame.

The top bar is a single row (56px minimum, 8px 10px 8px 14px padding, 20px gap): brand on the left, the four destination pills (Rules, Activity, Settings, Info & Guide; 2px apart), then, pushed right, the monitoring chip and icon links for update, GitHub and support.

Each page inside the sheet is a column: a head (title with count, actions on the right; 18px 24px 14px padding), an optional strip such as the watched-folder strip (inset 24px), a scrolling body (0 24px 24px, stable scrollbar gutter), and an optional footer above a hairline (10px 24px) for last batch and Undo.

Settings uses a two-column grid (22px row gap, 24px column gap) of grouped lists. Info & Guide uses a 68ch reading column beside a 260px-minimum side column (gap 32px 56px, max 1180px), with the try-a-file-name tester leading the reading column.

Supported window: 1000×700 to 1600×1000. At 1199px and below (compact) the top bar gap drops to 12px, nav pills tighten to 0 10px, the monitoring chip hides its sub-line, sheet gutters drop from 24px to 20px, search narrows to 200px, Settings and the Guide collapse to one column, and table columns re-proportion so names stay whole. At 899px the brand word hides (the H mark stays) and search narrows to 160px.

Spacing rhythm is small and even: 2px within nav and segment groups, 6 to 8px between controls, 10 to 14px inside rows and cards, 18 to 24px between regions.

## Elevation & Depth

Depth is material, not lift. Three planes stack: the blurred shoreline, the two glass panes (top bar and sheet, backdrop blur 40px, each with a bright 1px edge and a soft ambient shadow), and solid surfaces for anything you read or type into. Shadows are wide and low-contrast with a 0.5px hairline ring; they read as the pane's edge catching light, never as a drop.

### Shadow Vocabulary
- **Deck** (`0 0 0 0.5px rgba(18,36,44,0.08), 0 18px 50px rgba(20,60,70,0.1)`): the top bar.
- **Sheet** (`0 0 0 0.5px rgba(18,36,44,0.1), 0 24px 60px rgba(20,60,70,0.14)`): the content sheet.
- **Group** (`0 0 0 0.5px rgba(18,36,44,0.12), 0 1px 2px rgba(18,36,44,0.04)`): grouped settings lists and the tester.
- **Pop** (`0 0 0 0.5px rgba(18,36,44,0.14), 0 18px 48px rgba(20,60,70,0.22)`): dialogs, toasts, the skip link.
- **Pill lift** (`0 0 0 0.5px hair-strong, 0 2px 6px rgba(20,60,70,0.08)`): the active nav pill in light only.

Dark deepens each shadow toward blue-black (`rgba(2,14,22,…)`), uses a white hairline ring on groups and pops, and drops the pill lift.

### Named Rules
**The Glass Frames, Solid Reads Rule.** Only the top bar, the monitoring chip and the sheet are glass. Tables sit on the sheet's dense glass; inputs, grouped lists, the tester, dialogs, and toasts are solid.

**The Portal Rule.** Anything `position: fixed` (dialog scrims, toasts) is portaled to `document.body`, because the sheet's backdrop-filter becomes the containing block for fixed descendants and would clip them.

**The Reduce Transparency Rule.** With Reduce transparency on (app setting or OS preference), the backdrop is hidden, all blurs are removed, the sheet goes solid with a stronger edge, the monitoring chip goes solid, and monitoring state moves to the top bar tint (sea mixed 22% into canvas when watching, sand 55% when paused). Browsers without backdrop-filter get solid panes as well.

## Shapes

Softly rounded, nested radii that step down as surfaces get smaller: the top bar at 16px; the sheet, dialogs and the tester at 14px; the monitoring chip at 12px; nav pills, cards, groups, notices and toasts at 10px; inputs, buttons, segmented controls and the Start monitoring button at 8px; small buttons at 7px; icon buttons and segments at 6px; badges and checkboxes at 4px. Switches, status dots and sample chips are fully round. Borders are 1px hairlines in ink at low alpha; panes use bright white edges instead. The Harbor "H" mark is 26px with a 7px radius in the top bar, 56px with a 13 to 14px radius on About and the setup hero.

## Components

### Buttons
Quiet, compact, native.
- **Shape:** gently rounded (8px), 30px tall, 0 12px padding; small variant 26px tall at 7px radius.
- **Default:** translucent white control fill with a `hair-strong` border and Harbor Ink label at 500.
- **Primary:** Sea-Teal fill, white label, no border; hover to Deep Sea-Teal. Reserved for the main action of a page head or a dialog confirm. In dialogs the primary action carries `data-autofocus` and takes focus on open.
- **Quiet:** transparent, Slate Ink label, Harbor Ink on hover.
- **Danger:** Brick label and line on the control fill, `danger-soft` on hover; solid danger fill only for the confirm of a destructive dialog (dark label in dark theme).
- **Icon button:** 28px square, 6px radius, Slate Ink icon; hover fills and darkens; a danger tone turns Brick on hover.
- **Link button:** Teal Text at 500, underline on hover.
- **Hover / Focus:** background and colour ease over 0.15s; focus is a 2px outline in the focus colour at 2px offset. Disabled drops to 50% opacity.

### Chips
- **Badge:** 18px tall, 4px radius, 11px at 500, hairline border, Slate Ink; accent tone uses Teal Line and Teal Text.
- **Sample chip:** the tester's example file names; 26px pill, mono 11.5px, control fill with a hairline; hover takes Teal Line; pressed takes Teal Wash and Teal Text.
- **Segmented control:** a `fill` well with a hairline border and 2px inset; segments are 24px tall at 6px radius; the selected segment turns solid with a hairline ring (white 12% in dark).

### Cards / Containers
- **Grouped list:** solid, 10px radius, Group shadow; rows at least 52px with 12px 14px padding and hairline dividers. Titles at 500, descriptions in Slate Ink, actions right-aligned. Group titles sit above at 12px/600 Slate Ink.
- **Notice:** 10px radius, `fill` with hairline; warn and danger tones tint the fill and border and colour the icon and strong text.
- **Strip:** a `fill` band at 10px radius under the page head, holding the watched folder path (ellipsised) and its actions.
- **Empty state:** centred, 56px top and bottom, Mist Ink icon, 14px/600 heading, 42ch text, one button.

### Inputs / Fields
- **Style:** solid fill, `hair-strong` 1px border, 8px radius, 32px tall; mono variant for paths and patterns.
- **Hover:** border deepens to ink at 26%.
- **Focus:** border turns Sea-Teal with a 3px `accent-soft` halo.
- **Error / Disabled:** `aria-invalid` turns the border to `danger-line` with 12px Brick error text below; disabled at 55% opacity.
- **Sizes:** rule size limits are entered in MB (labels "Minimum size (MB)", "Maximum size (MB)") with a hint that 1024 MB is 1 GB.
- **Search:** a `fill` well with hairline, 240px wide (200px compact, 160px at 899px), leading icon; on focus it turns to the control fill with a Teal Line border and focus outline.
- **Checkbox:** 16px, 4px radius, solid; checked fills Sea-Teal with a drawn white tick.
- **Switch:** 30×18 pill, `track-off` at rest, Sea-Teal when on (a brighter teal, `#2a9aa5`, in dark), 14px white thumb travelling 12px with the out-ease.

### Navigation
- **Top bar (Control Deck):** frosted `side` glass, 16px radius, bright edge, Deck shadow. Brand (26px H mark and "Harbor"), then destination pills.
- **Nav pill:** 36px, 10px radius, 0 13px padding, 16px lucide icon at stroke 1.8, label at 500 in Slate Ink. Hover fills with `fill-hover` and turns Harbor Ink; active becomes a solid pill with Teal Text and the pill lift (white 11% with no shadow in dark). An update shows as a 6px Teal Text dot at the pill's top right.
- **Utility links:** 34px, 9px radius, Slate Ink icons for GitHub and support; the update link is emphasised with Teal Wash and Teal Text.

### Monitoring Chip (signature)
Always in reach at the right of the top bar: `side-card` glass, 12px radius, bright edge, 40px tall. A 7px status dot (Kelp Green watching, Calm Sand paused, Driftwood Amber restarting, Brick on error, Mist while checking, Sea-Teal when ready to start), a 600 title, an 11px sub-line naming the folder (ellipsised at 190px, hidden when compact), and the switch. On error the chip alone takes `danger-soft` and `danger-line`, the title turns Brick, and the sub-line becomes "Review in Settings".

**First-run invitation.** From first launch until monitoring starts, the chip reads "Ready to start", tints 10% teal with a Teal Line border, and swaps the switch for a 28px Sea-Teal "Start monitoring" button. The button breathes a soft 5px teal halo every 2.8s; the pulse stops on hover and focus, and reduced motion stills it.

### Tables
- **Header:** 30px, 11px/500 uppercase label in Slate Ink over a `hair-strong` rule.
- **Rows:** 46px, hairline dividers, teal-tinted `row-hover` at 0.12s. Fixed layout with named column widths; names and paths ellipsise, with split paths keeping the file leaf visible.
- **Rules table:** order cell with grip, tabular index, and up/down movers revealed on hover or focus; disabled rules fade to Slate Ink; the drop target shows a 2px Sea-Teal line.
- **Activity table:** day group rows at 12px/600; status shows a 6px dot and, for failures, Brick text at 500.

### Dialogs and Toasts
- **Dialog:** solid raised panel, 14px radius, Pop shadow, 440px (560px wide variant), over the canvas-tinted scrim with a 6px blur; title at 16px/600; body in Slate Ink; footer on a `fill` band above a hairline with right-aligned actions. Enters with a 6px rise and 0.99 scale over 0.24s. Focus goes to `[data-autofocus]`, else the first control.
- **Toast:** solid raised, 10px radius, Pop shadow, bottom-right at 20px (centred for the quit toast), max 420px; tone colours only the leading icon.

### Guided Setup
A wide, non-dismissible dialog in five steps: Welcome, Folder, Rules, Preview, Start.
- **Stepper:** five equal 4px bars with 11px/500 labels; done bars at 55% teal, current bar Sea-Teal with a Teal Text label, upcoming in Mist Ink.
- **Shoreline hero (Welcome):** a 112px band bleeding to the dialog edges, painted with radial shoreline fields (sand, shallows, deep, sea over foam) and the 56px H mark centred with a soft shadow. Followed by a lead line and a two-column promise grid on `fill` cards with Teal Text icons.
- **Folder card:** Teal Wash fill with a Teal Line border, folder icon, name, mono path, and Change folder.
- **Rule and preview lists:** hairline rows with a switch per rule (the real setting) or a teal count pill per destination from a real preview of the folder; lists cap at 300px and fade out over the last 28px as a scroll cue, with 24px of bottom padding so the last row can clear the fade.
- **Recap (Start):** `fill` rows with Teal Text icons and right-aligned Slate Ink values for folder, rules on and files waiting, an optional checkbox to also move existing files, and Start monitoring as the autofocused primary.

### Try-a-File-Name Tester (Info & Guide)
A solid 14px-radius panel with the Group shadow and 16px padding: a heading with a Teal Text icon, a name field and a size field in MB, a row of sample chips, and a live result well. The result sits on `fill` when empty or unmatched, Teal Wash with a Teal Text icon on a match, and Driftwood Wash for a still-downloading partial file; the background eases over 0.25s.

### Shoreline Backdrop (signature)
`.shell[data-tide="in|out"]` is set from monitoring state. Six absolutely positioned elliptical fields (sand, foam, shallows, sea, deep, bay) blurred at 72px fill an area 140px past the window edge. Tide out: sand scales to 1.9 and rises; foam grows to 1.5; shallows, sea and bay draw back and shrink (0.6 to 0.72) and fade (0.35 to 0.8 opacity); deep shifts and shrinks to 0.85. Colours do not change; position, scale and opacity carry the tide. In dark, sand holds at 0.45 opacity while the tide is in, and the tide out swaps the sheet, top bar and secondary inks to their dusk values, with the sheet colour easing over 2.4s. Transforms and opacity ease over 2.4s on `cubic-bezier(0.22, 1, 0.36, 1)`. The first known state renders with no transition; reduced motion collapses all transitions.

## Do's and Don'ts

### Do:
- **Do** drive the backdrop only from monitoring state through `data-tide`, and mirror it as a top bar tint under Reduce transparency.
- **Do** keep `--canvas` and the native caption colour in `crates/tauri-app/src/commands/appearance.rs` identical (light #e9f1f0, dark #0b1c27).
- **Do** keep reading and typing on solid surfaces; glass is for the top bar, the monitoring chip and the sheet.
- **Do** put dark secondary text on `--ink-2`/`--ink-3` so the tide can swap it with the sheet.
- **Do** portal dialogs, scrims, and toasts to `document.body`, and mark a dialog's primary action with `data-autofocus`.
- **Do** use Sea-Teal for every interactive highlight and the 2px focus outline at 2px offset.
- **Do** draw icons with lucide-react line icons in the current ink tone, 16px in navigation and dialog chrome, 14px inside compact controls.
- **Do** set paths, patterns, and extensions in JetBrains Mono at 12px and ellipsise them, keeping the file name visible.
- **Do** bundle fonts and icons locally; load nothing from a CDN.
- **Do** keep the existing Harbor "H" mark as the only logo.

### Don't:
- **Don't** reintroduce a sidebar; navigation lives in the Control Deck top bar.
- **Don't** grey out or desaturate the paused state; the tide draws back, the colour stays.
- **Don't** take dark theme toward near-black; the canvas stays a teal-blue dusk.
- **Don't** use shoreline or sand colours for text, icons, or controls.
- **Don't** put errors on the backdrop; tint the monitoring chip or a notice.
- **Don't** colour file-type or navigation icons; the icon family stays monochrome.
- **Don't** add scenery illustrations, toy colours, or nautical puns in copy.
- **Don't** animate the backdrop in loops; it moves once per state change.
- **Don't** place text directly on the blurred backdrop outside the panes.
- **Don't** introduce a second accent hue or a display typeface.
