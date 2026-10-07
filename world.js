import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import * as S from './site.js';

// ---------- базовая сцена ----------
const W = S.PLOT.w, H = S.PLOT.h;
// план (x вправо, y вниз) → мир (x, высота, z), центр участка в нуле
const P = (x, y, up = 0) => new THREE.Vector3(x - W / 2, up, y - H / 2);
const toPlan = (v) => [v.x + W / 2, v.z + H / 2];

const stage = document.getElementById('worldStage');
const mount = document.getElementById('worldMount');
const navEl = document.querySelector('.nav');
const wideMQ = matchMedia('(min-width: 961px)');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: location.search.includes('debug') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(mount.clientWidth || 800, mount.clientHeight || 600);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
mount.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(mount.clientWidth || 800, mount.clientHeight || 600);
labelRenderer.domElement.className = 'labels';
mount.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const VIEW = 46;
const camera = new THREE.OrthographicCamera(-40, 40, 23, -23, -200, 400);
camera.position.set(18, 60, 62);
camera.zoom = 1.0;
camera.updateProjectionMatrix();

const controls = new OrbitControls(camera, labelRenderer.domElement);
controls.target.set(-5, 0, 2);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.42;
controls.minPolarAngle = Math.PI * 0.18;
controls.enableZoom = false;       // колесо не должно перехватывать прокрутку страницы
controls.enablePan = false;
controls.rotateSpeed = 0.6;
controls.update();
{ // горизонтальный разворот ограничен вокруг исходного ракурса
  const az = controls.getAzimuthalAngle();
  controls.minAzimuthAngle = az - 0.7; controls.maxAzimuthAngle = az + 0.7;
}
controls.enabled = false;                       // сцена не вращается: ракурс задан
labelRenderer.domElement.style.touchAction = 'auto';   // страница листается как обычно
// кадр: на десктопе сцена занимает правую часть сцены-сцены, слева — текст
function fit() {
  const w = mount.clientWidth || 800, h = mount.clientHeight || 600;
  const frac = wideMQ.matches ? 0.54 : 1;
  const a = w / h;
  let visW = 56 / 1.2 / frac;   // сцена крупнее на 20%                       // метров по ширине кадра
  let visH = visW / a;
  if (visH < 28) { visH = 28; visW = visH * a; }
  const s = (1 - frac) / 2 * visW;            // сдвиг: центр сцены — в центре правой части
  camera.left = -visW / 2 - s; camera.right = visW / 2 - s;
  const vs = (wideMQ.matches ? 0.08 : 0.02) * visH;   // сцена чуть ниже центра
  camera.top = visH / 2 + vs; camera.bottom = -visH / 2 + vs;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h); labelRenderer.setSize(w, h);
}
window.__world = { camera, controls }; // для отладки из консоли
queueMicrotask(() => Object.assign(window.__world, { movers, gate, ownCar, cams }));

const hemi = new THREE.HemisphereLight(0xffffff, 0xcfd6c4, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.left = -45; sun.shadow.camera.right = 45;
sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 200;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...extra });
// палитра снята с фотографий участка
const M = {
  ground: mat(0xeceee8), plot: mat(0xd6dcb8),
  lane: mat(0xb3ab9c), white: mat(0xffffff),
  houseDark: mat(0x3b2a23), roof: mat(0x2f2420), cedar: mat(0xc98a55), door: mat(0x2a1d18), shedRoof: mat(0x5b3427),
  snow: mat(0xf7f9fb),
  glass: new THREE.MeshStandardMaterial({ color: 0x27323b, roughness: 0.2, metalness: 0.3, emissive: 0xffc46b, emissiveIntensity: 0 }),
  window: new THREE.MeshStandardMaterial({ color: 0x8fa3b3, roughness: 0.3, emissive: 0xffc46b, emissiveIntensity: 0 }),
  deck: mat(0xb9784a), deckDark: mat(0x5b4030), oldWood: mat(0x57524c), lightWood: mat(0xb48d62),
  bedWood: mat(0x4e3d33), profnastil: mat(0x5b3427), picket: mat(0x7a4a34),
  dark: mat(0x2b2e33), stone: mat(0xa9a59c), gravel: mat(0xc2bcb0), mulch: mat(0x8a5a36),
  water: mat(0x3f6f8c, { roughness: 0.15, metalness: 0.2 }), ice: mat(0xdce9f1, { roughness: 0.35 }), soil: mat(0x6b5140),
  spruce: mat(0x2c5f3c), pine: mat(0x4a7d45), oak: mat(0xd2a63a), larch: mat(0xc9b44a),
  trunk: mat(0x5e4331), reed: mat(0xb8b46a), lily: mat(0x5d8a45), plant: mat(0x6f9a4a),
  lounger: mat(0x9fd04a), metal: mat(0x9aa0a6),
  fire: new THREE.MeshStandardMaterial({ color: 0xff5a2a, emissive: 0xff4a1a, emissiveIntensity: 1.5 }),
  bulb: new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xffc46b, emissiveIntensity: 0 }),
};

function add(mesh, shadows = true, parent = scene) {
  mesh.castShadow = shadows; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
function box(w, h, d, m, x, y, z, rotY = 0) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.copy(P(x, y, z + h / 2)); b.rotation.y = rotY;
  return add(b);
}
function disc(r, h, m, x, y, z = 0, seg = 40) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);
  c.position.copy(P(x, y, z + h / 2));
  return add(c, h > 0.3);
}
// стенка/доска вдоль отрезка плана
function along(x1, y1, x2, y2, h, t, m, base = 0, off = 0) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const nx = (y2 - y1) / len, ny = -(x2 - x1) / len;
  return box(len, h, t, m, (x1 + x2) / 2 + nx * off, (y1 + y2) / 2 + ny * off, base, -Math.atan2(y2 - y1, x2 - x1));
}
// многоугольник плана → призма
function prism(points, height, m, base = 0) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x - W / 2, -(y - H / 2))));
  const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.y = base;
  return add(mesh);
}
// многоугольник с наклонным верхом: hf(x, y) — высота точки.
// walls=true — стены от земли до hf; иначе — плита толщиной t поверх hf
function sloped(points, hf, t, m, walls = false) {
  const pos = [];
  const v = (x, y, z) => { const p = P(x, y, z); pos.push(p.x, p.y, p.z); };
  const n = points.length;
  if (walls) {
    for (let i = 0; i < n; i++) {
      const [x1, y1] = points[i], [x2, y2] = points[(i + 1) % n];
      v(x1, y1, 0); v(x2, y2, 0); v(x2, y2, hf(x2, y2));
      v(x1, y1, 0); v(x2, y2, hf(x2, y2)); v(x1, y1, hf(x1, y1));
    }
  } else {
    const tris = THREE.ShapeUtils.triangulateShape(points.map(([x, y]) => new THREE.Vector2(x, y)), []);
    for (const [a, b, c] of tris) for (const dz of [0, t]) for (const k of [a, b, c]) v(points[k][0], points[k][1], hf(...points[k]) + dz);
    for (let i = 0; i < n; i++) {
      const [x1, y1] = points[i], [x2, y2] = points[(i + 1) % n];
      v(x1, y1, hf(x1, y1)); v(x2, y2, hf(x2, y2)); v(x2, y2, hf(x2, y2) + t);
      v(x1, y1, hf(x1, y1)); v(x2, y2, hf(x2, y2) + t); v(x1, y1, hf(x1, y1) + t);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  m.side = THREE.DoubleSide;   // обход вершин не выравниваем — рисуем обе стороны
  return add(new THREE.Mesh(g, m));
}
// профиль в разрезе (u — к югу, v — вверх), вытянутый на ширину w с востока на запад
function profile(uv, w, m, x, y) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(uv.map(([u, v]) => new THREE.Vector2(u, v))), { depth: w, bevelEnabled: false });
  g.rotateY(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.copy(P(x + w, y));
  return add(mesh);
}
// наружная нормаль ребра многоугольника
function outward(pts, i, j) {
  const [x1, y1] = pts[i], [x2, y2] = pts[j];
  const len = Math.hypot(x2 - x1, y2 - y1);
  let nx = (y2 - y1) / len, ny = -(x2 - x1) / len;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  if (((x1 + x2) / 2 - cx) * nx + ((y1 + y2) / 2 - cy) * ny < 0) { nx = -nx; ny = -ny; }
  return { x1, y1, x2, y2, len, nx, ny, dx: (x2 - x1) / len, dy: (y2 - y1) / len };
}
// плоскость на стене ребра: f — доля вдоль ребра (центр), w×h, низ на base
function onWall(e, f, w, h, base, m, off = 0.03) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  p.position.copy(P(e.x1 + (e.x2 - e.x1) * f + e.nx * off, e.y1 + (e.y2 - e.y1) * f + e.ny * off, base + h / 2));
  p.rotation.y = Math.atan2(e.nx, e.ny);
  p.receiveShadow = true; scene.add(p); return p;
}
// много одинаковых мешей одним вызовом: items — [{x, y, z, ry, sx, sy, sz, color}]
function instanced(geom, m, items, shadows = true) {
  const im = new THREE.InstancedMesh(geom, m, items.length);
  const o = new THREE.Object3D(), c = new THREE.Color();
  items.forEach((it, i) => {
    o.position.copy(P(it.x, it.y, it.z || 0));
    o.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
    o.scale.set(it.sx || 1, it.sy || 1, it.sz || 1);
    o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    if (it.color !== undefined) im.setColorAt(i, c.set(it.color));
  });
  im.castShadow = shadows; im.receiveShadow = true;
  scene.add(im); return im;
}
const rnd = (a, b) => a + Math.random() * (b - a);
const ROCK = new THREE.IcosahedronGeometry(1, 0);
function rocks(list, size = [0.15, 0.3]) {
  return instanced(ROCK, M.stone, list.map(([x, y]) => {
    const s = rnd(...size);
    return { x, y, z: s * 0.4, sx: s, sy: s * 0.7, sz: s * rnd(0.8, 1.2), ry: rnd(0, 6), color: new THREE.Color(0xa9a59c).offsetHSL(0, 0, rnd(-0.08, 0.08)) };
  }));
}
function label(text, x, y, up, cls = '') {
  const el = document.createElement('div');
  el.className = 'label ' + cls; el.textContent = text;
  const o = new CSS2DObject(el); o.position.copy(P(x, y, up));
  scene.add(o); return o;
}
// гирлянда с лампочками между двумя точками [x, y, высота]
const bulbs = [];
function garland(a, b, n = 10, sag = 0.5) {
  const pts = [], items = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
    const h = a[2] + (b[2] - a[2]) * f - Math.sin(Math.PI * f) * sag;
    pts.push(P(x, y, h)); if (i > 0 && i < n) items.push({ x, y, z: h - 0.08 });
  }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x33363b }));
  scene.add(line);
  bulbs.push(instanced(new THREE.SphereGeometry(0.07, 6, 4), M.bulb, items, false));
}

