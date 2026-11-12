---
name: Harbor
description: A calm desktop utility seen through frosted glass, with a shoreline blurred behind it that shows whether Harbor is watching.
colors:
  ink: "#14232b"
  ink-2: "#4a5c65"
  ink-3: "#5b6c74"
  ink-on-accent: "#ffffff"
  accent: "#0b6a75"
  accent-hover: "#08575f"
  accent-soft: "rgba(11, 106, 117, 0.11)"
  accent-line: "rgba(11, 106, 117, 0.34)"
  ok: "#2f9e74"
  ok-text: "#1c6f50"
  warn: "#c4703e"
  warn-text: "#8f4a1f"
  warn-soft: "rgba(196, 112, 62, 0.12)"
  danger: "#b23a3a"
  danger-text: "#9c2626"
  danger-soft: "rgba(178, 58, 58, 0.09)"
  danger-line: "rgba(178, 58, 58, 0.36)"
  hair: "rgba(20, 35, 43, 0.08)"
  hair-strong: "rgba(20, 35, 43, 0.14)"
  fill: "rgba(20, 35, 43, 0.045)"
  fill-hover: "rgba(20, 35, 43, 0.065)"
  row-hover: "rgba(11, 106, 117, 0.045)"
  track-off: "rgba(20, 35, 43, 0.24)"
  canvas: "#dde5e4"
  side: "rgba(255, 255, 255, 0.36)"
  side-edge: "rgba(255, 255, 255, 0.6)"
  side-card: "rgba(255, 255, 255, 0.5)"
  sheet: "rgba(250, 251, 251, 0.76)"
  sheet-edge: "rgba(255, 255, 255, 0.72)"
  solid: "#ffffff"
  control: "rgba(255, 255, 255, 0.78)"
  scrim: "rgba(18, 34, 42, 0.32)"
  shore-sand: "#e8dcc6"
  shore-foam: "#eef3f1"
  shore-shallows: "#a9d6cf"
  shore-sea: "#6aa7b3"
  shore-deep: "#3f7f93"
  shore-dry-foam: "#f1ece2"
  shore-dry-shallows: "#ece3d2"
  shore-dry-sea: "#ddd3c1"
  shore-dry-deep: "#cfc6b4"
  ink-dark: "#e4ecee"
  ink-2-dark: "#a3b5bb"
  ink-3-dark: "#8597a0"
  accent-dark: "#17777e"
  accent-hover-dark: "#1d8890"
  accent-text-dark: "#7fd0d2"
  danger-dark: "#f0a07a"
  danger-text-dark: "#f4b293"
  canvas-dark: "#0a1418"
  side-dark: "rgba(18, 32, 40, 0.44)"
  sheet-dark: "rgba(14, 24, 30, 0.76)"
  solid-dark: "#13222a"
  solid-raised-dark: "#182a33"
  shore-sand-dark: "#2b2a24"
  shore-foam-dark: "#10222c"
  shore-shallows-dark: "#15474e"
  shore-sea-dark: "#1b5d68"
  shore-deep-dark: "#0f2f40"
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
  panel: "14px"
  card: "10px"
  control: "8px"
  nav: "7px"
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
    rounded: "{rounded.nav}"
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
  nav-link:
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.nav}"
    padding: "0 10px"
    height: "32px"
  nav-link-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  badge:
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "0 6px"
    height: "18px"
  sidebar:
    backgroundColor: "{colors.side}"
    rounded: "{rounded.panel}"
    padding: "14px 10px 10px"
    width: "224px"
  sheet:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.panel}"
  monitor-card:
    backgroundColor: "{colors.side-card}"
    rounded: "{rounded.card}"
    padding: "12px"
  group:
    backgroundColor: "{colors.solid}"
    rounded: "{rounded.card}"
  group-row:
    padding: "12px 14px"
    height: "52px"
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

Harbor is a calm native utility seen through frosted glass, with an aerial shoreline blurred behind it: wet sand bottom-left, turquoise shallows, deep sea-blue top-right. The backdrop is five large, heavily blurred colour fields, static at rest. A floating, more transparent sidebar sits beside an opaque-leaning content sheet; tables, forms, grouped settings and dialogs sit on near-solid surfaces so glass never hurts reading.

