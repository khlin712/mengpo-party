import * as THREE from './vendor/three.module.min.js';

// The islands float in open sky: a gradient dome that follows the camera, a sea of clouds far below,
// a ring of slow clouds at island height, and stars that only show at night.
const DAY={stops:[[-1,'#8fbde0'],[-.35,'#aed0e9'],[-.05,'#e3edf2'],[.12,'#d4e8f4'],[.5,'#a3cbea'],[1,'#7cafdf']],fog:'#cbe0ee',cloud:'#ffffff',glow:.12};
const DAWN={stops:[[-1,'#b9acd2'],[-.35,'#dcc3d3'],[-.05,'#ffdcc6'],[.12,'#f7d6c8'],[.5,'#c8c8e4'],[1,'#98aedb']],fog:'#ead7d6',cloud:'#fff2ec',glow:.14};
const DUSK={stops:[[-1,'#7d76a8'],[-.35,'#c3979f'],[-.05,'#ffc28c'],[.12,'#f3a87c'],[.5,'#9a87b9'],[1,'#4b5d98']],fog:'#d8a99c',cloud:'#ffe3cf',glow:.12};
const NIGHT={stops:[[-1,'#16233a'],[-.08,'#33456a'],[.12,'#24365a'],[.5,'#14223f'],[1,'#0b1530']],fog:'#2a3a5a',cloud:'#9fb0cc',glow:.05};

export function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// Colour of the dome at height h (-1 straight down … 1 straight up).
export function skyColor(stops,h){
 if(h<=stops[0][0])return stops[0][1];
 for(let i=1;i<stops.length;i++)if(h<=stops[i][0]){const [h0,c0]=stops[i-1],[h1,c1]=stops[i];return '#'+new THREE.Color(c0).lerp(new THREE.Color(c1),(h-h0)/(h1-h0)).getHexString();}
 return stops[stops.length-1][1];
}

export const TIMES={dawn:DAWN,day:DAY,dusk:DUSK,night:NIGHT};
// The island's clock: which two times of day an hour (0–24) sits between, how far along, how starry and how sunny it is.
const KEYS=[[0,'night'],[4.5,'night'],[6,'dawn'],[8,'day'],[16.5,'day'],[18,'dusk'],[19.5,'night'],[24,'night']];
const SUN={night:0,dawn:.5,day:1,dusk:.5};
export function dayPhase(hour){const h=((hour%24)+24)%24;let i=0;while(i<KEYS.length-2&&h>=KEYS[i+1][0])i++;const [h0,a]=KEYS[i],[h1,b]=KEYS[i+1],u=(h-h0)/(h1-h0),t=u*u*(3-2*u);
 return {a,b,t,stars:(a==='night'?1-t:0)+(b==='night'?t:0),daylight:SUN[a]+(SUN[b]-SUN[a])*t,name:t<.5?a:b};}

