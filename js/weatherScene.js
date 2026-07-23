// Animated weather background scenes. buildWeatherScene(category, isDay) clears
// the background layer and populates it with particles/elements for the current
// conditions. Kept intentionally soft and low-opacity for text legibility.

const SCENE_ROOT_ID = "weather-bg";

function rand(min, max) {
  return Math.random() * (max - min) + min;
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

// Soft drifting clouds. tint/opacity/count vary the mood by scene.
function addClouds(root, { count = 5, opacity = 0.5, speed = 60 } = {}) {
  for (let i = 0; i < count; i++) {
    const w = rand(180, 340);
    root.appendChild(
      sceneEl("cloud", {
        width: `${w}px`,
        height: `${w * 0.42}px`,
        top: `${rand(2, 55)}%`,
        opacity: `${opacity * rand(0.75, 1)}`,
        animationDuration: `${speed * rand(0.7, 1.3)}s`,
        animationDelay: `${-rand(0, speed)}s`,
      })
    );
  }
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

// Ambient lightning: full-screen flashes plus a couple of CSS-animated bolts.
function addLightning(root) {
  root.appendChild(sceneEl("lightning-flash"));
  const boltSvg =
    '<svg viewBox="0 0 40 100" preserveAspectRatio="none"><polygon points="24,0 6,54 20,54 14,100 38,40 22,40 34,0"/></svg>';
  [
    { left: "22%", delay: "0s" },
    { left: "68%", delay: "4.3s" },
  ].forEach((b) => {
    const bolt = sceneEl("bolt", { left: b.left, animationDelay: b.delay });
    bolt.innerHTML = boltSvg;
    root.appendChild(bolt);
  });
}

// --- Scene composition -------------------------------------------------------

function buildWeatherScene(category, isDay) {
  const root = document.getElementById(SCENE_ROOT_ID);
  if (!root) return;
  root.innerHTML = "";
  root.dataset.scene = `${category}-${isDay ? "day" : "night"}`;

  // Reduced motion: keep only calm, static-ish ambience (sun/moon/stars, few clouds).
  const calm = prefersReducedMotion();

  switch (category) {
    case "clear":
      if (isDay) {
        addSun(root);
        if (!calm) addClouds(root, { count: 2, opacity: 0.28, speed: 90 });
      } else {
        addStars(root, calm ? 30 : 60);
        addMoon(root);
      }
      break;

    case "clouds":
      if (!isDay) addStars(root, 25);
      addClouds(root, {
        count: calm ? 4 : 7,
        opacity: isDay ? 0.55 : 0.4,
        speed: 70,
      });
      break;

    case "fog":
      addFog(root);
      addClouds(root, { count: 3, opacity: 0.3, speed: 90 });
      break;

    case "rain":
      addClouds(root, { count: 5, opacity: isDay ? 0.5 : 0.4, speed: 55 });
      if (!calm) addRain(root, 70);
      break;

    case "snow":
      addClouds(root, { count: 4, opacity: isDay ? 0.5 : 0.4, speed: 70 });
      addSnow(root, calm ? 18 : 45);
      break;

    case "thunder":
      addClouds(root, { count: 6, opacity: 0.45, speed: 50 });
      if (!calm) {
        addRain(root, 60);
        addLightning(root);
      }
      break;

    default:
      addClouds(root, { count: 5, opacity: 0.4, speed: 70 });
  }
}
