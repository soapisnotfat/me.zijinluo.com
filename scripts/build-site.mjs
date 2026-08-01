import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const ROOT_DIRECTORY = resolve(SCRIPT_DIRECTORY, "..");
const CONTENT_DIRECTORY = join(ROOT_DIRECTORY, "content", "thoughts");
const OUTPUT_DIRECTORY = join(ROOT_DIRECTORY, "dist");
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SOURCE_EXCLUSIONS = new Set([
  ".DS_Store",
  ".git",
  ".github",
  ".gitignore",
  "content",
  "dist",
  "HOSTING.md",
  "LICENSE",
  "node_modules",
  "package-lock.json",
  "package.json",
  "README.md",
  "scripts",
  "search-index.json",
  "thoughts",
]);

function buildError(message, filePath) {
  return new Error(filePath ? `${filePath}: ${message}` : message);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function unquote(value) {
  const trimmed = value.trim();

  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseFrontMatter(source, filePath) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");

  if (lines[0] !== "---") {
    throw buildError("start with a front-matter delimiter (---).", filePath);
  }

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line === "---"
  );

  if (closingIndex < 0) {
    throw buildError("is missing the closing front-matter delimiter (---).", filePath);
  }

  const metadata = Object.create(null);
  const frontMatterLines = lines.slice(1, closingIndex);

  for (let index = 0; index < frontMatterLines.length; index += 1) {
    const line = frontMatterLines[index];

    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);

    if (!match) {
      throw buildError(
        `has invalid front matter on line ${index + 2}. Use key: value.`,
        filePath
      );
    }

    const [, key, initialValue] = match;

    if (metadata[key] !== undefined) {
      throw buildError(`defines "${key}" more than once.`, filePath);
    }

    if (initialValue) {
      metadata[key] = unquote(initialValue);
      continue;
    }

    const values = [];
    let nextIndex = index + 1;

    while (nextIndex < frontMatterLines.length) {
      const listMatch = frontMatterLines[nextIndex].match(/^\s+-\s+(.+)$/);

      if (!listMatch) {
        break;
      }

      values.push(unquote(listMatch[1]));
      nextIndex += 1;
    }

    metadata[key] = values.length ? values : "";
    index = nextIndex - 1;
  }

  return {
    metadata,
    body: lines.slice(closingIndex + 1).join("\n").trim(),
  };
}

function parseTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  const tags = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  return tags
    .split(",")
    .map((tag) => unquote(tag).trim())
    .filter(Boolean);
}

function parseDate(value, filePath) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw buildError("needs a date in YYYY-MM-DD format.", filePath);
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw buildError(`has an invalid date: ${value}.`, filePath);
  }

  return parsed;
}

function normaliseSlug(value, filePath) {
  const slug = String(value).trim().toLowerCase();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw buildError(
      "needs a URL slug made of lowercase letters, numbers, and hyphens.",
      filePath
    );
  }

  return slug;
}

function decodedUrl(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function isSafeUrl(url, image) {
  const value = url.trim();

  if (!value || /^(?:data|javascript|vbscript):/i.test(value) || value.startsWith("//")) {
    return false;
  }

  if (/^(?:https?:|\/|\.\/|\.\.\/|#)/i.test(value)) {
    return !image || !value.startsWith("#");
  }

  return !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value);
}

function renderInline(value) {
  const tokens = [];
  const protect = (html) => {
    const token = `\u0000${tokens.length}\u0000`;
    tokens.push(html);
    return token;
  };
  let output = escapeHtml(value);

  output = output.replace(/`([^`]+)`/g, (_match, code) =>
    protect(`<code>${code}</code>`)
  );

  output = output.replace(
    /!\[([^\]]*)\]\(([^\s)]+)(?:\s+&quot;[^)]*&quot;)?\)/g,
    (_match, alt, source) => {
      const url = decodedUrl(source);
      return isSafeUrl(url, true)
        ? protect(
            `<img src="${escapeAttribute(url)}" alt="${alt}" loading="lazy" />`
          )
        : alt;
    }
  );

  output = output.replace(
    /\[([^\]]+)\]\(([^\s)]+)(?:\s+&quot;[^)]*&quot;)?\)/g,
    (_match, label, href) => {
      const url = decodedUrl(href);
      return isSafeUrl(url, false)
        ? protect(`<a href="${escapeAttribute(url)}">${label}</a>`)
        : label;
    }
  );

  output = output
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/(^|[^\w])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|[^\w])_([^_]+)_/g, "$1<em>$2</em>");

  return output.replace(/\u0000(\d+)\u0000/g, (_match, index) => tokens[Number(index)]);
}

function isHorizontalRule(line) {
  return /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line);
}

function isListLine(line) {
  return /^\s*[-+*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line);
}

function startsBlock(line) {
  return (
    /^\s*#{1,6}\s+/.test(line) ||
    /^\s*```/.test(line) ||
    /^\s*>\s?/.test(line) ||
    isHorizontalRule(line) ||
    isListLine(line)
  );
}

