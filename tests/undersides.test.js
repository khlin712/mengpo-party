import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {naturalUnderside,roundUnderside,cragUnderside,styleFor,ROUND_ISLANDS,DEPTH} from '../dist/undersides.js';

const box=g=>new THREE.Box3().setFromObject(g);
const luma=c=>.2126*c.r+.7152*c.g+.0722*c.b;
// Average brightness of the top fifth and the bottom fifth of everything in the group.
function topBottom(group){const b=box(group),top=[],bottom=[],c=new THREE.Color();
 group.updateMatrixWorld(true);group.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position,col=m.geometry.attributes.color;assert.ok(col,'有頂點顏色');
  for(let i=0;i<p.count;i++){const y=p.getY(i)+m.position.y;c.setRGB(col.getX(i),col.getY(i),col.getZ(i));const t=(b.max.y-y)/(b.max.y-b.min.y);if(t<.2)top.push(luma(c));if(t>.8)bottom.push(luma(c));}});
 const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;return {top:avg(top),bottom:avg(bottom)};}
const finite=g=>{let ok=true;g.traverse(m=>{if(m.isMesh){const a=m.geometry.attributes.position.array;for(const v of a)if(!Number.isFinite(v))ok=false;}});return ok;};

test('哪些島是「穩」的：指引牌、獎盃、大學（正確路線）；其他島是一般分層',()=>{
 assert.deepEqual([...ROUND_ISLANDS].sort(),['fork','stories','university']);
 assert.equal(styleFor('stories'),'round');assert.equal(styleFor('fork'),'round');assert.equal(styleFor('university'),'round');
 for(const id of ['teacher','teaching','questions','start','calendar','signup','contact'])assert.equal(styleFor(id),'natural',id);});

test('一般的島：上寬下窄、分好幾層，底部分成 3 個長短不一的尖，比單一圓錐短',()=>{
 for(const seed of [101,118,135]){const g=naturalUnderside(seed),layers=g.children.filter(c=>c.name==='layer'),tips=g.children.filter(c=>c.name==='tip');
  assert.equal(layers.length,3,'三層：淺色土、岩石、深色岩');assert.equal(tips.length,3);
  const widths=layers.map(l=>box(l).getSize(new THREE.Vector3()).x);assert.ok(widths[0]>widths[1]&&widths[1]>widths[2],`越往下越窄 ${widths}`);
  const lengths=tips.map(t=>box(t).getSize(new THREE.Vector3()).y).sort((a,b)=>b-a);assert.ok(lengths[0]-lengths[1]>.1&&lengths[1]-lengths[2]>.05,`尖的長短不一 ${lengths}`);
  const b=box(g);assert.ok(-b.min.y<=2.05&&-b.min.y>=1.5,`深度 ${-b.min.y}`);assert.ok(b.max.x<=1.3&&b.min.x>=-1.3&&b.max.z<=1.3&&b.min.z>=-1.3,'不超出島面');assert.ok(finite(g));}});

test('顏色由上往下逐漸變深、偏冷（所有形狀）',()=>{
 for(const [name,g] of [['natural',naturalUnderside(7)],['round',roundUnderside(7)],['crag',cragUnderside(.6,3.3,7)]]){const {top,bottom}=topBottom(g);assert.ok(top>bottom+.08,`${name}：上 ${top.toFixed(2)} 下 ${bottom.toFixed(2)}`);}
 const g=naturalUnderside(7);let r=0,b=0;g.traverse(m=>{if(m.isMesh&&m.name==='tip'){const c=m.geometry.attributes.color;for(let i=0;i<c.count;i++){r+=c.getX(i);b+=c.getZ(i);}}});assert.ok(b>r,'尖端偏冷（藍多於紅）');});

test('正確路線的島：圓潤厚實，沒有任何尖；錯誤路線的懸崖：細長、嶙峋、比一般的島還尖',()=>{
 const round=roundUnderside(5),rb=box(round),rs=rb.getSize(new THREE.Vector3());
 assert.equal(round.children.length,1);assert.equal(round.children[0].name,'round-body');assert.equal(round.children[0].material.flatShading,false,'平滑');
 assert.ok(!round.children.some(c=>c.name==='tip'),'沒有尖');assert.ok(-rb.min.y<=DEPTH.round+.05&&-rb.min.y>=1.1,`深度 ${-rb.min.y}`);
 // thick: still broad most of the way down, and the very bottom is blunt (not a point)
 const slices=[.3,.5,.7].map(t=>{let w=0;const p=round.children[0].geometry.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);if(Math.abs((rb.max.y-y)/(rb.max.y-rb.min.y)-t)<.12)w=Math.max(w,Math.hypot(p.getX(i),p.getZ(i)));}return w;});
 assert.ok(slices[0]>1&&slices[1]>.85&&slices[2]>.6,`厚實 ${slices.map(x=>x.toFixed(2))}`);
 const crag=cragUnderside(.6,3.3,5),cs=box(crag).getSize(new THREE.Vector3());
 assert.ok(cs.y/Math.max(cs.x,cs.z)>2.2,`細長 ${cs.y}/${Math.max(cs.x,cs.z)}`);assert.ok(cs.y>3,'比一般的島深很多');assert.ok(crag.children.filter(c=>c.name==='crag-splinter').length>=3,'有碎裂的尖片');assert.ok(finite(crag));
 assert.ok(rs.y/rs.x<.7&&cs.y/Math.max(cs.x,cs.z)>rs.y/rs.x*3,'穩與險的形狀差得很清楚');});

test('同一座島每次產生的形狀固定（不隨機變動），不同島之間有差異',()=>{
 const a=naturalUnderside(101),b=naturalUnderside(101),c=naturalUnderside(118);const pos=g=>g.children[3].geometry.attributes.position.array.join(',');
 assert.equal(pos(a),pos(b));assert.notEqual(pos(a),pos(c));});

test('每座島的島底合併成一個網格（省繪製次數），形狀、顏色與陰影不變',async()=>{
 const {merged}=await import('../dist/undersides.js');
 for(const g of [naturalUnderside(101),roundUnderside(101),cragUnderside(.6,3.3,40)]){const before=box(g),parts=[];let tri=0;g.traverse(m=>{if(m.isMesh){parts.push(m);const gg=m.geometry;tri+=(gg.index?gg.index.count:gg.attributes.position.count)/3;}});
  const m=merged(g);assert.ok(m.isMesh&&!m.children.length,'單一網格');assert.equal(m.name,g.name);assert.equal(m.castShadow,true);assert.ok(m.geometry.attributes.color,'保留頂點顏色');
  assert.equal(m.geometry.attributes.position.count/3,tri,'三角形數量一樣');const after=box(m);for(const k of ['x','y','z']){assert.ok(Math.abs(before.min[k]-after.min[k])<1e-4&&Math.abs(before.max[k]-after.max[k])<1e-4,`外框相同 ${k}`);}}});
