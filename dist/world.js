// 3D 場景：七座六角島、橋、海、天空、迷霧、關聯弧線。裝飾造型不代表任何服務或成效承諾。
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ISLANDS, FLOWS } from './content.js';
import { R, D, TOP, SQ3, hexCenter, isAdjacent, skyAt, lightPos, hexToRgb, arcPoints, bezier, mulberry, lerp } from './lib.js';

const C = (h) => new THREE.Color(h);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...o });
const glowMat = (color, base = 0.2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: base, roughness: 0.5, flatShading: true });
const shade = (hex, k) => C(hex).multiplyScalar(k);
const mix = (hex, other, t) => C(hex).lerp(C(other), t);

function labelTexture(text, { w = 256, h = 128, bg = '#fff8ee', fg = '#3a2f2a', font = 700 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = fg; g.font = `${font} ${Math.round(h * 0.42)}px "Noto Sans TC","PingFang TC",sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// 桌上的圖騰：同心圓與放射線
function totemTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fff3e6'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#c8574f'; g.lineWidth = 5;
  for (const r of [112, 84, 56, 28]) { g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); }
  g.lineWidth = 3;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 28, 128 + Math.sin(a) * 28); g.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildWorld({ stage, labels }) {
  const scene = new THREE.Scene();
  const clock = { t: 0 };
  const anim = []; // (t, sky) => void
  const glows = []; // {mat, base, boost}
  const pickables = []; // 供射線判斷：mesh.userData = {kind, id, step}
  const islands = new Map();
  const reg = (mesh, data) => { mesh.userData = { ...mesh.userData, ...data }; pickables.push(mesh); return mesh; };
  const addGlow = (mat, base, boost) => { glows.push({ mat, base, boost }); return mat; };

  // ── 光與霧 ────────────────────────────────────────────────────────────
  scene.fog = new THREE.Fog(0xcfe8f8, 38, 95);
  const hemi = new THREE.HemisphereLight(0xdff0ff, 0xa0866a, 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 70 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  // 天空漸層球
  const skyU = { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } };
  const skyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(120, 24, 16),
    new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} ',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = smoothstep(-0.05, 0.75, vP.y); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }',
    }),
  );
  skyMesh.renderOrder = -10;
  scene.add(skyMesh);
  // 星星
  const starGeo = new THREE.BufferGeometry();
  const rnd = mulberry(7);
  const sp = [];
  for (let i = 0; i < 260; i++) { const th = rnd() * Math.PI * 2, ph = Math.acos(0.15 + rnd() * 0.85); sp.push(Math.sin(ph) * Math.cos(th) * 110, Math.cos(ph) * 110, Math.sin(ph) * Math.sin(th) * 110); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(stars);

  // 彩虹（白天）：五條半圓帶
  const rainbow = new THREE.Group();
  [0xff6b6b, 0xffb454, 0xffe36b, 0x7ed99a, 0x6bb6ff, 0xa78bfa].forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(26 - i * 0.7, 0.36, 6, 64, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5, fog: false, depthWrite: false }));
    rainbow.add(m);
  });
  rainbow.position.set(2, -6, -34);
  scene.add(rainbow);

  // 海
  const seaGeo = new THREE.PlaneGeometry(160, 160, 56, 56);
  seaGeo.rotateX(-Math.PI / 2);
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x4fb0c9, emissive: 0x1d6f86, emissiveIntensity: 0.35, roughness: 0.5, metalness: 0.05, flatShading: true });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.position.y = -0.55; sea.receiveShadow = true;
  scene.add(sea);
  const seaBase = seaGeo.attributes.position.array.slice();
  let seaTick = 0;
  anim.push((t) => {
    if (++seaTick % 2) return;
    const p = seaGeo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const x = seaBase[i], z = seaBase[i + 2];
      const near = Math.hypot(x, z) < 22 ? 1 : 0.4;
      p[i + 1] = (Math.sin(x * 0.55 + t * 0.9) + Math.cos(z * 0.6 + t * 0.7)) * 0.05 * near;
    }
    seaGeo.attributes.position.needsUpdate = true;
  });

  // 雲
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1 + rnd() * 0.8, 8, 6), cloudMat); s.position.set(k * 1.3 - 2, rnd() * 0.4, rnd() * 0.8); s.scale.y = 0.6; g.add(s); }
    const ang = rnd() * Math.PI * 2, rad = 24 + rnd() * 22;
    g.position.set(Math.cos(ang) * rad, 7 + rnd() * 6, Math.sin(ang) * rad - 10);
    g.userData.speed = 0.15 + rnd() * 0.2;
    clouds.add(g);
  }
  scene.add(clouds);
  anim.push((t, sky) => {
    cloudMat.color.setRGB(...[0, 1, 2].map((i) => lerp(0.35, 1, sky.day) * (i === 2 ? 1 : 1)));
    cloudMat.opacity = lerp(0.35, 0.85, sky.day);
    clouds.children.forEach((c) => { c.position.x += 0.0025 * c.userData.speed * 60 * 0.016; if (c.position.x > 55) c.position.x = -55; });
  });

  // ── 島 ────────────────────────────────────────────────────────────────
  const hexGeo = (r, h) => new THREE.CylinderGeometry(r, r, h, 6);
  const mistMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false });

  for (const def of ISLANDS) {
    const { x, z } = hexCenter(...def.hex);
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    scene.add(g);
    const base = C(def.color);
    const mats = []; // 之後淡化用
    const own = (m) => { m.userData.base = m.color.clone(); mats.push(m); return m; };

    const grass = own(std(mix(def.color, '#bfd59a', 0.55).getHex()));
    const ground = new THREE.Mesh(hexGeo(R, 0.3), grass);
    ground.position.y = TOP - 0.15; ground.receiveShadow = true;
    reg(ground, { kind: 'island', id: def.id });
    const plaza = new THREE.Mesh(hexGeo(R * 0.8, 0.05), own(std(mix(def.color, '#fff6e8', 0.55).getHex())));
    plaza.position.y = TOP + 0.02; plaza.receiveShadow = true;
    reg(plaza, { kind: 'island', id: def.id });
    const cliffCols = [mix(def.color, '#b78a66', 0.7), mix(def.color, '#a37a59', 0.8), mix(def.color, '#8d6b52', 0.85)];
    const rim = new THREE.Mesh(hexGeo(R + 0.45, 0.06), new THREE.MeshStandardMaterial({ color: mix(def.color, '#bfe8ee', 0.7).getHex(), transparent: true, opacity: 0.5, roughness: 0.4, flatShading: true }));
    rim.position.y = -0.5;
    g.add(ground, plaza, rim);
    cliffCols.forEach((c, i) => {
      const geo = new THREE.CylinderGeometry(R * (1 - i * 0.14), R * (1 - (i + 1) * 0.14), 0.62, 6);
      const m = new THREE.Mesh(geo, own(std(c.getHex())));
      m.position.y = TOP - 0.3 - 0.31 - i * 0.62; m.castShadow = true;
      reg(m, { kind: 'island', id: def.id });
      g.add(m);
    });

    // 角落的樹或岩石
    const rr = mulberry(def.n * 97);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6 * 0 ;
      const px = Math.sin(a) * R * 0.84, pz = Math.cos(a) * R * 0.84;
      if (def.kind === 'volcano') {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + rr() * 0.16, 0), std(0x8c7a6a));
        rock.position.set(px, TOP + 0.12, pz); rock.rotation.set(rr() * 3, rr() * 3, 0); rock.castShadow = true; g.add(rock);
      } else {
        const tree = new THREE.Group();
        const h = 0.35 + rr() * 0.2;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, h, 5), std(0x7b5a44)); trunk.position.y = h / 2;
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 6), std(mix('#79b66a', def.color, 0.25).getHex())); leaf.position.y = h + 0.2;
        leaf.castShadow = true;
        tree.add(trunk, leaf); tree.position.set(px, TOP, pz); g.add(tree);
      }
    }

    // 中央裝飾
    const deco = buildDecor(def, g, { anim, addGlow, own, rr });

    // 島上的小屋 = 重點（細項）
    const buildings = [];
    const n = def.steps.length;
    def.steps.forEach((st, i) => {
      const ang = (i / n) * Math.PI * 2 + Math.PI / n + 0.35;
      const br = 1.42;
      const b = new THREE.Group();
      b.position.set(Math.sin(ang) * br, TOP, Math.cos(ang) * br);
      const wallM = own(std(mix(def.color, '#fffaf0', 0.45).getHex()));
      const roofM = own(std(shade(def.color, 0.78).getHex()));
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.34), wallM); wall.position.y = 0.15;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.24, 4), roofM); roof.position.y = 0.42; roof.rotation.y = Math.PI / 4;
      wall.castShadow = roof.castShadow = true;
      reg(wall, { kind: 'step', id: def.id, step: i }); reg(roof, { kind: 'step', id: def.id, step: i });
      b.add(wall, roof);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), addGlow(glowMat(0xffd27a, 0.1), 0.1, 1.4)); win.position.set(0, 0.17, 0.175); b.add(win);
      g.add(b);
      // 數字圖釘
      const pin = document.createElement('button');
      pin.className = 'pin'; pin.type = 'button'; pin.textContent = i + 1; pin.dataset.island = def.id; pin.dataset.step = i;
      pin.setAttribute('aria-label', `${def.short}　重點 ${i + 1}：${st.label}`);
      pin.style.setProperty('--c', def.color);
      const pinObj = new CSS2DObject(pin); pinObj.position.set(0, 0.85, 0); b.add(pinObj);
      buildings.push({ group: b, wall, roof, wallM, roofM, pin });
    });

    // 名牌
    const plate = document.createElement('button');
    plate.className = 'plate'; plate.type = 'button'; plate.dataset.island = def.id;
    plate.style.setProperty('--c', def.color);
    plate.innerHTML = `<b>${def.n}</b><span>${def.short}</span>`;
    plate.setAttribute('aria-label', def.title);
    const plateObj = new CSS2DObject(plate); plateObj.position.set(0, 2.55, 0); g.add(plateObj);

    // 迷霧：還沒看過的島罩著一層薄霧
    const mist = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.7 + rr() * 0.4, 8, 6), mistMat.clone());
      s.position.set((rr() - 0.5) * 3.2, 1.3 + rr() * 0.9, (rr() - 0.5) * 3.2); s.scale.y = 0.45;
      s.userData.ph = rr() * 6.28;
      s.raycast = () => {};
      mist.add(s);
    }
    g.add(mist);

    islands.set(def.id, { def, group: g, center: new THREE.Vector3(x, TOP, z), ground, mats, buildings, plate, pins: buildings.map((b) => b.pin), mist, mistLevel: 1, deco, dim: 0, hl: 0 });
  }

  // ── 橋 ────────────────────────────────────────────────────────────────
  const bridges = [];
  const woodM = std(0xb48560), railM = std(0x9a7454), redM = std(0xc8574f), cream = std(0xfff4e0);
  const lampM = addGlow(glowMat(0xffc86b, 0.25), 0.25, 2.2);
  const lotusRoot = new THREE.Group(); scene.add(lotusRoot);
  for (let i = 0; i < ISLANDS.length; i++) {
    for (let j = i + 1; j < ISLANDS.length; j++) {
      const A = ISLANDS[i], B = ISLANDS[j];
      if (!isAdjacent(A.hex, B.hex)) continue;
      const a = hexCenter(...A.hex), b = hexCenter(...B.hex);
      const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z);
      const len = dir.length(); dir.normalize();
      const naihe = (A.id === 'start' && B.id === 'teacher') || (A.id === 'teacher' && B.id === 'start');
      const span = len - (R * SQ3) + 1.1;
      const grp = new THREE.Group();
      grp.position.set((a.x + b.x) / 2, TOP, (a.z + b.z) / 2);
      grp.rotation.y = Math.atan2(dir.x, dir.z);
      const segs = naihe ? 8 : 4;
      const arch = naihe ? 0.5 : 0.1;
      for (let s = 0; s < segs; s++) {
        const t0 = s / segs, t1 = (s + 1) / segs, tm = (t0 + t1) / 2;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(naihe ? 0.9 : 0.62, 0.12, span / segs + 0.02), naihe ? redM : woodM);
        seg.position.set(0, Math.sin(tm * Math.PI) * arch, (tm - 0.5) * span);
        seg.rotation.x = -Math.cos(tm * Math.PI) * arch * Math.PI / span * 1.0;
        seg.castShadow = seg.receiveShadow = true;
        grp.add(seg);
        for (const sx of [-1, 1]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, span / segs + 0.02), naihe ? cream : railM);
          rail.position.set(sx * (naihe ? 0.43 : 0.3), Math.sin(tm * Math.PI) * arch + 0.2, (tm - 0.5) * span);
          rail.rotation.x = seg.rotation.x;
          grp.add(rail);
          if (s % 2 === 0 || s === segs - 1) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 5), naihe ? cream : railM);
            post.position.set(sx * (naihe ? 0.43 : 0.3), Math.sin(t0 * Math.PI) * arch + 0.1, (t0 - 0.5) * span);
            grp.add(post);
          }
        }
      }
      if (naihe) {
        for (const sz of [-1, 1]) {
          const gate = new THREE.Group();
          for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 6), redM); p.position.set(sx * 0.5, 0.45, 0); gate.add(p); }
          const beam = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 0.1), redM); beam.position.y = 0.92;
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), lampM); lamp.position.y = 0.72;
          gate.add(beam, lamp); gate.position.z = sz * span * 0.48; grp.add(gate);
        }
        // 橋下漂著蓮花（點蓮花 → 繽紛世界的回饋）
        const lm = new THREE.MeshStandardMaterial({ color: 0xffb3c8, emissive: 0xff8fb0, emissiveIntensity: 0.15, roughness: 0.6, flatShading: true });
        addGlow(lm, 0.15, 0.8);
        for (let k = 0; k < 6; k++) {
          const lotus = new THREE.Group();
          for (let q = 0; q < 6; q++) { const p = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 4), lm); p.position.set(Math.cos(q / 6 * 6.28) * 0.1, 0.1, Math.sin(q / 6 * 6.28) * 0.1); p.rotation.set(Math.sin(q / 6 * 6.28) * 0.7, 0, -Math.cos(q / 6 * 6.28) * 0.7); lotus.add(p); }
          const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 10), std(0x5aa86a)); pad.position.y = -0.02; lotus.add(pad);
          const off = (k - 2.5) * 0.55, side = k % 2 ? 1 : -1;
          lotus.position.set((a.x + b.x) / 2 + dir.z * side * (0.9 + (k % 3) * 0.25) + dir.x * off, -0.5, (a.z + b.z) / 2 - dir.x * side * (0.9 + (k % 3) * 0.25) + dir.z * off);
          lotus.traverse((o) => { if (o.isMesh) reg(o, { kind: 'lotus', id: 'stories' }); });
          lotus.userData.ph = k;
          lotusRoot.add(lotus);
          anim.push((t) => { lotus.position.y = -0.5 + Math.sin(t * 0.9 + k) * 0.03; lotus.rotation.y = t * 0.1 + k; });
        }
      }
      scene.add(grp);
      bridges.push({ a: A.id, b: B.id, group: grp, naihe });
    }
  }

  // ── 關聯弧線 ──────────────────────────────────────────────────────────
  const flowGroup = new THREE.Group(); scene.add(flowGroup);
  const flows = new Map();
  const dotGeo = new THREE.SphereGeometry(0.07, 8, 6);
  for (const f of FLOWS) {
    const A = islands.get(f.a), B = islands.get(f.b);
    const pts = arcPoints({ x: A.center.x, z: A.center.z }, { x: B.center.x, z: B.center.z }, f.kind === 'journey' ? 0.32 : 0.5, 2.1);
    const curve = new THREE.QuadraticBezierCurve3(...pts.map((p) => new THREE.Vector3(...p)));
    const col = f.kind === 'journey' ? 0xdb6a41 : 0x3e8a7a;
    const tubeM = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, fog: false, depthWrite: false });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.035, 5, false), tubeM);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, fog: false }));
    const end = curve.getPoint(0.94), tan = curve.getTangent(0.94);
    arrow.position.copy(end); arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
    const dots = [];
    const N = f.kind === 'journey' ? 5 : 4;
    for (let i = 0; i < N; i++) { const d = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, fog: false })); dots.push(d); }
    const grp = new THREE.Group(); grp.add(tube, arrow, ...dots);
    // 點擊用的透明粗管
    const hit = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.22, 5, false), new THREE.MeshBasicMaterial({ visible: false }));
    reg(hit, { kind: 'flow', id: f.id }); grp.add(hit);
    flowGroup.add(grp);
    const rec = { def: f, group: grp, curve, tubeM, arrow, dots, level: 0.35, target: 0.35, mid: curve.getPoint(0.5) };
    flows.set(f.id, rec);
  }
  flowGroup.visible = false;
  anim.push((t) => {
    if (!flowGroup.visible) return;
    for (const f of flows.values()) {
      f.level += (f.target - f.level) * 0.12;
      f.tubeM.opacity = f.level; f.arrow.material.opacity = Math.min(1, f.level * 2.2);
      const speed = f.def.kind === 'journey' ? 0.14 : 0.1;
      f.dots.forEach((d, i) => { const u = (t * speed + i / f.dots.length) % 1; d.position.copy(f.curve.getPoint(u)); d.material.opacity = Math.min(1, f.level * 2.6); d.scale.setScalar(0.5 + f.level * 0.4); });
    }
  });

  // ── 時間 ──────────────────────────────────────────────────────────────
  const tmpC = new THREE.Color();
  function setTime(minutes) {
    const sky = skyAt(minutes);
    const lp = lightPos(minutes);
    skyU.top.value.setRGB(...sky.top); skyU.bottom.value.setRGB(...sky.bottom);
    scene.fog.color.setRGB(...sky.bottom);
    hemi.intensity = sky.hemiI; hemi.color.setRGB(...sky.top).lerp(tmpC.set(0xffffff), 0.5); hemi.groundColor.setRGB(...sky.bottom).multiplyScalar(0.55);
    sun.color.setRGB(...sky.light); sun.intensity = sky.lightI;
    sun.position.set(lp.x, lp.y, lp.z);
    seaMat.color.setRGB(...sky.water);
    stars.material.opacity = Math.max(0, (sky.night - 0.5) * 2);
    rainbow.children.forEach((m) => { m.material.opacity = 0.5 * sky.day * sky.day; });
    for (const gl of glows) gl.mat.emissiveIntensity = gl.base + gl.boost * sky.night;
    mistMat.opacity = 0.2 + sky.night * 0.06;
    return sky;
  }

  // 迷霧 / 淡化 / 高亮
  function applyIslandLook(rec) {
    const k = rec.dim, hl = rec.hl;
    for (const m of rec.mats) {
      m.color.copy(m.userData.base).lerp(tmpC.set(0xcfcfcf), k * 0.72);
      if (m.emissive) m.emissive.setRGB(1, 0.95, 0.8).multiplyScalar(hl * 0.12);
    }
  }
  function setIslandState(id, { dim, hl, mist } = {}) {
    const r = islands.get(id);
    if (dim !== undefined) r.dim = dim;
    if (hl !== undefined) r.hl = hl;
    if (mist !== undefined) r.mistLevel = mist;
    applyIslandLook(r);
  }
  anim.push((t) => {
    for (const r of islands.values()) {
      r.mist.children.forEach((s, i) => {
        s.material.opacity = mistMat.opacity * r.mistLevel * (0.75 + 0.25 * Math.sin(t * 0.5 + s.userData.ph));
        s.position.x += Math.sin(t * 0.2 + s.userData.ph) * 0.0015;
        s.visible = r.mistLevel > 0.02;
      });
    }
  });

  function update(dt, frozen, sky) {
    if (!frozen) clock.t += dt;
    for (const fn of anim) fn(clock.t, sky);
  }
  const mistFor = (id) => islands.get(id);
  return { scene, islands, pickables, flows, flowGroup, bridges, setTime, update, setIslandState, sun, sea, clock, mistFor, labels };
}

// ── 各島中央造型 ─────────────────────────────────────────────────────────
function buildDecor(def, g, { anim, addGlow, own, rr }) {
  const grp = new THREE.Group(); grp.position.y = TOP; g.add(grp);
  const cast = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  const tint = def.color;
  const deco = {};
  switch (def.kind) {
    case 'volcano': {
      const cone = cast(new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.7, 8, 1, true), std(0x8a7060)));
      cone.position.y = 0.85;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 0.1, 8), addGlow(glowMat(0xff7a3a, 0.5), 0.5, 1.6)); cap.position.y = 1.64;
      const lavaM = addGlow(glowMat(0xff6a2a, 0.5), 0.5, 1.4);
      const stream = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.9, 0.04), lavaM); stream.position.set(0.18, 1.2, 0.46); stream.rotation.set(0.42, 0.25, 0.05);
      const smoke = [];
      for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0x8e8580, transparent: true, opacity: 0.5, fog: false, depthWrite: false })); smoke.push(s); grp.add(s); }
      anim.push((t) => smoke.forEach((s, i) => { const u = (t * 0.12 + i / 5) % 1; s.position.set(Math.sin(u * 5 + i) * 0.14, 1.7 + u * 1.7, Math.cos(u * 4 + i) * 0.14); s.scale.setScalar(0.5 + u * 1.6); s.material.opacity = 0.5 * (1 - u); }));
      grp.add(cone, cap, stream);
      break;
    }
    case 'pavilion': {
      const stone = std(0xd9cbb4);
      const plat = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.12, 6), stone)); plat.position.y = 0.06;
      const wood = std(0xc8574f);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.283; const p = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.8, 6), wood)); p.position.set(Math.sin(a) * 0.82, 0.52, Math.cos(a) * 0.82); grp.add(p);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), addGlow(glowMat(0xffc86b, 0.25), 0.25, 2.2)); lamp.position.set(Math.sin(a) * 0.82, 0.78, Math.cos(a) * 0.82); grp.add(lamp); }
      const ring = cast(new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.04, 6, 6), wood)); ring.rotation.x = Math.PI / 2; ring.rotation.z = Math.PI / 6; ring.position.y = 0.92;
      const table = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.28, 12), std(0x9a7454))); table.position.y = 0.26;
      const totem = new THREE.Mesh(new THREE.CircleGeometry(0.31, 24), new THREE.MeshStandardMaterial({ map: totemTexture(), roughness: 0.8 })); totem.rotation.x = -Math.PI / 2; totem.position.y = 0.405;
      const pot = cast(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), std(0xf2b5c8))); pot.position.set(0.1, 0.5, 0.05); pot.scale.y = 0.85;
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.025, 0.12, 6), std(0xf2b5c8)); spout.position.set(0.2, 0.54, 0.05); spout.rotation.z = -0.9;
      const steam = [];
      for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, fog: false, depthWrite: false })); steam.push(s); grp.add(s); }
      anim.push((t) => steam.forEach((s, i) => { const u = (t * 0.3 + i / 4) % 1; s.position.set(0.1 + Math.sin(u * 6 + i) * 0.04, 0.6 + u * 0.5, 0.05); s.scale.setScalar(0.6 + u); s.material.opacity = 0.5 * (1 - u); }));
      grp.add(plat, ring, table, totem, pot, spout);
      break;
    }
    case 'dome': {
      const base = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.1, 20), std(0xe8efe9))); base.position.y = 0.05;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.88, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xdff5ee, transparent: true, opacity: 0.28, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
      dome.position.y = 0.1;
      const leafCols = [0x6fb56a, 0x8fd27f, 0x5aa078];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.283, rad = 0.45 + (i % 2) * 0.12;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.4 + (i % 3) * 0.1, 5), std(0x5f8f55)); stem.position.set(Math.sin(a) * rad, 0.3 + (i % 3) * 0.05, Math.cos(a) * rad);
        const leaf = cast(new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), std(leafCols[i % 3]))); leaf.position.set(Math.sin(a) * rad, 0.55 + (i % 3) * 0.1, Math.cos(a) * rad);
        grp.add(stem, leaf);
      }
      const orbM = addGlow(glowMat(0x9fffd8, 0.6), 0.6, 1.2);
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), orbM); orb.position.y = 0.75;
      const motes = [];
      for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), orbM); motes.push(m); grp.add(m); }
      anim.push((t) => { orb.position.y = 0.75 + Math.sin(t * 1.2) * 0.05; orb.scale.setScalar(1 + Math.sin(t * 2) * 0.08); motes.forEach((m, i) => { const a = t * (0.5 + i * 0.05) + i; m.position.set(Math.cos(a) * (0.55 + (i % 3) * 0.1), 0.5 + (i % 4) * 0.14 + Math.sin(t + i) * 0.04, Math.sin(a) * (0.55 + (i % 3) * 0.1)); }); });
      grp.add(base, dome, orb);
      break;
    }
    case 'question': {
      const col = addGlow(glowMat(0xb6a0f0, 0.25), 0.25, 1.4);
      const q = new THREE.Group();
      const arc = cast(new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.075, 8, 20, Math.PI * 1.45), col)); arc.rotation.z = -Math.PI * 0.2; arc.position.y = 0.3;
      const stem = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 8), col)); stem.position.set(0.02, -0.12, 0);
      const dot = cast(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), col)); dot.position.set(0.02, -0.4, 0);
      q.add(arc, stem, dot); q.position.y = 1.15; q.scale.setScalar(1.05);
      anim.push((t) => { q.rotation.y = Math.sin(t * 0.6) * 0.5; q.position.y = 1.15 + Math.sin(t * 1.1) * 0.05; });
      const pad = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.14, 8), std(0xd9d0ee))); pad.position.y = 0.07;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.6, 6), std(0x7d6aa8)); post.position.y = 0.4;
      grp.add(pad, post, q);
      for (let k = 0; k < 4; k++) { const a = (k / 4) * 6.283 + 0.78; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.55, 5), std(0x7d6aa8)); p.position.set(Math.sin(a) * 0.62, 0.4, Math.cos(a) * 0.62); const l = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), addGlow(glowMat(0xffd27a, 0.25), 0.25, 2.2)); l.position.set(Math.sin(a) * 0.62, 0.72, Math.cos(a) * 0.62); grp.add(p, l); }
      break;
    }
    case 'wheel': {
      const frame = std(0xfff3ea);
      for (const sz of [-1, 1]) for (const sx of [-1, 1]) { const leg = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.25, 5), frame)); leg.position.set(sx * 0.2, 0.62, sz * 0.12); leg.rotation.z = -sx * 0.3; leg.rotation.x = 0; grp.add(leg); }
      const wheel = new THREE.Group(); wheel.position.y = 1.18; wheel.rotation.y = -0.55;
      const rimMat = std(0xffd0e4);
      const rim = cast(new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.03, 6, 32), rimMat));
      const rim2 = cast(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.02, 6, 32), rimMat));
      wheel.add(rim, rim2);
      const cabCols = [0xff8fb0, 0xffd45e, 0x8fd9c6, 0xa9b8ff, 0xffa874, 0xc7e87d, 0xf5a0e0, 0x87cdf5];
      const cabs = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.283;
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.82, 4), frame); spoke.position.set(Math.cos(a) * 0.41, Math.sin(a) * 0.41, 0); spoke.rotation.z = a + Math.PI / 2; wheel.add(spoke);
        const cab = new THREE.Group(); const body = cast(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.16), std(cabCols[i]))); body.position.y = -0.12; cab.add(body); cab.position.set(Math.cos(a) * 0.82, Math.sin(a) * 0.82, 0); wheel.add(cab); cabs.push([cab, a]);
      }
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), std(0xff8fb0)); wheel.add(hub);
      anim.push((t) => { wheel.rotation.z = t * 0.25; cabs.forEach(([c]) => { c.rotation.z = -wheel.rotation.z; }); });
      grp.add(wheel);
      // 花圃
      const fcols = [0xff8fb0, 0xffd45e, 0xa9b8ff, 0xffa874, 0xf5a0e0];
      for (let i = 0; i < 16; i++) { const a = rr() * 6.283, rad = 0.55 + rr() * 0.75; const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06 + rr() * 0.03, 0), std(fcols[i % 5])); f.position.set(Math.sin(a) * rad, 0.08, Math.cos(a) * rad); grp.add(f); }
      break;
    }
    case 'tents': {
      const cols = [[0xe0715f, 0xfff0dc], [0xf0b24e, 0xfff0dc], [0x6cbfa8, 0xfff0dc]];
      cols.forEach(([c1, c2], i) => {
        const a = (i / 3) * 6.283 + 0.4;
        const t = new THREE.Group();
        const cone = cast(new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 8), std(c1))); cone.position.y = 0.4;
        const skirt = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.15, 8), std(c2))); skirt.position.y = 0.075;
        const flag = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 3), std(c1)); flag.position.y = 0.74; flag.rotation.z = -Math.PI / 2;
        t.add(cone, skirt, flag); t.position.set(Math.sin(a) * 0.62, 0, Math.cos(a) * 0.62); grp.add(t);
      });
      const board = cast(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.05), new THREE.MeshStandardMaterial({ map: labelTexture('活動場次', { w: 256, h: 160 }), roughness: 0.8 })));
      board.position.set(0, 0.62, 0); board.rotation.y = Math.PI * 0.18;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 5), std(0x9a7454)); post.position.y = 0.2;
      grp.add(board, post);
      break;
    }
    case 'kiosk': {
      const body = cast(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 0.6), std(0xfff4e0))); body.position.y = 0.25;
      const awn = cast(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.5), std(0x2fb86a))); awn.position.set(0, 0.56, 0.4); awn.rotation.x = 0.25;
      const counter = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.16), std(0x9a7454)); counter.position.set(0, 0.36, 0.38);
      const sign = cast(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.34, 0.05), new THREE.MeshStandardMaterial({ map: labelTexture('LINE 報名', { w: 320, h: 110, bg: '#e9fbef', fg: '#1f8f4c' }), roughness: 0.8 })));
      sign.position.set(0, 0.95, -0.1);
      const plane = new THREE.Mesh(new THREE.TetrahedronGeometry(0.14, 0), std(0xffffff)); plane.scale.set(1.6, 0.5, 1); plane.position.set(0.7, 1.1, 0);
      anim.push((t) => { plane.position.y = 1.1 + Math.sin(t * 1.4) * 0.08; plane.position.x = 0.7 + Math.sin(t * 0.7) * 0.15; plane.rotation.z = Math.sin(t * 1.4) * 0.2; });
      grp.add(body, awn, counter, sign, plane);
      break;
    }
  }
  return deco;
}