function markdownToHtml(markdown) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const output = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fenceMatch = line.match(/^\s*```([^\s`]*)\s*$/);

    if (fenceMatch) {
      const language = fenceMatch[1].replace(/[^A-Za-z0-9_-]/g, "");
      const code = [];
      index += 1;

      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }

      if (index === lines.length) {
        throw buildError("contains an unclosed fenced code block.");
      }

      output.push(
        `<pre><code${language ? ` class="language-${language}"` : ""}>${escapeHtml(
          code.join("\n")
        )}</code></pre>`
      );
      index += 1;
      continue;
    }

    const headingMatch = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);

    if (headingMatch) {
      const level = Math.min(6, Math.max(2, headingMatch[1].length));
      output.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (isHorizontalRule(line)) {
      output.push("<hr />");
      index += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote = [];

      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }

      output.push(`<blockquote>${markdownToHtml(quote.join("\n"))}</blockquote>`);
      continue;
    }

    const unorderedMatch = line.match(/^\s*[-+*]\s+(.+)$/);

    if (unorderedMatch) {
      const items = [];

      while (index < lines.length) {
        const itemMatch = lines[index].match(/^\s*[-+*]\s+(.+)$/);

        if (!itemMatch) {
          break;
        }

        items.push(`<li>${renderInline(itemMatch[1])}</li>`);
        index += 1;
      }

      output.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.+)$/);

    if (orderedMatch) {
      const items = [];

      while (index < lines.length) {
        const itemMatch = lines[index].match(/^\s*\d+[.)]\s+(.+)$/);

        if (!itemMatch) {
          break;
        }

        items.push(`<li>${renderInline(itemMatch[1])}</li>`);
        index += 1;
      }

      output.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraph = [];

    while (index < lines.length && lines[index].trim() && !startsBlock(lines[index])) {
      const paragraphLine = lines[index];
      paragraph.push(
        `${renderInline(paragraphLine.replace(/\s{2,}$/, ""))}${
          /\s{2,}$/.test(paragraphLine) ? "<br />" : ""
        }`
      );
      index += 1;
    }

    output.push(`<p>${paragraph.join(" ")}</p>`);
  }

  return output.join("\n");
}

function markdownToPlainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatMonthYear(date) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function filenameSlug(fileName) {
  const baseName = fileName.slice(0, -extname(fileName).length);
  return baseName.replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

async function readPosts() {
  const entries = await readdir(CONTENT_DIRECTORY, { withFileTypes: true });
  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        extname(entry.name).toLowerCase() === ".md" &&
        entry.name !== "TEMPLATE.md" &&
        entry.name !== "README.md" &&
        !entry.name.startsWith("_")
    )
    .map((entry) => entry.name)
    .sort();
  const posts = [];

  for (const fileName of files) {
    const filePath = join(CONTENT_DIRECTORY, fileName);
    const source = await readFile(filePath, "utf8");
    const relativePath = relative(ROOT_DIRECTORY, filePath);
    const { metadata, body } = parseFrontMatter(source, relativePath);
    const requiredFields = ["title", "date", "summary"];

    for (const field of requiredFields) {
      if (typeof metadata[field] !== "string" || !metadata[field].trim()) {
        throw buildError(`needs a non-empty "${field}" value.`, relativePath);
      }
    }

    const slug = normaliseSlug(metadata.slug || filenameSlug(fileName), relativePath);
    const date = parseDate(metadata.date, relativePath);

    posts.push({
      bodyHtml: markdownToHtml(body),
      date,
      dateString: metadata.date,
      fileName,
      searchBody: markdownToPlainText(body),
      slug,
      summary: metadata.summary.trim(),
      tags: parseTags(metadata.tags),
      title: metadata.title.trim(),
    });
  }

  const seenSlugs = new Set();

  for (const post of posts) {
    if (seenSlugs.has(post.slug)) {
      throw buildError(`Two thoughts produce the same URL slug: ${post.slug}.`);
    }
    seenSlugs.add(post.slug);
  }

  const chronological = [...posts].sort(
    (first, second) =>
      first.date - second.date || first.fileName.localeCompare(second.fileName)
  );
  chronological.forEach((post, index) => {
    post.number = String(index + 1).padStart(3, "0");
  });

  return posts.sort(
    (first, second) =>
      second.date - first.date || second.fileName.localeCompare(first.fileName)
  );
}

