import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {createWalkers} from '../dist/walkers.js';
import {nodes,buildGraph,UNIVERSITY,TRAIL,trailPath,TOP} from '../dist/summit.js';
import {makeRoute} from '../dist/people.js';
import {topics} from '../dist/content.js';
// Minimal label DOM; these are state/geometry tests, not browser or touch validation.
const element=()=>({type:'',className:'',innerHTML:'',classList:{toggle(){}},setAttribute(){},remove(){}});
class Label extends THREE.Object3D{constructor(el){super();this.element=el;}}
test('各類角色在斷橋上跌落、隱藏後仍重生，導覽與訪客恢復原目的地',()=>{
 const old=globalThis.document;globalThis.document={createElement:element};
 try{const positions=nodes(topics),graph=buildGraph(positions),scene=new THREE.Scene();let broken=true;const w=createWalkers({scene,topics,positions,graph,links:[],CSS2DObject:Label,reduced:{matches:false},hazards:{gap:()=>broken}});
  const seg=trailPath(positions.get('fork'),positions.get('pass1'));const chosen=['parent','student','guide','avatar'].map(k=>w.find(k));
  for(const person of chosen){person.route=makeRoute(seg);person.s=person.route.total*.5;person.target='pass1';person.island='fork';person.wait=0;}
  w.update(.05,false);assert.ok(chosen.every(p=>p.fall!==undefined));for(let i=0;i<46;i++)w.update(.05,false);assert.ok(chosen.every(p=>p.fig.userData.hidden));
  broken=false;for(let i=0;i<40;i++)w.update(.05,false);for(const p of chosen){assert.equal(p.fall,undefined);assert.ok(!p.fig.userData.hidden);assert.ok(p.fig.visible);assert.equal(p.island,'start');assert.ok(p.fig.scale.x>.5);}
  assert.equal(w.guide().target,'pass1');assert.equal(w.me().target,'pass1');assert.equal(w.state().studentCount,47);
 }finally{globalThis.document=old;}
});
test('指引牌入場落點分散，行走狀態長時間保持有限且不增生人物',()=>{
 const old=globalThis.document;globalThis.document={createElement:element};
 try{const positions=nodes(topics),graph=buildGraph(positions),scene=new THREE.Scene();const w=createWalkers({scene,topics,positions,graph,links:[],CSS2DObject:Label,reduced:{matches:false}}),ends=new Set();
  for(let i=0;i<2400;i++){w.update(.05,false);for(let k=0;k<47;k++){const p=w.find('student',k);if(p.target==='fork'&&p.route){const e=p.route.pts.at(-1);ends.add(`${e.x.toFixed(1)},${e.z.toFixed(1)}`);}assert.ok(p.fig.position.toArray().every(Number.isFinite));}}
  assert.ok(ends.size>10,`只見到${ends.size}個落點`);assert.equal(w.state().studentCount,47);
 }finally{globalThis.document=old;}
});