// ---------- сезон ----------
// auto — по текущему месяцу; кнопка в панели переключает вручную
const SEASONS = ['auto', 'summer', 'autumn', 'winter'];
const SEASON_RU = { auto: 'авто', summer: 'лето', autumn: 'осень', winter: 'зима', spring: 'весна' };
let seasonMode = 'auto';
function season() {
  if (seasonMode !== 'auto') return seasonMode;
  const m = new Date().getMonth();
  return m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
}
const seasonal = []; // функции, которые перекрашивают сцену под сезон

// ---------- земля, дороги, заборы ----------
// концы дорог: верхняя от x0 до x1, боковая — от перекрёстка до y1; машины появляются и исчезают на концах
const ROAD = { x0: -3, x1: 62, y1: 32 };
{
  const g = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), M.ground);
  g.rotation.x = -Math.PI / 2; g.position.y = -0.02; g.receiveShadow = true; scene.add(g);
  const plot = new THREE.Mesh(new THREE.PlaneGeometry(W, H), M.plot);
  plot.rotation.x = -Math.PI / 2; plot.receiveShadow = true; scene.add(plot);

  // с севера — грунтовый проезд (видно с камеры «За воротами»), с востока — дорога
  // угловой участок: две сельские дороги без разметки, Т-перекрёсток в правом верхнем углу.
  // Верхняя, вдоль длинной стороны, — основная (чуть шире), правая уходит от неё на юг; на север дороги нет.
  // дороги — в длину участка вдоль забора, с небольшим запасом за перекрёсток
  box(ROAD.x1 - ROAD.x0, 0.03, 5.2, M.lane, (ROAD.x0 + ROAD.x1) / 2, -3.0, 0);
  box(4.6, 0.03, ROAD.y1 + 0.6, M.lane, 55.0, (ROAD.y1 - 0.6) / 2, 0);
  label('Дорога', 18, -3.0, 0.5, 'muted');
  label('Дорога', 55.0, 22, 0.5, 'muted');

  // северный забор — профнастил, кроме проёма ворот
  const fh = 2.0;
  for (const [x1, x2] of [[0, S.GATE.x], [S.GATE.x + S.GATE.w, W]]) {
    box(x2 - x1, fh, 0.05, M.profnastil, (x1 + x2) / 2, 0, 0);
    const ribs = [];
    for (let x = x1 + 0.1; x < x2; x += 0.2) ribs.push({ x, y: 0.05, z: fh / 2 });
    instanced(new THREE.BoxGeometry(0.05, fh, 0.04), M.profnastil, ribs, false);
  }
  // остальные стороны и забор соседей через проезд — деревянный штакетник
  const pickets = [];
  const run = (x1, y1, x2, y2) => {
    const len = Math.hypot(x2 - x1, y2 - y1), ry = -Math.atan2(y2 - y1, x2 - x1);
    for (let d = 0.07; d < len; d += 0.15) pickets.push({ x: x1 + (x2 - x1) * d / len, y: y1 + (y2 - y1) * d / len, z: 0.9, ry, color: new THREE.Color(0x6e4330).offsetHSL(0, 0, rnd(-0.03, 0.03)) });
    along(x1, y1, x2, y2, 0.08, 0.05, M.picket, 0.4, 0.04);
    along(x1, y1, x2, y2, 0.08, 0.05, M.picket, 1.4, 0.04);
  };
  run(0, H, W, H); run(0, 0, 0, H); run(W, 0, W, H);
  instanced(new THREE.BoxGeometry(0.11, 1.8, 0.025), M.picket, pickets);
}

