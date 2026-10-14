#!/usr/bin/env python3
"""Preview the personal site and its sibling blog on one local origin."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SITE_ROOT = Path(__file__).resolve().parents[1]


class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, blog_root, **kwargs):
        self.blog_root = blog_root
        super().__init__(*args, directory=str(SITE_ROOT), **kwargs)

    def end_headers(self):
        # Preview edits immediately instead of mixing cached HTML and CSS.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def translate_path(self, path):
        translated = Path(super().translate_path(path))
        relative = translated.relative_to(SITE_ROOT)
        if relative.parts and relative.parts[0] == "blog":
            return str(self.blog_root.joinpath(*relative.parts[1:]))
        return str(translated)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8766)
    parser.add_argument("--blog-dir", type=Path, default=SITE_ROOT.parent / "blog")
    args = parser.parse_args()
    blog_root = args.blog_dir.resolve()
    if not (blog_root / "index.html").is_file():
        parser.error(f"Blog index not found at {blog_root / 'index.html'}; set --blog-dir.")
    handler = partial(PreviewHandler, blog_root=blog_root)
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Preview: http://localhost:{args.port}/ (blog at /blog/)", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
