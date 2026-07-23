# Future feature — Live weather radar pane

> Scope: medium — introduces the app's first third-party JS library. One agent, one sitting,
> but budget time for validating the data source before writing UI code.
> Read `agents.md` at the repo root first for project-wide context (stack, hard
> workflow rules, design tokens) — this doc only covers what's specific to this feature.

## Goal
Add a new section below the existing forecast content (after the 7-day forecast) showing
a live radar map centered on the currently displayed location. This pane sits beside the
local-news pane (see `feature-local-news.md`) in a two-column row on wide screens,
stacked on narrow ones (reuse the existing 760px breakpoint).

## Data source: RainViewer (keyless — decided)
The project has a hard "no API keys, ever" rule (see `agents.md`). RainViewer's public API
fits that:
- `https://api.rainviewer.com/public/weather-maps.json` — no key, no signup. Returns
  available radar frames: a `radar.past` array (recent history) and `radar.nowcast` array
  (short-term forecast), each `{ time, path }`.
- Tiles: `https://tilecache.rainviewer.com{path}/{size}/{z}/{x}/{y}/{color}/{options}.png`
  — `path` comes from the frame you picked above. `size` is tile px (256 or 512), `color`
  is a palette index (RainViewer docs list them), `options` like `1_1` (smooth + snow).
- Docs: https://www.rainviewer.com/api.html — read this before implementing; the exact
  path/param format may have evolved.

**This needs a base map.** RainViewer only gives you the precipitation overlay tiles, not
a map to put them on. Recommend **Leaflet** (MIT license, no key required) loaded via CDN
`<script>`/`<link>` tags — no bundler needed, so it stays consistent with this repo's
zero-build-tooling approach even though it's the **first external JS library** in an
otherwise all-vanilla codebase. Flag that explicitly when you build this — it's a real
precedent change, not just an implementation detail.

Base tiles: OpenStreetMap's standard tile server (`https://{s}.tile.openstreetmap.org/...`)
is free and keyless for reasonable traffic, but **requires visible attribution**
("© OpenStreetMap contributors") per their tile usage policy — Leaflet adds this
automatically via its attribution control, just don't remove it.

## Behavior
- Map recenters/re-queries whenever the displayed location changes — hook into the same
  place `loadWeather()` / `renderCurrent()` already fires from (geolocation, search
  select, saved-location click, fallback city).
- Reasonable default zoom for a city-level view (roughly zoom 7–8 in Leaflet terms).
- MVP: show the latest available radar frame as a static overlay. Stretch goal: animate
  through the last several `radar.past` frames (classic looping radar) with a simple
  play/pause control — don't feel obligated to build this on the first pass.
- Give the map container an explicit height (Leaflet requires one) — something like
  320–400px, responsive width.

## Design
- Wrap the map in a container styled like the rest of the app: `.card`-style border
  (`var(--border)`), `box-shadow: var(--shadow)`, **no border-radius** (square corners,
  matches the rest of the redesign). A `section-title`-style heading ("Radar") above it,
  consistent with the "Hourly" / "7-Day Forecast" headings.
- Loading/error states should follow the existing conventions in `js/ui.js`
  (`setLoading`/`showError` pattern) — don't invent a new visual language for this.
- Leaflet ships its own default CSS for map controls (zoom buttons, attribution) — it will
  look visually distinct from the rest of the app's dark theme by default. Expect to
  reskin Leaflet's default light-grey chrome to fit the dark panel aesthetic (background,
  borders, text color) rather than shipping it as-is.

## Open questions to resolve during implementation (not blocking, just flag findings)
- Confirm the exact current RainViewer tile URL format against their live docs (APIs like
  this sometimes shift param order/names).
- Decide zoom/pan interaction: fully interactive map, or a fixed view with no pan/zoom
  (simpler, avoids the map fighting with page scroll on mobile)? Recommend starting fixed
  (no interaction) and only adding pan/zoom if it's clearly wanted.

## Acceptance criteria
- No API key anywhere in the code or committed config.
- RainViewer and OpenStreetMap attribution both visible per their usage policies.
- Radar view updates when the displayed location changes.
- Entirely client-side (this is a static GitHub Pages site — no backend/build step).
- Matches the app's square-corner, dark-panel, blue-accent design language.
