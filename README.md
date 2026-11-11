# Aditya Shukla — Portfolio

Portfolio of Aditya Shukla, AI engineer and AI solutions consultant. The site is styled as the operations console for his AI agents: dark graphite with an engineering grid, signal green for healthy systems, Poppins for text and JetBrains Mono for readouts.

## Sections

- **Hero:** thousands of WebGL particles (three.js) write **ADITYA SHUKLA** onto the screen left to right, like a pen (on two lines on phones). The cursor pushes them around. Scrolling turns the name into the agent loop, a figure-eight the particles flow around through four labelled stations (decide, call a tool, read the result, check), and then into a live trace waterfall of one agent run that records span by span as a cursor sweeps across it. The real `<h1>` stays in the page for screen readers and search engines, and becomes visible if WebGL fails.
- **Metrics:** real CV numbers only.
- **Try my agent:** a playable, scripted simulation of the agentic banking assistant (AutoGen, LlamaIndex, FastAPI, local LLMs on vLLM and Langfuse; moving to production at one bank) (`assets/js/agent-demo.js`). Visitors type requests and watch the pipeline run: guardrails (PII masking, prompt-injection and data-scope blocks), orchestrator, KYC, risk (daily limit, new payees), tools and reply, with a trace. It runs entirely in the browser; no model or bank is involved.
- **Field guide:** a card linking to Agent Atlas (below).
- **Deployments:** projects as a deployment list with status, environment and stack. Each row expands into a description and an architecture flow.
- **Capabilities, Guardrails, Operator, Contact:** services, a policy panel, profile plus changelog, and a terminal-style contact panel.
- **Multiverse ball (bottom-left):** transforms the whole site through a portal transition. Each universe changes the fonts, surfaces, background, copy, particle colours and interaction:
  - **Console:** the original dark console.
  - **Web-slinger:** a comic-book page with a blue halftone, ink-outlined panels, the Bangers font, starburst stickers, a speech-bubble tagline and "Issue #" captions. Clicking shoots a web line that splats where you click.
  - **Sky Guardian:** sunrise above a sea of clouds. The particle name glows like sunlight in the high dark sky, with a rising sun, lens flare, two parallax cloud banks, a hero flyby streak and an altimeter that drops as you scroll. The page shades from high altitude into golden hour. It also has a flowing cape-red banner ("Truth · Trust · Audited · Always"), a red and gold nav, 3D italic Archivo Black headings, and deployments as "★ Rescue 0N". Clicking fires heat-vision beams that leave a cooling scorch mark.
  - **Night Vigilante:** noir, with rain, fog, lightning, sweeping searchlights, a glowing signal in the clouds and a city skyline. The hero is dark and a flashlight reveals the name: it follows the cursor or finger and sweeps on its own when idle. Clicking fires a grapple line. It also has police tape, gold metallic headings, HUD corner brackets on panels, deployments as numbered case files, and red "Classified" and "Evidence" stamps.

  The copy for each universe lives in `assets/js/universes.js` (keyed by `data-t` attributes in the HTML). The styles live in `assets/css/universes.css`, and the fonts are self-hosted in `assets/fonts/` (SIL OFL). These are inspired themes only, with no character names or logos. The chosen universe is remembered per browser.
- **Ask my agent (bottom-right):** an optional chat drawer with pre-written answers from `assets/js/kb.js`.

Client names are confidential and must never appear in the code.

## Agent Atlas (`atlas/`)

A second page: an interactive, narrated field guide to AI agents for leaders anywhere in the world.

- Eight chapters: the big picture with a 3D stack you can drag (three.js), five ideas (LLM → RAG → API → tool → agent), a tool-call simulator, the blueprint, seven working demos, platforms, guardrails and the law, and how to start.
- A region picker (India, EU, UK, US, UAE, Australia) changes currency, tax rules, business-ID checksums (`atlas/data.js`), ledgers (Xero, QuickBooks, Zoho Books) and the laws shown.
- The rules section covers 13 jurisdictions plus global standards, dated November 2026 with sources, and six controls they share.
- The guided tour is narrated with audio pre-rendered locally by the open-source Kokoro-82M model in a male voice (`atlas/audio/stop-NN.mp3`, with sentence timings in `captions.json` for live captions). The spoken script is `atlas/audio/script.json`; re-render it and the captions together with `tools/narration.py` if the text changes.
- It follows the same four universes as the main site (the choice is shared through `localStorage`).

Files: `atlas/index.html`, `atlas/atlas.css`, `atlas/atlas.js`, `atlas/data.js`, `atlas/audio/`.

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

- `atlas/index.html` has its own title, description, canonical URL and `TechArticle`/`LearningResource` JSON-LD.
- `index.html` has the title, description, canonical URL, Open Graph and Twitter tags, and schema.org JSON-LD (`Person`, `ProfilePage`, `WebSite`). Together these describe Aditya as an AI engineer and AI solutions consultant.
- `llms.txt` (with a copy at `llm.txt`) is a plain-text summary for AI assistants and LLM crawlers.
- `robots.txt` allows every crawler and points to the sitemap. `sitemap.xml` lists both pages.
- `site.webmanifest`, `404.html` and `assets/img/og.jpg` (the link-preview image) are also included.

Crawlers only read `robots.txt` and `llms.txt` at the root of a domain. While the site lives at `adityabeast12.github.io/port/`, those two files are not at the root. Renaming this repository to `adityabeast12.github.io` moves the site to the root domain. If you do that, update every `https://adityabeast12.github.io/port/` URL in `index.html`, `llms.txt`, `robots.txt` and `sitemap.xml`, and the `/port/` links in `404.html`.
