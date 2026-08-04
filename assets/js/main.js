document.addEventListener("DOMContentLoaded", () => {
  /* =======================================================
     Project data — sourced from _projects/*.md

     Jekyll renders one <template class="project-data"> per markdown file,
     carrying the front matter on data-* attributes and the rendered
     markdown body as its content. Adding a project is therefore just
     adding a file to _projects/ — nothing here needs to change.
     ======================================================= */
  const projectData = {};
  document.querySelectorAll("template.project-data").forEach((tpl) => {
    projectData[tpl.dataset.project] = {
      title: tpl.dataset.title || "",
      github: tpl.dataset.github || "",
      image: tpl.dataset.image || "",
      accent: tpl.dataset.accent || "a",
      body: tpl.innerHTML,
    };
  });

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

  /* ---------------------------------------------------------
     Whole-period shifting
     ---------------------------------------------------------
     The rendered strip repeats with a period of exactly one copy.
     So adding or subtracting that width from scrollLeft is ALWAYS
     visually identical, at any scroll offset — including halfway
     between two slides, or mid-animation. That makes it safe to
     re-seat at any moment, not just once scrolling has stopped,
     which is what stops fast input from reaching the strip's end.
     --------------------------------------------------------- */
  function periodWidth() {
    return slides[N].offsetLeft - slides[0].offsetLeft;
  }

  // Run a mutation with transitions + scroll-snap suspended.
  function withoutTransitions(fn) {
    track.classList.add("is-teleporting");
    void track.offsetWidth;
    fn();
    void track.offsetWidth;
    track.classList.remove("is-teleporting");
  }

/* Re-seat index `i` into the middle copy, shifting scrollLeft by whole
     periods so nothing moves on screen. Returns the equivalent index. */
  function seat(i) {
    if (!LOOPED) return i;
    const seated = N + realIndexOf(i);
    if (seated === i) return seated;

    // (i - seated) is always an exact multiple of N, since both share a
    // real index — so this is a whole number of periods.
    const periods = (i - seated) / N;
    withoutTransitions(() => {
      track.scrollLeft -= periods * periodWidth();
      
      // FIX: Instantly apply the active state to the destination slide
      // while transitions are suspended to prevent the stutter/crossfade bugs.
      setActive(seated);
    });
    return seated;
  }

  /* Fast swipes never go through step(), so they need their own guard.
     Called every scroll frame: the instant the centred slide leaves the
     middle copy we shift back by a whole period. Because that shift is
     invisible, it's safe to do mid-momentum — the fling simply continues
     from the equivalent position. This is what makes it impossible to
     reach the end of the strip no matter how hard you flick.

     Skipped while `commanded` is set, i.e. during a smooth scroll we
     started ourselves, since moving the ground under an in-flight
     animation would fight its fixed target. */
  function keepInBand() {
    if (!LOOPED || commanded !== null) return;
    const i = centerIndex();
    if (i < N || i >= 2 * N) seat(i);
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
    commanded = null; // scrolling has stopped; re-derive from actual position
    const seated = seat(centerIndex());
    setActive(seated);
  }

  let rafId = null;
  let settleTimer = null;
  // Index we last commanded a scroll to, or null when scrolling has settled.
  let commanded = null;

  // `scrollend` fires only once momentum has fully stopped, which is exactly
  // when it's safe to teleport. Where it isn't supported we debounce the
  // scroll event instead, which can occasionally fire mid-momentum.
  const supportsScrollEnd = "onscrollend" in window;

  track.addEventListener(
    "scroll",
    () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        
        // FIX: Removed keepInBand() so we don't yank scrollLeft
        // mid-swipe, preventing the laggy duplicated overlay.
        setActive(centerIndex());
        
      });

      if (!supportsScrollEnd) {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(normalize, 140);
      }
    },
    { passive: true }
  );

  if (supportsScrollEnd) {
    track.addEventListener("scrollend", () => {
      track.classList.remove("is-scrolling");
      normalize();
    });
  }

  /* Step one slide in either direction.

     `commanded` remembers the index we last told the browser to scroll to.
     Without it, a second click arriving mid-animation would read
     centerIndex() — still showing the slide we're scrolling AWAY from — and
     re-issue the same target, so the click would be silently swallowed.

     We re-seat into the middle copy on EVERY step, before moving. Since
     seated is always in [N, 2N-1], the target is always in [N-1, 2N] — a
     slide that is guaranteed to exist AND to have neighbours on both sides.
     So no amount of fast clicking can reach the end of the strip. */
  function step(delta) {
    const base = seat(commanded !== null ? commanded : centerIndex());
    const target = base + delta;
    commanded = target;
    goTo(target, "smooth");
    /* Deliberately NOT setActive(target) here. Marking the destination
       active while the scroll is still in transit strips .is-active from
       the slide you're currently looking at, dimming it to opacity .55 /
       scale .92 mid-click — which reads as a stutter. The scroll handler
       below drives .is-active from the actual centred slide instead, so
       whatever is under your eyes is always the highlighted one. */
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

    // Real image if the markdown supplied one, otherwise the gradient.
    if (data.image) {
      projectImage.className = "side-panel__image";
      projectImage.style.backgroundImage = `url('${data.image}')`;
      projectImage.style.backgroundSize = "cover";
      projectImage.style.backgroundPosition = "center";
    } else {
      projectImage.className =
        "side-panel__image placeholder-media placeholder-media--" + data.accent;
      projectImage.style.backgroundImage = "";
    }

    projectTitle.textContent = data.title;

    // Hide the GitHub icon entirely when the project has no repo.
    if (data.github) {
      projectGithub.href = data.github;
      projectGithub.hidden = false;
    } else {
      projectGithub.hidden = true;
    }

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
