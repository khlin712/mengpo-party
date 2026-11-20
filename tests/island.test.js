import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ISLANDS, FLOWS, GROUPS, ENTRY_ROUTES, CONCERNS, PEOPLE, PEOPLE_NOTE, TOUR, INTRO_STEPS, findIslands, makeOutline, readStored, cueAt, dayNote } from '../dist/content.js';
import { hexCenter, isAdjacent, hexDistance, polyline, shortestArc, skyAt, lightPos, fmtClock, arcPoints, bezier, D, R, SQ3 } from '../dist/lib.js';
import { easeInOutCubic, FLY_MS } from '../dist/motion.js';

const ids = new Set(ISLANDS.map((t) => t.id));

test('七座島：編號、座標、分類與內容完整且不重複', () => {
  assert.equal(ISLANDS.length, 7);
  assert.equal(ids.size, 7);
  assert.deepEqual(ISLANDS.map((t) => t.n), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(new Set(ISLANDS.map((t) => t.hex.join(','))).size, 7, '六角格座標不可重複');
  for (const t of ISLANDS) {
    assert.ok(GROUPS.includes(t.tag), t.id);
    assert.ok(t.title && t.intro && t.body && t.task && t.example && t.question && t.facts.length, t.id);
    assert.ok(t.steps.length >= 3 && t.steps.length <= 5, `${t.id} 重點數量`);
    for (const s of t.steps) assert.ok(s.label && s.q, t.id);
    assert.match(t.color, /^#[0-9a-f]{6}$/i);
  }
});

test('島依旅程順序排成一條路：前後相連的兩步一定相鄰（有橋），整組置中', () => {
  assert.deepEqual(ISLANDS.map((t) => t.id), ['start', 'teacher', 'teaching', 'questions', 'stories', 'calendar', 'signup']);
  for (let i = 0; i < ISLANDS.length - 1; i++) assert.ok(isAdjacent(ISLANDS[i].hex, ISLANDS[i + 1].hex), `${ISLANDS[i].id} → ${ISLANDS[i + 1].id}`);
  const cs = ISLANDS.map((t) => hexCenter(...t.hex));
  assert.ok(Math.abs(cs.reduce((s, c) => s + c.x, 0) / 7) < 1e-9 && Math.abs(cs.reduce((s, c) => s + c.z, 0) / 7) < 1e-9);
  assert.equal(hexDistance([0, 0], [1, -1]), 1);
  const a = hexCenter(0, 0), b = hexCenter(1, 0);
  assert.ok(Math.abs(Math.hypot(b.x - a.x, b.z - a.z) - D) < 1e-9);
  assert.ok(D > SQ3 * R, '相鄰島之間要留水道給橋');
});

test('人物：每位都有角色與台詞，指向有效的島，標明是示意', () => {
  assert.equal(new Set(PEOPLE.map((p) => p.id)).size, PEOPLE.length);
  for (const p of PEOPLE) { assert.ok(p.role && p.name && p.line, p.id); assert.ok(p.island === null || ids.has(p.island), p.id); }
  assert.equal(PEOPLE.find((p) => p.id === 'guide').action, 'tour');
  for (const t of ISLANDS) assert.ok(PEOPLE.some((p) => p.island === t.id), `${t.id} 島上沒有人`);
  assert.match(PEOPLE_NOTE, /示意/);
  assert.doesNotMatch(PEOPLE.map((p) => p.line).join(''), /保證|治癒|變好了|我好多了/);
});

test('人物走路：沿折線前進、角度取較短的一邊', () => {
  const pl = polyline([[0, 0, 0], [0, 0, 3], [4, 1, 3]]);
  assert.equal(pl.len, 7);
  assert.deepEqual([pl.at(0).x, pl.at(0).z], [0, 0]);
  assert.ok(Math.abs(pl.at(1.5).z - 1.5) < 1e-9 && Math.abs(pl.at(1.5).heading) < 1e-9);
  assert.ok(Math.abs(pl.at(5).x - 2) < 1e-9 && Math.abs(pl.at(5).y - 0.5) < 1e-9);
  assert.equal(pl.at(99).x, 4);
  const arc = shortestArc(0.1, 2 * Math.PI - 0.1);
  assert.ok(Math.abs(arc.at(-1) - (0.1 - 0.2)) < 1e-9 || Math.abs(arc.at(-1) + 0.1) < 1e-9, '走短的那一邊');
  assert.ok(arc.length >= 2);
});

test('關聯線都連到有效的島，沒有重複或自連，整張圖相連', () => {
  assert.equal(new Set(FLOWS.map((f) => f.id)).size, FLOWS.length);
  const seen = new Set();
  for (const f of FLOWS) {
    assert.ok(ids.has(f.a) && ids.has(f.b) && f.a !== f.b, f.id);
    assert.ok(f.label && f.why && ['journey', 'topic'].includes(f.kind));
    const key = [f.a, f.b].sort().join('|'); assert.ok(!seen.has(key), '重複：' + key); seen.add(key);
  }
  const adj = new Map([...ids].map((i) => [i, []]));
  for (const f of FLOWS) { adj.get(f.a).push(f.b); adj.get(f.b).push(f.a); }
  const visited = new Set(); const walk = (i) => { if (visited.has(i)) return; visited.add(i); adj.get(i).forEach(walk); }; walk('start');
  assert.equal(visited.size, ids.size);
});

test('入口路線、顧慮、導覽都指向有效的島，導覽時間連續', () => {
  for (const r of Object.values(ENTRY_ROUTES)) { assert.ok(r.topics.every((id) => ids.has(id))); assert.equal(new Set(r.topics).size, r.topics.length); assert.equal(r.topics.at(-1), 'signup'); }
  assert.deepEqual(Object.keys(ENTRY_ROUTES), ['couple', 'family', 'life']);
  assert.equal(new Set(CONCERNS.map((c) => c.id)).size, CONCERNS.length);
  for (const c of CONCERNS) assert.ok(ids.has(c.topic) && c.q && c.a);
  const flowIds = new Set(FLOWS.map((f) => f.id));
  let t = 0;
  for (const c of TOUR.cues) { assert.equal(c.from, t); assert.ok(c.to > c.from); t = c.to; assert.ok(c.target === 'all' || ids.has(c.target)); assert.ok(c.flows.every((f) => flowIds.has(f))); assert.ok(c.mins >= 0 && c.mins < 1440 && c.caption); }
  assert.equal(t, TOUR.total);
  assert.equal(cueAt(TOUR.cues, 0), 0); assert.equal(cueAt(TOUR.cues, TOUR.total + 5), TOUR.cues.length - 1); assert.equal(cueAt(TOUR.cues, 9), 1);
  assert.ok(new Set(TOUR.cues.map((c) => c.target)).size >= 8 || TOUR.cues.filter((c) => c.target !== 'all').length === 7);
});

test('搜尋可依關鍵字與分類篩選', () => {
  assert.ok(findIslands('  催眠  ').some((t) => t.id === 'questions'));
  assert.ok(findIslands('第一視角').some((t) => t.id === 'teaching'));
  assert.ok(findIslands('前、中、後').some((t) => t.id === 'stories'));
  assert.equal(findIslands('列穆里亞')[0].id, 'questions');
  assert.equal(findIslands('', ['認識茶會']).length, 2);
  assert.deepEqual(findIslands('完全找不到的詞'), []);
  assert.equal(findIslands('').length, ISLANDS.length);
});

test('諮詢提綱：只含收藏的島，忽略未知 id，不寫入虛構內容', () => {
  const out = makeOutline({ role: '親子關係', ids: ['questions', 'unknown'], note: ' 想問是否適合我 ' });
  assert.match(out, /常見疑問與顧慮/); assert.match(out, /想問是否適合我/); assert.match(out, /親子關係/);
  assert.doesNotMatch(out, /undefined|unknown/);
  assert.match(makeOutline({}), /孟婆茶會在做什麼/);
  assert.match(out, /不會代你寄送/);
});

test('不虛構：尚未確認的資料標示待確認／待提供，介紹文字不承諾成效', () => {
  const all = ISLANDS.map((t) => JSON.stringify(t)).join('') + INTRO_STEPS.map((s) => s.body).join('') + TOUR.cues.map((c) => c.caption).join('');
  assert.doesNotMatch(all, /保證|一定會|治癒|根治|已寄出/);
  assert.match(ISLANDS.find((t) => t.id === 'stories').body, /不展示虛構/);
  assert.match(INTRO_STEPS[2].body, /不會代你寄送/);
});

test('無效或非物件的儲存資料不會擋住啟動', () => {
  for (const raw of ['null', '[]', '42', 'false', '"x"', '{broken', null]) assert.deepEqual(readStored(raw), {});
  assert.deepEqual(readStored('{"saved":["questions"]}'), { saved: ['questions'] });
});

test('一天的天空：午夜到夜晚是夜、中午是白天，顏色連續', () => {
  assert.ok(skyAt(0).night > 0.9 && skyAt(720).night === 0 && skyAt(720).day === 1);
  assert.ok(skyAt(1260).night > 0.9);
  assert.deepEqual(skyAt(1440), skyAt(0));
  for (let m = 0; m < 1440; m += 10) { const a = skyAt(m), b = skyAt(m + 10); for (let i = 0; i < 3; i++) assert.ok(Math.abs(a.top[i] - b.top[i]) < 0.2, `分鐘 ${m}`); assert.ok(a.lightI >= 0.3); }
  assert.ok(lightPos(360).x > 0 && lightPos(1070).x < 0, '東升西落');
  assert.ok(lightPos(720).y > lightPos(400).y);
  assert.equal(fmtClock(905), '15:05'); assert.equal(fmtClock(0), '00:00');
  for (const m of [0, 300, 480, 1100, 1300]) assert.ok(dayNote(m).length > 0);
});

test('弧線與緩動', () => {
  const [p0, p1, p2] = arcPoints({ x: 0, z: 0 }, { x: 4, z: 0 });
  assert.deepEqual(p0, [0, 2.3, 0]); assert.ok(p1[1] > p0[1]);
  assert.deepEqual(bezier(p0, p1, p2, 0), p0); assert.deepEqual(bezier(p0, p1, p2, 1), p2);
  assert.ok(bezier(p0, p1, p2, 0.5)[1] > p0[1]);
  assert.equal(easeInOutCubic(0), 0); assert.equal(easeInOutCubic(1), 1); assert.ok(FLY_MS >= 500 && FLY_MS <= 1200);
});
