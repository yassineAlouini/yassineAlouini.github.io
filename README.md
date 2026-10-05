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

Preview locally with `python3 -m http.server 8766`.

Website generated with assistance from AI agents.
