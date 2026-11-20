import { ISLANDS } from './content.js';
// 與 three.js 無關的純計算：六角格座標、天空色彩、曲線。Node 可直接測試。
export const SQ3 = Math.sqrt(3);
export const R = 2.0; // 六角格外接圓半徑（尖頂朝 ±z）
export const D = 5.6; // 相鄰島中心距離（> √3·R，留出水道給橋）
export const TOP = 0.5; // 島面高度
export const BRIDGE_ARCH = { plain: 0.1, scary: 0.12, naihe: 0.5 }; // 橋面的弧度（人物走路也用）
export const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];

// 整組島的重心放在原點（只算島，橋不算）
const ISL = ISLANDS.filter((t) => !t.type);
const OX = D * (ISL.reduce((a, t) => a + t.hex[0] + t.hex[1] / 2, 0) / ISL.length);
const OZ = ((D * SQ3) / 2) * (ISL.reduce((a, t) => a + t.hex[1], 0) / ISL.length);
export const hexCenter = (q, r) => ({ x: D * (q + r / 2) - OX, z: ((D * SQ3) / 2) * r - OZ });
export const isAdjacent = (a, b) => NEIGHBORS.some(([q, r]) => q === b[0] - a[0] && r === b[1] - a[1]);
export const hexDistance = (a, b) => {
  const dq = b[0] - a[0], dr = b[1] - a[1];
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
};

// ── 顏色 ─────────────────────────────────────────────────────────────────
export const hexToRgb = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
export const rgbToHex = ([r, g, b]) => (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerpRgb = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// 一天的天空：m 為分鐘（0–1439）。每個關鍵時刻列出天頂、地平線、霧、光色、光強、環境光。
const K = (m, top, bottom, light, lightI, hemiI, night, water) => ({ m, top: hexToRgb(top), bottom: hexToRgb(bottom), light: hexToRgb(light), lightI, hemiI, night, water: hexToRgb(water) });
export const SKY_KEYS = [
  K(0, 0x0b1230, 0x1c2c52, 0x9db4ff, 0.35, 0.28, 1, 0x1f4a66),
  K(300, 0x1a2a5a, 0x5a5f9a, 0x9db4ff, 0.3, 0.3, 0.9, 0x2a5876),
  K(360, 0x6f8fd0, 0xf6b890, 0xffc79a, 0.7, 0.5, 0.35, 0x4d8fa8),
  K(480, 0x7db8ee, 0xdcecf5, 0xfff1d8, 1.25, 0.72, 0, 0x5fb2c8),
  K(720, 0x62aef0, 0xcfe8f8, 0xffffff, 1.5, 0.85, 0, 0x4fb0c9),
  K(960, 0x6fb3ee, 0xd9ecf6, 0xfff4e0, 1.35, 0.8, 0, 0x55b0c6),
  K(1080, 0x7a93d0, 0xf8b98c, 0xffb27a, 0.8, 0.55, 0.3, 0x4f8da6),
  K(1140, 0x45508c, 0xf08a6a, 0xff9a6a, 0.45, 0.4, 0.7, 0x356786),
  K(1230, 0x141c44, 0x2c3a68, 0x9db4ff, 0.32, 0.3, 1, 0x234e6c),
  K(1440, 0x0b1230, 0x1c2c52, 0x9db4ff, 0.35, 0.28, 1, 0x1f4a66),
];
export function skyAt(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  let i = SKY_KEYS.findIndex((k) => k.m > m);
  if (i <= 0) i = 1;
  const a = SKY_KEYS[i - 1], b = SKY_KEYS[i];
  const t = (m - a.m) / (b.m - a.m);
  return {
    top: lerpRgb(a.top, b.top, t), bottom: lerpRgb(a.bottom, b.bottom, t), light: lerpRgb(a.light, b.light, t), water: lerpRgb(a.water, b.water, t),
    lightI: lerp(a.lightI, b.lightI, t), hemiI: lerp(a.hemiI, b.hemiI, t), night: lerp(a.night, b.night, t),
    day: clamp(1 - lerp(a.night, b.night, t) * 1.2, 0, 1),
  };
}
// 太陽（白天）或月亮（夜晚）的位置：東邊升起、西邊落下
export function lightPos(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  const isDay = m >= 360 && m < 1080;
  const a = ((isDay ? m - 360 : m >= 1080 ? m - 1080 : m + 360) / 720) * Math.PI;
  return { isDay, x: Math.cos(a) * 18, y: Math.max(Math.sin(a), 0.1) * 16 + 2, z: 7 };
}
export const fmtClock = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

// ── 曲線 ─────────────────────────────────────────────────────────────────
export function bezier(p0, p1, p2, t) {
  const u = 1 - t;
  return [0, 1, 2].map((i) => u * u * p0[i] + 2 * u * t * p1[i] + t * t * p2[i]);
}
// 兩島之間的弧線：起訖在島上空，控制點抬高
export function arcPoints(a, b, lift = 0.55, h0 = 2.3) {
  const mid = [(a.x + b.x) / 2, 0, (a.z + b.z) / 2];
  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  return [[a.x, h0, a.z], [mid[0], h0 + dist * lift, mid[2]], [b.x, h0, b.z]];
}
// 簡單的可重現亂數
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 人物走路用 ───────────────────────────────────────────────────────────
// 從角度 a0 走到 a1（走較短的那一邊），回傳取樣的角度
export function shortestArc(a0, a1, step = 0.18) {
  let d = a1 - a0;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(d) / step));
  return Array.from({ length: n + 1 }, (_, i) => a0 + (d * i) / n);
}
// 折線：依走過的距離取得位置與朝向
export function polyline(pts) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
  const len = acc[acc.length - 1];
  return {
    len, acc,
    at(d) {
      d = clamp(d, 0, len);
      let i = 1;
      while (i < acc.length - 1 && acc[i] < d) i++;
      const a = pts[i - 1], b = pts[i], seg = acc[i] - acc[i - 1] || 1, u = (d - acc[i - 1]) / seg;
      return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), z: lerp(a[2], b[2], u), heading: Math.atan2(b[0] - a[0], b[2] - a[2]) };
    },
  };
}
