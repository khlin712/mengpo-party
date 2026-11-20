import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {topics} from '../dist/content.js';
import {SUMMIT,UNIVERSITY,SPAWN_FROM,RESTART,SUMMIT_AT,UNIVERSITY_AT,STOPS,DEAD_ENDS,WALKWAYS,RING,TOP,nodes,bridgePath,buildGraph,walkRoute} from '../dist/summit.js';
import {STATIONS,FEEDBACK,CLASSES,LINKS,CONTACTS,isLink,DOCUMENTS,documentURLs} from '../dist/journey.js';
import {createArchitecture} from '../dist/architecture.js';
const centers=nodes(topics),graph=buildGraph(centers);
const unit=new THREE.BoxGeometry(1,1,1),mesh=(g,geo,c,x,y,z,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial());m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m;};
const kit=createArchitecture({mesh,box:(g,x,y,z,w,h,d,c)=>mesh(g,unit,c,x,y+h/2,z,w,h,d),tree(g,x,z,s){mesh(g,unit,'#698760',x,.25+s/2,z,s*.2,s,s*.2);}});

test('七站依序：起點、指引牌、橋、大學、行事曆、報名、聯繫',()=>{assert.deepEqual(STATIONS.map(s=>s.id),['start','fork','bridge','university','calendar','signup','contact']);assert.deepEqual(STATIONS[0].themes.map(t=>t.q),['來的人都帶著什麼問題？','為什麼是孟婆茶會？']);assert.ok(STATIONS[0].themes[1].body==='');for(let i=0;i<STATIONS.length-1;i++)assert.equal(STATIONS[i].next,STATIONS[i+1].id);
 assert.deepEqual(STATIONS[1].paths.map(p=>p.id),['cliff','cliff2','wall']);assert.ok(!('lava' in STOPS),'岩漿洞已移除');assert.equal(STATIONS[2].lead,'孟婆一定有河，有橋。走過這座橋，就是參加孟婆茶會。');
 assert.equal(STATIONS[1].lead,'走到橋頭，有兩種走法：走上奈何橋，或繼續在崎嶇的路上繞圈。兩邊都是比喻。');
 for(const t of [STATIONS[1].lead,STATIONS[1].view,STATIONS[1].right.ends,STATIONS[1].right.caption,STATIONS[2].lead,STATIONS[2].note])assert.ok(!/正確的路|對的路|錯的路|走錯/.test(t),`不把兩邊說成對錯：${t}`);});
test('未提供的回饋、開班狀態及報名連結仍留白',()=>{assert.equal(FEEDBACK.length,0);assert.equal(CLASSES.length,0);assert.ok(Object.values(LINKS).every(v=>v===''));assert.ok(!isLink('javascript:alert(1)')&&!isLink('http://x')&&isLink('https://forms.gle/x'));});
test('起點在島群正前方，獎盃在正後方高處，其他島不互相重疊',()=>{const ground=topics.filter(t=>t.id!==SUMMIT).map(t=>centers.get(t.id)),zs=ground.map(c=>c.z);
 assert.ok(STOPS.start.z>Math.max(...zs)+2,'起點在前');assert.ok(SUMMIT_AT.z<Math.min(...zs)-2,'獎盃在後');assert.ok(SUMMIT_AT.y>=1.8&&SUMMIT_AT.y<=2.4);assert.ok(!('wall' in STOPS),'陡峭山壁直接爬上獎盃島，沒有另一座山壁島');
 const ids=[...centers.keys()],rad=id=>centers.get(id).ledge?.7:1.34;for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const a=centers.get(ids[i]),b=centers.get(ids[j]);if(Math.abs((a.y||0)-(b.y||0))>1)continue;assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>rad(ids[i])+rad(ids[j])-.01,`${ids[i]} 和 ${ids[j]} 重疊`);}});
test('橋從指引牌一路上升到獎盃，沿外圍繞過其他島',()=>{const b=bridgePath();for(let i=1;i<b.length;i++)assert.ok(b[i].y>b[i-1].y);for(const p of b)for(const [id,c]of centers)if(id!=='fork'&&id!==SUMMIT&&Math.abs((c.y||0)+TOP-p.y)<1)assert.ok(Math.hypot(p.x-c.x,p.z-c.z)>(c.ledge?.8:1.3),`橋穿過 ${id}`);
 for(let i=1;i<b.length;i++){const g=Math.hypot(b[i].x-b[i-1].x,b[i].z-b[i-1].z);assert.ok(g>.14&&g<.2,`間距 ${g}`);}});
