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

// Most recent search results, indexed by the dropdown's data-index.
let searchResults = [];

// Simple trailing debounce.
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

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

// Guards against redundant news fetches for a location we've already loaded
// news for (e.g. a unit-toggle flip re-runs loadWeather for the same location).
let newsLoadedFor = null;

// Fetch and render local news for a location. Independent of the forecast
// fetch and fails quietly (news-list-scoped error) — never breaks the rest
// of the page, same convention as the sidebar's per-card mini-weather.
function loadNews(location) {
  const hasName = location && location.name && location.name !== "Your Location";
  if (!hasName) {
    setNewsLoading();
    return;
  }
  if (newsLoadedFor === location) return;
  newsLoadedFor = location;
  setNewsLoading();
  fetchNews(location)
    .then((items) => {
      if (state.location === location) renderNews(items);
    })
    .catch(() => {
      if (state.location === location) showNewsError();
    });
}

// Fetch and render weather for a location using the current unit.
async function loadWeather(location, fallback = null) {
  state.location = location;
  setFallbackHint(fallbackHintText(location, fallback));
  setLoading(location);
  loadNews(location);
  try {
    const data = await fetchForecast({
      latitude: location.latitude,
      longitude: location.longitude,
      unit: state.unit,
    });
    state.data = data;
    renderCurrent(location, data);
    renderHourly(data);
    renderDaily(data);
    updateSaveButton();
    updateRadar(location);

    // For the current location we only have coords — resolve the real city
    // name in the background and swap it in when it arrives (keep the
    // "Your Location" placeholder if reverse geocoding fails).
    if (location.isCurrent && (!location.name || location.name === "Your Location")) {
      reverseGeocode(location.latitude, location.longitude)
        .then((place) => {
          if (place.name && state.location === location) {
            Object.assign(location, place);
            updatePlaceName(location);
            updateSaveButton(); // now has a name/country -> becomes saveable
            loadNews(location); // re-query news now that we have a real place name
          }
        })
        .catch(() => {});
    }
  } catch (err) {
    showError(err.message);
  }
}

// Reflect the saved/unsaved state of the current location on the ☆ button.
// Hidden until the location has a real name (not the "Your Location" placeholder).
function updateSaveButton() {
  const loc = state.location;
  const hasName = loc && loc.name && loc.name !== "Your Location";
  if (!hasName) {
    els.saveBtn.hidden = true;
    return;
  }
  const saved = isSaved(loc);
  els.saveBtn.hidden = false;
  els.saveBtn.textContent = saved ? "★" : "☆";
  els.saveBtn.classList.toggle("is-saved", saved);
  els.saveBtn.setAttribute("aria-label", saved ? "Remove from saved" : "Save this location");
}

// Re-render the sidebar list and (re)load each location's mini-weather.
function refreshSaved() {
  const saved = getSavedLocations();
  renderSavedList(saved);
  updateSaveButton();
  saved.forEach((loc, i) => {
    fetchCurrent({ latitude: loc.latitude, longitude: loc.longitude, unit: state.unit })
      .then((d) => {
        const c = d.current;
        const { icon } = describeWeather(c.weather_code, c.is_day);
        setSavedWeather(i, icon, Math.round(c.temperature_2m));
      })
      .catch(() => setSavedWeather(i, "⚠️", "--"));
  });
}

// Open/close the saved-locations drawer and keep the tab + backdrop in sync.
function setSidebarOpen(open) {
  document.getElementById("sidebar-wrap").classList.toggle("is-open", open);
  document.getElementById("sidebar-backdrop").classList.toggle("is-open", open);
  document.getElementById("sidebar-tab").setAttribute("aria-expanded", String(open));
}

// Reflect the active unit in the toggle UI.
function syncUnitToggle() {
  document.querySelectorAll(".unit-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.unit === state.unit);
  });
}

// Run a geocoding search and populate the dropdown.
const runSearch = debounce(async (query) => {
  try {
    const results = await geocode(query, 6);
    searchResults = results;
    renderSearchResults(results);
  } catch {
    searchResults = [];
    hideSearchResults();
  }
}, 300);

// Load the weather for a chosen search result and reset the search UI.
function selectSearchResult(index) {
  const loc = searchResults[index];
  if (!loc) return;
  els.searchInput.value = "";
  hideSearchResults();
  els.searchInput.blur();
  loadWeather(loc); // explicit choice -> no fallback hint
}

function wireEvents() {
  // Sidebar: hidden by default, revealed via the star tab.
  const sidebarWrap = document.getElementById("sidebar-wrap");
  const sidebarTab = document.getElementById("sidebar-tab");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");
  if (sidebarWrap && sidebarTab && sidebarBackdrop) {
    sidebarTab.addEventListener("click", () => {
      setSidebarOpen(!sidebarWrap.classList.contains("is-open"));
    });
    sidebarBackdrop.addEventListener("click", () => setSidebarOpen(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    });
  }

  // Search: debounced geocoding as the user types.
  els.searchInput.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    if (q.length < 2) {
      searchResults = [];
      hideSearchResults();
      return;
    }
    runSearch(q);
  });

  // Keyboard: Enter selects the first match, Escape dismisses the dropdown.
  els.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && searchResults.length) {
      selectSearchResult(0);
    } else if (e.key === "Escape") {
      hideSearchResults();
      els.searchInput.blur();
    }
  });

  // Click a result to load it.
  els.searchResults.addEventListener("click", (e) => {
    const item = e.target.closest(".search-item");
    if (!item) return;
    selectSearchResult(Number(item.dataset.index));
  });

  // Dismiss the dropdown when clicking outside the search box.
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search")) hideSearchResults();
  });

  // Unit toggle: switch units, persist, re-fetch current + refresh sidebar.
  const unitToggle = document.getElementById("unit-toggle");
  if (unitToggle) {
    unitToggle.addEventListener("click", (e) => {
      const btn = e.target.closest(".unit-btn");
      if (!btn || btn.dataset.unit === state.unit) return;
      state.unit = btn.dataset.unit;
      setUnit(state.unit);
      syncUnitToggle();
      if (state.location) loadWeather(state.location);
      refreshSaved();
    });
  }

  // Save/unsave the currently displayed location.
  els.saveBtn.addEventListener("click", () => {
    const loc = state.location;
    if (!loc || !loc.name || loc.name === "Your Location") return;
    if (isSaved(loc)) {
      removeLocation(loc);
    } else {
      // Store a plain city entry (drop the transient isCurrent flag).
      saveLocation({
        name: loc.name,
        admin1: loc.admin1,
        country: loc.country,
        countryCode: loc.countryCode,
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
    }
    updateSaveButton();
    refreshSaved();
  });

  // Sidebar: select a saved location to view, or remove it.
  els.savedList.addEventListener("click", (e) => {
    const item = e.target.closest(".saved-item");
    if (!item) return;
    const index = Number(item.dataset.index);
    const saved = getSavedLocations();
    const loc = saved[index];
    if (!loc) return;
    if (e.target.closest('[data-action="remove"]')) {
      removeLocation(loc);
      updateSaveButton();
      refreshSaved();
    } else {
      loadWeather(loc);
      setSidebarOpen(false);
    }
  });

  // Keyboard access: Enter/Space on a saved item selects it.
  els.savedList.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const click = e.target.closest('.saved-click');
    if (!click) return;
    e.preventDefault();
    click.click();
  });
}

async function init() {
  syncUnitToggle();
  wireEvents();
  refreshSaved();

  const { location, fallback } = await resolveInitialLocation();
  await loadWeather(location, fallback);
}

document.addEventListener("DOMContentLoaded", init);
