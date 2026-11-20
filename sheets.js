import {sheetGesture} from './layout.js';
// Bottom sheets on phones: drag the handle up to expand, down to shrink. A peekable sheet (the index) shrinks to a
// slim bar instead of closing; the detail card closes. The size button is the keyboard / no-drag alternative.
export function bindSheet(element,handle,toggle,{onChange=()=>{},onClose=()=>{},peekable=false}={}){
 const mobile=matchMedia('(max-width:720px)');let start=null,lastDrag=-Infinity;
 function state(){return element.classList.contains('sheet-full')?'full':element.classList.contains('sheet-peek')?'peek':'half';}
 function set(next){element.classList.toggle('sheet-full',next==='full');element.classList.toggle('sheet-peek',next==='peek');for(const button of [handle,toggle])button.setAttribute('aria-expanded',String(next==='full'));toggle.textContent=next==='full'?'收合':'展開';onChange(next);}
 function click(e){if(e.detail&&performance.now()-lastDrag<500)return;set(state()==='full'?'half':'full');}
 handle.addEventListener('click',click);toggle.addEventListener('click',click);
 handle.addEventListener('pointerdown',e=>{if(!mobile.matches||e.button!==0||!e.isPrimary)return;start={id:e.pointerId,y:e.clientY};handle.setPointerCapture(e.pointerId);});
 handle.addEventListener('pointerup',e=>{if(!start||start.id!==e.pointerId)return;const current=state(),action=sheetGesture(current==='full',e.clientY-start.y);start=null;if(!action)return;lastDrag=performance.now();
  if(action==='full')set(current==='peek'?'half':'full');else if(action==='peek')set('half');else if(peekable)set('peek');else onClose();});
 handle.addEventListener('pointercancel',()=>{start=null;});handle.addEventListener('lostpointercapture',()=>{start=null;});
 set('half');
 return {set,state,setFull:full=>set(full?'full':'half')};
}
