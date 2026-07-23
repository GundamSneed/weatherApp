# agents.md — weatherApp

> Resume-context file for an AI coding agent. Read this top-to-bottom before touching code.
> Written 2026-07-22. Owner: GundamSneed (matthewgmonaco@gmail.com).

## TL;DR
Vanilla **HTML/CSS/JS** weather app (no framework, no build step, no bundler). Data from **Open-Meteo** (no key). Hosted on **GitHub Pages**. Fully functional and feature-complete as of the last commit. Visual design was reworked on 2026-07-23: **dropped the animated weather-scene background and glassmorphism** in favor of a flat dark-grey theme with opaque panels and a dark-blue accent. Later that same day, a generic (non-weather-reactive) ambient particle canvas background was added — see "Ambient particle background" below.

---

## Hard rules (workflow — do not violate)
1. **Never run a local server** to preview. Testing/hosting is **GitHub Pages only** (also gives HTTPS, required by the Geolocation API). To see changes: commit → push `main` → view live URL.
2. **Develop on the `dev` branch.** Merge to `main` only when a step is polished and verified. `main` = the live public site. **Confirm with the user before merging to `main`** (they have consistently approved, but ask).
3. Standard flow per change: edit on `dev` → commit `dev` → `git checkout main && git merge dev --no-edit && git push origin main` → `git checkout dev && git push origin dev`. Keep both branches in sync.
4. Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Environment / URLs
- Local path: `C:\Users\matth\Documents\Repos\weatherApp` (Windows, PowerShell + Bash available).
- GitHub repo: `GundamSneed/weatherApp`. Live site: **https://gundamsneed.github.io/weatherApp/**
- No `gh` CLI; no `node`/`python` on PATH. GitHub Pages was enabled manually by the user (deploy from `main`, root).

## Verification: not the agent's job
Testing is left entirely to the **user** (as of 2026-07-23). Don't attempt to self-verify
changes — no cache-busting curls against the live site, no isolated `new Function()` eval
of deployed JS, no polling for CDN propagation. The user now tests locally via VSCode's
**Live Preview** extension before deciding what's worth keeping.

## Committing: also not automatic
Don't `git commit` (or push) after making changes — just edit/save the files and stop.
The user reviews via Live Preview and tells you when to commit. When they do, commit to
`dev` (never straight to `main`); merging `dev` → `main` still needs their confirmation
per the branch workflow above.

---

## APIs (all keyless, CORS-OK from Pages origin)
- **Forecast**: `https://api.open-meteo.com/v1/forecast` — `current`, `hourly`, `daily`. `timezone=auto`. Times come back in the location's local tz as ISO strings **without offset** (parse components directly; don't `new Date()` naively).
- **Geocoding** (search): `https://geocoding-api.open-meteo.com/v1/search?name=` — returns name/admin1/country/country_code/lat/lon; handles duplicate city names.
- **Reverse geocoding** (current-location name): `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=&longitude=&localityLanguage=en`. Open-Meteo has NO reverse endpoint — this is why BigDataCloud is a 2nd provider. (curl needs `-L`; browser fetch follows the 307 automatically.)
- **Flags**: `https://flagcdn.com/<cc>.svg` via `<img>` (NOT emoji — Windows renders emoji flags as bare letters "US"/"GB"). Images need no CORS.
- **WMO weather codes** → label+icon table in `weatherCodes.js`. `is_day` (1/0) picks day vs night icon.
- **News**: Google News RSS (`news.google.com/rss/search?q=<place> weather&hl=en-US&gl=US&ceid=US:en` — the `weather` keyword is appended so results skew toward forecasts/storms/advisories instead of general local news) has **no CORS headers for direct browser fetch** (confirmed by hand: no `Access-Control-Allow-Origin` on the raw feed response — don't retry a direct `fetch()` without re-checking that). Goes through **`api.rss2json.com/v1/api.json?rss_url=<encoded feed url>`** instead, a keyless RSS→JSON pass-through that does send `access-control-allow-origin: *`. (`api.allorigins.win`, the doc's other suggested fallback, was tried first and returned Cloudflare 520/522 errors both times — unreliable as of this check, not used.) Item titles come back as `"Headline - Source"`; the source is split off as the last `" - "`-separated segment.

---

