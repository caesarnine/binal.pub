type Renderer = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  texture: WebGLTexture;
  buffer: WebGLBuffer;
  uniforms: Record<string, WebGLUniformLocation | null>;
};
type Firefly = { x: number; y: number; phase: number; life: number; duration: number; size: number; temporary: boolean };
const vertexSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = vec2(a_position.x * .5 + .5, .5 - a_position.y * .5);
    gl_Position = vec4(a_position, 0., 1.);
  }
`;
const fragmentSource = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  varying vec2 v_uv;
  uniform sampler2D u_image;
  uniform vec2 u_cover;
  uniform vec2 u_pointer;
  uniform vec3 u_ripple;
  uniform float u_time;
  uniform float u_gust;
  uniform float u_energy;
  float luminance(vec3 color) {
    return dot(color, vec3(.2126, .7152, .0722));
  }
  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
  }
  float area(vec2 uv, vec4 bounds) {
    return smoothstep(bounds.x, bounds.x + .012, uv.x)
      * (1. - smoothstep(bounds.z - .012, bounds.z, uv.x))
      * smoothstep(bounds.y, bounds.y + .012, uv.y)
      * (1. - smoothstep(bounds.w - .012, bounds.w, uv.y));
  }
  float warmPixel(vec3 color) {
    return smoothstep(.09, .29, color.r - color.b) * smoothstep(.36, .75, color.r);
  }
  vec3 movingSky(vec2 uv) {
    vec3 sky = texture2D(u_image, uv).rgb;
    // Leave the fixed evening star out of the drifting cloud layer.
    float star = 1. - smoothstep(.008, .021, length((uv - vec2(.71, .091)) * vec2(1., 1.75)));
    vec3 clear = texture2D(u_image, uv + vec2(.024, .006)).rgb;
    return mix(sky, clear, star);
  }
  void main() {
    vec2 anchor = (v_uv - .5) * u_cover * .984 + .5;
    anchor += (u_pointer - .5) * vec2(.006, .0025);
    vec2 uv = anchor;
    vec3 original = texture2D(u_image, anchor).rgb;

    // Correlated gusts bend the upper foliage while roots and architecture stay put.
    float naturalGust = .64 + .24 * sin(u_time * .38) + .12 * sin(u_time * .71 + 2.);
    float wind = u_energy * naturalGust + u_gust;
    float plants = smoothstep(-.025, .08, original.g - original.r);
    float foreground = smoothstep(.69, .82, anchor.y);
    float anchoredBend = clamp((1.03 - anchor.y) / .23, 0., 1.);
    float canopy = area(anchor, vec4(0., 0., .31, .21)) * (1. - smoothstep(.22, .4, luminance(original)));
    float sway = sin(anchor.x * 24. - u_time * 1.35) + .35 * sin(anchor.x * 59. - u_time * 2.1);
    float foliage = foreground * plants * anchoredBend + canopy * .45;
    uv.x += foliage * sway * (.0005 + wind * .0042);
    uv.y += foliage * sin(anchor.x * 32. - u_time * 1.4) * wind * .0011;

    // The lake has depth-dependent, overlapping wave trains rather than a uniform wobble.
    float water = smoothstep(.04, .13, original.b - original.r);
    water *= smoothstep(.59, .65, anchor.y) * (1. - smoothstep(.78, .855, anchor.y));
    water *= smoothstep(.405, .48, anchor.x);
    float depth = smoothstep(.6, .82, anchor.y);
    float wave = sin(anchor.y * 225. - u_time * 1.8) + .4 * sin(anchor.y * 430. + u_time * 2.6);
    uv.x += water * wave * (.0006 + depth * .0012 + wind * .0008);
    uv.y += water * sin(anchor.x * 87. + anchor.y * 45. - u_time * 1.15) * (.0003 + depth * .0007);
    float age = u_time - u_ripple.z;
    vec2 delta = (anchor - u_ripple.xy) * vec2(1., 1.8);
    float distance = length(delta);
    float ringDistance = (distance - age * .06) * 22.;
    float ring = exp(-ringDistance * ringDistance);
    float fade = max(0., 1. - age / 4.);
    uv += normalize(delta + .0001) * sin(distance * 150. - age * 11.) * ring * fade * water * .004;
    vec3 color = texture2D(u_image, clamp(uv, .001, .999)).rgb;

    // Soft sky masks follow the skyline and protect the foreground tree silhouettes.
    float skyline = mix(.385, .45, smoothstep(.3, .46, anchor.x));
    skyline = mix(skyline, .337, smoothstep(.47, .64, anchor.x));
    skyline = mix(skyline, .41, smoothstep(.7, .82, anchor.x));
    skyline = mix(skyline, .365, smoothstep(.86, 1., anchor.x));
    float sky = (1. - smoothstep(skyline - .045, skyline - .008, anchor.y));
    // Fade the moving layer before either sample reaches the texture boundary.
    // Clamping moving clouds at the edge otherwise stretches a single pixel column.
    sky *= smoothstep(.365, .42, anchor.x) * (1. - smoothstep(.865, .92, anchor.x));
    sky *= smoothstep(.13, .24, luminance(original));
    float star = 1. - smoothstep(.007, .021, length((anchor - vec2(.71, .091)) * vec2(1., 1.75)));
    // Two phases let the clouds drift continuously without a visible loop boundary.
    float phase = fract(u_time / 64.);
    float drift = phase * .065;
    vec2 cloudA = anchor + vec2(drift, sin(u_time * .035) * .0013);
    vec2 cloudB = anchor + vec2(drift - .065, sin(u_time * .035) * .0013);
    cloudA.x = clamp(cloudA.x, .3, .987);
    cloudB.x = clamp(cloudB.x, .3, .987);
    vec3 clouds = mix(movingSky(cloudA), movingSky(cloudB), smoothstep(.3, .8, phase));
    color = mix(color, clouds, sky * (1. - star));
    color += original * star * (.07 * sin(u_time * .8) + .035 * sin(u_time * 1.7));

    // Each group of windows has its own phase; greenhouse light is slower and warmer.
    float city = area(anchor, vec4(.37, .54, .96, .635));
    float greenhouse = area(anchor, vec4(.008, .205, .18, .46));
    float lanterns = area(anchor, vec4(.035, .49, .4, .805));
    float lightMask = min(1., city + greenhouse + lanterns) * warmPixel(original);
    float seed = hash(floor(anchor * vec2(290., 165.)));
    float twinkle = .13 * sin(u_time * (.65 + seed * .6) + seed * 31.);
    twinkle += .045 * sin(u_time * 2.1 + seed * 71.);
    float hearth = .045 * sin(u_time * .6) + .02 * sin(u_time * 1.4);
    float glow = mix(twinkle, hearth, greenhouse);
    color += vec3(1., .69, .32) * lightMask * (.035 + glow);
    vec2 pixel = vec2(1. / 1659., 1. / 948.);
    float halo = warmPixel(texture2D(u_image, anchor + pixel * vec2(2., 0.)).rgb);
    halo += warmPixel(texture2D(u_image, anchor - pixel * vec2(2., 0.)).rgb);
    halo += warmPixel(texture2D(u_image, anchor + pixel * vec2(0., 2.)).rgb);
    color += vec3(1., .57, .23) * halo * min(1., city + greenhouse + lanterns) * (.01 + glow * .015);

    // Broken highlights shimmer within the reflected light, in sync with the water.
    float reflection = smoothstep(.018, .095, color.r - color.g) * water;
    float sparkle = sin(anchor.y * 310. - u_time * 2.2) * sin(anchor.x * 130. + u_time * .7);
    color += vec3(.75, .58, .62) * reflection * (.022 + sparkle * .035);
    color *= 1. + water * .017 * sin(anchor.y * 185. - u_time * 1.4);
    gl_FragColor = vec4(clamp(color, 0., 1.), 1.);
  }
`;

function createRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Shader unavailable');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); throw new Error('Shader compilation failed'); }
    return shader;
  };
  try {
    const program = gl.createProgram(), buffer = gl.createBuffer(), texture = gl.createTexture();
    if (!program || !buffer || !texture) return null;
    const vertex = compile(gl.VERTEX_SHADER, vertexSource), fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Interpolate movement within the painted pixels to avoid shimmer during slow drift.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const uniforms: Renderer['uniforms'] = {};
    for (const name of ['image', 'cover', 'pointer', 'ripple', 'time', 'gust', 'energy']) uniforms[name] = gl.getUniformLocation(program, 'u_' + name);
    gl.uniform1i(uniforms.image, 0);
    return { gl, program, buffer, texture, uniforms };
  } catch { return null; }
}

function initGarden(root: HTMLElement) {
  const landscape = root.querySelector<HTMLElement>('.garden-landscape')!;
  const image = root.querySelector<HTMLImageElement>('.garden-image')!;
  const canvas = root.querySelector<HTMLCanvasElement>('.garden-water')!;
  const atmosphere = root.querySelector<HTMLCanvasElement>('.garden-fireflies')!;
  const paint = atmosphere.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = root.dataset.kind === 'home';
  const energy = hero ? .46 : .22;
  let paused = reduceMotion.matches;
  let renderer = createRenderer(canvas), textureReady = false;
  let inView = true, time = 0, frame = 0, previous = 0, gust = 0;
  let cover = { x: 1, y: 1 };
  const pointer = { x: .5, y: .6, active: false };
  const camera = { x: .5, y: .5 };
  let ripple = { x: .6, y: .7, time: -100 };
  const fireflies: Firefly[] = [];

  function makeFirefly(x = Math.random(), y = .35 + Math.random() * .6, temporary = false): Firefly {
    const duration = temporary ? 3 + Math.random() * 3 : 10 + Math.random() * 15;
    return { x, y, phase: Math.random() * Math.PI * 2, life: duration, duration, size: 1 + Math.random(), temporary };
  }
  for (let i = 0; i < (hero ? 32 : 12); i++) fireflies.push(makeFirefly());

  function drawScene() {
    if (!renderer || !textureReady || paused) return;
    const { gl, uniforms } = renderer;
    gl.uniform2f(uniforms.cover, cover.x, cover.y);
    gl.uniform2f(uniforms.pointer, camera.x, camera.y);
    gl.uniform3f(uniforms.ripple, ripple.x, ripple.y, ripple.time);
    gl.uniform1f(uniforms.time, time);
    gl.uniform1f(uniforms.gust, gust);
    gl.uniform1f(uniforms.energy, energy);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    canvas.classList.add('ready');
  }
  function resize() {
    const bounds = landscape.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const scale = Math.min(1, 1152 / bounds.width);
    canvas.width = Math.round(bounds.width * scale);
    canvas.height = Math.round(bounds.height * scale);
    atmosphere.width = canvas.width;
    atmosphere.height = canvas.height;
    const aspect = bounds.width / bounds.height;
    const imageAspect = (image.naturalWidth || 1659) / (image.naturalHeight || 948);
    cover = aspect > imageAspect ? { x: 1, y: imageAspect / aspect } : { x: aspect / imageAspect, y: 1 };
    renderer?.gl.viewport(0, 0, canvas.width, canvas.height);
    drawScene();
  }
  async function loadTexture() {
    try { await image.decode(); } catch { return; }
    if (!root.isConnected) return;
    if (renderer) {
      const { gl, texture } = renderer;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      textureReady = true;
    }
    resize();
    updateMotion();
  }
  function drawFireflies(dt: number) {
    if (!paint) return;
    const width = atmosphere.width, height = atmosphere.height;
    paint.clearRect(0, 0, width, height);
    for (let i = fireflies.length - 1; i >= 0; i--) {
      const p = fireflies[i];
      p.life -= dt;
      const attraction = pointer.active ? .12 : 0;
      p.x += (Math.sin(time * .5 + p.phase) * .008 + energy * .005 + (pointer.x - p.x) * attraction) * dt;
      p.y += (Math.cos(time * .65 + p.phase) * .009 + (pointer.y - p.y) * attraction) * dt;
      if (p.life <= 0 || p.x > 1.05 || p.y < -.05) {
        if (p.temporary) { fireflies.splice(i, 1); continue; }
        Object.assign(p, makeFirefly());
      }
      const fade = Math.min(1, p.life, (p.duration - p.life) * 1.2);
      const pulse = .2 + Math.pow(.5 + .5 * Math.sin(time * 1.8 + p.phase), 3) * .65;
      paint.globalAlpha = Math.max(0, fade * pulse);
      paint.fillStyle = '#f2dfac';
      paint.shadowColor = '#e5ce74';
      paint.shadowBlur = 8;
      const size = Math.max(1, Math.round(p.size * width / 1000));
      paint.fillRect(Math.round(p.x * width), Math.round(p.y * height), size, size);
    }
    paint.globalAlpha = 1;
    paint.shadowBlur = 0;
  }
  function animate(now: number) {
    frame = 0;
    if (paused || !inView || document.hidden) { previous = 0; return; }
    if (previous && now - previous < 1000 / 30) { frame = requestAnimationFrame(animate); return; }
    const dt = previous ? Math.min((now - previous) / 1000, .07) : 0;
    previous = now;
    time += dt;
    gust *= Math.exp(-dt * 1.4);
    camera.x += ((pointer.active ? pointer.x : .5) - camera.x) * Math.min(1, dt * 2.4);
    camera.y += ((pointer.active ? pointer.y : .5) - camera.y) * Math.min(1, dt * 2.4);
    drawScene();
    drawFireflies(dt);
    frame = requestAnimationFrame(animate);
  }
  function updateMotion() {
    if (paused || !inView || document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      if (paused) {
        canvas.classList.remove('ready');
        paint?.clearRect(0, 0, atmosphere.width, atmosphere.height);
      }
    } else if (!frame) frame = requestAnimationFrame(animate);
  }
  function stir(x: number, y: number) {
    if (paused) return;
    gust = 1;
    ripple = { x: (x - .5) * cover.x + .5, y: (y - .5) * cover.y + .5, time };
    for (let i = 0; i < 14 && fireflies.length < 80; i++) fireflies.push(makeFirefly(x + (Math.random() - .5) * .08, y + (Math.random() - .5) * .06, true));
  }
  function locate(event: PointerEvent) {
    const bounds = landscape.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) };
  }
  landscape.addEventListener('pointermove', event => {
    if (paused || event.pointerType === 'touch') return;
    const next = locate(event);
    if (pointer.active) gust = Math.min(.65, gust + Math.hypot(next.x - pointer.x, next.y - pointer.y) * 1.5);
    Object.assign(pointer, next, { active: true });
  });
  landscape.addEventListener('pointerleave', () => { pointer.active = false; });
  let touchStart = { x: 0, y: 0 };
  landscape.addEventListener('pointerdown', event => { touchStart = { x: event.clientX, y: event.clientY }; });
  landscape.addEventListener('pointerup', event => {
    if (Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) > 14) return;
    const p = locate(event);
    stir(p.x, p.y);
  });
  landscape.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    stir(.55, .65);
  });
  reduceMotion.addEventListener('change', event => { paused = event.matches; updateMotion(); });
  document.addEventListener('visibilitychange', updateMotion);
  const visibility = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; updateMotion(); }, { rootMargin: '60px' });
  visibility.observe(landscape);
  const dimensions = new ResizeObserver(resize);
  dimensions.observe(landscape);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    renderer = null;
    textureReady = false;
    canvas.classList.remove('ready');
  });
  canvas.addEventListener('webglcontextrestored', () => { renderer = createRenderer(canvas); void loadTexture(); });
  landscape.tabIndex = 0;
  landscape.setAttribute('aria-label', 'Blue-hour garden. Move your pointer to gather fireflies, or press Enter to wake them.');
  void loadTexture();
  updateMotion();
}

document.querySelectorAll<HTMLElement>('garden-scene').forEach(initGarden);
