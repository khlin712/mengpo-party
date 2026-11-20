import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {makeFigure,pose,applyPose,HAIR_STYLES,PROPS,FIGURE_SCALE,EYE} from '../dist/people.js';
import {readAvatar,SHIRTS} from '../dist/walkers.js';

test('人物有臉、頭髮、手腳，不是空殼；大小與繪製量有上限',()=>{const shapes=new Set(),props=Object.keys(PROPS),eye=new THREE.Color(EYE);Object.keys(HAIR_STYLES).forEach((hairStyle,k)=>{const fig=makeFigure({hairStyle,prop:props[k%props.length]});fig.scale.setScalar(FIGURE_SCALE);fig.updateMatrixWorld(true);
  const {legs,arms,body,hit}=fig.userData.rig;assert.equal(legs.length,2);assert.equal(arms.length,2);
  let meshes=0;const box=new THREE.Box3();fig.traverse(m=>{if(!m.isMesh||m===hit)return;meshes++;if(m.geometry.type!=='CircleGeometry')box.expandByObject(m);});
  const c=body.geometry.attributes.color;let eyes=0;for(let i=0;i<c.count;i++)if(Math.abs(c.getX(i)-eye.r)<1e-4&&Math.abs(c.getY(i)-eye.g)<1e-4&&Math.abs(c.getZ(i)-eye.b)<1e-4)eyes++;
  assert.ok(eyes>0,'有眼睛');assert.equal(meshes,6,'每個人物 6 次繪製');const h=box.max.y-box.min.y;assert.ok(h>.4&&h<.57,`身高 ${h}`);shapes.add(`${body.geometry.attributes.position.count}:${h.toFixed(3)}`);});
 assert.ok(shapes.size>=3,'髮型看得出差異');});
test('走路時手腳前後交錯擺動，站著時回到原位',()=>{const fig=makeFigure();const {legs,arms}=fig.userData.rig;applyPose(fig,pose(1.2,1));assert.ok(legs[0].rotation.x>.3);assert.equal(legs[1].rotation.x,-legs[0].rotation.x);assert.ok(Math.sign(arms[0].rotation.x)!==Math.sign(legs[0].rotation.x));applyPose(fig,pose(1.2,0));for(const p of [...legs,...arms])assert.equal(Math.abs(p.rotation.x),0);});
test('我的角色只接受已知選項，名字最多 8 字，壞資料回到預設',()=>{assert.deepEqual(readAvatar('not json'),{name:'',role:'參加者',hairStyle:'short',shirt:SHIRTS[0]});assert.deepEqual(readAvatar(JSON.stringify({name:'  很長很長很長很長的名字  ',role:'陪伴者',hairStyle:'bun',shirt:SHIRTS[3]})),{name:'很長很長很長很長',role:'陪伴者',hairStyle:'bun',shirt:SHIRTS[3]});assert.equal(readAvatar(JSON.stringify({role:'老師',hairStyle:'mohawk',shirt:'red'})).role,'參加者');});

test('頭下緣與衣領接合，站立、走路、攀爬都沒有懸空的頭',()=>{const skin=new THREE.Color('#efcaa6'),shirt=new THREE.Color('#d98f6a'),fig=makeFigure();const {body}=fig.userData.rig,p=body.geometry.attributes.position,c=body.geometry.attributes.color;
 let headBottom=Infinity,collar=-Infinity;
 for(let i=0;i<p.count;i++){const near=q=>Math.abs(c.getX(i)-q.r)<1e-4&&Math.abs(c.getY(i)-q.g)<1e-4&&Math.abs(c.getZ(i)-q.b)<1e-4;
  if(near(skin))headBottom=Math.min(headBottom,p.getY(i));if(near(shirt))collar=Math.max(collar,p.getY(i));}
 for(const args of [[0,0],[1.2,1],[1.2,1,0,1]]){applyPose(fig,pose(...args));assert.ok(headBottom-collar<=.005,`頭身空隙 ${headBottom-collar}`);assert.ok(headBottom>collar-.02,'頭部不埋進衣服');}});
