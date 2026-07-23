// Ambient particle background — a mouse-reactive dust field drawn on
// #bg-particles, styled after a Spline "Particles" community scene (white
// dots + wispy drift on a near-black field). Purely decorative: no coupling
// to weather state, no dependency on any other script. Pauses entirely when
// the tab is hidden or prefers-reduced-motion is set, to keep this a
// near-zero-cost visual layer over the rest of the app.

(function () {
  const canvas = document.getElementById("bg-particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
  }

  const bgVar = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  const [bgR, bgG, bgB] = hexToRgb(bgVar) || [30, 32, 35];

  const MAX_PARTICLES = 260;
  const DENSITY = 1 / 9000; // particles per CSS px^2 of viewport
  const MOUSE_RADIUS = 130;
  const MOUSE_FORCE = 0.9;
  const DAMPING = 0.94;
  const RETURN_FORCE = 0.0006;
  const TRAIL_ALPHA = 0.18; // lower = longer wispy trails, higher = crisper dots

  let width = 0;
  let height = 0;
  let particles = [];
  let mouseX = -9999;
  let mouseY = -9999;
  let rafId = null;
  let lastTime = 0;

  function makeParticle() {
    const x = Math.random() * width;
    const y = Math.random() * height;
    return {
      x,
      y,
      baseX: x,
      baseY: y,
      vx: 0,
      vy: 0,
      r: Math.random() * 1.3 + 0.4,
      alpha: Math.random() * 0.5 + 0.25,
      seed: Math.random() * 1000,
    };
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(MAX_PARTICLES, Math.max(60, Math.round(width * height * DENSITY)));
    particles = Array.from({ length: count }, makeParticle);
  }

  function drawParticle(p, x, y) {
    ctx.beginPath();
    ctx.arc(x, y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
    ctx.fill();
  }

  function drawStaticFrame() {
    ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
    ctx.fillRect(0, 0, width, height);
    for (const p of particles) drawParticle(p, p.baseX, p.baseY);
  }

  function step(time) {
    const t = time * 0.00015;

    // Fade the previous frame instead of clearing, so motion leaves soft trails.
    ctx.fillStyle = `rgba(${bgR}, ${bgG}, ${bgB}, ${TRAIL_ALPHA})`;
    ctx.fillRect(0, 0, width, height);

    for (const p of particles) {
      // Gentle ambient flow field (layered sine drift reads like curl noise
      // at this scale without needing a noise library).
      p.vx += Math.sin(p.baseY * 0.006 + t + p.seed) * 0.06;
      p.vy += Math.cos(p.baseX * 0.006 + t + p.seed) * 0.06;

      // Mouse repulsion.
      const dx = p.x - mouseX;
      const dy = p.y - mouseY;
      const dist = Math.hypot(dx, dy);
      if (dist < MOUSE_RADIUS && dist > 0.01) {
        const force = ((MOUSE_RADIUS - dist) / MOUSE_RADIUS) * MOUSE_FORCE;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      // Soft pull back toward its seeded home position, so drift stays bounded.
      p.vx += (p.baseX - p.x) * RETURN_FORCE;
      p.vy += (p.baseY - p.y) * RETURN_FORCE;

      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x += p.vx;
      p.y += p.vy;

      drawParticle(p, p.x, p.y);
    }

    rafId = requestAnimationFrame(step);
  }

  function start() {
    if (rafId) return;
    lastTime = performance.now();
    rafId = requestAnimationFrame(step);
  }

  function stop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function applyMotionPreference() {
    stop();
    resize();
    if (reduceMotionQuery.matches) {
      drawStaticFrame();
    } else {
      start();
    }
  }

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyMotionPreference, 150);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else if (!reduceMotionQuery.matches) {
      start();
    }
  });

  reduceMotionQuery.addEventListener("change", applyMotionPreference);

  applyMotionPreference();
})();
