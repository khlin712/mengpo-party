// 「一分鐘看完旅程」: an auto-play tour. The camera flies round the seven stops one after another while a caption shows each
// stop's own lead text (nothing new is written here), with pause, replay and exit. Each stop stays up long enough to read:
// a little longer when its text is longer.
export const INTRO_SECONDS=5,MIN_STOP=7,MAX_STOP=11;
export const stopSeconds=text=>Math.min(MAX_STOP,Math.max(MIN_STOP,4+String(text||'').length/14));

// stations: the journey stops (id, n, short, lead). Returns the cues in order and the total length in seconds.
export function tourCues(stations,{intro=''}={}){
 const cues=[{id:null,title:'一分鐘看完旅程',caption:intro,dur:INTRO_SECONDS}];
 for(const s of stations)cues.push({id:s.id,title:`${s.n} ${s.short}`,caption:s.lead||'',dur:stopSeconds(s.lead)});
 let t=0;for(const c of cues){c.from=t;t+=c.dur;c.to=t;}
 return {cues,total:t};
}

// Which cue is showing at second t (the last one once the tour has run out).
export function cueAt(cues,t){if(!cues.length)return -1;if(t<=0)return 0;const k=cues.findIndex(c=>t>=c.from&&t<c.to);return k===-1?cues.length-1:k;}

export const clock=s=>String(Math.floor(Math.max(0,s))).padStart(2,'0');