The shoreline is not decoration; it carries state. While monitoring runs the water is in, in full colour. When monitoring is paused the tide goes out: the water fields slide toward the top right, shrink, and turn to dry-sand tones while the sand field grows across the frame, in one slow ease of about 2.4 seconds. Errors tint only the monitoring card, never the backdrop. With Reduce transparency on (app setting or OS preference), the backdrop and blurs go away and the same state appears as a sidebar tint: sea-tinted when watching, sand-tinted when paused.

Density is that of a desktop utility: 13px body, 30px controls, 46px table rows, a supported window from 1000×700 to 1600×1000. One sea-teal accent, muted state colours, monochrome line icons, hairlines. It refuses the grey-sidebar-plus-card dashboard, dark-and-techy chrome, and the earlier cartoon-harbour look: no scenery illustrations, no rainbow of icon colours, no nautical puns in copy.

**Key Characteristics:**
- Blurred five-field shoreline backdrop that reports monitoring state through the tide.
- Two glass panes: a lighter sidebar (blur 40px, saturate 180%) and a denser content sheet (blur 40px, saturate 160%).
- Reading surfaces (groups, inputs, dialogs, toasts) are solid, never glass.
- One sea-teal accent; state colours stay muted and appear as small dots, tinted notices, and text.
- Inter at 13px with weights 400 to 600; JetBrains Mono for paths and patterns.
- Light and dark themes share every rule; dark swaps tokens only.

## Colors

A cool shoreline palette: blue-grey ink on pale sea-glass, one deep sea-teal accent, and sand and water fields that live only in the backdrop.

### Primary
- **Sea-Teal** (`accent`): the single interactive colour. Primary buttons, the switch when on, checked checkboxes, the selected theme swatch ring, active step dots, the drop-target line in the rules table, and focus rings. In dark theme the fill deepens to `accent-dark` and text-role accent lifts to the pale lagoon `accent-text-dark` for contrast.
- **Deep Sea-Teal** (`accent-hover`): hover for accent fills.
- **Teal Wash** (`accent-soft`): active nav item background, input focus halo, switch cue halo.
- **Teal Line** (`accent-line`): accent-toned badge borders, focused search border, guide flow connectors.

### Secondary
- **Shoreline Fields** (`shore-sand`, `shore-foam`, `shore-shallows`, `shore-sea`, `shore-deep`): the five backdrop fields, only ever drawn blurred at 72px behind the glass. They never colour text, controls, or icons.
- **Dry Sand Fields** (`shore-dry-foam`, `shore-dry-shallows`, `shore-dry-sea`, `shore-dry-deep`): what the water fields become when the tide is out (monitoring paused).

### Tertiary
- **Kelp Green** (`ok`, `ok-text`): monitoring-active dot and success toast icon.
- **Driftwood Amber** (`warn`, `warn-text`, `warn-soft`): paused or restarting dot, warning notices.
- **Brick** (`danger`, `danger-text`, `danger-soft`, `danger-line`): errors, failed moves, destructive actions, the error tint on the monitoring card. In dark theme it shifts to a warm coral (`danger-dark`).

### Neutral
- **Harbor Ink** (`ink`): primary text and active control labels.
- **Slate Ink** (`ink-2`): secondary text, descriptions, table headers, resting icons.
- **Mist Ink** (`ink-3`): tertiary marks such as grips, path arrows, empty-state icons, and placeholders.
- **Sea-Glass Canvas** (`canvas`): the window ground under the backdrop; deep night-water in dark (`canvas-dark`).
- **Glass** (`side`, `side-edge`, `side-card`, `sheet`, `sheet-edge`): translucent pane fills and their bright 1px edges.
- **Solid** (`solid`; dark `solid-dark`, `solid-raised-dark`): grouped lists, inputs, dialogs, toasts, the selected segment.
- **Hairlines and Fills** (`hair`, `hair-strong`, `fill`, `fill-hover`, `row-hover`, `track-off`): low-alpha ink for dividers, control borders, quiet fills, hover states, and the off switch track.
- **Scrim** (`scrim`): dialog backdrop, with a 3px blur.

