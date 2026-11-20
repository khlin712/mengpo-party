import test from 'node:test';
import assert from 'node:assert/strict';
import {FEEDBACK,publicFeedback,feedbackSignature} from '../dist/journey.js';
import {pickLetter,loadRead,saveRead,READ_KEY} from '../dist/letters.js';

test('只有學生同意公開、而且有內容的回饋才會出現（紙飛機與第④站共用）',()=>{
 const list=[{text:'原話一',school:'景美女中',name:'黃同學',consent:true},{text:'沒同意',school:'某校',name:'林同學'},{text:'  ',school:'板橋高中',name:'鄭同學',consent:true},{text:'原話二',school:'板橋高中',name:'鄭同學',consent:true}];
 assert.deepEqual(publicFeedback(list).map(f=>f.text),['原話一','原話二']);
 assert.equal(feedbackSignature(list[0]),'景美女中 黃同學','署名是學校＋姓氏同學');
 assert.equal(feedbackSignature({who:'舊格式'}),'舊格式');
 assert.ok(publicFeedback(FEEDBACK).every(f=>f.consent===true),'公開資料都必須標記同意');});

test('每次打開挑一封還沒讀過的信；全讀過後才重複，且不連續同一封',()=>{
 const read=new Set();const seen=new Set();let last=-1;
 for(let i=0;i<10;i++){const k=pickLetter(10,read,Math.random,last);assert.ok(!read.has(k),'先挑沒讀過的');read.add(k);seen.add(k);last=k;}
 assert.equal(seen.size,10,'十封都會輪到');
 for(let i=0;i<20;i++){const k=pickLetter(10,read,Math.random,last);assert.notEqual(k,last);last=k;}
 assert.equal(pickLetter(0,new Set()),-1,'沒有回饋時不挑');assert.equal(pickLetter(1,new Set([0]),Math.random,0),0,'只有一封時仍能打開');});

test('讀過的記錄只存在瀏覽器本機；儲存被封鎖時也不會出錯',()=>{
 const mem={};const st={getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=v;}};saveRead(new Set([1,3]),st);assert.deepEqual([...loadRead(st)],[1,3]);assert.ok(READ_KEY in mem);
 const broken={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};assert.equal(loadRead(broken).size,0);saveRead(new Set([1]),broken);
 assert.equal(loadRead({getItem:()=>'not json'}).size,0);});
