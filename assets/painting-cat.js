/* Respect reduced motion and pause this small decorative GIF when not visible. */
(() => {
  const image = document.querySelector('#painting-cat');
  const source = document.querySelector('.painting-cat source');
  const toggle = document.querySelector('.cat-toggle');
  if (!image || !source || !toggle) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches, visible = true;
  function sync() {
    source.media = !paused && visible && !document.hidden ? 'all' : 'not all';
    toggle.setAttribute('aria-label', paused ? 'Play cat animation' : 'Pause cat animation');
    toggle.firstElementChild.textContent = paused ? '▶' : 'Ⅱ';
  }
  toggle.hidden = false;
  toggle.addEventListener('click', () => { paused = !paused; sync(); });
  motion.addEventListener('change', () => { paused = motion.matches; sync(); });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(image);
  }
  sync();
})();
