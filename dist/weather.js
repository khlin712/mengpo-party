import * as THREE from './vendor/three.module.min.js';

// Passing showers and the rainbow after them. Rain comes at random; when it clears in daylight a rainbow fades in behind the islands.
// Skipped entirely for visitors who ask for reduced motion.
// 孟婆島：白天、天空上、永遠有彩虹，不下雨。
export const RAIN_GAP=[35,80],RAIN_LENGTH=[18,32],RAINBOW_SECONDS=26,NO_RAIN=true;
export function createWeather(scene,{reduced,rnd=Math.random}={}){
 const group=new THREE.Group();group.name='weather';scene.add(group);
 // Rain: short falling streaks in a box around the islands, wrapped round as they reach the bottom.
 const N=1800,box={x:[-16,14],y:[-3,13],z:[-16,13]},pos=new Float32Array(N*6),speed=new Float32Array(N);
 const span=k=>box[k][1]-box[k][0];
 for(let i=0;i<N;i++){const x=box.x[0]+rnd()*span('x'),y=box.y[0]+rnd()*span('y'),z=box.z[0]+rnd()*span('z');pos.set([x,y,z,x-.04,y-.58,z],i*6);speed[i]=15+rnd()*7;}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const rainMat=new THREE.LineBasicMaterial({color:'#d8e7f3',transparent:true,opacity:0,depthWrite:false});
 const rain=new THREE.LineSegments(geo,rainMat);rain.frustumCulled=false;rain.visible=false;rain.raycast=()=>{};group.add(rain);
 // Rainbow: one wide, faint arc whose colours run smoothly into each other, fading out at both feet and at its edges — closer to
 // a real rainbow than solid stripes. Additive, so it only ever brightens the sky behind it.
 const bow=new THREE.Group();bow.position.set(-1,-9,-24);group.add(bow);
 const R0=14.2,R1=17,SEG=160,RINGS=24,bp=[],ba=[],bi=[];
 for(let j=0;j<=RINGS;j++)for(let i=0;i<=SEG;i++){const a=Math.PI*i/SEG,r=R0+(R1-R0)*j/RINGS;bp.push(Math.cos(a)*r,Math.sin(a)*r,0);ba.push(j/RINGS,i/SEG);}
 for(let j=0;j<RINGS;j++)for(let i=0;i<SEG;i++){const a=j*(SEG+1)+i,b=a+SEG+1;bi.push(a,b,a+1,a+1,b,b+1);}
 const bowGeo=new THREE.BufferGeometry();bowGeo.setAttribute('position',new THREE.Float32BufferAttribute(bp,3));bowGeo.setAttribute('band',new THREE.Float32BufferAttribute(ba,2));bowGeo.setIndex(bi);
 const bowMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,uniforms:{uAlpha:{value:0}},
  vertexShader:'attribute vec2 band;varying vec2 vBand;void main(){vBand=band;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec2 vBand;uniform float uAlpha;
   vec3 spectrum(float t){vec3 c=mix(vec3(.55,.35,.9),vec3(.3,.45,1.),smoothstep(.0,.2,t));c=mix(c,vec3(.3,.85,.55),smoothstep(.2,.45,t));c=mix(c,vec3(1.,.9,.35),smoothstep(.45,.65,t));c=mix(c,vec3(1.,.6,.25),smoothstep(.65,.8,t));c=mix(c,vec3(1.,.32,.3),smoothstep(.8,1.,t));return c;}
   void main(){float edge=smoothstep(0.,.25,vBand.x)*smoothstep(1.,.75,vBand.x);float feet=smoothstep(0.,.18,vBand.y)*smoothstep(1.,.82,vBand.y);gl_FragColor=vec4(spectrum(vBand.x)*uAlpha*edge*feet,1.);}`});
 const arc=new THREE.Mesh(bowGeo,bowMat);arc.raycast=()=>{};arc.frustumCulled=false;bow.add(arc);
 bow.visible=false;
 let lowPower=false;
 let light=1,rainAmt=0,raining=false,next=RAIN_GAP[0]+rnd()*(RAIN_GAP[1]-RAIN_GAP[0]),until=0,bowAmt=0,bowUntil=0,t=0;
 const pick=([a,b])=>a+rnd()*(b-a);
 return {
  lowPower(){lowPower=true;rain.visible=bow.visible=false;rainAmt=bowAmt=0;},
  // daylight: 0 at night … 1 at noon (a rainbow needs the sun).
  update(dt,daylight=1){light=daylight;if(NO_RAIN){rain.visible=false;rainAmt=0;if(lowPower){bow.visible=false;bowAmt=0;return;}bowAmt+=((daylight>.3?1:0)-bowAmt)*Math.min(1,dt*.5);bow.visible=bowAmt>.01;bowMat.uniforms.uAlpha.value=bowAmt*1.1*daylight;return;}if(reduced?.matches||lowPower){rain.visible=bow.visible=false;rainAmt=bowAmt=0;return;}t+=dt;
   if(!raining&&t>=next){raining=true;until=t+pick(RAIN_LENGTH);}
   if(raining&&t>=until){raining=false;next=t+pick(RAIN_GAP);if(daylight>.45)bowUntil=t+RAINBOW_SECONDS;}
   rainAmt+=((raining?1:0)-rainAmt)*Math.min(1,dt*.8);rain.visible=rainAmt>.02;rainMat.opacity=rainAmt*.72;
   if(rain.visible){for(let i=0;i<N;i++){const k=i*6,d=speed[i]*dt;pos[k+1]-=d;pos[k+4]-=d;if(pos[k+1]<box.y[0]){const y=box.y[1]+pos[k+1]-box.y[0];pos[k+1]=y;pos[k+4]=y-.58;}}geo.attributes.position.needsUpdate=true;}
   const wantBow=t<bowUntil&&!raining?1:0;bowAmt+=(wantBow-bowAmt)*Math.min(1,dt*.5);bow.visible=bowAmt>.01;bowMat.uniforms.uAlpha.value=bowAmt*.62*daylight;},
  // How grey the sky is (0 clear … 1 full shower), for dimming the light.
  rain:()=>rainAmt,
  // For testing and a manual "下雨" toggle: start a shower now, or clear it.
  setRain(on){if(NO_RAIN)return;if(on){raining=true;until=t+pick(RAIN_LENGTH);}else{if(raining&&light>.45)bowUntil=t+RAINBOW_SECONDS;raining=false;until=t;next=t+pick(RAIN_GAP);}},
  state:()=>({raining,rain:Math.round(rainAmt*100)/100,rainbow:Math.round(bowAmt*100)/100,streaks:N,intensity:'heavy',nextIn:Math.max(0,Math.round(next-t))})
 };
}
