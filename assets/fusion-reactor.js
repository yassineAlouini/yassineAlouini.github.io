/* GIFs select stills for reduced motion, hidden tabs and offscreen images.
   The picture media query also respects reduced motion without JavaScript. */
(() => {
  "use strict";
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll(".reactor").forEach(figure => {
    const image = figure.querySelector("img"), source = figure.querySelector("source");
    if (!image || !source) return;
    let visible = true;
    function sync() {
      source.media = !motion.matches && visible && !document.hidden ? "all" : "not all";
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
