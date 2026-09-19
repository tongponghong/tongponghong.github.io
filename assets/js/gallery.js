/* =========================================================
   Gallery page: tab switching + lightbox
   Loaded only on /gallery/ via the page's `extra_js` front matter.
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const tabs = Array.from(document.querySelectorAll(".gallery-tab"));
  const panels = Array.from(document.querySelectorAll(".gallery-panel"));

  /* ---------------- Tabs ---------------- */
  function showTab(id) {
    tabs.forEach((t) => {
      const on = t.dataset.tab === id;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    panels.forEach((p) => {
      const on = p.id === "panel-" + id;
      p.classList.toggle("is-active", on);
      p.hidden = !on;
    });
    // Reflect the tab in the URL so a specific tab can be linked or
    // survive a refresh, without adding a history entry per click.
    history.replaceState(null, "", "#" + id);
  }

  tabs.forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));

  // Left/right arrows move between tabs, which is what screen-reader and
  // keyboard users expect from a tablist.
  tabs.forEach((t, i) => {
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const next = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      showTab(tabs[next].dataset.tab);
    });
  });

  // Honour #paintings / #photos on load
  const fromHash = location.hash.replace("#", "");
  if (fromHash && tabs.some((t) => t.dataset.tab === fromHash)) showTab(fromHash);

  /* ---------------- Lightbox ---------------- */
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxClose = document.getElementById("lightboxClose");
  if (!lightbox) return;

  let lastFocused = null;

  function openLightbox(src, alt) {
    lastFocused = document.activeElement;
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    // Drop the src so a huge image isn't held in memory while hidden
    setTimeout(() => {
      if (!lightbox.classList.contains("is-open")) lightboxImg.src = "";
    }, 300);
    if (lastFocused) lastFocused.focus();
  }

  // Delegated, so it covers every tab without rebinding on switch
  document.addEventListener("click", (e) => {
    const img = e.target.closest(".album-img");
    if (img) openLightbox(img.dataset.full || img.src, img.alt);
  });

  // The images are role="button" + tabindex, so honour Enter/Space
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const img = document.activeElement;
    if (img && img.classList && img.classList.contains("album-img")) {
      e.preventDefault();
      openLightbox(img.dataset.full || img.src, img.alt);
    }
  });

  lightboxClose.addEventListener("click", closeLightbox);
  // Clicking the backdrop closes; clicking the image itself does not
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("is-open")) closeLightbox();
  });
});
