// Animated weather background scenes. buildWeatherScene(category, isDay) clears
// the background layer and populates it with particles/elements for the current
// conditions. Kept intentionally soft and low-opacity for text legibility.

const SCENE_ROOT_ID = "weather-bg";

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// Timers for JS-driven effects (e.g. lightning); cleared on each scene rebuild
// so switching conditions doesn't leave old strike loops running.
let sceneTimers = [];
function clearSceneTimers() {
  sceneTimers.forEach(clearTimeout);
  sceneTimers = [];
}

// Map wind speed (km/h) to animation durations — stronger wind = faster motion.
// Duration shrinks as wind rises, clamped so it never fully stops or blurs.
function driftDuration(wind) {
  const factor = 1 + Math.min(Math.max(wind, 0), 90) / 7;
  return 260 / factor; // seconds for a full cross-screen drift (calm ≈ 260s)
}
function swayDuration(wind) {
  const factor = 1 + Math.min(Math.max(wind, 0), 90) / 10;
  return 100 / factor; // seconds per gentle in-place sway (calm ≈ 100s)
}

// Create a div with a class and optional inline styles.
function sceneEl(cls, styles) {
  const el = document.createElement("div");
  el.className = cls;
  if (styles) Object.assign(el.style, styles);
  return el;
}

const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --- Building blocks ---------------------------------------------------------

function addSun(root) {
  const wrap = sceneEl("scene-sun");
  wrap.appendChild(sceneEl("sun-rays"));
  wrap.appendChild(sceneEl("sun-core"));
  root.appendChild(wrap);
}

function addMoon(root) {
  root.appendChild(sceneEl("scene-moon"));
}

function addStars(root, count) {
  for (let i = 0; i < count; i++) {
    root.appendChild(
      sceneEl("star", {
        left: `${rand(0, 100)}%`,
        top: `${rand(0, 70)}%`,
        width: `${rand(2, 3.5)}px`,
        height: `${rand(2, 3.5)}px`,
        animationDuration: `${rand(2.5, 6)}s`,
        animationDelay: `${rand(0, 5)}s`,
      })
    );
  }
}

// Build a blobby cloud silhouette from overlapping circles — lumpy all around
// (bumps on top AND bottom, no flat edge). A connected core row keeps the
// silhouette in one piece; bump counts/sizes are randomized for varied shapes.
// Shared by both small clouds and large masses.
function makeCloudShape(w, h, color, opacity, className) {
  const cloud = sceneEl(className, {
    width: `${w}px`,
    height: `${h}px`,
    opacity: `${opacity}`,
  });

  const circle = (x, y, dia) => {
    cloud.appendChild(
      sceneEl("cloud-part", {
        left: `${x - dia / 2}px`,
        top: `${y - dia / 2}px`,
        width: `${dia}px`,
        height: `${dia}px`,
        borderRadius: "50%",
        background: color,
      })
    );
  };

  const spread = (i, n, lo, hi) =>
    w * (lo + (hi - lo) * (n === 1 ? 0.5 : (i + rand(-0.3, 0.3)) / (n - 1)));

  // Connected core row along the middle.
  const coreDia = h * 0.82;
  const step = coreDia * 0.52;
  for (let x = coreDia * 0.5 + w * 0.02; x <= w - coreDia * 0.5 - w * 0.02; x += step) {
    circle(x + rand(-step * 0.25, step * 0.25), h * rand(0.46, 0.56), coreDia * rand(0.92, 1.06));
  }

  // Top bumps.
  const topN = Math.max(3, Math.round(w / (h * 0.7)));
  for (let i = 0; i < topN; i++) {
    circle(spread(i, topN, 0.1, 0.9), h * rand(0.28, 0.42), h * rand(0.46, 0.76));
  }

  // Bottom bumps (scalloped bottom — no flat edge).
  const botN = Math.max(2, Math.round(w / (h * 0.95)));
  for (let i = 0; i < botN; i++) {
    circle(spread(i, botN, 0.14, 0.86), h * rand(0.62, 0.74), h * rand(0.34, 0.56));
  }

  return cloud;
}

// Small drifting cloud. Aspect ratio varies per cloud for extra shape variety.
function makeCloud(w, opacity, color) {
  const h = w * rand(0.5, 0.66);
  return makeCloudShape(w, h, color, opacity, "cloud");
}

