# Future feature — Local news pane

> Scope: medium — has a real feasibility risk (CORS) that should be validated **before**
> writing UI code, not discovered after. One agent, one sitting.
> Read `agents.md` at the repo root first for project-wide context (stack, hard
> workflow rules, design tokens) — this doc only covers what's specific to this feature.

## Goal
Beside the radar pane (see `feature-weather-radar.md`) — a two-column row below the 7-day
forecast, stacked on narrow screens — show a handful (3–5) of news headlines relevant to
the currently displayed location.

## Data source: Google News RSS (keyless — decided, but validate first)
The project has a hard "no API keys, ever" rule (see `agents.md`). Most news APIs
(NewsAPI, GNews, etc.) require a key. Google News RSS doesn't:

```
https://news.google.com/rss/search?q=<city name>&hl=en-US&gl=US&ceid=US:en
```

Query with the resolved place name (`loc.name`, optionally qualified with `admin1`/
`country` the way search results already format it, e.g. `"Austin, Texas"`) so results
stay relevant when city names collide.

### ⚠️ Validate CORS before building anything else
This is a static site (GitHub Pages, no backend to proxy through). Google News RSS may or
may not send CORS headers that allow a direct `fetch()` from a browser on our origin —
**check this first** with a quick manual test (browser fetch or curl checking
`Access-Control-Allow-Origin`) before writing any UI. If direct fetch is blocked, fall
back to a keyless pass-through and document whichever one actually works in `agents.md`:
- `https://api.allorigins.win/raw?url=<encoded feed url>` (generic CORS proxy, keyless)
- `https://api.rss2json.com/v1/api.json?rss_url=<encoded feed url>` (RSS→JSON, has a
  usable free/unauthenticated tier last we checked — reconfirm, these things change)

If none of these hold up reliably, that's worth surfacing back to the user rather than
shipping something flaky — this feature is more likely than the others to need a rethink.

## Behavior
- Re-query when the displayed location changes — same hook point as the radar feature
  (geolocation, search select, saved-location click, fallback city).
- Show 3–5 items: headline (linked, opens in new tab), source name, and ideally a
  relative/short date if the feed provides one easily.
- Loading/empty/error states should follow existing conventions in `js/ui.js`
  (`setLoading`/`showError` pattern) — if the feed fails, fail quietly (don't break the
  rest of the page), similar to how sidebar mini-weather cards fail independently.

## Design
- List styled like the app's existing card-list patterns (`saved-item`/`search-item`):
  each headline as a row, hover state with the blue accent border
  (`border-color: var(--accent-blue)`), **no border-radius** (square corners, matches the
  rest of the redesign).
- A `section-title`-style heading ("News") above the list, consistent with "Hourly" /
  "7-Day Forecast" / "Radar".
- Wrap the whole pane in the same `.card`-style container treatment as the radar pane so
  the two-column row reads as a matched pair (`var(--border)`, `box-shadow: var(--shadow)`).

## Acceptance criteria
- No API key anywhere in the code or committed config (a keyless CORS pass-through is
  fine; a key-gated news API is not, per the project's hard rule).
- Headlines are relevant to the currently displayed location and update when it changes.
- Entirely client-side.
- Matches the app's square-corner, dark-panel, blue-accent design language.
- Degrades gracefully (empty/error state) if the feed or proxy is unavailable.
