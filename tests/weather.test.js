import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {dayPhase} from '../dist/sky.js';
import {createWeather,RAIN_GAP} from '../dist/weather.js';
import {createDecor} from '../dist/decor.js';
import {topics} from '../dist/content.js';
import {nodes,buildGraph,STOPS} from '../dist/summit.js';

test('島上時鐘：早上是白天、晚上滿天星、清晨黃昏平順過渡',()=>{assert.equal(dayPhase(8).name,'day');assert.equal(dayPhase(12).daylight,1);assert.equal(dayPhase(23).stars,1);assert.equal(dayPhase(2).name,'night');
 assert.equal(dayPhase(6).name,'dawn');assert.equal(dayPhase(18).name,'dusk');assert.equal(dayPhase(32).name,dayPhase(8).name);
 let prev=dayPhase(0).daylight;for(let h=0;h<=24;h+=.05){const d=dayPhase(h).daylight;assert.ok(Math.abs(d-prev)<.05,`${h} 時明暗跳動`);prev=d;}});
test('孟婆島不下雨，白天永遠有彩虹，夜裡淡出；減少動態時彩虹仍在',()=>{const scene=new THREE.Scene();let k=0;const rnd=()=>(k=(k*9301+49297)%233280)/233280;const w=createWeather(scene,{reduced:{matches:false},rnd});
 for(let i=0;i<(RAIN_GAP[1]+2)*10;i++){w.update(.1,1);assert.equal(w.state().raining,false,'不會下雨');}
 w.setRain(true);for(let i=0;i<60;i++)w.update(.1,1);assert.equal(w.state().raining,false,'手動也下不了雨');assert.equal(w.rain(),0);assert.ok(w.state().rainbow>.5,'白天有彩虹');
 for(let i=0;i<200;i++)w.update(.1,0);assert.ok(w.state().rainbow<.05,'夜裡淡出');
 const calm=createWeather(new THREE.Scene(),{reduced:{matches:true}});for(let i=0;i<60;i++)calm.update(.1,1);assert.equal(calm.state().rain,0);assert.ok(calm.state().rainbow>.5);});
test('每座島都有綠色植被，但不擋在步道、橋、滑梯與山壁的接口',()=>{const centers=nodes(topics),graph=buildGraph(centers),scene=new THREE.Scene();const d=createDecor({scene,centers,graph,skip:id=>id==='lava'||!!STOPS[id]?.ledge});
 assert.ok(d.counts.bushes>40&&d.counts.tufts>100&&d.counts.flowers>40&&d.counts.vines>20,JSON.stringify(d.counts));let draws=0;d.group.traverse(m=>{if(m.isInstancedMesh)draws++;});assert.ok(draws<=4);});

test('晴夜星月啟用、白天隱藏，月亮固定世界座標不跟隨鏡頭',async()=>{
 const {createSky}=await import('../dist/sky.js');const scene=new THREE.Scene();scene.fog=new THREE.Fog('#fff',30,95);const sky=createSky(scene,{reduced:{matches:false}}),camera=new THREE.PerspectiveCamera(38,1.3,.1,120);camera.position.set(10,14,30);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 sky.blend('night','night',0,0,1);sky.update(0,camera);scene.updateMatrixWorld(true);const moon=scene.getObjectByName('moon'),fixed=moon.getWorldPosition(new THREE.Vector3());assert.ok(moon.visible);assert.equal(moon.children[1].material.opacity,1);camera.position.set(24,7,-12);camera.lookAt(5,2,4);camera.updateMatrixWorld();sky.update(2,camera);scene.updateMatrixWorld(true);assert.deepEqual(moon.getWorldPosition(new THREE.Vector3()).toArray(),fixed.toArray());
 let stars;scene.traverse(o=>{if(o.isPoints)stars=o;});assert.ok(stars.visible);assert.equal(stars.material.opacity,1);assert.equal(stars.geometry.attributes.position.count,500);
 sky.blend('day','day',0,0,0);assert.ok(!moon.visible&&!stars.visible);
});

test('省電模式關閉彩虹，且沒有雨',()=>{const w=createWeather(new THREE.Scene(),{reduced:{matches:false}});for(let i=0;i<40;i++)w.update(.1,1);assert.ok(w.state().rainbow>.5);w.lowPower();w.update(.1,1);assert.equal(w.rain(),0);assert.equal(w.state().rainbow,0);});