function searchControl() {
  return `
            <li class="search-control">
              <button class="search-toggle" type="button" aria-expanded="false" aria-controls="site-search-panel">Search</button>
              <div class="site-search-panel" id="site-search-panel">
                <form class="site-search-form" role="search">
                  <label class="visually-hidden" for="site-search-input">Search this site</label>
                  <input class="site-search-input" id="site-search-input" type="search" placeholder="Search this site" autocomplete="off" />
                  <button class="search-close" type="button" aria-label="Close search">×</button>
                </form>
                <div class="search-results" role="status" aria-live="polite"></div>
              </div>
            </li>`;
}

function siteHeader({ aboutHref, current, homeHref, thoughtsHref }) {
  const link = (label, href, page) =>
    `<li><a href="${href}"${current === page ? ' aria-current="page"' : ""}>${label}</a></li>`;

  return `
      <header class="site-header">
        <a class="wordmark" href="${homeHref}">Zijin Luo</a>
        <nav class="site-nav" aria-label="Primary">
          <ul>
            ${link("Home", homeHref, "home")}
            ${link("About", aboutHref, "about")}
            ${link("Thoughts", thoughtsHref, "thoughts")}
            ${searchControl()}
          </ul>
        </nav>
      </header>`;
}

function siteFooter(label, year) {
  return `
      <footer class="site-footer">
        <p>Zijin Luo</p>
        <p>${escapeHtml(label)}</p>
        <p>${escapeHtml(year)}</p>
      </footer>`;
}

