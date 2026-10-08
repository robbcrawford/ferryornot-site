/* The hero phone as a real, lit 3D object (three.js, self-hosted, no requests elsewhere).
   The flat CSS phone in the page stays as the fallback: no WebGL, a slow load, or an
   error simply leaves it in place. When the 3D one is ready it takes the flat one's
   exact pose, cross-fades in, then turns to show its titanium edge. */
import * as THREE from './vendor/three/three.module.min.js';
import { RoomEnvironment } from './vendor/three/RoomEnvironment.js';

const tilt = document.getElementById('tilt');
const flat = tilt && tilt.querySelector('.device');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webgl() {
  try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch (e) { return false; }
}

// iPhone Pro Max proportions, in millimetres.
const W = 77.6, H = 163, D = 8.25, R = 12.4, BEVEL = 1.6, BEZEL = 2.1;
// The canvas overhangs the flat phone so the turned 3D one never clips.
const OVER_X = 0.4, OVER_Y = 0.1;

// A rounded rectangle made of true arcs.
function arcRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
function planarUV(geo) {   // map a flat shape's x/y straight onto 0..1 texture space
  geo.computeBoundingBox();
  const b = geo.boundingBox, p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / (b.max.x - b.min.x), (p.getY(i) - b.min.y) / (b.max.y - b.min.y));
  uv.needsUpdate = true;
}