test('跌落中以最後一次移動為準，暫停傳送會取消跌落；召回導覽員不再被舊狀態蓋過',()=>{
 const old=globalThis.document;globalThis.document={createElement:element};
 try{const positions=nodes(topics),graph=buildGraph(positions),w=createWalkers({scene:new THREE.Scene(),topics,positions,graph,links:[],CSS2DObject:Label,reduced:{matches:false}}),me=w.me(),guide=w.guide();
  for(const p of [me,guide]){p.fall=1;p.vy=-8;p.resume='calendar';}
  w.avatar.go('contact');w.avatar.go('signup');w.guideTo('calendar');w.guideTo('contact');
  for(let i=0;i<55;i++)w.update(.05,false);assert.equal(me.target,'signup');assert.equal(guide.target,'contact');
  me.fall=1;me.resume='calendar';w.update(0,true);w.avatar.go('contact');assert.equal(me.fall,undefined);assert.equal(me.island,'contact');
  guide.fall=2;guide.fig.userData.hidden=true;guide.fig.visible=false;guide.resume='calendar';assert.ok(w.guideAppear('fork'));assert.equal(guide.fall,undefined);assert.equal(guide.island,'fork');assert.ok(guide.fig.visible);
 }finally{globalThis.document=old;}
});
test('開場兩條橋已有人，露天講堂有老師與八位坐姿學生，總學生仍47',()=>{
 const old=globalThis.document;globalThis.document={createElement:element};
 try{const positions=nodes(topics),w=createWalkers({scene:new THREE.Scene(),topics,positions,graph:buildGraph(positions),links:[],CSS2DObject:Label,reduced:{matches:true}}),state=w.state();
  assert.equal(state.studentCount,47);assert.equal(state.students.filter(p=>p.seated&&p.island==='signup').length,8);assert.ok(w.find('lecturer'));assert.equal(w.find('lecturer').island,'signup');assert.equal(w.find('lecturer').tag,undefined,'授課老師不顯示特殊NPC標記');
  const paths=Array.from({length:47},(_,i)=>w.find('student',i)).filter(p=>p.route).map(p=>p.route.pts[1].path);assert.equal(paths.filter(p=>p==='bridge').length,2);assert.equal(paths.filter(p=>p==='trail').length,14,'開場兩條橋上 1:7');
  const seated=w.find('student',46);assert.equal(seated.fig.userData.rig.legs[0].rotation.x,-Math.PI/2);w.update(.05,true);assert.equal(seated.fig.userData.rig.legs[0].rotation.x,-Math.PI/2);
 }finally{globalThis.document=old;}
});

test('大雨中錯誤橋上的人物開始走偏（不是立刻掉落），正確橋上的人物不受影響',()=>{
 const old=globalThis.document,random=Math.random;globalThis.document={createElement:element};
 try{const positions=nodes(topics),w=createWalkers({scene:new THREE.Scene(),topics,positions,graph:buildGraph(positions),links:[],CSS2DObject:Label,reduced:{matches:false},rain:()=>1});Math.random=()=>.005;
  w.update(.05,false);const s1=w.find('student',1);assert.equal(s1.fall,undefined,'不會一觸發就掉');assert.equal(s1.drift?.kind,'rain');assert.ok(!w.find('student',0).drift);assert.equal(w.find('student',0).fall,undefined);
 }finally{Math.random=random;globalThis.document=old;}
});

test('每位學生步速不同，途中能短暫停下，恢復後繼續走',()=>{
 const old=globalThis.document,random=Math.random;globalThis.document={createElement:element};
 try{const positions=nodes(topics),w=createWalkers({scene:new THREE.Scene(),topics,positions,graph:buildGraph(positions),links:[],CSS2DObject:Label,reduced:{matches:false}}),student=w.find('student',0);assert.ok(new Set(w.state().students.filter(p=>!p.seated).map(p=>p.speed)).size>=7);
  const start=student.s;Math.random=()=>0;w.update(.05,false);assert.equal(student.s,start);assert.ok(student.rest>0);Math.random=()=>.99;for(let i=0;i<80;i++)w.update(.05,false);assert.ok(student.s>start);assert.equal(student.fall,undefined);
 }finally{Math.random=random;globalThis.document=old;}
});

test('導覽員在錯誤橋途中要求返回，保留有效行走並最後抵達指引牌',async()=>{
 const {centers,graph:real}=await import('./fixtures/island-models.js');const {along}=await import('../dist/people.js');const old=globalThis.document;globalThis.document={createElement:element};
 try{const arrivals=[],w=createWalkers({scene:new THREE.Scene(),topics,positions:centers,graph:{...real,edges:[...real.edges]},links:[],CSS2DObject:Label,reduced:{matches:false},onGuide:id=>arrivals.push(id)}),guide=w.guide();
  w.guideAppear('fork');assert.ok(w.guideTo('pass1'));guide.s=guide.route.total*.6;const at=along(guide.route,guide.s);guide.fig.position.set(at.x,at.y,at.z);
  assert.equal(w.guideTo('fork'),true,'橋上可接受返回命令');for(let i=0;i<1000&&arrivals.length===0;i++)w.update(.05,false);
  assert.deepEqual(arrivals,['fork']);assert.equal(guide.island,'fork');assert.equal(guide.target,null);
 }finally{globalThis.document=old;}
});
test('導覽員重生後若無法規劃恢復路線，回報安全起點供介面重新開始',async()=>{
 const {centers,graph:real}=await import('./fixtures/island-models.js');const old=globalThis.document;globalThis.document={createElement:element};
 try{const graph={...real,edges:[...real.edges]},arrivals=[],w=createWalkers({scene:new THREE.Scene(),topics,positions:centers,graph,links:[],CSS2DObject:Label,reduced:{matches:false},onGuide:(id,extra)=>arrivals.push({id,extra})}),guide=w.guide();
  guide.fall=3.4;guide.vy=-20;guide.resume='pass1';guide.fig.userData.hidden=true;guide.fig.visible=false;graph.edges.length=0;
  for(let i=0;i<10;i++)w.update(.05,false);assert.equal(guide.island,'start');assert.ok(guide.fig.visible);assert.deepEqual(arrivals,[{id:'start',extra:{recoveryFailed:true}}]);
 }finally{globalThis.document=old;}
});

