# weatherApp — Build Plan

A weather app built with plain HTML / CSS / JS, powered by the [Open-Meteo](https://open-meteo.com/) API (no API key required).

## Features
1. **Main screen** showcasing the weather for the user's current location.
2. **Saved locations** — bookmark cities and view them in a sidebar with live mini weather.
3. **Search bar** to look up weather in any city.

## Tech & APIs
- **Plain HTML / CSS / JS** — no framework, no build step.
- **Open-Meteo Forecast API** — `current`, `hourly`, and `daily` data in a single request.
- **Open-Meteo Geocoding API** — powers the search bar (city name → coordinates).
- **Browser Geolocation API** — detects the user's current location.
- **localStorage** — persists saved locations + the °F/°C preference.

## Decisions
- **Forecast depth:** current conditions + hourly strip + 7-day daily forecast.
- **Units:** toggle between °F/mph and °C/km-h; preference saved in localStorage.
- **Visual style:** modern & vibrant — gradient background that shifts with weather/time
  of day, oversized temperature readout, frosted-glass cards.

## Location fallback logic
When the app loads it tries, in priority order:
1. **Geolocation** (if the user grants permission).
2. **First saved location** (if the user has any bookmarked).
3. **Random big city** from a seeded list (New York, London, Tokyo, Sydney, Paris,
   São Paulo, Cairo, Mumbai) — re-rolled each refresh.

When showing a fallback city, display a subtle hint explaining why
(e.g. "Showing Tokyo — search or allow location for your local weather").

## File structure
```
weatherApp/
├── index.html          # Layout: header (search), sidebar (saved), main (weather)
├── css/
│   └── styles.css      # Vibrant gradients, glass cards, responsive layout
├── js/
│   ├── api.js          # Open-Meteo fetch wrappers (forecast + geocoding)
│   ├── weatherCodes.js # WMO code → { label, icon } lookup table
│   ├── storage.js      # localStorage: saved locations + unit preference
│   ├── ui.js           # Rendering: main panel, hourly strip, 7-day, sidebar
│   └── app.js          # Wiring: init, geolocation, event handlers, state
└── README.md
```

## Build order
1. **Scaffold** — HTML skeleton + CSS layout (header / sidebar / main), gradient background.
2. **API layer** — `api.js` + `weatherCodes.js`; fetch and log data for a hardcoded city.
3. **Main panel** — render current conditions for geolocation, with denied-permission fallback.
4. **Hourly + 7-day** — scrolling hourly strip and daily forecast cards.
5. **Search** — geocoding-powered search bar; selecting a result loads it into the main panel.
6. **Saved locations** — save button, sidebar list with mini weather, click-to-view, remove, persisted.
7. **Units toggle** — °F/°C switch that re-renders everything and saves the preference.
8. **Polish** — dynamic gradient by weather/time of day, loading states, responsive/mobile.
