/* GIF playback controls. The picture element also respects reduced motion
   without JavaScript; pausing selects the matching static PNG. */
(() => {
  "use strict";
  const image = document.querySelector("#fusion-reactor");
  const source = document.querySelector(".reactor source");
  const toggle = document.querySelector(".reactor-toggle");
  if (!image || !source || !toggle) return;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = motion.matches;
  let visible = true;

  function sync() {
    const playing = !paused && visible && !document.hidden;
    source.media = playing ? "all" : "not all";
    toggle.textContent = paused ? "Play animation" : "Pause animation";
  }
  toggle.hidden = false;
  toggle.addEventListener("click", () => { paused = !paused; sync(); });
  motion.addEventListener("change", () => { paused = motion.matches; sync(); });
  document.addEventListener("visibilitychange", sync);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }).observe(image);
  }
  sync();
})();