test('每次刷新建立的14位錯誤橋學生皆沿指引牌→懸崖→攀岩入口向前走',async()=>{
 const {along}=await import('../dist/people.js');const old=globalThis.document;globalThis.document={createElement:element};
 try{for(let refresh=0;refresh<3;refresh++){const positions=nodes(topics),graph=buildGraph(positions),w=createWalkers({scene:new THREE.Scene(),topics,positions,graph,links:[],CSS2DObject:Label,reduced:{matches:false}}),initial=[];
   for(let k=0;k<16;k++){if(k%8===0)continue;const student=w.find('student',k),[from,to]=TRAIL[k%TRAIL.length],forward=graph.edges.find(e=>e.kind==='trail'&&e.from===from&&e.to===to);
    assert.equal(student.island,from);assert.equal(student.target,to,`${from}開場學生不應往${student.target}倒走`);assert.deepEqual(student.route.pts,forward.pts);assert.equal(student.dir,1);
    const at=along(student.route,student.s);assert.ok(Math.cos(student.heading-at.heading)>.99,'開場朝向與前進方向相同');initial.push({student,route:student.route,u:at.trailU});}
   for(let i=0;i<40;i++){w.update(.025,false);for(const p of initial){if(p.student.route!==p.route)continue;const u=along(p.route,p.student.s).trailU;assert.ok(u>=p.u-1e-9,'實際橋上位移不得倒退');p.u=u;}}
  }}finally{globalThis.document=old;}
});

// Walk one student along the rough road with a forced drift; record how far off the centre line it is each frame.
async function driftRun(kind,o){const {along}=await import('../dist/people.js');const positions=nodes(topics),w=createWalkers({scene:new THREE.Scene(),topics,positions,graph:buildGraph(positions),links:[],CSS2DObject:Label,reduced:{matches:false},rain:()=>kind==='rain'?1:0}),st=w.find('student',1);
 st.rest=0;st.s=st.route.total*.2;w.update(.001,false);w.startDriftForTest(st,kind,o);const log=[];const random=Math.random;Math.random=()=>.99;
 try{for(let i=0;i<200&&st.fall===undefined;i++){const s0=st.s;w.update(.05,false);if(st.fall!==undefined){log.push({fell:true,pos:st.fig.position.clone(),y:st.fig.position.y,scale:st.fig.scale.x/st.size});break;}
  const c=along(st.route,st.s),n={x:Math.cos(c.heading),z:-Math.sin(c.heading)},off=(st.fig.position.x-c.x)*n.x+(st.fig.position.z-c.z)*n.z;
  log.push({off,ds:st.s-s0,y:st.fig.position.y,deck:c.y,heading:st.heading,route:c.heading,drift:!!st.drift});}
  const after=[];if(st.fall!==undefined)for(let i=0;i<6;i++){const p=st.fig.position.clone();w.update(.05,false);after.push({dx:st.fig.position.x-p.x,dz:st.fig.position.z-p.z,dy:st.fig.position.y-p.y,scale:st.fig.scale.x/st.size});}
  return {st,log,after};}finally{Math.random=random;}}

