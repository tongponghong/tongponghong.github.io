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
  const slides = Array.from(track.querySelectorAll(".carousel-slide"));
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const dotsWrap = document.getElementById("carouselDots");
  const captionText = document.getElementById("captionText");

  let activeIndex = 0;

  // Build dots
  const dots = slides.map((slide, i) => {
    const dot = document.createElement("button");
    dot.className = "carousel-dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
    dot.addEventListener("click", () => scrollToSlide(i));
    dotsWrap.appendChild(dot);
    return dot;
  });

  function setActive(index) {
    activeIndex = index;
    slides.forEach((slide, i) => slide.classList.toggle("is-active", i === index));
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
    const caption = slides[index].dataset.caption || "";
    captionText.textContent = caption;
  }

  function scrollToSlide(index) {
    const clamped = Math.max(0, Math.min(slides.length - 1, index));
    slides[clamped].scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }

  prevBtn.addEventListener("click", () => scrollToSlide((activeIndex - 1) % 3));
  nextBtn.addEventListener("click", () => scrollToSlide((activeIndex + 1) % 3));

  // Track which slide is centered/active as the user scrolls or swipes
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          const index = slides.indexOf(entry.target);
          if (index !== -1) setActive(index);
        }
      });
    },
    { root: track, threshold: [0.6] }
  );
  slides.forEach((slide) => observer.observe(slide));

  // Clicking a slide (or its play button) opens that project's panel
  slides.forEach((slide) => {
    slide.addEventListener("click", () => {
      openProjectPanel(slide.dataset.project);
    });
  });

  setActive(0);

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
