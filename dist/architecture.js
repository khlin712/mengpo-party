import * as THREE from './vendor/three.module.min.js';
import {LOOP,LOOP_STATIONS,loopPoint,loopDirection} from './loop.js';

// Original course miniatures: shared construction details, nine distinct silhouettes.
export function createArchitecture({box,mesh,tree}){
 const geo={cylinder:new THREE.CylinderGeometry(1,1,1,16),dome:new THREE.SphereGeometry(1,20,10,0,Math.PI*2,0,Math.PI/2),ball:new THREE.SphereGeometry(1,12,8)};
 const roof=new THREE.BufferGeometry();roof.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,-.5,.5,0,-.5,0,1,-.5,-.5,0,.5,.5,0,.5,0,1,.5],3));roof.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);roof.computeVertexNormals();
 // The summit trophy is a symbol of results, not a record of any award.
 const gold=new THREE.MeshStandardMaterial({color:'#e0b13f',roughness:.32,metalness:.55,emissive:'#ffb52e',emissiveIntensity:0});
 const cup=new THREE.LatheGeometry([[0,0],[.07,0],[.17,.06],[.27,.24],[.32,.46],[.33,.6],[.3,.6]].map(([x,y])=>new THREE.Vector2(x,y)),24);
 // Trophy handles: an ear-shaped scroll. It leaves the cup just under the rim, curls up and out into a small scroll, sweeps
 // down along the outside of the bowl and tucks back in under its waist. (Right-hand side; the left is its mirror image.)
 const handlePath=new THREE.CatmullRomCurve3([[.29,.93],[.37,1.0],[.47,1.0],[.5,.92],[.44,.88],[.48,.8],[.5,.7],[.43,.6],[.32,.54],[.22,.52]].map(([x,y])=>new THREE.Vector3(x,y,0)));
 const handle=new THREE.TubeGeometry(handlePath,48,.026,8,false);
 function golden(m){m.material=gold;return m;}
 // A painted board with the start's two questions (canvas text; plain colour where there is no canvas, e.g. in tests).
 const signMat=new THREE.MeshStandardMaterial({color:'#fff4d6',roughness:.9});
 if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=512;c.height=300;const x=c.getContext('2d');x.fillStyle='#fff4d6';x.fillRect(0,0,512,300);x.fillStyle='#c4612f';x.font='bold 40px "Noto Sans TC",sans-serif';x.textAlign='center';x.font='bold 42px "Noto Sans TC",sans-serif';x.fillText('人生卡住了嗎？',256,120);
  x.fillStyle='#2f3b33';x.font='bold 46px "Noto Sans TC",sans-serif';x.fillText('孟婆島，從這裡出發',256,215);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;signMat.map=tex;signMat.color.set('#ffffff');}
 // 02's question lamp stays lit whatever the time of day ("問題不限時間都可以問"): its own material, brighter as it gets darker.
 const askLamp=new THREE.MeshStandardMaterial({color:'#ffe2a1',roughness:.4,emissive:'#ffc15a',emissiveIntensity:.9}),screenMat=new THREE.MeshStandardMaterial({color:'#7cc7c9',roughness:.35,emissive:'#4fa8ad',emissiveIntensity:.45});
 let askHalo=null,askBase=.9;
 function askSignMaterial(){const m=new THREE.MeshStandardMaterial({color:'#fff4d6',roughness:.9});if(typeof document==='undefined')return m;
  const c=document.createElement('canvas');c.width=512;c.height=170;const x=c.getContext('2d');x.fillStyle='#fff4d6';x.fillRect(0,0,512,170);x.strokeStyle='#c99a3a';x.lineWidth=8;x.strokeRect(6,6,500,158);
  x.fillStyle='#8a5a1f';x.font='bold 84px "Noto Sans TC",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('隨時可以問',256,90);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;m.map=tex;m.color.set('#ffffff');m.emissive.set('#fff4d6');m.emissiveMap=tex;m.emissiveIntensity=.35;return m;}
 function haloSprite(){if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,214,130,.95)');g.addColorStop(.35,'rgba(255,190,90,.38)');g.addColorStop(1,'rgba(255,170,60,0)');x.fillStyle=g;x.fillRect(0,0,128,128);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.3}));sp.raycast=()=>{};sp.name='ask-lamp-halo';return sp;}
 // 02: the writing loop. A flat ring path round the classroom with arrows, and five small stations in teaching order (see loop.js).
 const loopRing=(()=>{const outer=new THREE.Shape();outer.absellipse(LOOP.cx,LOOP.cz,LOOP.rx+LOOP.half,LOOP.rz+LOOP.half,0,Math.PI*2,false,0);const hole=new THREE.Path();hole.absellipse(LOOP.cx,LOOP.cz,LOOP.rx-LOOP.half,LOOP.rz-LOOP.half,0,Math.PI*2,true,0);outer.holes.push(hole);const geom=new THREE.ShapeGeometry(outer,96);geom.rotateX(-Math.PI/2);return geom;})();
 const loopArrow=(()=>{const a=new THREE.Shape();a.moveTo(.058,0);a.lineTo(-.04,.052);a.lineTo(-.014,0);a.lineTo(-.04,-.052);a.closePath();const geom=new THREE.ShapeGeometry(a);geom.rotateX(-Math.PI/2);return geom;})();
 const playTriangle=(()=>{const a=new THREE.Shape();a.moveTo(-.02,-.028);a.lineTo(-.02,.028);a.lineTo(.034,0);a.closePath();return new THREE.ShapeGeometry(a);})();
 function flat(m){m.castShadow=false;return m;}
 function writingLoop(g){const y0=LOOP.y;
  flat(mesh(g,loopRing,'#f1dca8',0,y0+.006,0));
  for(const phi of [153,116,72,20,-45,-85,-125,-160]){const p=loopPoint(phi),d=loopDirection(phi),a=flat(mesh(g,loopArrow,'#d9884a',p.x,y0+.012,p.z));a.rotation.y=Math.atan2(-d.z,d.x);}
  const P=Object.fromEntries(LOOP_STATIONS.map(st=>[st.id,loopPoint(st.phi)]));
  // 1 製作教材: a bookshelf with a stack of handouts on top
  {const {x,z}=P.material,cols=['#d98f6a','#6f9bb8','#8fb07a','#e3b85a','#a688bd','#5f8fb4'];box(g,x,y0,z,.14,.31,.09,'#a47b52');
   for(const h of [.1,.2,.3])box(g,x,y0+h,z+.002,.142,.012,.092,'#8a6340');
   for(let r=0;r<3;r++)for(let i=0;i<4;i++)box(g,x-.048+i*.032,y0+.014+r*.1,z+.047,.024,.074,.014,cols[(r*4+i)%cols.length]);
   box(g,x,y0+.31,z,.11,.018,.075,'#fbf3df');box(g,x+.005,y0+.328,z,.1,.014,.07,'#f2e8cf').rotation.y=.1;}
  // 2 看教學: a screen on a stand showing a play button
  {const {x,z}=P.lesson;flat(box(g,x,y0,z,.11,.014,.07,'#59656b'));box(g,x,y0+.014,z,.022,.12,.022,'#59656b');box(g,x,y0+.13,z,.22,.15,.026,'#2f3b42');
   const scr=box(g,x,y0+.142,z+.014,.19,.12,.006,'#7cc7c9');scr.material=screenMat;scr.castShadow=false;const tri=flat(mesh(g,playTriangle,'#ffffff',x,y0+.202,z+.0185));tri.material=new THREE.MeshBasicMaterial({color:'#ffffff'});}
  // 3 寫作文: a student's desk with a page being written and a pencil
  {const {x,z}=P.write;box(g,x,y0+.15,z,.24,.03,.14,'#c9a06c');for(const [dx,dz] of [[-.1,-.055],[.1,-.055],[-.1,.055],[.1,.055]])box(g,x+dx,y0,z+dz,.022,.15,.022,'#8a6a48');
   box(g,x-.04,y0+.18,z,.09,.006,.07,'#fbf3df').rotation.y=.12;for(const k of [0,1,2])flat(box(g,x-.065+k*.0,y0+.186,z-.02+k*.02,.06,.002,.003,'#6f9bb8'));box(g,x+.06,y0+.18,z+.01,.075,.01,.01,'#e3b85a').rotation.y=-.3;}
  // 4 線上傳給老師批改: a red mail box with a letter in the slot
  {const {x,z}=P.send;box(g,x,y0,z,.035,.24,.035,'#6b5a45');box(g,x,y0+.24,z,.17,.11,.1,'#d0483a');box(g,x,y0+.35,z,.15,.014,.09,'#b53a2e');
   box(g,x,y0+.29,z+.051,.1,.014,.004,'#2f2a25');box(g,x+.03,y0+.3,z+.035,.07,.004,.04,'#fbf3df').rotation.z=.15;box(g,x+.1,y0+.26,z,.012,.08,.012,'#6b5a45');box(g,x+.125,y0+.32,z,.05,.03,.008,'#d9884a');}
  // 5 老師批改後傳回: the teacher's desk: a pile of pages, one marked in red, and a red pen
  {const {x,z}=P.grade;box(g,x,y0+.15,z,.22,.03,.14,'#c9a06c');for(const [dx,dz] of [[-.1,-.055],[.1,-.055],[-.1,.055],[.1,.055]])box(g,x+dx,y0,z+dz,.022,.15,.022,'#8a6a48');
   box(g,x-.05,y0+.18,z,.09,.022,.07,'#fbf3df');const top=box(g,x-.045,y0+.202,z,.09,.005,.07,'#fbf3df');top.rotation.y=-.1;
   for(const [dx,dz] of [[-.02,-.015],[.015,.005],[-.005,.02]])box(g,x-.045+dx,y0+.208,z+dz,.022,.003,.005,'#d0483a');box(g,x+.06,y0+.18,z+.015,.085,.011,.011,'#d0483a').rotation.y=.25;}
 }
 function questionLamp(g){
  // A small beacon on the classroom roof: a lantern that is never dark, with a halo, and a sign that says 隨時可以問.
  const x=-.3,z=.05;box(g,x,1.04,z,.026,.22,.026,'#536961');const lantern=mesh(g,geo.ball,'#ffe2a1',x,1.3,z,.062,.075,.062);lantern.material=askLamp;lantern.castShadow=false;lantern.name='ask-lamp';
  mesh(g,geo.cylinder,'#536961',x,1.375,z,.04,.014,.04);box(g,x+.06,1.16,z,.1,.012,.012,'#536961');
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(.27,.09),askSignMaterial());sign.position.set(x+.12,1.1,z+.02);sign.name='ask-sign';sign.userData.textSign=true;sign.castShadow=false;g.add(sign);
  box(g,x+.12,1.145,z+.01,.01,.04,.01,'#536961');
  askHalo=haloSprite();if(askHalo){askHalo.position.set(x,1.3,z);askHalo.scale.setScalar(.5);g.add(askHalo);}
 }
 const pond=new THREE.MeshStandardMaterial({color:'#8fc7de',roughness:.15,metalness:.1,emissive:'#5fa8c8',emissiveIntensity:.15});
 const lava=new THREE.MeshStandardMaterial({color:'#ff7a2a',emissive:'#ff4d00',emissiveIntensity:1.6,roughness:.4});
 const glass=new THREE.MeshStandardMaterial({color:'#638d97',roughness:.32,metalness:.08,emissive:'#ffc874',emissiveIntensity:0});
 function glazed(g,x,y,z,w,h){const m=box(g,x,y,z,w,h,.025,'#638d97');m.material=glass;m.castShadow=false;return m;}
 function window(g,x,y,z,w=.18,h=.25){box(g,x,y-.025,z-.012,w+.06,h+.05,.045,'#ece4d1');glazed(g,x,y,z+.018,w,h);box(g,x,y,z+.038,.018,h,.018,'#d5c5a3');box(g,x,y+h*.48,z+.04,w,.018,.018,'#d5c5a3');}
 function base(g,w,d){box(g,0,.245,0,w+.12,.08,d+.12,'#b9a78c');box(g,0,.325,0,w,.08,d,'#e9dfc8');}
 function hall(g,x,z,w,h,d,color='#eee5d2',roofColor='#527b72'){
  box(g,x,.4,z,w,h,d,color);box(g,x,.4+h-.035,z,w+.045,.07,d+.045,'#d1c5a8');
  const r=mesh(g,roof,roofColor,x,.4+h,z,w+.16,.22,d+.15);r.name='pitched-roof';
  const count=Math.max(1,Math.floor(w/.28));for(let i=0;i<count;i++)window(g,x-w*.33+(count===1?0:i*w*.66/(count-1)),.57,z+d/2+.025,.14,Math.min(.3,h*.48));
 }
 function steps(g,x,z,w){for(let i=0;i<3;i++)box(g,x,.245+i*.035,z-i*.075,w,.035,(3-i)*.1,'#dfd6c1');}
 function bench(g,x,z){box(g,x,.3,z,.32,.035,.13,'#b4855b');for(const a of [-.11,.11])box(g,x+a,.25,z,.025,.07,.09,'#536961');}
 function planter(g,x,z){box(g,x,.25,z,.2,.12,.2,'#b5906b');mesh(g,new THREE.IcosahedronGeometry(1,1),'#7b9967',x,.43,z,.14,.12,.14);}
 function lamp(g,x,z){box(g,x,.25,z,.025,.5,.025,'#536961');const m=box(g,x,.73,z,.09,.09,.09,'#ffe6a6');m.material=glass;m.castShadow=false;}
 function build(parent,t){const g=new THREE.Group();g.name='course-architecture';g.userData.kind=t.kind;parent.add(g);
  if(t.kind==='school'){
   // 01 The teacher's writing studio: a low, wide house with big windows and a warm desk lamp inside, books stacked by the door,
   // loose manuscript pages on the bench, and a giant fountain pen standing out front as the island's landmark.
   base(g,1.25,.72);box(g,0,.4,-.14,1.12,.48,.52,'#f1e6cf');box(g,0,.86,-.14,1.18,.05,.58,'#d1c5a8');mesh(g,roof,'#5c7a6c',0,.9,-.14,1.3,.28,.68);
   for(const x of [-.36,-.06])glazed(g,x,.6,.125,.24,.32);for(const x of [-.36,-.06]){box(g,x,.43,.13,.3,.03,.05,'#d5c5a3');box(g,x,.76,.13,.3,.03,.05,'#d5c5a3');}
   const deskLamp=mesh(g,geo.dome,'#ffd27a',-.2,.66,.0,.06,.05,.06);deskLamp.material=glass;box(g,-.2,.5,.0,.42,.03,.16,'#8a6a48');
   box(g,.33,.4,.13,.2,.4,.03,'#7a5a3c');mesh(g,geo.dome,'#d9a521',.39,.6,.15,.015,.015,.015);box(g,-.22,.84,.2,.66,.025,.16,'#c4612f').rotation.x=-.35;
   for(let i=0;i<4;i++)box(g,.52,.25+i*.045,.24,.16-i*.012,.04,.11,['#e07a5f','#5f8fb4','#f2c14e','#7aa66b'][i]);
   bench(g,.05,.55);for(let i=0;i<3;i++){const sh=box(g,-.02+i*.05,.34,.55+(i%2)*.02,.09,.004,.12,'#fffdf5');sh.rotation.y=(i-1)*.3;}
   // The landmark pen: dark barrel, gold band and nib, writing into a stone plinth.
   box(g,-.62,.25,.42,.22,.1,.22,'#cfc3ab');const pen=new THREE.Group();pen.position.set(-.62,.35,.42);pen.rotation.z=.32;g.add(pen);
   mesh(pen,geo.cylinder,'#2f3b33',0,.52,0,.055,.62,.055);mesh(pen,geo.cylinder,'#d9a521',0,.82,0,.06,.05,.06);mesh(pen,geo.cylinder,'#2f3b33',0,.95,0,.05,.22,.05);
   const nib=mesh(pen,new THREE.ConeGeometry(.055,.2,8),'#d9a521',0,.12,0);nib.rotation.z=Math.PI;golden(mesh(pen,geo.cylinder,'#d9a521',0,.23,0,.058,.03,.058));
   lamp(g,.68,.4);
  }else if(t.kind==='tower'){
   // 02 Teaching approach & how a class runs: a classroom with a big chalkboard on its front wall and a small observatory dome
   // on the roof (the approach: looking further ahead). Three stepping stones for before, during and after class are laid by the
   // map where those key-point pins stand.
   base(g,1.06,.7);box(g,0,.4,-.1,.96,.56,.54,'#ece2cc');box(g,0,.94,-.1,1.02,.05,.6,'#c9b38a');mesh(g,roof,'#586e78',0,.98,-.1,1.12,.24,.66);
   box(g,-.16,.47,.172,.56,.34,.012,'#8a6a48');box(g,-.16,.48,.18,.52,.3,.012,'#2f5a46');for(const [y,w]of [[.58,.3],[.52,.38],[.46,.22],[.4,.32]]){const l=box(g,-.38+w/2,y,.19,w,.012,.004,'#f4f1e6');l.castShadow=false;}
   box(g,.3,.4,.17,.18,.4,.03,'#59756b');glazed(g,.3,.68,.17,.1,.08);
   mesh(g,geo.cylinder,'#b7a58a',.25,1.12,-.15,.18,.1,.18);mesh(g,geo.dome,'#739799',.25,1.17,-.15,.18,.16,.18);
   const scope=mesh(g,geo.cylinder,'#c8b787',.33,1.32,-.12,.04,.3,.04);scope.rotation.z=-.85;mesh(g,geo.cylinder,'#3e646e',.44,1.42,-.12,.05,.02,.05).rotation.z=-.85;
   // The writing loop (the teaching mode) and the question lamp that is never dark.
   writingLoop(g);questionLamp(g);
  }else if(t.kind==='trees'){
   box(g,0,.25,.05,1.12,.08,.92,'#b79c70');for(let i=0;i<6;i++)box(g,-.5+i*.2,.33,.05,.012,.008,.92,'#927b59');
   for(const x of [-.48,.48])for(const z of [-.3,.36])box(g,x,.33,z,.035,.62,.035,'#e1d1ab');for(const x of [-.44,-.22,0,.22,.44])box(g,x,.95,.03,.045,.045,.86,'#e1d1ab');
   box(g,0,.4,.16,.62,.22,.32,'#b68e62');for(let i=0;i<3;i++){const p=box(g,-.18+i*.18,.64,.16,.14,.02,.24,'#f6ebc9');p.rotation.y=(i-1)*.12;}tree(g,-.68,-.44,.68);tree(g,.68,-.44,.8);planter(g,-.7,.48);
  }else if(t.kind==='blocks'){
   base(g,1.08,.7);hall(g,-.32,.04,.42,.52,.55,'#e8d6b5','#9f7659');hall(g,.2,-.12,.5,.9,.65,'#e8dfc8','#597d83');hall(g,.55,.12,.28,.38,.43,'#ddd2bc','#719081');steps(g,-.23,.47,.35);planter(g,.66,.54);
  }else if(t.kind==='house'){
   base(g,1.04,.7);hall(g,-.05,-.05,.94,.6,.66,'#eee2c9','#618575');
   box(g,0,.4,.31,.2,.38,.05,'#8d6f51');for(const x of [-.42,.42])box(g,x,.4,.48,.035,.43,.035,'#e8d9b8');box(g,0,.84,.42,1.08,.07,.32,'#9eb09a');steps(g,0,.65,.48);bench(g,.63,.38);planter(g,-.65,.48);
  }else if(t.kind==='trophy'){
   base(g,.98,.86);box(g,0,.4,-.05,.7,.24,.62,'#e9dfc8');box(g,0,.64,-.05,.54,.14,.48,'#d1c5a8');box(g,0,.46,.265,.36,.11,.02,'#9c7f4f');
   // 孟婆島：摩天輪取代獎盃，是整張地圖的地標（對應「參加後的繽紛世界」）。群組仍叫 trophy-cup，沿用原本的發光與點擊行為。
   const cupG=new THREE.Group();cupG.name='trophy-cup';cupG.position.set(0,.98,-.05);cupG.scale.setScalar(1.5);g.add(cupG);
   const wheelGold=new THREE.MeshStandardMaterial({color:'#f2c14e',roughness:.4,metalness:.2,emissive:'#ffb52e',emissiveIntensity:0});
   const rimA=mesh(cupG,new THREE.TorusGeometry(1,.035,8,40),'#f2c14e',0,0,0,.42,.42,1.6);rimA.material=wheelGold;const rimB=mesh(cupG,new THREE.TorusGeometry(1,.02,8,40),'#f6e3a0',0,0,0,.26,.26,1.6);rimB.material=wheelGold;
   for(let i=0;i<10;i++){const sp=box(cupG,0,0,0,.012,.42,.012,'#f6e3a0');sp.rotation.z=i/10*Math.PI;}
   mesh(cupG,geo.cylinder,'#d8a43a',0,0,0,.05,.05,.05).rotation.x=Math.PI/2;
   const colors=['#e8798a','#7cc7c9','#f2c14e','#9a7bb8','#8fc77a','#f2a76a','#6fa8dc','#e07a5f'];
   colors.forEach((c,i)=>{const a=i/colors.length*Math.PI*2,x=Math.cos(a)*.42,y=Math.sin(a)*.42;box(cupG,x,y-.045,0,.08,.07,.07,c);box(cupG,x,y+.0,0,.012,.03,.012,'#8a6a48');});
   for(const side of [-1,1]){const leg=box(cupG,side*.2,-.5,0,.03,.7,.03,'#c4612f');leg.rotation.z=side*-.3;}
   box(cupG,0,-.78,0,.62,.04,.14,'#a37a4a');
  }else if(t.kind==='university'){
   // 回饋島：粉色牆面、藍色屋頂的小宮殿，象徵客戶回饋（只是意象，沒有名稱或標誌）。
   const brick='#e59aae',stone='#f7eadb',tile='#7fb4c8',dark='#5a4a55';
   box(g,0,.245,.02,1.5,.08,1.02,'#b9a78c');box(g,0,.325,.02,1.4,.06,.94,stone);
   for(const side of [-1,1]){const x=side*.46;box(g,x,.385,-.05,.5,.46,.62,brick);box(g,x,.84,-.05,.54,.05,.66,stone);mesh(g,roof,tile,x,.89,-.05,.58,.2,.7);
    for(const dx of [-.15,0,.15]){box(g,x+dx,.48,.27,.075,.2,.02,dark);mesh(g,geo.cylinder,dark,x+dx,.68,.27,.0375,.02,.0375).rotation.x=Math.PI/2;box(g,x+dx,.41,.29,.1,.02,.02,stone);}
    for(const dx of [-.22,-.08,.08,.22])mesh(g,geo.cylinder,stone,x+dx,.6,.33,.022,.46,.022);box(g,x,.835,.33,.5,.03,.05,stone);}
   box(g,0,.385,0,.46,.72,.7,stone);box(g,0,1.1,0,.5,.05,.74,'#d8c7a4');mesh(g,roof,tile,0,1.15,0,.56,.28,.78);
   mesh(g,geo.cylinder,stone,0,1.43,0,.09,.12,.09);mesh(g,geo.dome,'#8f9c88',0,1.49,0,.09,.08,.09);
   for(const dx of [-.13,0,.13]){box(g,dx,.39,.352,.09,.42,.02,dark);mesh(g,geo.cylinder,dark,dx,.81,.352,.045,.02,.045).rotation.x=Math.PI/2;}
   for(const dx of [-.2,-.065,.065,.2])box(g,dx,.39,.37,.04,.52,.04,stone);box(g,0,.9,.37,.48,.07,.05,stone);
   for(let i=0;i<3;i++)box(g,0,.245+i*.03,.47+i*.04,.5-i*.04,.03,.12,'#dfd6c1');
   lamp(g,-.62,.42);lamp(g,.62,.42);planter(g,-.32,.5);planter(g,.32,.5);
  }else if(t.kind==='start'){
   // ① 崎嶇島：火山、尖石與一座彎曲的山（不做地獄場景，太恐怖）。象徵「人生遇到很多困境」。
   const rockC='#6b5a50',rockD='#8a7766';
   // 火山：圓錐加上發光的火口，放在島的後方，不擋住前緣的路。
   const cone=mesh(g,new THREE.ConeGeometry(1,1,10),rockC,-.28,.62,-.35,.5,.78,.5);cone.castShadow=true;
   const crater=mesh(g,new THREE.CylinderGeometry(1,1,1,14),'#ff7a2a',-.28,.99,-.35,.16,.03,.16);crater.material=lava;crater.castShadow=false;
   for(const [x,z,h] of [[-.28,-.35,.2],[-.22,-.32,.14]]){const puff=mesh(g,geo.ball,'#e8e0d8',x,1.12+h,z,.07+h*.2,.05,.07+h*.2);puff.material.transparent=true;puff.material.opacity=.7;puff.castShadow=false;}
   // 崎嶇的山脊與尖石：一座彎彎曲曲的山。
   for(const [x,z,r,h] of [[.42,-.5,.28,.55],[.62,-.28,.2,.38],[.2,-.62,.22,.42]]){const m=mesh(g,new THREE.ConeGeometry(1,1,6),rockD,x,.25+h/2,z,r,h,r);m.rotation.z=(x>.4?-.12:.1);}
   for(const [x,z,r] of [[-.7,.1,.1],[-.58,.3,.08],[.7,.1,.09],[.55,.34,.07]])mesh(g,new THREE.DodecahedronGeometry(1,0),'#7d6c5e',x,.29,z,r,r*.9,r);
   lamp(g,.22,.58);
   // 路牌：「人生卡住了嗎？」
   for(const x of [.22,.7])box(g,x,.25,-.68,.04,.7,.04,'#8a6a48');box(g,.46,.7,-.69,.58,.36,.02,'#8a6a48');const sign=box(g,.46,.7,-.675,.52,.3,.01,'#fff4d6');sign.material=signMat;sign.userData.textSign=true;
  }else if(t.kind==='fork'){
   // ② The trailhead: room to gather in front of the notice board, with rocks, pines and a bench round the edge.
   for(const [x,z,r]of [[-.62,-.45,.13],[.66,-.35,.1],[-.7,.15,.08],[.55,.5,.09]])mesh(g,new THREE.DodecahedronGeometry(1,0),'#9b8a6c',x,.3,z,r,r*.8,r);
   tree(g,-.12,-.86,.62);tree(g,.62,-.6,.55);bench(g,-.5,.45);lamp(g,.62,.18);
  }else if(t.kind==='lava'){
   // A lava cave: a dark rock mound with a glowing pool at its mouth. Walk in and you do not come out.
   const rock='#5b4a42';for(const [x,z,r,h]of [[0,-.2,.55,.75],[-.42,-.05,.35,.5],[.42,-.1,.38,.55],[.15,-.45,.4,.6]])mesh(g,new THREE.DodecahedronGeometry(1,0),rock,x,.25+h*.45,z,r,h,r);
   mesh(g,geo.dome,'#1d1512',0,.25,.18,.24,.34,.12);const pool=mesh(g,new THREE.CylinderGeometry(1,1,1,20),'#ff7a2a',0,.26,.36,.3,.02,.2);pool.material=lava;pool.castShadow=false;
   for(const [x,z]of [[-.55,.42],[.55,.38]])mesh(g,new THREE.DodecahedronGeometry(1,0),'#3e3330',x,.3,z,.09,.08,.09);
  }else if(t.kind==='cliff'){
   // A cliff: grass that simply ends at the far edge, with a lone pine leaning out. Walk on and you fall.
   for(const [x,z,r]of [[-.3,-.3,.12],[.25,-.45,.09],[-.55,.1,.08]])mesh(g,new THREE.DodecahedronGeometry(1,0),'#9b8a6c',x,.3,z,r,r*.8,r);tree(g,.45,-.1,.7);tree(g,-.4,-.55,.55);
  }else if(t.kind==='wall'){
   // The top of the steep wall: a cairn and a little flag for those who made it up.
   for(let i=0;i<4;i++)mesh(g,new THREE.DodecahedronGeometry(1,0),'#a89c86',0,.28+i*.09,-.1,.16-i*.03,.06,.16-i*.03);mesh(g,geo.cylinder,'#6b5a45',.25,.55,-.2,.012,.6,.012);box(g,.32,.78,-.2,.14,.09,.01,'#f2c14e');tree(g,-.5,-.4,.55);
  }else if(t.kind==='calendar'){
   // ⑤ The course calendar: a small hall with a big calendar board out front.
   base(g,1,.62);hall(g,0,-.12,.86,.5,.5,'#eee5d2','#6d7f9a');box(g,0,.36,.3,.86,.6,.05,'#8a6a48');box(g,0,.42,.33,.78,.5,.02,'#fffaf0');box(g,0,.84,.335,.78,.1,.02,'#d0695a');
   for(let r=0;r<3;r++)for(let c=0;c<6;c++)box(g,-.3+c*.12,.5+r*.11,.345,.08,.07,.006,(r===1&&c===3)?'#f2c14e':'#e6dccb');
  }else if(t.kind==='signup'){
   // ⑥ Open-air lecture hall: a chalkboard and lectern, with tiered wooden benches (people are supplied by walkers.js).
   box(g,0,.25,-.42,1.12,.09,.68,'#bd9b70');
   for(const x of [-.48,.48])box(g,x,.34,-.68,.04,.82,.04,'#795d43');box(g,0,.66,-.68,1.06,.52,.05,'#795d43');box(g,0,.69,-.645,.96,.44,.015,'#33584d');
   for(const [x,w,y]of [[-.23,.38,.98],[-.1,.56,.88],[-.2,.32,.78]])box(g,x,y,-.632,w,.012,.008,'#e9e5cd');
   box(g,.3,.34,-.37,.12,.25,.12,'#8a6a48');box(g,.3,.59,-.37,.35,.04,.25,'#c9b38a');
   for(let r=0;r<2;r++){const z=.16+r*.36;box(g,0,.25,z,.98,.08+r*.035,.24,'#aa8760');box(g,0,.33+r*.035,z+.1,.98,.16,.035,'#c9b38a');}
   lamp(g,-.68,.45);planter(g,.69,-.18);
  }else if(t.kind==='contact'){
   // ⑦ Service desk: a counter under a striped awning with an "i" sign, a bell and a stand of leaflets.
   base(g,.96,.62);box(g,0,.33,-.12,.86,.38,.36,'#f1e7d4');box(g,0,.71,-.12,.9,.04,.4,'#c9b38a');box(g,0,.33,.07,.86,.38,.02,'#4f7d74');
   for(const x of [-.45,.45])box(g,x,.33,-.32,.04,.92,.04,'#6b5a45');for(let i=0;i<6;i++){const a=box(g,-.4+i*.16,1.22,-.12,.16,.03,.5,i%2?'#fff4d6':'#4f7d74');a.rotation.x=-.3;}
   mesh(g,geo.cylinder,'#2f6f73',0,1.42,-.3,.17,.02,.17).rotation.x=Math.PI/2;box(g,0,1.39,-.28,.03,.11,.01,'#fff4d6');box(g,0,1.48,-.28,.03,.03,.01,'#fff4d6');
   mesh(g,geo.dome,'#d9a521',.25,.75,-.05,.05,.04,.05);box(g,-.3,.75,-.08,.12,.08,.06,'#e07a5f');bench(g,-.55,.45);bench(g,.55,.45);planter(g,.68,-.1);
  }else if(t.kind==='clock'){
   base(g,.72,.68);hall(g,0,-.05,.57,.94,.55,'#e6dbc0','#81795c');
   box(g,0,1.34,-.05,.69,.11,.67,'#c0a77c');box(g,0,1.45,-.05,.5,.45,.5,'#e8dec8');mesh(g,geo.dome,'#657d70',0,1.92,-.05,.34,.22,.34);
   mesh(g,new THREE.CircleGeometry(.17,24),'#fff4d7',0,1.68,.21);box(g,0,1.64,.226,.015,.13,.015,'#546962');box(g,.035,1.68,.23,.085,.015,.012,'#546962');steps(g,0,.47,.43);bench(g,-.6,.4);lamp(g,.57,.35);
  }else if(t.kind==='lab'){
   base(g,1.06,.74);hall(g,-.28,.04,.45,.56,.6,'#e6dfd0','#7f8991');
   mesh(g,geo.cylinder,'#ddd5c2',.25,.68,-.08,.36,.55,.36);mesh(g,geo.dome,'#7e9a9f',.25,.96,-.08,.4,.36,.4);
   for(const x of [.08,.28,.48])window(g,x,.51,.3,.12,.22);box(g,.25,.39,.34,.22,.3,.04,'#67827c');steps(g,.25,.55,.43);planter(g,-.65,.47);
  }else if(t.kind==='pavilion'){
   // 03 Parents' and students' questions: a pavilion to sit and talk in — a round table with two chairs (a parent and a student
   // sit there), lanterns at the corners, and a question box by the steps.
   base(g,1.12,.88);for(const x of [-.45,.45])for(const z of [-.3,.3])box(g,x,.4,z,.055,.65,.055,'#b28e61');
   mesh(g,roof,'#6d8c79',0,1.05,0,1.27,.3,1.02);box(g,0,1.02,0,1.25,.045,1.02,'#d4bd96');
   mesh(g,geo.cylinder,'#8a6a48',0,.42,.02,.04,.34,.04);mesh(g,geo.cylinder,'#c1a077',0,.6,.02,.24,.035,.24);
   for(const side of [-1,1]){box(g,side*.27,.25,.02,.16,.18,.16,'#9c7a55');box(g,side*.34,.25,.02,.03,.36,.16,'#9c7a55');}
   for(const x of [-.45,.45])for(const z of [-.3,.3]){mesh(g,geo.cylinder,'#5b4a3c',x,.9,z,.006,.08,.006);const ln=mesh(g,geo.ball,'#ffd99a',x,.83,z,.045,.06,.045);ln.material=glass;}
   box(g,.66,.25,.42,.04,.34,.04,'#5b4a3c');box(g,.66,.58,.42,.2,.16,.14,'#4f7d74');box(g,.66,.62,.495,.12,.012,.004,'#1f2a24');
   mesh(g,new THREE.TorusGeometry(.035,.012,6,12,Math.PI*1.4),'#fff4d6',.66,.555,.5).rotation.z=-.5;mesh(g,geo.ball,'#fff4d6',.66,.505,.5,.012,.012,.012);
   steps(g,0,.62,.5);
  }else{
   box(g,0,.25,.05,1.2,.08,.96,'#bc9b70');for(let i=0;i<7;i++)box(g,-.55+i*.18,.33,.05,.012,.008,.96,'#8f795d');hall(g,-.2,-.24,.65,.45,.46,'#e9ddc4','#65857d');
   for(const x of [-.5,.5]){box(g,x,.33,.45,.035,.36,.035,'#d6c5a0');box(g,x,.33,.08,.035,.36,.035,'#d6c5a0');box(g,x,.66,.27,.035,.035,.42,'#e9d6aa');}bench(g,-.1,.35);lamp(g,.65,-.12);
  }
  return g;
 }
 return {build,shine(v){gold.emissiveIntensity=v*.6;},// A letter reaching the question lamp makes it flare for a moment (k from 1 down to 0).
  askPulse(k){askLamp.emissiveIntensity=askBase*(1+.9*k);if(askHalo)askHalo.scale.setScalar(.5*(1+.25*k));},
  time(name){askBase=name==='night'?1.9:name==='dusk'?1.3:.9;askLamp.emissiveIntensity=askBase;if(askHalo)askHalo.material.opacity=name==='night'?.9:name==='dusk'?.55:.28;glass.color.set(name==='night'?'#ffd99a':'#638d97');glass.emissiveIntensity=name==='night'?1.35:name==='dusk'?.35:0;}};
}
