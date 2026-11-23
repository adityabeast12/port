/* Adaptive resolution for WebGL canvases.
   Phones refresh at 90 to 120 Hz and desktops at 60 to 144 Hz. When the GPU
   cannot finish a frame in time, render fewer pixels instead of dropping
   frames. The display's own frame interval is learned from the fastest frames
   seen, so the same rule works at any refresh rate. */
export function adaptiveResolution(renderer, { max = 2, min = 1, step = 0.25 } = {}) {
  let dpr = max, last = 0, best = 1e9, slow = 0, seen = 0, cool = 0;
  const born = performance.now();
  renderer.setPixelRatio(dpr);
  return {
    get dpr() { return dpr; },
    // Call once per rendered frame with the rAF timestamp.
    tick(now) {
      const iv = now - last; last = now;
      if (iv <= 0 || iv > 120) return; // first frame, tab switch or a one-off hitch
      // The display interval; assume at least 60 Hz so a GPU that is slow from
      // the very first frame is still caught.
      best = Math.min(iv, best + 0.002, 17.5);
      if (now - born < 2500 || now < cool) return; // the page is still loading
      seen++;
      if (iv > best * 1.45) slow++;
      if (seen < 60) return;
      if (slow > 20 && dpr > min) {
        dpr = Math.max(min, Math.round((dpr - step) * 100) / 100);
        renderer.setPixelRatio(dpr); // three re-applies the size itself
        cool = now + 1500;
      }
      seen = 0; slow = 0;
    },
    // Call when frames were skipped on purpose, so the gap is not counted.
    skip() { last = 0; },
  };
}