### Named Rules
**The One Teal Rule.** Sea-teal is the only accent. Every interactive highlight, selection, and focus ring is teal; nothing else competes. File-type and nav icons stay monochrome.

**The Water Stays Behind the Glass Rule.** Shoreline and dry-sand colours appear only in the blurred backdrop, the Reduce-transparency sidebar tint, and the theme preview swatches. They are never used for text, controls, or icons.

**The Card Carries the Alarm Rule.** Errors tint the monitoring card and inline notices; the backdrop only ever reports active versus paused.

## Typography

**Display Font:** none; the system has no display role.
**Body Font:** Inter Variable (with Segoe UI, system-ui, -apple-system), bundled via @fontsource with `cv11` and `ss01` on.
**Label/Mono Font:** JetBrains Mono 400 (with Cascadia Mono, Consolas, SF Mono), bundled via @fontsource.

**Character:** a native-utility sans at small sizes, set tight and quiet; hierarchy comes from weight (400, 500, 600) and ink tone rather than size jumps. Mono marks anything the user would type or that names a place on disk.

### Hierarchy
- **Headline** (600, 20px, 1.25, -0.3px): page titles in the sheet head, paired with a tabular-numeral count in Slate Ink; also the About name.
- **Title** (600, 16px, -0.2px): dialog titles.
- **Section title** (600, 15px): Guide and prose section headings. Empty-state headings use 600 at 14px.
- **Body** (400, 13px, 1.45): all interface text. Prose blocks use line-height 1.55 and a 68ch measure.
- **Body strong** (500, 13px): buttons, nav links, field labels, row titles, rule names.
- **Caption** (400 or 600, 12px): hints, errors, monitoring card text, toast sub-lines, group titles and day rows (600).
- **Label** (500, 11px, 0.5px, uppercase): table column headers only; badges use the same size without uppercase.
- **Mono** (400, 12px): folder paths, patterns, extensions, `kbd`.

### Named Rules
**The Weight Not Size Rule.** The ramp spans 11 to 20px. Emphasis comes from 500 or 600 and from moving between Harbor Ink and Slate Ink, not from larger type.

**The Numbers Line Up Rule.** Counts, order indexes, sizes, and times use tabular numerals.

## Layout

The shell is a fixed full-window frame with 10px padding and a 10px gap: a 224px floating sidebar on the left and a flexible content sheet on the right, both over the shoreline. Each page inside the sheet is a column: a head (title with count, actions on the right; 18px 24px 14px padding), an optional strip such as the watched-folder strip (inset 24px), a scrolling body (0 24px 24px, stable scrollbar gutter), and an optional footer bar above a hairline (10px 24px) for last batch and Undo.

Settings uses a two-column grid (22px row gap, 24px column gap) of grouped lists. The Guide uses a 68ch reading column beside a 260px-minimum side column (gap 32px 56px, max 1180px).

Supported window: 1000×700 to 1600×1000. At 1199px and below (compact) the sidebar narrows to 200px, sheet gutters drop from 24px to 20px, search narrows to 200px, Settings and Guide collapse to one column, and table columns re-proportion so names stay whole. A safety step at 899px narrows the sidebar to 176px and search to 160px.

Spacing rhythm is small and even: 2px within nav and segment groups, 6 to 8px between controls, 10 to 14px inside rows and cards, 18 to 24px between regions.

## Elevation & Depth

Depth is material, not lift. Three planes stack: the blurred shoreline, the two glass panes (backdrop blur 40px, each with a bright 1px edge and a soft ambient shadow), and solid surfaces for anything you read or type into. Shadows are wide and low-contrast with a 0.5px hairline ring; they read as the pane's edge catching light, never as a drop.

