# agents.md — weatherApp

> Resume-context file for an AI coding agent. Read this top-to-bottom before touching code.
> Written 2026-07-22. Owner: GundamSneed (matthewgmonaco@gmail.com).

## TL;DR
Vanilla **HTML/CSS/JS** weather app (no framework, no build step, no bundler). Data from **Open-Meteo** (no key). Hosted on **GitHub Pages**. Fully functional and feature-complete as of the last commit. Most recent work has been iterative polish on the **animated weather background**.

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

## Verification without a browser you can see
The agent's in-app preview pane **cannot composite screenshots** here and **cannot grant geolocation** (falls back to a random city). GitHub Pages CDN also lags **~10–30s** after push, and aggressively caches JS/CSS.
- To confirm a deploy landed: `curl -s ".../js/FILE.js?cb=$(date +%s%N)" | grep -c SOMENEWTOKEN` (query-string cache-bust). Poll in a loop until it appears.
- To test scene/render **logic** on the live origin without the cache fighting you: in the preview pane, `fetch()` the deployed JS text and run it in an **isolated scope** via `new Function(src + "\nreturn {fnA, fnB};")()`, then call those. (Re-injecting a `<script>` twice throws duplicate-`const` errors — don't; use the Function-factory trick.)
- Real visual QA is done by the **user** in their own browser (hard-refresh Ctrl+Shift+R). Ask them to look; don't claim visual correctness you couldn't see.

---

## APIs (all keyless, CORS-OK from Pages origin)
- **Forecast**: `https://api.open-meteo.com/v1/forecast` — `current`, `hourly`, `daily`. `timezone=auto`. Times come back in the location's local tz as ISO strings **without offset** (parse components directly; don't `new Date()` naively).
- **Geocoding** (search): `https://geocoding-api.open-meteo.com/v1/search?name=` — returns name/admin1/country/country_code/lat/lon; handles duplicate city names.
- **Reverse geocoding** (current-location name): `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=&longitude=&localityLanguage=en`. Open-Meteo has NO reverse endpoint — this is why BigDataCloud is a 2nd provider. (curl needs `-L`; browser fetch follows the 307 automatically.)
- **Flags**: `https://flagcdn.com/<cc>.svg` via `<img>` (NOT emoji — Windows renders emoji flags as bare letters "US"/"GB"). Images need no CORS.
- **WMO weather codes** → label+icon table in `weatherCodes.js`. `is_day` (1/0) picks day vs night icon.

---

## File map (2163 lines total)
```
index.html          81   structure: #weather-bg layer, header(search+unit toggle), sidebar(saved), main(current/hourly/daily). Loads js in order: weatherCodes, weatherScene, api, storage, ui, app. Links favicon.svg.
css/styles.css     831   design tokens (:root vars incl --gradient-top/bottom), glass panels, responsive (<=760px sidebar drawer), all weather-scene particle styles + keyframes.
js/weatherCodes.js  53   WEATHER_CODES{}, describeWeather(code,isDay)->{label,icon}.
js/api.js          141   fetchForecast, fetchCurrent (lean, sidebar), geocode, reverseGeocode. UNIT_PRESETS{fahrenheit:{mph},celsius:{kmh}}. fetchJSON error wrapper. toQuery().
js/storage.js       64   localStorage: getUnit/setUnit, getSavedLocations/saveLocation/removeLocation/isSaved. locationKey()=coords@3dp (dedupe key).
js/ui.js           278   DOM rendering + theming. See below.
js/app.js          298   state, init, geolocation, event wiring, fallback chain, search, saved. See below.
js/weatherScene.js 377   animated background engine. See below.
favicon.svg         40   blue circle + golden sun w/ rays peeking behind white cloud. Linked in <head> + theme-color meta #2b6fc8.
PLAN.md                  original 8-step build plan (all done).
README.md                STILL THE ONE-LINE STUB — offered to write a proper one; user hasn't taken it up.
```

### js/ui.js key exports (globals; no modules)
`els{}` (cached nodes) · `escapeHtml` · `flagImg(cc)` (returns `<img class=flag>` from flagcdn) · `WEATHER_THEMES{cat:{day:[top,bot],night:[...]}}` · `weatherCategory(code)`→clear/clouds/fog/rain/snow/thunder · `applyWeatherTheme(code,isDay,windKmh)` (sets gradient vars + calls `buildWeatherScene`) · `placeLabelHtml(loc)` (flag before name; 📍 pin first for current loc) · `renderCurrent/renderHourly/renderDaily` · `formatHour/formatDay` (parse ISO components, tz-safe; index 0 = "Now"/"Today") · `setLoading/showError` · `renderSearchResults/hideSearchResults` · `renderSavedList/setSavedWeather` · `setFallbackHint`.

