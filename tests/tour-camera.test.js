import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
test('同步抵達保留進站鏡位，仍在走路才啟動跟隨',()=>{
 for(const immediate of [true,false]){const guideTour={},calls=[],message={};const context=vm.createContext({GUIDE_ROUTE:['start','fork'],guideTour,SKIP_WALK:'',escape:x=>x,stopName:x=>x,bindTourBar(){},insets:()=>({}),$:id=>id==='.tour-bar'?null:message,showTourStop:id=>calls.push(id),world:{guideTo(){if(immediate){guideTour.walking=false;calls.push('station-camera');}return true;},guide:()=>({}),walkerSelect(){},walkerFocus:()=>calls.push('follow')}});
 vm.runInContext(source.slice(source.indexOf('function tourStep('),source.indexOf('// While the guide is leading')),context);vm.runInContext('tourStep(1)',context);
 assert.deepEqual(calls,immediate?['station-camera']:['follow']);assert.equal(guideTour.walking,!immediate);
 }
});
test('誤區導覽同步抵達後也不覆蓋抵達卡的鏡位',()=>{
 for(const immediate of [true,false]){const guideTour={},calls=[];const context=vm.createContext({DETOURS:[['pass1','cliff','帶我去看懸崖']],guideTour,SKIP_WALK:'',escape:x=>x,bindTourBar(){},insets:()=>({}),$:()=>null,openStation(){},world:{guideTo(){if(immediate){guideTour.walking=false;calls.push('arrival');}return true;},guide:()=>({}),walkerSelect(){},walkerFocus:()=>calls.push('follow')}});
 vm.runInContext(source.slice(source.indexOf('function tourDetour('),source.indexOf('// Every island and station card')),context);vm.runInContext("tourDetour('pass1')",context);assert.deepEqual(calls,immediate?['arrival']:['follow']);
 }
});
