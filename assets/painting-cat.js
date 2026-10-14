/* Respect reduced motion and pause this small decorative GIF when not visible. */
(() => {
  const image = document.querySelector('#painting-cat');
  const source = document.querySelector('.painting-cat source');
  if (!image || !source) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  function sync() {
    source.media = !motion.matches && visible && !document.hidden ? 'all' : 'not all';
  }
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(image);
  }
  sync();
})();
