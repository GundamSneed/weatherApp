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
};

// Round a number to a whole degree for display.
function roundTemp(n) {
  return Math.round(n);
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

// Update just the place-name line (used when reverse geocoding resolves).
function updatePlaceName(loc) {
  els.currentName.textContent = placeLabel(loc);
}

// Render the main current-conditions panel.
function renderCurrent(loc, data, unit) {
  const c = data.current;
  const units = data.current_units;
  const { label, icon } = describeWeather(c.weather_code, c.is_day);

  els.currentName.textContent = placeLabel(loc);
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
  els.currentName.textContent = loc ? placeLabel(loc) : "Loading…";
  els.currentTemp.textContent = "--°";
  els.currentCond.textContent = "Fetching weather…";
  els.currentMeta.innerHTML = "";
}

// Show an error message in the main panel.
function showError(message) {
  els.currentName.textContent = "Something went wrong";
  els.currentTemp.textContent = "--°";
  els.currentCond.textContent = message || "Unable to load weather.";
  els.currentMeta.innerHTML = "";
  els.hourlySection.hidden = true;
  els.dailySection.hidden = true;
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