### Shadow Vocabulary
- **Side pane** (`0 0 0 0.5px rgba(20,35,43,0.08), 0 18px 50px rgba(20,40,50,0.1)`): the sidebar.
- **Sheet** (`0 0 0 0.5px rgba(20,35,43,0.1), 0 24px 60px rgba(20,40,50,0.14)`): the content sheet.
- **Group** (`0 0 0 0.5px rgba(20,35,43,0.12), 0 1px 2px rgba(20,35,43,0.04)`): solid grouped settings lists.
- **Pop** (`0 0 0 0.5px rgba(20,35,43,0.14), 0 18px 48px rgba(20,40,50,0.22)`): dialogs, toasts, the skip link.

Dark theme deepens each shadow toward black and uses a white hairline ring on groups and pops.

### Named Rules
**The Glass Frames, Solid Reads Rule.** Only the sidebar and sheet are glass. Tables sit on the sheet's dense glass; inputs, grouped lists, dialogs, and toasts are solid.

**The Portal Rule.** Anything `position: fixed` (dialog scrims, toasts) is portaled to `document.body`, because the sheet's backdrop-filter becomes the containing block for fixed descendants and would clip them.

**The Reduce Transparency Rule.** With Reduce transparency on, the backdrop is hidden, all blurs are removed, the sheet goes solid with a stronger edge, and monitoring state moves to the sidebar tint (sea mixed 22% into canvas when watching, sand 55% when paused). Browsers without backdrop-filter get solid panes as well.

## Shapes

Softly rounded, nested radii that step down as surfaces get smaller: panes and dialogs at 14px, cards, groups, notices, and toasts at 10px, inputs, buttons, and segmented controls at 8px, nav items and small buttons at 7px, icon buttons and segments at 6px, badges and checkboxes at 4px. Switches and status dots are fully round. Borders are 1px hairlines in ink at low alpha; panes use bright white edges instead. The Harbor "H" mark is shown at 22px with a 6px radius in the sidebar and 56px with a 13px radius on About.

## Components

### Buttons
Quiet, compact, native.
- **Shape:** gently rounded (8px), 30px tall, 0 12px padding; small variant 26px tall at 7px radius.
- **Default:** translucent white control fill with a `hair-strong` border and Harbor Ink label at 500.
- **Primary:** Sea-Teal fill, white label, no border; hover to Deep Sea-Teal. Reserved for the main action of a page head or a dialog confirm.
- **Quiet:** transparent, Slate Ink label, Harbor Ink on hover.
- **Danger:** Brick label and line on the control fill, `danger-soft` on hover; solid danger fill only for the confirm of a destructive dialog.
- **Icon button:** 28px square, 6px radius, Slate Ink icon; hover fills and darkens; a danger tone turns Brick on hover.
- **Link button:** accent text at 500, underline on hover.
- **Hover / Focus:** background and colour ease over 0.15s; focus is a 2px Sea-Teal outline at 2px offset. Disabled drops to 50% opacity.

### Chips
- **Badge:** 18px tall, 4px radius, 11px at 500, hairline border, Slate Ink; accent tone uses Teal Line and accent text.
- **Segmented control:** a `fill` well with a hairline border and 2px inset; segments are 24px tall at 6px radius; the selected segment turns solid with a hairline ring.

### Cards / Containers
- **Grouped list:** solid background, 10px radius, Group shadow; rows at least 52px with 12px 14px padding and hairline dividers. Titles at 500, descriptions in Slate Ink, actions right-aligned. Group titles sit above at 12px/600 Slate Ink.
- **Notice:** 10px radius, `fill` with hairline; warn and danger tones tint the fill and border and colour the icon and strong text.
- **Strip:** a `fill` band at 10px radius under the page head, holding the watched folder path (ellipsised) and its actions.
- **Empty state:** centred, 56px top and bottom, Mist Ink icon, 14px/600 heading, 42ch text, one button.

### Inputs / Fields
- **Style:** solid fill, `hair-strong` 1px border, 8px radius, 32px tall; mono variant for paths and patterns.
- **Hover:** border deepens to ink at 26%.
- **Focus:** border turns Sea-Teal with a 3px `accent-soft` halo.
- **Error / Disabled:** `aria-invalid` turns the border to `danger-line` with 12px Brick error text below; disabled at 55% opacity.
- **Search:** a `fill` well with hairline, 240px wide (200px compact), leading icon; on focus it turns to the control fill with a Teal Line border and focus outline.
- **Checkbox:** 16px, 4px radius, solid; checked fills Sea-Teal with a drawn white tick.
- **Switch:** 30×18 pill, `track-off` at rest, Sea-Teal when on, 14px white thumb travelling 12px with the out-ease.

