// WMO weather interpretation codes → { label, icon }.
// Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes).
//
// `icon` is either a single emoji string, or an object { day, night } when the
// icon should differ by time of day. Use describeWeather(code, isDay) to resolve.
const WEATHER_CODES = {
  0:  { label: "Clear sky",            icon: { day: "☀️", night: "🌙" } },
  1:  { label: "Mainly clear",         icon: { day: "🌤️", night: "🌙" } },
  2:  { label: "Partly cloudy",        icon: { day: "⛅",  night: "☁️" } },
  3:  { label: "Overcast",             icon: "☁️" },

  45: { label: "Fog",                  icon: "🌫️" },
  48: { label: "Rime fog",             icon: "🌫️" },

  51: { label: "Light drizzle",        icon: "🌦️" },
  53: { label: "Drizzle",              icon: "🌦️" },
  55: { label: "Heavy drizzle",        icon: "🌧️" },
  56: { label: "Freezing drizzle",     icon: "🌧️" },
  57: { label: "Freezing drizzle",     icon: "🌧️" },

  61: { label: "Light rain",           icon: "🌦️" },
  63: { label: "Rain",                 icon: "🌧️" },
  65: { label: "Heavy rain",           icon: "🌧️" },
  66: { label: "Freezing rain",        icon: "🌧️" },
  67: { label: "Freezing rain",        icon: "🌧️" },

  71: { label: "Light snow",           icon: "🌨️" },
  73: { label: "Snow",                 icon: "🌨️" },
  75: { label: "Heavy snow",           icon: "❄️" },
  77: { label: "Snow grains",          icon: "🌨️" },

  80: { label: "Light showers",        icon: "🌦️" },
  81: { label: "Showers",              icon: "🌧️" },
  82: { label: "Violent showers",      icon: "⛈️" },

  85: { label: "Snow showers",         icon: "🌨️" },
  86: { label: "Heavy snow showers",   icon: "❄️" },

  95: { label: "Thunderstorm",         icon: "⛈️" },
  96: { label: "Thunderstorm + hail",  icon: "⛈️" },
  99: { label: "Thunderstorm + hail",  icon: "⛈️" },
};

// Resolve a WMO code to { label, icon } for rendering.
// isDay: 1 (day) or 0 (night); defaults to day when omitted.
function describeWeather(code, isDay = 1) {
  const entry = WEATHER_CODES[code] || { label: "Unknown", icon: "❓" };
  const icon =
    typeof entry.icon === "object"
      ? (isDay ? entry.icon.day : entry.icon.night)
      : entry.icon;
  return { label: entry.label, icon };
}