test('一般失足：邊走邊慢慢偏向橋緣，身體朝斜向前進，踏出橋面後才帶著往前的慣性下墜',async()=>{
 const {TRAIL_WIDTH}=await import('../dist/hazards.js');const old=globalThis.document;globalThis.document={createElement:element};
 try{const {st,log,after}=await driftRun('slip',{recover:false,side:1,rate:.15});const walk=log.filter(x=>!x.fell),fell=log.at(-1);
  assert.ok(fell.fell,'沒有修正的人最後會踏空');assert.equal(st.fallKind,'slip');
  for(const x of walk){assert.ok(Math.abs(x.y-x.deck)<1e-9,'踏空前一直在橋面高度');assert.ok(x.ds>0,'一路都在往前走');assert.ok(Math.abs(x.off)<=TRAIL_WIDTH/2+.04,'踏空前腳仍在橋面內');}
  for(let i=1;i<walk.length;i++)assert.ok(Math.abs(walk[i].off-walk[i-1].off)<.02,`每幀橫向位移很小，不是被推走：${walk[i].off-walk[i-1].off}`);
  assert.ok(walk.length>12,'走偏是一段過程');assert.ok(walk.slice(-5).every(x=>Math.sin(x.heading-x.route)>.02),'身體朝向沿著斜向路線');
  assert.ok(after.length&&after.every(a=>a.scale===1),'下墜初期保持可見');assert.ok(after.slice(0,3).every(a=>Math.hypot(a.dx,a.dz)>.003),'踏空後保留往前的慣性');assert.ok(after.at(-1).dy<0,'接著往下掉');
 }finally{globalThis.document=old;}
});

test('走偏的人多半會修正回來，不會一靠近橋緣就掉',async()=>{
 const {TRAIL_WIDTH}=await import('../dist/hazards.js');const old=globalThis.document;globalThis.document={createElement:element};
 try{const {st,log}=await driftRun('slip',{recover:true,side:-1,rate:.15,turnAt:.2});assert.equal(st.fall,undefined,'修正的人不會掉');assert.ok(log.some(x=>!x.drift),'走偏結束、回到原本路線');
  assert.ok(Math.max(...log.map(x=>Math.abs(x.off)))<TRAIL_WIDTH/2,'修正前沒有越過橋緣');
 }finally{globalThis.document=old;}
});

test('大雨沖落：先踉蹌、再斜向滑步越過橋緣；完整橋面中央不會直接下墜',async()=>{
 const {TRAIL_WIDTH}=await import('../dist/hazards.js');const old=globalThis.document;globalThis.document={createElement:element};
 try{const {st,log}=await driftRun('rain',{recover:false,side:1,rate:.55,stumble:.5});const walk=log.filter(x=>!x.fell);
  assert.equal(st.fallKind,'rain');const stagger=walk.slice(0,9),slide=walk.slice(10);
  assert.ok(Math.abs(stagger.at(-1).off-stagger[0].off)<.05,'踉蹌時幾乎在原地');assert.ok(slide.length>=2&&slide.at(-1).off-slide[0].off>.05,'接著斜向滑出');
  assert.ok(stagger.every(x=>x.ds<slide[0].ds+1e-9),'踉蹌時腳步放慢');for(const x of walk)assert.ok(Math.abs(x.off)<=TRAIL_WIDTH/2+.04&&Math.abs(x.y-x.deck)<1e-9,'越過橋緣前不會下降');
 }finally{globalThis.document=old;}
});

test('橋板斷裂：只有腳下的缺口能讓人直接往下掉',async()=>{
 const old=globalThis.document;globalThis.document={createElement:element};
 try{const positions=nodes(topics);let gapOn=false;const hazards={gap:()=>gapOn,span:()=>null};const w=createWalkers({scene:new THREE.Scene(),topics,positions,graph:buildGraph(positions),links:[],CSS2DObject:Label,reduced:{matches:false},hazards}),st=w.find('student',1);
  st.rest=0;st.s=st.route.total*.4;const random=Math.random;Math.random=()=>.99;try{w.update(.05,false);assert.equal(st.fall,undefined);gapOn=true;w.update(.05,false);}finally{Math.random=random;}
  assert.equal(st.fallKind,'bridge');assert.equal(st.fallMove,null,'缺口不需要先走到橋緣');assert.equal(st.drift,null);
 }finally{globalThis.document=old;}
});

