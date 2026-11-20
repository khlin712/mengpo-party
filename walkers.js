import {walkSpot,walkable,safeSpot} from './navigation.js';
import {TRAIL_LANE,TRAIL_WIDTH} from './hazards.js';
import * as THREE from './vendor/three.module.min.js';
import {makeFigure,pose,applyPose,makeRoute,along,islandTop,FIGURE_SCALE} from './people.js';
import {STATIONS} from './journey.js';
import {ROPES} from './route3d.js';
import {walkRoute as findRoute,UNIVERSITY,SUMMIT,SPAWN_FROM,RESTART,STOPS,CLIFFS,TRAIL} from './summit.js';

// Who walks on the map:
// - parents (one per island to begin with) stroll on an island's front path, and now and then walk over to another island;
// - STUDENTS students in all (the teacher's current number of students): some carry a notebook back and forth on each relation
//   that has a real walkway, the rest wander from island to island; now and then one climbs the stairs past the trophy and
//   reaches the university: half walk in and disappear (going on to university) and come out again on SPAWN_FROM (the start), so the
//   count holds; the other half turn away and carry on to the calendar, sign-up and contact islands;
// - the guide waits at the start; when a visitor asks, it leads them round the journey (GUIDE_ROUTE) one stop at a time;
// - "my character" is the visitor's own figure, which walks wherever they send it.
// Everyone walks on walkways and stairs, never through the air. All of them are decorative map characters, not real people.
const RESIDENTS=[
 {shirt:'#e07a5f',hair:'#3a2e28',hairStyle:'short',skin:'#efcaa6',prop:'backpack',accent:'#5f8fb4'},
 {shirt:'#6f9bb8',hair:'#5a3d2b',hairStyle:'long',skin:'#f3d6bb',pants:'#6b5d52'},
 {shirt:'#8fb07a',hair:'#2a2622',hairStyle:'bun',skin:'#d9a983',prop:'bag',accent:'#c9774f'},
 {shirt:'#e3b85a',hair:'#3d3330',hairStyle:'cap',skin:'#f1cfae',accent:'#4f7d74'},
 {shirt:'#a688bd',hair:'#6b4a33',hairStyle:'short',skin:'#e4b994',pants:'#3f4a5a'},
 {shirt:'#e9e1d0',hair:'#2f2a28',hairStyle:'long',skin:'#f5dcc4',pants:'#5d7186',prop:'backpack',accent:'#d0695a'}
];
// The teacher's current number of students (given by the teacher). Change it here when the class size changes.
export const STUDENTS=47;
// The guide's round: ① start → ② trailhead → results (the trophy, over the bridge) → ④ university → ⑤ calendar → ⑥ sign-up → ⑦ contact → ① again.
export const GUIDE_ROUTE=['start','fork',SUMMIT,UNIVERSITY,'calendar','signup','contact'];
const PARENTS=[{shirt:'#7d8a96',pants:'#3f4652',hair:'#2f2a28',hairStyle:'short',skin:'#e9c3a0',prop:'bag',accent:'#8a5a3b'},{shirt:'#b07d6a',pants:'#4a4040',hair:'#4a3a30',hairStyle:'long',skin:'#f1cfae',prop:'bag',accent:'#5b6f60'},{shirt:'#6e8a74',pants:'#3a4250',hair:'#3a3330',hairStyle:'bun',skin:'#d9a983'}];
const STUDENT_SHIRTS=['#e07a5f','#5f8fb4','#7aa66b','#e2b84c','#9a7bb8','#4f7d74','#f0f0ea','#d98fa0'],STUDENT_HAIR=['short','long','bun','cap','short','long'];
const studentLook=i=>({shirt:STUDENT_SHIRTS[i%STUDENT_SHIRTS.length],hairStyle:STUDENT_HAIR[(i*5)%STUDENT_HAIR.length],hair:['#2a2622','#3a2e28','#5a3d2b'][i%3],skin:['#efcaa6','#e4b994','#f5dcc4','#d9a983'][(i*3)%4],pants:['#3f4f63','#4e5d6c','#5d5248'][i%3],prop:i%3?'backpack':'book',accent:['#d0695a','#5f8fb4','#e2b84c','#7aa66b','#fff3cf'][i%5]});
export const SHIRTS=['#e07a5f','#5f8fb4','#7aa66b','#e2b84c','#9a7bb8','#4f7d74'];
export const AVATAR_ROLES={參加者:'backpack',陪伴者:'bag',其他:null};
export const AVATAR_KEY='mengpo-island-avatar';
export function readAvatar(raw){let v={};try{v=JSON.parse(raw)||{};}catch{}
 return {name:typeof v.name==='string'?v.name.trim().slice(0,8):'',role:v.role in AVATAR_ROLES?v.role:'參加者',hairStyle:['short','long','bun','cap'].includes(v.hairStyle)?v.hairStyle:'short',shirt:SHIRTS.includes(v.shirt)?v.shirt:SHIRTS[0]};}
