import {TRAIL_WIDTH} from './hazards.js';
import * as THREE from './vendor/three.module.min.js';

// Draws the walkways between islands, ③ the silver-and-gold bridge from the top of the steep wall to the trophy,
// the holds up the steep wall, and the stone stairs down from the university to the calendar island.
// Repeated parts are instanced, so the whole route costs a handful of draws.
const up=new THREE.Vector3(0,1,0);
function frames(pts){return pts.map((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];const t=new THREE.Vector3(b.x-a.x,0,b.z-a.z).normalize();const side=new THREE.Vector3().crossVectors(t,up).normalize();return {p:new THREE.Vector3(p.x,p.y,p.z),t,side,yaw:Math.atan2(t.x,t.z)};});}
function instanced(geo,mat,list){const m=new THREE.InstancedMesh(geo,mat,Math.max(1,list.length)),o=new THREE.Object3D();o.rotation.order='YXZ';list.forEach((x,i)=>{o.position.copy(x.p);o.rotation.set(x.rx||0,x.yaw||0,0);o.scale.copy(x.s||new THREE.Vector3(1,1,1));o.updateMatrix();m.setMatrixAt(i,o.matrix);});m.count=list.length;m.castShadow=m.receiveShadow=true;m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();return m;}

// Where the ropes hang, side by side along the rim (offsets along the rim from the climb line). Climbers pick one.
// How long the light takes to climb the whole bridge, bottom to top.
export const SWEEP_MS=2600;
// How much a step brightens under a foot; the sweep up the bridge (choosing the trophy) lights each step by the same amount.
export const FOOT_GLOW=.95;
export const ROPES=[-.48,-.16,.16,.48];
export function createRoute({scene,centers,walkways,bridge:stairs,descent=[],slide=[],climb=[],trail=[],trophyAt,reduced,hazards}){
 const group=new THREE.Group();group.name='summit-route';scene.add(group);
 const unit=new THREE.BoxGeometry(1,1,1),post=new THREE.CylinderGeometry(1,1,1,8),ball=new THREE.SphereGeometry(1,12,8);
 // ---- Plank walkways between islands, with low rails. ----
 const wood=new THREE.MeshStandardMaterial({color:'#c9a77a',roughness:.9}),railMat=new THREE.MeshStandardMaterial({color:'#efe3c6',roughness:.8});
 const decks=[],rails=[],posts=[];
 // Each deck runs from just inside one rim to just inside the other (small ledges have a smaller rim), and its top sits a hair
 // below the island surface, so the plank tucks under the rim instead of flickering against it or stopping short of it.
 const rim=c=>c.ring?.56:1.08;
 for(const [a,b]of walkways){const A=centers.get(a),B=centers.get(b);if(!A||!B)continue;const y=(A.y||0)+.192,dx=B.x-A.x,dz=B.z-A.z,len=Math.hypot(dx,dz),dir=new THREE.Vector3(dx/len,0,dz/len),yaw=Math.atan2(dx,dz),side=new THREE.Vector3(dz,0,-dx).normalize();
  const ra=rim(A),rb=rim(B),span=len-ra-rb,mid=new THREE.Vector3(A.x,y,A.z).addScaledVector(dir,ra+span/2);
  decks.push({p:mid,yaw,s:new THREE.Vector3(.36,.08,span)});
  for(const k of [-1,1]){rails.push({p:mid.clone().addScaledVector(side,k*.19).setY(y+.16),yaw,s:new THREE.Vector3(.025,.025,Math.max(.1,span-.3))});
   for(let i=0;i<=4;i++){const f=-.5+i/4,q=mid.clone().addScaledVector(dir,f*Math.max(.1,span-.4)).addScaledVector(side,k*.19);posts.push({p:q.setY(y+.08),s:new THREE.Vector3(.016,.16,.016)});}}}
 group.add(instanced(unit,wood,decks),instanced(unit,railMat,rails),instanced(post,railMat,posts));
 // ---- ③ The bridge: silver on the first half, gold after a landing. When chosen it lights up step by step from the bottom up. ----
 const silver=new THREE.MeshStandardMaterial({color:'#b9c2cc',roughness:.28,metalness:.55,emissive:'#9cc3f5',emissiveIntensity:0});
 const gold=new THREE.MeshStandardMaterial({color:'#dcc07a',roughness:.26,metalness:.6,emissive:'#ffb43c',emissiveIntensity:0});
 const riser=new THREE.MeshStandardMaterial({color:'#ece2cc',roughness:.85});
 const lampGlow=new THREE.MeshStandardMaterial({color:'#fff4d6',emissive:'#ffd27a',emissiveIntensity:1.1});
 const f=frames(stairs),half=Math.floor(f.length/2),gap=f.length>1?f[0].p.distanceTo(f[1].p):.17;
 const treads=[[],[]],risers=[],rail=[[],[]],stakes=[],lampPosts=[],lamps=[];
 const steps=[];
 f.forEach((x,i)=>{const d=gap;risers.push({p:x.p.clone().setY(x.p.y-.13),yaw:x.yaw,s:new THREE.Vector3(.46,.16,d*1.04)});
  for(const k of [-1,1]){const q=x.p.clone().addScaledVector(x.side,k*.27);rail[k<0?0:1].push(q.clone().setY(q.y+.36));if(i%3===0)stakes.push({p:q.clone().setY(q.y+.18),s:new THREE.Vector3(.014,.36,.014)});}
  if(i%10===5){const k=i%20===5?1:-1,q=x.p.clone().addScaledVector(x.side,k*.33);lampPosts.push({p:q.clone().setY(q.y+.3),s:new THREE.Vector3(.018,.6,.018)});lamps.push({p:q.clone().setY(q.y+.63),s:new THREE.Vector3(.055,.055,.055)});}});
 const stairGroup=new THREE.Group();stairGroup.name='golden-bridge';
 // Each step has its own material so the light can climb the bridge one step at a time.
 f.forEach((x,i)=>{const m=(i<half?silver:gold).clone(),t=new THREE.Mesh(unit,m);t.userData.step=i;t.position.copy(x.p).setY(x.p.y-.025);t.rotation.y=x.yaw;t.scale.set(.5,.05,gap*1.04);t.castShadow=t.receiveShadow=true;stairGroup.add(t);steps.push({m,glow:i<half?.55:.7,lit:0,foot:0,p:x.p});});
 stairGroup.add(instanced(unit,riser,risers),instanced(post,railMat,stakes),instanced(post,new THREE.MeshStandardMaterial({color:'#5e6a6e',roughness:.6}),lampPosts),instanced(ball,lampGlow,lamps));
 for(const side of rail){const curve=new THREE.CatmullRomCurve3(side);const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,side.length*2),.018,6,false),new THREE.MeshStandardMaterial({color:'#f6efe0',roughness:.4,metalness:.2}));tube.castShadow=true;stairGroup.add(tube);}
 // A round landing where silver hands over to gold.
 group.add(stairGroup);
 // ---- Stone stairs down from the university, and holds up the steep wall (never lit). ----
 const stone=new THREE.MeshStandardMaterial({color:'#cfc3ab',roughness:.95});const df=frames(descent),dg=df.length>1?df[0].p.distanceTo(df[1].p):.17;
 if(df.length){const dRails=[[],[]];group.add(instanced(unit,stone,df.map(x=>({p:x.p.clone().setY(x.p.y-.05),yaw:x.yaw,s:new THREE.Vector3(.44,.1,dg*1.05)}))),instanced(unit,riser,df.map(x=>({p:x.p.clone().setY(x.p.y-.17),yaw:x.yaw,s:new THREE.Vector3(.4,.16,dg*1.05)}))));
  df.forEach(x=>{for(const k of [-1,1]){const q=x.p.clone().addScaledVector(x.side,k*.24);dRails[k<0?0:1].push(q.setY(q.y+.3));}});for(const side of dRails){const t=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(side),side.length*2,.014,5,false),railMat);group.add(t);}}
 // The down escalator from the university to the calendar island: steps that keep sliding downhill between glass side panels with
 // dark handrails, on slim yellow columns. Riders just stand on it.
 const esc={steps:null,pts:slide,cum:[0],total:0,gap:.22,count:0};
 if(slide.length>1){for(let i=1;i<slide.length;i++)esc.cum.push(esc.cum[i-1]+Math.hypot(slide[i].x-slide[i-1].x,slide[i].y-slide[i-1].y,slide[i].z-slide[i-1].z));esc.total=esc.cum.at(-1);esc.count=Math.floor(esc.total/esc.gap);
  esc.steps=new THREE.InstancedMesh(unit,new THREE.MeshStandardMaterial({color:'#9aa3ab',roughness:.4,metalness:.5}),esc.count);esc.steps.castShadow=esc.steps.receiveShadow=true;esc.steps.frustumCulled=false;esc.steps.name='escalator';group.add(esc.steps);
  const sf=frames(slide),glass=new THREE.MeshStandardMaterial({color:'#bfe3f0',roughness:.1,metalness:.1,transparent:true,opacity:.42,depthWrite:false}),dark=new THREE.MeshStandardMaterial({color:'#2f3b33',roughness:.5});
  const panels=[];sf.forEach((x,i)=>{if(i===sf.length-1)return;const n=sf[i+1],run=x.p.distanceTo(n.p),mid=x.p.clone().lerp(n.p,.5),rx=-Math.atan2(n.p.y-x.p.y,Math.hypot(n.p.x-x.p.x,n.p.z-x.p.z));for(const k of [-1,1])panels.push({p:mid.clone().addScaledVector(x.side,k*.3).setY(mid.y+.18),yaw:x.yaw,rx,s:new THREE.Vector3(.02,.3,run*1.02)});});
  group.add(instanced(unit,glass,panels));
  for(const k of [-1,1]){const pts=sf.map(x=>x.p.clone().addScaledVector(x.side,k*.3).setY(x.p.y+.36));group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),pts.length*2,.022,6,false),dark));}
  group.add(instanced(post,new THREE.MeshStandardMaterial({color:'#f2c14e',roughness:.5}),sf.filter((_,i)=>i%9===4&&i<sf.length-6).map(x=>({p:new THREE.Vector3(x.p.x,(x.p.y-.6)/2,x.p.z),s:new THREE.Vector3(.05,Math.max(.1,x.p.y+.6),.05)}))));
  const side=new THREE.Mesh(trough(slide,.26),new THREE.MeshStandardMaterial({color:'#d8dde2',roughness:.5,metalness:.3,side:THREE.DoubleSide}));side.position.y=-.06;side.name='escalator-body';group.add(side);}
 const escAt=(d)=>{let i=1;while(i<esc.cum.length-1&&esc.cum[i]<d)i++;const a=esc.pts[i-1],b=esc.pts[i],t=(d-esc.cum[i-1])/((esc.cum[i]-esc.cum[i-1])||1);return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,yaw:Math.atan2(b.x-a.x,b.z-a.z)};};
 const eo=new THREE.Object3D();eo.rotation.order='YXZ';
 function moveEscalator(elapsed){if(!esc.steps)return;const shift=reduced?.matches?0:(elapsed*.45)%esc.gap;for(let i=0;i<esc.count;i++){const p=escAt(Math.min(esc.total,i*esc.gap+shift));eo.position.set(p.x,p.y-.03,p.z);eo.rotation.set(0,p.yaw,0);eo.scale.set(.5,.06,esc.gap*.92);eo.updateMatrix();esc.steps.setMatrixAt(i,eo.matrix);}esc.steps.instanceMatrix.needsUpdate=true;}
 // The rough way: weathered planks that pitch up and down over the humps, with nothing to hold on to — slow, hard going.
 const roughDecks=[];
 const plank=new THREE.MeshStandardMaterial({color:'#a8916f',roughness:1}),ropeMat=new THREE.MeshStandardMaterial({color:'#c9a874',roughness:.9});
 for(const [segment,seg] of trail.entries()){if(seg.length<2)continue;const tf=frames(seg);const list=tf.map((x,i)=>{const a=seg[Math.max(0,i-1)],b=seg[Math.min(seg.length-1,i+1)],run=Math.hypot(b.x-a.x,b.z-a.z)||1;return {p:x.p.clone().setY(x.p.y-.04),yaw:x.yaw+(i%3-1)*.05,rx:-Math.atan2(b.y-a.y,run),s:new THREE.Vector3(TRAIL_WIDTH,.05,Math.hypot(run,b.y-a.y)/((i>0&&i<seg.length-1)?2:1)*.95)};});
  const deck=instanced(unit,plank,list);deck.name='wrong-route-deck';deck.frustumCulled=false;
  // Tapping the rough way opens ② with the pitfall it leads to: the two cliff tops, or (the last stretch) the steep wall.
  deck.userData.path=segment===trail.length-1?'wall':segment===0?'cliff':'cliff2';group.add(deck);roughDecks.push({deck,list,segment});
  // Sagging support ropes beneath both sides, without adding protective handrails.
  for(const k of [-1,1]){const rope=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tf.map(x=>x.p.clone().addScaledVector(x.side,k*TRAIL_WIDTH/2).setY(x.p.y-.13))),tf.length*2,.012,5,false),ropeMat);group.add(rope);roughDecks.at(-1).ropes??=[];roughDecks.at(-1).ropes.push(rope);}}
 // ② The steep wall: several knotted ropes hanging from the trophy island's rim down to the ledge; climbers go up them hand over hand.
 const climbRopes=[];
 if(climb.length){const top=climb.at(-1),bottom=climb[0],dir=new THREE.Vector3(bottom.x-trophyAt.x,0,bottom.z-trophyAt.z).normalize(),tan=new THREE.Vector3(-dir.z,0,dir.x),knots=[];
  for(const off of ROPES){const x=top.x+tan.x*off,z=top.z+tan.z*off,pts=[new THREE.Vector3(x,top.y+.08,z),new THREE.Vector3(x+dir.x*.03,(top.y+bottom.y)/2,z+dir.z*.03),new THREE.Vector3(x,bottom.y-.1,z)];
   {const rope=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),20,.016,6,false),ropeMat);rope.userData.path='wall';group.add(rope);climbRopes.push(rope);}for(let y=bottom.y+.15;y<top.y;y+=.28)knots.push({p:new THREE.Vector3(x,y,z),s:new THREE.Vector3(.03,.03,.03)});
   const peg=new THREE.Mesh(post,new THREE.MeshStandardMaterial({color:'#6b5a45',roughness:.9}));peg.scale.set(.03,.14,.03);peg.position.set(x-dir.x*.05,top.y+.05,z-dir.z*.05);group.add(peg);}
  group.add(instanced(ball,ropeMat,knots));}
 // Light motes drifting along the golden bridge once it is lit.
 const motes=[],moteMat=new THREE.MeshBasicMaterial({color:'#fff3cf',transparent:true,opacity:0,depthWrite:false});
 for(let i=0;i<16;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.03,6,4),moteMat);m.raycast=()=>{};m.visible=false;group.add(m);motes.push({m,phase:i/16,lift:.14+(i%3)*.07});}
 let want=0,lit=0,since=0;const SWEEP=SWEEP_MS;
 return {group,stairGroup,
  pickables:[stairGroup,...roughDecks.map(d=>d.deck),...climbRopes],
  light(on,delay=0){if(on&&!want)since=performance.now()+delay;want=on?1:0;},
  lit:()=>Math.round(lit*100)/100,
  // feet: where people are standing right now; any step under a foot lights up and fades after they pass.
  update(dt,elapsed,feet=[]){moveEscalator(elapsed);
   for(const {deck,list,segment,ropes} of roughDecks){const h=hazards?.span(segment),broken=h?.phase==='broken'||h?.phase==='repair';
    for(const r of ropes)r.visible=!broken;
    list.forEach((x,i)=>{const u=i/(list.length-1),gap=hazards?.gap(segment,u),warning=h?.phase==='warning'&&Math.abs(u-h.center)<.09;
     eo.position.copy(x.p);eo.rotation.set(x.rx||0,x.yaw,0);eo.scale.copy(x.s);
     if(gap){
      if(h.phase==='repair'){const delay=(u-h.center+.09)/.18*2.6,build=Math.max(0,Math.min(1,(h.age-delay)/.4));eo.scale.z*=build;if(!build)eo.scale.setScalar(0);}
      else{eo.position.y-=4.5*h.age*h.age;eo.rotation.x+=h.age*(i%2?1:-1);if(h.age>1.5)eo.scale.setScalar(0);}
     }
     else if(warning)eo.rotation.z=Math.sin(elapsed*18+i)*.06;
     eo.updateMatrix();deck.setMatrixAt(i,eo.matrix);});deck.instanceMatrix.needsUpdate=true;}
for(const q of feet){for(const st of steps)if(Math.abs(st.p.y-q.y)<.3&&Math.hypot(st.p.x-q.x,st.p.z-q.z)<.24){st.foot=1;st.fresh=true;}}const k=reduced?.matches?1:Math.min(1,dt*10),front=reduced?.matches?Infinity:(performance.now()-since)/SWEEP*steps.length;let sum=0;
   steps.forEach((s,i)=>{const w=want&&i<=front?1:0;s.lit+=(w-s.lit)*k;if(Math.abs(w-s.lit)<.002)s.lit=w;if(s.fresh)s.fresh=false;else s.foot=Math.max(0,s.foot-dt*1.6);s.m.emissiveIntensity=Math.min(1.8,s.glow+Math.max(s.lit,s.foot)*FOOT_GLOW);sum+=s.lit;});lit=sum/steps.length;lampGlow.emissiveIntensity=1.1+lit*.9;
   const show=!reduced?.matches;moteMat.opacity=.4+Math.min(.5,lit*.5);for(const p of motes){p.m.visible=show;if(!show)continue;const t=((elapsed*.07+p.phase)%1)*(f.length-1),i=Math.floor(t),a=f[i].p,b=f[Math.min(i+1,f.length-1)].p,u=t-i;p.m.position.set(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u+p.lift+Math.sin(elapsed*2+p.phase*9)*.03,a.z+(b.z-a.z)*u);}},
  points(){return [...stairs,...descent,...slide,...trail.flat()];},
  stairPoint(t){return f[Math.round(Math.max(0,Math.min(1,t))*(f.length-1))].p.clone();}
 };
}
// A U-shaped chute along a path: the bottom of the U sits on the path, so riders' feet are on it.
function trough(pts,r){const fr=frames(pts),seg=10,pos=[],idx=[];
 fr.forEach(x=>{for(let j=0;j<=seg;j++){const a=Math.PI*j/seg,v=x.p.clone().addScaledVector(x.side,Math.cos(a)*r).add(new THREE.Vector3(0,r-Math.sin(a)*r-.01,0));pos.push(v.x,v.y,v.z);}});
 for(let i=0;i<fr.length-1;i++)for(let j=0;j<seg;j++){const a=i*(seg+1)+j,b=a+seg+1;idx.push(a,b,a+1,a+1,b,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}
