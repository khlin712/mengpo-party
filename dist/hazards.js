// The wrong-route wood deck is twice its previous .38 width. The silver/gold course bridge never breaks.
export const TRAIL_WIDTH=.76,TRAIL_LANE=.24;
export function createTrailHazards(count,{rnd=Math.random,reduced}={}){
 const pick=(a,b)=>a+rnd()*(b-a),spans=Array.from({length:count},()=>({phase:'safe',age:0,left:pick(22,48),center:pick(.35,.65)}));let breaks=0;
 return {
  update(dt){if(reduced?.matches){for(const s of spans){s.phase='safe';s.age=0;s.left=Math.max(1,s.left);}return;}for(const s of spans){s.age+=dt;s.left-=dt;if(s.left>0)continue;s.age=0;
   if(s.phase==='safe'){s.phase='warning';s.left=2;s.center=pick(.35,.65);}
   else if(s.phase==='warning'){s.phase='broken';s.left=pick(5,8);breaks++;}
   else if(s.phase==='broken'){s.phase='repair';s.left=3;}
   else{s.phase='safe';s.age=0;s.left=pick(22,48);}}},
  gap(i,u){const s=spans[i];return !!s&&(s.phase==='broken'||s.phase==='repair')&&Math.abs(u-s.center)<.09;},
  span:i=>spans[i],state:()=>({breaks,spans:spans.map(s=>({...s,left:Math.round(s.left*100)/100}))})
 };
}
