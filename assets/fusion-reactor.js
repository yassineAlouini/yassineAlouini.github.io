/* GIFs select stills for reduced motion, hidden tabs and offscreen images.
   The picture media query also respects reduced motion without JavaScript. */
(() => {
  "use strict";
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll(".reactor").forEach(figure => {
    const image = figure.querySelector("img"), sources = [...figure.querySelectorAll("source")];
    if (!image || !sources.length) return;
    let visible = true;
    function sync() {
      const media = !motion.matches && visible && !document.hidden
        ? "(prefers-reduced-motion: no-preference)" : "not all";
      // Keep every animated format in sync. Avoid re-selecting an already
      // selected image at startup, which can issue a duplicate request.
      for (const source of sources) if (source.media !== media) source.media = media;
    }
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        sync();
      }).observe(image);
    }
    sync();
  });
})();