function documentShell({ body, description, scriptHref, stylesheetHref, title }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${escapeAttribute(description)}" />
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="${stylesheetHref}" />
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to content</a>
    <div class="site-shell">${body}
    </div>
    <script type="module" src="${scriptHref}"></script>
  </body>
</html>
`;
}

function renderThoughtIndex(posts) {
  const rows = posts.length
    ? posts
        .map(
          (post) => `
          <a class="index-row" href="./${post.slug}/">
            <span class="index-number" aria-hidden="true">${post.number}</span>
            <span class="index-title">${escapeHtml(post.title)}</span>
            <span class="index-note">${escapeHtml(post.summary)}</span>
            <span aria-hidden="true">↗</span>
          </a>`
        )
        .join("")
    : `
          <p class="index-note">The first thought is on its way.</p>`;

  return documentShell({
    body: `${siteHeader({
      aboutHref: "../about/",
      current: "thoughts",
      homeHref: "../",
      thoughtsHref: "./",
    })}
      <main id="main-content" class="site-main thoughts-page">
        <section class="page-heading" aria-labelledby="page-title">
          <p class="eyebrow">Thoughts</p>
          <h1 id="page-title">Ideas worth returning to.</h1>
        </section>

        <p class="thoughts-intro">
          Short notes on systems, judgment, and the small distinctions that
          change how things work.
        </p>

        <section class="thought-index" aria-labelledby="index-title">
          <h2 id="index-title" class="section-label">Index</h2>${rows}
        </section>
      </main>${siteFooter("Thoughts", "2026")}`,
    description: "Thoughts, questions, and points of view from Zijin Luo.",
    scriptHref: "../assets/search.js",
    stylesheetHref: "../assets/site.css",
    title: "Thoughts · Zijin Luo",
  });
}

function renderThought(post) {
  return documentShell({
    body: `${siteHeader({
      aboutHref: "../../about/",
      current: "thoughts",
      homeHref: "../../",
      thoughtsHref: "../",
    })}
      <main id="main-content" class="site-main essay-page">
        <header class="essay-heading">
          <p class="eyebrow">Thought / ${post.number}</p>
          <h1>${escapeHtml(post.title)}</h1>
        </header>

        <time class="essay-meta" datetime="${post.dateString}">${formatMonthYear(post.date)}</time>

        <article class="essay-body">
          ${post.bodyHtml}
        </article>

        <a class="back-link" href="../">← All thoughts</a>
      </main>${siteFooter(`Thought ${post.number}`, post.dateString.slice(0, 4))}`,
    description: post.summary,
    scriptHref: "../../assets/search.js",
    stylesheetHref: "../../assets/site.css",
    title: `${post.title} · Zijin Luo`,
  });
}

async function copyStaticFiles() {
  async function copyDirectory(sourceDirectory, destinationDirectory) {
    const entries = await readdir(sourceDirectory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === ".DS_Store") {
        continue;
      }

      const source = join(sourceDirectory, entry.name);
      const destination = join(destinationDirectory, entry.name);

      if (entry.isDirectory()) {
        await mkdir(destination, { recursive: true });
        await copyDirectory(source, destination);
      } else if (entry.isFile()) {
        await copyFile(source, destination);
      }
    }
  }

  const entries = await readdir(ROOT_DIRECTORY, { withFileTypes: true });

  for (const entry of entries) {
    if (SOURCE_EXCLUSIONS.has(entry.name)) {
      continue;
    }

    const source = join(ROOT_DIRECTORY, entry.name);
    const destination = join(OUTPUT_DIRECTORY, entry.name);

    if (entry.isDirectory()) {
      await mkdir(destination, { recursive: true });
      await copyDirectory(source, destination);
    } else if (entry.isFile()) {
      await copyFile(source, destination);
    }
  }
}

async function writeOutput(relativePath, content) {
  const destination = resolve(OUTPUT_DIRECTORY, relativePath);
  const outputPrefix = `${OUTPUT_DIRECTORY}${sep}`;

  if (!destination.startsWith(outputPrefix)) {
    throw buildError(`Refusing to write outside the output directory: ${relativePath}`);
  }

  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, content, "utf8");
}

async function build() {
  const posts = await readPosts();

  await rm(OUTPUT_DIRECTORY, { force: true, recursive: true });
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await copyStaticFiles();
  await writeOutput("thoughts/index.html", renderThoughtIndex(posts));

  for (const post of posts) {
    await writeOutput(`thoughts/${post.slug}/index.html`, renderThought(post));
  }

  const searchIndex = [
    {
      title: "Home",
      path: "./",
      summary: "The personal index of Zijin Luo.",
      body: "AI products and infrastructure. About, thoughts, LinkedIn, and email.",
      tags: ["home", "index", "contact"],
    },
    {
      title: "About",
      path: "./about/",
      summary: "AI systems that become part of everyday life.",
      body: "Real-time voice and multimodal systems, private memory, agent infrastructure, low-latency services, encrypted retrieval, confidential computing, hardware attestation, reinforcement learning, and privacy-preserving infrastructure.",
      tags: ["about", "AI", "systems", "agents", "privacy"],
    },
    {
      title: "Thoughts",
      path: "./thoughts/",
      summary: "Short notes on systems, judgment, and the small distinctions that change how things work.",
      body: "A chronological index of ideas, arguments, and points of view.",
      tags: ["thoughts", "writing", "ideas"],
    },
    ...posts.map((post) => ({
      title: post.title,
      path: `./thoughts/${post.slug}/`,
      summary: post.summary,
      body: post.searchBody,
      tags: post.tags,
    })),
  ];

  await writeOutput("search-index.json", `${JSON.stringify(searchIndex, null, 2)}\n`);
  console.log(`Built ${posts.length} thought${posts.length === 1 ? "" : "s"} into dist/.`);
}

build().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
