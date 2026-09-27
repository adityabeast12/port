# Aditya Shukla — Portfolio

Personal site for Aditya Shukla, AI Solutions Consultant (agentic AI, ML and responsible AI systems).

A static site with no build step. Open it through any static server, for example:

```sh
python3 -m http.server 8000
```

## Structure

- `index.html`: all content
- `assets/css/style.css`: styles
- `assets/js/scene.js`: WebGL particle field (Three.js) that morphs between five shapes (core, agent network, waveform, guarded core, galaxy) as you scroll
- `assets/js/main.js`: picks the particle shape per section, scroll reveals, counters, agent-trace terminal
- `assets/vendor/`: bundled copy of three.js 0.169

Each section picks its particle shape through `data-shape`, its horizontal offset through `data-x`, its opacity through `data-o` and its vertical offset on phones through `data-ym`.

The site respects `prefers-reduced-motion`. If WebGL is unavailable it falls back to a static gradient.
