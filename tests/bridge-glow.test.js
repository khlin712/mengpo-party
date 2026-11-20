import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {createRoute} from '../dist/route3d.js';
import {nodes,bridgePath,SUMMIT} from '../dist/summit.js';
import {topics} from '../dist/content.js';
// Brightness of the golden bridge's steps: the sweep (choosing the trophy) equals a footstep, and they don't stack.
function steps(scene){const out=[];scene.traverse(o=>{if(o.isMesh&&o.userData.step!==undefined)out.push(o);});return out.sort((a,b)=>a.userData.step-b.userData.step);}
test('點獎盃時橋亮起的亮度，等於有人走過時腳下的亮度，兩者不疊加',()=>{
 const c=nodes(topics),bridge=bridgePath(c.get('fork'),c.get(SUMMIT)),make=()=>{const scene=new THREE.Scene();const r=createRoute({scene,centers:new Map(),walkways:[],bridge,trophyAt:c.get(SUMMIT),reduced:{matches:true}});return {scene,r};};
 const a=make(),b=make();a.r.light(true);a.r.update(.016,0,[]);const swept=steps(a.scene);
 const mid=bridge[Math.floor(bridge.length/2)],foot=new THREE.Vector3(mid.x,mid.y,mid.z);b.r.update(.016,0,[foot]);const stepped=steps(b.scene),i=stepped.findIndex(m=>m.material.emissiveIntensity>stepped[0].material.emissiveIntensity+.1);
 assert.ok(i>=0,'有人走過的那一階會亮');assert.ok(Math.abs(swept[i].material.emissiveIntensity-stepped[i].material.emissiveIntensity)<1e-9,`橋亮起 ${swept[i].material.emissiveIntensity} ≠ 腳下 ${stepped[i].material.emissiveIntensity}`);
 a.r.update(.016,0,[foot]);assert.ok(Math.abs(swept[i].material.emissiveIntensity-stepped[i].material.emissiveIntensity)<1e-9,'亮起時有人走過，不會更亮');});
