# me.zijinluo.com

The personal website of Zijin Luo.

This repository contains one static site, served directly from the repository
root and deployed to GitHub Pages by `.github/workflows/pages.yml`.

- `/` — home and contact
- `/about/` — a short introduction
- `/thoughts/` — essays and notes

Hosting and custom-domain setup are documented in `HOSTING.md`.

## Publishing a thought

Thoughts are written as Markdown files in `content/thoughts/`. The deployment
workflow builds the public index, individual article pages, and search index
from those files automatically.

1. Copy `content/thoughts/TEMPLATE.md` to a new file named
   `YYYY-MM-DD-short-url-slug.md` (for example,
   `2026-08-12-rigor-is-a-product-feature.md`).
2. Fill in the front matter between the two `---` lines, then write the essay
   in regular Markdown below it.
3. To preview the generated site locally, run
   `node scripts/build-site.mjs` and serve the resulting `dist/` directory.
   On GitHub Pages, this same build runs automatically for every push to
   `master`.

`title`, `date`, and `summary` are required. `tags` is optional and can be a
comma-separated line or a YAML-style list. The filename supplies the public
URL, so use lowercase letters, numbers, and hyphens after the date. The built-in
renderer supports headings, paragraphs, emphasis, links, images, lists,
blockquotes, horizontal rules, and fenced code blocks. Raw HTML is displayed as
text for safety.
