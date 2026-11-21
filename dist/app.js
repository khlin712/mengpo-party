// 孟婆島主程式：畫面、互動、導覽、提綱。內容在 content.js / journey.js，場景在 world.js。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { ISLANDS, FLOWS, GROUPS, ENTRY_ROUTES, CONCERNS, PEOPLE, PEOPLE_NOTE, TOUR, PENDING, dayNote, findIslands, makeOutline, readStored, cueAt } from './content.js';
import { CLASSES, CONTACTS, PRICING, publicFeedback, feedbackSignature, isLink } from './journey.js';
import { easeInOutCubic, FLY_MS } from './motion.js';
import { createResolution } from './resolution.js';
import { fmtClock, clamp } from './lib.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const byId = new Map(ISLANDS.map((i) => [i.id, i]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = () => innerWidth <= 900;
const portrait = () => innerHeight > innerWidth * 1.1;
const STORE = 'mengpo-island-v2';

// ── 狀態 ────────────────────────────────────────────────────────────────
const S = {
  sel: null, step: null, flow: null, person: null, people: true, query: '', groups: new Set(), tab: 'islands',
  entry: '', route: [], saved: [], note: '', visited: new Set(),
  mins: 1110, minsTarget: null, dayPlaying: false, freeze: reduced.matches, bird: false, names: true, pins: true, explore: false,
  tour: { on: false, playing: false, sec: 0, cue: -1 },
};
function load() {
  try {
    const v = readStored(localStorage.getItem(STORE));
    S.saved = Array.isArray(v.saved) ? v.saved.filter((id) => byId.has(id)) : [];
    S.note = typeof v.note === 'string' ? v.note : '';
    S.entry = ENTRY_ROUTES[v.entry] ? v.entry : '';
    S.visited = new Set(Array.isArray(v.visited) ? v.visited.filter((id) => byId.has(id)) : []);
  } catch { /* 無痕模式等情況：不儲存 */ }
  if (S.entry) S.route = ENTRY_ROUTES[S.entry].topics.slice();
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify({ saved: S.saved, note: S.note, entry: S.entry, visited: [...S.visited] })); } catch { /* 忽略 */ }
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.id); toast.id = setTimeout(() => (t.hidden = true), 2200);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { /* 忽略 */ } ta.remove(); return ok;
  }
}

// ── 3D 場景（WebGL 失敗時只留文字介面）────────────────────────────────────
let W = null, renderer, labelRenderer, camera, controls, stage = $('#stage');
let fly = null, dirty = true, userMoved = false;
const res = createResolution({ max: Math.min(devicePixelRatio || 1, 2), min: 1 });

async function initWorld() {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.body.classList.add('no-webgl');
    $('#gl-text').textContent = '這台裝置無法顯示 3D 地圖，但左側清單與卡片都能正常使用。';
    $('#gl-reload').hidden = true; $('#gl-notice').hidden = false;
    return;
  }
  const { buildWorld } = await import('./world.js');
  renderer.setPixelRatio(res.ratio);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  stage.append(renderer.domElement);
  labelRenderer = new CSS2DRenderer(); labelRenderer.domElement.className = 'labels'; stage.append(labelRenderer.domElement);
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 900);
  controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 5, maxDistance: 120, maxPolarAngle: 1.42, minPolarAngle: 0.06, rotateSpeed: 0.7, zoomSpeed: 0.8, panSpeed: 0.8, screenSpacePanning: false });
  controls.addEventListener('start', () => { fly = null; userMoved = true; document.body.classList.add('interacted'); });
  controls.addEventListener('change', () => { dirty = true; const t = controls.target; const l = Math.hypot(t.x, t.z); if (l > 30) { t.x *= 30 / l; t.z *= 30 / l; } });
  W = buildWorld({ stage });
  scene = W.scene;

  // WebGL 中斷：只等一次自動恢復，再次中斷就停下並讓使用者決定，不自動重新整理
  let lost = 0, lastLost = 0;
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    const now = performance.now(); lost = now - lastLost < 120000 ? lost + 1 : 1; lastLost = now;
    $('#gl-text').textContent = lost > 1 ? '3D 畫面又中斷了。清單與卡片仍可使用，需要時可重新整理頁面。' : '3D 畫面暫時中斷，正在等待恢復；清單與卡片仍可使用。';
    $('#gl-reload').hidden = false; $('#gl-notice').hidden = false;
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => { $('#gl-notice').hidden = true; dirty = true; });
  $('#gl-reload').onclick = () => location.reload();

  W.setTime(S.mins);
  resize();
  setupPicking();
  decorateLabels();
}
let scene;

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!renderer || !w || !h) return;
  renderer.setSize(w, h, false); labelRenderer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (!S.sel && !S.flow && !userMoved && !S.tour.on) home(true); else dirty = true;
}
addEventListener('resize', () => { resize(); syncLayout(); });

