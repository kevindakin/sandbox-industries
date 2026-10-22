// GLOBAL VARIABLES
const durationBase = 0.8;
const durationSlow = 1.2;
const durationFast = 0.4;
const easeBase = "power4.out";

// GENERAL

let lenis = null;

function lenisScroll() {
  lenis = new Lenis({ lerp: 0.08 });
  window.lenis = lenis;

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
  });
}

function assetLoader() {
  const cache = new Map();

  const SWIPER_VERSION = "12.0.2";
  const SWIPER_JS = `https://cdn.jsdelivr.net/npm/swiper@${SWIPER_VERSION}/swiper-bundle.min.js`;

  function load(url, type) {
    if (cache.has(url)) return cache.get(url);

    const promise = new Promise((resolve, reject) => {
      let el;

      if (type === "css") {
        el = document.createElement("link");
        el.rel = "stylesheet";
        el.href = url;
      } else {
        el = document.createElement("script");
        el.async = false;
        el.src = url;
      }

      el.onload = () => resolve(url);
      el.onerror = () => {
        cache.delete(url);
        reject(new Error(`Failed to load ${url}`));
      };

      document.body.appendChild(el);
    });

    cache.set(url, promise);
    return promise;
  }

  let swiperPromise = null;

  window.loadAsset = load;

  window.loadSwiper = function () {
    if (swiperPromise) return swiperPromise;

    if (window.Swiper) {
      swiperPromise = Promise.resolve(window.Swiper);
      return swiperPromise;
    }

    swiperPromise = load(SWIPER_JS, "js").then(() => {
      if (!window.Swiper) throw new Error("Swiper loaded but global is missing");
      return window.Swiper;
    });

    return swiperPromise;
  };
}

function loader() {
  const wrap = document.querySelector('[data-load="wrap"]');
  const nav = document.querySelector('[data-load="nav"]');

  if (!wrap) {
    if (nav) gsap.set(nav, { autoAlpha: 1 });
    return;
  }

  const heading = wrap.querySelector('[data-load="heading"]');
  const headingEl = heading?.querySelector("h1, h2") || heading;
  const ups = wrap.querySelectorAll('[data-load="fade-up"]');
  const lefts = wrap.querySelectorAll('[data-load="fade-left"]');
  const fades = wrap.querySelectorAll('[data-load="fade"]');

  const tl = gsap.timeline({
    defaults: { ease: easeBase, duration: 1.4 },
  });

  if (heading) {
    if (typeof SplitText !== "undefined") {
      const split = new SplitText(headingEl, { type: "words" });
      gsap.set(heading, { autoAlpha: 1 });
      tl.fromTo(
        split.words,
        { x: "0.75em", autoAlpha: 0, filter: "blur(3px)" },
        { x: "0em", autoAlpha: 1, filter: "blur(0px)", stagger: 0.04 },
        0.3
      );
    } else {
      tl.fromTo(heading, { autoAlpha: 0, x: "2rem" }, { autoAlpha: 1, x: "0rem" }, 0.3);
    }
  }

  if (ups.length) {
    tl.fromTo(
      ups,
      { autoAlpha: 0, y: "3rem", filter: "blur(3px)" },
      { autoAlpha: 1, y: "0rem", filter: "blur(0px)", stagger: 0.1 },
      0.7
    );
  }

  if (lefts.length) {
    tl.fromTo(
      lefts,
      { autoAlpha: 0, x: "3rem", filter: "blur(3px)" },
      { autoAlpha: 1, x: "0rem", filter: "blur(0px)", stagger: 0.1 },
      0.7
    );
  }

  if (fades.length) {
    tl.fromTo(
      fades,
      { autoAlpha: 0 },
      { autoAlpha: 1, stagger: 0.1 },
      0.9
    );
  }

  if (nav) {
    tl.to(nav, { y: "0%" }, 0.5);
  }
}

function disableScroll() {
  document.body.classList.add("no-scroll");
}

function enableScroll() {
  document.body.classList.remove("no-scroll");
}

function isMenuOpen() {
  const menu = document.querySelector(".nav_wrap");
  return menu && menu.getAttribute("aria-hidden") === "false";
}