const avatarLook=a=>({shirt:a.shirt,hairStyle:a.hairStyle,hair:'#3a2e28',skin:'#efcaa6',pants:'#3f4f63',prop:AVATAR_ROLES[a.role],accent:a.role==='陪伴者'?'#8a5a3b':'#f2c14e'});
// Of those heading for the steep wall, this share stop at the first cliff, think again and go back to take the bridge.
export const TURN_BACK=.25;
// At the trailhead, the share who follow the sign onto the bridge. Tuned so that, at any moment, the people on the bridge and
// on the rough way are about 1 : 7 (the rough way is slower, so more of its walkers are on it at once).
export const RIGHT_WAY=.045;
// How quickly a drifting walker's sideways speed can change (per second²).
export const DRIFT_ACCEL=.35;
// How fast a walker eases sideways back into its lane (or onto a rope) — slower than walking, so it never looks like a shove.
export const SIDE_STEP=.18,SIDE_STEP_CLIMB=.25;
const GUIDE_SPOT={x:-.12,z:.74},AVATAR_SPOT={x:.16,z:.68},DOOR={x:0,z:.5},EXIT={x:0,z:.6};


export function createWalkers({scene,topics,positions,graph,links,CSS2DObject,reduced,hazards,rain=()=>0,avatar:initial,onArrive=()=>{},onLog=()=>{},onGuide=()=>{}}){
 const group=new THREE.Group();group.name='walkers';scene.add(group);
 const walkers=[],byId=id=>topics.find(t=>t.id===id)||(s=>s&&{id,n:s.n,title:s.short})(STATIONS.find(s=>s.id===id)),order=topics.map(t=>t.id);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.15,.2,28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#e2793f',transparent:true,opacity:.9,depthWrite:false}));ring.position.y=.008;ring.raycast=()=>{};ring.visible=false;
 function tag(w,text,className){const el=document.createElement('button');el.type='button';el.className='walker-tag '+className;el.innerHTML=text;el.tabIndex=-1;el.onclick=e=>{e.stopPropagation();onClickAll(w);};const o=new CSS2DObject(el);o.position.set(0,.82,0);w.fig.add(o);w.tag={el,o};}
 function spawn(kind,look,props){const fig=makeFigure(look);const size=FIGURE_SCALE*(props?.grown||1);fig.scale.setScalar(size);group.add(fig);
  const w={kind,fig,size,route:null,s:0,dir:1,speed:.3,wait:0,phase:Math.random()*6,heading:0,walking:0,sliding:0,sideX:0,sideZ:0,lane:(Math.random()*2-1)*TRAIL_LANE,...props};fig.userData.walker=w;walkers.push(w);return w;}
 const place=(w,p,heading=0)=>{w.fig.position.set(p.x,p.y,p.z);w.heading=heading;w.fig.rotation.y=heading;};

 // Parents: one per island, a little taller, on the paved path along the front edge.
 topics.forEach((t,i)=>{const p=positions.get(t.id),w=spawn('parent',PARENTS[i%PARENTS.length],{island:t.id,grown:1.14,speed:.13+.02*(i%3),wait:1+i%3});const spot=walkSpot(p);place(w,{x:p.x+spot.x,y:islandTop(p),z:p.z+spot.z});});
 // Relation walkers: back and forth along the walkway of each relation that has one, notebook in hand.
 links.map(l=>({...l,edge:graph.edges.find(e=>e.kind==='bridge'&&e.from===l.a&&e.to===l.b)})).filter(l=>l.edge).forEach((l,i)=>{const route=makeRoute(l.edge.pts);const w=spawn('messenger',{...studentLook(i*7+2),prop:'book',accent:'#fff3cf'},{key:l.key,a:l.a,b:l.b,route,speed:.25+(i%5)*.065,s:route.total*((i*.37)%1),dir:i%2?1:-1});
  const A=byId(l.a),B=byId(l.b);tag(w,`<b>${A.n}↔${B.n}</b><span>參加者 · 帶著關聯問題</span>`,'bubble');w.tag.el.setAttribute('aria-label',`參加者（關聯步道）：${A.title} 與 ${B.title}`);place(w,along(route,w.s));});
 // The guide: round the journey stops in order, a short stop at each.
 const guideSpot=id=>STOPS[id]?.ledge?{x:.12,z:.22}:GUIDE_SPOT;
 const guide=spawn('guide',{shirt:'#2f6f73',pants:'#38424f',hair:'#2a2622',hairStyle:'cap',accent:'#f2c14e',prop:'flag',skin:'#e7bf98'},{island:GUIDE_ROUTE[0],next:null,speed:.48,wait:0});
 {const p=positions.get(GUIDE_ROUTE[0]);const spot=safeSpot(p,GUIDE_SPOT);place(guide,{x:p.x+spot.x,y:islandTop(p),z:p.z+spot.z});}
 tag(guide,'<i>⚑</i><span>導覽員</span>','guide-tag');guide.tag.el.setAttribute('aria-label','導覽員');
 // The other students wander from island to island; a few at a time head up the stairs to the university.
 const ground=[...order.filter(id=>id!==SUMMIT),'start','calendar','signup','contact'],messengerCount=walkers.filter(w=>w.kind==='messenger').length;
 const spotOn=id=>{let p;for(let i=0;i<24;i++){p=walkSpot(positions.get(id));const c=positions.get(id);if(walkers.every(w=>w.island!==id||Math.hypot(w.fig.position.x-c.x-p.x,w.fig.position.z-c.z-p.z)>.22))break;}return p;};
 const students=Array.from({length:Math.max(0,STUDENTS-messengerCount)},(_,k)=>{const w=spawn('student',studentLook(k),{island:ground[k%ground.length],speed:.22+(k%7)*.055,wait:Math.random()*6});teleport(w,w.island,spotOn(w.island));w.heading=Math.random()*6;return w;});
 // Start with people already on both routes (one on the bridge for seven on the rough way), not an empty bridge.
 students.slice(0,16).forEach((w,k)=>{const good=k%8===0,edge=good?graph.edges.find(e=>e.kind==='span'&&e.from==='fork'):graph.edges.find(e=>e.kind==='trail'&&e.from===TRAIL[k%TRAIL.length][0]&&e.to===TRAIL[k%TRAIL.length][1]);if(!edge)return;
  w.island=edge.from;w.target=edge.to;w.route=makeRoute(edge.pts);w.s=w.route.total*(.12+(k*.173)% .76);w.dir=1;w.up=true;w.wait=0;w.fallAt=good?null:edge.to==='wallfoot'?null:edge.to;
  const at=along(w.route,w.s);place(w,at,at.heading||0);if(at.trail){w.sideX=Math.cos(w.heading)*w.lane;w.sideZ=-Math.sin(w.heading)*w.lane;w.fig.position.x+=w.sideX;w.fig.position.z+=w.sideZ;}});
 // Eight of the existing 47 students sit in the open-air lecture hall; the teacher is a separate fictional NPC.
 const sit=w=>{const rig=w.fig.userData.rig;for(const leg of rig.legs)leg.rotation.x=-Math.PI/2;for(const arm of rig.arms)arm.rotation.x=-.55;};
 const lectureAt=positions.get('signup');
 students.slice(-8).forEach((w,k)=>{w.seated=true;w.island='signup';w.route=null;w.target=null;w.up=false;w.wait=0;
  const row=Math.floor(k/4);place(w,{x:lectureAt.x-.36+(k%4)*.24,y:islandTop(lectureAt)+.08+row*.035-.17*w.size,z:lectureAt.z+.16+row*.36},Math.PI);sit(w);});
 const lecturer=spawn('lecturer',{shirt:'#315e64',pants:'#3f4f63',hairStyle:'short',prop:'book',accent:'#e8c672'},{island:'signup'});
 place(lecturer,{x:lectureAt.x-.18,y:islandTop(lectureAt)+.09,z:lectureAt.z-.35});
 // 03: a parent and a student sit talking at the pavilion's round table (extra map characters, not counted among the 47 students).
 const talkAt=positions.get('questions');if(talkAt)[['parent',PARENTS[1],-1],['student',studentLook(5),1]].forEach(([role,lk,side])=>{const w=spawn('visitor',{...lk,prop:null},{island:'questions',role,grown:role==='parent'?1.12:1});w.seated=true;w.fig.userData.rig.hit.raycast=()=>{};
  place(w,{x:talkAt.x+side*.27,y:islandTop(talkAt)+.12-.17*w.size,z:talkAt.z+.02},side<0?Math.PI/2:-Math.PI/2);sit(w);});
 // My character.
 let look=readAvatar(JSON.stringify(initial||{})),onClickAll=()=>{},frozen=false;
 let me=null;
 function makeMe(){const old=me;me=spawn('avatar',avatarLook(look),{island:old?.island||GUIDE_ROUTE[0],speed:.62,mode:old?.mode||'auto',wait:old?.wait??1.2,target:old?.target||null,route:old?.route||null,s:old?.s||0,fall:old?.fall,fallKind:old?.fallKind,vy:old?.vy,resume:old?.resume,fallMove:old?.fallMove,sideX:old?.sideX||0,sideZ:old?.sideZ||0});
  if(old){place(me,old.fig.position,old.heading);me.sliding=old.sliding;remove(old);if(ring.parent===old.fig)me.fig.add(ring);}else{const p=positions.get(me.island);const spot=safeSpot(p,AVATAR_SPOT);place(me,{x:p.x+spot.x,y:islandTop(p),z:p.z+spot.z});}
  tag(me,`<i>我</i><span>${look.name?escapeHtml(look.name):'我的角色'}</span>`,'me-tag');me.tag.el.setAttribute('aria-label','我的角色');}
 function remove(w){group.remove(w.fig);w.tag?.o.removeFromParent();w.tag?.el.remove();walkers.splice(walkers.indexOf(w),1);}
 makeMe();

 function stand(w,dt,heading=0){w.walking+=(0-w.walking)*Math.min(1,dt*8);w.heading=turn(w.heading,heading,dt*4);}
 function turn(a,b,k){let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return a+d*Math.min(1,k);}
 // Walk w along its route; returns true on arrival.
 function walkRoute(w,dt){
  if((w.kind==='student'||w.kind==='messenger')&&!w.drift&&!(w.rest>0)&&Math.random()<1-Math.exp(-.045*dt))w.rest=.8+Math.random()*2.5;
  const resting=w.rest>0;if(resting)w.rest=Math.max(0,w.rest-dt);
  const d=w.drift,stumbling=!!d&&d.kind==='rain'&&d.t<d.stumble;
  const pace=w.speed*(w.climbing>.5?.3:w.riding?1.8:w.onTrail?.6:1)*(stumbling?.35:d?.kind==='rain'?.8:1);
  w.s+=(resting?0:1)*pace*dt*w.dir;const end=w.dir>0?w.s>=w.route.total:w.s<=0;w.s=Math.max(0,Math.min(w.route.total,w.s));const at=along(w.route,w.s);
  const taper=at.trail?Math.max(0,Math.min(1,at.trailU/.08,(1-at.trailU)/.08)):0;
  if(d&&!(at.trail&&at.heading!==null))w.drift=null;
  let aim=null;
  if(w.drift){
   // Drifting off the line: the walker keeps walking, but the path bends towards one edge — feet and body follow that slant,
   // never a sideways shove. Most notice and come back; the rest walk on until a foot finds no plank.
   const n={x:Math.cos(at.heading),z:-Math.sin(at.heading)},base=w.lane*taper,out=stumbling?.03:d.rate;let lateral;
   // Start from wherever the walker already is across the deck, so the drift never begins with a jump.
   if(d.home===undefined){d.off=d.home=w.sideX*n.x+w.sideZ*n.z-base;}d.t+=dt;
   // The sideways speed builds up and eases off gradually (DRIFT_ACCEL): drifting never looks like a shove.
   const wantV=d.back?-d.side*d.rate*.8:d.side*out;d.v+=Math.max(-DRIFT_ACCEL*dt,Math.min(DRIFT_ACCEL*dt,wantV-d.v));d.off+=d.v*dt;lateral=d.v;
   if(!d.back){if(d.recover&&!stumbling&&(Math.abs(d.off-d.home)>=d.turnAt||Math.abs(base+d.off)>TRAIL_WIDTH/2-.07))d.back=true;}
   else if((d.off-d.home)*d.side<=0){d.off=d.home;w.drift=null;}
   const want=base+d.off,dx=n.x*want-w.sideX,dz=n.z*want-w.sideZ,gap=Math.hypot(dx,dz),step=Math.min(1,(Math.abs(lateral)+.12)*dt/(gap||1));w.sideX+=dx*step;w.sideZ+=dz*step;
   // Corners turn the deck under the walker; the body follows at walking pace rather than jumping with it.
   const total=w.sideX*n.x+w.sideZ*n.z;
   const f=w.dir>0?1:-1,vx=Math.sin(at.heading)*f*pace+n.x*lateral,vz=Math.cos(at.heading)*f*pace+n.z*lateral;aim=Math.atan2(vx,vz)+(stumbling?Math.sin(d.t*22)*.3:0);
   w.fig.position.set(at.x+w.sideX,at.y,at.z+w.sideZ);
   if(Math.abs(total)>TRAIL_WIDTH/2+.03){w.heading=aim;startFall(w,d.kind,aim,{x:vx,z:vz});return false;}
  }else{
   const wantedX=at.climb?ROPE_T.x*(w.rope||0):at.heading===null?0:Math.cos(at.heading)*w.lane*taper,wantedZ=at.climb?ROPE_T.z*(w.rope||0):at.heading===null?0:-Math.sin(at.heading)*w.lane*taper;
   const dx=wantedX-w.sideX,dz=wantedZ-w.sideZ,amount=resting?0:Math.min(1,(at.climb?SIDE_STEP_CLIMB:SIDE_STEP)*dt/(Math.hypot(dx,dz)||1));w.sideX+=dx*amount;w.sideZ+=dz*amount;
   w.fig.position.set(at.x+w.sideX,at.y,at.z+w.sideZ);}
  // On the rough road: a broken plank drops you straight through; otherwise now and then someone starts to drift (often in heavy rain).
  if(at.trail&&at.trailU>.12&&at.trailU<.88){if(hazards?.gap(at.trailId,at.trailU)){startFall(w,'bridge',at.heading??w.heading);return false;}
   if(!w.drift&&!resting&&Math.random()<1-Math.exp(-(rain()>.65?.2:.08)*dt))startDrift(w,rain()>.65?'rain':'slip');}
  if(aim!==null)w.heading=turn(w.heading,aim,dt*8);else if(at.heading!==null)w.heading=turn(w.heading,w.dir>0?at.heading:at.heading+Math.PI,dt*10);
  w.climbing=at.climb?1:0;w.onTrail=at.trail;w.riding=!!at.slide;const sliding=w.drift?.kind==='rain'&&!stumbling;
  w.walking+=((w.riding||resting?0:sliding?.35:1)-w.walking)*Math.min(1,dt*8);return end;}
 // Start drifting towards one edge. slip: a slow drift, usually corrected; rain: a short stagger, then a quick slanting slide.
 function startDrift(w,kind,o={}){const rainy=kind==='rain';
  w.drift={kind,t:0,off:0,v:0,home:undefined,back:false,side:o.side??(Math.random()<.5?-1:1),rate:o.rate??(rainy?.2+Math.random()*.08:.08+Math.random()*.06),
   recover:o.recover??(Math.random()<(rainy?.3:.65)),turnAt:o.turnAt??(.08+Math.random()*.16),stumble:rainy?(o.stumble??.45+Math.random()*.25):0};}
 // Find the way by walkways and stairs; returns false if there is none.
 function goTo(w,id,spot){spot=safeSpot(positions.get(id),spot);const r=findRoute(graph,w.fig.position,w.island,id,spot);if(!r)return false;w.route=makeRoute(r.pts);w.sideX=0;w.sideZ=0;w.s=0;w.dir=1;w.target=id;return true;}
 const reducedNow=()=>reduced?.matches;
 function arrive(w){const t=byId(w.target);w.island=w.target;w.route=null;w.target=null;w.sliding=0;return t;}
 function teleport(w,id,spot){w.turnBack=w.toBridge=false;const p=positions.get(id);spot=safeSpot(p,spot);w.sideX=0;w.sideZ=0;w.fall=undefined;w.fallMove=null;w.fallVel=null;w.drift=null;w.resume=null;w.next=null;w.fig.userData.hidden=false;w.fig.rotation.x=0;w.fig.scale.setScalar(w.size);place(w,{x:p.x+spot.x,y:islandTop(p),z:p.z+spot.z});w.island=id;w.route=null;w.target=null;w.sliding=0;}

 // Parents: a few strolls on one island, then off along the walkways to another, so nobody looks like a guard on duty.
 const PARENT_STOPS=()=>[...order,'start','calendar','signup','contact'];
 function updateParent(w,dt){
  if(w.route){if(walkRoute(w,dt)){const local=w.target===w.island;arrive(w);w.speed=w.strollSpeed??w.speed;w.wait=1.5;w.strolls=local?(w.strolls??3)-1:2+Math.floor(Math.random()*4);w.goal=undefined;}return;}
  if(w.wait<=0&&w.goal===undefined&&(w.strolls??3)<=0){const choices=PARENT_STOPS().filter(id=>id!==w.island);const next=choices[Math.floor(Math.random()*choices.length)];
   // Stroll slowly, but walk over to the next island at a normal pace.
   if(goTo(w,next,spotOn(next))){w.strollSpeed=w.strollSpeed??w.speed;w.speed=.38;w.strolls=3;return;}w.strolls=2;}
  const before=w.goal;updateResident(w,dt);if(before!==undefined&&w.goal===undefined)w.strolls=(w.strolls??3)-1;}
 function updateResident(w,dt){
  if(w.route){if(walkRoute(w,dt)){arrive(w);w.goal=undefined;w.wait=1+Math.random()*3;}return;}
  if(w.wait>0){w.wait-=dt;stand(w,dt,w.heading);return;}
  w.goal=true;if(!goTo(w,w.island,spotOn(w.island))){w.goal=undefined;w.wait=1;}}
 function updateMessenger(w,dt){if(w.wait>0){w.wait-=dt;stand(w,dt,w.heading);return;}if(walkRoute(w,dt)){w.dir=-w.dir;w.wait=1.2+Math.random()*1.5;}}
 // The guide stands at the start facing visitors until asked to lead; then it walks briskly to each stop it is sent to.
 function stopGuideAtStart(w){teleport(w,RESTART,guideSpot(RESTART));sync();onGuide(RESTART,{recoveryFailed:true});}
 function updateGuide(w,dt){
  if(w.born!==undefined){w.born+=dt;w.fig.scale.setScalar(w.size*Math.min(1,w.born/.5));if(w.born>=.5)w.born=undefined;}
  if(w.route){if(walkRoute(w,dt)){const id=w.target,t=arrive(w);if(w.next){const next=w.next;w.next=null;if(!goTo(w,next,guideSpot(next)))stopGuideAtStart(w);return;}if(t)onLog(`導覽員帶路抵達 ${t.n} ${t.title}`,{kind:'guide',id});onGuide(id);}return;}
  stand(w,dt,0);}
 // Pop the guide up at any island, so a visitor who wandered off can pick the tour up again right where they are.
 function guideAppear(id,{instant=false}={}){if(!positions.has(id))return false;teleport(guide,id,guideSpot(id));guide.heading=0;guide.born=undefined;if(!reducedNow()&&!instant){guide.born=0;guide.fig.scale.setScalar(0);}sync();return true;}
 function guideTo(id){if(!positions.has(id))return false;if(guide.fall!==undefined&&!reducedNow()&&!frozen){guide.resume=id;return true;}if(reducedNow()||frozen){teleport(guide,id,guideSpot(id));sync();onGuide(id);return true;}guide.speed=id===GUIDE_ROUTE[0]?1.2:1.6;guide.next=null;
  if(goTo(guide,id,guideSpot(id)))return true;
  // On a bridge the departure island is stale: finish this leg before replanning the latest request.
  if(guide.route){guide.next=id;return true;}return false;}
 const MAX_UP=26;
 // Along the rim, sideways from the climb line: each climber holds one of the ropes.
 const ROPE_T=(()=>{const S=positions.get(SUMMIT),F=STOPS.wallfoot,d=Math.hypot(F.x-S.x,F.z-S.z);return {x:-(F.z-S.z)/d,z:(F.x-S.x)/d};})();
 // The outer edge of each cliff top on the rough road (facing away from the islands): where those who fall step off.
 const cliffEdge=id=>{const s=STOPS[id],dx=s.x+1.17,dz=s.z,d=Math.hypot(dx,dz)||1;return {x:dx/d*.55,z:dz/d*.55};};
 function startFall(w,kind,heading=w.heading,vel=null){w.drift=null;w.turnBack=w.toBridge=false;w.fallVel=null;w.resume=w.kind==='guide'||w.kind==='avatar'?(w.next||w.target):null;w.next=null;w.route=null;w.target=null;w.slipAt=null;w.climbing=0;w.riding=false;w.fall=0;w.fallKind=kind;w.vy=.6;
  const offset=w.sideX*Math.cos(heading)-w.sideZ*Math.sin(heading),side=offset>=0?1:-1,d=TRAIL_WIDTH/2+.08-Math.abs(offset),p=w.fig.position;
  w.fallMove=kind==='rain'||kind==='slip'?{start:p.clone(),edge:new THREE.Vector3(p.x+Math.cos(heading)*side*d,p.y,p.z-Math.sin(heading)*side*d),time:.35}:null;
  // A cliff top: walk out past the rim (away from the islands) and only then drop — never straight down through the rock.
  // Stepped off the edge while walking: no shove — the body carries on forward and down from where the foot missed.
  if(vel){w.fallMove=null;w.fallVel={x:vel.x,z:vel.z};w.vy=.1;}
  if(kind==='cliff'){const c=positions.get(w.island),dx=c?c.x+1.17:1,dz=c?c.z:0,n=Math.hypot(dx,dz)||1,rim=.88;const edge=c?new THREE.Vector3(c.x+dx/n*rim,p.y,c.z+dz/n*rim):p.clone();const pace=Math.max(.2,Math.min(.4,w.speed||.3)),dist=Math.hypot(edge.x-p.x,edge.z-p.z);w.fallMove={start:p.clone(),edge,time:.3+dist/pace,heading:Math.atan2(edge.x-p.x,edge.z-p.z),pace,ease:true};}onLog('錯誤路線的角色跌落，將回第 1 站重新出發',{kind:'fall'});}
 function updateFall(w,dt){w.fall+=dt;
  // Intact deck: sweep sideways first. Only a broken gap drops people straight through the middle.
  if(w.fallMove&&!w.fallMove.done){const move=w.fallMove,raw=Math.min(1,w.fall/(move.time||.35)),t=move.ease?Math.max(0,(w.fall-.3)/(move.time-.3)):raw;
   // A cliff top: turn towards the edge at walking speed, then walk to it at the walker's own pace.
   if(move.heading!==undefined){w.heading=turn(w.heading,move.heading,dt*3);w.fig.rotation.y=w.heading;}w.fig.position.x=move.start.x+(move.edge.x-move.start.x)*t;w.fig.position.z=move.start.z+(move.edge.z-move.start.z)*t;
   if(raw<1&&t<1){w.fig.position.y=move.start.y;w.walking=1;w.phase+=dt*(move.pace?move.pace*34:6);applyPose(w.fig,pose(w.phase,1));return;}if(!move.done){move.done=true;w.fall=0;if(move.pace){w.fallVel={x:Math.sin(move.heading)*move.pace,z:Math.cos(move.heading)*move.pace};w.vy=.1;}}}
  if(w.fallVel){w.fig.position.x+=w.fallVel.x*dt;w.fig.position.z+=w.fallVel.z*dt;const k=Math.exp(-1.2*dt);w.fallVel.x*=k;w.fallVel.z*=k;}
  w.vy-=9*dt;w.fig.position.y+=w.vy*dt;w.fig.rotation.x=Math.min(1.4,w.fall*2);w.fig.scale.setScalar(w.size*Math.max(0,1-Math.max(0,w.fall-1.1)/1));
  if(w.fall>2.1)w.fig.userData.hidden=true;
  if(w.fall>3.5){const resume=w.resume;w.fall=undefined;w.resume=null;w.fig.rotation.x=0;w.born=0;w.up=false;w.fallAt=null;w.goal=undefined;w.fig.scale.setScalar(w.size);w.fig.userData.hidden=false;teleport(w,RESTART,spotOn(RESTART));w.wait=1.5;
   if(resume&&!goTo(w,resume,w.kind==='guide'?guideSpot(resume):AVATAR_SPOT)&&w.kind==='guide')stopGuideAtStart(w);}}
 function updateStudent(w,dt){
  // Gone through the university door: shrink away, wait, then step out of the main building on SPAWN_FROM.
  if(w.gone!==undefined){w.gone+=dt;if(w.gone<.6){w.fig.scale.setScalar(w.size*Math.max(0,1-w.gone/.6));return;}w.fig.userData.hidden=true;
   if(w.gone>5){w.gone=undefined;w.born=0;w.up=false;w.onward=null;w.fig.userData.hidden=false;teleport(w,SPAWN_FROM,EXIT);w.heading=0;w.wait=1;}return;}
  if(w.born!==undefined){w.born+=dt;w.fig.scale.setScalar(w.size*Math.min(1,w.born/.6));if(w.born>=.6)w.born=undefined;}
  // Partway up the steep wall, some lose their grip.
  if(w.route&&w.climbing&&w.slipAt!=null&&w.fig.position.y>w.slipAt){startFall(w,'wall');return;}
  if(w.route){if(walkRoute(w,dt)){const up=w.up,to=w.target;arrive(w);if(up&&to===w.fallAt){w.fallAt=null;startFall(w,'cliff');}else if(up&&to==='wallfoot'){w.rope=ROPES[Math.floor(Math.random()*ROPES.length)];w.slipAt=Math.random()<.45?.6+Math.random()*1.4:null;if(!goTo(w,UNIVERSITY,DOOR)){w.up=false;w.wait=2;}}
   // At the university: half walk in through the door and are gone; the rest turn away and carry on to the calendar, sign-up and contact.
   else if(up&&to===UNIVERSITY){if(Math.random()<.5)w.gone=0;else{w.up=false;w.onward=['calendar','signup','contact'];w.wait=1.2;}}
   else if(up&&to===SUMMIT){if(!goTo(w,UNIVERSITY,DOOR)){w.up=false;w.wait=2;}}else if(up&&w.turnBack&&to==='pass1'){
    // Turning back: stop on the first cliff top, look back at the sign, then go back and take the bridge after all.
    w.turnBack=false;w.toBridge=true;const F=positions.get('fork'),f=w.fig.position;w.heading=Math.atan2(F.x-f.x,F.z-f.z);w.wait=1.6+Math.random();}
   else if(up&&to==='fork'){if(w.toBridge){w.toBridge=false;if(!goTo(w,UNIVERSITY,DOOR)){w.up=false;w.wait=2;}}else pickPath(w);}else w.wait=(w.onward?.length?1.5:2+Math.random()*6);}return;}
  if(w.wait>0){w.wait-=dt;stand(w,dt,w.heading);return;}
  if(w.toBridge&&w.island==='pass1'){if(!goTo(w,'fork',spotOn('fork'))){w.toBridge=false;w.up=false;w.wait=2;}return;}
  if(w.onward?.length){const next=w.onward.shift();if(!goTo(w,next,spotOn(next)))w.onward=null;return;}
  // Mostly a walk to another island; sometimes, while few are on the way, the journey: to the trailhead first, then one of three paths.
  if(students.filter(x=>x.up).length<MAX_UP&&Math.random()<.75){w.up=true;if(goTo(w,'fork',spotOn('fork')))return;w.up=false;}
  const next=Math.random()<.3?w.island:ground[Math.floor(Math.random()*ground.length)];if(!goTo(w,next,spotOn(next)))w.wait=3;}
 // At the trailhead: one in five follows the sign onto the bridge (the right way, the course); four in five take the rough road,
 // where some fall off one of the cliff tops and the rest reach the steep wall, climb slowly and may still fall.
 function pickPath(w){const r=Math.random();const cliff=CLIFFS[Math.floor(Math.random()*CLIFFS.length)];const u=(r-RIGHT_WAY)/(1-RIGHT_WAY),ok=r<RIGHT_WAY?goTo(w,UNIVERSITY,DOOR):u<.4375?(w.fallAt=cliff,goTo(w,cliff,cliffEdge(cliff))):Math.random()<TURN_BACK?(w.turnBack=true,goTo(w,'pass1',{x:0,z:0})):goTo(w,'wallfoot',{x:0,z:0});if(!ok){w.up=false;w.wait=2;}}
 function updateMe(w,dt){
  if(w.route){if(walkRoute(w,dt)){const quiet=w.quiet,from=w.island,id=w.target,t=arrive(w);w.quiet=false;w.wait=w.mode==='auto'?3:1.5;if(quiet||w.mode==='stroll'&&id===from)return;onArrive(id,{kind:'avatar',automatic:w.mode!=='goto'});onLog(`${look.name||'我的角色'}抵達 ${t.n} ${t.title}`,{kind:'avatar',id});}return;}
  if(w.wait>0){w.wait-=dt;stand(w,dt,0);return;}
  if(w.mode==='auto'){const others=[...ground,SUMMIT,UNIVERSITY,'fork'].filter(id=>id!==w.island);if(!goTo(w,others[Math.floor(Math.random()*others.length)],AVATAR_SPOT))w.wait=1;return;}
  if(w.mode==='stroll'){updateResident(w,dt);return;}
  stand(w,dt,0);}

 let shown=true,filterIds=new Set(order),connections=true,selectedIsland=null,activeRelation=null,hoverWalker=null,selectedWalker=null;
 function sync(){for(const w of walkers){let on;
   if(w.kind==='avatar')on=true;
   else if(!shown)on=false;
   else if(w.kind==='messenger')on=connections&&filterIds.has(w.a)&&filterIds.has(w.b)&&(!selectedIsland||selectedIsland===w.a||selectedIsland===w.b||w.key===activeRelation);
   else if(w.kind==='student')on=!w.fig.userData.hidden&&(!order.includes(w.island)||filterIds.has(w.island)||!!w.route);
   else on=w.kind==='guide'||filterIds.has(w.island)||!order.includes(w.island)||!!w.route;
   w.fig.visible=on&&!w.fig.userData.hidden;
   if(w.kind==='messenger'){const loud=on&&(w.key===activeRelation||w===hoverWalker||w===selectedWalker);w.tag.o.visible=loud;w.tag.el.classList.toggle('active',w.key===activeRelation||w===selectedWalker);}
   else if(w.tag)w.tag.o.visible=on;}
  if(selectedWalker&&!selectedWalker.fig.visible)select(null);}

 function select(w){selectedWalker=w;if(w){w.fig.add(ring);ring.visible=true;}else{ring.removeFromParent();ring.visible=false;}for(const x of walkers)x.tag?.el.classList.toggle('selected',x===w);sync();}
 function update(dt,still){frozen=still;ring.material.opacity=.65+Math.sin(performance.now()/260)*.25;if(still)return;
  for(const w of walkers){if(w.fall===undefined&&!w.fig.visible&&w.kind!=='guide'&&w.kind!=='avatar'&&w.kind!=='student')continue;
   if(w.fall!==undefined){const hidden=w.fig.userData.hidden;updateFall(w,dt);if(hidden!==w.fig.userData.hidden)sync();continue;}
   if(w.kind==='parent'){const on=!!w.route;updateParent(w,dt);if(on!==!!w.route)sync();}
   else if(w.kind==='student'&&!w.seated){const was=w.fig.userData.hidden,on=!!w.route;updateStudent(w,dt);if(was!==w.fig.userData.hidden||on!==!!w.route)sync();}
   else if(w.kind==='messenger')updateMessenger(w,dt);
   else if(w.kind==='guide')updateGuide(w,dt);
   else if(w.kind!=='lecturer'&&!w.seated)updateMe(w,dt);
   w.phase+=dt*w.speed*34;
   w.fig.rotation.y=w.heading;applyPose(w.fig,pose(w.phase,w.walking,0,w.climbing||0));
   if(w.seated)sit(w);
   if(w.kind==='lecturer'){w.fig.userData.rig.arms[0].rotation.x=-1.1+Math.sin(w.phase*.25)*.18;w.fig.userData.rig.arms[1].rotation.x=-.4;}}}
 function pick(raycaster){const hits=raycaster.intersectObjects(walkers.filter(w=>w.fig.visible).map(w=>w.fig.userData.rig.hit),false);if(!hits.length)return null;let node=hits[0].object;while(node&&!node.userData.walker)node=node.parent;return node?{walker:node.userData.walker,distance:hits[0].distance}:null;}
 const describe=w=>({kind:w.kind,island:w.island||null,target:w.target||null,key:w.key||null,mode:w.mode||null,walking:Math.round(w.walking*100)/100,speed:w.speed,resting:w.rest>0,seated:!!w.seated,falling:w.fall!==undefined,turningBack:!!(w.turnBack||w.toBridge),drifting:w.drift?.kind||null,fallKind:w.fallKind||null,visible:w.fig.visible,position:w.fig.position.toArray().map(n=>Math.round(n*100)/100),sliding:w.sliding>.5,hidden:!!w.fig.userData.hidden});
 return {
  update,pick,select,
  // Where visible people stand, for lighting the bridge under their feet.
  feet:()=>walkers.filter(w=>w.fig.visible&&w.fall===undefined).map(w=>w.fig.position),
  selected:()=>selectedWalker,
  hover(w){if(w!==hoverWalker){hoverWalker=w;sync();}},
  sync(state){({shown=shown,filterIds=filterIds,connections=connections,selectedIsland=selectedIsland,activeRelation=activeRelation}=state);if(state.filterIds)filterIds=new Set(state.filterIds);sync();},
  onClick(fn){onClickAll=fn;},
  // Tests only: make someone fall as the game would.
  startFallForTest:(w,kind)=>startFall(w,kind),
  startDriftForTest:(w,kind,o)=>startDrift(w,kind,o),
  // Tests only: send a student from where it stands to the trailhead's turn-back walk (first cliff, then back to the bridge).
  turnBackForTest:w=>{w.up=true;w.turnBack=true;w.wait=0;w.rest=0;return goTo(w,'pass1',{x:0,z:0});},
  guide:()=>guide,me:()=>me,guideTo,guideAppear,
  // kind is parent / student / messenger / guide / avatar, or a relation key for that relation's walker.
  find:(kind,i=0)=>kind.includes(':')?walkers.find(w=>w.key===kind)||null:walkers.filter(w=>w.kind===kind)[i]||null,
  // Where a walker stands right now, in world space.
  where:w=>w.fig.position.clone(),
  avatar:{
   look(next){look=readAvatar(JSON.stringify(next));makeMe();sync();return look;},
   get:()=>look,
   go(id,spot=AVATAR_SPOT){if(!positions.has(id))return;me.mode='goto';if(me.fall!==undefined&&!reducedNow()&&!frozen){me.resume=id;return;}me.goal=undefined;me.wait=0;if(reducedNow()||frozen||!goTo(me,id,spot)){teleport(me,id,spot);sync();onArrive(id,{kind:'avatar'});onLog(`${look.name||'我的角色'}抵達 ${byId(id).n} ${byId(id).title}`,{kind:'avatar',id});}},
   mode(m){me.mode=m;me.goal=undefined;if(m==='goto'||me.route)return;me.wait=.2;
    // Strolling chooses any free part of the island, including its interior.
   },
   state:()=>({...describe(me),look})
  },
  state:()=>({count:walkers.length,visible:walkers.filter(w=>w.fig.visible).length,walking:walkers.filter(w=>w.walking>.5).length,guide:describe(guide),me:describe(me),selected:selectedWalker?describe(selectedWalker):null,messengers:walkers.filter(w=>w.kind==='messenger').map(describe),students:students.map(describe),studentCount:students.length+messengerCount,parents:walkers.filter(w=>w.kind==='parent').length,parentWalkers:walkers.filter(w=>w.kind==='parent').map(describe)})
 };
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
