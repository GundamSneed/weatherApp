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

// Build a single "paper-cut" style cloud: a flat-bottomed base (stadium) with
// rounded lobes on top. Lobe count, sizes and an off-center peak are randomized
// so clouds take on a variety of shapes.
function makeCloud(w, opacity, color) {
  const H = w * 0.6;
  const cloud = sceneEl("cloud", {
    width: `${w}px`,
    height: `${H}px`,
    opacity: `${opacity}`,
  });

  // Flat-bottomed base with rounded ends.
  const barH = H * 0.5;
  cloud.appendChild(
    sceneEl("cloud-part", {
      left: `${w * 0.05}px`,
      top: `${H - barH}px`,
      width: `${w * 0.9}px`,
      height: `${barH}px`,
      borderRadius: `${barH / 2}px`,
      background: color,
    })
  );

  // Rounded lobes across the top; largest near a randomized peak.
  const n = Math.round(rand(3, 5));
  const peak = rand(0.35, 0.6);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const cx = 0.14 + t * 0.72;
    const bias = Math.max(0, 1 - Math.abs(t - peak) * 1.6);
    const dia = (0.28 + 0.24 * bias) * w * rand(0.9, 1.08);
    const bottom = H * rand(0.78, 0.86);
    cloud.appendChild(
      sceneEl("cloud-part", {
        left: `${cx * w - dia / 2}px`,
        top: `${bottom - dia}px`,
        width: `${dia}px`,
        height: `${dia}px`,
        borderRadius: "50%",
        background: color,
      })
    );
  }
  return cloud;
}

// Drifting clouds. Darker `color`, slower `speed`, and tunable spread/size let
// each scene control mood and coverage.
function addClouds(
  root,
  { count = 5, opacity = 0.7, speed = 160, color = "#7c8ba0", topRange = [0, 55], size = [160, 300] } = {}
) {
  const calm = prefersReducedMotion();
  for (let i = 0; i < count; i++) {
    const cloud = makeCloud(rand(size[0], size[1]), opacity * rand(0.85, 1), color);
    Object.assign(cloud.style, {
      top: `${rand(topRange[0], topRange[1])}%`,
      animationDuration: `${speed * rand(0.8, 1.25)}s`,
      animationDelay: `${-rand(0, speed)}s`,
    });
    // With animations disabled (reduced motion), spread clouds statically
    // instead of leaving them stacked at the drift start position.
    if (calm) cloud.style.left = `${rand(-5, 80)}%`;
    root.appendChild(cloud);
  }
}

// Build one very large cloud mass (wide bank): flat base + many rounded lobes
// spread across the width, for a bumpy cloud-bank ridge.
function makeCloudMass(w, h, color, opacity) {
  const mass = sceneEl("cloud-mass", {
    width: `${w}px`,
    height: `${h}px`,
    opacity: `${opacity}`,
  });

  const barH = h * 0.55;
  mass.appendChild(
    sceneEl("cloud-part", {
      left: `${w * 0.03}px`,
      top: `${h - barH}px`,
      width: `${w * 0.94}px`,
      height: `${barH}px`,
      borderRadius: `${barH / 2}px`,
      background: color,
    })
  );

  const n = Math.max(6, Math.round(w / (h * 0.55)));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const cx = 0.05 + t * 0.9;
    const dia = h * rand(0.5, 0.95);
    const bottom = h * rand(0.72, 0.9);
    mass.appendChild(
      sceneEl("cloud-part", {
        left: `${cx * w - dia / 2}px`,
        top: `${bottom - dia}px`,
        width: `${dia}px`,
        height: `${dia}px`,
        borderRadius: "50%",
        background: color,
      })
    );
  }
  return mass;
}

// Add 1-2 very large cloud masses covering the upper sky (used for heavy
// conditions instead of many small drifting clouds). Masses sway gently.
function addCloudMasses(root, { color, opacity = 0.9 } = {}) {
  const vw = window.innerWidth || 1200;
  const vh = window.innerHeight || 800;
  const count = Math.random() < 0.4 ? 1 : 2;
  for (let i = 0; i < count; i++) {
    const w = count === 1 ? vw * rand(1.05, 1.3) : vw * rand(0.72, 0.95);
    const h = vh * rand(0.36, 0.5);
    const mass = makeCloudMass(w, h, color, opacity * rand(0.94, 1));
    const left =
      count === 1 ? (vw - w) / 2 : i === 0 ? -w * 0.12 : vw - w * 0.88;
    Object.assign(mass.style, {
      top: `${-h * rand(0.15, 0.32)}px`,
      left: `${left}px`,
      animationDuration: `${rand(55, 85)}s`,
      animationDelay: `${-rand(0, 40)}s`,
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

function addFog(root) {
  for (let i = 0; i < 4; i++) {
    root.appendChild(
      sceneEl("fog-band", {
        top: `${rand(10, 80)}%`,
        animationDuration: `${rand(30, 55)}s`,
        animationDelay: `${-rand(0, 40)}s`,
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

function buildWeatherScene(category, isDay, code) {
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
          addClouds(root, { count: 3, opacity: 0.5, speed: 210, color: "#c3cdda", topRange: [2, 40], size: [150, 260] });
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
        addCloudMasses(root, { color: cloudColor, opacity: isDay ? 0.95 : 0.9 });
      } else {
        // Partly cloudy: a handful of discrete drifting clouds.
        if (!isDay) addStars(root, 16);
        addClouds(root, {
          count: calm ? 6 : isDay ? 12 : 10,
          opacity: isDay ? 0.92 : 0.85,
          speed: 185,
          color: cloudColor,
          topRange: [0, 52],
          size: [180, 340],
        });
      }
      break;
    }

    case "fog":
      addFog(root);
      addClouds(root, {
        count: 4,
        opacity: 0.45,
        speed: 210,
        color: isDay ? "#aab3c0" : "#565f6d",
        topRange: [0, 50],
      });
      break;

    case "rain":
      addCloudMasses(root, { color: isDay ? "#6c7a8c" : "#3c4553", opacity: isDay ? 0.92 : 0.82 });
      if (!calm) addRain(root, 70);
      break;

    case "snow":
      addCloudMasses(root, { color: isDay ? "#8894a6" : "#4a5566", opacity: isDay ? 0.9 : 0.8 });
      addSnow(root, calm ? 18 : 45);
      break;

    case "thunder":
      addCloudMasses(root, { color: "#434d5c", opacity: 0.9 });
      if (!calm) {
        addRain(root, 60);
        addLightning(root);
      }
      break;

    default:
      addClouds(root, { count: 9, opacity: 0.75, speed: 170, color: cloudColor });
  }
}