// ---------- дом ----------
const vineLeaves = [];
{
  const pts = S.HOUSE.outline;
  const edge = (i, j) => outward(pts, i, j);
  const yMin = Math.min(...pts.map(p => p[1])), yMax = Math.max(...pts.map(p => p[1]));
  // односкатная кровля: ниже всего у дороги (север, малый y), выше у террасы
  const hf = (x, y) => S.HOUSE.hLow + (S.HOUSE.hHigh - S.HOUSE.hLow) * (y - yMin) / (yMax - yMin);

  sloped(pts, hf, 0, M.houseDark, true);                       // стены до ската
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const eave = pts.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy); return [x + (x - cx) / d * 0.35, y + (y - cy) / d * 0.35]; });
  sloped(eave, hf, 0.3, M.roof);                               // кровля со свесом
  // навес над крыльцом продолжает тот же скат
  for (const [i, j] of S.HOUSE.porchEdges) {
    const e = edge(i, j), o = 1.6;
    sloped([[e.x1, e.y1], [e.x2, e.y2], [e.x2 + e.nx * o, e.y2 + e.ny * o], [e.x1 + e.nx * o, e.y1 + e.ny * o]], hf, 0.3, M.roof);
    onWall(e, 0.5, e.len - 0.1, Math.min(hf(e.x1, e.y1), hf(e.x2, e.y2)) - 0.05, 0, M.cedar, 0.02);   // светлое дерево под навесом
  }
  // панорамные окна и дверь под навесом
  const g = edge(...S.HOUSE.glassEdge);
  for (let k = 0; k < 6; k++) onWall(g, 0.12 + k * 0.13, 0.95, 2.3, 0.45, M.glass);
  const porch = edge(...S.HOUSE.porchEdges[0]);
  onWall(porch, 0.42, 1.0, 2.1, 0.5, M.lightWood);
  for (const f of [0.15, 0.27, 0.62, 0.8]) onWall(porch, f, 0.6, 1.2, 1.2, M.window);
  // окна и дверь на задних и боковых стенах — по фото
  const holes = [];
  for (const o of S.HOUSE.openings) {
    const e = edge(...o.edge);
    onWall(e, o.f, o.w + 0.12, o.h + 0.12, o.base - 0.06, M.dark, 0.03);       // наличник
    onWall(e, o.f, o.w, o.h, o.base, o.door ? M.door : M.window, 0.045);
    holes.push({ e: o.edge.join(), f0: o.f - (o.w / 2 + 0.15) / e.len, f1: o.f + (o.w / 2 + 0.15) / e.len, z0: o.base - 0.15, z1: o.base + o.h + 0.15 });
  }
  // девичий виноград на северных стенах: сотни листьев, цвет — по сезону; проёмы оставляем открытыми
  const leaf = new THREE.PlaneGeometry(0.3, 0.3);
  const items = [];
  for (const [i, j] of S.HOUSE.vineEdges) {
    const e = edge(i, j);
    for (let k = 0; k < e.len * 40; k++) {
      const f = Math.random();
      const top = hf(e.x1 + (e.x2 - e.x1) * f, e.y1 + (e.y2 - e.y1) * f) + 0.3;
      const z = Math.pow(Math.random(), 0.6) * top;
      if (holes.some(hh => hh.e === `${i},${j}` && f > hh.f0 && f < hh.f1 && z > hh.z0 && z < hh.z1)) continue;
      const off = 0.06 + Math.random() * 0.12;
      items.push({ x: e.x1 + (e.x2 - e.x1) * f + e.nx * off, y: e.y1 + (e.y2 - e.y1) * f + e.ny * off, z, ry: Math.atan2(e.nx, e.ny) + rnd(-0.5, 0.5), rx: rnd(-0.4, 0.4), rz: rnd(0, 6), seed: Math.random() });
    }
  }
  const vine = instanced(leaf, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), items, false);
  const PAL = {
    spring: [0x9ccf5a, 0x86bf4a, 0xb4d872], summer: [0x4d7d32, 0x5f9139, 0x3f6b2b],
    autumn: [0xc8283a, 0xe0483a, 0xa3263f, 0xe39a2f, 0x8c2a4a], winter: [0x5a4a40],
  };
  seasonal.push((s) => {
    vine.visible = s !== 'winter';
    const pal = PAL[s], c = new THREE.Color();
    items.forEach((it, k) => vine.setColorAt(k, c.set(pal[Math.floor(it.seed * pal.length)])));
    vine.instanceColor.needsUpdate = true;
  });
  vineLeaves.push(vine);
  label('Дом', 14, 8, S.HOUSE.hHigh + 1.5);
}

// терраса на высоте 0,5 м, ступени, купель-бочка с печкой
{
  prism(S.TERRACE, 0.42, M.deckDark);
  prism(S.TERRACE, 0.08, M.deck, 0.42);
  const T = S.TERRACE;
  for (const s of S.STEPS) {
    // ближайшее ребро террасы — по нему разворачиваем ступени наружу
    let best = null;
    for (let i = 0; i < T.length; i++) {
      const e = outward(T, i, (i + 1) % T.length);
      const t = Math.max(0, Math.min(1, ((s.x - e.x1) * e.dx + (s.y - e.y1) * e.dy) / e.len));
      const d = Math.hypot(e.x1 + e.dx * e.len * t - s.x, e.y1 + e.dy * e.len * t - s.y);
      if (!best || d < best.d) best = { e, d, px: e.x1 + e.dx * e.len * t, py: e.y1 + e.dy * e.len * t };
    }
    // ступени примыкают к краю настила: считаем от точки на ребре, а не от отметки на плане
    const e = best.e;
    for (let k = 0; k < 3; k++) {
      const o = 0.16 + k * 0.3;
      box(s.w, 0.05, 0.3, M.deck, best.px + e.nx * o, best.py + e.ny * o, 0.37 - k * 0.13, -Math.atan2(e.dy, e.dx));
    }
  }
  const k = S.KUPEL;
  disc(k.r, 0.65, M.lightWood, k.x, k.y, 0);      // утоплена в террасу, над настилом только край
  for (const hz of [0.58]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(k.r + 0.01, 0.025, 4, 32), M.metal);
    ring.rotation.x = Math.PI / 2; ring.position.copy(P(k.x, k.y, hz)); scene.add(ring);
  }
  disc(k.r * 0.98, 0.04, M.dark, k.x, k.y, 0.65);
  box(0.45, 0.8, 0.45, M.dark, k.x - 1.2, k.y - 0.3, 0.5);
  disc(0.08, 2.4, M.dark, k.x - 1.2, k.y - 0.3, 1.3, 8);
  label('Купель', k.x, k.y, 1.6);
}

// пруд: круглый, камни по краю; северная половина (к забору) заросла камышом и травой, зимой — лёд
{
  const p = S.POND;
  const water = disc(p.r, 0.03, M.water, p.x, p.y, 0.02, 48);
  const rim = [];
  for (let a = 0; a < Math.PI * 2; a += 0.13) rim.push([p.x + Math.cos(a) * (p.r + 0.15), p.y + Math.sin(a) * (p.r + 0.15)]);
  rocks(rim, [0.16, 0.28]);
  // sin(a) < 0 — северная половина
  const reeds = [], tufts = [];
  for (let k = 0; k < 90; k++) {
    const a = rnd(Math.PI * 1.05, Math.PI * 1.95), r = p.r * rnd(0.8, 1.12);
    reeds.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, z: 0.7, sy: rnd(0.7, 1.6), rx: rnd(-0.15, 0.15), rz: rnd(-0.15, 0.15) });
  }
  for (let k = 0; k < 14; k++) {
    const a = rnd(Math.PI * 1.0, Math.PI * 2.0), r = p.r * rnd(1.0, 1.2);
    tufts.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, z: 0.2, sx: rnd(0.3, 0.5), sy: rnd(0.25, 0.4), sz: rnd(0.3, 0.5) });
  }
  instanced(new THREE.ConeGeometry(0.05, 1.4, 4), M.reed, reeds);
  instanced(ROCK, M.plant, tufts);
  const pads = [];
  for (let k = 0; k < 6; k++) { const a = rnd(Math.PI * 1.1, Math.PI * 1.9), r = rnd(0.45, 0.75) * p.r; pads.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, z: 0.06, sx: rnd(0.6, 1), sz: rnd(0.6, 1) }); }
  const lily = instanced(new THREE.CylinderGeometry(0.35, 0.35, 0.02, 10), M.lily, pads, false);
  seasonal.push((se) => {
    lily.visible = se === 'summer' || se === 'autumn';
    water.material = se === 'winter' ? M.ice : M.water;
  });
  label('Пруд', p.x, p.y, 1);
}

// дровник: стенки из серых досок внахлёст, открыт на юг, внутри поленница
{
  const d = S.WOODSHED, slats = [];
  const wall = (x1, y1, x2, y2) => {
    const len = Math.hypot(x2 - x1, y2 - y1), ry = -Math.atan2(y2 - y1, x2 - x1);
    for (let z = 0.15; z < d.h; z += 0.24) slats.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, z, ry, sx: len, rx: 0.25 });
  };
  wall(d.x, d.y + 0.15, d.x + d.w, d.y + 0.15);
  wall(d.x + 0.05, d.y, d.x + 0.05, d.y + d.d);
  wall(d.x + d.w - 0.05, d.y, d.x + d.w - 0.05, d.y + d.d);
  instanced(new THREE.BoxGeometry(1, 0.2, 0.04), M.oldWood, slats);
  box(0.12, d.h, 0.12, M.oldWood, d.x + 0.06, d.y + d.d, 0);
  box(0.12, d.h, 0.12, M.oldWood, d.x + d.w - 0.06, d.y + d.d, 0);
  const roof = box(d.w + 0.5, 0.08, d.d + 0.9, M.shedRoof, d.x + d.w / 2, d.y + d.d / 2, d.h + 0.2);
  roof.rotation.x = -0.14;   // скат к дороге
  const logs = [], g = new THREE.CylinderGeometry(0.09, 0.09, 1.2, 6);
  g.rotateX(Math.PI / 2);
  for (let x = d.x + 0.3; x < d.x + d.w - 0.3; x += 0.19) for (let z = 0.15; z < 1.9; z += 0.17)
    logs.push({ x: x + (Math.round(z / 0.17) % 2) * 0.09, y: d.y + 1.2, z, color: new THREE.Color(0xc9a06a).offsetHSL(0, rnd(-0.05, 0.05), rnd(-0.1, 0.05)) });
  instanced(g, mat(0xffffff), logs);
  label('Дровник', d.x + d.w / 2, d.y + d.d / 2, d.h + 1);
}

