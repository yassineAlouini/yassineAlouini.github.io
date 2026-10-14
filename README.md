# yassineAlouini.github.io

Personal landing page — a static `index.html` and `style.css` served at
<https://yassinealouini.github.io/>.

The blog (notebooks & research) lives in a separate repo and is linked from here:
<https://yassinealouini.github.io/blog/>.

`.nojekyll` disables GitHub's Jekyll build so the page is served as plain static HTML.

The theme matches the blog: system serif fonts, white background, navy headings
and rules, and muted ochre tags. No build step or external fonts are needed.

The front page includes a looping pixel-art stellarator GIF, moved from the blog.
The machine is monochrome with colored plasma. Playback controls select a still
when paused or offscreen; reduced-motion preferences also work without JavaScript.
The GIF, still, and playback controls live in `assets/`. To regenerate the images,
run `python3 code/render-fusion-reactor.py` with Pillow, Playwright, and its Chromium
browser installed. Serving the site does not require these tools.

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
