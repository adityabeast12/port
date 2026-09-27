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
- `assets/js/main.js`: preloader, smooth scroll (Lenis), scroll choreography (GSAP ScrollTrigger), cursor, agent-trace terminal
- `assets/vendor/`: bundled copies of three.js 0.169, GSAP 3.12 + ScrollTrigger, Lenis 1.1

Each section picks its particle shape through `data-shape`, its horizontal offset through `data-x` and its opacity through `data-o`.

The site respects `prefers-reduced-motion`. If WebGL is unavailable it falls back to a static gradient.