// парковка: гравий, камни по краю, гирлянды
{
  const p = S.PARKING;
  box(p.w, 0.03, p.d, M.gravel, p.x + p.w / 2, p.y + p.d / 2, 0);
  const edge = [];
  for (let y = p.y + 3.5; y < p.y + p.d; y += 0.45) {   // камни по обеим сторонам парковки
    edge.push([p.x + rnd(0.1, 0.3), y]);
    edge.push([p.x + p.w - rnd(0.1, 0.3), y]);
  }
  rocks(edge, [0.2, 0.4]);
  garland([p.x + 0.3, 3, 2.4], [p.x + p.w - 0.3, 12.5, 2.6], 14, 0.6);
  garland([p.x + 0.3, 8.5, 2.3], [p.x + p.w - 0.3, 4, 2.3], 10, 0.5);
  label('Парковка', p.x + p.w / 2, p.y + p.d / 2 + 1.5, 0.5);
}

// мастерская: односкатная крыша вниз к югу, фасад на север — светлое дерево и тёмные секционные ворота
{
  const w = S.WORKSHOP;
  profile([[0, 0], [w.d, 0], [w.d, 2.8], [0, w.h]], w.w, M.houseDark, w.x, w.y);
  const roof = box(w.w + 0.4, 0.15, w.d + 0.7, M.roof, w.x + w.w / 2, w.y + w.d / 2, (w.h + 2.8) / 2 - 0.02);
  roof.rotation.x = Math.atan2(w.h - 2.8, w.d);
  const front = { x1: w.x + w.w, y1: w.y, x2: w.x, y2: w.y, nx: 0, ny: -1 };
  onWall(front, 0.5, w.w, w.h - 0.05, 0, M.cedar, 0.02);
  onWall(front, 0.42, 2.4, 2.3, 0.05, M.dark, 0.04);                 // секционные ворота
  for (const f of [0.3, 0.55]) onWall(front, f, 1.1, 0.35, 2.75, M.window, 0.04);
  box(w.w, 0.15, 1.8, M.deckDark, w.x + w.w / 2, w.y - 0.95, 0);     // настил перед воротами
  const slats = [];
  for (let z = 0.2; z < 2.7; z += 0.22) slats.push({ x: w.x + w.w + 0.04, y: w.y + w.d - 1.6, z, sz: 3.0 });
  instanced(new THREE.BoxGeometry(0.04, 0.12, 1), M.lightWood, slats);
  label('Мастерская', w.x + w.w / 2, w.y + w.d / 2, w.h + 1);
}

// огород: настил и высокие грядки
{
  const g = S.GARDEN;
  box(g.w, 0.12, g.d, M.deckDark, g.x + g.w / 2, g.y + g.d / 2, 0);
  const plants = [];
  for (const cx of [g.x + 1.3, g.x + g.w - 1.3]) for (let r = 0; r < 3; r++) {
    const cy = g.y + 1.0 + r * 1.9;
    box(1.8, 0.45, 1.1, M.bedWood, cx, cy, 0.12);
    for (let k = 0; k < 5; k++) plants.push({ x: cx + rnd(-0.6, 0.6), y: cy + rnd(-0.3, 0.3), z: 0.7, sx: rnd(0.15, 0.3), sy: rnd(0.15, 0.35), sz: rnd(0.15, 0.3) });
  }
  instanced(ROCK, M.plant, plants);
  label('Огород', g.x + g.w / 2, g.y + g.d / 2, 1.2);
}

// TreeHouse: пирамидальный «шалаш» из реек на столбах вокруг ствола ели
{
  const t = S.TREEHOUSE, ry = -t.rot * Math.PI / 180;
  const grp = new THREE.Group();
  grp.position.copy(P(t.x, t.y)); grp.rotation.y = ry;
  const m = M.bedWood;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.1, 0.14), m);
    post.position.set(sx * 1.3, 1.05, sz * 1.3); grp.add(post);
  }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 2.8), M.deckDark); deck.position.y = 0.5; grp.add(deck);
  // рейки: квадратные рамки, сужающиеся кверху
  for (let k = 0; k < 11; k++) {
    const s = 3.4 * (1 - k / 11), y = 2.1 + k * 0.24;
    for (const [px, pz, w, d] of [[0, -s / 2, s, 0.05], [0, s / 2, s, 0.05], [-s / 2, 0, 0.05, s], [s / 2, 0, 0.05, s]]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.13, d), m); r.position.set(px, y, pz); grp.add(r);
    }
  }
  grp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(grp);
  label('TreeHouse', t.x, t.y, 5.2);
}

// FirePit: гравий, кольцо из валунов, пеньки, пергола с подвесными креслами-коконами.
// Всё чуть крупнее натуры, как и фигурки людей, — иначе на карте теряется; пергола выше фигурки.
const fireLight = new THREE.PointLight(0xff7a30, 0, 18, 1.5);
let fireMesh;
{
  const f = S.FIREPIT, PH = 3.9;   // высота перголы
  disc(f.r, 0.03, M.gravel, f.x, f.y);
  disc(1.1, 0.02, M.dark, f.x, f.y, 0.03);
  const ring = [];
  for (let a = 0; a < Math.PI * 2; a += 0.38) ring.push([f.x + Math.cos(a) * 1.25, f.y + Math.sin(a) * 1.25]);
  rocks(ring, [0.32, 0.42]);
  fireMesh = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 7), M.fire);
  fireMesh.position.copy(P(f.x, f.y, 0.7)); scene.add(fireMesh);
  fireLight.position.copy(P(f.x, f.y, 1.8)); scene.add(fireLight);
  for (const [dx, dy] of [[1.9, 1.3], [2.2, -0.5], [-2.2, 1.0], [0.5, 2.3]]) disc(0.32, 0.65, M.lightWood, f.x + dx, f.y + dy, 0, 12);

  const pg = S.PERGOLA;
  for (const [x, y] of pg) box(0.26, PH, 0.26, M.lightWood, x, y, 0);
  for (let i = 0; i < pg.length - 1; i++) {
    const [x1, y1] = pg[i], [x2, y2] = pg[i + 1], e = outward(pg, i, i + 1);
    along(x1, y1, x2, y2, 0.3, 0.18, M.lightWood, PH);
    const n = Math.floor(e.len / 0.5), rafters = [];
    for (let k = 0; k <= n; k++) rafters.push({ x: x1 + e.dx * e.len * k / n, y: y1 + e.dy * e.len * k / n, z: PH + 0.38, ry: -Math.atan2(e.dy, e.dx) + Math.PI / 2 });
    instanced(new THREE.BoxGeometry(1.3, 0.16, 0.07), M.lightWood, rafters);
    garland([x1, y1, PH - 0.05], [x2, y2, PH - 0.05], 8, 0.3);
  }
  // два кокона на задней балке
  const [bx1, by1] = pg[1], [bx2, by2] = pg[2];
  for (const fpos of [0.33, 0.67]) {
    const x = bx1 + (bx2 - bx1) * fpos, y = by1 + (by2 - by1) * fpos - 0.6;
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), new THREE.MeshBasicMaterial({ color: 0x2b2e33, wireframe: true }));
    egg.scale.set(1, 1.35, 1); egg.position.copy(P(x, y, 1.9)); scene.add(egg);
    disc(0.02, PH - 2.85, M.dark, x, y, 2.85, 4);
  }
  label('FirePit', f.x, f.y, PH + 1.2);

  // ShadowPit: мульча под большим дубом, два зелёных шезлонга, саженцы в горшках
  const s = S.SHADOWPIT;
  disc(s.r, 0.03, M.mulch, s.x, s.y);
  for (const [dx, dy, ry] of [[-1.2, 0.6, 0.4], [0.9, 1.0, -0.3]]) {
    const l = box(0.6, 0.06, 1.7, M.lounger, s.x + dx, s.y + dy, 0.3, ry);
    l.rotation.x = -0.15;
    const b = box(0.6, 0.7, 0.06, M.lounger, s.x + dx + Math.sin(ry) * 0.8, s.y + dy - Math.cos(ry) * 0.8, 0.3, ry);
    b.rotation.x = 0.5;
  }
  const saplings = [];
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2 + 0.4, x = s.x + Math.cos(a) * (s.r - 0.2), y = s.y + Math.sin(a) * (s.r - 0.2);
    disc(0.22, 0.35, M.dark, x, y, 0, 10);
    disc(0.025, 2.2, M.lightWood, x, y, 0.35, 4);
    saplings.push({ x, y, z: 2.1, sx: 0.5, sy: 0.4, sz: 0.5 });
  }
  const sap = instanced(ROCK, M.oak, saplings);
  seasonal.push((se) => { sap.visible = se !== 'winter'; });
  garland([s.x - 2.8, s.y - 2.2, 2.4], [s.x + 2.8, s.y - 1.4, 2.4], 10, 0.4);
  garland([s.x - 2.6, s.y + 2.2, 2.4], [s.x + 2.7, s.y + 1.8, 2.4], 10, 0.4);
  label('ShadowPit', s.x, s.y, 1.4);
}

