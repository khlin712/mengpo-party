import {acrossIsland,clearWalkSegment} from './navigation.js';
// The seven-station journey that wraps round the nine topic islands, as seen from the usual camera:
// ① the start island (front middle) → ② the trailhead sign. Following the sign means ③ the golden bridge, which climbs smoothly
// from the trailhead to the trophy (results summit, top middle): the right way, the course. The wrong way is the rough road: two
// cliff-top passes where people can fall off, and at its end a steep wall of ropes up to the trophy island.
// (Old note kept for history:) // are dead ends (walk in and you fall); a long trail round the back leads to a steep wall straight up the trophy island's side —
// working hard the wrong way can still get you there, but the climb is slow and you may fall off.
// From the trophy: ④ the university → down the stairs to ⑤ the course calendar → ⑥ sign-up → ⑦ contact → back to ①.
// Students who walk in through the university door are gone (off to university); new ones come out of the main building on
// SPAWN_FROM, so the map never empties. The university only echoes a well-known library's look; it carries no name or mark.
export const SUMMIT='stories',UNIVERSITY='university';
// Where students who walked into the university step out again: the gate on this island (① 起點 for now; it was 01 認識老師 before).
// Change this one id to move it.
export const SPAWN_FROM='start';
// Where students who fell off a cliff or the ropes start again.
export const RESTART='start';
export const RISE=2,TOP=.25,RING=1.06,LEDGE=.42;
const C={x:-1.17,z:0},R=6,BACK=Math.atan2(-13.6,-2.8);
const onArc=(a,y=0,r=R)=>({x:C.x+Math.cos(a)*r,y,z:C.z+Math.sin(a)*r});
export const SUMMIT_AT=onArc(BACK,RISE),UNIVERSITY_AT=onArc(BACK-.62,RISE);
// Journey stops that are islands (or small ledges) of their own. ring = radius of the walk round the inside of the rim.
export const STOPS={
 start:{...onArc(1.37),kind:'start'},
 fork:{...onArc(.9,0,6.4),kind:'fork'},
 // The rough way: from the trailhead up and down over two cliff tops, to the foot of the steep wall. The cliffs are the stops on
 // the way — some who come this way fall off them.
 pass1:{...onArc(.25,.7,7.7),kind:'crag',ring:LEDGE,ledge:true},
 pass2:{...onArc(-.6,1,7.7),kind:'crag',ring:LEDGE,ledge:true},
 // The foot of the steep wall: a ledge right below the side of the trophy island that faces the camera, so the climb is in view.
 wallfoot:{...(()=>{const s=onArc(BACK,RISE);return {x:s.x+Math.cos(.45)*2,y:0,z:s.z+Math.sin(.45)*2};})(),kind:'wallfoot',ring:LEDGE,ledge:true},
 calendar:{...onArc(-3.4),kind:'calendar'},
 signup:{...onArc(2.35),kind:'signup'},
 contact:{...onArc(1.85),kind:'contact'}
};
export const DEAD_ENDS=[];
export const CLIFFS=['pass1','pass2'];
export const islandOf=(x,z)=>({x:(x-470)*.0127,z:(z-340)*.018});
// Plank walkways between neighbouring islands and along the journey.
export const WALKWAYS=[['teacher','teaching'],['teacher','questions'],['teaching','questions'],
 ['teacher','start'],['start','fork'],[SUMMIT,UNIVERSITY],['calendar','signup'],['signup','contact'],['contact','start']];
const angle=(from,to)=>Math.atan2(to.z-from.z,to.x-from.x);
const smooth=t=>t*t*(3-2*t);
// Points spaced evenly along a curve given as u → {x,z} (with y as a function of the fraction along it).
function even(curve,spacing,y){const N=600,pts=[curve(0)],cum=[0];for(let i=1;i<=N;i++){const p=curve(i/N);cum.push(cum[i-1]+Math.hypot(p.x-pts[i-1].x,p.z-pts[i-1].z));pts.push(p);}
 const total=cum[N],n=Math.max(2,Math.round(total/spacing));return Array.from({length:n+1},(_,k)=>{const want=total*k/n;let i=1;while(i<N&&cum[i]<want)i++;const t=(want-cum[i-1])/((cum[i]-cum[i-1])||1);return {x:pts[i-1].x+(pts[i].x-pts[i-1].x)*t,z:pts[i-1].z+(pts[i].z-pts[i-1].z)*t,y:y(k/n)};});}
