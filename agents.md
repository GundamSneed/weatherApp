# agents.md — weatherApp

> Resume-context file for an AI coding agent. Read this top-to-bottom before touching code.
> Written 2026-07-22. Owner: GundamSneed (matthewgmonaco@gmail.com).

## TL;DR
Vanilla **HTML/CSS/JS** weather app (no framework, no build step, no bundler). Data from **Open-Meteo** (no key). Hosted on **GitHub Pages**. Fully functional and feature-complete as of the last commit. Visual design was reworked on 2026-07-23: **dropped the animated weather-scene background and glassmorphism** in favor of a flat dark-grey theme with opaque panels and a dark-blue accent.

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

---

## File map
```
index.html          structure: header(search+unit toggle), sidebar-wrap(★ tab + saved sidebar, off-canvas drawer), sidebar-backdrop, main(current/hourly/daily). Loads js in order: weatherCodes, api, storage, ui, app. Links favicon.svg.
css/styles.css       design tokens (:root vars: --bg flat page grey, --panel/--panel-strong/--panel-hover opaque dark-grey surfaces, --accent-blue dark-blue accent, --accent gold for the star), responsive (<=760px sidebar drawer).
js/weatherCodes.js   WEATHER_CODES{}, describeWeather(code,isDay)->{label,icon}.
js/api.js            fetchForecast, fetchCurrent (lean, sidebar), geocode, reverseGeocode. UNIT_PRESETS{fahrenheit:{mph},celsius:{kmh}}. fetchJSON error wrapper. toQuery().
js/storage.js        localStorage: getUnit/setUnit, getSavedLocations/saveLocation/removeLocation/isSaved. locationKey()=coords@3dp (dedupe key).
js/ui.js             DOM rendering. See below.
js/app.js            state, init, geolocation, event wiring, fallback chain, search, saved. See below.
favicon.svg           blue circle + golden sun w/ rays peeking behind white cloud. Linked in <head> + theme-color meta #2b6fc8.
PLAN.md               original 8-step build plan (all done) — describes the OLD gradient/glassmorphism visual direction, now superseded (see below); left as historical record.
README.md             STILL THE ONE-LINE STUB — offered to write a proper one; user hasn't taken it up.
```

### js/ui.js key exports (globals; no modules)
`els{}` (cached nodes) · `escapeHtml` · `flagImg(cc)` (returns `<img class=flag>` from flagcdn) · `placeLabelHtml(loc)` (flag before name; 📍 pin first for current loc) · `renderCurrent/renderHourly/renderDaily` · `formatHour/formatDay` (parse ISO components, tz-safe; index 0 = "Now"/"Today") · `setLoading/showError` · `renderSearchResults/hideSearchResults` · `renderSavedList/setSavedWeather` · `setFallbackHint`.

### js/app.js key exports
`BIG_CITIES[8]` (cold-start fallback) · `state{unit,location,data}` · `debounce` · `getCurrentPosition()` (Promise wrap, 8s timeout) · `resolveInitialLocation()` → **fallback chain: geolocation → first saved → random big city** (returns {location,fallback}) · `loadWeather(location,fallback)` (fetch→render→updateSaveButton→async reverseGeocode to swap in real city name) · `updateSaveButton` · `refreshSaved` (renders sidebar, fires `fetchCurrent` per city for mini-weather) · `setSidebarOpen(open)` (toggles `#sidebar-wrap`/`#sidebar-backdrop`/`#sidebar-tab` aria-expanded — the saved-locations drawer) · `runSearch`(debounced 300ms) · `selectSearchResult` · `wireEvents` · `init` (DOMContentLoaded).

### Saved-locations drawer (2026-07-23)
The sidebar is hidden by default at **all** screen sizes now (previously it was a static desktop column that only became a mobile drawer below 760px — that distinction is gone). Structure: `#sidebar-wrap` (fixed, `translateX(-100%)` when closed) contains `#sidebar-tab` (a small ★ pull-tab positioned at `left: 100%` of the wrap, so it rides along with the slide transform and always sits flush against the viewport edge) and the `<aside id="sidebar">` content. `#sidebar-backdrop` dims the page and closes the drawer on click; Escape also closes it. `setSidebarOpen()` in `js/app.js` is the single source of truth for open/close — call it rather than toggling classes ad hoc.

---

## Design philosophy / decisions (why things are the way they are)
- **Zero build tooling.** Plain files, `<script>` tags in dependency order, all globals. Keep it that way unless the user asks otherwise.
- **Two-provider, keyless.** Open-Meteo for weather, BigDataCloud only for reverse geocoding. flagcdn for flag images. No API keys, ever.
- **Flat, opaque, dark theme (current, since 2026-07-23).** Page background is a single flat grey (`--bg`); all surfaces (header, sidebar, cards, dropdown) are solid opaque dark-grey panels (`--panel`/`--panel-strong`), no transparency/blur. A dark blue (`--accent-blue`) marks interactive/active state: unit-toggle active segment, search-input focus border, card hover border, saved-item hover accent, fallback-hint left border, keyboard focus rings. Gold (`--accent`) is kept but scoped narrowly to the save/star button (favorite convention). Red stays scoped to the remove/delete hover.
- **No animated background.** The weather-condition gradient + particle scene (sun/moon/stars/clouds/rain/snow/fog/lightning, `js/weatherScene.js`) was removed entirely, not just hidden — don't re-add references to `buildWeatherScene`, `WEATHER_THEMES`, `weatherCategory`, `applyWeatherTheme`, or `#weather-bg`; they no longer exist. If animated/weather-reactive visuals come back, treat it as new work, not a revert.
- **Graceful fallbacks everywhere**: geolocation denied → fallback chain with an explanatory hint banner; reverse-geocode fail → keep "Your Location"; fetch fail → `showError`; each sidebar card fails independently.

## Feature checklist (all DONE)
Current conditions (geolocation + reverse-geocoded name) · hourly (24h) · 7-day · city search (debounced, flag-disambiguated) · saved locations (localStorage, sidebar mini-weather, add/remove) · °F↔°C toggle (persisted, updates everything, wind units too) · custom favicon · saved-locations drawer hidden by default, revealed via ★ tab, closes on backdrop click/Escape/selecting a location · reduced-motion support (fade-in/hover-lift micro-animations only).

## Likely next steps / open threads
- **README.md is still a stub** — the obvious next task; offer to write it.
- Possible future polish the user might want: tune the grey/blue palette further; revisit whether any subtle motion should return; PWA/offline; unit toggle for wind independent of temp.
- No known bugs at last commit.

## State at handoff
- Branch: on `dev`. Visual redesign (flat grey + opaque panels + blue accent, animated background removed) is done as **uncommitted working-tree edits** — user is reviewing via VSCode Live Preview before committing. Don't commit on their behalf.