### js/app.js key exports
`BIG_CITIES[8]` (cold-start fallback) · `state{unit,location,data}` · `debounce` · `getCurrentPosition()` (Promise wrap, 8s timeout) · `resolveInitialLocation()` → **fallback chain: geolocation → first saved → random big city** (returns {location,fallback}) · `loadWeather(location,fallback)` (fetch→render→updateSaveButton→async reverseGeocode to swap in real city name) · `updateSaveButton` · `refreshSaved` (renders sidebar, fires `fetchCurrent` per city for mini-weather) · `runSearch`(debounced 300ms) · `selectSearchResult` · `wireEvents` · `init` (DOMContentLoaded).

### js/weatherScene.js — the animated background
Entry: **`buildWeatherScene(category, isDay, code, wind)`** — clears `#weather-bg` + timers, dispatches by category.
- Building blocks: `addSun/addMoon/addStars/addRain/addSnow/addFog/addOvercast/addLightning`.
- Clouds: **`makeCloudShape(w,h,color,opacity,className)`** = shared blob builder (connected core row of circles + top bumps + bottom bumps; **all circles, no flat bottom**). `makeCloud` wraps it (small, class `cloud`, drifts via `cloud-drift`), `makeCloudMass` wraps it (huge, class `cloud-mass`, sways in place via `mass-sway`). `.cloud-part` = each circle.
- **Heavy skies (overcast code 3 / rain / thunder / snow)** use **1–2 giant `addCloudMasses`** (not many small clouds). **Partly cloudy (code 2)** + **clear** use discrete `addClouds`. Overcast also adds a soft `addOvercast` blanket. `code===3` vs `2` distinguishes overcast vs partly.
- **Lightning**: `boltPaths()` generates a tall jagged main streak + 1–2 branches (SVG paths in 100×500 viewBox); `strike()` loop (JS setTimeout, timers tracked in `sceneTimers`, cleared on rebuild) picks a bolt, `paintBolt` regenerates its shape, `retrigger` replays `.strike` one-shot CSS flash on bolt + full-screen `.lightning-flash` in sync. Random 2.5–6.5s between strikes.
- **Wind → motion**: `driftDuration(wind)=260/(1+min(wind,90)/7)`, `swayDuration(wind)=100/(1+min(wind,90)/10)`. Wind is **normalized to km/h in `renderCurrent`** before passing down (fahrenheit preset returns mph → ×1.60934), so speed is unit-independent. calm≈very slow, strong≈brisk.
- `prefersReducedMotion()` trims particle counts + (via CSS `.weather-bg *{animation:none}`) stops motion; clouds get static spread when calm.

---

## Design philosophy / decisions (why things are the way they are)
- **Zero build tooling.** Plain files, `<script>` tags in dependency order, all globals. Keep it that way unless the user asks otherwise.
- **Two-provider, keyless.** Open-Meteo for weather, BigDataCloud only for reverse geocoding. flagcdn for flag images. No API keys, ever.
- **Legibility first** on the animated bg: particles sit *behind* blurred glass panels; big main-panel text has `text-shadow`; clouds are **darker greys (not white)** so white readouts pop. Any new bg effect must not fight the text.
- **Modern & vibrant** look: gradient that shifts by weather + time of day (`WEATHER_THEMES`), frosted-glass cards (`backdrop-filter`), oversized temp.
- **Cloud aesthetic** (evolved over several rounds — current = final): blobby, lumpy-all-around silhouettes (**no flat bottoms**), several randomized shapes, darker grey, massed + slow, and heavy skies use 1–2 big masses. Reference was a lumpy black-cloud silhouette sheet. Don't regress to flat-bottom/paper-cut or pure-white.
- **Graceful fallbacks everywhere**: geolocation denied → fallback chain with an explanatory hint banner; reverse-geocode fail → keep "Your Location"; fetch fail → `showError`; each sidebar card fails independently.

## Feature checklist (all DONE)
Current conditions (geolocation + reverse-geocoded name) · hourly (24h) · 7-day · city search (debounced, flag-disambiguated) · saved locations (localStorage, sidebar mini-weather, add/remove) · °F↔°C toggle (persisted, updates everything, wind units too) · animated weather background (condition + day/night + wind-scaled motion) · custom favicon · responsive/mobile drawer · reduced-motion support.

## Likely next steps / open threads
- **README.md is still a stub** — the obvious next task; offer to write it.
- Possible future polish the user might want: tune cloud counts/darkness/speed; lighten clouds toward white (they chose grey for legibility — revisit only if asked); more scene types; PWA/offline; unit toggle for wind independent of temp.
- No known bugs at last commit.

## State at handoff
- Branch: on `dev`, in sync with `main` (last merge = favicon). Last commit `3d8875d` "Add favicon".
- Everything merged and live. Nothing half-finished.
