// Rendering helpers for the UI. Hourly/daily/sidebar rendering added in later steps.

// Cached element references.
const els = {
  fallbackHint: document.getElementById("fallback-hint"),
  currentName: document.getElementById("current-name"),
  currentTemp: document.getElementById("current-temp"),
  currentCond: document.getElementById("current-cond"),
  currentMeta: document.getElementById("current-meta"),
  saveBtn: document.getElementById("save-btn"),
  hourlySection: document.getElementById("hourly"),
  hourlyStrip: document.getElementById("hourly-strip"),
  dailySection: document.getElementById("daily"),
  dailyGrid: document.getElementById("daily-grid"),
  searchInput: document.getElementById("search-input"),
  searchResults: document.getElementById("search-results"),
  savedList: document.getElementById("saved-list"),
  savedEmpty: document.getElementById("saved-empty"),
};

// Escape user/API-provided text before inserting into innerHTML.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Flag image for a 2-letter ISO country code, via flagcdn.com.
// (Emoji flags don't render on Windows, so we use real images instead.)
function flagImg(cc) {
  if (!cc || cc.length !== 2) return "";
  const code = cc.toLowerCase();
  return `<img class="flag" src="https://flagcdn.com/${code}.svg" alt="${escapeHtml(cc.toUpperCase())}" width="20" height="15" loading="lazy">`;
}

// Round a number to a whole degree for display.
function roundTemp(n) {
  return Math.round(n);
}

// Gradient themes keyed by weather category and time of day. Chosen to keep
// white text legible while shifting the mood with conditions.
const WEATHER_THEMES = {
  clear:   { day: ["#2b8fe0", "#71b7f0"], night: ["#12203f", "#3b2f66"] },
  clouds:  { day: ["#5878a0", "#8ba6c2"], night: ["#252c3a", "#434d5e"] },
  fog:     { day: ["#6a7580", "#98a2ad"], night: ["#2b2f36", "#474d57"] },
  rain:    { day: ["#3f5c6b", "#6d8b9c"], night: ["#1c2530", "#374553"] },
  snow:    { day: ["#5f7fa6", "#9fbdd8"], night: ["#26324c", "#465873"] },
  thunder: { day: ["#332a4d", "#574571"], night: ["#211a33", "#3d2f55"] },
};

// Map a WMO code to a theme category.
function weatherCategory(code) {
  if (code <= 1) return "clear";
  if (code <= 3) return "clouds";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "thunder";
  return "clouds";
}

// Apply the gradient + animated scene for the given conditions.
function applyWeatherTheme(code, isDay, windKmh) {
  const category = weatherCategory(code);
  const [top, bottom] = WEATHER_THEMES[category][isDay ? "day" : "night"];
  document.documentElement.style.setProperty("--gradient-top", top);
  document.documentElement.style.setProperty("--gradient-bottom", bottom);
  buildWeatherScene(category, isDay, code, windKmh);
}

// Build a readable place label from a location object.
// Current location shows a pin; before reverse geocoding resolves it reads
// "Your Location", then swaps to the real city once we have a name.
function placeLabel(loc) {
  const isPlaceholder = !loc.name || loc.name === "Your Location";
  if (loc.isCurrent && isPlaceholder) return "📍 Your Location";
  const parts = [loc.name];
  if (loc.admin1 && loc.admin1 !== loc.name) parts.push(loc.admin1);
  if (!loc.isCurrent && loc.country) parts.push(loc.country);
  return (loc.isCurrent ? "📍 " : "") + parts.join(", ");
}

// HTML version of the place label for the main panel: flag image before the
// city name (pin first for the current location). Sized via CSS to match text.
function placeLabelHtml(loc) {
  const isPlaceholder = !loc.name || loc.name === "Your Location";
  if (loc.isCurrent && isPlaceholder) return "📍 Your Location";
  const pin = loc.isCurrent ? "📍 " : "";
  const flag = loc.countryCode ? flagImg(loc.countryCode) + " " : "";
  const parts = [loc.name];
  if (loc.admin1 && loc.admin1 !== loc.name) parts.push(loc.admin1);
  if (!loc.isCurrent && loc.country) parts.push(loc.country);
  return pin + flag + escapeHtml(parts.join(", "));
}

// Update just the place-name line (used when reverse geocoding resolves).
function updatePlaceName(loc) {
  els.currentName.innerHTML = placeLabelHtml(loc);
}

// Render the main current-conditions panel.
function renderCurrent(loc, data, unit) {
  const c = data.current;
  const units = data.current_units;
  const { label, icon } = describeWeather(c.weather_code, c.is_day);

  // Normalize wind to km/h (fahrenheit preset returns mph) so cloud motion is
  // consistent regardless of the unit toggle.
  const windKmh = unit === "celsius" ? c.wind_speed_10m : c.wind_speed_10m * 1.60934;
  applyWeatherTheme(c.weather_code, c.is_day, windKmh);

  els.currentTemp.classList.remove("pulse");
  els.currentName.innerHTML = placeLabelHtml(loc);
  els.currentTemp.textContent = `${roundTemp(c.temperature_2m)}°`;
  els.currentCond.textContent = `${icon} ${label}`;

  els.currentMeta.innerHTML = `
    <span>Feels like ${roundTemp(c.apparent_temperature)}°</span>
    <span>Wind ${Math.round(c.wind_speed_10m)} ${units.wind_speed_10m}</span>
    <span>Humidity ${c.relative_humidity_2m}%</span>
  `;
}

