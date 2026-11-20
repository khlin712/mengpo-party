export const RECOVERY_WAIT_MS=8000,REPEAT_LOSS_MS=120000;
// Browser restoration may arrive late. Only a user action can resume after timeout or a second loss.
export function createRecovery({now=()=>performance.now(),onChange=()=>{},safeMode=false}={}){
 let phase=safeMode?'safe':'ready',lost=false,lowPower=safeMode,lastLoss=-Infinity,deadline=0,losses=0;
 const events=[];
 function record(type){events.push({type,at:Math.round(now()),phase});if(events.length>40)events.shift();}
 function set(next,type){phase=next;record(type);onChange(phase);}
 return {
  get phase(){return phase;},get lowPower(){return lowPower;},get drawable(){return !lost&&['ready','recovering','safe'].includes(phase);},
  lost(){const t=now(),repeat=t-lastLoss<REPEAT_LOSS_MS;lastLoss=t;losses++;lost=true;lowPower=true;deadline=t+RECOVERY_WAIT_MS;set(phase==='manual'||repeat?'manual':'waiting','context-lost');},
  restored(){lost=false;if(phase==='waiting'&&now()<deadline)set('recovering','context-restored');else if(phase!=='ready'&&phase!=='safe')set('manual','late-restoration');},
  tick(){if(phase==='waiting'&&now()>=deadline)set('manual','timeout');},
  rendered(){if(phase==='recovering')set('safe','first-frame');},
  failed(){lowPower=true;set('manual','render-failed');},
  retry(){if(lost||phase!=='manual')return false;set('recovering','manual-retry');return true;},
  state:()=>({phase,lowPower,contextLost:lost,losses,events:events.map(e=>({...e}))})
 };
}