// ---------- деревья ----------
// нижний край кроны ёлок — выше фишки человека (PAWN_H)
const SPRUCE_CLEARANCE = 3.8;
const treeSpots = [];
const oakCrowns = [];
const snowCaps = [];
for (const t of S.TREES) {
  const g = new THREE.Group();
  if (t.kind === 'spruce') {
    const h = Math.min(11, t.r * 2.6), first = t.open ? 1 : 0;   // у «открытых» нет нижнего яруса
    // крону поднимаем выше фишки человека, чтобы под ёлками было видно, кто ходит
    const lift = Math.max(0, SPRUCE_CLEARANCE - (h * 0.2 + first * h * 0.24));
    const base = h * 0.2 + first * h * 0.24 + lift;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, base + 0.6, 6), M.trunk);
    tr.position.y = (base + 0.6) / 2; g.add(tr);
    for (let i = first; i < 3; i++) {
      const cr = t.r * (1 - i * 0.27), ch = h * 0.45, y = h * 0.2 + i * h * 0.24 + lift + ch / 2;
      const c = new THREE.Mesh(new THREE.ConeGeometry(cr, ch, 8), M.spruce);
      c.position.y = y; g.add(c);
      // снежная шапка: верхняя часть яруса, зелёная бахрома остаётся снизу
      const cap = new THREE.Mesh(new THREE.ConeGeometry(cr * 0.78, ch * 0.78, 8), M.snow);
      cap.position.y = y + ch * 0.11 + 0.02; g.add(cap); snowCaps.push(cap);
    }
  } else if (t.kind === 'pine') {
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.6, 6), M.trunk); tr.position.y = 1.3; g.add(tr);
    for (const [ox, oy, s] of [[0, 2.8, 1], [0.35, 2.1, 0.6], [-0.3, 1.6, 0.55]]) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(t.r * s, 0), M.pine); c.position.set(ox, oy, 0); c.scale.y = 0.6; g.add(c);
    }
  } else {
    const h = t.h;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * h / 3, 0.22 * h / 3, h * 0.55, 6), M.trunk); tr.position.y = h * 0.275; g.add(tr);
    // ветки: видны зимой, летом прячутся в кроне
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2 + rnd(-0.3, 0.3), len = h * rnd(0.32, 0.45), tilt = rnd(0.6, 1.0);
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * h / 3, 0.07 * h / 3, len, 5), M.trunk);
      br.position.set(Math.cos(a) * Math.sin(tilt) * len / 2, h * rnd(0.45, 0.55) + Math.cos(tilt) * len / 2, Math.sin(a) * Math.sin(tilt) * len / 2);
      br.rotation.set(0, -a, 0); br.rotateZ(-tilt); g.add(br);
      for (let m = 0; m < 2; m++) {   // веточки второго порядка
        const l2 = len * 0.5, a2 = a + rnd(-0.8, 0.8);
        const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * h / 3, 0.03 * h / 3, l2, 4), M.trunk);
        const bx = Math.cos(a) * Math.sin(tilt) * len * 0.8, by = h * 0.5 + Math.cos(tilt) * len * 0.8, bz = Math.sin(a) * Math.sin(tilt) * len * 0.8;
        tw.position.set(bx + Math.cos(a2) * l2 * 0.35, by + l2 * 0.35, bz + Math.sin(a2) * l2 * 0.35);
        tw.rotation.set(0, -a2, 0); tw.rotateZ(-0.7); g.add(tw);
      }
    }
    for (const [ox, oy, oz, s] of [[0, 0.72, 0, 1], [0.45, 0.6, 0.2, 0.7], [-0.4, 0.62, -0.25, 0.75], [0.1, 0.85, -0.3, 0.6]]) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(t.r * 0.7 * s, 0), M.oak);
      c.position.set(ox * t.r, oy * h, oz * t.r); g.add(c); oakCrowns.push(c);
    }
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.copy(P(t.x, t.y)); g.rotation.y = Math.random() * Math.PI;
  scene.add(g);
  treeSpots.push(t);
}
// молодые лиственницы на подпорках между домом и кострищем
const larches = [];
for (const [x, y] of S.LARCHES) {
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.9, 7), M.larch);
  c.position.copy(P(x, y, 1.15)); c.castShadow = true; scene.add(c); larches.push(c);
  disc(0.02, 1.4, M.lightWood, x + 0.3, y, 0, 4);
}
seasonal.push((s) => {
  M.oak.color.set({ spring: 0x9ccf5a, summer: 0x6f9a3a, autumn: 0xd2a63a, winter: 0x6f9a3a }[s]);
  M.larch.color.set({ spring: 0xa7d36a, summer: 0x8cbf55, autumn: 0xc9b44a, winter: 0x8cbf55 }[s]);
  oakCrowns.forEach(c => c.visible = s !== 'winter');
  snowCaps.forEach(c => c.visible = s === 'winter');
  M.roof.color.set(s === 'winter' ? 0xeef2f5 : 0x2f2420);       // снег на кровле дома и мастерской
  M.shedRoof.color.set(s === 'winter' ? 0xeef2f5 : 0x5b3427);
  M.gravel.color.set(s === 'winter' ? 0xe8ecef : 0xc2bcb0);      // гравий и мульча под снегом
  M.mulch.color.set(s === 'winter' ? 0xe4e8eb : 0x8a5a36);
  larches.forEach(c => c.visible = s !== 'winter');
  M.plot.color.set({ spring: 0xd3e6b8, summer: 0xcfe0b4, autumn: 0xd6dcb8, winter: 0xf4f6f8 }[s]);
  M.ground.color.set(s === 'winter' ? 0xf0f2f4 : 0xeceee8);
  M.lane.color.set(s === 'winter' ? 0xe4e6e8 : 0xb3ab9c);
});

