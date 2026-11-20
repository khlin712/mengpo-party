import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {CONTACTS,isLink} from '../dist/journey.js';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function card(contacts=CONTACTS){const ctx=vm.createContext({CONTACTS:contacts,isLink,pending:()=>'<p>待提供</p>'});vm.runInContext(source.slice(source.indexOf('const escape='),source.indexOf('\n',source.indexOf('const escape=')))+source.slice(source.indexOf('function contactLink('),source.indexOf('function openStation(')),ctx);return ctx;}
test('服務台只有 LINE：網址待提供時不產生假連結，有網址才出現外連',()=>{
 const ctx=card([{label:'LINE',value:'私訊 LINE 官方帳號',href:'https://lin.ee/example'}]),html=vm.runInContext("stationBody({id:'contact'})",ctx);assert.equal((html.match(/class="contact-link /g)||[]).length,1);assert.ok(html.includes('href="https://lin.ee/example"'));assert.match(html,/aria-label="用 LINE 問老師，在新視窗開啟"/);assert.doesNotMatch(html,/0kh127|Classroom|Facebook|Instagram|Threads/);
 const empty=vm.runInContext("stationBody({id:'contact'})",card(CONTACTS));assert.doesNotMatch(empty,/<a /,'官方帳號網址未提供時不產生假連結');
 assert.doesNotMatch(vm.runInContext("contactLink({href:'javascript:alert(1)'},'bad','contact-primary')",ctx),/<a /);
 const escaped=vm.runInContext(`contactLink({label:'<img>',href:'https://example.com/?q="'},'ok','contact-primary')`,ctx);assert.match(escaped,/&lt;img&gt;/);assert.match(escaped,/&quot;/);
});