## File map
```
index.html          structure: #bg-particles canvas (first child of body, fixed full-page background), then .app: header(search+unit toggle), sidebar-wrap(★ tab + saved sidebar, off-canvas drawer), sidebar-backdrop, main(current/hourly/daily/panels-row[radar,news]/footer). Script order: particles.js first (so the background starts before waiting on the Leaflet CDN fetch), then Leaflet (CDN, SRI-pinned), then js in order: weatherCodes, api, storage, ui, radar, app. Links favicon.svg.
css/styles.css       design tokens (:root vars: --bg flat page grey, --panel/--panel-strong/--panel-hover opaque dark-grey surfaces, --accent-blue dark-blue accent, --accent gold for the star), responsive (<=760px sidebar drawer, shorter radar map, panels-row collapses to 1 column). `#bg-particles` is `position:fixed` at `z-index:0`; `.app` is lifted to `z-index:1` (`position:relative`) so it paints above the canvas — the opaque `.card` panels already fully occlude it, it only shows through the page's own `--bg` gaps (margins, header, current-conditions section).
js/weatherCodes.js   WEATHER_CODES{}, describeWeather(code,isDay)->{label,icon}.
js/api.js            fetchForecast, fetchCurrent (lean, sidebar), geocode, reverseGeocode, fetchNews (Google News RSS via rss2json proxy). UNIT_PRESETS{fahrenheit:{mph},celsius:{kmh}}. fetchJSON error wrapper. toQuery().
js/storage.js        localStorage: getUnit/setUnit, getSavedLocations/saveLocation/removeLocation/isSaved. locationKey()=coords@3dp (dedupe key).
js/ui.js             DOM rendering, incl. renderNews/setNewsLoading/showNewsError. See below.
js/radar.js           Leaflet + RainViewer radar pane. See below.
js/app.js            state, init, geolocation, event wiring, fallback chain, search, saved, news (loadNews). See below.
js/particles.js      ambient dust-particle canvas background. Self-contained IIFE, runs immediately (no DOMContentLoaded gate needed — `#bg-particles` is already parsed by the time this script tag runs). See below.
favicon.svg           blue circle + golden sun w/ rays peeking behind white cloud. Linked in <head> + theme-color meta #2b6fc8.
PLAN.md               original 8-step build plan (all done) — describes the OLD gradient/glassmorphism visual direction, now superseded (see below); left as historical record.
README.md             STILL THE ONE-LINE STUB — offered to write a proper one; user hasn't taken it up.
```

### js/ui.js key exports (globals; no modules)
`els{}` (cached nodes) · `escapeHtml` · `flagImg(cc)` (returns `<img class=flag>` from flagcdn) · `placeLabelHtml(loc)` (flag before name; 📍 pin first for current loc) · `renderCurrent/renderHourly/renderDaily` · `formatHour/formatDay` (parse ISO components, tz-safe; index 0 = "Now"/"Today") · `setLoading/showError` · `renderSearchResults/hideSearchResults` · `renderSavedList/setSavedWeather` · `setFallbackHint` · `renderNews/setNewsLoading/showNewsError` (news-list-scoped states only) · `formatNewsDate` (relative time from the feed's UTC `pubDate`).

### js/app.js key exports
`BIG_CITIES[8]` (cold-start fallback) · `state{unit,location,data}` · `debounce` · `getCurrentPosition()` (Promise wrap, 8s timeout) · `resolveInitialLocation()` → **fallback chain: geolocation → first saved → random big city** (returns {location,fallback}) · `loadWeather(location,fallback)` (fetch→render→updateSaveButton→updateRadar→async reverseGeocode to swap in real city name→re-run loadNews) · `loadNews(location)` (news pane, guarded by `newsLoadedFor` against duplicate fetches for the same location object) · `updateSaveButton` · `refreshSaved` (renders sidebar, fires `fetchCurrent` per city for mini-weather) · `setSidebarOpen(open)` (toggles `#sidebar-wrap`/`#sidebar-backdrop`/`#sidebar-tab` aria-expanded — the saved-locations drawer) · `runSearch`(debounced 300ms) · `selectSearchResult` · `wireEvents` · `init` (DOMContentLoaded).

### Saved-locations drawer (2026-07-23)
The sidebar is hidden by default at **all** screen sizes now (previously it was a static desktop column that only became a mobile drawer below 760px — that distinction is gone). Structure: `#sidebar-wrap` (fixed, `translateX(-100%)` when closed) contains `#sidebar-tab` (a small ★ pull-tab positioned at `left: 100%` of the wrap, so it rides along with the slide transform and always sits flush against the viewport edge) and the `<aside id="sidebar">` content. `#sidebar-backdrop` dims the page and closes the drawer on click; Escape also closes it. `setSidebarOpen()` in `js/app.js` is the single source of truth for open/close — call it rather than toggling classes ad hoc.