const arcAngle=p=>Math.atan2(p.z-C.z,p.x-C.x),arcRadius=p=>Math.hypot(p.x-C.x,p.z-C.z);
// Along the arc from rim to rim of two islands; y(f) gives the height.
function alongArc(from,to,y,spacing,rimA=1.15,rimB=1.15,out=0,side=0){const ra=arcRadius(from)+side,rb=arcRadius(to);let a0=arcAngle(from),a1=arcAngle(to);while(a1-a0>Math.PI)a1-=2*Math.PI;while(a0-a1>Math.PI)a1+=2*Math.PI;const s=Math.sign(a1-a0);a0+=s*rimA/ra;a1-=s*rimB/rb;
 return even(u=>{const a=a0+(a1-a0)*u,r=ra+(rb-ra)*smooth(u)+out*Math.sin(Math.PI*u)**2;return {x:C.x+Math.cos(a)*r,z:C.z+Math.sin(a)*r};},spacing,y);}
// ③ The golden bridge: from the trailhead round behind the islands and up to the trophy's rim, rising evenly — the smooth way.
export function bridgePath(fork=STOPS.fork,summit=SUMMIT_AT,spacing=.17){const y0=(fork.y||0)+TOP,y1=summit.y+TOP;
 // 奈何橋：從橋頭直接越過中央的河，緩緩升到遊樂園島；路線只帶一點 S 形，不繞島外圈。
 const dx=summit.x-fork.x,dz=summit.z-fork.z,L=Math.hypot(dx,dz)||1,ux=dx/L,uz=dz/L,nx=-uz,nz=ux,S={x:fork.x+ux*.95,z:fork.z+uz*.95},E={x:summit.x-ux*1.2,z:summit.z-uz*1.2};
 return even(u=>({x:S.x+(E.x-S.x)*u+nx*Math.sin(u*Math.PI*2)*.5,z:S.z+(E.z-S.z)*u+nz*Math.sin(u*Math.PI*2)*.5}),spacing,f=>y0+(y1-y0)*f).map(p=>({...p,path:'bridge'}));}
// The long rough trail from the trailhead, further out round the back, to the foot of the steep wall.
// A stretch of the rough way between two stops: up and down over humps, never level for long — the hard road.
export function trailPath(from=STOPS.fork,to=STOPS.pass1,spacing=.2,out){const y0=(from.y||0)+TOP,y1=(to.y||0)+TOP,rimA=from.ring?.45:.9,rimB=to.ring?.45:.9,side=from.ring?0:.45;
 return alongArc(from,to,f=>y0+(y1-y0)*f+.32*Math.sin(Math.PI*f)+.06*Math.sin(2*Math.PI*f),spacing,rimA,rimB,out??(from.ring?0:.35),side).map((p,i,pts)=>({...p,path:'trail',trailId:TRAIL.findIndex(([a,b])=>STOPS[a]===from&&STOPS[b]===to||STOPS[a]?.x===from.x&&STOPS[b]?.x===to.x),trailU:i/(pts.length-1)}));}
// The last stretch keeps well outside the golden bridge before dropping in to the foot of the wall.
export const TRAIL=[['fork','pass1'],['pass1','pass2'],['pass2','wallfoot',2.2]];
// The way down after the university: a slide, much quicker than stairs, landing on the calendar island.
export function slidePath(uni=UNIVERSITY_AT,cal=STOPS.calendar,spacing=.12){const y0=uni.y+TOP,y1=(cal.y||0)+TOP;return alongArc(uni,cal,f=>y1+(y0-y1)*(1-smooth(f)),spacing,1.15,1.15,.55).map(p=>({...p,path:'slide',slide:true}));}
export function descentPath(uni=UNIVERSITY_AT,cal=STOPS.calendar,spacing=.17){const y0=uni.y+TOP,y1=(cal.y||0)+TOP;return alongArc(uni,cal,f=>y0+(y1-y0)*f,spacing).map(p=>({...p,path:'descent'}));}
// ② The steep wall: from the ledge at its foot straight up the trophy island's rock face to its rim.
export function climbPath(foot=STOPS.wallfoot,summit=SUMMIT_AT){const a=angle(summit,foot),x=summit.x+Math.cos(a)*1.36,z=summit.z+Math.sin(a)*1.36,y0=(foot.y||0)+TOP,y1=summit.y+TOP;
 return Array.from({length:16},(_,i)=>({x,z,y:y0+(y1-y0)*i/15,path:'climb'}));}