// ── 鏡頭 ────────────────────────────────────────────────────────────────
const TAN = Math.tan(THREE.MathUtils.degToRad(19));
const viewDir = () => (S.bird ? new THREE.Vector3(0.02, 1, 0.1) : new THREE.Vector3(0.1, 0.8, 0.62)).normalize();
function insets() {
  const r = stage.getBoundingClientRect(), I = { left: 0, right: 0, top: 64, bottom: 0 };
  const shown = (el) => el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
  const side = $('#sidebar'), card = $('#card'), ctrl = $('#controls'), closed = document.body.classList.contains('sidebar-closed');
  if (S.tour.on) { I.bottom = 170; return I; }
  if (narrow()) {
    // 手機：清單與卡片是底部抽屜
    const el = shown(card) ? card : !closed && shown(side) ? side : shown(ctrl) ? ctrl : null;
    if (el) I.bottom = r.bottom - el.getBoundingClientRect().top;
  } else {
    if (!closed && shown(side)) I.left = side.getBoundingClientRect().right - r.left + 8;
    if (shown(card)) I.right = r.right - card.getBoundingClientRect().left + 8;
    if (shown(ctrl)) I.bottom = r.bottom - ctrl.getBoundingClientRect().top + 40;
  }
  return I;
}
// 計算鏡頭位置：讓 focus 點出現在「沒被面板擋住」的區域中央
function frame(focus, halfSize, minDist = 8, dirOver = null) {
  const I = insets(), W0 = stage.clientWidth, H0 = stage.clientHeight;
  const fw = Math.max(200, W0 - I.left - I.right), fh = Math.max(200, H0 - I.top - I.bottom);
  // 世界半寬 w 要塞進 fw 像素：fw/2 · upp ≥ w，其中 upp = 2·dist·TAN / H0
  const dist = clamp(Math.max((halfSize.w * H0) / (fw * TAN), (halfSize.h * Math.max(0.5, (dirOver || viewDir()).y) * H0) / (fh * TAN)) * 1.06, minDist, 110);
  const dir = dirOver || viewDir();
  const upp = (2 * dist * TAN) / H0; // 每像素對應的世界長度
  const fwd = new THREE.Vector3(-dir.x, 0, -dir.z); if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize();
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const sx = (I.left - I.right) / 2, sy = (I.top - I.bottom) / 2;
  // 左側被擋 → 島要往右，target 往左移；底部被擋(sy<0) → 島要往上，target 往鏡頭方向移
  const target = focus.clone().addScaledVector(right, -sx * upp).addScaledVector(fwd, sy * upp / Math.max(dir.y, 0.35));
  return { target, pos: target.clone().addScaledVector(dir, dist) };
}
function moveCamera({ target, pos }, instant = false) {
  if (!camera) return;
  if (instant || reduced.matches) { camera.position.copy(pos); controls.target.copy(target); controls.update(); fly = null; dirty = true; return; }
  fly = { t0: performance.now(), fp: camera.position.clone(), tp: pos, ft: controls.target.clone(), tt: target };
}
function home(instant = false) {
  if (!camera) return;
  userMoved = false;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const r of W.islands.values()) { x0 = Math.min(x0, r.center.x); x1 = Math.max(x1, r.center.x); z0 = Math.min(z0, r.center.z); z1 = Math.max(z1, r.center.z); }
  const mid = new THREE.Vector3((x0 + x1) / 2, 0.4, (z0 + z1) / 2);
  if (portrait() && !S.bird) {
    // 直式螢幕：一條很長的路放不進窄寬度，改成站在起點往前看，路一路延伸到遠方
    const v = new THREE.Vector3(-1, 0.8, 0.06).normalize();
    moveCamera(frame(mid, { w: 6.5, h: (x1 - x0) / 2 + 10 }, 14, v), instant);
    return;
  }
  moveCamera(frame(mid, { w: (x1 - x0) / 2 + 5, h: (z1 - z0) / 2 + 3.0 }, 14), instant);
}
function flyToIsland(id, instant = false) {
  if (!W) return;
  const rec = W.islands.get(id), c = rec.center.clone().setY(0.7);
  // 往前看：視野偏向「下一站」，讓人有一步一步往前走的感覺；最後一站才置中
  const cur = byId.get(id), next = ISLANDS.find((t) => t.n === cur.n + 1), nrec = next && W.islands.get(next.id);
  if (nrec && !S.bird) {
    // 站在這一站的「後面」往前看：這一站在近處，後面的橋與島一路遠去
    const dir = nrec.center.clone().sub(rec.center).setY(0).normalize();
    c.addScaledVector(dir, rec.bridge ? 2.2 : 2.6);
    const v = dir.clone().multiplyScalar(-0.85).add(new THREE.Vector3(0, 0.55, 0.5)).normalize();
    moveCamera(frame(c, { w: 4.4, h: 3.2 }, 10, v), instant);
    return;
  }
  moveCamera(frame(c, rec.bridge ? { w: 3.4, h: 3.0 } : { w: 5.6, h: 4.6 }, rec.bridge ? 8 : 11), instant);
}

// ── 選取 ────────────────────────────────────────────────────────────────
function markVisited(id) { if (!S.visited.has(id)) { S.visited.add(id); save(); } }
function setHash(v) { try { history.replaceState(null, '', v ? '#' + v : location.pathname + location.search); } catch { /* 忽略 */ } }
function selectIsland(id, { step = null, fly = true } = {}) {
  if (!byId.has(id)) return;
  closeHome();
  S.sel = id; S.step = step; S.flow = null; setPerson(null);
  if (!S.tour.on) markVisited(id);
  setHash(id + (step !== null ? '/' + (step + 1) : ''));
  showCard(); refresh();
  if (fly) { syncLayout(); flyToIsland(id); }
}
function closeCard() {
  const had = S.sel || S.flow || S.person;
  S.sel = S.step = S.flow = null; setPerson(null); setHash('');
  $('#card').hidden = true; document.body.classList.remove('card-open');
  refresh(); if (had) { syncLayout(); home(); }
}
function showCard() {
  const card = $('#card'); card.hidden = false; document.body.classList.add('card-open');
  $('#card-content').innerHTML = S.person ? personCard() : S.step !== null ? stepCard() : islandCard();
  card.scrollTop = 0;
  if (narrow()) { card.classList.remove('tall'); $('#sidebar').classList.remove('tall'); }
}