// ---------- откатные ворота ----------
const gate = { open: 0, target: 0 };
{
  const g = S.GATE;
  gate.panel = new THREE.Group();
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(g.w, 1.95, 0.06), M.profnastil);
  leaf.position.y = 1.05; leaf.castShadow = true; gate.panel.add(leaf);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(g.w + 1.5, 0.12, 0.1), M.dark);
  beam.position.set(-0.75, 0.06, 0); gate.panel.add(beam);
  scene.add(gate.panel);
  box(0.12, 2.1, 0.12, M.dark, g.x, 0, 0);
  box(0.12, 2.1, 0.12, M.dark, g.x + g.w, 0, 0);
  label('Ворота', g.x + g.w / 2, -0.5, 2.6);
}
function updateGate(dt) {
  gate.open += Math.sign(gate.target - gate.open) * Math.min(Math.abs(gate.target - gate.open), dt * 0.35);
  // полотно уезжает внутрь вдоль забора
  gate.panel.position.copy(P(S.GATE.x + S.GATE.w / 2 + gate.open * S.GATE.w * 0.92 * S.GATE.slide, 0.25));
}

// ---------- камеры и их секторы ----------
const cams = S.CAMERAS.map((c) => {
  const grp = new THREE.Group();
  const [mx, my] = [(c.a[0] + c.b[0]) / 2, (c.a[1] + c.b[1]) / 2];
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.34), M.white);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 12), M.dark);
  lens.rotation.x = Math.PI / 2; lens.position.z = 0.18;
  body.add(lens);
  body.position.copy(P(c.x, c.y, c.h));
  body.lookAt(P(mx, my, 0.8));
  grp.add(body);
  const shape = new THREE.Shape([[c.x, c.y], c.a, c.b].map(([x, y]) => new THREE.Vector2(x - W / 2, -(y - H / 2))));
  const fanMat = new THREE.MeshBasicMaterial({ color: 0xe2342b, transparent: true, opacity: 0.1, depthWrite: false });
  const fan = new THREE.Mesh(new THREE.ShapeGeometry(shape), fanMat);
  fan.rotation.x = -Math.PI / 2; fan.position.y = 0.07; grp.add(fan);
  const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[c.x, c.y], c.a, c.b].map(([x, y]) => P(x, y, 0.08))),
    new THREE.LineBasicMaterial({ color: 0xe2342b, transparent: true, opacity: 0.0 }));
  grp.add(outline);
  grp.visible = true;
  scene.add(grp);
  const lab = label(`${c.n} · ${c.name}`, c.x, c.y, c.h + 0.7, 'cam');
  return { ...c, grp, fanMat, lineMat: outline.material, lab, seen: false, glow: 0, inView: new Set() };
});
function inTri(px, py, [ax, ay], [bx, by], [cx, cy]) {
  const s = (x1, y1, x2, y2, x3, y3) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
  const d1 = s(px, py, ax, ay, bx, by), d2 = s(px, py, bx, by, cx, cy), d3 = s(px, py, cx, cy, ax, ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
const actors = new Set(); // { obj, kind }
function updateCams(dt) {
  for (const c of cams) {
    // каждого, кто вошёл в сектор, отмечаем отдельно — стоящая машина не заслоняет новых людей
    const now = new Set();
    for (const a of actors) {
      if (!a.obj.visible) continue;
      const [x, y] = toPlan(a.obj.position);
      if (inTri(x, y, [c.x, c.y], c.a, c.b)) { now.add(a); if (!c.inView.has(a)) emitEv('cam', { cam: c.name, kind: a.kind }); }
    }
    c.inView = now;
    c.seen = now.size > 0;
    c.glow += ((c.seen ? 1 : 0) - c.glow) * Math.min(1, dt * 4);
    c.fanMat.opacity = c.glow * 0.3; c.lineMat.opacity = c.glow * 0.6;
    c.lab.element.classList.toggle('active', c.seen);
  }
}

// ---------- актёры ----------
function makeCar(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.75, 4.6), mat(color)); body.position.y = 0.7; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.65, 2.6), mat(0x2f3338)); cab.position.set(0, 1.4, -0.3); g.add(cab);
  const wg = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 12); wg.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.88, 1.5], [0.88, 1.5], [-0.88, -1.5], [0.88, -1.5]]) {
    const w = new THREE.Mesh(wg, M.dark); w.position.set(x, 0.36, z); g.add(w);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(g); return g;
}
// Люди — игровые фигурки на подставке: в реальном масштабе (1,8 м) их на карте не разглядеть,
// поэтому фигурка ~3 м. Одноцветная, как фишка настольной игры; при ходьбе машет руками и ногами.
const PAWN_H = 3.0;
function makePerson(color) {
  const g = new THREE.Group();
  const body = new THREE.Group();   // покачивается внутри g, чтобы не сбивать позицию на маршруте
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.05 });
  const part = (geom, x, y, z, parent = body) => { const p = new THREE.Mesh(geom, m); p.position.set(x, y, z); parent.add(p); return p; };
  part(new THREE.CylinderGeometry(0.42, 0.45, 0.08, 24), 0, 0.04, 0, g);        // подставка не шагает
  const limb = (r, len, x, y) => {   // конечность на шарнире: вращается вокруг верхнего конца
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0); body.add(pivot);
    part(new THREE.CapsuleGeometry(r, len, 4, 10), 0, -len / 2 - r * 0.3, 0, pivot);
    return pivot;
  };
  const legL = limb(0.095, 0.55, -0.11, 0.82), legR = limb(0.095, 0.55, 0.11, 0.82);
  const torso = part(new THREE.CapsuleGeometry(0.2, 0.38, 4, 12), 0, 1.1, 0); torso.scale.set(1.05, 1, 0.72);
  const armL = limb(0.07, 0.42, -0.29, 1.34), armR = limb(0.07, 0.42, 0.29, 1.34);
  armL.rotation.z = -0.12; armR.rotation.z = 0.12;
  part(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 10), 0, 1.47, 0);          // шея
  part(new THREE.SphereGeometry(0.16, 18, 14), 0, 1.63, 0);                    // голова
  g.add(body);
  g.userData.walk = { body, legL, legR, armL, armR };
  g.scale.setScalar(PAWN_H / 1.8);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(g); return g;
}

// маршрут по точкам плана с постоянной скоростью
class Mover {
  constructor(obj, pts, speed, opts = {}) {
    this.obj = obj; this.speed = speed; this.t = 0; this.opts = opts;
    this.curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => P(x, y)), false, 'catmullrom', 0.2);
    this.len = this.curve.getLength(); this.done = false;
    this.place(0);
  }
  place(u) {
    const p = this.curve.getPointAt(u), tan = this.curve.getTangentAt(u);
    this.obj.position.copy(p);
    this.obj.rotation.y = Math.atan2(tan.x, tan.z);
  }
  step(dt) {
    if (this.done) return;
    if (this.opts.hold && this.opts.hold(this.t)) return;
    this.t = Math.min(1, this.t + this.speed * dt / this.len);
    this.place(this.t);
    if (this.opts.bob && this.obj.userData.walk) {
      // шаг ~1,2 м пути (с учётом крупной фигурки): ноги и руки в противофазе, лёгкое подпрыгивание
      const w = this.obj.userData.walk, ph = this.t >= 1 ? 0 : (this.t * this.len / 1.2) * Math.PI * 2;
      const sw = Math.sin(ph) * 0.55;
      w.legL.rotation.x = sw; w.legR.rotation.x = -sw;
      w.armL.rotation.x = -sw * 0.8; w.armR.rotation.x = sw * 0.8;
      w.body.position.y = Math.abs(Math.cos(ph)) * 0.05;
    }
    if (this.t >= 1) { this.done = true; this.opts.onDone && this.opts.onDone(); }
  }
}
const movers = new Set();
const run = (m) => { movers.add(m); return m; };
const actor = (obj, kind) => { const a = { obj, kind }; actors.add(a); return a; };
const drop = (obj) => { scene.remove(obj); for (const a of actors) if (a.obj === obj) actors.delete(a); };

const ownCar = makeCar(0xf2f2f0);  // белый кроссовер, как на камере «За воротами»
ownCar.visible = false;
actor(ownCar, 'own-car');
let carHome = false;
const carMoving = () => [...movers].some(m => m.obj === ownCar && !m.done);

