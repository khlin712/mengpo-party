import * as THREE from 'three';
import {pinchStep,releaseVelocity,decay,FLING_TAU} from './motion.js';

// Map-style camera handling: the spot of ground under a finger (or the mouse) stays under it while dragging,
// a flick keeps gliding, pinching and twisting pivot between the fingers, two fingers sliding up or down tilt,
// and the wheel zooms smoothly toward the cursor. OrbitControls still handles right-drag and the rotate mode.
export function mapGestures({host,canvas,camera,controls,onStart,ground=.3}){
 const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-ground),ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),up=new THREE.Vector3(0,1,0),q=new THREE.Quaternion();
 const pointers=new Map();let rotateMode=false,anchor=null,samples=[],travel={x:0,z:0},fling=null,moved=false,swallow=0,pair=null,wheel=null;
 const sync=()=>{camera.lookAt(controls.target);camera.updateMatrixWorld();};
 const distance=()=>camera.position.distanceTo(controls.target);
 function groundAt(x,y){const r=canvas.getBoundingClientRect();ndc.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);const out=new THREE.Vector3();const hit=ray.ray.intersectPlane(plane,out);return hit&&camera.position.distanceTo(hit)<distance()*4?out:ray.ray.at(distance(),out);}
 function move(dx,dz){camera.position.x+=dx;camera.position.z+=dz;controls.target.x+=dx;controls.target.z+=dz;sync();}
 // Slide the camera so `point` sits under screen position (x,y) again.
 function hold(point,x,y){const now=groundAt(x,y);const dx=point.x-now.x,dz=point.z-now.z;move(dx,dz);return [dx,dz];}
 function zoomAbout(point,factor){const d=distance(),next=THREE.MathUtils.clamp(d*factor,controls.minDistance,controls.maxDistance),k=next/d;camera.position.sub(point).multiplyScalar(k).add(point);controls.target.sub(point).multiplyScalar(k).add(point);sync();}
 function turnAbout(point,angle){q.setFromAxisAngle(up,angle);camera.position.sub(point).applyQuaternion(q).add(point);controls.target.sub(point).applyQuaternion(q).add(point);sync();}
 function tilt(dy){const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);s.phi=THREE.MathUtils.clamp(s.phi-dy*Math.PI/(canvas.clientHeight||1),controls.minPolarAngle,controls.maxPolarAngle);camera.position.copy(controls.target).add(offset.setFromSpherical(s));sync();}
 function startPan(p){anchor=groundAt(p.x,p.y);samples=[];travel={x:0,z:0};}
 function begin(){fling=null;wheel=null;onStart();}
 const panning=e=>e.pointerType==='touch'||e.button===0;
 host.addEventListener('pointerdown',e=>{if(!controls.enabled||!panning(e))return;begin();if(!pointers.size)moved=false;else moved=true;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,type:e.pointerType});
  if(pointers.size===1){if(!rotateMode)startPan(pointers.get(e.pointerId));}else{anchor=null;pair={mode:null,dy:[0,0],dx:[0,0],scale:1,angle:0};}},true);
 host.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;const px=p.x,py=p.y;p.x=e.clientX;p.y=e.clientY;
  if(!moved&&Math.hypot(p.x-p.sx,p.y-p.sy)>5){moved=true;try{host.setPointerCapture(e.pointerId);}catch{}}
  const ids=[...pointers.keys()];
  if(ids.length===1){
   if(rotateMode){const h=canvas.clientHeight||1;controls._rotateLeft(2*Math.PI*(p.x-px)/h);controls._rotateUp(2*Math.PI*(p.y-py)/h);return;}
   if(!anchor)startPan(p);const [dx,dz]=hold(anchor,p.x,p.y);travel.x+=dx;travel.z+=dz;samples.push({t:e.timeStamp,...travel});if(samples.length>20)samples.shift();return;}
  const i=ids.indexOf(e.pointerId);if(i>1)return;const other=pointers.get(ids[1-i]);
  const a0=i===0?{x:px,y:py}:other,b0=i===0?other:{x:px,y:py},a1=i===0?p:other,b1=i===0?other:p,step=pinchStep(a0,b0,a1,b1);
  pair.dx[i]+=p.x-px;pair.dy[i]+=p.y-py;pair.scale*=step.scale;pair.angle+=step.angle;
  if(!pair.mode){const total=Math.hypot(pair.dx[0],pair.dy[0])+Math.hypot(pair.dx[1],pair.dy[1]);if(total<10)return;
   const level=Math.abs(a1.y-b1.y)<Math.abs(a1.x-b1.x),together=Math.sign(pair.dy[0])===Math.sign(pair.dy[1]),vertical=Math.abs(pair.dy[0]+pair.dy[1])>2*Math.abs(pair.dx[0]+pair.dx[1]);
   pair.mode=level&&together&&vertical&&Math.abs(pair.scale-1)<.1&&Math.abs(pair.angle)<.15?'tilt':'move';}
  if(pair.mode==='tilt'){tilt((p.y-py)/2);return;}
  const mid0={x:(a0.x+b0.x)/2,y:(a0.y+b0.y)/2},mid1={x:(a1.x+b1.x)/2,y:(a1.y+b1.y)/2},point=groundAt(mid0.x,mid0.y);
  turnAbout(point,step.angle);zoomAbout(point,1/step.scale);hold(point,mid1.x,mid1.y);},true);
 const end=e=>{const p=pointers.get(e.pointerId);if(!p)return;pointers.delete(e.pointerId);
  if(!pointers.size){if(anchor&&e.type==='pointerup'){const v=releaseVelocity(samples,e.timeStamp);const speed=Math.hypot(v.x,v.z),cap=distance()*.18/FLING_TAU;if(speed>.002)fling=speed>cap?{x:v.x*cap/speed,z:v.z*cap/speed}:v;}anchor=null;pair=null;if(moved)swallow=performance.now();}
  else if(pointers.size===1){pair=null;startPan([...pointers.values()][0]);}};
 host.addEventListener('pointerup',end,true);host.addEventListener('pointercancel',end,true);
 // A drag that starts on an island name must not also open that island when the finger lifts.
 host.addEventListener('click',e=>{if(performance.now()-swallow<400){e.preventDefault();e.stopPropagation();}swallow=0;},true);
 host.addEventListener('wheel',e=>{e.preventDefault();if(!controls.enabled)return;begin();const unit=e.deltaMode===1?16:e.deltaMode===2?(canvas.clientHeight||800):1;wheel={log:(wheel?.log||0)+Math.max(-.4,Math.min(.4,e.deltaY*unit*.0018)),x:e.clientX,y:e.clientY};},{passive:false});
 return {
  rotate(value){rotateMode=value;},
  stop(){fling=null;wheel=null;},
  busy:()=>pointers.size>0||!!fling||!!wheel,
  // Called once per frame before controls.update().
  update(dt){
   if(fling){move(fling.x*dt,fling.z*dt);fling.x=decay(fling.x,dt);fling.z=decay(fling.z,dt);if(Math.hypot(fling.x,fling.z)<.0004)fling=null;}
   if(wheel){const part=wheel.log*Math.min(1,dt/70);wheel.log-=part;zoomAbout(groundAt(wheel.x,wheel.y),Math.exp(part));if(Math.abs(wheel.log)<.002)wheel=null;}
  }
 };
}
