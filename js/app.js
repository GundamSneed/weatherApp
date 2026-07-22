// App entry point: state, init, geolocation, and event wiring.

// Seeded big cities for the cold-start fallback (no geolocation, no saved locations).
const BIG_CITIES = [
  { name: "New York",  admin1: "New York",       country: "United States", countryCode: "US", latitude: 40.7128, longitude: -74.0060 },
  { name: "London",    admin1: "England",         country: "United Kingdom", countryCode: "GB", latitude: 51.5085, longitude: -0.1257 },
  { name: "Tokyo",     admin1: "Tokyo",           country: "Japan",          countryCode: "JP", latitude: 35.6895, longitude: 139.6917 },
  { name: "Sydney",    admin1: "New South Wales", country: "Australia",      countryCode: "AU", latitude: -33.8688, longitude: 151.2093 },
  { name: "Paris",     admin1: "Île-de-France",   country: "France",         countryCode: "FR", latitude: 48.8566, longitude: 2.3522 },
  { name: "São Paulo", admin1: "São Paulo",       country: "Brazil",         countryCode: "BR", latitude: -23.5505, longitude: -46.6333 },
  { name: "Cairo",     admin1: "Cairo",           country: "Egypt",          countryCode: "EG", latitude: 30.0444, longitude: 31.2357 },
  { name: "Mumbai",    admin1: "Maharashtra",     country: "India",          countryCode: "IN", latitude: 19.0760, longitude: 72.8777 },
];

// Global app state.
const state = {
  unit: getUnit(),      // "fahrenheit" | "celsius"
  location: null,       // currently displayed location
};

// Promise wrapper around the callback-based Geolocation API.
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(err),
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

// Pick a random seeded city.
function randomCity() {
  return BIG_CITIES[Math.floor(Math.random() * BIG_CITIES.length)];
}

// Decide which location to show first, per the fallback chain:
//   geolocation → first saved location → random big city.
// Returns { location, fallback } where fallback is null | "saved" | "random".
async function resolveInitialLocation() {
  try {
    const pos = await getCurrentPosition();
    return {
      location: {
        name: "Your Location",
        isCurrent: true,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      },
      fallback: null,
    };
  } catch {
    const saved = getSavedLocations();
    if (saved.length > 0) {
      return { location: saved[0], fallback: "saved" };
    }
    return { location: randomCity(), fallback: "random" };
  }
}

// Compose the fallback-hint text for a given fallback reason.
function fallbackHintText(location, fallback) {
  if (fallback === "random") {
    return `Showing ${location.name} — search a city or allow location access for your local weather.`;
  }
  if (fallback === "saved") {
    return `Showing your saved location ${location.name} — allow location access for your local weather.`;
  }
  return "";
}

// Fetch and render weather for a location using the current unit.
async function loadWeather(location, fallback = null) {
  state.location = location;
  setFallbackHint(fallbackHintText(location, fallback));
  setLoading(location);
  try {
    const data = await fetchForecast({
      latitude: location.latitude,
      longitude: location.longitude,
      unit: state.unit,
    });
    state.data = data;
    renderCurrent(location, data, state.unit);
  } catch (err) {
    showError(err.message);
  }
}

// Reflect the active unit in the toggle UI.
function syncUnitToggle() {
  document.querySelectorAll(".unit-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.unit === state.unit);
  });
}

function wireEvents() {
  // Sidebar toggle (mobile).
  const menuBtn = document.getElementById("menu-btn");
  const sidebar = document.getElementById("sidebar");
  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", () => sidebar.classList.toggle("is-open"));
  }

  // Unit toggle: switch units, persist, and re-fetch the current location.
  const unitToggle = document.getElementById("unit-toggle");
  if (unitToggle) {
    unitToggle.addEventListener("click", (e) => {
      const btn = e.target.closest(".unit-btn");
      if (!btn || btn.dataset.unit === state.unit) return;
      state.unit = btn.dataset.unit;
      setUnit(state.unit);
      syncUnitToggle();
      if (state.location) loadWeather(state.location);
    });
  }
}

async function init() {
  syncUnitToggle();
  wireEvents();

  // Hourly/daily sections are populated in step 4 — hide until then.
  document.getElementById("hourly").hidden = true;
  document.getElementById("daily").hidden = true;

  const { location, fallback } = await resolveInitialLocation();
  await loadWeather(location, fallback);
}

document.addEventListener("DOMContentLoaded", init);