test('跳過走路可立即抵達，清除舊路線、跌落、排程與出生縮放',()=>{
 const old=globalThis.document;globalThis.document={createElement:element};
 try{const positions=nodes(topics),w=createWalkers({scene:new THREE.Scene(),topics,positions,graph:buildGraph(positions),links:[],CSS2DObject:Label,reduced:{matches:false}}),guide=w.guide();
  w.guideTo('pass1');guide.fall=1;guide.vy=-8;guide.resume='pass1';guide.next='fork';guide.fig.userData.hidden=true;guide.fig.visible=false;guide.fig.scale.setScalar(.1);guide.born=.1;
  assert.ok(w.guideAppear('wallfoot',{instant:true}));assert.equal(guide.island,'wallfoot');assert.equal(guide.fall,undefined);assert.equal(guide.born,undefined);assert.equal(guide.route,null);assert.equal(guide.resume,null);assert.equal(guide.next,null);assert.equal(guide.fig.scale.x,guide.size);assert.ok(guide.fig.visible);
 }finally{globalThis.document=old;}
});

test('連續行走的橋頭、橋尾和轉角不突然橫跳，單幀位移有界',()=>{
 const old=globalThis.document;globalThis.document={createElement:element};
 try{const positions=nodes(topics),w=createWalkers({scene:new THREE.Scene(),topics,positions,graph:buildGraph(positions),links:[],CSS2DObject:Label,reduced:{matches:false}}),dt=.02;
  for(let i=0;i<1200;i++){const before=Array.from({length:47},(_,k)=>{const p=w.find('student',k);return {p,route:p.route,at:p.fig.position.clone()};});w.update(dt,false);
   for(const {p,route,at}of before){if(!route||p.route!==route||p.fall!==undefined)continue;const d=Math.hypot(p.fig.position.x-at.x,p.fig.position.z-at.z);assert.ok(d<=(p.speed+.7)*dt+1e-5,`人物單幀橫移${d.toFixed(3)}，上限${((p.speed+.7)*dt).toFixed(3)}`);}
  }
 }finally{globalThis.document=old;}
});

test('角色從起點出生並預設自動探索，自動抵達標明自動、島內漫步不重複抵達',()=>{
 const old=globalThis.document;globalThis.document={createElement:element};
 try{const positions=nodes(topics),arrivals=[],w=createWalkers({scene:new THREE.Scene(),topics,positions,graph:buildGraph(positions),links:[],CSS2DObject:Label,reduced:{matches:false},onArrive:(id,meta)=>arrivals.push({id,meta})}),me=w.me();assert.equal(me.island,'start');assert.equal(me.mode,'auto');
  me.wait=0;w.update(.05,false);assert.ok(me.route&&me.target!=='start');me.s=me.route.total;w.update(.05,false);assert.equal(arrivals.length,1);assert.equal(arrivals[0].meta.automatic,true);
  arrivals.length=0;w.avatar.mode('stroll');me.wait=0;w.update(.05,false);assert.equal(me.target,me.island);me.s=me.route.total;w.update(.05,false);assert.equal(arrivals.length,0,'同島散步不發抵達');
  w.avatar.go('start');me.s=me.route.total;w.update(.05,false);assert.equal(arrivals.length,1);assert.equal(arrivals[0].meta.automatic,false,'手動前往仍發抵達事件');
 }finally{globalThis.document=old;}
});
test('走到懸崖頂的人先走到崖邊外，再往下掉，不從石台中間穿下去；掉落時先看得到人',()=>{
 const old=globalThis.document;globalThis.document={createElement:element};
 try{const positions=nodes(topics),graph=buildGraph(positions),w=createWalkers({scene:new THREE.Scene(),topics,positions,graph,links:[],CSS2DObject:Label,reduced:{matches:false},hazards:{gap:()=>false}});
  const c=positions.get('pass1'),top=(c.y||0)+TOP,p=w.find('student',3);p.route=null;p.island='pass1';p.target=null;p.up=true;p.fallAt='pass1';p.fig.position.set(c.x+.1,top,c.z+.1);
  w.startFallForTest(p,'cliff');let sawBelow=false,prev=p.fig.position.clone();
  for(let i=0;i<120;i++){w.update(.05,false);const q=p.fig.position,r=Math.hypot(q.x-c.x,q.z-c.z);if(q.y>=top-1e-9){const v=Math.hypot(q.x-prev.x,q.z-prev.z)/.05;assert.ok(v<=.41,`走向崖邊不能比平常走路快（${v.toFixed(2)}）`);}prev=q.clone();if(q.y<top-.05){sawBelow=true;assert.ok(r>.72,`還在石台範圍內就掉到台面下（r=${r.toFixed(2)}）`);}
   if(i<16)assert.ok(p.fig.scale.x>p.size*.9,'掉落的第一秒內人還沒縮小');}
  assert.ok(sawBelow,'有往下掉');
 }finally{globalThis.document=old;}
});

