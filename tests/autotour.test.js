import test from 'node:test';
import assert from 'node:assert/strict';
import {tourCues,cueAt,stopSeconds,INTRO_SECONDS,MIN_STOP,MAX_STOP,clock} from '../dist/autotour.js';
import {STATIONS} from '../dist/journey.js';

test('一分鐘看完旅程：開場後依序經過七站，字幕用各站原本的說明，總長約一分鐘',()=>{
 const {cues,total}=tourCues(STATIONS,{intro:'開場'});
 assert.deepEqual(cues.map(c=>c.id),[null,...STATIONS.map(s=>s.id)]);
 STATIONS.forEach((s,i)=>assert.equal(cues[i+1].caption,s.lead,'字幕沿用該站說明，不另寫內容'));
 assert.equal(cues[0].dur,INTRO_SECONDS);for(const c of cues.slice(1))assert.ok(c.dur>=MIN_STOP&&c.dur<=MAX_STOP);
 for(let i=1;i<cues.length;i++)assert.equal(cues[i].from,cues[i-1].to,'一段接一段，沒有空檔');
 assert.ok(total>=45&&total<=75,`總長 ${total} 秒`);
 assert.ok(stopSeconds('短')<stopSeconds('長'.repeat(80)),'說明越長停越久');
});
test('依時間找到正在播的那一段；播完停在最後一段',()=>{
 const {cues,total}=tourCues(STATIONS);assert.equal(cueAt(cues,0),0);assert.equal(cueAt(cues,cues[3].from+.1),3);assert.equal(cueAt(cues,total+5),cues.length-1);
 assert.equal(clock(7.9),'07');assert.equal(clock(65),'65');
});