### Footer (2026-07-23)
`<footer class="site-footer">` is the last child of `<main>`, after the radar+news row. Single link ("Built by GundamSneed with Claude") to `github.com/GundamSneed/weatherApp`, `target="_blank" rel="noopener noreferrer"`. Styled quiet on purpose: `--text-faint`, top border only, no card/shadow. See `docs/feature-footer-attribution.md`.

### Radar + news row (2026-07-23)
`.panels-row` (`index.html`, last section before the footer) is a two-up grid holding the radar pane and the local-news pane; collapses to one column at the existing 760px breakpoint. Order per the feature docs: header → current → hourly → daily → radar+news row → footer.

**Radar pane — first third-party JS library.** `js/radar.js` adds a live precipitation radar. **Leaflet (1.9.4, via unpkg CDN, SRI-pinned in `index.html`) is the first non-vanilla JS dependency in this codebase** — flagged per `docs/feature-weather-radar.md` as a real precedent, not just an implementation detail; if this pattern is questioned later, that doc has the reasoning.
- Data: RainViewer (`api.rainviewer.com/public/weather-maps.json`, keyless) for the precipitation tile index; OpenStreetMap standard tiles for the basemap (keyless, requires visible attribution — Leaflet's attribution control handles this, don't remove it). Both attributions render via `.leaflet-control-attribution`, reskinned dark in `css/styles.css`.
- `initRadarMap()` builds the Leaflet map once (`#radar-map`), with **panning/zooming fully disabled** (`dragging/scrollWheelZoom/doubleClickZoom/touchZoom/boxZoom/keyboard: false`, no zoom control) — a deliberate MVP choice to avoid the map fighting page scroll on mobile; revisit only if the user asks for interactivity.
- `getLatestRadarFrame()` fetches the RainViewer frame index once per page load (cached promise) and returns the last entry of `radar.past` (most recent observed frame) — MVP is a static overlay, not the looping animation RainViewer also supports (`radar.nowcast` exists in the live API but is unused).
- `updateRadar(location)` is called from `loadWeather()` in `js/app.js` (after `renderDaily`/`updateSaveButton`) — recenters the map on every location change (geolocation, search, saved-location click, fallback city) and attaches the precipitation tile layer once on first load.
- Fixed height (`360px` desktop / `280px` <=760px) since Leaflet requires an explicit container height. Loading/error state is a simple absolutely-positioned overlay (`#radar-status`), not `setLoading`/`showError` (those are scoped to the current-conditions panel).

**News pane.** `fetchNews()` in `js/api.js` queries Google News RSS through the `rss2json.com` pass-through proxy — the raw feed has no CORS headers for a direct browser fetch, rss2json does. `loadNews()` in `js/app.js` is called from `loadWeather()` (independent of the forecast fetch, fails quietly into the news list only, same convention as sidebar mini-weather) and again once reverse geocoding resolves a real place name (news needs a name, not raw coords). `newsLoadedFor` guards against redundant fetches when `loadWeather` re-runs for the same location (e.g. unit toggle).

### Ambient particle background (2026-07-23)
`js/particles.js` draws a small mouse-reactive dust-particle field on `#bg-particles`, a `position:fixed`, full-viewport `<canvas>` at `z-index:0` (first child of `<body>`, `pointer-events:none`). Modeled after a Spline community "Particles" scene the user shared (white dots on near-black, wispy drift, mouse-reactive) but hand-built in plain canvas 2D — **no new dependency, no WebGL/Spline runtime** (that path was considered and rejected as too heavy for a zero-build vanilla-JS app; see conversation this was scoped in for the tradeoff).
- Self-contained IIFE, no exports, no coupling to weather/location state — it is *not* weather-reactive (unlike the old removed `weatherScene.js`; see the design-philosophy bullet above for that distinction).
- Particle count scales with viewport area (`DENSITY` in `js/particles.js`), capped at `MAX_PARTICLES` (260) for perf. Each particle drifts via a cheap layered-sine flow field (reads like curl noise, no noise library needed), is repelled from the live cursor position (`MOUSE_RADIUS`/`MOUSE_FORCE`), and eases back toward its seeded home position (`RETURN_FORCE`) so drift stays visually bounded. Frames are painted by fading the previous frame (`TRAIL_ALPHA`) rather than clearing, which is what produces the soft wispy trails — all these are named constants at the top of the file if the look needs tuning.
- Respects `prefers-reduced-motion`: draws one static frame and never starts the `requestAnimationFrame` loop or attaches the drift/repulsion math (live toggling of the OS setting is handled too, via a `matchMedia` `change` listener). Also fully pauses (`cancelAnimationFrame`) on `visibilitychange` when the tab is hidden, and resizes/reseeds particles (debounced 150ms) on window resize.
- Reads `--bg` from `:root` at startup (via `getComputedStyle`) to match the trail/clear color to the theme, instead of hardcoding the hex — if `--bg` changes, this stays in sync automatically.
- Only visible in the gaps between opaque `.card` panels (page margins, header strip, current-conditions section) — see the `css/styles.css` file-map note above for the stacking-context setup (`.app` lifted to `z-index:1`).

