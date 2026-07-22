// localStorage helpers: saved locations + unit preference.

const STORAGE_KEYS = {
  saved: "weatherapp.savedLocations",
  unit: "weatherapp.unit",
};

// --- Unit preference ---------------------------------------------------------

function getUnit() {
  const u = localStorage.getItem(STORAGE_KEYS.unit);
  return u === "celsius" ? "celsius" : "fahrenheit"; // default fahrenheit
}

function setUnit(unit) {
  localStorage.setItem(STORAGE_KEYS.unit, unit === "celsius" ? "celsius" : "fahrenheit");
}

// --- Saved locations ---------------------------------------------------------
// A saved location: { id, name, admin1, country, countryCode, latitude, longitude }

function getSavedLocations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.saved);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Stable key for identifying a location (coords rounded to avoid float noise).
function locationKey(loc) {
  return `${Number(loc.latitude).toFixed(3)},${Number(loc.longitude).toFixed(3)}`;
}

function isSaved(loc) {
  const key = locationKey(loc);
  return getSavedLocations().some((l) => locationKey(l) === key);
}

function saveLocation(loc) {
  const list = getSavedLocations();
  const key = locationKey(loc);
  if (list.some((l) => locationKey(l) === key)) return list; // no dupes
  const entry = {
    name: loc.name,
    admin1: loc.admin1 || "",
    country: loc.country || "",
    countryCode: loc.countryCode || "",
    latitude: loc.latitude,
    longitude: loc.longitude,
  };
  const updated = [...list, entry];
  localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(updated));
  return updated;
}

function removeLocation(loc) {
  const key = locationKey(loc);
  const updated = getSavedLocations().filter((l) => locationKey(l) !== key);
  localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(updated));
  return updated;
}