// ---- Walking graph: every way a person can get about without leaving the ground. ----
const ringR=c=>c.ring||RING;
const ringAt=(c,a)=>({x:c.x+Math.cos(a)*ringR(c),y:(c.y||0)+TOP,z:c.z+Math.sin(a)*ringR(c)});
export function nodes(topics){const m=new Map(topics.map(t=>[t.id,t.id===SUMMIT?{...SUMMIT_AT}:{...islandOf(t.x,t.y),y:t.lift||0}]));m.set(UNIVERSITY,{...UNIVERSITY_AT});for(const [id,s]of Object.entries(STOPS))m.set(id,{...s});return m;}
export function buildGraph(centers){
 const edges=[],add=(from,to,kind,pts)=>{const A=centers.get(from),B=centers.get(to);edges.push({from,to,kind,exit:angle(A,pts[0]),entry:angle(B,pts.at(-1)),pts},{from:to,to:from,kind,exit:angle(B,pts.at(-1)),entry:angle(A,pts[0]),pts:[...pts].reverse()});};
 for(const [a,b]of WALKWAYS){const A=centers.get(a),B=centers.get(b);if(!A||!B)continue;const ab=angle(A,B),ba=angle(B,A);add(a,b,'bridge',[ringAt(A,ab),ringAt(B,ba)]);}
 const G=centers.get('fork'),F=centers.get('wallfoot'),S=centers.get(SUMMIT),U=centers.get(UNIVERSITY),K=centers.get('calendar');
 if(G&&S)add('fork',SUMMIT,'span',bridgePath(G,S));
 for(const [a,b,out]of TRAIL){const A=centers.get(a),B=centers.get(b);if(A&&B)add(a,b,'trail',trailPath(A,B,.2,out));}
 // The wall only goes up (nobody climbs down it), and it is slow.
 if(F&&S){const pts=[ringAt(F,angle(F,S)),...climbPath(F,S)];edges.push({from:'wallfoot',to:SUMMIT,kind:'climb',exit:angle(F,S),entry:angle(S,pts.at(-1)),pts});}
 // The stairs after the university only go down: the ways up are the bridge and the steep wall.
 if(U&&K){const pts=descentPath(U,K);edges.push({from:UNIVERSITY,to:'calendar',kind:'descent',exit:angle(U,pts[0]),entry:angle(K,pts.at(-1)),pts});}
 return {centers,edges};}
export function shortest(graph,from,to){if(from===to)return [];const dist=new Map([[from,0]]),prev=new Map(),todo=new Set([from]);
 while(todo.size){let u=null;for(const n of todo)if(u===null||dist.get(n)<dist.get(u))u=n;todo.delete(u);if(u===to)break;
  // Nobody passes through a dead end on the way somewhere else.
  if(u!==from&&DEAD_ENDS.includes(u))continue;
  for(const e of graph.edges)if(e.from===u){const w=dist.get(u)+length(e.pts)*(e.kind==='climb'?3:1)+1.5;if(w<(dist.get(e.to)??Infinity)){dist.set(e.to,w);prev.set(e.to,e);todo.add(e.to);}}}
 if(!prev.has(to))return null;const path=[];for(let n=to;n!==from;n=prev.get(n).from)path.unshift(prev.get(n));return path;}
const length=pts=>pts.reduce((s,p,i)=>i?s+Math.hypot(p.x-pts[i-1].x,p.y-pts[i-1].y,p.z-pts[i-1].z):0,0);
// Round the inside of an island's rim (clear of its buildings) from one angle to another.
export function ringArc(c,a0,a1){let d=a1-a0;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;const n=Math.max(1,Math.ceil(Math.abs(d)*ringR(c)/.23));return Array.from({length:n+1},(_,i)=>ringAt(c,a0+d*i/n));}
// From where a walker stands on island `from` to a spot (local x,z) on island `to`, by walkways, the wall, the bridge and stairs.
export function walkRoute(graph,start,from,to,spot){const C0=graph.centers.get(from),hops=shortest(graph,from,to);if(!C0||!hops)return null;
 const pts=[{x:start.x,y:start.y,z:start.z}];let here=C0,hereId=from;
 const cross=target=>{const current=pts.at(-1),a={x:current.x-here.x,z:current.z-here.z},b={x:target.x-here.x,z:target.z-here.z},r=here.ring||RING;
  const inside=p=>{const d=Math.hypot(p.x,p.z);return d>r?{x:p.x*(r-.01)/d,z:p.z*(r-.01)/d}:p;};
  const entry=inside(a),exit=inside(b),wide={...here,ring:here.ring?.7:1.5};
  const connector=(p,q)=>clearWalkSegment(wide,p,q);
  if(!connector(a,entry)||!connector(exit,b))return false;
  const path=acrossIsland(here,entry,exit);if(!path.length)return false;
  if(a!==entry)pts.push({x:here.x+entry.x,y:(here.y||0)+TOP,z:here.z+entry.z,path:'landing'});
  pts.push(...path.map(p=>({x:here.x+p.x,y:(here.y||0)+TOP,z:here.z+p.z,island:hereId})));
  if(b!==exit)pts.push({x:target.x,y:(here.y||0)+TOP,z:target.z,path:'landing'});return true;};
 for(const e of hops){if(!cross(e.pts[0]))return null;pts.push(...e.pts);here=graph.centers.get(e.to);hereId=e.to;}
 const T=graph.centers.get(to);if(!cross({x:T.x+spot.x,z:T.z+spot.z}))return null;
 return {pts,hops:hops.map(e=>e.kind)};
}
