import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {LOOP,LOOP_STATIONS,REVISE_STAGE,LAP_SECONDS,DWELL,loopPoint,loopDirection,loopProgress,marksFor,phiAt,stationU} from '../dist/loop.js';
import {topics} from '../dist/content.js';

test('寫作循環五站依授課順序排列，沿前緣由左往右走一圈',()=>{
 assert.deepEqual(LOOP_STATIONS.map(s=>s.label),['來到茶會','植物能量','清醒入境','看見卡點','回到生活']);
 const us=LOOP_STATIONS.map((_,i)=>stationU(i));for(let i=1;i<us.length;i++)assert.ok(us[i]>us[i-1],'依序走到');
 const w=LOOP_STATIONS.find(s=>s.id==='write'),a=loopPoint(w.phi-20),b=loopPoint(w.phi+20);assert.ok(a.x>b.x,'前緣上由左往右（x 變大）');
 assert.ok(loopPoint(90).z>0,'前緣（面向鏡頭那邊）');
 for(const s of LOOP_STATIONS){const p=loopPoint(s.phi);assert.ok(Math.hypot(p.x,p.z)<=.98,`${s.id} 在島面內`);
  assert.ok(Math.abs(p.x)>.66||Math.abs(p.z)>.41,`${s.id} 在建築基座（±.59×±.41）之外，不蓋住教室`);}
 const d=loopDirection(98);assert.ok(Math.abs(Math.hypot(d.x,d.z)-1)<1e-9&&d.x>0,'方向朝右');});

test('稿紙走完一圈約 15 秒，每站停一下，走完最後一站回頭優化，再回到起點',()=>{
 assert.ok(LAP_SECONDS>12&&LAP_SECONDS<20,`一圈 ${LAP_SECONDS} 秒`);
 const seen=new Set();let prevU=-1;for(let t=0;t<LAP_SECONDS;t+=.1){const p=loopProgress(t);seen.add(p.stage);assert.ok(p.u>=prevU-1e-9,'只往前走，不倒退');prevU=p.u;}
 assert.deepEqual([...seen].sort(),[0,1,2,3,4,REVISE_STAGE],'卡片上每一步都會被點亮');
 assert.equal(loopProgress(.1).stage,0);assert.equal(loopProgress(.1).resting,true);
 const lap2=loopProgress(LAP_SECONDS+.1);assert.equal(lap2.lap,1);assert.equal(lap2.stage,0);
 assert.ok(Math.abs(phiAt(1)-(LOOP_STATIONS[0].phi-360))<1e-9,'走滿 360 度回到起點');});

test('紅筆記號：到批改站才有、帶回去、回到寫作站變乾淨；每圈越來越少，最少 1，沒有分數',()=>{
 assert.equal(marksFor(0,0),0);assert.equal(marksFor(2,0),0);assert.equal(marksFor(3,0),0,'寄出時還沒批改');
 assert.equal(marksFor(4,0,false),0,'還在走向批改桌');assert.equal(marksFor(4,0,true),3);assert.equal(marksFor(REVISE_STAGE,0),3);
 assert.equal(marksFor(0,1),3,'帶回去給教材與教學站');assert.equal(marksFor(2,1),0,'寫作站是乾淨的稿紙');
 assert.deepEqual([0,1,2,3,4].map(l=>marksFor(4,l,true)),[3,2,1,1,3]);
 for(let l=0;l<12;l++){const m=marksFor(4,l,true);assert.ok(m>=1&&m<=3);}});

test('02 卡片的茶會示意流程依序對應島上五站與「再看清楚」，並說明紅點不是成效',()=>{
 const t=topics.find(x=>x.id==='teaching'),f=t.flow;assert.ok(f);
 assert.equal(f.steps.length,LOOP_STATIONS.length);assert.deepEqual(f.steps.map(s=>s[0]).slice(0,3),['來到茶會','植物能量','清醒入境']);
 assert.match(f.intro,/保持清醒、從第一視角走進自己的世界/);assert.match(f.note,/不代表任何成效或結果/);
 const text=JSON.stringify(f);for(const bad of [/保證/,/立即回覆/,/24\s*小時/,/療效/,/治癒/,/即時/])assert.ok(!bad.test(text),`不承諾沒有提供的服務：${bad}`);
 assert.ok(t.facts.some(([k,v])=>k==='不是什麼'&&v.includes('不是催眠')));});

test('02 島的模型：有環形步道、箭頭、五個站與一盞永遠亮著的提問燈，全在島面邊界內',async()=>{
 const {arch}=await import('./fixtures/island-models.js');const g=arch.build(new THREE.Group(),{kind:'tower'});g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(g);assert.ok(b.min.x>=-1.34&&b.max.x<=1.34&&b.min.z>=-1.34&&b.max.z<=1.34&&b.max.y<2.6,'留在島面邊界內');
 const lamp=g.getObjectByName('ask-lamp');assert.ok(lamp,'提問燈');assert.ok(lamp.material.emissiveIntensity>=.9,'白天也亮');
 arch.time('night');assert.ok(lamp.material.emissiveIntensity>1.5,'晚上更亮');arch.time('day');assert.ok(lamp.material.emissiveIntensity>=.9,'切回白天仍亮著');
 arch.askPulse(1);assert.ok(lamp.material.emissiveIntensity>1.5,'信飛到時閃一下');arch.askPulse(0);assert.ok(lamp.material.emissiveIntensity<1.5);
 const sign=g.getObjectByName('ask-sign');assert.ok(sign&&sign.userData.textSign,'有字的牌子要鎖最高畫質');
 let flat=0;g.traverse(o=>{if(o.geometry?.type==='ShapeGeometry'&&o.position.y>.25&&o.position.y<.28)flat++;});assert.ok(flat>=9,'步道與箭頭貼在地面');});