// Drifting clouds. Drift speed scales with `wind` (km/h); `color`/spread/size
// let each scene control mood and coverage.
function addClouds(
  root,
  { count = 5, opacity = 0.7, wind = 10, color = "#7c8ba0", topRange = [0, 55], size = [160, 300] } = {}
) {
  const calm = prefersReducedMotion();
  const base = driftDuration(wind);
  for (let i = 0; i < count; i++) {
    const cloud = makeCloud(rand(size[0], size[1]), opacity * rand(0.85, 1), color);
    const dur = base * rand(0.85, 1.2);
    Object.assign(cloud.style, {
      top: `${rand(topRange[0], topRange[1])}%`,
      animationDuration: `${dur}s`,
      animationDelay: `${-rand(0, dur)}s`,
    });
    // With animations disabled (reduced motion), spread clouds statically
    // instead of leaving them stacked at the drift start position.
    if (calm) cloud.style.left = `${rand(-5, 80)}%`;
    root.appendChild(cloud);
  }
}

// Build one very large cloud mass (wide, lumpy bank) using the shared shape.
function makeCloudMass(w, h, color, opacity) {
  return makeCloudShape(w, h, color, opacity, "cloud-mass");
}

// Add 1-2 very large cloud masses covering the upper sky (used for heavy
// conditions instead of many small drifting clouds). Masses sway gently.
function addCloudMasses(root, { color, opacity = 0.9, wind = 10 } = {}) {
  const vw = window.innerWidth || 1200;
  const vh = window.innerHeight || 800;
  const count = Math.random() < 0.4 ? 1 : 2;
  const base = swayDuration(wind);
  for (let i = 0; i < count; i++) {
    const w = count === 1 ? vw * rand(1.05, 1.3) : vw * rand(0.72, 0.95);
    const h = vh * rand(0.36, 0.5);
    const mass = makeCloudMass(w, h, color, opacity * rand(0.94, 1));
    const left =
      count === 1 ? (vw - w) / 2 : i === 0 ? -w * 0.12 : vw - w * 0.88;
    const dur = base * rand(0.85, 1.15);
    Object.assign(mass.style, {
      top: `${-h * rand(0.15, 0.32)}px`,
      left: `${left}px`,
      animationDuration: `${dur}s`,
      animationDelay: `${-rand(0, dur)}s`,
    });
    root.appendChild(mass);
  }
}

// A broad, soft cloud blanket for overcast skies (covers most of the sky).
function addOvercast(root, color, opacity) {
  root.appendChild(
    sceneEl("overcast", {
      background: `linear-gradient(to bottom, ${color} 0%, ${color} 52%, transparent 100%)`,
      opacity: `${opacity}`,
    })
  );
}

function addRain(root, count) {
  for (let i = 0; i < count; i++) {
    root.appendChild(
      sceneEl("rain-drop", {
        left: `${rand(0, 100)}%`,
        height: `${rand(60, 110)}px`,
        animationDuration: `${rand(0.5, 0.9)}s`,
        animationDelay: `${-rand(0, 1)}s`,
        opacity: `${rand(0.25, 0.55)}`,
      })
    );
  }
}

function addSnow(root, count) {
  for (let i = 0; i < count; i++) {
    const size = rand(4, 9);
    root.appendChild(
      sceneEl("snow-flake", {
        left: `${rand(0, 100)}%`,
        width: `${size}px`,
        height: `${size}px`,
        "--dx": `${rand(-60, 60)}px`,
        animationDuration: `${rand(6, 12)}s`,
        animationDelay: `${-rand(0, 12)}s`,
        opacity: `${rand(0.4, 0.85)}`,
      })
    );
  }
}

function addFog(root, wind = 10) {
  const base = 150 / (1 + Math.min(Math.max(wind, 0), 90) / 9);
  for (let i = 0; i < 4; i++) {
    const dur = base * rand(0.8, 1.2);
    root.appendChild(
      sceneEl("fog-band", {
        top: `${rand(10, 80)}%`,
        animationDuration: `${dur}s`,
        animationDelay: `${-rand(0, dur)}s`,
        opacity: `${rand(0.12, 0.25)}`,
      })
    );
  }
}

// Generate a jagged, branching lightning path (main streak + 1-2 branches),
// as SVG path `d` strings in a 100 x 500 viewBox.
function boltPaths() {
  const segs = 8;
  const pts = [[50, 0]];
  for (let i = 1; i <= segs; i++) {
    pts.push([50 + rand(-24, 24), (500 / segs) * i]);
  }
  const main =
    `M${pts[0][0]},${pts[0][1]} ` +
    pts.slice(1).map((p) => `L${p[0]},${p[1]}`).join(" ");

  const branches = [];
  const branchCount = Math.random() < 0.7 ? 1 : 2;
  for (let b = 0; b < branchCount; b++) {
    const [bx, by] = pts[Math.floor(rand(3, 6))];
    const dir = Math.random() < 0.5 ? 1 : -1;
    branches.push(
      `M${bx},${by} L${bx + dir * rand(16, 30)},${by + rand(40, 70)} ` +
      `L${bx + dir * rand(24, 46)},${by + rand(95, 135)}`
    );
  }
  return [main, ...branches];
}