test('人物只走在島面、步道、山壁、橋與階梯上；所有地點兩兩走得到，而且不會借道岩漿洞或懸崖',()=>{const pairs=new Set(WALKWAYS.map(w=>[...w].sort().join(':')));
 const where=p=>{if(p.path)return p.path;for(const [id,c]of centers)if(Math.abs(p.y-((c.y||0)+TOP))<1e-9&&Math.hypot(p.x-c.x,p.z-c.z)<=(c.ring||RING)+1e-9)return id;return null;};
 const ids=[...centers.keys()];for(const a of ids)for(const b of ids){const c=centers.get(a),r=walkRoute(graph,{x:c.x,y:(c.y||0)+TOP,z:c.z},a,b,{x:0,z:.3});assert.ok(r,`${a}→${b} 走不到`);
  let prev=null;for(const p of r.pts){const w=where(p);assert.ok(w,`${a}→${b} 有一點懸空`);if(DEAD_ENDS.includes(w)&&w!==a&&w!==b)assert.fail(`${a}→${b} 借道 ${w}`);if(prev&&!['climb','bridge','slide','trail','descent','landing'].includes(w)&&!['climb','bridge','slide','trail','descent','landing'].includes(prev)&&w!==prev)assert.ok(pairs.has([w,prev].sort().join(':')),`${prev}→${w} 沒有步道`);prev=w;}}});
test('照著指引走上橋最順；陡峭山壁只能往上爬、直接爬到獎盃島；走錯路回到起點',async()=>{const r=walkRoute(graph,{x:STOPS.start.x,y:TOP,z:STOPS.start.z},'start',UNIVERSITY,{x:0,z:.5});assert.ok(r.hops.includes('span')&&!r.hops.includes('climb'),'對的路是橋');
 const w=walkRoute(graph,{x:STOPS.wallfoot.x,y:TOP,z:STOPS.wallfoot.z},'wallfoot',SUMMIT,{x:0,z:.6});assert.deepEqual(w.hops,['climb']);assert.ok(!graph.edges.some(e=>e.kind==='climb'&&e.from===SUMMIT),'山壁不能往下爬');
 const {GUIDE_ROUTE}=await import('../dist/walkers.js');assert.deepEqual(GUIDE_ROUTE,['start','fork',SUMMIT,UNIVERSITY,'calendar','signup','contact']);assert.equal(SPAWN_FROM,'start','進大學消失的學生從起點重新出發');assert.equal(RESTART,'start');assert.deepEqual(DEAD_ENDS,[]);});
test('旅程建築與大學都留在島面內，環島步道在建築外圍',()=>{for(const kind of ['start','lava','cliff','wall','calendar','signup','contact','university']){const model=kit.build(new THREE.Group(),{kind});model.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(model);
 assert.ok(b.max.y<2.2,`${kind} 太高`);assert.ok(Math.max(...[[b.min.x,b.min.z],[b.max.x,b.max.z],[b.min.x,b.max.z],[b.max.x,b.min.z]].map(v=>Math.hypot(...v)))<RING+.15,`${kind} 擋到步道`);}});
test('學生人數就是老師目前的教學人數 47',async()=>{const {STUDENTS}=await import('../dist/walkers.js');assert.equal(STUDENTS,47);});

test('活動場次文件尚未提供時不產生假連結，聯繫方式只有 LINE 且網址待提供',()=>{
 assert.equal(STATIONS[0].themes[0].document,undefined);assert.equal(STATIONS.find(s=>s.id==='calendar').document,'calendar');
 assert.equal(documentURLs('calendar'),null,'driveId 留空 → 不產生連結');assert.equal(documentURLs('unknown'),null);assert.equal(documentURLs('constructor'),null);
 assert.deepEqual(CONTACTS.map(c=>c.label),['LINE']);assert.ok(CONTACTS.every(c=>c.href===''||isLink(c.href)));
});
