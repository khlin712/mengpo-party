import test from 'node:test';
import assert from 'node:assert/strict';
import {VIDEOS,videoSource} from '../dist/journey.js';

test('課堂影片沒有資料時不顯示播放器（卡片顯示待老師提供）',()=>{for(const k of Object.keys(VIDEOS)){const v=VIDEOS[k];if(!v.driveId&&!v.hd&&!v.sd)assert.equal(videoSource(k),null);}assert.equal(videoSource('nope'),null);});
test('只接受 Drive 檔案 ID 或 https 的 mp4；高畫質放前面，低畫質當備用',()=>{const saved={...VIDEOS.trial};
 try{Object.assign(VIDEOS.trial,{driveId:'',hd:'https://example.com/a.mp4',sd:'https://example.com/b.mp4?x=1'});assert.deepEqual(videoSource('trial').files,['https://example.com/a.mp4','https://example.com/b.mp4?x=1']);
  Object.assign(VIDEOS.trial,{hd:'http://example.com/a.mp4',sd:'javascript:alert(1)'});assert.equal(videoSource('trial'),null,'不接受 http 或其他網址');
  Object.assign(VIDEOS.trial,{hd:'',sd:'',driveId:'1Dm7ROkMDJCHvWmUANFYB5VdzL1mi8RCD'});const d=videoSource('trial');assert.equal(d.kind,'drive');assert.match(d.preview,/^https:\/\/drive\.google\.com\/file\/d\/[-\w]+\/preview$/);
  VIDEOS.trial.driveId='"><script>';assert.equal(videoSource('trial'),null,'ID 格式不對就不用');
 }finally{Object.assign(VIDEOS.trial,saved);}});
