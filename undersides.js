// What hangs under each floating island. Three shapes, so the shape alone says "steady here, risky there":
//   natural — most islands: soft layers (pale soil, rock, darker rock) that narrow downwards and end in a few tips of different
//             lengths, like a small cluster of stalactites. Shorter than a single cone, so the island looks light, not skewered.
//   round   — islands on the way the teacher recommends (the trailhead, the trophy, the university): the same layers, but thick,
//             smooth and rounded underneath, with no tip at all. Steady.
//   crag    — the cliff tops on the rough way: long, thin, jagged spikes with splinters, darker and colder. Risky.
// Colours run from warm and light at the top to dark and cool at the bottom (vertex colours). Positions are jittered by a hash of
// the position itself, so neighbouring layers share their edges and there are no cracks. Nothing here adds content or a click target.
import * as THREE from './vendor/three.module.min.js';

export const COLORS={
 soil:['#c4ad84','#a99268'],rock:['#a39679','#85807a'],deep:['#7f7c78','#5d636d'],tip:['#656b74','#444b57'],
 round:['#bfa982','#8f8578','#6f6e71'],crag:['#9b8e79','#6c6c6f','#454b56']};
// Which islands are on the recommended way (the trailhead, the trophy, the university).
export const ROUND_ISLANDS=new Set(['fork','stories','university']);
export const styleFor=id=>ROUND_ISLANDS.has(id)?'round':'natural';

const hash=(x,y,z)=>{const n=Math.sin(x*12.9898+y*37.719+z*78.233)*43758.5453;return n-Math.floor(n);};
const jitter=(geometry,amount,flat=0)=>{const p=geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
 p.setXYZ(i,x+(hash(x,y,z)-.5)*amount,y+(flat?0:(hash(z,x,y)-.5)*amount*.6),z+(hash(y,z,x)-.5)*amount);}return geometry;};
// Vertex colours from the top of the shape (yTop) to its bottom (yBottom); `stops` is a list of colours spread evenly between them.
function paint(geometry,yTop,yBottom,stops){const p=geometry.attributes.position,colors=new Float32Array(p.count*3),cs=stops.map(c=>new THREE.Color(c)),c=new THREE.Color();
 for(let i=0;i<p.count;i++){const t=Math.min(1,Math.max(0,(yTop-p.getY(i))/(yTop-yBottom||1))),f=t*(cs.length-1),k=Math.min(cs.length-2,Math.floor(f));c.copy(cs[k]).lerp(cs[k+1],f-k);colors.set([c.r,c.g,c.b],i*3);}
 geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;}
const hexLayer=(rTop,rBottom,top,bottom,colors,amount)=>{const g=new THREE.CylinderGeometry(rTop,rBottom,top-bottom,6,1);g.rotateY(Math.PI/6);g.translate(0,(top+bottom)/2,0);jitter(g,amount);return paint(g,top,bottom,colors);};
const spike=(radius,height,top,x,z,sides,colors,amount)=>{const g=new THREE.ConeGeometry(radius,height,sides,3);g.rotateY(Math.PI/6);g.rotateX(Math.PI);g.translate(x,top-height/2,z);jitter(g,amount);return paint(g,top,top-height,colors);};

const solid=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}),smooth=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:false});
const part=(geometry,material,name)=>{const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=true;return m;};

