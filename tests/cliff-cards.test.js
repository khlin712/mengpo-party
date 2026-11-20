import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {STATIONS} from '../dist/journey.js';import * as THREE from '../dist/vendor/three.module.min.js';import {createRoute} from '../dist/route3d.js';import {nodes,TRAIL,trailPath,bridgePath,SUMMIT} from '../dist/summit.js';import {topics} from '../dist/content.js';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),fork=STATIONS.find(s=>s.id==='fork');
test('兩座懸崖開不同說明並聚焦各自位置；返回指引牌與山壁仍可用',()=>{
 let html,focused;const element={scrollTop:0,setAttribute(){},focus(){}};const context=vm.createContext({STATIONS,stationOf:id=>STATIONS.find(s=>s.id===id),openCastCard:(...args)=>{html=args[2];},world:{stationSelect(){},climb(){},focusStation:id=>{focused=id;}},insets:()=>({}),cardTourUI(){},$:()=>element,document:{querySelectorAll:()=>[]}});
 vm.runInContext(source.slice(source.indexOf('const escape='),source.indexOf('\n',source.indexOf('const escape=')))+source.slice(source.indexOf('function contactLink('),source.indexOf("$('#avatar-button').onclick=")),context);
 for(const path of fork.paths){vm.runInContext(`openStation('fork',{path:'${path.id}'})`,context);assert.equal(focused,path.stop);assert.ok(html.includes(`<h2 id="detail-title">${path.title||path.name}</h2>`));assert.ok(html.includes(path.caption));if(path.body)assert.ok(html.includes(path.body));assert.ok(html.includes('data-goto-station="fork"'));}
 vm.runInContext("openStation('fork')",context);assert.equal(focused,'fork');assert.ok(html.includes(fork.title));for(const path of fork.paths)assert.ok(html.includes(`data-path="${path.id}"`));
 vm.runInContext("openStation('fork',{path:'cliff2',camera:false})",context);assert.equal(focused,'fork','導覽抵達不能另啟鏡頭');
});
test('三段棧道分別指向第一懸崖、第二懸崖及山壁',()=>{
 const centers=nodes(topics),r=createRoute({scene:new THREE.Scene(),centers,walkways:[],bridge:bridgePath(),trail:TRAIL.map(([a,b,o])=>trailPath(centers.get(a),centers.get(b),.2,o)),trophyAt:centers.get(SUMMIT),reduced:{matches:true}});
 assert.deepEqual(r.pickables.filter(x=>x.name==='wrong-route-deck').map(x=>x.userData.path),fork.paths.map(p=>p.id));assert.deepEqual(fork.paths.map(p=>p.stop),['pass1','pass2','wallfoot']);
});
