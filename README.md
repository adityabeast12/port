# Aditya Shukla — Portfolio

Portfolio of Aditya Shukla, AI engineer and AI solutions consultant. The site is styled as the operations console for his AI agents: dark graphite with an engineering grid, signal green for healthy systems, Poppins for text and JetBrains Mono for readouts.

## Sections

- **Hero:** thousands of WebGL particles (three.js) fly in and form **ADITYA SHUKLA**, on two lines on phones. The cursor pushes them around. Scrolling through the hero dissolves the name into the core sphere, then into the agent network. The real `<h1>` stays in the page for screen readers and search engines, and becomes visible if WebGL fails.
- **Metrics:** real CV numbers only.
- **Try my agent:** a playable, scripted simulation of the banking assistant (`assets/js/agent-demo.js`). Visitors type requests and watch the pipeline run: guardrails (PII masking, prompt-injection and data-scope blocks), orchestrator, KYC, risk (daily limit, new payees), tools and reply, with a trace. It runs entirely in the browser; no model or bank is involved.
- **Deployments:** projects as a deployment list with status, environment and stack. Each row expands into a description and an architecture flow.
- **Capabilities, Guardrails, Operator, Contact:** services, a policy panel, profile plus changelog, and a terminal-style contact panel.
- **Multiverse ball (bottom-left):** transforms the whole site through a portal transition. Each universe changes the fonts, surfaces, background, copy, particle colours and interaction:
  - **Console:** the original dark console.
  - **Web-slinger:** a comic-book page with a blue halftone, ink-outlined panels, the Bangers font, starburst stickers, a speech-bubble tagline and "Issue #" captions. Clicking shoots a web line that splats where you click.
  - **Sky Guardian:** daylight, with drifting clouds, sun glare, speed lines, glassy cards with red tops, and the Archivo Black font in skewed hero headings. Clicking fires two heat-vision beams.
  - **Night Vigilante:** noir, with rain, a city skyline, gold on black and the Bebas Neue font. In the hero, a flashlight follows the cursor.

  The copy for each universe lives in `assets/js/universes.js` (keyed by `data-t` attributes in the HTML). The styles live in `assets/css/universes.css`, and the fonts are self-hosted in `assets/fonts/` (SIL OFL). These are inspired themes only, with no character names or logos. The chosen universe is remembered per browser.
- **Ask my agent (bottom-right):** an optional chat drawer with pre-written answers from `assets/js/kb.js`.

Client names are confidential and must never appear in the code.

It is a static site with no build step:

```sh
python3 -m http.server 8000
```

## Files

- `index.html`: all content, SEO meta tags and JSON-LD
- `assets/css/style.css`: styles
- `assets/js/main.js`: boot sequence, smooth scroll (Lenis), hero choreography, multiverse, reveals, counters, active tab
- `assets/js/scene.js`: the particle field, including the name shape sampled from text. It sizes itself to its canvas and pauses while off screen.
- `assets/js/agent-demo.js`: the playable agent (the `plan()` parser and the pipeline UI)
- `assets/js/universes.js` and `assets/css/universes.css`: the multiverse (copy, fonts, click effects, themes)
- `assets/js/chat.js` and `assets/js/kb.js`: the Ask my agent drawer and its answers
- `assets/vendor/`: bundled three.js and Lenis

The site respects `prefers-reduced-motion`. If scripts fail to load, a failsafe removes the boot screen after 7 seconds. Bump the `?v=` tags in `index.html` and the JS imports on every release, so browsers never mix old and new files.

## Search and AI discoverability

- `index.html` has the title, description, canonical URL, Open Graph and Twitter tags, and schema.org JSON-LD (`Person`, `ProfilePage`, `WebSite`). Together these describe Aditya as an AI engineer and AI solutions consultant.
- `llms.txt` (with a copy at `llm.txt`) is a plain-text summary for AI assistants and LLM crawlers.
- `robots.txt` allows every crawler and points to the sitemap. `sitemap.xml` lists the page.
- `site.webmanifest`, `404.html` and `assets/img/og.jpg` (the link-preview image) are also included.

Crawlers only read `robots.txt` and `llms.txt` at the root of a domain. While the site lives at `adityabeast12.github.io/port/`, those two files are not at the root. Renaming this repository to `adityabeast12.github.io` moves the site to the root domain. If you do that, update every `https://adityabeast12.github.io/port/` URL in `index.html`, `llms.txt`, `robots.txt` and `sitemap.xml`, and the `/port/` links in `404.html`.
