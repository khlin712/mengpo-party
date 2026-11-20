// 島上的人物：走完整條旅程的導覽員與參加者、各島的角色。全部是示意人物，台詞見 content.js 的 PEOPLE。
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ISLANDS, PEOPLE } from './content.js';
import { TOP, hexCenter, shortestArc, polyline, lerp, clamp } from './lib.js';

const SCALE = 1.5; // 人物放大，遠一點也看得到
const RING = 1.18; // 走路的圈（比小屋更靠內，繞開島中央的造型）
const G = {
  leg: new THREE.BoxGeometry(0.05, 0.14, 0.05),
  torso: new THREE.CylinderGeometry(0.07, 0.085, 0.17, 8),
  head: new THREE.SphereGeometry(0.075, 10, 8),
  hair: new THREE.SphereGeometry(0.082, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.46),
  eye: new THREE.SphereGeometry(0.011, 6, 5),
  arm: new THREE.CylinderGeometry(0.022, 0.022, 0.15, 5),
  robe: new THREE.ConeGeometry(0.13, 0.3, 8),
  hat: new THREE.ConeGeometry(0.15, 0.07, 10),
  ring: new THREE.RingGeometry(0.15, 0.2, 20),
  stick: new THREE.CylinderGeometry(0.01, 0.01, 0.34, 5),
  orb: new THREE.SphereGeometry(0.045, 8, 6),
};
const SKINS = [0xf4d3b5, 0xe8bb98, 0xd9a47e, 0xf7dcc4];
const HAIRS = [0x3b2b24, 0x2a2220, 0x6b4a36, 0x1f1b1a, 0x8a6a4a];
const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true });

function makePerson({ shirt, skin, hair, kind = 'guest' }) {
  const g = new THREE.Group();
  const shirtM = mat(shirt), pants = mat(0x4a4f63), skinM = mat(skin), hairM = mat(hair);
  const parts = [];
  const add = (m) => { parts.push(m); m.castShadow = true; return m; };
  const pivot = (x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); g.add(p); return p; };
  const legL = pivot(-0.03, 0.14), legR = pivot(0.03, 0.14);
  for (const l of [legL, legR]) { const m = add(new THREE.Mesh(G.leg, pants)); m.position.y = -0.07; l.add(m); }
  const torso = add(new THREE.Mesh(kind === 'teacher' ? G.robe : G.torso, shirtM));
  torso.position.y = kind === 'teacher' ? 0.17 : 0.225; g.add(torso);
  if (kind === 'teacher') { const top = add(new THREE.Mesh(G.torso, shirtM)); top.position.y = 0.27; g.add(top); }
  const armL = pivot(-0.1, 0.3), armR = pivot(0.1, 0.3);
  for (const a of [armL, armR]) { const m = add(new THREE.Mesh(G.arm, shirtM)); m.position.y = -0.07; a.add(m); const h = add(new THREE.Mesh(G.orb, skinM)); h.scale.setScalar(0.6); h.position.y = -0.15; a.add(h); }
  const head = add(new THREE.Mesh(G.head, skinM)); head.position.y = 0.39; g.add(head);
  const hairM2 = add(new THREE.Mesh(G.hair, hairM)); hairM2.position.set(0, 0.4, -0.006); hairM2.rotation.x = -0.25; g.add(hairM2);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x241c18 });
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(G.eye, eyeM); e.position.set(sx * 0.028, 0.395, 0.068); head.add(e); e.position.set(sx * 0.028, 0.005, 0.068); }
  let lantern = null;
  if (kind === 'guide') {
    const hat = add(new THREE.Mesh(G.hat, mat(0xe9c46a))); hat.position.y = 0.46; g.add(hat);
    const stick = new THREE.Mesh(G.stick, mat(0x8a5a3c)); stick.position.set(0.13, 0.22, 0.04); g.add(stick);
    lantern = new THREE.Mesh(G.orb, new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb44a, emissiveIntensity: 1.2 }));
    lantern.position.set(0.13, 0.4, 0.04); lantern.scale.setScalar(1.3); g.add(lantern);
  }
  const ring = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; ring.visible = false; g.add(ring);
  g.scale.setScalar(SCALE);
  return { g, legL, legR, armL, armR, head, shirtM, parts, ring, lantern };
}

