document.addEventListener("DOMContentLoaded", () => {
  /* =======================================================
     Placeholder per-project data
     Swap these values in for real content later.
     ======================================================= */
  const projectData = {
    "project-1": {
      title: "[Project One Title]",
      imageClass: "placeholder-media--a",
      github: "#",
      body: "<p>[Project description goes here.]</p>",
    },
    "project-2": {
      title: "[Project Two Title]",
      imageClass: "placeholder-media--b",
      github: "#",
      body: "<p>[Project description goes here.]</p>",
    },
    "project-3": {
      title: "[Project Three Title]",
      imageClass: "placeholder-media--c",
      github: "#",
      body: "<p>[Project description goes here.]</p>",
    },
  };

  /* =======================================================
     Carousel
     ======================================================= */
  const track = document.getElementById("carouselTrack");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const dotsWrap = document.getElementById("carouselDots");
  const captionText = document.getElementById("captionText");

  const originals = Array.from(track.querySelectorAll(".carousel-slide"));
  const N = originals.length;
  const LOOPED = N > 1;

  /* ---------------------------------------------------------
     Infinite loop strategy
     ---------------------------------------------------------
     We render three consecutive copies of the slide set:

         [ clones ][ ORIGINALS ][ clones ]
           0..N-1     N..2N-1     2N..3N-1

     The user always *appears* to sit in the middle copy. After each
     scroll settles we silently teleport back to the equivalent slide
     in the middle copy. Because copy k and copy k+1 are pixel-identical
     and sit at the same offset within the viewport, the jump is
     invisible — but it means you can scroll past either end forever.
     --------------------------------------------------------- */
  if (LOOPED) {
    const makeClones = () =>
      originals.map((s) => {
        const c = s.cloneNode(true);
        c.dataset.clone = "1";
        c.setAttribute("aria-hidden", "true");
        return c;
      });

    const before = makeClones();
    const after = makeClones();
    before.forEach((c) => track.insertBefore(c, originals[0]));
    after.forEach((c) => track.appendChild(c));
  }

  const slides = Array.from(track.querySelectorAll(".carousel-slide"));
  const realIndexOf = (i) => ((i % N) + N) % N;

  // Scroll offset that puts a given slide dead-center in the viewport.
  function centerOffset(slide) {
    return slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;
  }

  function goTo(index, behavior) {
    const slide = slides[index];
    if (!slide) return;
    track.scrollTo({ left: centerOffset(slide), behavior: behavior || "auto" });
  }

  // Which slide is nearest the horizontal center right now.
  function centerIndex() {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    slides.forEach((slide, i) => {
      const dist = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }

  // Build dots — one per *real* slide, not per clone.
  const dots = originals.map((_, i) => {
    const dot = document.createElement("button");
    dot.className = "carousel-dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
    dot.addEventListener("click", () => {
      // Jump to whichever copy of that slide is closest, so the
      // carousel never scrolls the long way around.
      const from = centerIndex();
      let target = from;
      let bestDist = Infinity;
      slides.forEach((_s, k) => {
        if (realIndexOf(k) !== i) return;
        const dist = Math.abs(k - from);
        if (dist < bestDist) {
          bestDist = dist;
          target = k;
        }
      });
      goTo(target, "smooth");
    });
    dotsWrap.appendChild(dot);
    return dot;
  });

  function setActive(index) {
    const real = realIndexOf(index);
    slides.forEach((slide, i) => slide.classList.toggle("is-active", i === index));
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === real));
    captionText.textContent = slides[index].dataset.caption || "";
  }

  /* After a scroll settles, re-seat the view in the middle copy.

     The slide we teleport TO is a different DOM element than the one we
     teleport FROM, so it has to receive .is-active. Left alone it would
     animate up from the inactive state (opacity .55 / scale .92) over 400ms
     — a visible "pop" on every wrap. So we disable slide transitions for
     the single frame in which the swap happens, forcing the new slide to
     adopt the active state instantly. Visually identical, no animation. */
  function normalize() {
    if (!LOOPED) return;
    const i = centerIndex();
    const target = N + realIndexOf(i);

    if (target === i) {
      setActive(target);
      return; // already seated — don't touch anything
    }

    track.classList.add("is-teleporting");
    goTo(target, "auto");
    setActive(target);
    void track.offsetWidth; // force style flush while transitions are off
    track.classList.remove("is-teleporting");
  }

  let rafId = null;
  let settleTimer = null;

  // `scrollend` fires only once momentum has fully stopped, which is exactly
  // when it's safe to teleport. Where it isn't supported we debounce the
  // scroll event instead, which can occasionally fire mid-momentum.
  const supportsScrollEnd = "onscrollend" in window;

  track.addEventListener(
    "scroll",
    () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setActive(centerIndex()));

      if (!supportsScrollEnd) {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(normalize, 140);
      }
    },
    { passive: true }
  );

  if (supportsScrollEnd) track.addEventListener("scrollend", normalize);

  /* Step one slide in either direction.
     Rapid clicking can outrun the 140ms settle timer and walk off the end of
     the cloned strip, so if the next step would land out of range we re-seat
     into the middle copy first (instantly, invisibly) and step from there.
     That keeps the arrows working forever in both directions. */
  function step(delta) {
    const i = centerIndex();
    let target = i + delta;
    if (LOOPED && (target < 0 || target >= slides.length)) {
      const seated = N + realIndexOf(i);
      goTo(seated, "auto");
      target = seated + delta;
    }
    goTo(target, "smooth");
  }

  prevBtn.addEventListener("click", () => step(-1));
  nextBtn.addEventListener("click", () => step(1));

  // Clicking a slide (or its play button) opens that project's panel.
  // Bound to clones too, so they behave identically.
  slides.forEach((slide) => {
    slide.addEventListener("click", () => {
      openProjectPanel(slide.dataset.project);
    });
  });

  // Start centered on the first real slide, without animating there.
  function initCarousel() {
    goTo(LOOPED ? N : 0, "auto");
    setActive(LOOPED ? N : 0);
  }
  initCarousel();

  // Slide widths are percentage-based, so recenter after a resize.
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => goTo(centerIndex(), "auto"), 120);
  });

  /* =======================================================
     Side panels (project + about)
     ======================================================= */
  const overlay = document.getElementById("overlay");
  const projectPanel = document.getElementById("projectPanel");
  const projectPanelClose = document.getElementById("projectPanelClose");
  const projectImage = document.getElementById("projectImage");
  const projectTitle = document.getElementById("projectTitle");
  const projectGithub = document.getElementById("projectGithub");
  const projectBody = document.getElementById("projectBody");

  const aboutPanel = document.getElementById("aboutPanel");
  const aboutPanelClose = document.getElementById("aboutPanelClose");
  const aboutBtn = document.getElementById("aboutBtn");

  let openPanelEl = null;

  function openProjectPanel(projectId) {
    const data = projectData[projectId];
    if (!data) return;

    projectImage.className = "side-panel__image placeholder-media " + data.imageClass;
    projectTitle.textContent = data.title;
    projectGithub.href = data.github;
    projectBody.innerHTML = data.body;

    openPanel(projectPanel);
  }

  function openPanel(panel) {
    if (openPanelEl && openPanelEl !== panel) {
      closePanel(openPanelEl);
    }
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    overlay.classList.add("is-visible");
    document.body.style.overflow = "hidden";
    openPanelEl = panel;
  }

  function closePanel(panel) {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    overlay.classList.remove("is-visible");
    document.body.style.overflow = "";
    if (openPanelEl === panel) openPanelEl = null;
  }

  function closeAllPanels() {
    [projectPanel, aboutPanel].forEach((panel) => {
      if (panel.classList.contains("is-open")) closePanel(panel);
    });
  }

  projectPanelClose.addEventListener("click", () => closePanel(projectPanel));
  aboutPanelClose.addEventListener("click", () => closePanel(aboutPanel));
  overlay.addEventListener("click", closeAllPanels);

  aboutBtn.addEventListener("click", () => openPanel(aboutPanel));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllPanels();
  });

  // Resume "Projects" links open the matching project panel
  document.querySelectorAll(".project-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      openProjectPanel(link.dataset.project);
    });
  });

  /* =======================================================
     Keep the WebGL shader backdrop correctly sized.
     shader-header.js measures canvas.clientWidth/Height and only
     re-measures on window "resize". The carousel section's height can
     change after webfonts load or when the layout reflows, so we nudge
     it to re-measure in those cases too.
     ======================================================= */
  const shaderCanvas = document.getElementById("shader-header");
  if (shaderCanvas) {
    const nudgeShaderResize = () => window.dispatchEvent(new Event("resize"));

    window.addEventListener("load", nudgeShaderResize);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(nudgeShaderResize);
    }

    if ("ResizeObserver" in window) {
      let frame = null;
      const ro = new ResizeObserver(() => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(nudgeShaderResize);
      });
      ro.observe(document.querySelector(".carousel-section"));
    }
  }
});