function setPerson(id) { S.person = id; if (W) W.people.setSelected(id); }
function selectPerson(id) {
  const p = W?.people.persons.get(id); if (!p) return;
  const isl = W.people.islandOf(id);
  S.person = id; S.sel = isl; S.step = null; S.flow = null; W.people.setSelected(id);
  if (isl && !S.tour.on) markVisited(isl);
  setHash(''); showCard(); refresh(); syncLayout(); if (isl) flyToIsland(isl);
}
// ── 卡片內容 ────────────────────────────────────────────────────────────
const chipHtml = (id) => { const t = byId.get(id); return `<button class="chip" style="--c:${t.color}" data-island="${t.id}"><i>${t.n}</i>${esc(t.short)}</button>`; };
function routeBar(id) {
  const i = S.route.indexOf(id);
  if (i < 0) return '';
  const prev = S.route[i - 1], next = S.route[i + 1];
  return `<div class="routebar"><span>${esc(ENTRY_ROUTES[S.entry].label)}路線　${i + 1} / ${S.route.length}</span>${prev ? `<button data-island="${prev}">← ${esc(byId.get(prev).short)}</button>` : ''}${next ? `<button data-island="${next}">${esc(byId.get(next).short)} →</button>` : ''}</div>`;
}
function special(t) {
  if (t.id === 'stories') {
    const fb = publicFeedback();
    return `<h3>客戶回饋</h3>${fb.length ? fb.map((f) => `<div class="feedback" style="--c:${t.color}">「${esc(f.text)}」<small>${esc(feedbackSignature(f))}</small></div>`).join('') : `<div class="todo">${PENDING}。取得本人同意後才會放上來；目前不展示任何虛構的回饋、案例或數字。</div>`}`;
  }
  if (t.id === 'calendar') {
    return `<h3>近期場次</h3>${CLASSES.length ? `<table class="cls"><tbody>${CLASSES.map((c) => `<tr><td>${esc(c.grade)}</td><td>${esc(c.schedule || '')}</td><td>${esc(c.note || (c.status === 'open' ? '可報名' : ''))}</td></tr>`).join('')}</tbody></table>` : `<div class="todo">近期場次${PENDING}。先私訊 LINE 詢問也可以。</div>`}<h3>費用與名額</h3><ul>${PRICING.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>`;
  }
  if (t.id === 'signup') {
    const c = CONTACTS[0], ok = c && isLink(c.href);
    return `<div class="btn-row">${ok ? `<a class="btn line" href="${esc(c.href)}" target="_blank" rel="noopener">私訊 LINE 官方帳號</a>` : `<a class="btn line" aria-disabled="true">連結待老師提供</a>`}</div>`;
  }
  return '';
}
function islandCard() {
  const t = byId.get(S.sel), saved = S.saved.includes(t.id);
  const concerns = CONCERNS.filter((c) => c.topic === t.id);
  return `<div style="--c:${t.color}">
    ${routeBar(t.id)}
    <div class="eyebrow">${t.type ? '橋' : 'NO.'}${String(t.n).padStart(2, '0')}　<span class="tagc">${esc(t.tag)}</span></div>
    <h2>${esc(t.title)}</h2><p class="lead">${esc(t.intro)}</p>
    <div class="btn-row"><button class="btn" data-act="save">${saved ? '★ 已在我的提綱' : '☆ 加入我的提綱'}</button><button class="btn ghost" data-act="share">複製這座島的連結</button></div>
    <p>${esc(t.body)}</p>
    <h3>重點（點一個看細節）</h3>
    <ol class="step-list">${t.steps.map((s, i) => `<li><button data-step="${i}"><b>${i + 1}</b><span>${esc(s.label)}<small>${esc(s.q)}</small></span></button></li>`).join('')}</ol>
    ${special(t)}
    <h3>基本資料</h3><dl class="facts">${t.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    <div class="ask"><h3>這座島在問你</h3><p><b>${esc(t.task)}</b></p><p class="ex">${esc(t.example)}</p></div>
    ${concerns.length ? `<h3>你可能想問</h3>${concerns.map((c) => `<details class="q"><summary>${esc(c.q)}</summary><p>${esc(c.a)}</p></details>`).join('')}` : ''}
    ${PEOPLE.some((x) => x.island === t.id) ? `<h3>島上的人（示意）</h3>${PEOPLE.filter((x) => x.island === t.id).map((x) => `<button class="chip" style="--c:${t.color}" data-person="${x.id}"><i>人</i>${esc(x.role)}</button>`).join('')}` : ''}
  </div>`;
}
function personCard() {
  const p = W.people.persons.get(S.person), d = p.def, t = d.island ? byId.get(d.island) : byId.get(W.people.islandOf(S.person));
  return `<div style="--c:${t.color}">
    <div class="eyebrow">島上的人　<span class="tagc">${esc(d.role)}</span></div>
    <h2>${esc(d.name)}</h2>
    <blockquote class="say">「${esc(d.line)}」</blockquote>
    <p class="note">${esc(PEOPLE_NOTE)}</p>
    <div class="btn-row">${d.action === 'tour' ? '<button class="btn" data-act="tour">▶ 跟著導覽員走一圈</button>' : ''}<button class="btn ghost" data-island="${t.id}">看「${esc(t.short)}」的介紹</button></div>
    <h3>這座島的其他人</h3>${PEOPLE.filter((x) => x.island === t.id && x.id !== d.id).map((x) => `<button class="chip" style="--c:${t.color}" data-person="${x.id}"><i>人</i>${esc(x.role)}</button>`).join('') || '<p class="note">這裡沒有其他人。</p>'}
  </div>`;
}
function stepCard() {
  const t = byId.get(S.sel), st = t.steps[S.step], n = t.steps.length;
  return `<div style="--c:${t.color}">
    <button class="crumb" data-act="back">← ${esc(t.short)}</button>
    <div class="eyebrow">重點 ${S.step + 1} / ${n}　<span class="tagc">${esc(st.label)}</span></div>
    <h2>${esc(st.label)}</h2>
    <p class="q-big">${esc(st.q)}</p>
    ${st.body ? `<p>${esc(st.body)}</p>` : `<div class="todo">這個重點的完整說明，歡迎私訊 LINE 詢問老師；正式說法由老師補充。</div>`}
    <div class="ask"><h3>帶著這個問題</h3><p>${esc(t.task)}</p></div>
    <div class="btn-row">${S.step > 0 ? `<button class="btn ghost" data-step="${S.step - 1}">← 上一個</button>` : ''}${S.step < n - 1 ? `<button class="btn" data-step="${S.step + 1}">下一個 →</button>` : `<button class="btn" data-act="back">回到島的介紹</button>`}</div>
  </div>`;
}