function paintBolt(bolt) {
  bolt.style.left = `${rand(12, 80)}%`;
  bolt.style.transform = `scaleX(${rand(0.8, 1.15)})`;
  bolt.querySelector("svg").innerHTML = boltPaths()
    .map((d) => `<path class="bolt-line" d="${d}"/>`)
    .join("");
}

// Restart a one-shot flash animation on an element.
function retrigger(el) {
  el.classList.remove("strike");
  void el.offsetWidth; // force reflow so the animation replays
  el.classList.add("strike");
}

// Natural lightning: randomly timed strikes, each a freshly generated bolt
// flashed together with a sky-wide flash.
function addLightning(root) {
  const flash = sceneEl("lightning-flash");
  root.appendChild(flash);

  const bolts = [];
  for (let i = 0; i < 3; i++) {
    const bolt = sceneEl("bolt");
    bolt.innerHTML = '<svg viewBox="0 0 100 500" preserveAspectRatio="xMidYMin meet"></svg>';
    root.appendChild(bolt);
    bolts.push(bolt);
  }

  function strike() {
    const bolt = bolts[Math.floor(Math.random() * bolts.length)];
    paintBolt(bolt);
    retrigger(flash);
    retrigger(bolt);
    sceneTimers.push(setTimeout(strike, rand(2500, 6500)));
  }
  sceneTimers.push(setTimeout(strike, rand(600, 2000)));
}

// --- Scene composition -------------------------------------------------------

function buildWeatherScene(category, isDay, code, wind = 10) {
  const root = document.getElementById(SCENE_ROOT_ID);
  if (!root) return;
  clearSceneTimers();
  root.innerHTML = "";
  root.dataset.scene = `${category}-${isDay ? "day" : "night"}`;

  // Reduced motion: keep only calm, static-ish ambience (sun/moon/stars, few clouds).
  const calm = prefersReducedMotion();

  // Cloud colors — darker than the text so white readouts stay legible.
  const cloudColor = isDay ? "#7c8ba0" : "#464f60";

  switch (category) {
    case "clear":
      if (isDay) {
        addSun(root);
        if (!calm) {
          addClouds(root, { count: 3, opacity: 0.5, wind, color: "#c3cdda", topRange: [2, 40], size: [150, 260] });
        }
      } else {
        addStars(root, calm ? 30 : 60);
        addMoon(root);
      }
      break;

    case "clouds": {
      const overcast = code === 3; // 2 = partly cloudy, 3 = overcast
      if (overcast) {
        // Heavy sky: one or two large masses (+ soft blanket) instead of many.
        addOvercast(root, cloudColor, isDay ? 0.5 : 0.62);
        addCloudMasses(root, { color: cloudColor, opacity: isDay ? 0.95 : 0.9, wind });
      } else {
        // Partly cloudy: a handful of discrete drifting clouds.
        if (!isDay) addStars(root, 16);
        addClouds(root, {
          count: calm ? 6 : isDay ? 12 : 10,
          opacity: isDay ? 0.92 : 0.85,
          wind,
          color: cloudColor,
          topRange: [0, 52],
          size: [180, 340],
        });
      }
      break;
    }

    case "fog":
      addFog(root, wind);
      addClouds(root, {
        count: 4,
        opacity: 0.45,
        wind,
        color: isDay ? "#aab3c0" : "#565f6d",
        topRange: [0, 50],
      });
      break;

    case "rain":
      addCloudMasses(root, { color: isDay ? "#6c7a8c" : "#3c4553", opacity: isDay ? 0.92 : 0.82, wind });
      if (!calm) addRain(root, 70);
      break;

    case "snow":
      addCloudMasses(root, { color: isDay ? "#8894a6" : "#4a5566", opacity: isDay ? 0.9 : 0.8, wind });
      addSnow(root, calm ? 18 : 45);
      break;

    case "thunder":
      addCloudMasses(root, { color: "#434d5c", opacity: 0.9, wind });
      if (!calm) {
        addRain(root, 60);
        addLightning(root);
      }
      break;

    default:
      addClouds(root, { count: 9, opacity: 0.75, wind, color: cloudColor });
  }
}