async function start() {
  if (!tilt || !flat || !webgl()) return;
  const src = tilt.getAttribute('data-hd');
  if (!src) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'phone-gl';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentRotation = new THREE.Euler(0, 0.6, 0);
  // Moonlight from the upper right (where the moon sits), a cool fill from the left.
  const key = new THREE.DirectionalLight(0xF6DFA8, 2.2); key.position.set(80, 120, 90); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7FA0FF, 1.4); rim.position.set(-120, 20, -40); scene.add(rim);

  const camera = new THREE.PerspectiveCamera(26, 1, 10, 2000);

  const tex = await new THREE.TextureLoader().loadAsync(src);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const titanium = new THREE.MeshPhysicalMaterial({ color: 0x8A8C92, metalness: 1, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.2 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x030405, metalness: 0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03 });
  const screen = new THREE.MeshPhysicalMaterial({
    color: 0x000000, emissive: 0xffffff, emissiveMap: tex, roughness: 0.08, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.55, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
  });
  const black = new THREE.MeshBasicMaterial({ color: 0x000000, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

  const phone = new THREE.Group();
  const body = new THREE.ExtrudeGeometry(arcRect(W - 2 * BEVEL, H - 2 * BEVEL, R - BEVEL), {
    depth: D - 2 * BEVEL, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 8, curveSegments: 40
  });
  body.translate(0, 0, -(D - 2 * BEVEL) / 2);
  phone.add(new THREE.Mesh(body, [glass, titanium]));

  const front = D / 2;
  const scr = new THREE.ShapeGeometry(arcRect(W - 2 * BEZEL, H - 2 * BEZEL, R - BEZEL), 40);
  planarUV(scr);
  const scrMesh = new THREE.Mesh(scr, screen); scrMesh.position.z = front + 0.03; phone.add(scrMesh);

  const island = new THREE.Mesh(new THREE.ShapeGeometry(arcRect(21, 6.2, 3.1), 24), black);
  island.position.set(0, H / 2 - BEZEL - 5.4, front + 0.06); phone.add(island);

  // Side buttons: action + volume on the left, side button and Camera Control on the right.
  function button(x, y, len) {
    const g = new THREE.CapsuleGeometry(0.95, len, 6, 16);
    const m = new THREE.Mesh(g, titanium); m.scale.set(0.55, 1, 1); m.position.set(x, y, 0); phone.add(m);
  }
  const sx = W / 2 + 0.15;
  button(-sx, 47, 5); button(-sx, 31, 11); button(-sx, 16, 11);
  button(sx, 28, 17); button(sx, -22, 9);

  // The back, for anyone who spins it round: frosted glass, the camera plateau, a wordmark.
  // Seen from behind, the camera sits top left, which is +x in the phone's own space.
  const backGlass = new THREE.MeshPhysicalMaterial({ color: 0x2B2E35, metalness: 0.1, roughness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.45 });
  const lensGlass = new THREE.MeshPhysicalMaterial({ color: 0x05070A, metalness: 0, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 });
  const lensCore = new THREE.MeshPhysicalMaterial({ color: 0x0E2236, metalness: 0.2, roughness: 0.1, clearcoat: 1 });
  const ring = new THREE.MeshPhysicalMaterial({ color: 0x55585F, metalness: 1, roughness: 0.25 });
  const back = -D / 2;
  const plate = new THREE.Mesh(new THREE.ShapeGeometry(arcRect(W - 2 * BEVEL - 1.2, H - 2 * BEVEL - 1.2, R - BEVEL - 0.6), 40), backGlass);
  plate.rotation.y = Math.PI; plate.position.z = back - 0.03; phone.add(plate);

  const cx = W / 2 - 21.5, cy = H / 2 - 22.5;
  const bump = new THREE.Mesh(new THREE.ExtrudeGeometry(arcRect(36, 38, 9.5), {
    depth: 0.8, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 4, curveSegments: 24
  }), backGlass);
  bump.rotation.y = Math.PI; bump.position.set(cx, cy, back); phone.add(bump);
  const bumpTop = back - 1.3;
  function disc(x, y, r, h, mat) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), mat);
    m.rotation.x = Math.PI / 2; m.position.set(x, y, bumpTop - h / 2 + 0.2); phone.add(m);
  }
  [[cx + 8.2, cy + 8.8], [cx + 8.2, cy - 8.8], [cx - 8.2, cy]].forEach(([x, y]) => {
    disc(x, y, 6.4, 1.6, ring); disc(x, y, 5.0, 1.8, lensGlass); disc(x, y, 2.1, 1.9, lensCore);
  });
  disc(cx - 8.2, cy + 11.5, 2.0, 0.6, new THREE.MeshStandardMaterial({ color: 0xE9E2C8, roughness: 0.4 }));
  disc(cx - 8.2, cy - 11.5, 2.2, 0.6, lensGlass);

  new THREE.TextureLoader().load('wordmark-dark.png', (wm) => {
    wm.colorSpace = THREE.SRGBColorSpace; wm.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(34, 34 * 325 / 1836),
      new THREE.MeshStandardMaterial({ map: wm, transparent: true, color: 0xE8DDC4, metalness: 0.3, roughness: 0.35 }));
    mark.rotation.y = Math.PI; mark.position.set(0, -14, back - 0.06); phone.add(mark);
  });

  scene.add(phone);

  function size() {
    const fw = flat.offsetWidth, fh = flat.offsetHeight;
    const cw = fw * (1 + 2 * OVER_X), ch = fh * (1 + 2 * OVER_Y);
    renderer.setSize(cw, ch, false);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    canvas.style.left = (-OVER_X * fw) + 'px'; canvas.style.top = (-OVER_Y * fh) + 'px';
    camera.aspect = cw / ch;
    // At rest the 3D phone is exactly as tall as the flat one it replaces.
    const visH = H * (1 + 2 * OVER_Y);
    camera.position.set(0, 0, (visH / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.updateProjectionMatrix();
  }
  size();
  tilt.appendChild(canvas);

  // Pose: start where the flat phone sits (rotateY -8°, rotateX 2°), then settle into a
  // three-quarter turn that shows the edge. The pointer leans it; scrolling turns it away.
  const deg = THREE.MathUtils.degToRad;
  const cur = { y: deg(-8), x: deg(2) };
  const BASE = { y: deg(-24), x: deg(6) };
  let px = 0, py = 0, scrollP = 0;
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
      px = e.clientX / window.innerWidth - 0.5; py = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }
  const hero = tilt.closest('section');
  function onScroll() { scrollP = hero ? Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight || 1))) : 0; }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Easter egg: grab the phone and fling it. It spins on its own vertical axis, slows
  // down, then always comes back round to face you.
  let spin = 0, spinVel = 0, dragging = false, lastX = 0, lastT = 0;
  tilt.addEventListener('pointerdown', (e) => {
    if (!tilt.classList.contains('has3d') || reduce) return;
    dragging = true; lastX = e.clientX; lastT = performance.now(); spinVel = 0;
    tilt.setPointerCapture(e.pointerId); tilt.classList.add('spinning');
  });
  tilt.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now(), dx = e.clientX - lastX, d = dx * 0.011;
    spin += d;
    spinVel = 0.5 * spinVel + 0.5 * (d / Math.max(0.008, (now - lastT) / 1000));
    lastX = e.clientX; lastT = now;
  });
  function release() {
    if (!dragging) return;
    dragging = false; tilt.classList.remove('spinning');
    if (performance.now() - lastT > 80) spinVel = 0;   // held still before letting go
    spinVel = Math.max(-28, Math.min(28, spinVel));
  }
  tilt.addEventListener('pointerup', release);
  tilt.addEventListener('pointercancel', release);
  tilt.addEventListener('dragstart', (e) => e.preventDefault());

  function spinStep(dt) {
    if (dragging) return;
    spin += spinVel * dt;
    if (Math.abs(spinVel) > 1.2) { spinVel *= Math.exp(-dt * 0.9); return; }
    // Slow enough: ease round to the nearest whole turn, screen to the front.
    spinVel *= Math.exp(-dt * 4);
    const home = Math.round(spin / (Math.PI * 2)) * Math.PI * 2;
    spin += (home - spin) * (1 - Math.exp(-dt * 2.6));
  }

  function pose(t, k) {
    const ty = BASE.y + px * deg(28) + Math.sin(t * 0.42) * deg(4) + scrollP * deg(30);
    const tx = BASE.x + py * deg(16) + Math.sin(t * 0.31 + 1) * deg(2) + scrollP * deg(18);
    cur.y += (ty - cur.y) * k; cur.x += (tx - cur.x) * k;
    phone.rotation.set(cur.x, cur.y + spin, 0);
    phone.position.y = Math.sin(t * 0.8) * 2.2 + scrollP * 14;
  }

  if (reduce) {   // one still frame in the resting pose, no movement
    cur.y = BASE.y; cur.x = BASE.x; phone.rotation.set(cur.x, cur.y, 0);
    renderer.render(scene, camera);
    tilt.classList.add('has3d');
    window.addEventListener('resize', () => { size(); renderer.render(scene, camera); });
    return;
  }

  // Swap only after the flat phone's own entrance has finished, so the hand-off is invisible.
  const entranceDone = 2400 - performance.now();
  await new Promise((res) => setTimeout(res, Math.max(0, entranceDone)));
  phone.rotation.set(cur.x, cur.y, 0);
  renderer.render(scene, camera);
  tilt.classList.add('has3d');

  let running = true, last = performance.now(), t0 = last;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // Slow at first so the turn from flat to three-quarter reads as one deliberate move.
    const settle = Math.min(1, (now - t0) / 2200);
    spinStep(dt);
    pose((now - t0) / 1000, 1 - Math.exp(-dt * (1.2 + 3 * settle)));
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  new IntersectionObserver((en) => {
    const on = en[0].isIntersecting;
    if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    if (!on) running = false;
  }).observe(tilt);
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 100); });
}

start().catch((e) => { console.warn('3D phone unavailable, keeping the flat one', e); });