---

## Design philosophy / decisions (why things are the way they are)
- **Zero build tooling.** Plain files, `<script>` tags in dependency order, all globals. Keep it that way unless the user asks otherwise.
- **Two-provider, keyless.** Open-Meteo for weather, BigDataCloud only for reverse geocoding. flagcdn for flag images. No API keys, ever.
- **Flat, opaque, dark theme (current, since 2026-07-23).** Page background is a single flat grey (`--bg`); all surfaces (header, sidebar, cards, dropdown) are solid opaque dark-grey panels (`--panel`/`--panel-strong`), no transparency/blur. A dark blue (`--accent-blue`) marks interactive/active state: unit-toggle active segment, search-input focus border+glow, card hover border, saved-item hover accent, fallback-hint left border, keyboard focus rings, themed scrollbars. Gold (`--accent`) is kept but scoped narrowly to the save/star button (favorite convention). Red stays scoped to the remove/delete hover.
- **Square corners, hard offset shadows (current, since 2026-07-23).** No `border-radius` anywhere — every panel/card/pill is a sharp rectangle; the old `--radius`/`--radius-sm` tokens are gone, don't reintroduce rounding without being asked. Shadows are solid offset blocks, not soft blurs: `--shadow` (3px/3px, resting), `--shadow-hover` (5px/5px, hourly/daily card + sidebar-tab hover — pairs with the existing translateY lift), `--shadow-inset` (pressed-in look for "currently active" states: unit-toggle active segment, sidebar-tab while the drawer is open). Keep that raised-vs-pressed distinction when adding new interactive elements. Scrollbars are themed globally (`--accent-blue` thumb on `--panel` track, via `scrollbar-color` + `::-webkit-scrollbar*`) so they match everywhere, including the hourly strip's horizontal scrollbar when the layout is compressed.
- **No weather-reactive background** — but a generic ambient one exists (2026-07-23, later same day as the flat redesign). The old weather-condition gradient + particle scene (sun/moon/stars/clouds/rain/snow/fog/lightning, `js/weatherScene.js`) was removed entirely, not just hidden — don't re-add references to `buildWeatherScene`, `WEATHER_THEMES`, `weatherCategory`, `applyWeatherTheme`, or `#weather-bg`; they no longer exist. In its place, `js/particles.js` draws a small, always-on, non-weather-reactive dust-particle field on `#bg-particles` (see below) — a deliberate, separately-scoped re-add per the user, not a revert of the removal above. If weather-reactive visuals are wanted later, that's still new work.
- **Graceful fallbacks everywhere**: geolocation denied → fallback chain with an explanatory hint banner; reverse-geocode fail → keep "Your Location"; fetch fail → `showError`; each sidebar card fails independently.

## Feature checklist (all DONE)
Current conditions (geolocation + reverse-geocoded name) · hourly (24h) · 7-day · city search (debounced, flag-disambiguated) · saved locations (localStorage, sidebar mini-weather, add/remove) · °F↔°C toggle (persisted, updates everything, wind units too) · custom favicon · saved-locations drawer hidden by default, revealed via ★ tab, closes on backdrop click/Escape/selecting a location · reduced-motion support (fade-in/hover-lift micro-animations only) · footer attribution link (GitHub repo, new tab) · live radar pane (Leaflet + RainViewer) · local news pane (Google News RSS via rss2json) · ambient mouse-reactive particle background (canvas, non-weather-reactive).

## Likely next steps / open threads
- **README.md is still a stub** — the obvious next task; offer to write it.
- Possible future polish the user might want: tune the grey/blue palette further; revisit whether any subtle motion should return; PWA/offline; unit toggle for wind independent of temp; radar looping animation through `radar.past` frames (flagged as a stretch goal, not built); pan/zoom on the radar map if a user asks for it.
- All three `docs/` feature specs (`feature-footer-attribution.md`, `feature-weather-radar.md`, `feature-local-news.md`) are now implemented.
- No known bugs at last commit.

## State at handoff
- Branch: on `dev`. Visual redesign (flat grey + opaque panels + blue accent, weather-reactive animated background removed) **plus** the new ambient particle background (`js/particles.js`, `#bg-particles`) are done as **uncommitted working-tree edits** — user is reviewing via VSCode Live Preview before committing. Don't commit on their behalf.
