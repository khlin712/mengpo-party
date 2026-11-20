import * as THREE from './vendor/three.module.min.js';

// Original island figures: round heads, simple faces, hair, and arms and legs that swing when they walk.
// They are map characters only; none of them depicts a real student, parent or teacher.
// Each figure is drawn in six pieces (two legs, two arms, the body with head and props, and its shadow) so forty of them stay light.
const G={
 leg:new THREE.BoxGeometry(.05,.15,.06).translate(0,-.075,0),
 shoe:new THREE.BoxGeometry(.058,.032,.084).translate(0,-.15,.012),
 body:new THREE.BoxGeometry(.16,.17,.1),
 arm:new THREE.BoxGeometry(.042,.13,.046).translate(0,-.065,0),
 hand:new THREE.SphereGeometry(.026,8,6),
 head:new THREE.SphereGeometry(.088,16,12),
 hair:new THREE.SphereGeometry(.094,16,10,0,Math.PI*2,0,Math.PI*.56),
 eye:new THREE.SphereGeometry(.012,6,4),
 ball:new THREE.SphereGeometry(1,10,8),
 box:new THREE.BoxGeometry(1,1,1),
 pole:new THREE.CylinderGeometry(.007,.007,.44,5),
 shadow:new THREE.CircleGeometry(.12,16).rotateX(-Math.PI/2),
 hit:new THREE.BoxGeometry(.34,.7,.34).translate(0,.33,0)
};
const pennant=new THREE.BufferGeometry();pennant.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,-.1,0,0,-.05,-.17, 0,0,0,0,-.05,-.17,0,-.1,0],3));pennant.computeVertexNormals();
export const EYE='#2a2522';
const figureMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78});
const shadowMat=new THREE.MeshBasicMaterial({color:'#1f2a24',transparent:true,opacity:.2,depthWrite:false}),hitMat=new THREE.MeshBasicMaterial({visible:false});
export const HAIR_STYLES={short:'短髮',long:'長髮',bun:'丸子頭',cap:'棒球帽'};
export const PROPS={book:'筆記本',backpack:'書包',bag:'側背包',flag:'導覽旗'};
export const FIGURE_SCALE=.85;
// Bake several coloured parts into one geometry (vertex colours), so a body part is a single draw.
const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),V=new THREE.Vector3(),S=new THREE.Vector3();
function baked(parts){const pos=[],nor=[],col=[];for(const [geo,color,[x=0,y=0,z=0]=[],[sx=1,sy=1,sz=1]=[],[rx=0,ry=0,rz=0]=[]]of parts){
  const g=(geo.index?geo.toNonIndexed():geo.clone());M.compose(V.set(x,y,z),Q.setFromEuler(E.set(rx,ry,rz)),S.set(sx,sy,sz));g.applyMatrix4(M);
  const c=new THREE.Color(color),p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++){pos.push(p.getX(i),p.getY(i),p.getZ(i));nor.push(n.getX(i),n.getY(i),n.getZ(i));col.push(c.r,c.g,c.b);}g.dispose();}
 const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));out.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));out.setAttribute('color',new THREE.Float32BufferAttribute(col,3));out.computeBoundingSphere();return out;}

