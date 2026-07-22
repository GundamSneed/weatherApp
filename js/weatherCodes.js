// WMO weather interpretation codes → { label, icon }
// Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
// Stub for scaffold — filled out in step 2.
const WEATHER_CODES = {
  0: { label: "Clear sky", icon: "☀️" },
};

// Return a friendly description + icon for a WMO code (falls back gracefully).
function describeWeather(code) {
  return WEATHER_CODES[code] || { label: "Unknown", icon: "❓" };
}
