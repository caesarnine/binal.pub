// The raster artwork is the source of every visible scenery pixel. Animation
// refracts only water-colored pixels and turns a small masked wheel interior.
// This component knows nothing about posts, dates, or the length of the page.
class RiverScene extends HTMLElement {
  private frame = 0;
  private lastFrame = 0;
  private time = 0;
  private visible = true;
  private paused = false;
  private initialized = false;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  private observer?: IntersectionObserver;
  private button: HTMLButtonElement | null = null;
  private renderFrame?: (time: number) => void;
  private events = new AbortController();

  async connectedCallback() {
    if (this.initialized) return;
    this.initialized = true;
    this.button = document.querySelector<HTMLButtonElement>('.motion-toggle');
    try { this.paused = localStorage.getItem('binal-scenery-paused') === 'true'; } catch { /* Preferences remain usable when storage is unavailable. */ }
    this.paused ||= this.reducedMotion.matches;
    this.button?.addEventListener('click', this.toggle, { signal: this.events.signal });
    this.reducedMotion.addEventListener('change', this.onMotionPreference, { signal: this.events.signal });
    document.addEventListener('visibilitychange', this.sync, { signal: this.events.signal });
    this.observer = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; this.sync(); });
    this.observer.observe(this);

    const source = this.querySelector<HTMLImageElement>('.river-image');
    const canvas = this.querySelector<HTMLCanvasElement>('canvas');
    if (!source || !canvas) return;
    try {
      await source.decode();
      if (!this.isConnected) return;
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) return;
      // A deliberately small backing canvas keeps the pixels crisp and work
      // bounded, even on retina displays and very long archive pages.
      const width = canvas.width = 397;
      const height = canvas.height = Math.round(width * source.naturalHeight / source.naturalWidth);
      context.imageSmoothingEnabled = false;
      context.drawImage(source, 0, 0, width, height);
      const base = context.getImageData(0, 0, width, height);
      const output = context.createImageData(width, height);
      const pixels = base.data;
      const waterMask = new Uint8Array(width * height);
      const water: { index: number; x: number; y: number; foam: boolean }[] = [];
      for (let y = Math.floor(height * .087); y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          const [r, g, b, a] = pixels.subarray(index, index + 4);
          const turquoise = g > r * 1.12 && b > r * 1.08 && g >= b * .91;
          const foam = r > 175 && g > r + 5 && b > r + 3;
          if (a > 220 && (turquoise || foam)) {
            waterMask[y * width + x] = 1;
            water.push({ index, x, y, foam });
          }
        }
      }
      // Coordinates are normalized to the ONE scene asset, never to article rows.
      // Mask stays inside the rim so the bank and wheel frame remain stationary.
      const wheel = { x: .551 * width, y: .281 * height, rx: .044 * width, ry: .022 * height };
      const rotor: { index: number; radius: number; angle: number }[] = [];
      for (let y = Math.floor(wheel.y - wheel.ry); y <= wheel.y + wheel.ry; y++) {
        for (let x = Math.floor(wheel.x - wheel.rx); x <= wheel.x + wheel.rx; x++) {
          const dx = (x - wheel.x) / wheel.rx;
          const dy = (y - wheel.y) / wheel.ry;
          const radius = Math.hypot(dx, dy);
          if (radius < .91) rotor.push({ index: (y * width + x) * 4, radius, angle: Math.atan2(dy, dx) });
        }
      }
      this.renderFrame = (time) => {
        output.data.set(pixels);
        for (const { index, x, y, foam } of water) {
          const waterfall = y < height * .20;
          const flow = Math.sin(y * .20 - time * (waterfall ? 5 : 1.6) + Math.sin(x * .19) * 2);
          const dx = Math.round(Math.sin(y * .11 - time * 1.2) * (waterfall ? .5 : 1.4));
          const dy = Math.round(flow * (waterfall ? 3 : 1.5));
          const sample = (y + dy) * width + x + dx;
          const from = waterMask[sample] ? sample * 4 : index;
          const glint = Math.max(0, Math.sin(x * .37 + y * .31 - time * 1.8) - .88) * (foam ? 90 : 115);
          for (let channel = 0; channel < 3; channel++) output.data[index + channel] = pixels[from + channel] + glint + flow * (foam ? 5 : 2);
        }
        for (const { index, radius, angle } of rotor) {
          const rotation = angle - time * .18;
          const x = Math.round(wheel.x + Math.cos(rotation) * radius * wheel.rx);
          const y = Math.round(wheel.y + Math.sin(rotation) * radius * wheel.ry);
          const from = (y * width + x) * 4;
          for (let channel = 0; channel < 4; channel++) output.data[index + channel] = pixels[from + channel];
        }
        context.putImageData(output, 0, 0);
      };
      this.dataset.ready = '';
      if (this.button) this.button.hidden = false;
      this.sync();
    } catch {
      // The original <img> remains a complete, static scene without canvas/JS.
      this.button?.setAttribute('hidden', '');
    }
  }

  private toggle = () => {
    this.paused = !this.paused;
    try { localStorage.setItem('binal-scenery-paused', String(this.paused)); } catch { /* No persistence required. */ }
    this.sync();
  };
  private onMotionPreference = () => {
    if (this.reducedMotion.matches) this.paused = true;
    this.sync();
  };
  private sync = () => {
    cancelAnimationFrame(this.frame);
    this.lastFrame = 0;
    if (this.button) {
      this.button.textContent = this.paused ? 'Play scenery' : 'Pause scenery';
      this.button.setAttribute('aria-pressed', String(this.paused));
      this.button.setAttribute('aria-label', this.paused ? 'Play animated scenery' : 'Pause animated scenery');
    }
    if (!this.paused && this.visible && !document.hidden && this.renderFrame) this.frame = requestAnimationFrame(this.tick);
  };
  private tick = (now: number) => {
    if (!this.lastFrame) this.lastFrame = now;
    const elapsed = now - this.lastFrame;
    // 24 fps is enough for this quiet pixel scene. Hidden tabs spend no frames.
    if (elapsed >= 1000 / 24) {
      this.time += Math.min(elapsed, 100) / 1000;
      this.renderFrame?.(this.time);
      this.lastFrame = now;
    }
    this.frame = requestAnimationFrame(this.tick);
  };
  disconnectedCallback() {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.events.abort();
  }
}
if (!customElements.get('river-scene')) customElements.define('river-scene', RiverScene);