export function buildPeople({ scene, islands, anim, reg, addGlow, glowMat }) {
  const root = new THREE.Group(); scene.add(root);
  const defs = new Map(PEOPLE.map((p) => [p.id, p]));
  const persons = new Map(); // id → {def, rig, label, group}
  const centers = ISLANDS.map((t) => hexCenter(...t.hex));

  // ── 整條旅程的折線（繞著島上的圈走，過橋時跟著橋的弧度）──────────────
  const pts = []; let firstBridgeEnd = 0;
  ISLANDS.forEach((t, i) => {
    const c = centers[i], prev = centers[i - 1], next = centers[i + 1];
    const aOut = next ? Math.atan2(next.x - c.x, next.z - c.z) : null;
    const aIn = prev ? Math.atan2(prev.x - c.x, prev.z - c.z) : null;
    const a0 = aIn ?? aOut + 2.2, a1 = aOut ?? aIn + 2.2;
    for (const a of shortestArc(a0, a1)) pts.push([c.x + Math.sin(a) * RING, TOP + 0.02, c.z + Math.cos(a) * RING]);
    if (next) {
      const arch = t.id === 'start' ? 0.5 : 0.1;
      const from = pts[pts.length - 1];
      const aInN = Math.atan2(c.x - next.x, c.z - next.z);
      const to = [next.x + Math.sin(aInN) * RING, TOP + 0.02, next.z + Math.cos(aInN) * RING];
      for (let k = 1; k <= 8; k++) { const u = k / 8; pts.push([lerp(from[0], to[0], u), TOP + 0.02 + Math.sin(u * Math.PI) * arch, lerp(from[2], to[2], u)]); }
      if (!firstBridgeEnd) firstBridgeEnd = pts.length - 1;
    }
  });
  const path = polyline(pts);
  const crossD = path.acc[firstBridgeEnd]; // 走過奈何橋的位置

  const mk = (id, look, kind) => {
    const def = defs.get(id);
    const rig = makePerson({ ...look, kind });
    rig.g.traverse((o) => { if (o.isMesh && o.material !== rig.ring.material) reg(o, { kind: 'person', id }); });
    const group = rig.g; root.add(group);
    let label = null;
    if (def.island || id === 'guide') {
      const el = document.createElement('button');
      el.className = 'who'; el.type = 'button'; el.dataset.person = id;
      el.innerHTML = `<b>${def.role}</b><span>${def.line}</span>`;
      el.setAttribute('aria-label', `${def.role}：${def.line}`);
      label = new CSS2DObject(el); label.position.set(0, 0.62, 0); group.add(label);
    }
    persons.set(id, { def, rig, group, label, look });
    return persons.get(id);
  };

  // ── 走路的人 ────────────────────────────────────────────────────────────
  const walkers = [];
  const guide = mk('guide', { shirt: 0xe0674a, skin: SKINS[0], hair: HAIRS[1] }, 'guide');
  walkers.push({ p: guide, speed: 0.55, off: 0.0, guide: true });
  const finals = [0xff8fb0, 0x8fd9c6, 0xffd45e, 0xa9b8ff];
  finals.forEach((c, i) => {
    const id = i === 0 ? 'walker' : 'walker' + i;
    if (i > 0) defs.set(id, { ...defs.get('walker'), id });
    const p = mk(id, { shirt: 0x9aa0a6, skin: SKINS[i % 4], hair: HAIRS[(i + 1) % 5] }, 'guest');
    walkers.push({ p, speed: 0.5 + (i % 2) * 0.06, off: -(i + 1) * 0.11, final: new THREE.Color(c), gray: new THREE.Color(0x9aa0a6) });
  });

  // ── 各島的人（位置相對於島中心；face 是面向的角度，0 面向 +z）──────────
  const SPOTS = {
    stuck: { island: 'start', orbit: true },
    teacher: { island: 'teacher', at: [0, -0.55], faceTo: [0, 0], look: { shirt: 0x2f8f7b }, kind: 'teacher' },
    guest1: { island: 'teacher', at: [0.55, 0.3], faceTo: [0, 0], look: { shirt: 0xf2b5c8 } },
    guest2: { island: 'teacher', at: [-0.55, 0.3], faceTo: [0, 0], look: { shirt: 0xffd9a0 } },
    plant: { island: 'teaching', at: [1.0, 0.4], faceTo: [0, 0], look: { shirt: 0x9fd8c8 } },
    asker: { island: 'questions', at: [0.5, 0.45], faceTo: [0, 0], look: { shirt: 0xc7b6ee }, sway: true },
    asker2: { island: 'questions', at: [-0.55, 0.3], faceTo: [0, 0], look: { shirt: 0xe6d9f7 }, sway: true },
    joy1: { island: 'stories', at: [0.65, 0.5], faceTo: [0.2, 1.4], look: { shirt: 0xff8fb0 }, cheer: true },
    joy2: { island: 'stories', at: [-0.7, 0.55], faceTo: [0, 1.4], look: { shirt: 0xffd45e }, cheer: true },
    plan: { island: 'calendar', at: [-0.2, 0.42], faceTo: [0, 0], look: { shirt: 0xf6d88f } },
    staff: { island: 'signup', at: [-0.78, 0.35], faceTo: [0.3, 0.8], look: { shirt: 0x2fb86a } },
    guest3: { island: 'signup', at: [0.4, 0.82], faceTo: [0, 0.3], look: { shirt: 0xa8dd9a } },
  };
  const statics = [];
  Object.entries(SPOTS).forEach(([id, sp], i) => {
    const idx = ISLANDS.findIndex((t) => t.id === sp.island), c = centers[idx];
    const p = mk(id, { shirt: 0xcccccc, ...(sp.look || {}), skin: SKINS[i % 4], hair: HAIRS[i % 5] }, sp.kind || 'guest');
    if (sp.orbit) { p.look.shirt = 0x9aa0a6; p.rig.shirtM.color.setHex(0x9aa0a6); }
    if (sp.at) {
      p.group.position.set(c.x + sp.at[0], TOP, c.z + sp.at[1]);
      p.group.rotation.y = Math.atan2(sp.faceTo[0] - sp.at[0], sp.faceTo[1] - sp.at[1]);
    }
    statics.push({ p, sp, c, ph: i * 1.7 });
  });

  // ── 動畫 ────────────────────────────────────────────────────────────────
  const gray = new THREE.Color(0x9aa0a6), tmp = new THREE.Color();
  const swing = (r, ph, amp = 0.7) => { r.legL.rotation.x = Math.sin(ph) * amp; r.legR.rotation.x = -Math.sin(ph) * amp; r.armL.rotation.x = -Math.sin(ph) * amp * 0.8; r.armR.rotation.x = Math.sin(ph) * amp * 0.8; };
  anim.push((t) => {
    for (const w of walkers) {
      const d = (((t * w.speed + w.off * path.len) % path.len) + path.len) % path.len;
      const q = path.at(d);
      w.p.group.position.set(q.x, q.y, q.z); w.p.group.rotation.y = q.heading;
      w.p.group.scale.setScalar(SCALE * clamp(Math.min(d, path.len - d) / 1.2, 0.001, 1)); // 起訖處縮小淡出，循環時不會「瞬移」
      swing(w.p.rig, d * 9);
      w.p.group.position.y += Math.abs(Math.sin(d * 9)) * 0.012;
      if (w.final) { const k = clamp((d - (crossD - 0.8)) / 1.6, 0, 1); w.p.rig.shirtM.color.copy(gray).lerp(w.final, k * k * (3 - 2 * k)); }
      if (w.guide && w.p.rig.lantern) w.p.rig.lantern.material.emissiveIntensity = 1 + Math.sin(t * 3) * 0.3;
    }
    for (const s of statics) {
      const { rig, group } = s.p;
      if (s.sp.orbit) { // 在崎嶇島的圈上一圈一圈繞，繞完又回到原地
        const a = -t * 0.5 + s.ph, c = s.c;
        group.position.set(c.x + Math.sin(a) * 1.18, TOP, c.z + Math.cos(a) * 1.18);
        group.rotation.y = a - Math.PI / 2; swing(rig, t * 4, 0.55); group.position.y += Math.abs(Math.sin(t * 4)) * 0.01;
      } else if (s.sp.cheer) {
        rig.armL.rotation.z = -2.5 - Math.sin(t * 4 + s.ph) * 0.3; rig.armR.rotation.z = 2.5 + Math.sin(t * 4 + s.ph + 1) * 0.3;
        group.position.y = TOP + Math.abs(Math.sin(t * 3 + s.ph)) * 0.06;
      } else {
        rig.armR.rotation.x = Math.sin(t * 1.3 + s.ph) * 0.08;
        rig.head.rotation.y = Math.sin(t * 0.7 + s.ph) * (s.sp.sway ? 0.5 : 0.25);
        group.position.y = TOP + Math.sin(t * 1.6 + s.ph) * 0.004;
      }
    }
  });

  function setSelected(id) { for (const [pid, p] of persons) { p.rig.ring.visible = pid === id; p.label?.element.classList.toggle('on', pid === id); } }
  function islandOf(id) { // 走路的人現在在哪座島上
    const p = persons.get(id); if (!p) return null;
    if (p.def.island) return p.def.island;
    let best = null, bd = 1e9;
    ISLANDS.forEach((t, i) => { const d = Math.hypot(centers[i].x - p.group.position.x, centers[i].z - p.group.position.z); if (d < bd) { bd = d; best = t.id; } });
    return best;
  }
  return { root, persons, setSelected, islandOf, path };
}