test('有人走到第一座懸崖前停下，回頭到指引牌改走橋（不是掉下去）',async()=>{
 const {TURN_BACK}=await import('../dist/walkers.js');assert.ok(TURN_BACK>0&&TURN_BACK<.5,'只有部分人回頭');
 const old=globalThis.document,random=Math.random;globalThis.document={createElement:element};
 try{const positions=nodes(topics),w=createWalkers({scene:new THREE.Scene(),topics,positions,graph:buildGraph(positions),links:[],CSS2DObject:Label,reduced:{matches:false}}),st=w.find('student',30);
  Math.random=()=>.99;
  st.route=null;st.fall=undefined;w.update(.001,false);const p=positions.get('fork');st.fig.position.set(p.x,(p.y||0)+TOP,p.z);st.island='fork';assert.ok(w.turnBackForTest(st));
  const seen=[];let stopped=0;for(let i=0;i<4000&&!(st.island===UNIVERSITY);i++){w.update(.05,false);if(st.fall!==undefined)assert.fail('回頭的人不應掉落');if(seen.at(-1)!==st.island)seen.push(st.island);if(st.island==='pass1'&&!st.route)stopped++;}
  assert.ok(stopped>20,'在第一座懸崖上停下想一想');assert.deepEqual(seen.filter(x=>['fork','pass1',UNIVERSITY].includes(x)),['fork','pass1','fork','stories',UNIVERSITY].filter(x=>x!=='stories'),`經過：${seen.join('→')}`);
 }finally{Math.random=random;globalThis.document=old;}
});

test('走偏時橫向速度逐漸加快、逐漸放慢，不會突然被往外推',async()=>{
 const {DRIFT_ACCEL}=await import('../dist/walkers.js');const old=globalThis.document;globalThis.document={createElement:element};
 try{for(const [kind,o] of [['slip',{recover:true,side:1,turnAt:.2}],['rain',{recover:false,side:-1}],['slip',{recover:false,side:-1}]]){
  const positions=nodes(topics),w=createWalkers({scene:new THREE.Scene(),topics,positions,graph:buildGraph(positions),links:[],CSS2DObject:Label,reduced:{matches:false},rain:()=>kind==='rain'?1:0}),st=w.find('student',1);
  st.rest=0;st.s=st.route.total*.2;w.update(.001,false);w.startDriftForTest(st,kind,o);const random=Math.random;Math.random=()=>.99;let v=0,maxV=0;
  try{for(let i=0;i<200&&st.drift;i++){w.update(.05,false);if(!st.drift)break;assert.ok(Math.abs(st.drift.v-v)<=DRIFT_ACCEL*.05+1e-9,`${kind} 橫向速度一幀內變化太大`);v=st.drift.v;maxV=Math.max(maxV,Math.abs(v));}}finally{Math.random=random;}
  assert.ok(maxV<=.3,`${kind} 橫向速度不超過一般走路速度（${maxV.toFixed(2)}）`);}
 }finally{globalThis.document=old;}
});

test('在指引牌直接選橋的比例很低：兩條路上的人數要維持約 1:7',async()=>{const {RIGHT_WAY}=await import('../dist/walkers.js');assert.ok(RIGHT_WAY>0&&RIGHT_WAY<1/8);});
