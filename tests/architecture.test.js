import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {createArchitecture} from '../dist/architecture.js';
import {topics} from '../dist/content.js';
const unit=new THREE.BoxGeometry(1,1,1),materials=new Map();
function mesh(g,geo,color,x,y,z,sx=1,sy=1,sz=1){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color}));const m=new THREE.Mesh(geo,materials.get(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m;}
function box(g,x,y,z,w,h,d,c){return mesh(g,unit,c,x,y+h/2,z,w,h,d);}
const kit=createArchitecture({mesh,box,tree(g,x,z,s){box(g,x,.25,z,s*.2,s,s*.2,'#698760');}});
test('每座主題島的建築幾何有限、保留島面邊界與零貼圖資產，細節量有上限',()=>{let meshes=0;const silhouettes=[];for(const t of topics){const g=new THREE.Group();const model=kit.build(g,t);model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());assert.ok([size.x,size.y,size.z].every(v=>Number.isFinite(v)&&v>0));assert.ok(bounds.min.x>=-1.34&&bounds.max.x<=1.34);assert.ok(bounds.min.z>=-1.34&&bounds.max.z<=1.34);assert.ok(bounds.max.y<2.6);model.traverse(m=>{if(m.isMesh){meshes++;assert.equal(m.material.map,null);}});silhouettes.push(size.toArray().map(n=>n.toFixed(2)).join(':'));}assert.equal(new Set(silhouettes).size,topics.length);assert.ok(meshes<700,`新增模型部件數 ${meshes}`);});
test('夜間窗光不污染牆面與屋頂材質，切回白天還原',()=>{const model=kit.build(new THREE.Group(),topics[0]),lights=[];model.traverse(m=>{if(m.isMesh&&m.material.emissive.getHexString()==='ffc874')lights.push(m.material);});assert.ok(lights.length>0);kit.time('night');assert.ok(lights.every(m=>m.emissiveIntensity===1.35));kit.time('day');assert.ok(lights.every(m=>m.emissiveIntensity===0&&m.color.getHexString()==='638d97'));});