function navScroll() {
  const navComponent = document.querySelector('[data-menu="nav"]');
  if (!navComponent) return;

  const root = document.documentElement;

  // Resolve any CSS length (rem/px/etc.) to pixels via the browser.
  const resolveLength = (value) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;height:${value};`;
    document.body.appendChild(probe);
    const px = probe.getBoundingClientRect().height;
    probe.remove();
    return px;
  };

  // Nav-aware sticky bars (most pages have none).
  const stickyBars = document.querySelectorAll('[data-sticky-offset="nav"]');
  const hasBars = stickyBars.length > 0;

  const navHeight = hasBars
    ? resolveLength(
        getComputedStyle(root).getPropertyValue("--nav-height").trim()
      )
    : 0;

  root.classList.add("nav-shown");

  let navHidden = false;
  let activeTween = null;
  let barTween = null;

  ScrollTrigger.create({
    trigger: document.body,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      if (isMenuOpen()) {
        if (activeTween) activeTween.kill();
        if (barTween) barTween.kill();
        gsap.set(navComponent, { y: "0%" });
        if (hasBars) gsap.set(stickyBars, { top: navHeight });
        root.classList.add("nav-shown");
        navHidden = false;
        return;
      }

      const scrollDistance = self.scroll();
      const navRect = navComponent.getBoundingClientRect();
      const threshold = navRect.height;
      const scrollingUp = self.direction === -1;

      if (scrollDistance === 0) navComponent.classList.remove("is-scrolled");

      if (!scrollingUp && !navHidden && scrollDistance > threshold) {
        if (activeTween) activeTween.kill();
        if (barTween) barTween.kill();
        navHidden = true;
        root.classList.remove("nav-shown");

        activeTween = gsap.to(navComponent, {
          y: "-100%",
          duration: durationSlow,
          ease: easeBase,
          onComplete: () => {
            navComponent.classList.add("is-scrolled");
            activeTween = null;
          },
        });

        if (hasBars) {
          barTween = gsap.to(stickyBars, {
            top: 0,
            duration: durationSlow,
            ease: easeBase,
            onComplete: () => {
              barTween = null;
            },
          });
        }
      } else if (scrollingUp && navHidden) {
        if (activeTween) activeTween.kill();
        if (barTween) barTween.kill();
        navHidden = false;
        root.classList.add("nav-shown");

        activeTween = gsap.to(navComponent, {
          y: "0%",
          duration: durationSlow,
          ease: easeBase,
          onComplete: () => {
            activeTween = null;
          },
        });

        if (hasBars) {
          barTween = gsap.to(stickyBars, {
            top: navHeight,
            duration: durationSlow,
            ease: easeBase,
            onComplete: () => {
              barTween = null;
            },
          });
        }
      }
    },
  });
}

function navDropdown() {
  const nav = document.querySelector('[data-menu="nav"]');
  if (!nav) return;

  const items = nav.querySelectorAll('[data-dropdown="wrap"]');
  if (!items.length) return;

  const scrim = document.querySelector('[data-menu="scrim"]');
  const mm = gsap.matchMedia();

  mm.add(
    { isDesktop: "(min-width: 992px)", isMobile: "(max-width: 991px)" },
    (context) => {
      const { isDesktop } = context.conditions;

      // matchMedia reverts GSAP state on breakpoint change, but not listeners.
      const controller = new AbortController();
      const { signal } = controller;

      const CLOSE_SPEED = 2.75;
      let activeItem = null;
      const controllers = [];

      let scrollLocked = false;

      const lockScroll = () => {
        if (!isDesktop || scrollLocked) return;
        scrollLocked = true;
        disableScroll();
      };

      const unlockScroll = () => {
        if (!scrollLocked) return;
        scrollLocked = false;
        enableScroll();
      };

      // Desktop only — on mobile the scrim belongs to the menu, not the panel.
      const showScrim = () => {
        lockScroll();
        if (!scrim || !isDesktop) return;
        scrim.style.pointerEvents = "auto";
        gsap.to(scrim, { autoAlpha: 1, duration: 0.3, ease: easeBase, overwrite: "auto" });
      };

      const hideScrim = () => {
        unlockScroll();
        if (!scrim || !isDesktop) return;
        scrim.style.pointerEvents = "none";
        gsap.to(scrim, { autoAlpha: 0, duration: 0.2, ease: easeBase, overwrite: "auto" });
      };

      items.forEach((item) => {
        const link = item.querySelector('[data-dropdown="trigger"]');
        const menu = item.querySelector('[data-dropdown="menu"]');
        if (!link || !menu) return;

        const panel = item.querySelector('[data-dropdown="panel"]') || menu.parentElement;
        const arrow = link.querySelector(".nav_dropdown_arrow");
        const dropdownItems = menu.querySelectorAll('[data-dropdown="item"]');

        let timeout;
        let isOpen = false;

        // --- Trigger semantics -------------------------------------------
        // It's a div, so it needs the role, the state, and a tab stop.
        link.setAttribute("role", "button");
        link.setAttribute("tabindex", "0");
        link.setAttribute("aria-expanded", "false");
        if (!panel.id) panel.id = `dropdown-${Math.random().toString(36).slice(2, 8)}`;
        link.setAttribute("aria-controls", panel.id);

        let play, reverse;

        if (isDesktop) {
          // display is driven by the timeline, not the handlers, so a
          // reversed close can't yank the panel out mid-animation.
          const menuOpen = gsap.timeline({
            paused: true,
            defaults: { duration: 0.6, ease: easeBase },
            onStart: () => { menu.style.display = "block"; },
            onReverseComplete: () => { menu.style.display = "none"; },
          });

          menuOpen.to(menu, { autoAlpha: 1, y: "0rem" });
          menuOpen.fromTo(
            dropdownItems,
            { opacity: 0, y: "3rem" },
            { opacity: 1, y: "0rem", stagger: 0.08, ease: easeBase },
            "<0.1"
          );

          // timeScale(1) on play is required, not decorative — without it
          // the close speed sticks and the next open runs at 2.75x too.
          play = () => menuOpen.timeScale(1).play();
          reverse = () => menuOpen.timeScale(CLOSE_SPEED).reverse();
        } else {
          // Items are never animated at this breakpoint. If the page was
          // resized down from desktop, matchMedia has already reverted those
          // tweens — but clear once so a stale inline opacity can't hide them.
          gsap.set(dropdownItems, { clearProps: "opacity,transform" });

          // Height lives on the outer wrap so the panel's own padding and
          // borders aren't squashed mid-tween. Measuring at auto and tweening
          // to a px value avoids ever reversing a height:"auto" tween, which
          // has to re-derive its start from a non-numeric property.
          play = () => {
            gsap.set(panel, { height: "auto" });
            const target = panel.offsetHeight;

            gsap.fromTo(panel,
              { height: 0 },
              {
                height: target,
                duration: 0.6,
                ease: "power4.inOut",
                overwrite: "auto",
                // Back to auto once open so later reflows (font load,
                // rotate) don't get trapped at a stale pixel height.
                onComplete: () => gsap.set(panel, { height: "auto" }),
              }
            );
          };

          reverse = () => {
            gsap.to(panel, {
              height: 0,
              duration: 0.6,
              ease: "power4.inOut",
              overwrite: "auto",
              // clearProps hands control back to the stylesheet's height: 0,
              // so a killed tween can't strand an inline pixel value.
              onComplete: () => gsap.set(panel, { clearProps: "height" }),
            });
          };
        }

        const openMenu = () => {
          // Cancel the pending close before the isOpen guard, or re-entering
          // an open menu leaves the timeout alive and it shuts a beat later.
          clearTimeout(timeout);
          if (isOpen) return;

          // One panel at a time, both breakpoints.
          if (activeItem && activeItem !== item) {
            const other = controllers.find((c) => c.item === activeItem);
            if (other) other.close({ keepScrim: true });
          }

          isOpen = true;
          activeItem = item;
          link.setAttribute("aria-expanded", "true");
          item.classList.add("is-open");
          if (arrow) arrow.classList.add("is-open");
          play();
          showScrim();
        };

        const closeMenu = ({ keepScrim = false } = {}) => {
          clearTimeout(timeout);
          if (!isOpen) return;

          isOpen = false;
          if (activeItem === item) activeItem = null;
          link.setAttribute("aria-expanded", "false");
          item.classList.remove("is-open");
          if (arrow) arrow.classList.remove("is-open");
          reverse();
          if (!keepScrim) hideScrim();
        };

        controllers.push({ item, open: openMenu, close: closeMenu });

        link.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          isOpen ? closeMenu() : openMenu();
        }, { signal });

        if (isDesktop) {
          item.addEventListener("mouseenter", openMenu, { signal });
          item.addEventListener("mouseleave", () => {
            timeout = setTimeout(closeMenu, 100);
          }, { signal });
        } else {
          link.addEventListener("click", (event) => {
            event.preventDefault();
            isOpen ? closeMenu() : openMenu();
          }, { signal });
        }
      });

      const closeAll = () => {
        controllers.forEach((c) => c.close());
        hideScrim();
      };

      if (scrim && isDesktop) scrim.addEventListener("click", closeAll, { signal });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeAll();
      }, { signal });

      // Exposed so mobileMenu can collapse open panels when it closes.
      nav._closeDropdowns = closeAll;

      return () => {
        controller.abort();
        delete nav._closeDropdowns;
      };
    }
  );
}

function headingSplit() {
  const wraps = gsap.utils.toArray('[data-scroll="heading"]');
  if (!wraps.length) return;

  wraps.forEach((wrap) => {
    const heading = wrap.querySelector("h1, h2, h3") || wrap;

    // Reveal the element the CSS actually hides
    gsap.set(wrap, { autoAlpha: 1 });

    if (typeof SplitText === "undefined") return;

    const split = new SplitText(heading, { type: "words" });

    gsap.set(split.words, {
      autoAlpha: 0,
      x: "0.75em",
      filter: "blur(3px)",
    });

    gsap.timeline({
      scrollTrigger: {
        trigger: wrap,
        start: "top 85%",
        toggleActions: "play none none none",
      },
      defaults: { ease: easeBase, duration: 1.2 },
    }).to(split.words, {
      autoAlpha: 1,
      x: "0em",
      filter: "blur(0px)",
      stagger: 0.04,
    });
  });
}

function blurUp() {
  const items = gsap.utils.toArray('[data-scroll="fade-up"]');
  if (!items.length) return;

  gsap.set(items, { y: "3rem" });

  items.forEach((item) => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: item,
        start: "top 80%",
        toggleActions: "play none none none",
      },
      defaults: { ease: easeBase, duration: 1.4 },
      onComplete: () =>
        gsap.set(item, { clearProps: "filter,transform,willChange" }),
    });

    tl.to(item, { autoAlpha: 1, y: "0rem", filter: "blur(0px)" });
  });
}

function blurLeft() {
  const items = gsap.utils.toArray('[data-scroll="fade-left"]');
  if (!items.length) return;

  gsap.set(items, { x: "3rem" });

  items.forEach((item) => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: item,
        start: "top 80%",
        toggleActions: "play none none none",
      },
      defaults: { ease: easeBase, duration: 1.4 },
      onComplete: () =>
        gsap.set(item, { clearProps: "filter,transform,willChange" }),
    });

    tl.to(item, { autoAlpha: 1, x: "0rem", filter: "blur(0px)" });
  });
}

function lineDraw() {
  const items = gsap.utils.toArray('[data-scroll="line-draw"]');
  if (!items.length) return;

  gsap.set(items, { scaleX: 0 });

  items.forEach((item) => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: item,
        start: "top 80%",
        toggleActions: "play none none none",
      },
      defaults: { ease: easeBase, duration: 1.2 },
    });

    tl.to(item, { scaleX: 1 });
  });
}

function parallaxFade() {
  document.querySelectorAll('[data-parallax-fade="wrap"]').forEach((wrap) => {
    const items = wrap.querySelectorAll('[data-parallax-fade="item"]');
    if (!items.length) return;

    gsap.fromTo(
      items,
      { opacity: 0, y: "3rem" },
      {
        opacity: 1,
        y: "0rem",
        ease: "power1.out",
        stagger: { amount: 0.2, from: "start", ease: "none" },
        scrollTrigger: {
          trigger: wrap,
          start: "top 90%",
          end: "top 50%",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      }
    );
  });
}

function velocitySkew() {
  const nodes = document.querySelectorAll("[data-skew]");
  if (!nodes.length) return;

  const FRAME = 1000 / 60;
  const JUMP = 200; // px in one frame = a marquee wrap, not real motion

  const targets = [];
  let frame = null;

  const readX = (el) => {
    const match = /translate(?:3d|X)?\((-?[\d.]+)px/.exec(el.style.transform);
    if (match) return parseFloat(match[1]);
    return new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;
  };

  const render = (now) => {
    let active = false;

    for (const t of targets) {
      if (!t.visible) continue;
      active = true;

      const dt = Math.max(now - t.last, 1);
      t.last = now;

      let perFrame = 0;

      if (t.source === "scroll") {
        perFrame = lenis ? lenis.velocity : 0;
      } else {
        const pos = readX(t.el);
        const delta = pos - t.prev;
        t.prev = pos;
        // A looping marquee jumps a full set width once per cycle. Anything
        // that big in one frame is the wrap, so skip it rather than snapping.
        if (Math.abs(delta) < JUMP) perFrame = delta * (FRAME / dt);
      }

      // Deviation from resting speed, so a cruising marquee sits at zero.
      const dev = Math.max(Math.abs(perFrame) - t.baseline, 0);
      const norm = Math.min(dev / t.ref, 1);
      const goal = Math.pow(norm, t.curve) * t.max * (perFrame > 0 ? -1 : 1);

      t.skew += (goal - t.skew) * (1 - Math.pow(1 - t.ease, dt / FRAME));

      if (Math.abs(t.skew) < 0.01 && dev < 0.1) {
        // Write zero once on settling, then stop touching the DOM.
        if (!t.settled) {
          t.node.style.setProperty("--skew", "0deg");
          t.settled = true;
        }
      } else {
        t.node.style.setProperty("--skew", t.skew.toFixed(2) + "deg");
        t.settled = false;
      }
    }

    frame = active ? requestAnimationFrame(render) : null;
  };

  const start = () => {
    if (frame !== null) return;
    const now = performance.now();
    targets.forEach((t) => {
      t.last = now;
      if (t.el) t.prev = readX(t.el);
    });
    frame = requestAnimationFrame(render);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const t = targets.find((x) => x.node === entry.target);
        if (!t) return;
        t.visible = entry.isIntersecting;
        // Position moved while we weren't watching; don't read that as speed.
        if (t.visible && t.el) t.prev = readX(t.el);
      });
      if (targets.some((t) => t.visible)) start();
    },
    { threshold: 0 }
  );

  nodes.forEach((node) => {
    if (node.dataset.skewInitialized) return;
    node.dataset.skewInitialized = "true";

    const source = node.dataset.skew === "scroll" ? "scroll" : "track";
    let el = null;

    if (source === "track") {
      const selector = node.dataset.skewEl;
      el = selector
        ? node.querySelector(selector)
        : node.querySelector(".swiper-wrapper") || node.firstElementChild;
      if (!el) return;
    }

    targets.push({
      node,
      el,
      source,
      max: parseFloat(node.dataset.skewMax) || 2.5,
      ref: parseFloat(node.dataset.skewRef) || 45,
      curve: parseFloat(node.dataset.skewCurve) || 0.75,
      ease: parseFloat(node.dataset.skewEase) || 0.2,
      baseline: parseFloat(node.dataset.skewBaseline) || 0,
      skew: 0,
      prev: el ? readX(el) : 0,
      last: performance.now(),
      visible: false,
      settled: true,
    });

    observer.observe(node);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") return;
    if (targets.some((t) => t.visible)) start();
  });
}

function copyright() {
  const copyrightDate = document.querySelector(
    '[data-element="copyright-date"]'
  );

  if (copyrightDate) {
    const currentYear = new Date().getFullYear();
    copyrightDate.textContent = currentYear;
  }
}

// MOBILE MENU

function mobileMenu() {
  const nav = document.querySelector('[data-menu="nav"]');
  const menu = nav.querySelector(".nav_content");
  const button = nav.querySelector('[data-menu="hamburger"]');
  const links = menu.querySelectorAll('[data-menu="item"]');
  const scrim = nav.querySelector('[data-menu="scrim"]');

  const lineTop = button.children[0];
  const lineBottom = button.children[1];

  gsap.set(links, { y: "2rem", opacity: 0 });

  let isAnimating = false;
  let isMenuOpen = false;
  let dropdownsInitialized = false;

  let menuOpen = gsap.timeline({
    paused: true,
    defaults: { duration: 0.7, ease: easeBase },
    onStart: () => {
      isAnimating = true;
      gsap.set(menu, { display: "flex" });
      nav.classList.add("is-open");
      if (scrim) scrim.style.pointerEvents = "auto";
      disableScroll();
      if (!dropdownsInitialized) {
        navDropdown();
        dropdownsInitialized = true;
      }
    },
    onComplete: () => {
      isAnimating = false;
    },
  });

  let menuClose = gsap.timeline({
    paused: true,
    defaults: { duration: 0.7, ease: easeBase },
    onStart: () => {
      isAnimating = true;
      if (scrim) scrim.style.pointerEvents = "none";
      // Collapse any open accordion so the next open starts clean.
      if (nav._closeDropdowns) nav._closeDropdowns();
      enableScroll();
    },
    onComplete: () => {
      gsap.set(menu, { display: "none" });
      nav.classList.remove("is-open");
      isAnimating = false;
    },
  });

  menuOpen
    .to(lineTop, { y: 5.5, rotate: -45, duration: 0.4 }, 0)
    .to(lineBottom, { y: -5.5, rotate: 45, duration: 0.4 }, 0)
    .to(scrim, { autoAlpha: 1, duration: 0.4 }, 0)
    .to(menu, { opacity: 1 }, 0)
    .to(links, { y: "0rem", opacity: 1, stagger: 0.03 }, 0.04);

  menuClose
    // y back to 2rem, not 0 — otherwise links never reset and every open
    // after the first fades in without sliding.
    .to(links, { y: "2rem", opacity: 0 }, 0)
    .to(menu, { opacity: 0 }, 0)
    .to(scrim, { autoAlpha: 0, duration: 0.4 }, 0)
    .to(lineTop, { y: 0, rotate: 0, duration: 0.4 }, 0)
    .to(lineBottom, { y: 0, rotate: 0, duration: 0.4 }, 0);

  button.addEventListener("click", () => {
    if (isAnimating) return;
    if (!isMenuOpen) {
      menuOpen.restart();
      isMenuOpen = true;
    } else {
      menuClose.restart();
      isMenuOpen = false;
    }
  });

  if (scrim) {
    scrim.addEventListener("click", () => {
      if (isAnimating || !isMenuOpen) return;
      menuClose.restart();
      isMenuOpen = false;
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isMenuOpen && !isAnimating) {
      menuClose.restart();
      isMenuOpen = false;
    }
  });

  // The timelines write display and opacity inline on .nav_content, so
  // display: none survives a resize past 992px and the desktop nav vanishes.
  // clearProps removes the inline declaration entirely.
  const desktop = window.matchMedia("(min-width: 992px)");

  desktop.addEventListener("change", (event) => {
    if (!event.matches) return;   // only fires crossing mobile → desktop

    menuOpen.pause(0);
    menuClose.pause(0);

    gsap.set(menu, { clearProps: "display,opacity" });
    gsap.set(links, { clearProps: "opacity,transform" });
    gsap.set([lineTop, lineBottom], { clearProps: "transform" });

    if (scrim) {
      gsap.set(scrim, { clearProps: "opacity,visibility" });
      scrim.style.pointerEvents = "none";
    }

    nav.classList.remove("is-open");
    enableScroll();
    isMenuOpen = false;
    isAnimating = false;
  });
}

assetLoader();

document.addEventListener("DOMContentLoaded", function () {
  lenisScroll();
  loader();
  navScroll();
  navDropdown();
  headingSplit();
  blurUp();
  blurLeft();
  lineDraw();
  parallaxFade();
  copyright();

  velocitySkew();

  gsap.matchMedia().add("(max-width: 991px)", () => {
    mobileMenu();
  });
});