// 卡片事件（事件委派）
$('#card-content').addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.step !== undefined) return selectIsland(S.sel, { step: +b.dataset.step, fly: false });
  if (b.dataset.person) return selectPerson(b.dataset.person);
  if (b.dataset.act === 'tour') return startTour();
  if (b.dataset.island) return selectIsland(b.dataset.island);
  if (b.dataset.act === 'back') return selectIsland(S.sel, { fly: false });
  if (b.dataset.act === 'save') { toggleSaved(S.sel); showCard(); }
  if (b.dataset.act === 'share') toast((await copy(location.origin + location.pathname + '#' + S.sel)) ? '已複製連結' : '複製失敗，請手動複製網址');
});
$('#card-close').onclick = closeCard;
$('#card-handle').onclick = () => $('#card').classList.toggle('tall');
$('#sheet-handle').onclick = () => $('#sidebar').classList.toggle('tall');

function toggleSaved(id) {
  const i = S.saved.indexOf(id);
  if (i >= 0) S.saved.splice(i, 1); else S.saved.push(id);
  save(); renderSide(); toast(i >= 0 ? '已從提綱移除' : '已加入我的提綱');
}

// ── 側邊清單 ────────────────────────────────────────────────────────────
function renderRouteChips() {
  $('#route-chips').innerHTML = Object.entries(ENTRY_ROUTES).map(([k, r]) => `<button type="button" data-entry="${k}" aria-pressed="${S.entry === k}" title="${esc(r.intro)}">${esc(r.label)}</button>`).join('');
}
$('#route-chips').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  setEntry(S.entry === b.dataset.entry ? '' : b.dataset.entry, true);
});
function setEntry(key, go) {
  S.entry = key; S.route = key ? ENTRY_ROUTES[key].topics.slice() : []; save();
  renderRouteChips(); refresh();
  if (key) { toast(ENTRY_ROUTES[key].intro); if (go) selectIsland(S.route[0]); } else if (S.sel) showCard();
}
function renderSide() {
  const body = $('#side-body');
  $$('#sidebar .side-tabs button').forEach((b) => { const on = b.id === 'tab-' + S.tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
  $('#outline-count').textContent = S.saved.length ? `(${S.saved.length})` : '';
  if (S.tab === 'islands') {
    const hit = new Set(findIslands(S.query, [...S.groups]).map((t) => t.id));
    body.innerHTML = ISLANDS.map((t) => {
      const on = S.sel === t.id, dim = !hit.has(t.id);
      return `<section class="isl${on ? ' on' : ''}${dim && (S.query || S.groups.size) ? ' hide' : ''}" style="--c:${t.color}">
        <button class="isl-h" data-island="${t.id}" aria-expanded="${on}"><i>${t.n}</i><span>${esc(t.title)}<small>${t.type ? '橋　·　' : ''}${esc(t.tag)}</small></span>${S.visited.has(t.id) ? '<em>已看</em>' : ''}</button>
        <ol class="steps">${t.steps.map((s, i) => `<li><button data-island="${t.id}" data-step="${i}" class="${on && S.step === i ? 'on' : ''}"><b>${i + 1}</b>${esc(s.label)}：${esc(s.q)}</button></li>`).join('')}</ol></section>`;
    }).join('') || '';
    if (!hit.size) body.innerHTML = `<p class="empty">找不到「${esc(S.query)}」。試試別的關鍵字，或直接私訊 LINE 詢問。</p>`;
  } else {
    const roleLabel = S.entry ? ENTRY_ROUTES[S.entry].role : '';
    body.innerHTML = `<div class="outline"><p class="empty" style="padding:4px 0">在島的卡片按「加入我的提綱」，再寫下你的情況，複製後貼到 LINE 官方帳號。內容只存在這個瀏覽器，網站不會代你傳送。</p>
      <h3>想聊的主題</h3>${S.saved.length ? `<ul class="saved-list">${S.saved.map((id) => `<li><span>${esc(byId.get(id).title)}</span><button data-unsave="${id}" aria-label="移除">×</button></li>`).join('')}</ul>` : '<p class="empty" style="padding:4px 0">還沒有收藏。</p>'}
      <h3>我的情況與問題</h3><textarea id="note" placeholder="例如：我和孩子的關係一直卡住，想先了解適不適合參加…">${esc(S.note)}</textarea>
      <h3>提綱預覽</h3><pre id="outline-pre">${esc(makeOutline({ role: roleLabel, ids: S.saved, note: S.note }))}</pre>
      <div class="btn-row"><button class="btn" id="copy-outline">複製提綱</button></div></div>`;
  }
}
$('#side-body').addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.island) return selectIsland(b.dataset.island, { step: b.dataset.step !== undefined ? +b.dataset.step : null });
  if (b.dataset.unsave) { toggleSaved(b.dataset.unsave); return; }
  if (b.id === 'copy-outline') toast((await copy($('#outline-pre').textContent)) ? '提綱已複製，貼到 LINE 就可以了' : '複製失敗，請手動選取文字');
});
$('#side-body').addEventListener('input', (e) => {
  if (e.target.id === 'note') { S.note = e.target.value; save(); $('#outline-pre').textContent = makeOutline({ role: S.entry ? ENTRY_ROUTES[S.entry].role : '', ids: S.saved, note: S.note }); }
});
$$('#sidebar .side-tabs button').forEach((b) => (b.onclick = () => { S.tab = b.id.slice(4); renderSide(); }));
$('#search').addEventListener('input', (e) => { S.query = e.target.value; S.tab = 'islands'; refresh(); });

