// Open-Meteo API wrappers — no API key required.
//   Forecast:  https://api.open-meteo.com/v1/forecast
//   Geocoding: https://geocoding-api.open-meteo.com/v1/search

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
// Reverse geocoding (coords -> place name) — BigDataCloud, free, no API key.
// Open-Meteo has no reverse endpoint, so this fills in the current-location name.
const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

// Unit presets. The app toggles between "fahrenheit" and "celsius"; each maps to a
// matching wind-speed unit so the UI stays internally consistent.
const UNIT_PRESETS = {
  fahrenheit: { temperature_unit: "fahrenheit", wind_speed_unit: "mph",  tempSuffix: "°F", windSuffix: "mph" },
  celsius:    { temperature_unit: "celsius",    wind_speed_unit: "kmh",  tempSuffix: "°C", windSuffix: "km/h" },
};

// Fields we request from each Open-Meteo forecast block.
const CURRENT_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "weather_code",
  "wind_speed_10m",
  "is_day",
];
const HOURLY_FIELDS = ["temperature_2m", "weather_code", "is_day"];
const DAILY_FIELDS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_probability_max",
];

// Build a query string from a params object (arrays are comma-joined).
function toQuery(params) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(Array.isArray(v) ? v.join(",") : v)}`)
    .join("&");
}

// Thin fetch wrapper with error handling for JSON endpoints.
async function fetchJSON(url) {
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error("Network error — check your connection.");
  }
  if (!res.ok) {
    throw new Error(`Open-Meteo request failed (${res.status}).`);
  }
  const data = await res.json();
  if (data && data.error) {
    throw new Error(data.reason || "Open-Meteo returned an error.");
  }
  return data;
}

/**
 * Fetch current + hourly + daily forecast for a coordinate.
 * @param {Object} opts
 * @param {number} opts.latitude
 * @param {number} opts.longitude
 * @param {"fahrenheit"|"celsius"} [opts.unit="fahrenheit"]
 * @returns {Promise<Object>} raw Open-Meteo forecast JSON
 */
async function fetchForecast({ latitude, longitude, unit = "fahrenheit" }) {
  const preset = UNIT_PRESETS[unit] || UNIT_PRESETS.fahrenheit;
  const params = {
    latitude,
    longitude,
    current: CURRENT_FIELDS,
    hourly: HOURLY_FIELDS,
    daily: DAILY_FIELDS,
    temperature_unit: preset.temperature_unit,
    wind_speed_unit: preset.wind_speed_unit,
    timezone: "auto",
    forecast_days: 7,
    forecast_hours: 24,
  };
  return fetchJSON(`${FORECAST_URL}?${toQuery(params)}`);
}

/**
 * Search for places by name (powers the search bar).
 * @param {string} name
 * @param {number} [count=6]
 * @returns {Promise<Array>} normalized results: { id, name, admin1, country, countryCode, latitude, longitude }
 */
async function geocode(name, count = 6) {
  const query = name.trim();
  if (!query) return [];
  const params = { name: query, count, language: "en", format: "json" };
  const data = await fetchJSON(`${GEOCODE_URL}?${toQuery(params)}`);
  if (!data.results) return [];
  return data.results.map((r) => ({
    id: r.id,
    name: r.name,
    admin1: r.admin1 || "",       // state/region, when available
    country: r.country || "",
    countryCode: r.country_code || "",
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

/**
 * Reverse geocode a coordinate to a place name (used to name the current location).
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{name, admin1, country, countryCode}>}
 */
async function reverseGeocode(latitude, longitude) {
  const params = { latitude, longitude, localityLanguage: "en" };
  const data = await fetchJSON(`${REVERSE_GEOCODE_URL}?${toQuery(params)}`);
  return {
    name: data.city || data.locality || data.principalSubdivision || "",
    admin1: data.principalSubdivision || "",
    country: data.countryName || "",
    countryCode: data.countryCode || "",
  };
}
