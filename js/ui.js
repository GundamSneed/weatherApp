// Rendering helpers for the UI. Hourly/daily/sidebar rendering added in later steps.

// Cached element references.
const els = {
  fallbackHint: document.getElementById("fallback-hint"),
  currentName: document.getElementById("current-name"),
  currentTemp: document.getElementById("current-temp"),
  currentCond: document.getElementById("current-cond"),
  currentMeta: document.getElementById("current-meta"),
  saveBtn: document.getElementById("save-btn"),
};

// Round a number to a whole degree for display.
function roundTemp(n) {
  return Math.round(n);
}

// Build a readable place label from a location object.
function placeLabel(loc) {
  if (loc.isCurrent) return "📍 Your Location";
  const parts = [loc.name];
  if (loc.admin1 && loc.admin1 !== loc.name) parts.push(loc.admin1);
  if (loc.country) parts.push(loc.country);
  return parts.join(", ");
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