// ── 下方面板 ────────────────────────────────────────────────────────────
$$('.control-tabs [data-panel]').forEach((b) => (b.onclick = () => {
  $$('.control-tabs [data-panel]').forEach((x) => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-selected', on); });
  $$('.panel').forEach((p) => p.classList.toggle('active', p.id === 'panel-' + b.dataset.panel));
  syncLayout();
}));
function renderPanels() {
  $('#stops').innerHTML = ISLANDS.map((t) => `<button type="button" data-island="${t.id}" class="${S.sel === t.id ? 'on' : ''}${S.visited.has(t.id) ? ' seen' : ''}">${t.n} ${esc(t.short)}</button>`).join('');
  $('#group-buttons').innerHTML = GROUPS.map((g) => `<button type="button" data-group="${esc(g)}" aria-pressed="${S.groups.has(g)}">${esc(g)}</button>`).join('');
}
$('#stops').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) selectIsland(b.dataset.island); });
$('#group-buttons').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const g = b.dataset.group; S.groups.has(g) ? S.groups.delete(g) : S.groups.add(g); refresh();
});
$('#day').addEventListener('input', (e) => { S.dayPlaying = false; S.minsTarget = null; S.mins = +e.target.value; updateDay(); });
$$('.presets button').forEach((b) => (b.onclick = () => { S.dayPlaying = false; S.minsTarget = +b.dataset.time; syncPlay(); }));
$('#day-play').onclick = () => { S.dayPlaying = !S.dayPlaying; S.minsTarget = null; syncPlay(); };
function syncPlay() { $('#day-play').textContent = S.dayPlaying ? '❚❚' : '▶'; $('#day-play').setAttribute('aria-label', S.dayPlaying ? '暫停' : '播放一天'); }
let skyCache = null;
function updateDay() {
  const m = ((S.mins % 1440) + 1440) % 1440;
  $('#clock').textContent = fmtClock(m); $('#day').value = Math.floor(m); $('#day-note').textContent = dayNote(m);
  if (W) skyCache = W.setTime(m);
  dirty = true;
}

// 顯示切換
$$('.hud [data-toggle]').forEach((b) => (b.onclick = () => {
  const k = b.dataset.toggle; const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on);
  if (k === 'names') { S.names = on; stage.classList.toggle('hide-plates', !on); }
  if (k === 'pins') { S.pins = on; stage.classList.toggle('hide-pins', !on); }
  if (k === 'people') { S.people = on; if (W) W.people.root.visible = on; stage.classList.toggle('hide-who', !on); }
  if (k === 'freeze') { S.freeze = on; }
  if (k === 'bird') { S.bird = on; if (S.sel) flyToIsland(S.sel); else home(); }
}));
$('#home').onclick = () => { if (S.tour.on) stopTour(); if (S.sel || S.flow || S.person) closeCard(); else home(); };
$('#sidebar-toggle').onclick = () => { const closed = document.body.classList.toggle('sidebar-closed'); $('#sidebar-toggle').setAttribute('aria-expanded', !closed); setTimeout(() => { syncLayout(); if (S.sel) flyToIsland(S.sel); else if (!userMoved) home(); }, 320); };
function syncLayout() {
  const h = $('#controls').offsetHeight;
  document.documentElement.style.setProperty('--ctrl-h', h + 'px');
  $('#hud').style.bottom = h + 26 + 'px';
}

