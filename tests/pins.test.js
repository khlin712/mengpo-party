import test from 'node:test';
import assert from 'node:assert/strict';
import {pinSpots} from '../dist/layout.js';
import {topics} from '../dist/content.js';
test('超過三個重點時，圖釘沿島的後半圈分散、高度錯開，彼此不擠在一起',()=>{for(const n of [4,5,6]){const s=pinSpots(n);assert.equal(s.length,n);
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const d=Math.hypot(s[i].x-s[j].x,s[i].z-s[j].z)+Math.abs(s[i].lift-s[j].lift);assert.ok(d>.45,`${n} 個重點時第 ${i+1}、${j+1} 個太近（${d.toFixed(2)}）`);}
 for(const p of s){assert.ok(Math.hypot(p.x,p.z)<1.2&&p.z<.1&&p.lift>1);}}
 assert.ok(topics.some(t=>t.steps.length>3),'有重點超過三個的島');});
