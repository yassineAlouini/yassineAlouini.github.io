# yassineAlouini.github.io

Personal landing page — a static `index.html` and `style.css` served at
<https://yassinealouini.github.io/>.

The blog (notebooks & research) lives in a separate repo and is linked from here:
<https://yassinealouini.github.io/blog/>.

`.nojekyll` disables GitHub's Jekyll build so the page is served as plain static HTML.

The theme matches the blog: system serif fonts, white background, navy headings
and rules, and muted ochre tags. No build step or external fonts are needed.

The front page pairs two compact pixel-art animations beside the introduction:
a stellarator and a random-matrix / deep-learning illustration. They display at
about 212px each on desktop; on narrower screens the pair sits below the text.
Reduced-motion preferences select stills, including without JavaScript; animations
also stop when offscreen or when the tab is hidden. There are no pause buttons.
Kaggle uses the unmodified official favicon saved from
<https://www.kaggle.com/static/images/favicon-new.ico> (retrieved 16 October 2026)
at `assets/kaggle.ico`. The book link shares its open-book SVG, wording, URL and
plain-link styling with the blog's “Get the book” link.
The illustrations have no visible titles or captions. RMT labels render at 4×
resolution with antialiased text and smooth browser downscaling; the drawing keeps
its pixel geometry.

The stellarator is monochrome with colored plasma. Regenerate it with
`python3 code/render-fusion-reactor.py` (Pillow, Playwright and Chromium).

Regenerate the RMT GIF and still with `python3 code/render-random-matrix.py`
(NumPy, Pillow, Playwright and Chromium). The 768×528 GIF shows a larger matrix,
a five-layer schematic network with branching pulses and a residual connection,
and a density-normalized histogram approaching the Wigner semicircle. Nine seeded
symmetric Gaussian matrices grow from N=16 to N=512, with off-diagonal variance
1/N: W=(G+Gᵀ)/√(2N). NumPy computes the eigenvalues; a fixed gold curve overlays
ρ(λ)=√(4−λ²)/(2π) on [−2,2]. A growing upper-left crop represents the matrix.
The histogram holds at N=512 before the experiment restarts. The network is an
illustration, not a claim that arbitrary neural weights follow this law.
See [these random-matrix lecture notes](https://wwwteor.mi.infn.it/~molinari/RMT/RM_LESSON_1.pdf)
for the normalization and semicircle law. Serving the site needs no authoring tools.

Preview locally with `python3 code/serve.py`. This serves the homepage and
sketchbook, and maps `/blog/` to the adjacent `../blog` repository, including its
posts and assets. Use `--blog-dir /path/to/blog` if that repository lives elsewhere.

Website generated with assistance from AI agents.

The **Sketchbook** at `/sketches/` matches the main page and shows a carousel of
three original SVG example studies, with illustrative sample drawings.
Palettes are extracted in the browser using a pixel-color histogram; near-white
paper is excluded when enough pigment remains. The palette is a continuous bar
of flat colors, sized by their pixel proportions, without explanatory labels.
Use the arrow buttons, keyboard arrows while focused in the gallery, or a
horizontal swipe to browse.

Add personal sketches through a PR: commit the image files under `sketches/`
(for example, `sketches/images/my-sketch.jpg`) and add an entry to the `sketches`
array in `sketches/sketches.js` with `title`, `src`, and descriptive `alt`
text. Image paths are relative to the sketchbook page, such as
`images/my-sketch.jpg`. Colors are derived automatically from the image.
The page needs no backend or build step.

A pixel-art cat paints beside the Sketchbook palette. Its GIF, still PNG, and
visibility handling live in `assets/painting-cat.*`. Reduced-motion preferences
select the still, and animation pauses when the cat or tab is hidden. Regenerate the animation with
`python3 code/render-painting-cat.py` (Pillow required).

The homepage, Sketchbook, and blog use the same top navigation: Home, Blog,
Sketchbook, and GitHub. Its styles live in `assets/site-navigation.css`; the blog
loads this file from `/assets/site-navigation.css` on the personal-site origin.
Keep the link order in `index.html`, `sketches/index.html`, and the blog's
`site_navigation()` generator aligned. Kaggle and the book stay below the intro.
With the preview server running and Playwright browsers installed, run
`python3 code/check-navigation.py` to check the shared links, header geometry,
fonts and active states across all pages in Firefox and Chromium at desktop
and mobile widths.
Page layout stylesheets use a versioned URL so navigation changes do not reuse
an older cached layout. The local preview server also sends `Cache-Control:
no-store` for HTML and assets. Navigation checks simulate an old cached layout
stylesheet as well as comparing fresh pages.


A small fluffy tabby follows the cursor (`assets/sidebar-cat.js`), trailing it
with a comfortable gap, eased steering and a distance-driven trot. It stops to
inspect the reactor, tags or book link when the cursor rests over them. After
five seconds without pointer input it curls up in place; moving the pointer
wakes it. There are no autonomous roaming routes. Touch input keeps the cat in
the reserved strip below the resource links. The paw button manually toggles a
nap; manual naps stay asleep until explicitly woken.

Quick pointer movements elicit a small leap; slow movement near the cat can
prompt a back-roll with a brief upside-down, paw-wiggling pause. These reactions
happen while following input, rather than sending the cat to random locations.
Click the cat's body to pet it: it relaxes, purrs visually and shows a small heart.
“Pet the cat” is also a keyboard-accessible button; page links remain click-through.

While the pointer is active, the cat occasionally charges a plasma beam in its
mouth: a 0.9-second gathering glow and progress ring precede the burst. The beam
uses the reactor's exact magenta/pink palette and fades over 0.65 seconds. Sleeping and reduced motion suppress the effect.
Click an empty right margin to roll a ball; a toy mouse follows the pointer in
the margin. The canvas is decorative and click-through. Reduced motion shows
a stationary sleeping cat; sleeping and hidden tabs stop the animation loop.
No network services, sprite downloads or build step are required.

The cat has short fur-covered legs, broad paws and rounded haunches concealing
the leg bends. Eyes, pupils, brows, head tilt, mouth and tail convey curious,
playful, mischievous, delighted, focused, puzzled, content and sleepy moods.
Check following, idle sleep/wake, manual naps, petting, leaps, back-rolls,
charge-before-fire, plasma colors, idle redraw counts, partial clears, link navigation,
responsive layout and reduced motion with
`python3 code/check-sidebar-cat.py http://localhost:8770` against a running preview.
The check uses a controlled browser clock and requires Chromium and Firefox.

Rendering is capped at 30 fps and stops entirely during sleep, reduced motion and
hidden tabs. The canvas clears only the previous cat/toy/effect rectangles rather
than the full viewport. Canvas buffers resize only when dimensions change; pointer
handlers are passive, layout reads occur only on resize/scroll, reaction classes
are cached, and DOM attributes/transforms are written only when their values change.
The cat needs no framework, image downloads, audio or external service.
