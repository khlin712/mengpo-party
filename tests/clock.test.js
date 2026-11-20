import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('孟婆島的時間停在明亮的下午，不會自己走到夜晚，仍可按鈕跳時',()=>{
 const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 const block=source.slice(source.indexOf('const ISLAND_START='),source.indexOf('function setBird('));
 let now=1000,paused=false;const elements=new Map(),world={setHour(h){this.hour=h;},phase:()=>({name:'day',stars:0}),weather:()=>({})};
 const context=vm.createContext({performance:{now:()=>now},document:{body:{classList:{contains:()=>paused,toggle(){}},dataset:{}}},world,window:{},setInterval(){},$:id=>{if(!elements.has(id))elements.set(id,{setAttribute(k,v){this[k]=v;}});return elements.get(id);}});
 vm.runInContext(block,context);const tick=()=>vm.runInContext('tickClock()',context),clock=()=>context.window.__islandClock();
 tick();assert.equal(clock().time,'14:30');assert.equal(world.hour,14+30/60);
 now=600000;tick();assert.equal(clock().minutes,870,'十分鐘後仍是下午');
 paused=true;now=900000;tick();assert.equal(clock().minutes,870);paused=false;
 elements.get('#day').onclick();assert.equal(clock().time,'18:00');assert.match(elements.get('#day')['aria-label'],/明亮的下午/);
});