// ── 視覺狀態：淡化、高亮、關聯線、迷霧 ──────────────────────────────────
const vis = new Map(ISLANDS.map((t) => [t.id, { dim: 0, dimT: 0, hl: 0, hlT: 0, mist: 1, hover: 0 }]));
let hoverId = null;
function refresh() {
  renderSide(); renderPanels(); applyVisualTargets(); syncLayout();
  $('#stage').classList.toggle('hide-plates', !S.names);
}
function applyVisualTargets() {
  const filtering = S.query.trim() || S.groups.size;
  const hit = new Set(findIslands(S.query, [...S.groups]).map((t) => t.id));
  for (const t of ISLANDS) {
    const v = vis.get(t.id);
    v.dimT = filtering && !hit.has(t.id) ? 1 : 0;
    v.hlT = S.sel === t.id ? 1 : 0;
    if (W) {
      const rec = W.islands.get(t.id);
      rec.plate.classList.toggle('dim', v.dimT > 0); rec.plate.classList.toggle('on', S.sel === t.id);
      const rank = S.route.indexOf(t.id);
      if (rank >= 0) rec.plate.dataset.route = '★' + (rank + 1); else delete rec.plate.dataset.route;
      rec.pins.forEach((p, i) => { p.classList.toggle('show', S.sel === t.id); p.classList.toggle('on', S.sel === t.id && S.step === i); p.classList.toggle('dim', v.dimT > 0); });
    }
  }
  if (W) {
    W.flowGroup.visible = false; // 關聯線已從介面移除
    const tourFlows = S.tour.on ? new Set(TOUR.cues[Math.max(0, S.tour.cue)].flows) : null;
    for (const f of W.flows.values()) {
      const d = f.def; let tgt;
      if (S.tour.on) tgt = tourFlows.has(d.id) ? 0.95 : 0.1;
      else if (S.flow) tgt = d.id === S.flow ? 1 : 0.12;
      else if (S.sel) tgt = 0;
      else tgt = 0.4;
      f.target = tgt;
    }
  }
  dirty = true;
}
function stepVisuals() {
  if (!W) return;
  for (const [id, v] of vis) {
    const hl = Math.max(v.hlT, v.hover);
    const mistT = S.visited.has(id) || S.sel === id ? 0 : 1;
    let ch = false;
    if (Math.abs(v.dim - v.dimT) > 0.01 || Math.abs(v.hl - hl) > 0.01) { v.dim += (v.dimT - v.dim) * 0.15; v.hl += (hl - v.hl) * 0.2; ch = true; }
    if (Math.abs(v.mist - mistT) > 0.005) { v.mist += (mistT - v.mist) * 0.04; ch = true; }
    if (ch) W.setIslandState(id, { dim: v.dim, hl: v.hl, mist: v.mist });
  }
}

// ── 點選與懸停 ──────────────────────────────────────────────────────────
function setupPicking() {
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; document.body.append(tip);
  const pick = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(W.pickables, false).find((x) => x.object.visible !== false && !(x.object.userData.kind === 'flow' && !W.flowGroup.visible));
    return h ? h.object.userData : null;
  };
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || performance.now() - down.t > 600) return;
    const d = pick(e); if (!d) return;
    if (S.tour.on) return;
    if (d.kind === 'person') selectPerson(d.id);
    else if (d.kind === 'step') selectIsland(d.id, { step: d.step });
    else selectIsland(d.id);
  });
  let last = 0;
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || e.buttons || performance.now() - last < 50) return; last = performance.now();
    const d = pick(e); const id = d && d.kind !== 'flow' && d.kind !== 'person' ? d.id : null;
    renderer.domElement.style.cursor = d ? 'pointer' : 'grab';
    if (id !== hoverId) { if (hoverId) vis.get(hoverId).hover = 0; hoverId = id; if (id) vis.get(id).hover = 0.6; }
    tip.hidden = !d; if (d) { const t = d.kind === 'person' ? W.people.persons.get(d.id).def.role : d.kind === 'flow' ? FLOWS.find((f) => f.id === d.id).label : d.kind === 'step' ? byId.get(d.id).steps[d.step].label : byId.get(d.id).title; tip.textContent = t; tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; }
  });
  renderer.domElement.addEventListener('pointerleave', () => { tip.hidden = true; if (hoverId) vis.get(hoverId).hover = 0; hoverId = null; });
}
// 名牌與圖釘是 HTML 按鈕
function decorateLabels() {
  stage.addEventListener('click', (e) => {
    const b = e.target.closest('.plate,.pin,.who'); if (!b || S.tour.on) return;
    if (b.dataset.person) return selectPerson(b.dataset.person);
    selectIsland(b.dataset.island, { step: b.dataset.step !== undefined ? +b.dataset.step : null });
  });
}

// ── 自動導覽 ────────────────────────────────────────────────────────────
function startTour() {
  closeHome();
  $('#card').hidden = true; document.body.classList.remove('card-open');
  S.sel = S.step = S.flow = null; setHash('');
  Object.assign(S.tour, { on: true, playing: !reduced.matches, sec: 0, cue: -1 });
  document.body.classList.add('tour'); S.dayPlaying = false;
  syncTourButtons(); updateTour(true); resize();
}
function stopTour() {
  S.tour.on = false; S.tour.playing = false; document.body.classList.remove('tour');
  S.sel = null; S.minsTarget = 1110; refresh(); syncLayout(); home();
}
function syncTourButtons() { $('#tour-pause').textContent = S.tour.playing ? '暫停' : '播放'; }
function updateTour(force = false) {
  const n = cueAt(TOUR.cues, S.tour.sec);
  $('#tour-time').textContent = `${String(Math.min(TOUR.total, Math.floor(S.tour.sec))).padStart(2, '0')} / ${TOUR.total}`;
  if (n === S.tour.cue && !force) return;
  S.tour.cue = n; const cue = TOUR.cues[n];
  S.sel = cue.target === 'all' ? null : cue.target;
  if (S.sel) markVisited(S.sel);
  S.minsTarget = cue.mins;
  $('#tour-caption').innerHTML = `<div>${esc(cue.caption)}</div>`;
  if (cue.target === 'all') home(); else flyToIsland(cue.target);
  refresh();
}
$('#tour-start').onclick = startTour;
$('#tour-pause').onclick = () => { S.tour.playing = !S.tour.playing; if (S.tour.sec >= TOUR.total) S.tour.sec = 0; syncTourButtons(); };
$('#tour-replay').onclick = startTour;
$('#tour-exit').onclick = stopTour;

addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('#signup').hidden) closeSignup(); else if (!$('#home-page').hidden) closeHome(); else if (S.tour.on) stopTour(); else if (!$('#card').hidden) closeCard();
});

// ── 首頁（白話說明＋完整文字版）與報名視窗 ─────────────────────────────────
const homeEl = $('#home-page');
const lineBtn = (cls = 'btn line') => {
  const c = CONTACTS[0];
  return c && isLink(c.href) ? `<a class="${cls}" href="${esc(c.href)}" target="_blank" rel="noopener">私訊 LINE 官方帳號</a>` : `<span class="${cls}" aria-disabled="true">LINE 連結${PENDING}</span>`;
};
function signupHtml() {
  const rows = CLASSES.length
    ? `<table class="cls"><tbody>${CLASSES.map((c) => `<tr><td>${esc(c.grade)}</td><td>${esc(c.schedule || '')}</td><td>${esc(c.note || (c.status === 'open' ? '可報名' : ''))}</td></tr>`).join('')}</tbody></table>`
    : `<div class="todo">近期場次${PENDING}。你可以先私訊 LINE 官方帳號詢問。</div>`;
  return `<h3>近期場次</h3>${rows}
    <h3>費用、名額與條件</h3><ul>${PRICING.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
    <h3>怎麼報名</h3><p>不用填表單：先私訊 LINE 官方帳號，由老師回覆並提供報名連結。還沒決定也可以先問。</p>
    <div class="btn-row">${lineBtn()}</div>`;
}
function textNodeHtml(t) {
  const extra = t.id === 'stories' ? (publicFeedback().length ? publicFeedback().map((f) => `<div class="feedback">「${esc(f.text)}」<small>${esc(feedbackSignature(f))}</small></div>`).join('') : `<div class="todo">客戶回饋與前、中、後案例${PENDING}；取得本人同意後才會放上來。</div>`) : '';
  return `<article class="tx" style="--c:${t.color}">
    <div class="eyebrow">第 ${t.n} 站　${t.type ? '橋' : '島'}：${esc(t.short)}</div>
    <h3>${esc(t.title)}</h3><p class="lead">${esc(t.intro)}</p><p>${esc(t.body)}</p>
    <ul class="tx-steps">${t.steps.map((x) => `<li><b>${esc(x.label)}</b>：${esc(x.q)}${x.body ? ' ' + esc(x.body) : ''}</li>`).join('')}</ul>
    ${extra}
    <p class="tx-task"><b>這一站在問你：</b>${esc(t.task)}</p>
    <button class="btn ghost" type="button" data-map="${t.id}">在地圖上看這一站 →</button></article>`;
}
function renderHome() {
  const facts = PRICING.questions.map((q) => { const [k, ...v] = q.split('：'); return `<div><dt>${esc(k)}</dt><dd>${esc(v.join('：'))}</dd></div>`; }).join('');
  homeEl.innerHTML = `
    <div class="page-top"><span class="logo"><span class="mark">婆</span><span class="words"><b>孟婆茶會</b><small>看見卡點，走出迴圈</small></span></span><button class="btn cta" type="button" data-act="signup">報名／場次</button></div>
    <div class="page-inner">
      <header class="p-hero">
        <div class="eyebrow">孟婆茶會</div>
        <h1>用「上帝視角」，<br>看見自己卡住的地方</h1>
        <p class="p-lead">人生常常卡在迴圈裡：同樣的事一再發生，卻不知道到底卡在哪。孟婆茶會在活動中，陪你換一個更高的角度，看清楚那個卡點。</p>
        <div class="p-cta"><button class="btn big" type="button" data-act="signup">看場次與報名</button><button class="btn big ghost" type="button" data-act="map">用地圖探索 →</button></div>
        <p class="p-sub"><button class="linkish" type="button" data-act="text">只想看文字？直接看完整介紹 ↓</button></p>
      </header>
      <div class="p-cards">
        <section><h2>適合誰</h2><p>18 歲以上、正在迷茫或想找人生方向的人。最常見的是關係問題（愛情、夫妻、親子），也有金錢、身體健康與事業。沒有其他申請條件，只是迷茫也可以來。</p></section>
        <section><h2>現場做什麼</h2><p>茶會以「植物能量」帶領你，從更高的角度，看見人生卡在哪個環節，以及那個卡點如何一路影響到現在。</p></section>
        <section><h2>怎麼進行</h2><p>不是法事，不是催眠，也不是別人說故事給你聽。你全程清醒，從自己的第一視角去看。流程為示意，實際安排以老師說明為準。</p></section>
      </div>
      <dl class="p-facts">${facts}</dl>
      <section class="p-route"><h2>你最在意哪一種問題？</h2><p>選一個，我幫你排好參觀順序，直接帶你到地圖。</p><div>${Object.entries(ENTRY_ROUTES).map(([k, v]) => `<button type="button" class="btn ghost" data-entry="${k}">${esc(v.label)}</button>`).join('')}</div></section>
      <section id="p-faq"><h2>常見疑問</h2>${CONCERNS.map((c) => `<details class="q"><summary>${esc(c.q)}</summary><p>${esc(c.a)}</p></details>`).join('')}</section>
      <section id="p-text"><h2>完整介紹（文字版）</h2><p class="p-note">依旅程順序，從人生卡住的地方，一路走到報名。互動地圖的內容和這裡相同。</p>${ISLANDS.map(textNodeHtml).join('')}</section>
      <section id="p-signup"><h2>場次與報名</h2>${signupHtml()}</section>
      <p class="p-foot">你寫下的提綱只存在這個瀏覽器，網站不會代你傳送任何訊息，也沒有追蹤程式。</p>
    </div>
    <div class="p-bar"><button class="btn" type="button" data-act="signup">報名／場次</button><button class="btn ghost" type="button" data-act="map">用地圖探索 →</button></div>`;
}
let homeBuilt = false;
function openHome(anchor) {
  if (!homeBuilt) { renderHome(); homeBuilt = true; }
  homeEl.hidden = false; document.body.classList.add('page-open');
  homeEl.scrollTop = 0; if (anchor) $('#' + anchor, homeEl)?.scrollIntoView();
}
function closeHome() { if (homeEl.hidden) return; homeEl.hidden = true; document.body.classList.remove('page-open'); }
homeEl.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.act === 'signup') openSignup();
  else if (b.dataset.act === 'map') { closeHome(); S.sel = null; setHash(''); home(); }
  else if (b.dataset.act === 'text') $('#p-text', homeEl).scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
  else if (b.dataset.map) selectIsland(b.dataset.map);
  else if (b.dataset.entry) { closeHome(); setEntry(b.dataset.entry, true); }
});
function openSignup() { $('#signup-body').innerHTML = signupHtml(); $('#signup').hidden = false; $('#signup-close').focus(); }
function closeSignup() { $('#signup').hidden = true; }
$('#signup-open').onclick = openSignup;
$('#signup-close').onclick = closeSignup;
$('#signup').addEventListener('click', (e) => { if (e.target.id === 'signup') closeSignup(); });
$('#open-home').onclick = () => openHome();
$('#explore-toggle').onclick = () => {
  S.explore = !S.explore; document.body.classList.toggle('explore', S.explore);
  $('#explore-toggle').setAttribute('aria-pressed', S.explore);
  syncLayout(); if (S.sel) flyToIsland(S.sel); else if (!userMoved) home();
};