export function createSky(scene,{reduced}){
 const dome=new THREE.Mesh(new THREE.SphereGeometry(90,40,20),new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false}));
 dome.renderOrder=-1;scene.add(dome);
 const position=dome.geometry.attributes.position;dome.geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(position.count*3),3));
 function paint(theme){const color=new THREE.Color(),colors=dome.geometry.attributes.color;for(let i=0;i<position.count;i++){color.set(skyColor(theme.stops,position.getY(i)/90));colors.setXYZ(i,color.r,color.g,color.b);}colors.needsUpdate=true;}

 const puff=new THREE.IcosahedronGeometry(1,2);
 const cloudMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,emissive:'#ffffff',emissiveIntensity:DAY.glow});
 function layer(count,place){const m=new THREE.InstancedMesh(puff,cloudMaterial,count);const dummy=new THREE.Object3D();for(let i=0;i<count;i++){place(dummy,i);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}m.castShadow=false;m.receiveShadow=false;scene.add(m);return m;}
 // Sea of clouds: clumps of puffs spread under and around the islands.
 const r1=random(7),seaClumps=[];for(let i=0;i<52;i++){const a=r1()*Math.PI*2,d=6+Math.sqrt(r1())*56;seaClumps.push([Math.cos(a)*d,-8.5-r1()*2.5,Math.sin(a)*d,1.3+r1()*2]);}
 const below=layer(seaClumps.length*5,(o,i)=>{const [x,y,z,s]=seaClumps[Math.floor(i/5)],k=i%5;o.position.set(x+(k-2)*s*.55+r1()*.6,y+r1()*.5,z+(r1()-.5)*s*.9);const size=s*(.55+r1()*.45);o.scale.set(size*1.25,size*.5,size);});
 // A loose ring of clouds at island height, kept clear of the archipelago.
 const r2=random(11),ringClumps=[];for(let i=0;i<14;i++){const a=i/14*Math.PI*2+r2()*.3,d=17+r2()*16;ringClumps.push([Math.cos(a)*d,-1.5+r2()*4,Math.sin(a)*d,.9+r2()*1.1]);}
 const ring=layer(ringClumps.length*4,(o,i)=>{const [x,y,z,s]=ringClumps[Math.floor(i/4)],k=i%4;o.position.set(x+(k-1.5)*s*.7,y+(k%2)*s*.25,z+(r2()-.5)*s*.6);const size=s*(.6+r2()*.4);o.scale.set(size*1.3,size*.6,size);});

 // Wisps just under the island rims, so clouds show even when looking straight down at the map.
 const r4=random(23),wispClumps=[];for(let i=0;i<12;i++){const a=i/12*Math.PI*2+r4()*.4,d=8+r4()*6;wispClumps.push([Math.cos(a)*d,-2.6-r4()*1.4,Math.sin(a)*d*.85,.8+r4()*.8]);}
 const wisps=layer(wispClumps.length*4,(o,i)=>{const [x,y,z,s]=wispClumps[Math.floor(i/4)],k=i%4;o.position.set(x+(k-1.5)*s*.75,y+(k%2)*s*.2,z+(r4()-.5)*s*.5);const size=s*(.6+r4()*.4);o.scale.set(size*1.4,size*.45,size);});
 // Sparse lower clouds support the inner islands; instancing keeps the extra layer to one draw call.
 const innerClumps=[[2.3,-5.2,-1.5,1.1],[3.7,-5.7,-3.5,.95],[.5,-4.8,2.8,.85],[-.7,-5.6,-2.8,1.2]];
 const inner=layer(innerClumps.length*4,(o,i)=>{const [x,y,z,s]=innerClumps[Math.floor(i/4)],k=i%4;o.position.set(x+(k-1.5)*s*.7,y+(k%2)*.15,z+(k%2-.5)*s*.6);o.scale.set(s,s*.32,s*.8);});inner.name='inner-clouds';
 const r3=random(3),stars=new Float32Array(500*3);for(let i=0;i<500;i++){const u=r3()*2-1,a=r3()*Math.PI*2,rad=Math.sqrt(1-u*u)*85;stars.set([Math.cos(a)*rad,u*85,Math.sin(a)*rad],i*3);}
 const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.BufferAttribute(stars,3));
 const starMat=new THREE.PointsMaterial({color:'#fff6da',size:1.6,sizeAttenuation:false,fog:false,depthWrite:false,transparent:true,opacity:1});
 const starField=new THREE.Points(starGeometry,starMat);starField.visible=false;dome.add(starField);
 // The moon: a pale disc with a soft halo, up behind the islands, out at night only.
 const moonMat=new THREE.MeshBasicMaterial({color:'#f6f2df',fog:false,transparent:true,opacity:0,depthWrite:false}),haloMat=new THREE.MeshBasicMaterial({color:'#cfdcff',fog:false,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
 const moon=new THREE.Group();moon.name='moon';moon.position.set(-30,12,-62);const disc=new THREE.Mesh(new THREE.SphereGeometry(1.9,24,16),moonMat),halo=new THREE.Mesh(new THREE.SphereGeometry(4,24,16),haloMat);moon.add(halo,disc);moon.visible=false;scene.add(moon);

 function theme(name){const t=TIMES[name]||DAY,night=name==='night';paint(t);scene.fog.color.set(t.fog);cloudMaterial.color.set(t.cloud);cloudMaterial.emissive.set(t.cloud);cloudMaterial.emissiveIntensity=t.glow;starField.visible=night;}
 theme('day');
 // Between two times of day: t=0 is a, t=1 is b. `grey` (0–1) washes the sky out for rain.
 const A=new THREE.Color(),B=new THREE.Color(),G=new THREE.Color('#9aa6b2');
 function blend(a,b,t,grey=0,stars=0){const ta=TIMES[a]||DAY,tb=TIMES[b]||DAY,colors=dome.geometry.attributes.color;
  for(let i=0;i<position.count;i++){const h=position.getY(i)/90;A.set(skyColor(ta.stops,h)).lerp(B.set(skyColor(tb.stops,h)),t).lerp(G,grey*.55);colors.setXYZ(i,A.r,A.g,A.b);}colors.needsUpdate=true;
  scene.fog.color.set(ta.fog).lerp(B.set(tb.fog),t).lerp(G,grey*.5);cloudMaterial.color.set(ta.cloud).lerp(B.set(tb.cloud),t).lerp(G,grey*.35);cloudMaterial.emissive.copy(cloudMaterial.color);cloudMaterial.emissiveIntensity=ta.glow+(tb.glow-ta.glow)*t;
  starField.visible=stars>.02;starMat.opacity=stars*(1-grey);moon.visible=stars>.02;moonMat.opacity=stars*(1-grey*.7);haloMat.opacity=stars*.18*(1-grey);}
 return {
  time:theme,blend,
  update(elapsed,camera){dome.position.copy(camera.position);
if(reduced.matches)return;below.rotation.y=elapsed*.006;ring.rotation.y=-elapsed*.012;wisps.rotation.y=elapsed*.009;}
 };
}