// ---- natural: pale soil / rock / darker rock, then two or three tips of different lengths ----
export function naturalUnderside(seed=1,{depth=1}={}){
 const group=new THREE.Group();group.name='underside-natural';const r=k=>hash(seed,k,3.1);
 // Each layer is a little wider at its top than the one above ends, so the edge between layers shows as a ledge.
 group.add(part(hexLayer(1.23,1.15,-.1,-.27,COLORS.soil,.05),solid,'layer'));
 group.add(part(hexLayer(1.18,.98,-.27,-.66,COLORS.rock,.08),solid,'layer'));
 group.add(part(hexLayer(1.0,.7,-.66,-1.04,COLORS.deep,.1),solid,'layer'));
 // Tips: a long one a little off-centre and two shorter ones either side (never the same length twice).
 const base=-1.0,tips=[[.04+(r(1)-.5)*.12,.02,.3,.82+r(2)*.22],[-.38,.2,.2,.62+r(3)*.12],[.36,-.22,.17,.38+r(4)*.1]];
 tips.forEach(([x,z,radius,length],i)=>group.add(part(spike(radius,length*depth,base,x,z,5,COLORS.tip,.07),solid,'tip')));
 return group;
}
// ---- round: thick, smooth and rounded underneath ----
export function roundUnderside(seed=1){
 const group=new THREE.Group();group.name='underside-round';
 const profile=[[1.23,-.1],[1.26,-.2],[1.24,-.36],[1.15,-.58],[1.01,-.8],[.82,-.99],[.6,-1.13],[.36,-1.22],[.14,-1.27],[0,-1.28]].map(([x,y])=>new THREE.Vector2(x,y));
 const body=new THREE.LatheGeometry(profile,16);paint(body,-.1,-1.28,COLORS.round);
 // A soft swell on one side, so even the round ones are not perfectly turned on a lathe.
 const p=body.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+(hash(Math.round(x*8),Math.round(y*8),seed)-.5)*.05;p.setXYZ(i,x*k,y,z*k);}body.computeVertexNormals();
 group.add(part(body,smooth,'round-body'));
 return group;
}
// ---- crag: a long, thin, jagged spike with a few splinters ----
export function cragUnderside(radius=.6,length=3.2,seed=1){
 const group=new THREE.Group();group.name='underside-crag';
 const g=new THREE.ConeGeometry(radius,length,5,8);g.rotateY(Math.PI/6);g.rotateX(Math.PI);g.translate(0,-length/2-.05,0);
 // Jagged: every ring of the spike is pinched or pushed out by a different amount, and the tip drifts sideways.
 const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=y<-.15?.62+hash(Math.round(y*6),seed,1)*.7:1,drift=Math.pow(Math.min(1,Math.max(0,-y/length)),2)*.28;
  p.setXYZ(i,x*k+(hash(x,y,z)-.5)*.1+drift,y+(hash(z,x,y)-.5)*.1,z*k+(hash(y,z,x)-.5)*.1);}
 paint(g,-.05,-length,COLORS.crag);group.add(part(g,solid,'crag-spike'));
 // Splinters leaning outward from the spike (each is turned about its own top, not the island's centre).
 [[.3,.18,.12,1.2,.5],[-.28,-.2,.1,.95,-.45],[.05,-.34,.09,.7,.3]].forEach(([x,z,rad,len,tilt],i)=>{const m=part(spike(rad,len,0,0,0,4,COLORS.crag,.08),solid,'crag-splinter');m.position.set(x,-.32-i*.12,z);m.rotation.z=-Math.sign(x)*Math.abs(tilt)*.4;group.add(m);});
 return group;
}
export function undersideFor(style,seed=1){return style==='round'?roundUnderside(seed):naturalUnderside(seed);}
// How deep each style hangs below the island top (used by tests and by the layout of the floating stones).
export const DEPTH={natural:1.95,round:1.3};
// One draw call per island instead of six: the layers, tips and splinters of a group are joined into a single mesh (they all share
// one material and carry their own vertex colours). The result keeps the group's name and casts shadows like the parts did.
export function merged(group){
 group.updateMatrixWorld(true);const parts=[];
 group.traverse(m=>{if(!m.isMesh)return;const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);parts.push({g,material:m.material});});
 const count=parts.reduce((n,x)=>n+x.g.attributes.position.count,0),out={position:new Float32Array(count*3),normal:new Float32Array(count*3),color:new Float32Array(count*3)};
 let at=0;for(const {g} of parts){const n=g.attributes.position.count;for(const k of ['position','normal','color'])out[k].set(g.attributes[k].array,at*3);at+=n;g.dispose();}
 const geometry=new THREE.BufferGeometry();for(const k of ['position','normal','color'])geometry.setAttribute(k,new THREE.BufferAttribute(out[k],3));geometry.computeBoundingSphere();geometry.computeBoundingBox();
 const mesh=new THREE.Mesh(geometry,parts[0].material);mesh.name=group.name;mesh.castShadow=true;return mesh;}