// ── 網址 #island/step ───────────────────────────────────────────────────
function fromHash(first = false) {
  const [id, st] = decodeURIComponent(location.hash.slice(1)).split('/');
  if (id === 'text') return openHome('p-text');
  if (byId.has(id)) selectIsland(id, { step: st && byId.get(id).steps[+st - 1] ? +st - 1 : null, fly: true });
  else if (!first && S.sel) closeCard();
}
addEventListener('hashchange', () => fromHash());

// ── 主迴圈 ──────────────────────────────────────────────────────────────
let lastT = performance.now(), frames = 0;
function hideLoading() { const l = $('#loading'); if (!l) return; l.classList.add('done'); setTimeout(() => l.remove(), 700); }
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastT) / 1000), frameMs = now - lastT; lastT = now;
  if (document.hidden) return;
  if (S.dayPlaying && !S.freeze) { S.mins += dt * 60; updateDay(); }
  if (S.minsTarget !== null) {
    let d = S.minsTarget - S.mins; if (d > 720) d -= 1440; if (d < -720) d += 1440;
    if (Math.abs(d) < 1) { S.mins = S.minsTarget; S.minsTarget = null; } else S.mins += d * Math.min(1, dt * 3);
    updateDay();
  }
  if (S.tour.on && S.tour.playing) { S.tour.sec += dt; if (S.tour.sec >= TOUR.total) { S.tour.sec = TOUR.total; S.tour.playing = false; syncTourButtons(); } updateTour(); }
  if (!W) return;
  if (fly) {
    const u = clamp((now - fly.t0) / FLY_MS, 0, 1), e = easeInOutCubic(u);
    camera.position.lerpVectors(fly.fp, fly.tp, e); controls.target.lerpVectors(fly.ft, fly.tt, e);
    if (u >= 1) fly = null;
  }
  controls.update();
  stepVisuals();
  W.update(dt, S.freeze, skyCache || (skyCache = W.setTime(S.mins)));
  const camD = camera.position.distanceTo(controls.target);
  stage.classList.toggle('near', camD < 15); stage.classList.toggle('far', narrow() && camD > 26);
  renderer.render(scene, camera); labelRenderer.render(scene, camera);
  if (++frames === 3) hideLoading();
  const nr = res.sample(now, frameMs, document.hidden);
  if (nr) renderer.setPixelRatio(nr);
}

// ── 啟動 ────────────────────────────────────────────────────────────────
async function boot() {
  load(); renderRouteChips(); renderSide(); renderPanels(); syncPlay(); $('#day-note').textContent = dayNote(S.mins);
  if (narrow()) document.body.classList.add('sidebar-closed');
  $('#sidebar-toggle').setAttribute('aria-expanded', !document.body.classList.contains('sidebar-closed'));
  await initWorld();
  $$('.hud [data-toggle=freeze]').forEach((b) => b.setAttribute('aria-pressed', S.freeze));
  updateDay(); syncLayout();
  if (W) { home(true); }
  refresh();
  if (!W) hideLoading();
  const h0 = decodeURIComponent(location.hash.slice(1)).split('/')[0];
  if (byId.has(h0) || h0 === 'text') fromHash(true);
  else if (new URLSearchParams(location.search).has('tour')) startTour();
  else openHome();
  requestAnimationFrame(animate); setTimeout(hideLoading, 4000);
  window.__island = { S, get W() { return W; }, camera: () => camera, controls: () => controls, selectIsland, startTour };
}
boot();
