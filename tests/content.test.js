import {test} from 'node:test';
import assert from 'node:assert/strict';
import {topics,findTopics,makeOutline,readStored,explorationRoute,entryRoutes,concerns,concernsFor} from '../dist/content.js';
test('中間三座島加獎盃共四個主題，內容完整且關聯可走通',()=>{assert.deepEqual(topics.map(t=>t.id),['teacher','teaching','questions','stories']);assert.equal(new Set(topics.map(t=>t.id)).size,topics.length);for(const t of topics){assert.ok(t.steps.length&&t.task&&t.question&&t.facts.length);for(const id of t.links)assert.ok(topics.some(t=>t.id===id),`${t.id} -> ${id}`);}const visited=new Set();function visit(id){if(visited.has(id))return;visited.add(id);topics.find(t=>t.id===id).links.forEach(visit);}visit('teacher');assert.equal(visited.size,topics.length);});
test('訪客可以搜尋茶會、植物能量及疑問並依類別篩選',()=>{assert.ok(findTopics('  第一視角  ').some(t=>t.id==='teaching'));assert.ok(findTopics('前、中、後').some(t=>t.id==='stories'));assert.ok(findTopics('','疑問與解法').every(t=>t.tag==='疑問與解法'));assert.equal(findTopics('','認識茶會').length,2);assert.deepEqual(findTopics('找不到的主題'),[]);assert.equal(findTopics('列穆里亞')[0].id,'questions');assert.equal(findTopics('').length,topics.length);});
test('諮詢提綱帶入收藏主題的個人問題，忽略未知主題',()=>{const result=makeOutline('親子關係',['questions','unknown'],' 想問是否適合我 ',{questions:'價格是否含場地？'});assert.match(result,/常見疑問與顧慮/);assert.match(result,/想問是否適合我/);assert.match(result,/價格是否含場地？/);assert.doesNotMatch(result,/undefined|unknown/);assert.match(makeOutline('其他',[],''),/孟婆茶會在做什麼/);});
test('無效或非物件儲存資料不會阻擋啟動',()=>{for(const raw of ['null','[]','42','false','"text"','{broken',null])assert.deepEqual(readStored(raw),{});assert.deepEqual(readStored('{"saved":["questions"]}'),{saved:['questions']});});
test('探索路線回應角色、資訊需求與行動，全部入口均有效',()=>{assert.equal(explorationRoute([0,0,0])[0],'teacher');assert.equal(explorationRoute([0,1,0])[0],'teaching');assert.equal(explorationRoute([0,2,0])[0],'questions');for(const audience of [0,1])for(const interest of [0,1,2])for(const goal of [0,1,2]){const ids=explorationRoute([audience,interest,goal]);assert.equal(new Set(ids).size,3);assert.ok(ids.every(id=>topics.some(t=>t.id===id)));if(goal===1)assert.equal(ids[0],'stories');if(goal===2){assert.equal(ids[0],'questions');assert.ok(ids.includes('teaching'));}}});

test('角色入口保留完整地圖，問題皆連到有效主題與相關資訊',()=>{for(const [entry,route]of Object.entries(entryRoutes)){assert.ok(route.topics.length);assert.ok(route.topics.every(id=>topics.some(t=>t.id===id)));assert.ok(concernsFor(entry).length);assert.ok(concernsFor(entry).every(c=>c.audience===entry));}assert.equal(new Set(concerns.map(c=>c.id)).size,concerns.length);for(const c of concerns){assert.ok(c.question&&c.answer);assert.ok(topics.some(t=>t.id===c.topic));assert.ok(c.related.every(id=>topics.some(t=>t.id===id)));}assert.ok(concernsFor(null).some(c=>c.audience==='couple'));assert.ok(concernsFor(null).some(c=>c.audience==='family'));assert.ok(concernsFor(null).some(c=>c.audience==='life'));});
test('同一主題的多個具體顧慮都能保留到諮詢提綱',()=>{const questions=['會不會增加孩子的課業負擔？','我常常寫不出來，老師會怎麼帶？'];const stored=readStored(JSON.stringify({saved:['method'],questions}));const text=makeOutline('家長',stored.saved,'週末時間有限',{},stored.questions);for(const q of questions)assert.ok(text.includes(q));assert.match(text,/週末時間有限/);assert.match(text,/想帶進討論的問題：\n• /);});

test('首頁先建立教學理解；收費改在行事曆站查找，不再是主題島',async()=>{const {PRICING}=await import('../dist/journey.js');assert.deepEqual(Object.keys(entryRoutes),['couple','family','life']);assert.ok(!topics.some(t=>t.id==='pricing'));assert.ok(PRICING.questions.length===3&&PRICING.facts.length===0);assert.ok(concerns.every(c=>topics.some(t=>t.id===c.topic)));});