export function makeFigure(look={}){
 const {skin='#efcaa6',hair='#3a2e28',hairStyle='short',shirt='#d98f6a',pants='#4e5d6c',shoes='#3b3532',prop=null,accent='#f2c14e'}=look;
 const fig=new THREE.Group();fig.name='figure';
 const piece=(parent,parts,x=0,y=0,z=0)=>{const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);const m=new THREE.Mesh(baked(parts),figureMat);g.add(m);return g;};
 const hips=new THREE.Group();hips.position.y=.17;fig.add(hips);
 const legs=[-1,1].map(side=>piece(hips,[[G.leg,pants],[G.shoe,shoes]],side*.04));
 const torso=new THREE.Group();torso.position.y=.17;fig.add(torso);
 const H=.255,parts=[[G.body,shirt,[0,.085,0]],[G.head,skin,[0,H,0]]];
 for(const side of [-1,1])parts.push([G.eye,EYE,[side*.032,H+.01,.08]],[G.ball,'#f0a59a',[side*.054,H-.02,.07],[.016,.01,.008]]);
 // The hair cap tilts back so the face stays visible from the usual camera angle.
 parts.push([G.hair,hairStyle==='cap'?accent:hair,[0,H+.005,-.008],[1,1,1],[-.32,0,0]]);
 if(hairStyle==='long')parts.push([G.box,hair,[0,H-.055,-.055],[.17,.17,.05]]);
 if(hairStyle==='bun')parts.push([G.ball,hair,[0,H+.115,-.035],[.045,.045,.045]]);
 if(hairStyle==='cap')parts.push([G.box,accent,[0,H+.045,.085],[.15,.014,.07]]);
 if(prop==='book')parts.push([G.box,accent,[0,.08,.068],[.1,.12,.024]]);
 if(prop==='backpack')parts.push([G.box,accent,[0,.09,-.07],[.13,.15,.05]]);
 if(prop==='bag')parts.push([G.box,accent,[.098,.02,.01],[.035,.075,.09]],[G.box,'#5b4a3c',[.02,.11,0],[.15,.012,.104],[0,0,-.75]]);
 if(prop==='flag')parts.push([G.pole,'#6b5a45',[-.06,.22,-.06]],[pennant,accent,[-.06,.43,-.06]]);
 const body=new THREE.Mesh(baked(parts),figureMat);torso.add(body);
 const arms=[-1,1].map(side=>piece(torso,[[G.arm,shirt],[G.hand,skin,[0,-.14,0]]],side*.1,.16));
 const shadow=new THREE.Mesh(G.shadow,shadowMat);shadow.position.y=.004;shadow.raycast=()=>{};fig.add(shadow);
 const hit=new THREE.Mesh(G.hit,hitMat);hit.name='figure-hit';fig.add(hit);
 fig.userData.rig={legs,arms,torso,body,hit};
 return fig;
}
// A walk cycle: legs and arms swing against each other and the body bobs twice per stride.
// Sliding: sitting with legs out in front and both arms up.
// Climbing: arms reach up in turn and the knees lift, facing the rock.
export function pose(phase,amount,sliding=0,climbing=0){const s=Math.sin(phase),k=amount*(1-sliding)*(1-climbing),c=climbing;return {leg:s*.6*k-1.35*sliding-(.5+.4*s)*c,legB:-s*.6*k-1.35*sliding-(.5-.4*s)*c,arm:-s*.5*k-2.7*sliding-(2.6+.4*s)*c,armB:s*.5*k-2.7*sliding-(2.6-.4*s)*c,bob:Math.abs(Math.cos(phase))*.016*k,turn:s*.05*k};}
export function applyPose(fig,p){const r=fig.userData.rig;r.legs[0].rotation.x=p.leg;r.legs[1].rotation.x=p.legB;r.arms[0].rotation.x=p.arm;r.arms[1].rotation.x=p.armB;r.torso.position.y=.17+p.bob;r.torso.rotation.y=p.turn;}

export const FRONT_Z=.62;
export const islandTop=p=>(p.y||0)+.25;
export function makeRoute(pts){const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y,pts[i].z-pts[i-1].z));return {pts,cum,total:cum[cum.length-1]};}
// Where a walker is after covering distance s, which way it faces, and whether it is on the slide.
export function along(route,s){const {pts,cum,total}=route;if(pts.length===1||total===0)return {...pts[pts.length-1],heading:null,slide:false};const d=Math.max(0,Math.min(total,s));let i=1;while(i<pts.length-1&&cum[i]<d)i++;
 const a=pts[i-1],b=pts[i],t=(d-cum[i-1])/((cum[i]-cum[i-1])||1);
 return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,heading:Math.hypot(b.x-a.x,b.z-a.z)>1e-6?Math.atan2(b.x-a.x,b.z-a.z):null,island:a.island===b.island?a.island:null,slide:!!(a.slide&&b.slide),climb:a.path==='climb'&&b.path==='climb',trail:a.path==='trail'&&b.path==='trail',trailId:a.trailId===b.trailId?a.trailId:null,trailU:a.trailU+(b.trailU-a.trailU)*t};}
