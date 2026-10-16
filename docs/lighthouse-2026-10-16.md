# Homepage Lighthouse audit — 16 October 2026

Baseline: merged `master` at `2bd95c2`, including PRs #7 and #8. Candidate:
`lighthouse-homepage-improvements`. Lighthouse 13.5.0, headless Chromium 145,
default mobile simulated throttling and the desktop preset. Each row is one
sequential lab run, not a field measurement or a statistical benchmark.

| Target | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Local baseline, mobile | 96 | 100 | 96 | 100 | 2.85 s | 0 ms | 0 |
| Local candidate, mobile | 100 | 100 | 100 | 100 | 1.50 s | 0 ms | 0 |
| Local baseline, desktop | 100 | 100 | 96 | 100 | 0.66 s | 0 ms | 0 |
| Local candidate, desktop | 100 | 100 | 100 | 100 | 0.36 s | 0 ms | 0 |
| Public baseline, mobile | 100 | 100 | 96 | 100 | 1.18 s | 0 ms | 0 |

Local URL: `http://localhost:8771/`. Public baseline:
<https://yassinealouini.github.io/>. The public page already scored 100 for
performance; the local 96 → 100 result is not a claim about a deployed score
increase. The candidate has not been deployed.

## Changes

- Export the 72-frame RMT animation as lossless WebP: 172,476 → 35,202 bytes
  (79.6% smaller), preserving every decoded pixel, 768×528 resolution, frame
  timing, and the 7.2-second loop. Keep the GIF fallback and PNG still. This
  preserves the crisp labels and illustration quality.
- Serve the official Kaggle mark as PNG: 15,406 → 3,018 bytes (80.4% smaller),
  preserving its RGBA pixels and retaining the original official ICO as source.
- Remove redundant CSS still-image backgrounds and avoid reselecting the same
  animation at startup. Chromium and Firefox now request each animation once
  on initial load; both animated formats respond to motion/visibility changes.
- Supply SVG and root ICO personal favicons. The missing `/favicon.ico` caused
  the baseline console error and best-practices score deduction, including on
  the public site.

The preview intentionally sends `Cache-Control: no-store`; this exposes repeated
image requests more strongly than the public site's caching. Lighthouse counted
663,030 bytes locally before and 100,332 afterward, versus 240,739 bytes for the
public baseline. Do not interpret the local difference as typical production
transfer savings. The asset byte reductions above are independent of caching.

The preview also produces a back/forward-cache warning because of `no-store`.
Remaining opportunities include small render-blocking stylesheets, unminified
JavaScript, and images larger than their CSS display size. The stylesheets are
small, TBT is zero, and the RMT's higher resolution preserves text quality.
No runtime dependencies were added and the cat's animation code is unchanged.

## Reproduce and validate

Start the preview (point `--blog-dir` at the separate blog checkout if needed):

```sh
python3 code/serve.py --port 8771 --blog-dir /path/to/blog
```

In another terminal:

```sh
python3 code/audit-homepage.py http://localhost:8771/ --label after --output-dir /tmp/homepage-lighthouse-reports
python3 code/check-web-assets.py http://localhost:8771
python3 code/check-sidebar-cat.py http://localhost:8771
python3 code/check-navigation.py http://localhost:8771
```

All three browser checks passed in Chromium and Firefox. Coverage includes exact
asset fidelity, single initial animation requests, reduced motion with and
without JavaScript, offscreen pause/resume, responsive navigation, cursor
following, naps, petting, leaps, rolls, charge-before-fire, plasma colors, and
idle rendering. The reusable audit command also completed successfully.

Full JSON and HTML reports are generated outside the repository. Original run
artifacts are in `/tmp/homepage-lighthouse-reports/`, with `before-mobile`,
`before-desktop`, `after-mobile`, `after-desktop`, and `live-mobile` prefixes.
Reports are temporary local artifacts; regenerate them with the command above.
Lighthouse is a lab audit; see the [Chrome documentation](https://developer.chrome.com/docs/lighthouse/overview)
for interpreting its results.