function carArrives() {
  if (carHome || carMoving()) return;
  log('🚗 Машина подъезжает к воротам');
  ownCar.visible = true;
  run(new Mover(ownCar, [[ROAD.x0, -3.2], [30, -3.2], [37.5, -3.2], [43.1, -1.2], [43.1, 3], [43.1, 6.5]], 7, {
    hold: (t) => { if (t > 0.74 && gate.open < 0.97) { gate.target = 1; return true; } return false; },
    onDone: () => { carHome = true; gate.target = 0; log('🅿️ Машина на парковке, ворота закрываются'); },
  }));
}
function carLeaves() {
  if (!carHome || carMoving()) return;
  log('🚗 Машина выезжает');
  gate.target = 1; carHome = false;
  run(new Mover(ownCar, [[43.1, 6.5], [43.1, 3], [43.1, -1.2], [46.5, -3.0], [51, -3.0], [54.2, 1], [54.2, 20], [54.2, ROAD.y1]], 6, {
    hold: () => gate.open < 0.97,
    onDone: () => { ownCar.visible = false; gate.target = 0; log('Ворота закрываются'); },
  }));
}
function personLeaves() {
  log('🚶 Хозяин выходит из дома');
  const p = makePerson(0x3d8f6b);
  actor(p, 'owner');
  const path = [[11.5, 12.2], [15.6, 15.3], [15.4, 17.8], [21.5, 19.6], [27, 16.8], [31, 12.9], [36, 11.6], [40.6, 10.6], [42.6, 8.5], [44.8, 4], [44.8, -1], [46, -3], [51, -3], [ROAD.x1, -3]];
  run(new Mover(p, path, 1.4, {
    bob: true,
    hold: (t) => {
      if (t > 0.6 && t < 0.68 && gate.open < 0.35) { gate.target = 0.4; return true; }
      if (t > 0.78 && !carHome && !carMoving() && gate.target !== 0) gate.target = 0;
      if (t > 0.78 && carHome && gate.target !== 0) gate.target = 0;
      return false;
    },
    onDone: () => drop(p),
  }));
}
function guestArrives() {
  log('🧍 Кто-то идёт к воротам');
  const p = makePerson(0x7a7f87);
  actor(p, 'guest');
  run(new Mover(p, [[53.2, ROAD.y1], [53.2, 10], [52.5, -2.6], [46, -2.4], [44.3, -1.0]], 1.3, {
    bob: true,
    onDone: () => setTimeout(() => {
      run(new Mover(p, [[44.3, -1.0], [40, -2.8], [20, -2.8], [ROAD.x0, -2.8]], 1.3, { bob: true, onDone: () => drop(p) }));
    }, 6000),
  }));
}

// фон: машины по дороге, изредка — по проезду
function passingCar() {
  const c = makeCar([0xffffff, 0x3a3f46, 0x7d8a96, 0xc9b28a, 0x8a2f2a][Math.floor(Math.random() * 5)]);
  actor(c, 'passing');
  // основная дорога сверху — по ней едут чаще; боковая соединяется с ней Т-перекрёстком
  const routes = [
    [[ROAD.x0, -3.2], [ROAD.x1, -3.2]], [[ROAD.x1, -3.2], [ROAD.x0, -3.2]],     // по основной в обе стороны
    [[ROAD.x0, -3.2], [ROAD.x1, -3.2]], [[ROAD.x1, -3.2], [ROAD.x0, -3.2]],
    [[55.8, ROAD.y1], [55.8, 3], [52.5, -3.2], [30, -3.2], [ROAD.x0, -3.2]],  // с боковой налево, мимо ворот
    [[55.8, ROAD.y1], [55.8, 3], [59, -3.2], [ROAD.x1, -3.2]],               // с боковой направо
    [[ROAD.x0, -3.2], [50, -3.2], [54.2, 1], [54.2, ROAD.y1]],                // мимо ворот → на боковую
    [[ROAD.x1, -3.2], [59.5, -3.2], [54.2, 1], [54.2, ROAD.y1]],              // справа → на боковую
  ];
  const path = routes[Math.floor(Math.random() * routes.length)];
  run(new Mover(c, path, 7 + Math.random() * 3, { onDone: () => drop(c) }));
}

// ---------- птицы и белка ----------
const birds = [];
{
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, 0.6, 0, 0, 0, 0, -0.2], 3));
  wing.computeVertexNormals();
  const bm = new THREE.MeshBasicMaterial({ color: 0x33363b, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    const l = new THREE.Mesh(wing, bm), r = new THREE.Mesh(wing, bm); r.scale.x = -1;
    g.add(l, r); scene.add(g);
    birds.push({ g, l, r, phase: Math.random() * 6, rad: 14 + Math.random() * 6, h: 12 + Math.random() * 4, sp: 0.18 + Math.random() * 0.05, off: i * 0.35 });
  }
}
const squirrel = (() => {
  const g = new THREE.Group();
  const m = mat(0xc4692d);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), m); b.scale.set(1, 0.9, 1.4); b.position.y = 0.2; g.add(b);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), m); tail.scale.set(0.8, 1.6, 0.8); tail.position.set(0, 0.42, -0.28); g.add(tail);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(g);
  return { g, from: null, to: null, t: 1, wait: 2 };
})();
function updateSquirrel(dt, day) {
  squirrel.g.visible = day;
  if (!day) return;
  const s = squirrel;
  if (s.t >= 1) {
    s.wait -= dt;
    if (s.wait > 0) return;
    const pick = treeSpots[Math.floor(Math.random() * treeSpots.length)];
    s.from = s.g.position.clone();
    s.to = P(pick.x + 1.2, pick.y + 1.2);
    if (!s.from.lengthSq()) s.from = s.to.clone();
    s.t = 0; s.wait = 1 + Math.random() * 4;
    s.g.rotation.y = Math.atan2(s.to.x - s.from.x, s.to.z - s.from.z);
  }
  const dist = s.from.distanceTo(s.to);
  s.t = Math.min(1, s.t + dt * 3.5 / Math.max(dist, 0.5));
  s.g.position.lerpVectors(s.from, s.to, s.t);
  s.g.position.y = Math.abs(Math.sin(s.t * dist * 2.2)) * 0.35;
}

// ---------- погода ----------
// wx: clear / cloudy / drizzle / storm / snow — как в pet_weather.py
const WX_RU = { clear: 'ясно', cloudy: 'облачно', drizzle: 'дождь', storm: 'гроза', snow: 'снег' };
const WX_MODES = ['auto', 'drizzle', 'storm', 'snow', 'clear'];
let wxMode = 'auto', wxReal = null;   // wxReal — { wx, temp } с сервера; вне веб-интерфейса его нет
const wxNow = () => (wxMode === 'auto' ? (wxReal && wxReal.wx) || 'clear' : wxMode);
async function loadWeather() {}
// Камера ортографическая, поэтому размеры частиц — в пикселях, а не в метрах.
// Дождь — короткие косые штрихи (точки в 1–2 px не видно), снег — хлопья-точки.
const RAIN_N = 2500, SNOW_N = 3000;
const rain = (() => {
  const pos = new Float32Array(RAIN_N * 6);
  for (let i = 0; i < RAIN_N; i++) {
    const x = rnd(-45, 45), y = rnd(0, 30), z = rnd(-35, 35);
    pos.set([x, y, z, x + 0.12, y - 0.8, z + 0.06], i * 6);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x7d93ab, transparent: true, opacity: 0.55 }));
  l.visible = false; l.frustumCulled = false; scene.add(l); return l;
})();
const snowfall = (() => {
  const pos = new Float32Array(SNOW_N * 3);
  for (let i = 0; i < SNOW_N; i++) pos.set([rnd(-45, 45), rnd(0, 30), rnd(-35, 35)], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.9 }));
  p.visible = false; p.frustumCulled = false; scene.add(p); return p;
})();
function updatePrecip(dt, t) {
  const wx = wxNow();
  rain.visible = wx === 'drizzle' || wx === 'storm';
  snowfall.visible = wx === 'snow';
  if (rain.visible) {
    const heavy = wx === 'storm', a = rain.geometry.attributes.position;
    rain.geometry.setDrawRange(0, (heavy ? RAIN_N : RAIN_N * 0.45) * 2);
    rain.material.opacity = heavy ? 0.7 : 0.5;
    const v = dt * (heavy ? 30 : 20);
    for (let i = 0; i < a.count; i += 2) {
      let y = a.getY(i) - v;
      if (y < 0) y += 30;
      a.setY(i, y); a.setY(i + 1, y - 0.8);
    }
    a.needsUpdate = true;
  }
  if (snowfall.visible) {
    const a = snowfall.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) - dt * 2.2;
      if (y < 0) y += 30;
      a.setY(i, y);
      a.setX(i, a.getX(i) + Math.sin(t * 0.8 + i) * dt * 0.4);
    }
    a.needsUpdate = true;
  }
}

