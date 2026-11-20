// Camera flights ease in and out like a guided move, so the visitor never loses where an island sits on the map.
export const FLY_MS=800;
export function easeInOutCubic(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
// Pixels of the map hidden on each side by floating panels (brand and tools on top, a side card, a bottom sheet).
// A panel spanning most of the width is a top/bottom band; anything narrower hides the left or right side.
// A panel that hides most of the map in both directions is ignored, so the island is centred once it closes.
export function mapInsets(map,rects=[]){
 const inset={left:0,right:0,top:0,bottom:0};
 if(!map||!map.width||!map.height)return inset;
 for(const r of rects){
  if(!r)continue;
  const left=Math.max(map.left,r.left),right=Math.min(map.right,r.right),top=Math.max(map.top,r.top),bottom=Math.min(map.bottom,r.bottom);
  const w=right-left,h=bottom-top;if(w<=0||h<=0)continue;
  if(w>map.width*.6&&h>map.height*.6)continue;
  if(w>map.width*.6){if(top-map.top<map.bottom-bottom)inset.top=Math.max(inset.top,bottom-map.top);else inset.bottom=Math.max(inset.bottom,map.bottom-top);}
  else if(left+w/2<map.left+map.width/2)inset.left=Math.max(inset.left,right-map.left);
  else inset.right=Math.max(inset.right,map.right-left);
 }
 inset.left=Math.min(inset.left,map.width*.6);inset.right=Math.min(inset.right,map.width*.6);
 inset.top=Math.min(inset.top,map.height*.6);inset.bottom=Math.min(inset.bottom,map.height*.6);
 return inset;
}
// One step of a two-finger gesture: how far the fingers spread (zoom), how much they twisted (rotate) and how far their midpoint moved (pan).
export function pinchStep(a0,b0,a1,b1){
 const d0=Math.hypot(b0.x-a0.x,b0.y-a0.y),d1=Math.hypot(b1.x-a1.x,b1.y-a1.y);
 let angle=Math.atan2(b1.y-a1.y,b1.x-a1.x)-Math.atan2(b0.y-a0.y,b0.x-a0.x);
 if(angle>Math.PI)angle-=2*Math.PI;else if(angle<=-Math.PI)angle+=2*Math.PI;
 return {scale:d0>0&&d1>0?d1/d0:1,angle,dx:(a1.x+b1.x-a0.x-b0.x)/2,dy:(a1.y+b1.y-a0.y-b0.y)/2};
}
// A drag released while moving keeps gliding, like a map flicked with a finger.
// samples are {t, x, z}: the total ground distance moved so far at each moment (ms).
export const FLING_TAU=260;
export function releaseVelocity(samples,now){
 const last=samples[samples.length-1];if(!last||now-last.t>60)return {x:0,z:0};
 let first=last;for(let i=samples.length-1;i>=0&&last.t-samples[i].t<=100;i--)first=samples[i];
 const dt=last.t-first.t;if(dt<12)return {x:0,z:0};
 return {x:(last.x-first.x)/dt,z:(last.z-first.z)/dt};
}
export function decay(speed,dt,tau=FLING_TAU){return speed*Math.exp(-dt/tau);}