### Navigation
- **Sidebar:** brand row (H mark and "Harbor" at 14px/600), four destinations (Rules, Activity, Settings, Info & Guide), the monitoring card pushed to the bottom, then quiet side links.
- **Nav link:** 32px, 7px radius, 16px lucide icon at stroke 1.8 in Slate Ink, label at 500. Hover fills with `fill-hover`; active uses the Teal Wash with accent text and icon. An update shows as a 6px accent dot at the row end.

### Monitoring Card (signature)
The sidebar's state card: `side-card` glass at 10px radius with a bright edge. A 7px status dot (Kelp Green watching, Driftwood Amber paused or restarting, Brick on error, Mist while checking), a 600 title, the switch, and a 12px line naming the watched folder. On error the card alone takes `danger-soft` and `danger-line` and links to Settings. First-run cue: a teal halo on the switch and a small Start monitoring button.

### Tables
- **Header:** 30px, 11px/500 uppercase label in Slate Ink over a `hair-strong` rule.
- **Rows:** 46px, hairline dividers, teal-tinted `row-hover` at 0.12s. Fixed layout with named column widths; names and paths ellipsise, with split paths keeping the file leaf visible.
- **Rules table:** order cell with grip, tabular index, and up/down movers revealed on hover or focus; disabled rules fade to Slate Ink; the drop target shows a 2px Sea-Teal line.
- **Activity table:** day group rows at 12px/600; status shows a 6px dot and, for failures, Brick text at 500.

### Dialogs and Toasts
- **Dialog:** solid raised panel, 14px radius, Pop shadow, 440px (560px wide variant), over a scrim with 3px blur; title at 16px/600; body in Slate Ink; footer on a `fill` band above a hairline with right-aligned actions. Enters with a 6px rise and 0.99 scale over 0.24s.
- **Toast:** solid raised, 10px radius, Pop shadow, bottom-right at 20px, max 420px; tone colours only the leading icon.

### Shoreline Backdrop (signature)
`.shell[data-tide="in|out"]` is set from monitoring state. Five absolutely positioned elliptical fields blurred at 72px fill an area 140px past the window edge. Tide out: sand scales to 1.6 and moves up; shallows, sea, and deep fields translate up-right, shrink to 0.7 to 0.85, and take the dry-sand tokens; foam turns dry. Transforms, opacity, and colour ease over 2.4s on `cubic-bezier(0.22, 1, 0.36, 1)`. The first known state renders with no transition; reduced motion collapses all transitions.

## Do's and Don'ts

### Do:
- **Do** drive the backdrop only from monitoring state through `data-tide`, and mirror it as a sidebar tint under Reduce transparency.
- **Do** keep reading and typing on solid surfaces; glass is for the two panes only.
- **Do** portal dialogs, scrims, and toasts to `document.body`.
- **Do** use Sea-Teal for every interactive highlight and the 2px focus outline at 2px offset.
- **Do** draw icons with lucide-react line icons in the current ink tone, 16px in navigation and dialog chrome, 14px inside compact controls.
- **Do** set paths, patterns, and extensions in JetBrains Mono at 12px and ellipsise them, keeping the file name visible.
- **Do** bundle fonts and icons locally; load nothing from a CDN.
- **Do** keep the existing Harbor "H" mark as the only logo.

### Don't:
- **Don't** use shoreline or sand colours for text, icons, or controls.
- **Don't** put errors on the backdrop; tint the monitoring card or a notice.
- **Don't** colour file-type or navigation icons; the icon family stays monochrome.
- **Don't** add scenery illustrations, toy colours, or nautical puns in copy.
- **Don't** animate the backdrop in loops; it moves once per state change.
- **Don't** place text directly on the blurred backdrop outside the panes.
- **Don't** introduce a second accent hue or a display typeface.
