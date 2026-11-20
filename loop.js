// 02 教學理念與上課方式：the writing loop. A ring path round the classroom with five small stations in the order the teacher
// teaches: make the materials → watch the lesson → write → send online → marked and sent back — then the student improves the
// next piece and goes round again. The model (architecture.js) and the sheet of paper that travels round it (world.js) share
// this geometry and timing. Nothing here is a score or a promise: the red marks only show that corrections get fewer.
export const LOOP={cx:0,cz:0,rx:.8,rz:.68,y:.25,half:.075};
const RAD=Math.PI/180;
// Stations in travel order. phi is the angle on the ring (0° east, 90° the front edge that faces the camera, 180° west); the
// sheet travels with phi decreasing, so along the front it goes left → right. `label` is what the card says.
export const LOOP_STATIONS=[
 {id:'material',label:'來到茶會',phi:172},
 {id:'lesson',label:'植物能量',phi:135},
 {id:'write',label:'清醒入境',phi:98},
 {id:'send',label:'看見卡點',phi:48},
 {id:'grade',label:'回到生活',phi:-12}];
// After the last station the sheet goes back to the start: the student improves the next piece (stage 5 on the card).
export const REVISE_STAGE=5;
export const loopPoint=phi=>({x:LOOP.cx+LOOP.rx*Math.cos(phi*RAD),z:LOOP.cz+LOOP.rz*Math.sin(phi*RAD)});
// Unit direction of travel at phi (travel = phi decreasing).
export function loopDirection(phi){const dx=LOOP.rx*Math.sin(phi*RAD),dz=-LOOP.rz*Math.cos(phi*RAD),n=Math.hypot(dx,dz)||1;return {x:dx/n,z:dz/n};}
// Position along one lap, u in [0,1): u=0 is the first station and the sheet goes right round to u=1.
export const phiAt=u=>LOOP_STATIONS[0].phi-360*u;
export const stationU=i=>(LOOP_STATIONS[0].phi-LOOP_STATIONS[i].phi)/360;

// Timing of one lap: a short rest at every station, and the same walking pace between them (the way back to the start is the
// longest stretch).
export const DWELL=.8,PACE=.0909;
const U=LOOP_STATIONS.map((_,i)=>stationU(i));
const SEGMENTS=(()=>{const out=[];let t=0;for(let i=0;i<LOOP_STATIONS.length;i++){const next=i+1<LOOP_STATIONS.length?U[i+1]:1,move=(next-U[i])/PACE;out.push({i,rest:[t,t+DWELL],move:[t+DWELL,t+DWELL+move],from:U[i],to:next});t+=DWELL+move;}return {list:out,lap:t};})();
export const LAP_SECONDS=SEGMENTS.lap;
// Where the sheet is t seconds after the start: its place on the ring, the card stage it belongs to (0–4 a station, 5 improving
// for the next piece), the lap number, and how many red correction marks it carries (fewer each lap; none before it is marked).
export function loopProgress(t){
 const lap=Math.floor(Math.max(0,t)/LAP_SECONDS),s=Math.max(0,t)-lap*LAP_SECONDS;
 for(const seg of SEGMENTS.list){
  if(s<seg.rest[1])return {u:seg.from,stage:seg.i,lap,resting:true,marks:marksFor(seg.i,lap,true)};
  if(s<seg.move[1]){const k=(s-seg.move[0])/(seg.move[1]-seg.move[0]),ease=k*k*(3-2*k),last=seg.i===LOOP_STATIONS.length-1;
   return {u:seg.from+(seg.to-seg.from)*ease,stage:last?REVISE_STAGE:seg.i+1,lap,resting:false,marks:marksFor(last?REVISE_STAGE:seg.i+1,lap,false)};}
 }
 return {u:0,stage:0,lap,resting:true,marks:marksFor(0,lap,true)};
}
// The sheet is marked at the grading station and carries those marks back round to the lesson; it is a clean draft again when it
// reaches the writing station. Each lap there are fewer marks (3, 2, 1, 1, then it starts again) — corrections shrinking, never a score.
const given=lap=>Math.max(1,3-lap%4);
// (While the sheet is still on its way to the grading station it has not been marked yet.)
export function marksFor(stage,lap,resting=true){if(stage===LOOP_STATIONS.length-1)return resting?given(lap):0;if(stage===REVISE_STAGE)return given(lap);if((stage===0||stage===1)&&lap>0)return given(lap-1);return 0;}
