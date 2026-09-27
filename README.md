# Aditya Shukla — The Agent Files

Portfolio of Aditya Shukla, AI Solutions Consultant. It is styled as a secret-agent dossier, because he builds AI agents:

- cream paper, black ink, red stamps, set in Poppins
- condensed poster type and hard-shadow cards
- client names shown as redaction bars

## Sections

1. **Hero:** outlined and filled name, a taped "subject" polaroid, a sticker and a stamp.
2. **Origin:** a pinned, four-page story. A WebGL particle orb (three.js) morphs with each page: core, agent network, waveform, guarded core.
3. **The only rule:** a scroll-revealed statement.
4. **Special skills:** a horizontal scroll on desktop, stacked on phones.
5. **The case files:** seven projects with redacted client fields.
6. **The record:** stats and a personnel-file timeline.
7. **Contact.**

A small **Ask my agent** button opens an optional chat drawer. Its answers are pre-written in `assets/js/kb.js`; nothing is generated.

It is a static site with no build step:

```sh
python3 -m http.server 8000
```

## Files

- `index.html`: all page content
- `assets/css/style.css`: styles
- `assets/js/main.js`: loader, smooth scroll (Lenis), scroll animations (GSAP ScrollTrigger), origin pin
- `assets/js/scene.js`: particle orb
- `assets/js/chat.js` and `assets/js/kb.js`: the Ask my agent drawer and its answers
- `assets/vendor/`: bundled three.js, GSAP + ScrollTrigger, Lenis

Redaction bars contain filler text only. Never put real client names inside them, because hidden text is still readable in the page source.

The site respects `prefers-reduced-motion`. If a script fails to load, a failsafe removes the loader after 8 seconds.

## Search and AI discoverability

- `index.html` has the title, description, canonical URL, Open Graph and Twitter tags, and schema.org JSON-LD (`Person`, `ProfilePage`, `WebSite`). Together these describe Aditya as an AI engineer and AI solutions consultant.
- `llms.txt` (with a copy at `llm.txt`) is a plain-text summary for AI assistants and LLM crawlers.
- `robots.txt` allows every crawler and points to the sitemap. `sitemap.xml` lists the page.
- `site.webmanifest`, `404.html` and `assets/img/og.jpg` (the link-preview image) are also included.

Crawlers only read `robots.txt` and `llms.txt` at the root of a domain. While the site lives at `adityabeast12.github.io/port/`, those two files are not at the root. Renaming this repository to `adityabeast12.github.io` moves the site to the root domain. If you do that, update every `https://adityabeast12.github.io/port/` URL in `index.html`, `llms.txt`, `robots.txt` and `sitemap.xml`, and the `/port/` links in `404.html`.
