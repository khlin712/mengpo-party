import * as THREE from './vendor/three.module.min.js';
// Local walking space: an inscribed disk keeps feet on the hexagonal island; buildings are padded footprints.
const PAD=.07,STEP=.07;
export function walkable(c,p){return Math.hypot(p.x,p.z)<=(c.ring||1.06)+1e-6&&!(c.obstacles||[]).some(b=>p.x>b.minX-PAD&&p.x<b.maxX+PAD&&p.z>b.minZ-PAD&&p.z<b.maxZ+PAD);}
// Exact segment/rectangle intersections avoid clipping a padded building corner between sampled points.
export function clearWalkSegment(c,p,q){
 if(!walkable(c,p)||!walkable(c,q))return false;
 for(const b of c.obstacles||[]){let enter=0,exit=1;
  for(const [axis,min,max]of [['x',b.minX-PAD+1e-7,b.maxX+PAD-1e-7],['z',b.minZ-PAD+1e-7,b.maxZ+PAD-1e-7]]){const d=q[axis]-p[axis];
   if(Math.abs(d)<1e-10){if(p[axis]<=min||p[axis]>=max){enter=1;exit=0;break;}}
   else{const a=(min-p[axis])/d,v=(max-p[axis])/d;enter=Math.max(enter,Math.min(a,v));exit=Math.min(exit,Math.max(a,v));}}
  if(enter<exit&&exit>0&&enter<1)return false;
 }return true;
}
export function safeSpot(c,p){if(walkable(c,p))return {...p};let best=null,d=Infinity;const n=Math.floor((c.ring||1.06)/STEP);for(let x=-n;x<=n;x++)for(let z=-n;z<=n;z++){const q={x:x*STEP,z:z*STEP},gap=Math.hypot(q.x-p.x,q.z-p.z);if(gap<d&&walkable(c,q)){best=q;d=gap;}}return best||walkSpot(c);}
export function walkSpot(c,rnd=Math.random){for(let i=0;i<80;i++){const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*(c.ring||1.06)*.94,p={x:Math.cos(a)*r,z:Math.sin(a)*r};if(walkable(c,p))return p;}return {x:0,z:(c.ring||1.06)*.96};}
// Shortest grid path through open island space, rather than always round the rim.
export function acrossIsland(c,a,b){
 const clear=(p,q)=>clearWalkSegment(c,p,q);
 const r=c.ring||1.06,n=Math.floor(r/STEP),nodes=[];
 for(let x=-n;x<=n;x++)for(let z=-n;z<=n;z++){const p={x:x*STEP,z:z*STEP};if(walkable(c,p))nodes.push(p);}
 const nearest=p=>nodes.reduce((best,q)=>!best||Math.hypot(p.x-q.x,p.z-q.z)<Math.hypot(p.x-best.x,p.z-best.z)?q:best,null);
 const start=walkable(c,a)?a:null,end=walkable(c,b)?b:nearest(b);if(!start||!end)return [];
 if(clear(start,end))return [start,end];
 const all=[start,...nodes,end],last=all.length-1,dist=new Map([[0,0]]),prev=new Map(),todo=new Set([0]);
 while(todo.size){let i;for(const k of todo)if(i===undefined||dist.get(k)+Math.hypot(all[k].x-end.x,all[k].z-end.z)<dist.get(i)+Math.hypot(all[i].x-end.x,all[i].z-end.z))i=k;todo.delete(i);if(i===last)break;
  all.forEach((q,j)=>{if(j===i)return;const d=Math.hypot(q.x-all[i].x,q.z-all[i].z);if(d>STEP*1.5&&i!==0&&j!==last)return;if(!clear(all[i],q))return;const score=dist.get(i)+d;if(score<(dist.get(j)??Infinity)){dist.set(j,score);prev.set(j,i);todo.add(j);}});
 }
 if(!prev.has(last))return [];
 const path=[end];for(let i=last;i!==0;){i=prev.get(i);path.unshift(all[i]);}
 const out=[path[0]];for(let i=1;i<path.length;){let j=path.length-1;while(j>i&&!clear(out.at(-1),path[j]))j--;out.push(path[j]);i=j+1;}return out;
}

// Capture actual low solid model parts; keep roofs and the direct ground slabs out of the walking footprint.
export function walkingObstacles(group,baseY=0){const obstacles=[];group.updateMatrixWorld(true);group.traverse(m=>{if(!m.isMesh||m.parent===group||m.geometry.type==='ConeGeometry')return;const b=new THREE.Box3().setFromObject(m);if(b.min.y>baseY+.55||b.max.y<baseY+.3)return;obstacles.push({minX:b.min.x-group.position.x,maxX:b.max.x-group.position.x,minZ:b.min.z-group.position.z,maxZ:b.max.z-group.position.z});});return obstacles;}
