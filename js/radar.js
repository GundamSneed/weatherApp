// Live radar pane: RainViewer precipitation tiles over a Leaflet base map.
// Leaflet (CDN, no key) is the first third-party JS library in this codebase —
// see agents.md and docs/feature-weather-radar.md for the reasoning.
// Fixed view (no pan/zoom) so the map doesn't fight page scroll on mobile.

const RAINVIEWER_INDEX_URL = "https://api.rainviewer.com/public/weather-maps.json";
const RADAR_ZOOM = 7;
const RADAR_TILE_SIZE = 256;
const RADAR_COLOR_SCHEME = 2; // RainViewer "Universal Blue" scheme
const RADAR_TILE_OPTIONS = "1_1"; // smooth + snow

let radarMap = null;
let radarOverlay = null;
let radarFramePromise = null;

const radarStatusEl = document.getElementById("radar-status");

function setRadarStatus(text) {
  if (!radarStatusEl) return;
  radarStatusEl.hidden = !text;
  radarStatusEl.textContent = text || "";
}

function initRadarMap() {
  if (radarMap) return radarMap;
  radarMap = L.map("radar-map", {
    center: [20, 0],
    zoom: 2,
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false,
    boxZoom: false,
    keyboard: false,
  });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  }).addTo(radarMap);
  window.addEventListener("resize", () => radarMap.invalidateSize());
  return radarMap;
}

// Fetch the RainViewer frame index once per page load (cached) and return the
// most recent observed frame (last entry of `radar.past`).
function getLatestRadarFrame() {
  if (!radarFramePromise) {
    radarFramePromise = fetch(RAINVIEWER_INDEX_URL)
      .then((res) => {
        if (!res.ok) throw new Error("RainViewer request failed");
        return res.json();
      })
      .then((data) => {
        const past = data?.radar?.past || [];
        if (!past.length) throw new Error("No radar frames available");
        return { host: data.host, frame: past[past.length - 1] };
      });
  }
  return radarFramePromise;
}

function radarTileUrl(host, framePath) {
  return `${host}${framePath}/${RADAR_TILE_SIZE}/{z}/{x}/{y}/${RADAR_COLOR_SCHEME}/${RADAR_TILE_OPTIONS}.png`;
}

// Recenter the radar on the given location and (once) attach the latest
// precipitation overlay. Call whenever the displayed location changes.
async function updateRadar(location) {
  if (!location || location.latitude == null || location.longitude == null) return;
  const map = initRadarMap();
  map.setView([location.latitude, location.longitude], RADAR_ZOOM);
  requestAnimationFrame(() => map.invalidateSize());

  if (radarOverlay) return; // frame already loaded and attached; recentering is enough

  setRadarStatus("Loading radar…");
  try {
    const { host, frame } = await getLatestRadarFrame();
    radarOverlay = L.tileLayer(radarTileUrl(host, frame.path), {
      tileSize: RADAR_TILE_SIZE,
      opacity: 0.75,
      attribution:
        'Radar &copy; <a href="https://www.rainviewer.com" target="_blank" rel="noopener noreferrer">RainViewer</a>',
    }).addTo(map);
    setRadarStatus("");
  } catch {
    setRadarStatus("Radar unavailable right now.");
  }
}
