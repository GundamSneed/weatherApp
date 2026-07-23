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

// Build a single defined cloud from overlapping circular "puffs".
// Puffs are large and heavily overlapping so the cloud reads as one dense mass.
function makeCloud(w, opacity, color) {
  const h = w * 0.6;
  const cloud = sceneEl("cloud", {
    width: `${w}px`,
    height: `${h}px`,
    opacity: `${opacity}`,
  });
  // [centerX, centerY, radius] as fractions of the cloud box.
  const puffs = [
    [0.16, 0.64, 0.46],
    [0.36, 0.42, 0.58],
    [0.56, 0.46, 0.56],
    [0.78, 0.62, 0.48],
    [0.50, 0.72, 0.64],
  ];
  puffs.forEach(([cx, cy, r]) => {
    const d = r * w;
    cloud.appendChild(
      sceneEl("puff", {
        width: `${d}px`,
        height: `${d}px`,
        left: `${cx * w - d / 2}px`,
        top: `${cy * h - d / 2}px`,
        background: color,
      })
    );
  });
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
      if (!isDay && !overcast) addStars(root, 16);
      if (overcast) addOvercast(root, cloudColor, isDay ? 0.5 : 0.62);
      addClouds(root, {
        count: calm ? 6 : overcast ? (isDay ? 14 : 12) : isDay ? 8 : 7,
        opacity: isDay ? 0.9 : 0.82,
        speed: 180,
        color: cloudColor,
        topRange: overcast ? [0, 30] : [0, 48],
        size: overcast ? [230, 450] : [170, 320],
      });
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
      addClouds(root, {
        count: 9,
        opacity: isDay ? 0.85 : 0.75,
        speed: 150,
        color: isDay ? "#6c7a8c" : "#3c4553",
        topRange: [0, 34],
        size: [220, 430],
      });
      if (!calm) addRain(root, 70);
      break;

    case "snow":
      addClouds(root, {
        count: 7,
        opacity: isDay ? 0.82 : 0.72,
        speed: 170,
        color: isDay ? "#8894a6" : "#4a5566",
        topRange: [0, 34],
        size: [200, 380],
      });
      addSnow(root, calm ? 18 : 45);
      break;

    case "thunder":
      addClouds(root, {
        count: 10,
        opacity: 0.85,
        speed: 140,
        color: "#434d5c",
        topRange: [0, 34],
        size: [230, 450],
      });
      if (!calm) {
        addRain(root, 60);
        addLightning(root);
      }
      break;

    default:
      addClouds(root, { count: 6, opacity: 0.7, speed: 170, color: cloudColor });
  }
}
