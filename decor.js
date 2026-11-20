import * as THREE from './vendor/three.module.min.js';
import {random} from './sky.js';

// Green life on every island so none looks bare: shrubs and grass round the rim, flowers in between, and vines trailing over the
// edge. Nothing is placed where a walkway, the bridge, the slide or the climb meets an island. Instanced, so it costs a few draws.
const LEAVES=['#6f9a5c','#7fae64','#5d8a52','#8cbc6e','#6a9f71'],BLOOMS=['#f2c14e','#e8798a','#ffffff','#9a7bb8','#f08c5a'];
export function createDecor({scene,centers,graph,skip=()=>false,count={bush:9,tuft:14,flower:10,vine:6}}){
 const group=new THREE.Group();group.name='greenery';scene.add(group);
 // Where paths touch each island: keep those spots clear.
 const ends=[];for(const e of graph?.edges||[])ends.push(e.pts[0],e.pts.at(-1));
 const clear=(x,z)=>ends.every(p=>Math.hypot(p.x-x,p.z-z)>.42);
 const bushes=[],tufts=[],flowers=[],vines=[];let seed=1;
 for(const [id,c]of centers){if(skip(id))continue;const edge=c.ring? .6:1.2,scale=edge/1.2,r=random(97+seed++*13),top=(c.y||0)+.24,spot=(rMin,rMax)=>{for(let k=0;k<12;k++){const a=r()*Math.PI*2,d=(rMin+r()*(rMax-rMin))*scale,x=c.x+Math.cos(a)*d,z=c.z+Math.sin(a)*d;if(clear(x,z))return {x,z,a};}return null;};
  for(let i=0;i<count.bush;i++){const p=spot(1.08,1.24);if(p)bushes.push({p:new THREE.Vector3(p.x,top+.06,p.z),s:.09+r()*.08,c:LEAVES[Math.floor(r()*LEAVES.length)]});}
  for(let i=0;i<count.tuft;i++){const p=spot(.72,1.26);if(p)for(let k=0;k<3;k++)tufts.push({p:new THREE.Vector3(p.x+(r()-.5)*.08,top+.05,p.z+(r()-.5)*.08),s:.8+r()*.6,tilt:(r()-.5)*.5,c:LEAVES[Math.floor(r()*LEAVES.length)]});}
  for(let i=0;i<count.flower;i++){const p=spot(.75,1.2);if(p)flowers.push({p:new THREE.Vector3(p.x,top+.035,p.z),s:.8+r()*.5,c:BLOOMS[Math.floor(r()*BLOOMS.length)]});}
  for(let i=0;i<count.vine;i++){const a=r()*Math.PI*2,d=edge,x=c.x+Math.cos(a)*d,z=c.z+Math.sin(a)*d;if(clear(x,z))vines.push({p:new THREE.Vector3(x,(c.y||0)-.12-r()*.1,z),s:.7+r()*.6});}}
 const o=new THREE.Object3D(),col=new THREE.Color();
 function inst(geo,mat,list,set){const m=new THREE.InstancedMesh(geo,mat,Math.max(1,list.length));list.forEach((it,i)=>{set(o,it);o.updateMatrix();m.setMatrixAt(i,o.matrix);if(it.c)m.setColorAt(i,col.set(it.c));});m.count=list.length;m.castShadow=true;m.receiveShadow=true;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere();m.raycast=()=>{};group.add(m);return m;}
 const leaf=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9,flatShading:true});
 inst(new THREE.IcosahedronGeometry(1,0),leaf,bushes,(o,it)=>{o.position.copy(it.p);o.rotation.set(0,it.s*40,0);o.scale.set(it.s*1.2,it.s,it.s*1.2);});
 inst(new THREE.ConeGeometry(.03,.12,4).translate(0,.06,0),leaf,tufts,(o,it)=>{o.position.copy(it.p).setY(it.p.y-.05);o.rotation.set(it.tilt,it.s*9,0);o.scale.setScalar(it.s);});
 inst(new THREE.SphereGeometry(.028,6,4),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.6}),flowers,(o,it)=>{o.position.copy(it.p);o.rotation.set(0,0,0);o.scale.setScalar(it.s);});
 const vineMat=new THREE.MeshStandardMaterial({color:'#5d8a52',roughness:.95,flatShading:true});
 inst(new THREE.ConeGeometry(.07,.42,5).rotateX(Math.PI).translate(0,-.21,0),vineMat,vines,(o,it)=>{o.position.copy(it.p);o.rotation.set(0,it.s*7,0);o.scale.set(it.s,it.s*1.2,it.s);});
 return {group,counts:{bushes:bushes.length,tufts:tufts.length,flowers:flowers.length,vines:vines.length}};
}
