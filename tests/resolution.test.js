import test from 'node:test';
import assert from 'node:assert/strict';
import {createResolution,STEP,WINDOW_MS,UP_AFTER_MS,LOCK_SETTLE_MS} from '../dist/resolution.js';

const run=(r,ms,seconds,t0)=>{let now=t0,changes=[];for(let i=0;i<seconds*1000/ms;i++){now+=ms;const v=r.sample(now,ms,false);if(v!==null)changes.push(v);}return {now,changes};};
test('畫面跑不動時一次降一級畫質，不低於下限',()=>{const r=createResolution({max:2});const {changes}=run(r,40,30,0);assert.equal(changes[0],2-STEP);assert.ok(changes.every((v,i)=>i===0||v<changes[i-1]));assert.equal(r.ratio,1,'最低到 1 倍');});
test('順暢一段時間後才升回，不會忽高忽低',()=>{const r=createResolution({max:2});let {now}=run(r,40,6,0);const low=r.ratio;assert.ok(low<2);
 const quick=run(r,16.7,(UP_AFTER_MS-WINDOW_MS)/1000,now);assert.ok(r.ratio<=low,'剛變順還不升');now=quick.now;
 const later=run(r,16.7,UP_AFTER_MS*3/1000,now);assert.ok(r.ratio>low&&r.ratio<=2);assert.ok(later.changes.every((v,i)=>i===0||v>later.changes[i-1]),'只往上升');});
test('切到背景或卡住很久回來的那一幀不算慢',()=>{const r=createResolution({max:2});let now=0;for(let i=0;i<200;i++){now+=16.7;r.sample(now,16.7,false);}
 assert.equal(r.sample(now+5000,5000,false),null);assert.equal(r.sample(now+5100,40,true),null);assert.equal(r.ratio,2);});
test('螢幕本來就是 1 倍時不會被調低到 1 以下',()=>{const r=createResolution({max:1});run(r,60,20,0);assert.equal(r.ratio,1);});
test('看得到有字的告示牌時鎖定最高畫質，再慢也不降；離開後才恢復自動調整',()=>{const r=createResolution({max:2});run(r,40,10,0);assert.ok(r.ratio<2);
 assert.equal(r.lock(true,10000),null);assert.equal(r.lock(true,10000+LOCK_SETTLE_MS),2,'穩定可見後回到最清楚');assert.equal(r.lock(true,11000),null);const {changes}=run(r,60,20,20000);assert.deepEqual(changes,[]);assert.equal(r.ratio,2,'鎖定時不降畫質');
 assert.equal(r.lock(false,50000),null);assert.equal(r.lock(false,50000+LOCK_SETTLE_MS),null);run(r,60,20,60000);assert.ok(r.ratio<2,'離開後慢的話照常降');});

test('短暫掠過與飛行延期不切畫質，恢復省電不受告示牌鎖定拉高',()=>{
 const r=createResolution({max:2});run(r,40,10,0);const before=r.ratio;
 r.lock(true,10000);r.lock(false,10200);r.lock(true,10400);assert.equal(r.ratio,before);
 r.defer(11000);assert.equal(r.lock(true,11001),null);assert.equal(r.ratio,before);
 r.lowPower();assert.equal(r.ratio,1);r.lock(true,12000);r.lock(true,14000);run(r,16,30,15000);assert.equal(r.ratio,1);assert.equal(r.locked,false);
});
