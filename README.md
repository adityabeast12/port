# Aditya Shukla — Mission Control

Portfolio of Aditya Shukla, AI engineer and AI solutions consultant. The site is styled as the operations console for his AI agents: dark graphite with an engineering grid, signal green for healthy systems, Poppins for text and JetBrains Mono for readouts.

## Sections

- **Status bar:** operational light, section tabs, a live IST clock and a contact button.
- **Overview:** an intro panel, and the **core**, a WebGL particle orb (three.js) that cycles between core, network, signal and guarded modes. Visitors can pick a mode. Below them sit metric tiles (real CV numbers only) and a live agent trace that streams an example banking request.
- **Deployments:** projects as a deployment list with status, environment and stack. Each row expands, using a native `<details>` element, into a description and an architecture flow.
- **Capabilities:** skills as "services running".
- **Guardrails:** responsible-AI practices as a policy panel whose toggles arm on scroll.
- **Operator:** profile plus a career changelog (v0.1 B.Tech → v1.0 Business Analyst → v2.0 AI Solutions Consultant).
- **Contact:** a terminal-style "open a channel" panel.
- **Ask my agent:** an optional chat drawer with pre-written answers from `assets/js/kb.js`.

Client names are confidential and must never appear in the code.

It is a static site with no build step:

```sh
python3 -m http.server 8000
```

## Files

- `index.html`: all content, SEO meta tags and JSON-LD
- `assets/css/style.css`: styles
- `assets/js/main.js`: boot sequence, smooth scroll (Lenis), orb modes, reveals, counters, live trace, active tab
- `assets/js/scene.js`: the particle orb. It sizes itself to its canvas and pauses rendering while off screen.
- `assets/js/chat.js` and `assets/js/kb.js`: the Ask my agent drawer and its answers
- `assets/vendor/`: bundled three.js and Lenis

The site respects `prefers-reduced-motion`. If scripts fail to load, a failsafe removes the boot screen after 7 seconds.

## Search and AI discoverability

- `index.html` has the title, description, canonical URL, Open Graph and Twitter tags, and schema.org JSON-LD (`Person`, `ProfilePage`, `WebSite`). Together these describe Aditya as an AI engineer and AI solutions consultant.
- `llms.txt` (with a copy at `llm.txt`) is a plain-text summary for AI assistants and LLM crawlers.
- `robots.txt` allows every crawler and points to the sitemap. `sitemap.xml` lists the page.
- `site.webmanifest`, `404.html` and `assets/img/og.jpg` (the link-preview image) are also included.

Crawlers only read `robots.txt` and `llms.txt` at the root of a domain. While the site lives at `adityabeast12.github.io/port/`, those two files are not at the root. Renaming this repository to `adityabeast12.github.io` moves the site to the root domain. If you do that, update every `https://adityabeast12.github.io/port/` URL in `index.html`, `llms.txt`, `robots.txt` and `sitemap.xml`, and the `/port/` links in `404.html`.
