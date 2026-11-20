import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import * as THREE from '../dist/vendor/three.module.min.js';
test('第二站以牌面近景為準，不再因整段路線或側欄把鏡頭拉遠',()=>{
 const source=readFileSync(new URL('../dist/world.js',import.meta.url),'utf8');
 for(const [aspect,distance]of [[1.6,4.2],[.46,3.05]]){let result;const fork=new THREE.Vector3(2.8,0,5);const context=vm.createContext({THREE,camera:{aspect,fov:38},centers:new Map([['fork',fork]]),fractions:()=>[.3,.4],fitDistance:()=>{throw Error('牌子近景不以整段路線估距');},shifted:(p,t)=>[p,t],flyTo:(p,t)=>{result={p,t};}});
 vm.runInContext(source.slice(source.indexOf(' const FORK_DIR='),source.indexOf(' function refit(')),context);vm.runInContext("focusStation('fork',{left:360,right:320,bottom:300})",context);
 assert.ok(Math.abs(result.p.distanceTo(result.t)-distance)<1e-6);assert.equal(result.t.y,.85);assert.equal(result.t.z,4.55);assert.deepEqual(fork.toArray(),[2.8,0,5]);
 }
});
