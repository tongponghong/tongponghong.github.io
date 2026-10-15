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

  /* ---------------- Justified layout ----------------
     The CSS-only rows give every image the same height and then stretch
     the row to fill, which crops whichever images got stretched most.
     Here each row instead gets its OWN height, chosen so the images'
     true aspect ratios sum exactly to the album width - so nothing is
     cropped or distorted. CSS stays as the no-JS fallback.

     Ratios come from naturalWidth/Height, which aren't known until an
     image loads (and images are lazy), so unloaded ones assume 3:2 and
     the album re-lays itself out as each one arrives. */
  const DEFAULT_RATIO = 1.5;

  function targetHeight(album) {
    const raw = parseFloat(getComputedStyle(album).getPropertyValue("--album-row-h")) || 260;
    // Mirrors the CSS min(row-h, 45vw) so phones get smaller rows
    return Math.min(raw, window.innerWidth * 0.45);
  }

  function ratioOf(img) {
    return img.naturalWidth && img.naturalHeight
      ? img.naturalWidth / img.naturalHeight
      : DEFAULT_RATIO;
  }

  function layoutAlbum(album) {
    // A hidden tab has no width; the ResizeObserver re-runs this when shown
    const width = album.clientWidth - 1; // 1px slack absorbs sub-pixel rounding
    if (width <= 0) return;
    const imgs = Array.from(album.querySelectorAll(".album-img"));
    if (!imgs.length) return;

    const gap = parseFloat(getComputedStyle(album).columnGap) || 10;
    const target = targetHeight(album);
    const size = (img, h) => {
      img.style.height = h + "px";
      img.style.width = ratioOf(img) * h + "px";
    };
    // Height at which `row` exactly fills the width
    const fitHeight = (row) =>
      (width - gap * (row.length - 1)) / row.reduce((s, img) => s + ratioOf(img), 0);

    let row = [];
    for (const img of imgs) {
      row.push(img);
      const h = fitHeight(row);
      if (h > target) continue; // row still too short - keep adding

      // Row is now full. Keep the last image only if that lands closer
      // to the target height than ending the row without it.
      if (row.length > 1) {
        const without = row.slice(0, -1);
        const hWithout = fitHeight(without);
        if (Math.abs(hWithout - target) < Math.abs(h - target)) {
          without.forEach((i) => size(i, hWithout));
          row = [img];
          continue;
        }
      }
      row.forEach((i) => size(i, h));
      row = [];
    }
    // Last, unfilled row: natural target height, left-aligned, no stretch
    row.forEach((i) => size(i, target));

    album.classList.add("is-justified");
  }

  document.querySelectorAll(".album").forEach((album) => {
    let queued = false;
    const relayout = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        layoutAlbum(album);
      });
    };
    album.querySelectorAll(".album-img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", relayout);
    });
    // Covers window resizes AND a tab going from hidden to shown
    new ResizeObserver(relayout).observe(album);
    relayout();
  });

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