// ---------- время суток ----------
const SKY_DAY = new THREE.Color(0xf3f1ec), SKY_NIGHT = new THREE.Color(0x1d2433), SKY_DUSK = new THREE.Color(0xf2c9a4);
let liveTime = false, manualHour = 11;
function hourNow() { if (!liveTime) return manualHour; const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
function updateSky(h) {
  // восход/закат примерно по сезону, без точных координат
  const [rise, set] = { winter: [9, 16], spring: [6, 20], summer: [4.5, 21.5], autumn: [7, 18.5] }[season()];
  const u = (h - rise) / (set - rise);
  const el = Math.sin(Math.PI * THREE.MathUtils.clamp(u, 0, 1));
  const day = u > 0 && u < 1;
  // азимут 105° → 255° по компасу, высота — как в октябре на ~56° с.ш.
  const bearing = 105 + 150 * THREE.MathUtils.clamp(u, 0, 1);
  const a = THREE.MathUtils.degToRad(bearing + S.NORTH_DEG);  // угол от «верха» плана по часовой
  const alt = THREE.MathUtils.degToRad(4 + 24 * el);
  sun.position.set(Math.sin(a) * Math.cos(alt) * 80, Math.sin(alt) * 80, -Math.cos(a) * Math.cos(alt) * 80);
  const dayK = THREE.MathUtils.smoothstep(el, 0, 0.25) * (day ? 1 : 0);
  const duskK = day ? Math.max(0, 1 - el / 0.35) : 0;
  const overcast = { clear: 1, cloudy: 0.55, drizzle: 0.45, storm: 0.3, snow: 0.5 }[wxNow()];
  sun.intensity = 0.15 + dayK * 2.2 * overcast;
  sun.color.setHSL(0.09, duskK * 0.6, 0.5 + (1 - duskK) * 0.5);
  hemi.intensity = 0.25 + dayK * (1.0 + (1 - overcast) * 0.7);
  hemi.color.set(day ? 0xffffff : 0x8090b0);
  const sky = SKY_NIGHT.clone().lerp(SKY_DAY, dayK).lerp(SKY_DUSK, duskK * 0.5 * dayK);
  scene.background = sky;
  stage.classList.toggle('night', dayK < 0.6);
  const night = 1 - dayK;
  M.window.emissiveIntensity = night * 1.6;
  M.glass.emissiveIntensity = night * 1.2;
  M.bulb.emissiveIntensity = night * 3;
  fireLight.intensity = night * 25;
  fireMesh.visible = night > 0.3;
  return dayK > 0.3;
}

// ---------- события и управление ----------
const emitEv = (type, extra = {}) => window.dispatchEvent(new CustomEvent('world:event', { detail: { type, ...extra } }));
function log() {}
function applySeason() { seasonal.forEach(f => f(season())); }
applySeason();
let dirIdle = 5;                       // пауза автопилота после действий посетителя
const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', () => { fn(); dirIdle = 14; }); };
bind('wGuest', guestArrives);
bind('wCar', () => (carHome ? carLeaves() : carArrives()));
bind('wOwner', personLeaves);

// суточный цикл ускорен: сутки ≈ 2,5 минуты, ночью быстрее
function advanceTime(dt, day) { manualHour = (manualHour + dt * (day ? 0.15 : 0.32)) % 24; }
// погода по сезону, меняется сама
const WX_BY_SEASON = {
  summer: [['clear', 6], ['cloudy', 2.5], ['drizzle', 1], ['storm', 0.5]],
  autumn: [['cloudy', 4], ['drizzle', 3.5], ['clear', 2], ['storm', 0.5]],
  winter: [['snow', 5.5], ['cloudy', 3], ['clear', 1.5]],
  spring: [['clear', 3.5], ['cloudy', 3], ['drizzle', 3], ['storm', 0.5]],
};
function pickWeather() {
  const list = WX_BY_SEASON[season()] || WX_BY_SEASON.summer;
  let r = Math.random() * list.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of list) if ((r -= w) < 0) return k;
  return list[0][0];
}
let wxTimer = 0;
function weatherTick(dt) {
  if ((wxTimer -= dt) > 0) return;
  wxReal = { wx: pickWeather() };
  wxTimer = 28 + Math.random() * 22;
}
let hudT = 0;
function hudTick(dt) {
  if ((hudT -= dt) > 0) return;
  hudT = 1;
  emitEv('hud', { h: manualHour, season: season(), wx: wxNow() });
}
window.__world.fit = fit;
new ResizeObserver(fit).observe(mount);
fit();

// автопилот: чередует сценки, чтобы сцена жила и без касаний
const SCRIPT = [guestArrives, personLeaves, carArrives, guestArrives, carLeaves];
let scriptI = 0;
function director(dt) {
  if (reduceMotion) return;
  if ((dirIdle -= dt) > 0) return;
  SCRIPT[scriptI++ % SCRIPT.length]();
  dirIdle = 9 + Math.random() * 4;
}

// цвет земли по углу кадра: им же красим подложку и туман, чтобы края сцены растворялись без швов
const probe = document.createElement('canvas'); probe.width = probe.height = 1;
const pctx = probe.getContext('2d', { willReadFrequently: true });
let skyT = 0;
function sampleSky() {
  try {
    pctx.drawImage(renderer.domElement, 8, 8, 2, 2, 0, 0, 1, 1);
    const d = pctx.getImageData(0, 0, 1, 1).data;
    stage.style.setProperty('--sky', `rgb(${d[0]},${d[1]},${d[2]})`);
  } catch (e) { /* без пробы остаётся цвет по умолчанию */ }
}
// ---------- цикл ----------
const clock = new THREE.Clock();
let nextPass = 3;
let simT = 0;
function frame(dt) {
  const t = (simT += dt);
  const h = hourNow();
  const day = updateSky(h);
  advanceTime(dt, day); weatherTick(dt); hudTick(dt);
  director(dt);

  updateGate(dt);
  for (const m of movers) { m.step(dt); if (m.done) movers.delete(m); }
  if ((nextPass -= dt) < 0) { passingCar(); nextPass = 7 + Math.random() * 9; }
  updateCams(dt);

  for (const b of birds) {
    b.g.visible = day;
    const a = t * b.sp + b.off;
    b.g.position.set(Math.cos(a) * b.rad, b.h + Math.sin(t * 0.7 + b.phase), Math.sin(a) * b.rad * 0.7);
    b.g.rotation.y = -a;
    const flap = Math.sin(t * 9 + b.phase) * 0.6;
    b.l.rotation.z = flap; b.r.rotation.z = -flap;
  }
  updateSquirrel(dt, day);
  updatePrecip(dt, t);
  if (fireMesh.visible) { fireMesh.scale.set(1, 0.85 + Math.sin(t * 13) * 0.15, 1); fireLight.intensity *= 0.85 + Math.random() * 0.3; }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  if ((skyT -= dt) < 0) { skyT = 0.4; sampleSky(); }
}
const tick = () => frame(Math.min(clock.getDelta(), 0.05));
let onScreen = true;
const sync = () => { const go = onScreen && (!document.hidden || location.search.includes('debug')); renderer.setAnimationLoop(go ? tick : null); if (go) clock.getDelta(); };
new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; sync(); }, { threshold: 0 }).observe(stage);
document.addEventListener('visibilitychange', sync);
sync();
window.__world.frame = frame;
