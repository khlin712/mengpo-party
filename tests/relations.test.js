import test from 'node:test';
import assert from 'node:assert/strict';
import {topics} from '../dist/content.js';
import {buildRelations,findRelations,relationKey} from '../dist/relations.js';
test('每條關聯對應既有主題連結，雙向只產生一條且沒有孤立端點',()=>{const links=buildRelations(topics),seen=new Set();assert.equal(links.length,6);for(const r of links){assert.ok(!seen.has(r.id));seen.add(r.id);const a=topics.find(t=>t.id===r.a),b=topics.find(t=>t.id===r.b);assert.ok(a&&b);assert.ok(a.links.includes(b.id)||b.links.includes(a.id));assert.equal(r.id,relationKey(r.b,r.a));assert.ok(r.question.endsWith('？'));}});
test('搜尋關聯涵蓋端點名稱與探索問題，未知連結不建立',()=>{const links=buildRelations(topics);assert.ok(findRelations(links,topics,'植物能量').every(r=>[r.a,r.b].includes('teaching')));assert.ok(findRelations(links,topics,'回饋').length>0);assert.equal(findRelations(links,topics,'不存在的主題xyz').length,0);assert.deepEqual(buildRelations([{id:'a',title:'A',links:['missing','a']}]),[]);});

test('大量探索問題仍完整還原並保留在討論提綱',async()=>{const {readStored,makeOutline}=await import('../dist/content.js');const questions=[...buildRelations(topics).map(r=>r.question),...topics.map(t=>t.question),...topics[0].steps];assert.ok(questions.length>10);const stored=readStored(JSON.stringify({questions}));const outline=makeOutline('家長',[],'',{},stored.questions);for(const question of questions)assert.ok(outline.includes(question));});