// Format an hourly timestamp ("2026-07-22T21:00") to a short label.
// The API returns times already in the location's local timezone, so we read
// the hour straight from the string to avoid browser-timezone shifts.
function formatHour(isoLocal, index) {
  if (index === 0) return "Now";
  const hour = parseInt(isoLocal.slice(11, 13), 10);
  const h12 = ((hour + 11) % 12) + 1;
  return `${h12} ${hour < 12 ? "AM" : "PM"}`;
}

// Format a daily date ("2026-07-22") to a weekday label.
function formatDay(isoDate, index) {
  if (index === 0) return "Today";
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short" });
}

// Render the 24-hour hourly strip.
function renderHourly(data) {
  const h = data.hourly;
  els.hourlyStrip.innerHTML = h.time
    .map((t, i) => {
      const { icon } = describeWeather(h.weather_code[i], h.is_day[i]);
      return `
        <div class="hour card">
          <span class="hour-time">${formatHour(t, i)}</span>
          <span class="hour-icon">${icon}</span>
          <span class="hour-temp">${roundTemp(h.temperature_2m[i])}°</span>
        </div>`;
    })
    .join("");
  els.hourlySection.hidden = false;
}

// Render the 7-day forecast grid.
function renderDaily(data) {
  const d = data.daily;
  els.dailyGrid.innerHTML = d.time
    .map((t, i) => {
      const { icon, label } = describeWeather(d.weather_code[i], 1); // daytime icon
      const precip = d.precipitation_probability_max?.[i];
      const precipHtml =
        precip != null && precip > 0
          ? `<span class="day-precip">💧 ${precip}%</span>`
          : "";
      return `
        <div class="day card">
          <span class="day-name">${formatDay(t, i)}</span>
          <span class="day-icon" title="${label}">${icon}</span>
          <span class="day-temps">
            <span class="day-hi">${roundTemp(d.temperature_2m_max[i])}°</span>
            <span class="day-lo">${roundTemp(d.temperature_2m_min[i])}°</span>
          </span>
          ${precipHtml}
        </div>`;
    })
    .join("");
  els.dailySection.hidden = false;
}

// Show a loading state in the main panel.
function setLoading(loc) {
  els.currentName.innerHTML = loc ? placeLabelHtml(loc) : "Loading…";
  els.currentTemp.textContent = "--°";
  els.currentTemp.classList.add("pulse");
  els.currentCond.textContent = "Fetching weather…";
  els.currentMeta.innerHTML = "";
}

// Show an error message in the main panel.
function showError(message) {
  els.currentTemp.classList.remove("pulse");
  els.currentName.textContent = "Something went wrong";
  els.currentTemp.textContent = "--°";
  els.currentCond.textContent = message || "Unable to load weather.";
  els.currentMeta.innerHTML = "";
  els.hourlySection.hidden = true;
  els.dailySection.hidden = true;
}

// Render the search-results dropdown. `results` are normalized geocoding hits;
// each item carries a data-index into the caller's results array.
function renderSearchResults(results) {
  const ul = els.searchResults;
  if (!results.length) {
    ul.innerHTML = `<li class="search-empty">No matches found</li>`;
    ul.hidden = false;
    return;
  }
  ul.innerHTML = results
    .map((r, i) => {
      const sub = [r.admin1, r.country].filter(Boolean).join(", ");
      return `
        <li class="search-item" data-index="${i}" role="option">
          <span class="search-item-name">${flagImg(r.countryCode)} ${escapeHtml(r.name)}</span>
          <span class="search-item-sub">${escapeHtml(sub)}</span>
        </li>`;
    })
    .join("");
  ul.hidden = false;
}

function hideSearchResults() {
  els.searchResults.hidden = true;
  els.searchResults.innerHTML = "";
}

// Render the sidebar list of saved locations. Mini-weather starts as a
// placeholder ("…") and is filled in asynchronously via setSavedWeather.
function renderSavedList(locations) {
  els.savedEmpty.hidden = locations.length > 0;
  els.savedList.innerHTML = locations
    .map((loc, i) => {
      const sub = [loc.admin1, loc.country].filter(Boolean).join(", ");
      return `
        <li class="saved-item card" data-index="${i}">
          <div class="saved-click" data-action="select" role="button" tabindex="0"
               aria-label="View weather for ${escapeHtml(loc.name)}">
            ${flagImg(loc.countryCode)}
            <span class="saved-info">
              <span class="saved-name">${escapeHtml(loc.name)}</span>
              <span class="saved-sub">${escapeHtml(sub)}</span>
            </span>
            <span class="saved-weather" data-index="${i}">
              <span class="saved-temp">…</span>
            </span>
          </div>
          <button class="saved-remove" data-action="remove"
                  aria-label="Remove ${escapeHtml(loc.name)}">×</button>
        </li>`;
    })
    .join("");
}

// Fill in a saved item's mini-weather once its current conditions arrive.
function setSavedWeather(index, icon, temp) {
  const el = els.savedList.querySelector(`.saved-weather[data-index="${index}"]`);
  if (el) {
    el.innerHTML = `<span class="saved-icon">${icon}</span><span class="saved-temp">${temp}°</span>`;
  }
}

// Show/hide the fallback hint banner.
function setFallbackHint(text) {
  if (!text) {
    els.fallbackHint.hidden = true;
    els.fallbackHint.textContent = "";
  } else {
    els.fallbackHint.textContent = text;
    els.fallbackHint.hidden = false;
  }
}
