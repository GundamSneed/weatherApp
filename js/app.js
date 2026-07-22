// App entry point: init, geolocation, event wiring, state. Filled out in step 3+.

// Sidebar toggle (mobile) — wired now so the scaffold is interactive.
document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menu-btn");
  const sidebar = document.getElementById("sidebar");
  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", () => sidebar.classList.toggle("is-open"));
  }

  // Unit toggle visual state (data wiring comes in step 7).
  const unitToggle = document.getElementById("unit-toggle");
  if (unitToggle) {
    unitToggle.addEventListener("click", (e) => {
      const btn = e.target.closest(".unit-btn");
      if (!btn) return;
      unitToggle.querySelectorAll(".unit-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
    });
  }

  console.log("weatherApp scaffold loaded.");
});