test('首次導覽三步說明地圖操作與提綱，不宣稱代寄訊息',async()=>{const {introSteps,INTRO_KEY}=await import('../dist/content.js');assert.equal(introSteps.length,3);for(const s of introSteps)assert.ok(s.title&&s.body);assert.notEqual(INTRO_KEY,'writing-island-course');const text=introSteps.map(s=>s.body+(s.touchBody||'')).join('');for(const word of ['平移','旋轉','縮放','全景'])assert.match(text,new RegExp(word));assert.match(introSteps[2].body,/不會代你寄送/);assert.doesNotMatch(text,/保證|提分|已寄出|即時聊天/);});
test('鏡頭飛行使用頭尾放緩的曲線',async()=>{const {easeInOutCubic,FLY_MS}=await import('../dist/motion.js');assert.equal(easeInOutCubic(0),0);assert.equal(easeInOutCubic(1),1);assert.equal(easeInOutCubic(.5),.5);assert.ok(easeInOutCubic(.1)<.1&&easeInOutCubic(.9)>.9);assert.ok(FLY_MS>=500&&FLY_MS<=1200);});
test('選島時避開浮動面板遮住的地圖範圍（上方工具、左側卡片、底部面板）',async()=>{const {mapInsets}=await import('../dist/motion.js');const map={left:0,right:1000,top:0,bottom:800,width:1000,height:800};const zero={left:0,right:0,top:0,bottom:0};
assert.deepEqual(mapInsets(map,[{left:20,right:420,top:104,bottom:780}]),{...zero,left:420});
assert.deepEqual(mapInsets(map,[{left:600,right:980,top:104,bottom:780}]),{...zero,right:400});
assert.deepEqual(mapInsets(map,[{left:0,right:1000,top:0,bottom:96}]),{...zero,top:96});
assert.deepEqual(mapInsets(map,[{left:0,right:1000,top:500,bottom:800}]),{...zero,bottom:300});
assert.deepEqual(mapInsets(map,[{left:0,right:1000,top:0,bottom:96},{left:20,right:420,top:104,bottom:780}]),{...zero,top:96,left:420});
assert.deepEqual(mapInsets(map,[{left:0,right:390,top:900,bottom:1500}]),zero);
assert.deepEqual(mapInsets(map,[{left:0,right:1000,top:80,bottom:800}]),zero);
assert.deepEqual(mapInsets({width:0,height:0},[{left:0,right:1,top:0,bottom:1}]),zero);});
test('手機雙指：張開放大、扭轉旋轉、同向滑動平移',async()=>{const {pinchStep}=await import('../dist/motion.js');const close=(a,b)=>Math.abs(a-b)<1e-9;
let s=pinchStep({x:100,y:100},{x:200,y:100},{x:50,y:100},{x:250,y:100});assert.ok(close(s.scale,2));assert.ok(close(s.angle,0));assert.ok(close(s.dx,0)&&close(s.dy,0));
s=pinchStep({x:100,y:100},{x:200,y:100},{x:150,y:50},{x:150,y:150});assert.ok(close(s.scale,1));assert.ok(close(s.angle,Math.PI/2));
s=pinchStep({x:100,y:100},{x:200,y:100},{x:130,y:80},{x:230,y:80});assert.ok(close(s.scale,1)&&close(s.angle,0));assert.ok(close(s.dx,30)&&close(s.dy,-20));
s=pinchStep({x:0,y:0},{x:-100,y:-1},{x:0,y:0},{x:-100,y:1});assert.ok(Math.abs(s.angle)<.03,'跨越 ±180° 時不跳一整圈');
assert.equal(pinchStep({x:5,y:5},{x:5,y:5},{x:5,y:5},{x:9,y:9}).scale,1);});
test('拖曳放手時依最後 0.1 秒速度滑行，停住再放手就不滑',async()=>{const {releaseVelocity,decay,FLING_TAU}=await import('../dist/motion.js');
const samples=[{t:0,x:0,z:0},{t:50,x:5,z:0},{t:100,x:10,z:-2},{t:150,x:20,z:-4},{t:200,x:30,z:-6}];
const v=releaseVelocity(samples,210);assert.ok(Math.abs(v.x-.2)<1e-9&&Math.abs(v.z+.04)<1e-9);
assert.deepEqual(releaseVelocity(samples,300),{x:0,z:0},'停住超過 60ms 再放手不滑行');
assert.deepEqual(releaseVelocity([{t:0,x:0,z:0}],5),{x:0,z:0});assert.deepEqual(releaseVelocity([],5),{x:0,z:0});
assert.ok(Math.abs(decay(1,FLING_TAU)-Math.exp(-1))<1e-12);assert.ok(decay(1,16)<1&&decay(1,16)>.9);});
test('了解重點拆成標籤與問題，圖釘站在島的後半邊、不擋前緣島名',async()=>{const {stepParts,CIRCLED}=await import('../dist/content.js');const {pinSpots}=await import('../dist/layout.js');
for(const t of topics){assert.ok(t.steps.length<=CIRCLED.length);for(const s of t.steps){const p=stepParts(s);assert.ok(p.label.length>0&&p.label.length<=8,s);assert.ok(p.question.length>0,s);}}
assert.deepEqual(stepParts('沒有冒號'),{label:'沒有冒號',question:''});
for(const n of [1,2,3,5]){const spots=pinSpots(n);assert.equal(spots.length,n);for(const p of spots){assert.ok(Math.hypot(p.x,p.z)<1.2,'在島面內');assert.ok(p.z<.1,'不在前緣島名附近');assert.ok(p.lift>1);}
 if(n<=4)for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)assert.ok(Math.hypot(spots[i].x-spots[j].x,spots[i].z-spots[j].z)>.4,'圖釘彼此分開');}});
