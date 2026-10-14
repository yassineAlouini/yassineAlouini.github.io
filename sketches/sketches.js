/* Sketches committed with the site. No server or third-party requests. */
(() => {
  const $ = (id) => document.getElementById(id);
  const sketches = [
    { title: 'A quiet coastline', src: 'examples/coast.svg', alt: 'An illustrative ink and color sketch of ochre houses above a blue coastline.' },
    { title: 'Olive branches', src: 'examples/olive.svg', alt: 'An illustrative botanical sketch of green olive branches with ochre and violet details.' },
    { title: 'Late afternoon', src: 'examples/hills.svg', alt: 'An illustrative landscape sketch of terracotta hills, ochre fields and a small blue mountain.' },
  ];
  let active = 0, revision = 0;
  const status = (message) => { $('status').textContent = message; };
  const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

  // Rank populated histogram bins, preserving their most frequent actual pixel.
  // Do not invent RGB averages or force minor accents to occupy equal bar widths.
  function extractColors(img) {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const bins = new Map();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const rgb = [data[i], data[i + 1], data[i + 2]];
      const key = rgb.map((v) => v >> 4).join(',');
      const bin = bins.get(key) || { count: 0, pixels: new Map(), peak: 0, rgb };
      const pixel = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
      const count = (bin.pixels.get(pixel) || 0) + 1;
      bin.pixels.set(pixel, count); bin.count++;
      if (count > bin.peak) { bin.peak = count; bin.rgb = rgb; }
      bins.set(key, bin);
    }
    let points = [...bins.values()];
    if (!points.length) return [];
    const pigments = points.filter((p) => Math.min(...p.rgb) < 205);
    if (pigments.reduce((sum, p) => sum + p.count, 0) > canvas.width * canvas.height * .015) points = pigments;
    points.sort((a, b) => b.count - a.count);
    const distance = (a, b) => a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0);
    const dominant = [];
    for (const p of points) {
      if (p.count < points[0].count * .04) break;
      if (dominant.every((d) => distance(p.rgb, d.rgb) >= 24 ** 2)) {
        dominant.push({ rgb: p.rgb, color: hex(p.rgb), count: 0 });
        if (dominant.length === 5) break;
      }
    }
    for (const p of points) {
      const nearest = dominant.reduce((best, d) => distance(p.rgb, d.rgb) < distance(p.rgb, best.rgb) ? d : best);
      nearest.count += p.count;
    }
    const total = dominant.reduce((sum, d) => sum + d.count, 0);
    return dominant.sort((a, b) => b.count - a.count).map((d) => ({ color: d.color, share: d.count / total }));
  }
  function palette(colors) {
    const bar = document.createElement('div'); bar.className = 'palette-bar';
    for (const { color, share } of colors) {
      const chip = document.createElement('span'); chip.className = 'swatch-color';
      chip.style.backgroundColor = color; chip.style.flexGrow = share;
      chip.setAttribute('role', 'img');
      chip.setAttribute('aria-label', `${color}: ${Math.round(share * 100)}% of drawing colors`);
      bar.append(chip);
    }
    $('palette').replaceChildren(bar);
  }
  async function render() {
    const token = ++revision, sketch = sketches[active], index = active;
    // Use a new image for every load. Firefox can draw the previous SVG into
    // canvas when a reused <img> changes src and decode() resolves too early.
    const img = new Image(1000, 620);
    img.id = 'sketch-image'; img.alt = sketch.alt;
    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve; img.onerror = reject;
        img.src = sketch.src;
      });
      if (revision !== token) return;
      const colors = sketch.colors || extractColors(img);
      if (revision !== token) return;
      sketch.colors = colors;
      // Commit the image, title and its palette together.
      $('sketch-image').replaceWith(img);
      $('sketch-title').textContent = sketch.title;
      palette(colors);
      status(`${sketch.title}. Sketch ${index + 1} of ${sketches.length}.${colors.length < 5 ? ` ${colors.length} distinct colors found.` : ''}`);
    } catch { if (revision === token) status('This image could not be loaded. Try another sketch.'); }
  }
  function move(step) { active = (active + step + sketches.length) % sketches.length; render(); }
  $('previous').addEventListener('click', () => move(-1)); $('next').addEventListener('click', () => move(1));
  document.querySelector('.gallery').addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  let startX;
  const stage = document.querySelector('.sketch-stage');
  stage.addEventListener('touchstart', (event) => { startX = event.changedTouches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (event) => {
    const delta = event.changedTouches[0].clientX - startX;
    if (Math.abs(delta) > 60) move(delta < 0 ? 1 : -1);
  }, { passive: true });

  render();
})();
