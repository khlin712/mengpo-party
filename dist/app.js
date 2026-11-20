import {createWorld} from './world.js';
import {topics,findTopics,makeOutline,explorationRoute,readStored,entryRoutes,concerns,concernsFor,introSteps,INTRO_KEY,stepParts,CIRCLED} from './content.js';
import {buildRelations,findRelations} from './relations.js';
import {SUMMIT,SPAWN_FROM} from './summit.js';
import {STATIONS,FEEDBACK,CLASSES,LINKS,CONTACTS,PRICING,isLink,DOCUMENTS,documentURLs,videoSource,publicFeedback,feedbackSignature} from './journey.js';
import {pickLetter,loadRead,saveRead} from './letters.js';
import {mapInsets} from './motion.js';
import {tourCues,cueAt,clock} from './autotour.js';
import {bindSheet} from './sheets.js';
import {AVATAR_KEY,AVATAR_ROLES,SHIRTS,STUDENTS,GUIDE_ROUTE,readAvatar} from './walkers.js';
import {HAIR_STYLES} from './people.js';
const $=s=>document.querySelector(s), list=$('#topic-list'), modal=$('#modal');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const phone=matchMedia('(max-width:720px)'), isPhone=()=>phone.matches;
let selected=null,category='全部',world,showConnections=true,previousFocus=null,entry=null,selectedConcern=null,detailOpener=null,view='concerns',indexBeforeDetail=null,selectedStep=null,hotStep=-1,activeRelation=null;
let stored={};try{stored=readStored(localStorage.getItem('mengpo-island-course'));}catch{}
let consultQuestions=Array.isArray(stored.questions)?stored.questions.filter(q=>typeof q==='string'&&q.trim()):[];
let saved=new Set(Array.isArray(stored.saved)?stored.saved.filter(id=>topics.some(t=>t.id===id)):[]);
let answers=stored.answers&&typeof stored.answers==='object'&&!Array.isArray(stored.answers)?stored.answers:{};
let role=['愛情／夫妻','親子關係','其他'].includes(stored.role)?stored.role:'其他',note=typeof stored.note==='string'?stored.note:'';
function persist(){try{localStorage.setItem('mengpo-island-course',JSON.stringify({saved:[...saved],answers,role,note,questions:consultQuestions}));}catch{toast('瀏覽器無法儲存；本次操作仍可繼續，請先複製提綱。');}}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
const relations=buildRelations(topics);
const topicOf=id=>topics.find(t=>t.id===id);
const stationOf=id=>STATIONS.find(s=>s.id===id);
// A place my character can go: a topic island or a journey stop.
const placeOf=id=>topicOf(id)||(s=>s&&{id,n:s.n,title:s.short})(stationOf(id));
const AVATAR_STOPS=['start','calendar','signup','contact'];
const stepLabel=s=>stepParts(s).label;
const stepItems=t=>t.steps.map((s,k)=>({mark:CIRCLED[k]||k+1,...stepParts(s)}));
// Pins on the island, rows in the card and rows in the index light up together.
function hoverStep(k,on){hotStep=on?k:-1;world?.pinState({hot:hotStep,sel:selectedStep??-1});for(const el of document.querySelectorAll('[data-step]'))el.classList.toggle('hot',on&&+el.dataset.step===k&&(!el.dataset.topic||el.dataset.topic===selected));}
function bindStepRows(root,id){for(const el of root.querySelectorAll('[data-step]')){const k=+el.dataset.step;el.onclick=()=>selectStep(el.dataset.topic||id,k);el.onpointerenter=e=>{if(e.pointerType==='mouse')hoverStep(k,true);};el.onpointerleave=e=>{if(e.pointerType==='mouse')hoverStep(k,false);};el.onfocus=()=>hoverStep(k,true);el.onblur=()=>hoverStep(k,false);}}

// ---- Map framing: keep the subject in the part of the map that floating panels leave open. ----
function visible(el){return el&&!el.hidden&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';}
function insets(){
 const map=$('#map').getBoundingClientRect(),rects=[];
 // Phones stack the actions in a narrow right-hand column; it hides the right edge, not a top strip.
 const top=[...document.querySelectorAll(isPhone()?'.brand-card,.map-tools':'.brand-card,.map-tools,.top-actions')].filter(visible).map(el=>el.getBoundingClientRect().bottom);
 if(isPhone())rects.push($('.top-actions').getBoundingClientRect());
 if(top.length)rects.push({left:map.left,right:map.right,top:map.top,bottom:Math.max(...top)+8});
 const caption=$('.map-caption');if(visible(caption))rects.push({left:map.left,right:map.right,top:caption.getBoundingClientRect().top-8,bottom:map.bottom});
 if(!$('#detail').hidden)rects.push($('#detail').getBoundingClientRect());
 const autoBar=$('#autotour-bar');if(visible(autoBar))rects.push({left:map.left,right:map.right,top:autoBar.getBoundingClientRect().top-8,bottom:map.bottom});
 const index=$('#index-panel');if(visible(index))rects.push(index.getBoundingClientRect());
 return mapInsets(map,rects);
}
let refitTimer;
function refitView(){clearTimeout(refitTimer);if(world?.flying()){refitTimer=setTimeout(refitView,100);return;}world?.refit(insets());}

// ---- Index: common questions and topic islands, like a book index beside the map. ----
function showView(next,{focusTab=false}={}){view=next;for(const [name,tab]of [['concerns',$('#tab-concerns')],['topics',$('#tab-topics')],['relations',$('#tab-relations')]]){tab.classList.toggle('active',name===next);tab.setAttribute('aria-pressed',name===next);}$('#concerns-view').hidden=next!=='concerns';$('#topics-view').hidden=next!=='topics';$('#relations-view').hidden=next!=='relations';if(next==='relations'){renderRelations();world?.filter(topics.map(t=>t.id));}else renderList();if(focusTab)$('#tab-'+next).focus();}
$('#tab-concerns').onclick=()=>showView('concerns');$('#tab-topics').onclick=()=>showView('topics');$('#tab-relations').onclick=()=>showView('relations');
function renderList(){const visibleTopics=findTopics($('#search').value,category);
 list.innerHTML=visibleTopics.length?visibleTopics.map(t=>{const active=t.id===selected;return `<div class="topic-item${active?' active':''}"><button class="topic-row${active?' active':''}" data-id="${t.id}" aria-pressed="${active}"><span class="num">${t.n}</span><span class="topic-name"><strong>${t.title}</strong><small>${t.tag}${saved.has(t.id)?' · 已收藏':''}</small></span><span class="count" aria-label="${t.steps.length} 個了解重點">${t.steps.length} ↗</span></button>${active?`<ol class="topic-steps" aria-label="${t.title}的了解重點">${stepItems(t).map((it,k)=>`<li><button class="step-link${k===selectedStep?' current':''}" data-topic="${t.id}" data-step="${k}" aria-current="${k===selectedStep}"><span class="pin-no">${it.mark}</span>${it.label}</button></li>`).join('')}</ol>`:''}</div>`;}).join(''):'<p class="empty">沒有找到符合的主題。試試「收費」、「成果」或清除搜尋。</p>';
 $('#result-count').textContent=`${visibleTopics.length} 座主題島`;$('#topic-count').textContent=visibleTopics.length;
 if(view!=='relations'&&!activeRelation)world?.filter(visibleTopics.map(t=>t.id));bindStepRows(list,selected);}
list.addEventListener('click',e=>{const row=e.target.closest('.topic-row[data-id]');if(row)selectTopic(row.dataset.id);});
function renderConcerns(){const items=concernsFor(entry);$('#concerns-list').innerHTML=items.map(c=>`<button data-concern="${c.id}" aria-pressed="${c.id===selectedConcern?.id&&!$('#detail').hidden}"><span class="q-mark" aria-hidden="true">Q</span><span>${c.question}</span><span class="arrow" aria-hidden="true">↗</span></button>`).join('');$('#concern-count').textContent=items.length;$('#entry-note').textContent=entry?entryRoutes[entry].intro:'選一個問題，看看相關做法與待確認資訊。';world?.emphasize(entry?entryRoutes[entry].topics:[]);}
$('#concerns-list').onclick=e=>{const b=e.target.closest('[data-concern]');if(!b)return;const c=concerns.find(c=>c.id===b.dataset.concern);selectTopic(c.topic,{concern:c.id});};
for(const button of document.querySelectorAll('[data-entry]'))button.onclick=()=>{entry=button.dataset.entry;if(entryRoutes[entry].role){role=entryRoutes[entry].role;persist();}for(const b of document.querySelectorAll('[data-entry]'))b.setAttribute('aria-pressed',b===button);showView('concerns');renderConcerns();if(entry==='teacher')selectTopic('teacher');else if(!$('#detail').hidden)closeDetail({restoreFocus:false});};
$('#search').oninput=()=>{if(view==='relations')renderRelations();else{if($('#search').value.trim())showView('topics');renderList();}};
for(const b of document.querySelectorAll('[data-category]'))b.onclick=()=>{category=b.dataset.category;for(const el of document.querySelectorAll('[data-category]')){el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',el===b);}renderList();};

function renderRelations(){const items=findRelations(relations,topics,$('#search').value);$('#relation-count').textContent=items.length;$('#relation-list').innerHTML=items.length?items.map(r=>`<button class="relation-row" aria-pressed="${activeRelation===r.id}" data-relation="${r.id}"><span class="relation-route">${topicOf(r.a).n} ↔ ${topicOf(r.b).n}</span><strong>${topicOf(r.a).title} · ${topicOf(r.b).title}</strong><span>${r.question}</span></button>`).join(''):'<p class="empty">沒有找到關聯，試試主題名稱或清除搜尋。</p>';for(const button of $('#relation-list').querySelectorAll('[data-relation]')){button.onclick=()=>openRelation(button.dataset.relation);button.onpointerenter=()=>world?.hoverRelation(button.dataset.relation);button.onpointerleave=()=>world?.hoverRelation(null);button.onfocus=()=>world?.hoverRelation(button.dataset.relation);button.onblur=()=>world?.hoverRelation(null);}}
function openRelation(id){const r=relations.find(r=>r.id===id);if(!r)return;castCard=null;world?.walkerSelect(null);
 const opener=document.activeElement;if(!$('#detail').hidden)closeDetail({restoreFocus:false});
 activeRelation=id;selected=null;selectedStep=null;world?.pins(null);world?.climb(false);setBird(false);
 $('#detail-crumb').textContent=`主題關聯 · ${topicOf(r.a).n} ↔ ${topicOf(r.b).n}`;
 $('#detail-content').innerHTML=`<div class="detail-head"><span class="detail-badge" aria-hidden="true">↔</span><div><p class="eyebrow">一起了解這兩個主題</p><h2 id="detail-title">${r.question}</h2></div></div><p class="relation-notice">這是依現有主題整理的探索問題，不是已確認的做法或成效。</p><div class="relation-stops">${[r.a,r.b].map(tid=>{const t=topicOf(tid);return `<button data-relation-topic="${tid}"><b>${t.n}</b><span><strong>${t.title}</strong><small>${t.intro}</small></span><i aria-hidden="true">↗</i></button>`;}).join('')}</div><section class="card-section"><h3>帶著問題繼續探索</h3><p class="pending-note">老師的具體說明與案例尚待補充。可以分別查看兩個主題，再把這個問題帶進討論。</p></section><div class="detail-actions"><button id="relation-question" class="ask-topic">${consultQuestions.includes(r.question)?'已加入提問 ✓':'把這個關聯問題加入提問'}</button><button id="relation-return" class="save-topic">返回關聯清單</button><small>只會整理提綱，不會寄送訊息。</small></div>`;
 $('#detail').hidden=false;document.body.classList.add('detail-open');if(isPhone()){indexBeforeDetail=indexSheet.state();indexSheet.set('peek');}
 showView('relations');detailOpener=opener?.isConnected?opener:$('#tab-relations');world?.filter(topics.map(t=>t.id));world?.relation(id);
 if(!showConnections){showConnections=true;$('#connection').setAttribute('aria-pressed','true');world?.connections(true);}
 world?.focusRelation(id,insets());$('#map-message').textContent=`正在探索 ${topicOf(r.a).title}與${topicOf(r.b).title}的關聯`;
 for(const button of $('#detail').querySelectorAll('[data-relation-topic]'))button.onclick=()=>selectTopic(button.dataset.relationTopic);
 $('#relation-question').onclick=()=>{if(!consultQuestions.includes(r.question))consultQuestions.push(r.question);saved.add(r.a);saved.add(r.b);persist();updateCount();toast('已加入討論清單，尚未寄送');$('#relation-question').textContent='已加入提問 ✓';};
 $('#relation-return').onclick=()=>{closeDetail({restoreFocus:false});showView('relations');if(isPhone())indexSheet.set('half');const row=[...$('#relation-list').querySelectorAll('[data-relation]')].find(el=>el.dataset.relation===id);(row||$('#tab-relations')).focus();};
 $('#detail').scrollTop=0;$('#close-detail').focus();
}

// ---- Detail card: floats on the left of the map on desktop, a bottom sheet on phones. ----
const audienceLabel={couple:'關心：愛情／夫妻',family:'關心：親子關係',life:'關心：人生方向'};
function selectTopic(id,{focus=true,concern=null,camera=true}={}){autoTourStop({quiet:true});
 const t=topicOf(id);if(!t)return;activeRelation=null;if(castCard){castCard=null;world?.walkerSelect(null);if(placingAvatar)setPlacing(false);}
 if(!findTopics($('#search').value,category).some(t=>t.id===id)){$('#search').value='';category='全部';for(const b of document.querySelectorAll('[data-category]')){const active=b.dataset.category===category;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);}}
 const moveCamera=id!==selected||$('#detail').hidden;if(focus&&!$('#detail').contains(document.activeElement))detailOpener=document.activeElement;selected=id;selectedConcern=concerns.find(c=>c.id===concern)||null;
 const related=[...new Set([...(selectedConcern?.related||[]),...t.links])];
 $('#detail-crumb').textContent=`主題 ${t.n} · ${t.title}${selectedConcern?' · 常見問題':''}`;
 $('#detail-content').innerHTML=`<div class="detail-head"><span class="detail-badge" style="--badge:${t.color}" aria-hidden="true">${t.n}</span><div><p class="eyebrow">${t.title} · ${t.tag}</p><h2 id="detail-title">${selectedConcern?selectedConcern.question:t.title}</h2></div></div>
 <div class="chips"><span class="chip strong">主題 ${t.n}</span><span class="chip">${t.tag}</span>${selectedConcern?`<span class="chip">${audienceLabel[selectedConcern.audience]}</span>`:''}<span class="chip draft">待老師補充</span></div>
 <div class="answer-first"><p class="lead">${selectedConcern?selectedConcern.answer:t.intro}</p></div>
${id===SUMMIT?routeSection():''}
${t.flow?flowSection(t.flow):''}
 <section class="card-section"><h3>重點 · 點一項看細節</h3><ol class="step-rows">${stepItems(t).map((it,k)=>`<li><button class="step-row" data-step="${k}"><b>${it.mark}</b><span><strong>${it.label}</strong><small>${it.question}</small></span><i aria-hidden="true">›</i></button></li>`).join('')}</ol></section>
 <details class="card-section evidence-section"><summary>目前資訊與證據 <span>待補充</span></summary><p>${t.body}</p><dl class="topic-facts">${t.facts.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl></details>
 <details class="card-section question-notes" ${answers[id]?'open':''}><summary>補充你的情況 <span>選填</span></summary><div class="exercise"><label for="exercise-answer">${t.task}</label><textarea id="exercise-answer" maxlength="2000" placeholder="寫下你的顧慮、期待，或還想了解的事…">${escape(typeof answers[id]==='string'?answers[id]:'')}</textarea><small class="helper">只儲存在這個瀏覽器，不會傳送。</small><p class="question-example">${t.example}</p></div></details>
 <section class="card-section"><h3>和這些主題一起看</h3><button class="text-button" id="explore-relations">為什麼這些主題有關聯？ ↗</button><div class="related">${related.map(rid=>{const r=topicOf(rid);return `<button data-related="${rid}"><b>${r.n}</b><span>→ ${r.title}</span><i aria-hidden="true">↗</i></button>`;}).join('')}</div></section>
 <div class="detail-actions"><button class="ask-topic" id="ask-topic">就這件事問老師 ↗</button><button class="save-topic" id="save-topic" aria-pressed="${saved.has(id)}">${saved.has(id)?'✓ 已收藏這個主題':'＋ 先收藏，晚點再聊'}</button><small>先整理諮詢提綱，不會直接送出訊息。</small></div>`;
 const wasHidden=$('#detail').hidden;$('#detail').hidden=false;document.body.classList.add('detail-open');
 if(wasHidden&&isPhone()){indexBeforeDetail=indexSheet.state();indexSheet.set('peek');}
 if(!selectedConcern)showView('topics');
 $('#map-message').textContent=`正在探索 ${t.title} · ${t.tag}`;
 $('#exercise-answer').oninput=e=>{answers[id]=e.target.value;persist();};
 $('#save-topic').onclick=()=>{saved.has(id)?saved.delete(id):saved.add(id);persist();updateCount();selectTopic(id,{focus:false,concern:selectedConcern?.id});$('#save-topic').focus();toast(saved.has(id)?'已加入討論清單':'已從討論清單移除');};
 $('#ask-topic').onclick=()=>{saved.add(id);const question=selectedConcern?.question||t.question;if(!consultQuestions.includes(question))consultQuestions.push(question);persist();updateCount();$('#save-topic').setAttribute('aria-pressed','true');$('#save-topic').textContent='✓ 已收藏這個主題';discussion();};
 $('#explore-relations').onclick=()=>{closeDetail({restoreFocus:false});showView('relations');if(isPhone())indexSheet.set('full');$('#tab-relations').focus();};
 for(const b of document.querySelectorAll('[data-related]'))b.onclick=()=>selectTopic(b.dataset.related);
 selectedStep=null;hotStep=-1;bindStepRows($('#detail-content'),id);world?.pins(id,stepItems(t),{onPick:k=>selectStep(id,k),onHover:hoverStep});world?.pinState({});setBird(false);world?.climb(id===SUMMIT);$('#to-journey')?.addEventListener('click',()=>openStation('start'));
 updateMap();renderList();renderConcerns();
 if(moveCamera&&camera)world?.focus(id,insets());
 cardTourUI(id);
 if(!isPhone())document.querySelector('.topic-item.active')?.scrollIntoView({block:'nearest'});
 if(focus){$('#detail').scrollTop=0;$('#close-detail').focus();}
}
function updateMap(){if(activeRelation)world?.relation(activeRelation);else world?.select(selected);world?.connections(showConnections);}
// One key point of an island: what to ask, its status, and a way to carry it into the consultation outline.
function selectStep(id,k){const t=topicOf(id);if(!t)return;const items=stepItems(t),it=items[k];if(!it)return;
 if(selected!==id||$('#detail').hidden)selectTopic(id,{focus:false});
 selectedStep=k;const question=`${it.label}：${it.question}`,asked=consultQuestions.includes(question);
 $('#detail-crumb').textContent=`主題 ${t.n} · ${t.title} › 重點 ${k+1}`;
 $('#detail-content').innerHTML=`<div class="detail-head"><span class="detail-badge" style="--badge:${t.color}" aria-hidden="true">${t.n}</span><div><p class="eyebrow">${t.title} · 了解重點 ${k+1} / ${items.length}</p><h2 id="detail-title"><span class="step-mark">${it.mark}</span>${it.label}</h2></div></div>
 <div class="chips"><span class="chip strong">重點 ${k+1}</span><span class="chip">${t.tag}</span><span class="chip draft">待老師補充</span></div>
 <div class="answer-first"><p class="lead">${it.question||it.label}</p></div>
 <section class="card-section"><h3>老師的說明</h3><p class="pending-note">老師還沒有提供這一點的說明。可以先把這個問題放進諮詢提綱，見面時直接問。</p></section>
 <nav class="step-nav" aria-label="切換了解重點">${k>0?`<button data-step="${k-1}"><small>上一個</small><span>${items[k-1].mark} ${items[k-1].label}</span></button>`:'<span></span>'}${k<items.length-1?`<button data-step="${k+1}" class="next"><small>下一個</small><span>${items[k+1].mark} ${items[k+1].label}</span></button>`:'<span></span>'}</nav>
 <div class="detail-actions"><button class="ask-topic" id="ask-step" aria-pressed="${asked}">${asked?'✓ 已加入提問':'把這個問題加入提問 ↗'}</button><button class="save-topic" id="back-topic">← 回到「${t.title}」</button><small>先整理諮詢提綱，不會直接送出訊息。</small></div>`;
 bindStepRows($('#detail-content .step-nav'),id);
 $('#ask-step').onclick=()=>{if(!consultQuestions.includes(question))consultQuestions.push(question);saved.add(id);persist();updateCount();$('#ask-step').textContent='✓ 已加入提問';$('#ask-step').setAttribute('aria-pressed','true');toast('已加入討論清單的提問');};
 $('#back-topic').onclick=()=>{selectTopic(id);world?.focus(id,insets());};
 hotStep=-1;world?.pinState({sel:k});renderList();$('#map-message').textContent=`正在看 ${t.title} · 重點 ${k+1}`;
 world?.focusStep(id,k,items.length,insets());$('#detail').scrollTop=0;$('#detail-title').setAttribute('tabindex','-1');$('#detail-title').focus({preventScroll:true});}
// ---- The way to the results summit: silver then gold stairs from 03, the trophy, then on to the university. ----
// 02: the teacher's way of teaching, in their words. The step the travelling sheet is at on the island is lit here (see loop.js).
function flowSection(f){const rows=f.steps.map(([label,said],k)=>`<li class="loop-step" data-stage="${k}"><b>${CIRCLED[k]||k+1}</b><span><strong>${escape(label)}</strong><small>${escape(said)}</small></span></li>`).join('');
 return `<section class="card-section loop-section"><h3>${escape(f.title)} · 看島上的小紙卡繞一圈</h3><p class="loop-intro">${escape(f.intro)}</p><ol class="loop-steps" aria-label="茶會示意流程">${rows}<li class="loop-step loop-revise" data-stage="${f.steps.length}"><b>↺</b><span><strong>${escape(f.revise[0])}</strong><small>${escape(f.revise[1])}，再回到「${escape(f.steps[2][0])}」</small></span></li></ol>
 <p class="loop-always"><i aria-hidden="true"></i><span>${escape(f.always)}</span></p><p class="helper">${escape(f.note)}</p></section>`;}
setInterval(()=>{const list=document.querySelectorAll('.loop-step');if(!list.length||!world)return;const k=world.loopStage();for(const li of list)li.classList.toggle('on',Number(li.dataset.stage)===k);},300);
function routeSection(){return `<section class="card-section stairs-section"><h3>從崎嶇島走一圈</h3><p class="stairs-note">旅程從「① 崎嶇島」出發：人生卡在迴圈裡，不知道自己發生了什麼事。到了「② 橋頭」，左邊是中央河上的「③ 奈何橋」，走過橋，象徵參加活動；右邊是崎嶇的山路，路上有崖邊會有人掉下去，陡峭山壁雖然爬得到頂，但很慢、還可能掉下來，也有人半路回頭改走橋。點摩天輪或橋，橋會由下而上一階一階亮起。走過橋是繽紛的遊樂園，再到「④ 客戶回饋」的回饋島後，有的人走進門裡消失，再從「${escape(placeOf(SPAWN_FROM)?.title||'')}」重新出發；有的不進門，繼續往活動場次、LINE 報名、服務台走，最後回到崎嶇島。遊樂園是「參加後的繽紛世界」的象徵；回饋島是客戶回饋的所在，兩者都只是意象，不代表任何成效保證。</p><button class="text-button" id="to-journey">從第 1 站走一次旅程 ↗</button></section>`;}
function closeDetail({restoreFocus=true}={}){const id=selected,relationId=activeRelation;activeRelation=null;castCard=null;world?.walkerSelect(null);world?.stopFollow();world?.stationSelect(null);if(placingAvatar)setPlacing(false);$('#avatar-button').setAttribute('aria-expanded','false');$('#detail').hidden=true;document.body.classList.remove('detail-open');selected=null;selectedConcern=null;selectedStep=null;world?.pins(null);world?.climb(false);
 if(isPhone()&&indexBeforeDetail)indexSheet.set(indexBeforeDetail);indexBeforeDetail=null;
 updateMap();renderList();renderConcerns();renderRelations();refitView();$('#map-message').textContent='點一座島，開始你的孟婆島旅程';
 if(!restoreFocus)return;const row=document.querySelector(`.topic-row[data-id="${id}"]`);const relationRow=relationId?[...$('#relation-list').querySelectorAll('[data-relation]')].find(el=>el.dataset.relation===relationId):null;const target=[relationRow,detailOpener,row,$('#concerns-list button'),$('#tab-concerns')].find(el=>el?.isConnected&&el.getClientRects().length);target?.focus();}
$('#close-detail').onclick=()=>{if(guideTour.active&&!guideTour.walking)endTour(false);closeDetail();};
$('#detail').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeDetail();}});
function updateCount(){$('#saved-count').textContent=saved.size;renderList();}

// ---- Dialogs: discussion list, outline, about, tours. ----
// A PDF opened on a phone: the back button / gesture closes it instead of leaving the page.
let pdfHistory=false;
function showModal(html,{pdf=false,letter=false}={}){modal.classList.toggle('letter-viewer',letter);if(pdf&&!pdfHistory){try{history.pushState({pdfViewer:true},'');pdfHistory=true;}catch{}}modal.classList.toggle('pdf-viewer',pdf);if(!pdf)modal.removeAttribute('aria-labelledby');if(!modal.open)previousFocus=document.activeElement;$('#modal-content').innerHTML=html;if(!modal.open)modal.showModal();$('#close-modal').focus();}
$('#close-modal').onclick=()=>modal.close();
// The PDF viewer also closes from its own 關閉 button and from a tap outside the window.
modal.addEventListener('click',e=>{if(e.target.closest?.('[data-close-modal]')){modal.close();return;}if(e.target!==modal||!modal.classList.contains('pdf-viewer'))return;const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();});
addEventListener('popstate',()=>{if(!pdfHistory)return;pdfHistory=false;if(modal.open&&modal.classList.contains('pdf-viewer'))modal.close();});
modal.addEventListener('close',()=>{world?.hold(false);if(modal.classList.contains('pdf-viewer')){modal.classList.remove('pdf-viewer','letter-viewer');modal.removeAttribute('aria-labelledby');$('#modal-content').innerHTML='';if(pdfHistory){pdfHistory=false;try{history.back();}catch{}}}if(document.activeElement===document.body||modal.contains(document.activeElement))previousFocus?.focus();});
const stepper=current=>`<ol class="stepper" aria-label="整理提綱的步驟">${['挑問題','寫情況','帶提綱'].map((s,i)=>`<li${i===current?' aria-current="step"':''}><b>0${i+1}</b>${s}</li>`).join('')}</ol>`;
function discussion(){showModal(`<p class="kicker">MY DISCUSSION LIST · 討論清單</p><h2>讓我們從問題開始。</h2>${stepper(consultQuestions.length||saved.size?1:0)}<p>不用先想好答案，帶著一個真實的困難就好。</p>
 <section class="consult-block"><h3>想帶進討論的問題 <span>${consultQuestions.length}</span></h3>${consultQuestions.length?`<div class="consult-context">${consultQuestions.map((q,i)=>`<div class="consult-question"><p>${escape(q)}</p><button data-remove-question="${i}" aria-label="移除問題：${escape(q)}">×</button></div>`).join('')}</div>`:'<p class="helper">在主題卡片按「就這件事問老師」，問題會出現在這裡。</p>'}</section>
 <section class="consult-block"><h3>收藏的主題 <span>${saved.size}</span></h3><div id="saved-pills">${[...saved].map(id=>`<span class="pill"><b>${topicOf(id).n}</b>${topicOf(id).title}<button data-remove="${id}" aria-label="移除${topicOf(id).title}">×</button></span>`).join('')||'<p class="helper">尚未收藏主題；也可以直接寫下你的問題。</p>'}</div></section>
 <section class="consult-block"><h3>你的情況</h3><label for="role">我是</label><select id="role">${['愛情／夫妻','親子關係','其他'].map(x=>`<option ${role===x?'selected':''}>${x}</option>`).join('')}</select><label for="note">目前的情況，或想先問老師的事</label><textarea id="note" rows="4" maxlength="3000" placeholder="例如：我和孩子的關係一直卡住，想先問問適不適合來…">${escape(note)}</textarea><p class="helper">內容只留在你的瀏覽器。這裡不會寄送訊息，也不收集聯絡資料。</p></section>
 <div class="modal-actions"><button class="primary" id="outline-button">產生討論提綱 ↗</button><button id="back-explore">繼續探索</button></div>`);
 $('#role').onchange=e=>{role=e.target.value;persist();};$('#note').oninput=e=>{note=e.target.value;persist();};
 for(const b of document.querySelectorAll('[data-remove-question]'))b.onclick=()=>{consultQuestions.splice(Number(b.dataset.removeQuestion),1);persist();discussion();};
 for(const b of document.querySelectorAll('[data-remove]'))b.onclick=()=>{saved.delete(b.dataset.remove);persist();updateCount();if(selected===b.dataset.remove)selectTopic(selected,{focus:false,concern:selectedConcern?.id});discussion();};
 $('#outline-button').onclick=outline;$('#back-explore').onclick=()=>modal.close();}
function outline(){const text=makeOutline(role,[...saved],note,answers,consultQuestions);showModal(`<p class="kicker">DISCUSSION OUTLINE · 討論提綱</p><h2>把下一步，帶進對話。</h2>${stepper(2)}<pre class="outline">${escape(text)}</pre><p class="helper">這份提綱還沒有寄給任何人。複製或下載後，複製後貼到 LINE 官方帳號詢問；聯繫方式可在服務台查看。</p><div class="modal-actions"><button class="primary" id="copy">複製討論提綱</button><button id="download">下載文字檔</button><button id="edit-outline">← 返回編輯</button></div>`);$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(text);toast('已複製討論提綱');}catch{toast('無法存取剪貼簿，請下載文字檔或手動選取提綱。');}};$('#download').onclick=()=>{const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='孟婆島諮詢提綱.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('#edit-outline').onclick=discussion;}
$('#discuss').onclick=discussion;
$('#cta-events').onclick=()=>openStation('calendar');
$('#cta-line').onclick=()=>{const u=LINKS.videoDM||LINKS.signup||(CONTACTS.find(c=>c.label==='LINE')||{}).href;if(isLink(u))window.open(u,'_blank','noopener,noreferrer');else openStation('signup');};
$('#about').onclick=()=>{showModal(`<p class="kicker">ABOUT · 關於孟婆島</p><h2>先看見，再決定要不要來。</h2><p>孟婆島是「孟婆茶會」的互動介紹：參加活動，用「上帝視角」看見自己卡住的人生問題，打開迷霧、跳出迴圈。</p><p>地圖連起茶會在做什麼、植物能量怎麼帶你看、常見疑問、參加後的世界與客戶回饋。你可以從最關心的事開始。</p><p class="helper">這是介紹架構草稿。活動場次、價格、案例、回饋與 LINE 官方帳號仍待老師提供；介紹文字不代表任何成效或結果的保證，也不是醫療、法律或財務建議。</p><div class="modal-actions"><button class="primary" id="about-start">從茶會在做什麼開始 ↗</button></div>`);$('#about-start').onclick=()=>{modal.close();selectTopic('teacher');};};
let tourIndex=0;const tour=topics.map(t=>t.id);
function guide(){selectTopic(tour[tourIndex],{focus:false});const t=topicOf(tour[tourIndex]);showModal(`<p class="kicker">ISLAND TOUR · ${String(tourIndex+1).padStart(2,'0')} / ${String(tour.length).padStart(2,'0')}</p><h2>${t.title}</h2><p>${t.intro}</p><p>${t.body}</p><div class="progress"><span style="width:${(tourIndex+1)/tour.length*100}%"></span></div><div class="modal-actions">${tourIndex?'<button id="tour-prev">← 上一步</button>':''}<button class="primary" id="tour-next">${tourIndex===tour.length-1?'開始自由探索':'下一座島 →'}</button><button id="tour-exit">離開導覽</button></div>`);$('#tour-prev')?.addEventListener('click',()=>{tourIndex--;guide();});$('#tour-next').onclick=()=>{if(tourIndex===tour.length-1){modal.close();$('#close-detail').focus();}else{tourIndex++;guide();}};$('#tour-exit').onclick=()=>{modal.close();$('#close-detail').focus();};}
// 「一分鐘看完旅程」: the camera flies round the seven stops by itself, each with its own lead as the caption (see autotour.js).
// Dragging is switched off while it plays; opening any island or stop yourself ends it there.
const AUTO=tourCues(STATIONS,{intro:`旅程一圈七站：從「① ${STATIONS[0].short}」出發，經過指引牌與橋，一路到服務台。`});
let auto=null;
function autoBarHTML(){return `<div class="autotour-head"><b id="at-title"></b><span id="at-time" aria-hidden="true"></span></div><p id="at-caption" aria-live="polite"></p><div class="autotour-progress" aria-hidden="true"><span id="at-progress"></span></div><div class="autotour-actions" id="at-actions"></div>`;}
function autoActions(){const a=$('#at-actions');if(!a)return;
 a.innerHTML=auto.done?'<button type="button" id="at-guide">跟著導覽員走一圈</button><button type="button" id="at-replay">重播</button><button type="button" id="at-exit">離開</button>'
  :`<button type="button" id="at-pause" aria-pressed="${!auto.playing}">${auto.playing?'暫停':'播放'}</button><button type="button" id="at-replay">重播</button><button type="button" id="at-exit">離開</button>`;
 $('#at-pause')?.addEventListener('click',autoToggle);$('#at-replay')?.addEventListener('click',autoTourStart);$('#at-exit')?.addEventListener('click',()=>autoTourStop());
 $('#at-guide')?.addEventListener('click',()=>{autoTourStop({quiet:true});$('#guide').click();});}
function autoTourStart(){if(guideTour.active)endTour(false);if(!$('#detail').hidden)closeDetail({restoreFocus:false});
 auto={t:0,playing:true,cue:-1,last:performance.now(),done:false};document.body.classList.add('autotour');
 let bar=$('#autotour-bar');if(!bar){bar=document.createElement('section');bar.id='autotour-bar';bar.className='autotour-bar';bar.setAttribute('aria-label','一分鐘看完旅程');document.body.append(bar);}
 bar.innerHTML=autoBarHTML();autoActions();world?.lockControls(true);autoTick();$('#at-pause')?.focus({preventScroll:true});}
function autoTourStop({quiet=false}={}){if(!auto)return;auto=null;document.body.classList.remove('autotour');$('#autotour-bar')?.remove();world?.lockControls(false);
 if(!quiet){world?.stationSelect(null);world?.climb(false);$('#map-message').textContent='點一座島，開始你的孟婆島旅程';$('#autotour')?.focus({preventScroll:true});}}
function autoToggle(){if(!auto||auto.done)return;auto.playing=!auto.playing;auto.last=performance.now();autoActions();$('#at-pause')?.focus({preventScroll:true});}
function autoShow(k){const c=AUTO.cues[k];$('#at-title').textContent=c.title;$('#at-caption').textContent=c.caption;
 if(c.id){world?.stationSelect(c.id);world?.climb(c.id==='bridge');world?.focusStation(c.id,insets());$('#map-message').textContent=`旅程 ${c.title}`;}
 else{world?.stationSelect(null);world?.climb(false);world?.home(insets());$('#map-message').textContent='一分鐘看完旅程';}}
function autoTick(){if(!auto)return;const now=performance.now();if(auto.playing&&!document.hidden)auto.t+=Math.min(.25,(now-auto.last)/1000);auto.last=now;
 if(auto.t>=AUTO.total&&!auto.done){auto.done=true;auto.playing=false;auto.t=AUTO.total;autoActions();
  $('#at-title').textContent='看完一圈了';$('#at-caption').textContent='想慢慢看，可以跟著導覽員走一圈，或直接點任何一站。';world?.stationSelect(null);world?.climb(false);world?.home(insets());$('#at-guide')?.focus({preventScroll:true});}
 const k=cueAt(AUTO.cues,auto.t);if(!auto.done&&k!==auto.cue){auto.cue=k;autoShow(k);}
 $('#at-time').textContent=`${clock(auto.t)} / ${clock(AUTO.total)}`;$('#at-progress').style.width=`${Math.min(100,auto.t/AUTO.total*100)}%`;
 requestAnimationFrame(autoTick);}
$('#autotour').onclick=autoTourStart;
document.addEventListener('keydown',e=>{if(!auto)return;if(e.key==='Escape'){e.preventDefault();autoTourStop();}else if(e.key===' '&&!e.target.closest?.('input,textarea,select,button,a')){e.preventDefault();autoToggle();}});
window.__autoTour=()=>auto&&{t:Math.round(auto.t*10)/10,cue:auto.cue,id:AUTO.cues[auto.cue]?.id??null,playing:auto.playing,done:auto.done,total:AUTO.total};
// 「第一次來？」: the guide leads the way from ① start.
$('#guide').onclick=()=>{openGuide();$('#guide-tour')?.click();};
let quizIndex=0,quizAnswers=[];const questions=[{q:'你現在最在意哪一類問題？',options:['愛情、夫妻或親子關係','金錢、健康、事業或人生方向']},{q:'目前最想先了解哪一部分？',options:['茶會到底在做什麼','植物能量怎麼帶、我是不是清醒的','是不是法事、費用與報名前的顧慮']},{q:'你希望接下來怎麼了解？',options:['先認識茶會','先看真實回饋與案例','帶著自己的問題私訊詢問']}];
function quiz(){const q=questions[quizIndex];showModal(`<p class="kicker">FIND YOUR ROUTE · ${quizIndex+1} / 3</p><h2>${q.q}</h2><div class="progress"><span style="width:${(quizIndex+1)/3*100}%"></span></div><div class="quiz-options">${q.options.map((s,i)=>`<button data-answer="${i}" aria-pressed="${quizAnswers[quizIndex]===i}"><b>${String.fromCharCode(65+i)}</b><span>${s}</span><i aria-hidden="true">↗</i></button>`).join('')}</div>${quizIndex?'<div class="modal-actions"><button id="quiz-prev">← 上一題</button></div>':''}`);$('#quiz-prev')?.addEventListener('click',()=>{quizIndex--;quiz();});for(const b of document.querySelectorAll('[data-answer]'))b.onclick=()=>{quizAnswers[quizIndex]=Number(b.dataset.answer);if(quizIndex<2){quizIndex++;quiz();}else quizResult();};}
function quizResult(){role=quizAnswers[0]===0?'愛情／夫妻':'其他';persist();const ids=explorationRoute(quizAnswers);world?.emphasize(ids);showModal(`<p class="kicker">YOUR ROUTE · 你的探索路線</p><h2>從這三座島開始。</h2><p>這是依照你的選擇安排的探索順序，地圖上已標出這三座島。它不會評定任何狀態，也不會判定你是否適合參加。</p><div class="quiz-options route">${ids.map((id,i)=>`<button data-route="${id}"><b>${i+1}</b><span>${topicOf(id).n} ${topicOf(id).title}<small>${topicOf(id).intro}</small></span><i aria-hidden="true">↗</i></button>`).join('')}</div><div class="modal-actions"><button id="quiz-restart">重新選擇</button></div>`);for(const b of document.querySelectorAll('[data-route]'))b.onclick=()=>{modal.close();selectTopic(b.dataset.route);};$('#quiz-restart').onclick=()=>{quizIndex=0;quizAnswers=[];quiz();};}
$('#quiz').onclick=()=>{quizIndex=0;quizAnswers=[];quiz();};

// ---- People on the map: the guide, a parent on each island, the students and the visitor's own character. ----
// All of them are map characters; none stands for a real teacher, student, parent or case.
let avatarLook=(()=>{try{return readAvatar(localStorage.getItem(AVATAR_KEY));}catch{return readAvatar('');}})();
let castCard=null,castTab='look',placingAvatar=false,avatarStatus='從第 1 站開始，自動探索各座島',arrivedAt=null;
const islandLog=[];
function saveAvatar(){try{localStorage.setItem(AVATAR_KEY,JSON.stringify(avatarLook));}catch{toast('瀏覽器無法儲存角色外觀；這次仍可使用。');}}
function logEvent(text,{id=null}={}){const d=new Date(),pad=n=>String(n).padStart(2,'0');islandLog.unshift({time:`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,text,id});if(islandLog.length>40)islandLog.pop();if(modal.open&&$('#log-list'))renderLog();}
function renderLog(){$('#log-list').innerHTML=islandLog.length?islandLog.map((e,i)=>`<li><time>${e.time}</time><span>${escape(e.text)}</span>${e.id?`<button data-log="${i}">看這座島 ↗</button>`:''}</li>`).join(''):'<li class="empty">島上還很安靜。導覽員或你的角色抵達一座島時，會記在這裡。</li>';for(const b of $('#log-list').querySelectorAll('[data-log]'))b.onclick=()=>{modal.close();selectTopic(islandLog[+b.dataset.log].id);};}
$('#log').onclick=()=>{showModal(`<p class="kicker">ISLAND LOG · 島上日誌</p><h2>島上剛剛發生的事</h2><p class="helper">記錄導覽員與你的角色抵達哪座島。只存在這次瀏覽，重新整理就會清空。</p><ol class="log-list" id="log-list"></ol>`);renderLog();};
$('#people').onclick=()=>{const on=$('#people').getAttribute('aria-pressed')!=='true';$('#people').setAttribute('aria-pressed',on);$('#people').setAttribute('aria-label',on?'隱藏人物':'顯示人物');$('#people').title=$('#people').getAttribute('aria-label');world?.people(on);$('#map-message').textContent=on?'島上的人物出來走動了':'已隱藏人物（你的角色仍會留在島上）';};
function openCastCard(kind,crumb,html){autoTourStop({quiet:true});const opener=document.activeElement;
 // Station to station (上一站／下一站): swap the card's contents in place. Closing and reopening the card would relayout the page,
 // rebuild the index and interrupt the camera, which made stepping through the journey stutter.
 if(!$('#detail').hidden&&castCard==='station'&&kind==='station'){$('#detail-crumb').textContent=crumb;$('#detail-content').innerHTML=html;$('#detail').scrollTop=0;return;}
 if(!$('#detail').hidden)closeDetail({restoreFocus:false});
 activeRelation=null;selected=null;selectedStep=null;selectedConcern=null;castCard=kind;world?.pins(null);world?.climb(false);setBird(false);
 $('#detail-crumb').textContent=crumb;$('#detail-content').innerHTML=html;$('#detail').hidden=false;document.body.classList.add('detail-open');
 if(isPhone()){indexBeforeDetail=indexSheet.state();indexSheet.set('peek');}
 detailOpener=opener?.isConnected&&opener!==document.body&&!$('#detail').contains(opener)?opener:$('#avatar-button');updateMap();renderList();$('#detail').scrollTop=0;}
const followLabel=()=>world?.following()?'鏡頭跟隨中 · 按下停止':'讓鏡頭跟隨';
function bindFollow(w){const b=$('#cast-follow');if(!b)return;b.onclick=()=>{if(world?.following())world.stopFollow();else world?.walkerFocus(castCard==='avatar'?world.me():w,insets());b.textContent=followLabel();b.setAttribute('aria-pressed',!!world?.following());};}
function onWalker(w){if(w.kind==='lecturer'||w.seated){openStation('signup');world?.walkerSelect(w);return;}if(w.kind==='messenger'){openRelation(w.key);world?.walkerSelect(w);toast('這位參加者帶著兩座島之間的關聯問題');return;}if(w.kind==='avatar'){openAvatar();return;}if(w.kind==='guide'){openGuide();return;}openResident(w);}
function openResident(w){const t=topicOf(w.island);if(!t)return;const parent=w.kind==='parent';
 const doing=parent?`在「${t.title}」散步`:w.toBridge?'發現一直繞圈，回頭到橋頭改走奈何橋':w.up?'正走向回饋島（過橋、經過摩天輪，走進回饋島的門口）':w.target&&topicOf(w.target)?`正從「${t.title}」走向「${topicOf(w.target).title}」`:`在「${t.title}」走走看看`;
 const note=parent?'陪伴者是地圖角色，不代表任何真實人物。':`地圖上的參加者都是地圖角色，不代表特定的人或案例，也不代表實際參加人數。`;
 openCastCard(w.kind,`${parent?'島上的陪伴者':'參加者'} · ${t.n} ${t.title}`,`<div class="detail-head"><span class="detail-badge cast-badge" aria-hidden="true">${parent?'☻':'✎'}</span><div><p class="eyebrow">${parent?'島上的陪伴者':'參加者'} · 地圖角色</p><h2 id="detail-title">${escape(doing)}</h2></div></div><p class="relation-notice">${note}</p><div class="detail-actions"><button class="ask-topic" id="cast-island">看「${t.title}」這座島 ↗</button><button class="save-topic" id="cast-follow" aria-pressed="true">鏡頭跟隨中 · 按下停止</button></div>`);
 world?.walkerSelect(w);world?.walkerFocus(w,insets());bindFollow(w);$('#cast-island').onclick=()=>selectTopic(t.id);$('#map-message').textContent=parent?`正在看 ${t.title}的陪伴者`:'正在看一位參加者';$('#close-detail').focus();}
function guideWhere(){const g=world?.walkerState().guide;if(!g)return '';const t=placeOf(g.target||g.island);if(!t)return '';return g.target?`正走向 ${t.n} ${t.title}`:`停在 ${t.n} ${t.title}`;}
// ---- The guide waits at ① start; when asked, it leads the visitor round GUIDE_ROUTE one stop at a time, the camera following. ----
const guideTour={active:false,index:0,walking:false};
const SKIP_WALK='<button class="ask-topic" id="tour-skip">跳過走路，直接抵達 →</button>';
function skipTourWalk(){if(!guideTour.active||!guideTour.walking)return;const id=guideTour.detour||GUIDE_ROUTE[guideTour.index];if(!world?.guideAppear(id,{instant:true}))return;world.stopFollow();const detour=guideTour.detour;onGuide(id);if(detour||!TOUR_VIEW.has(id))world.walkerFocus(world.guide(),{...insets(),instant:true});}
const stopName=id=>placeOf(id)?.title||'';
const DETOURS=STATIONS.find(s=>s.id==='fork').paths.map(p=>[p.stop,p.id,'帶我去看'+p.name]);
function tourBar(){if(!guideTour.active)return '';const k=guideTour.index,last=k>=GUIDE_ROUTE.length-1,next=GUIDE_ROUTE[k+1];
 if(guideTour.detour)return `<div class="tour-bar" role="group" aria-label="導覽員帶路"><p><b>⚑ 導覽員帶你看練習的誤區</b> · ${escape(DETOURS.find(d=>d[0]===guideTour.detour)?.[2].replace('帶我去看','')||'')}</p><div class="tour-actions"><button class="ask-topic" id="tour-back">看完了，回到指引牌 →<small>再照著指引走上橋</small></button>${DETOURS.filter(d=>d[0]!==guideTour.detour).map(d=>`<button class="text-button" data-detour="${d[0]}">${d[2]}</button>`).join('')}<button class="text-button" id="tour-stop">結束導覽</button></div></div>`;
 const extra=GUIDE_ROUTE[k]==='fork'?DETOURS.map(d=>`<button class="text-button" data-detour="${d[0]}">${d[2]}</button>`).join(''):'';
 return `<div class="tour-bar" role="group" aria-label="導覽員帶路"><p><b>⚑ 導覽員帶路中</b> · 第 ${k+1} / ${GUIDE_ROUTE.length} 站</p><div class="tour-actions">${last?'<button class="ask-topic" id="tour-home">回到第 1 站，結束導覽</button>':`<button class="ask-topic" id="tour-next">看完了，繼續前進 →<small>下一站：${escape(stopName(next))}</small></button>`}${extra}<button class="text-button" id="tour-stop">結束導覽</button></div></div>`;}
function bindTourBar(){$('#tour-skip')?.addEventListener('click',skipTourWalk);$('#tour-next')?.addEventListener('click',()=>tourStep(guideTour.index+1));$('#tour-back')?.addEventListener('click',()=>{guideTour.detour=null;tourStep(GUIDE_ROUTE.indexOf('fork'));});for(const b of document.querySelectorAll('#detail-content [data-detour]'))b.onclick=()=>tourDetour(b.dataset.detour);$('#tour-home')?.addEventListener('click',()=>endTour(true));$('#tour-stop')?.addEventListener('click',()=>endTour(true));}
// Open the card for the stop the guide has reached, with the tour bar on top. The camera is already with the guide, so it stays put.
// Arriving with the guide keeps the camera on the guide, except at ② the trailhead: there it turns to the stop's own view
// (the sign facing you, the bridge to the left and the rough road to the right), the same as choosing the stop yourself.
const TOUR_VIEW=new Set(['fork']);
function showTourStop(id){if(topicOf(id))selectTopic(id,{camera:false});else openStation(id,{camera:TOUR_VIEW.has(id)?undefined:false});}
// From the trailhead the guide can take the visitor to look at the wrong ways (a cliff top, the foot of the steep wall), then back.
function tourDetour(stop){const d=DETOURS.find(x=>x[0]===stop);if(!d)return;guideTour.active=true;guideTour.detour=stop;guideTour.walking=true;
 const bar=$('.tour-bar');if(bar)bar.innerHTML=`<p><b>⚑ 導覽員帶你去看「${escape(d[2].replace('帶我去看',''))}」</b> · 跟著它走…</p><div class="tour-actions">${SKIP_WALK}</div>`;bindTourBar();
 if(!world?.guideTo(stop)){guideTour.walking=false;openStation('fork',{path:d[1],camera:false});return;}if(guideTour.walking){world.walkerSelect(world.guide());world.walkerFocus(world.guide(),insets());}}
// Every island and station card offers the tour: the tour bar when the guide has brought you here, otherwise a button that makes
// the guide pop up on this island and lead on from here (a visitor who left the tour halfway need not go back to find the guide).
function cardTourUI(id){$('.tour-bar,.tour-resume')?.remove();if(!world)return;
 if(guideTour.active&&!guideTour.walking&&(guideTour.detour?id==='fork':GUIDE_ROUTE[guideTour.index]===id)){$('#detail-content').insertAdjacentHTML('afterbegin',tourBar());bindTourBar();return;}
 $('#detail-content').insertAdjacentHTML('afterbegin',`<div class="tour-resume"><button class="text-button" id="tour-resume">⚑ 請導覽員從這裡帶我走 →</button></div>`);
 $('#tour-resume').onclick=()=>resumeHere(id);}
function resumeHere(id){const k=GUIDE_ROUTE.indexOf(id);world?.guideAppear(id);guideTour.active=true;guideTour.walking=false;guideTour.index=k>=0?k:0;
 // Off the route (the islands in the middle): the guide leads on as if from the start, so the next stop is ② the trailhead.
 if(k<0){$('.tour-resume')?.remove();$('#detail-content').insertAdjacentHTML('afterbegin',tourBar().replace(`第 1 / ${GUIDE_ROUTE.length} 站`,'從這裡出發'));bindTourBar();}else cardTourUI(id);
 toast('導覽員來了，接著帶你走');}
function tourStep(k){const id=GUIDE_ROUTE[k];if(!id)return;guideTour.active=true;guideTour.index=k;guideTour.walking=true;guideTour.detour=null;
 const bar=$('.tour-bar');if(bar)bar.innerHTML=`<p><b>⚑ 導覽員帶你走向「${escape(stopName(id))}」</b> · 跟著它走…</p><div class="tour-actions">${SKIP_WALK}</div>`;bindTourBar();
 if(!world?.guideTo(id)){guideTour.walking=false;showTourStop(id);return;}
 if(!guideTour.walking)return;
 world.walkerSelect(world.guide());world.walkerFocus(world.guide(),insets());$('#map-message').textContent=`導覽員帶你走向「${stopName(id)}」`;}
// While the guide is leading, a stray swipe or scroll on the map would leave it behind: once the visitor lets go, the camera
// catches up with the guide again by itself.
let lastMapInput=0;for(const type of ['pointerup','wheel','touchend'])$('#map').addEventListener(type,()=>{lastMapInput=performance.now();},{passive:true});
setInterval(()=>{if(!guideTour.active||!guideTour.walking||!world||world.following())return;if(performance.now()-lastMapInput<1200)return;world.walkerFocus(world.guide(),insets());$('#map-message').textContent='鏡頭跟回導覽員';},300);
function onGuide(id,{recoveryFailed=false}={}){if(!guideTour.active)return;
 if(recoveryFailed){guideTour.walking=false;guideTour.detour=null;guideTour.index=0;world?.walkerSelect(null);world?.stopFollow();openStation('start');toast('導覽員已回到第 1 站，可以重新出發');return;}
 if(!guideTour.walking)return;if(guideTour.detour){if(id!==guideTour.detour)return;guideTour.walking=false;world?.walkerSelect(null);openStation('fork',{path:DETOURS.find(d=>d[0]===id)[1],camera:false});return;}
 if(id!==GUIDE_ROUTE[guideTour.index])return;guideTour.walking=false;world?.walkerSelect(null);showTourStop(id);}
function endTour(home){guideTour.active=false;guideTour.walking=false;guideTour.detour=null;$('.tour-bar')?.remove();if(home){world?.guideTo(GUIDE_ROUTE[0]);toast('導覽員回到第 1 站等你');}}
function openGuide(){const g=world?.guide();if(!g)return;const st=world.walkerState().guide,atStart=st.island===GUIDE_ROUTE[0]&&!st.target;
 const route=GUIDE_ROUTE.map(stopName).join(' → ');
 openCastCard('guide','地圖角色 · 導覽員',`<div class="detail-head"><span class="detail-badge cast-badge guide" aria-hidden="true">⚑</span><div><p class="eyebrow">地圖角色 · 帶路</p><h2 id="detail-title">${atStart?'我在第 1 站等你，一起走一圈吧':'導覽員'}</h2></div></div><div class="chips"><span class="chip strong" id="guide-where" aria-live="polite">${guideWhere()}</span></div><div class="answer-first"><p class="lead">我會帶你依序走過：${escape(route)}。每到一站我會停下來，等你看完再走下一站。</p></div><p class="relation-notice">導覽員是帶路用的地圖角色，不代表老師本人或任何真實人物。</p><div class="detail-actions">${guideTour.active&&guideTour.walking?SKIP_WALK:guideTour.active&&!guideTour.walking?`<button class="ask-topic" id="guide-tour">繼續導覽：前往「${escape(stopName(GUIDE_ROUTE[guideTour.index+1]||GUIDE_ROUTE[0]))}」 →</button>`:`<button class="ask-topic" id="guide-tour">跟著導覽員出發 →</button>`}<button class="save-topic" id="cast-follow" aria-pressed="true">鏡頭跟隨中 · 按下停止</button></div>`);
 world.walkerSelect(g);world.walkerFocus(g,insets());bindFollow(g);
 $('#tour-skip')?.addEventListener('click',skipTourWalk);
 const tourButton=$('#guide-tour');if(tourButton)tourButton.onclick=()=>{if(guideTour.active&&!guideTour.walking){if(guideTour.index>=GUIDE_ROUTE.length-1){endTour(true);return;}tourStep(guideTour.index+1);return;}
  // Start: the guide is at ① already (or walks back there first), then shows the first stop.
  guideTour.active=true;guideTour.index=0;if(atStart){guideTour.walking=false;showTourStop(GUIDE_ROUTE[0]);}else tourStep(0);};
 $('#map-message').textContent=atStart?'導覽員在第 1 站等你':'跟著導覽員走一圈旅程';$('#close-detail').focus();}
function avatarPanel(){const a=avatarLook,me=world?.walkerState().me;
 if(castTab==='look')return `<div class="cast-field"><label for="avatar-name">名字</label><input id="avatar-name" maxlength="8" autocomplete="off" value="${escape(a.name)}" placeholder="幫角色取個名字（選填）"></div>
 <div class="cast-field"><span class="cast-label" id="pick-role">身分</span><div class="cast-options" role="group" aria-labelledby="pick-role">${Object.keys(AVATAR_ROLES).map(r=>`<button data-pick="role" data-value="${r}" aria-pressed="${a.role===r}">${r}</button>`).join('')}</div><small class="helper">角色只改變外觀。</small></div>
 <div class="cast-field"><span class="cast-label" id="pick-hair">髮型</span><div class="cast-options" role="group" aria-labelledby="pick-hair">${Object.entries(HAIR_STYLES).map(([k,v])=>`<button data-pick="hairStyle" data-value="${k}" aria-pressed="${a.hairStyle===k}">${v}</button>`).join('')}</div></div>
 <div class="cast-field"><span class="cast-label" id="pick-shirt">衣服顏色</span><div class="cast-options" role="group" aria-labelledby="pick-shirt">${SHIRTS.map((c,i)=>`<button class="swatch" style="--swatch:${c}" data-pick="shirt" data-value="${c}" aria-pressed="${a.shirt===c}" aria-label="衣服顏色 ${i+1}"></button>`).join('')}</div></div>
 <p class="helper">角色外觀只存在這個瀏覽器，不會上傳。</p>`;
 const mode=me?.mode||'auto';
 return `<p class="cast-status" id="avatar-status" aria-live="polite">${escape(avatarStatus)}</p><div id="avatar-arrived">${arrivedAt?`<button class="text-button" id="avatar-open-island">看「${placeOf(arrivedAt).title}」 ↗</button>`:''}</div>
 <div class="cast-options wide" role="group" aria-label="角色怎麼走"><button data-mode="stroll" aria-pressed="${mode==='stroll'&&!placingAvatar}">自由漫步</button><button data-mode="auto" aria-pressed="${mode==='auto'&&!placingAvatar}">自動逛逛</button><button id="avatar-place" aria-pressed="${placingAvatar}">點地圖指定</button></div>
 <h3 class="cast-subhead">前往某座島</h3><div class="cast-islands">${[...AVATAR_STOPS.map(placeOf),...topics].map(t=>`<button data-go="${t.id}" aria-current="${me?.target===t.id}"><b>${t.n}</b>${t.title}</button>`).join('')}</div>`;}
function renderAvatar(focusSel){const panel=$('#cast-panel');if(!panel)return;panel.innerHTML=avatarPanel();for(const b of document.querySelectorAll('[data-cast-tab]')){b.setAttribute('aria-pressed',b.dataset.castTab===castTab);}
 $('#avatar-name')?.addEventListener('input',e=>{avatarLook={...avatarLook,name:e.target.value.trim().slice(0,8)};saveAvatar();world?.avatarLook(avatarLook);$('#detail-title').textContent=avatarLook.name||'我的角色';});
 for(const b of panel.querySelectorAll('[data-pick]'))b.onclick=()=>{avatarLook={...avatarLook,[b.dataset.pick]:b.dataset.value};saveAvatar();world?.avatarLook(avatarLook);renderAvatar(`[data-pick="${b.dataset.pick}"][data-value="${b.dataset.value}"]`);};
 for(const b of panel.querySelectorAll('[data-mode]'))b.onclick=()=>{setPlacing(false);world?.avatarMode(b.dataset.mode);const t=placeOf(world?.walkerState().me.island);avatarStatus=b.dataset.mode==='auto'?'自動逛逛中：角色會自己挑下一座島':`在「${t.n} ${t.title}」自由漫步`;arrivedAt=null;world?.walkerFocus(world.me(),insets());renderAvatar(`[data-mode="${b.dataset.mode}"]`);};
 $('#avatar-place')?.addEventListener('click',()=>{setPlacing(!placingAvatar);renderAvatar('#avatar-place');});
 for(const b of panel.querySelectorAll('[data-go]'))b.onclick=()=>sendAvatar(b.dataset.go);
 $('#avatar-open-island')?.addEventListener('click',()=>topicOf(arrivedAt)?selectTopic(arrivedAt):openStation(arrivedAt));
 if(focusSel)panel.querySelector(focusSel)?.focus();}
function sendAvatar(id,spot){const t=placeOf(id);if(!t)return;setPlacing(false);world?.avatarGo(id,spot);arrivedAt=null;const me=world?.walkerState().me;avatarStatus=me?.target?`正走向 ${t.n} ${t.title}`:`已抵達 ${t.n} ${t.title}`;if(!me?.target)arrivedAt=id;if(castCard==='avatar'){castTab='trip';renderAvatar(`[data-go="${id}"]`);}world?.walkerFocus(world.me(),insets());$('#map-message').textContent=`${avatarLook.name||'你的角色'}${me?.target?'正走向':'已抵達'}「${t.title}」`;}
function setPlacing(on){placingAvatar=on;world?.placing(on);$('#map').classList.toggle('placing',on);if(on){world?.stopFollow();$('#map-message').textContent='點地圖指定：點一座島上的位置，角色會走過去';}else if($('#map-message').textContent.startsWith('點地圖指定'))$('#map-message').textContent='點一座島，開始你的孟婆島旅程';}
function onPlace(id,spot){if(!id){toast('請點在島上的地面，角色才走得過去');return;}sendAvatar(id,spot);}
function onArrive(id,{automatic=false}={}){const t=placeOf(id);if(!t)return;arrivedAt=id;avatarStatus=`已抵達 ${t.n} ${t.title}`;if(!automatic)toast(`${avatarLook.name||'你的角色'}抵達「${t.title}」`);if(castCard==='avatar'&&castTab==='trip')renderAvatar();}
function openAvatar(){castTab=castTab||'look';
 openCastCard('avatar','我的角色',`<div class="detail-head"><span class="detail-badge cast-badge me" aria-hidden="true">我</span><div><p class="eyebrow">我的角色 · 只存在這個瀏覽器</p><h2 id="detail-title">${escape(avatarLook.name||'我的角色')}</h2></div></div><div class="cast-tabs" role="group" aria-label="角色設定"><button data-cast-tab="look" aria-pressed="${castTab==='look'}">外觀</button><button data-cast-tab="trip" aria-pressed="${castTab==='trip'}">行程</button></div><div id="cast-panel"></div><div class="detail-actions"><button class="save-topic" id="cast-follow" aria-pressed="true">鏡頭跟隨中 · 按下停止</button></div>`);
 for(const b of document.querySelectorAll('[data-cast-tab]'))b.onclick=()=>{castTab=b.dataset.castTab;if(castTab!=='trip')setPlacing(false);renderAvatar(`[data-cast-tab="${castTab}"]`);};
 renderAvatar();world?.walkerSelect(world.me());world?.walkerFocus(world.me(),insets());bindFollow(world?.me());$('#avatar-button').setAttribute('aria-expanded','true');$('#map-message').textContent='你的角色在島上 · 可以換外觀，或叫它走去某座島';$('#close-detail').focus();}
// ---- The seven-station journey (data in journey.js; nothing here is filled in unless the teacher provides it). ----
const pending=what=>`<p class="pending-note">${what}待老師提供。</p>`;
const linkButton=(url,label,cls='ask-topic')=>isLink(url)?`<a class="${cls} station-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`:`<button class="${cls} station-link" disabled aria-disabled="true">${label}（連結待老師提供）</button>`;
function documentCard(key){const doc=DOCUMENTS[key],urls=documentURLs(key);if(!doc||!urls)return '';return `<div class="course-document"><span class="eyebrow">老師提供的 PDF</span><h3>${escape(doc.title)}</h3><button class="ask-topic" data-document="${escape(key)}">在這裡閱讀 PDF</button><a href="${escape(urls.view)}" target="_blank" rel="noopener noreferrer">另開完整文件 ↗</a></div>`;}
// A public class clip played inside the site, in the same window as the PDFs (fixed title and 關閉, closes by ×, outside tap or
// the phone's back button). An .mp4 that cannot play falls back to the lighter file; if none can, a note points to opening it
// elsewhere. The 3D scene stops drawing while the video is open, so phones spend their power on the video.
function openVideo(key){const v=videoSource(key);if(v)openVideoSource(v);}
function openVideoSource(v){world?.hold(true);
 const frame=v.kind==='drive'?`<iframe class="document-frame" src="${escape(v.preview)}" title="${escape(v.title)} 影片" referrerpolicy="no-referrer" allow="autoplay; fullscreen" allowfullscreen></iframe>`:'<video class="document-frame video-frame" controls playsinline preload="metadata"></video>';
 showModal(`<p class="kicker">課堂影片</p><h2 id="video-title">${escape(v.title)}</h2><div class="document-bar"><p class="document-fallback">若影片無法播放，<a href="${escape(v.view)}" target="_blank" rel="noopener noreferrer">另開影片 ↗</a>。</p><button type="button" class="document-close" data-close-modal>關閉</button></div><p class="video-msg" role="status" hidden></p><div class="document-frame-wrap">${frame}</div>`,{pdf:true});
 modal.setAttribute('aria-labelledby','video-title');
 const video=modal.querySelector('video');if(!video)return;let k=0;
 video.addEventListener('error',()=>{k++;if(v.files[k]){video.src=v.files[k];video.play().catch(()=>{});}else{const m=modal.querySelector('.video-msg');m.hidden=false;m.textContent='影片暫時無法播放，可以改用「另開影片」觀看。';}});
 video.src=v.files[0];video.play().catch(()=>{});}
window.__videoTest=v=>openVideoSource(v);
// Paper-plane letters (an extra way to find student feedback; ④ always lists all of it). Each open unfolds one letter the
// visitor has not read yet; with no consented feedback yet, the letter says so instead of inventing anything.
let letterRead=loadRead(),lastLetter=-1;
function openLetter(){autoTourStop({quiet:true});const list=publicFeedback(),k=pickLetter(list.length,letterRead,Math.random,lastLetter),f=list[k];
 if(f){letterRead.add(k);saveRead(letterRead);lastLetter=k;}
 const body=f?f.text.trim().split(/\n+/).map(t=>`<p>${escape(t)}</p>`).join(''):'<p class="letter-empty">這封信還在路上：客戶回饋待老師提供。</p>',sig=f?feedbackSignature(f):'';
 showModal(`<article class="letter"><p class="letter-kicker" id="letter-title">一封客戶來信</p><div class="letter-body">${body}</div>${sig?`<p class="letter-sign">— ${escape(sig)}</p>`:''}</article><div class="letter-actions">${list.length>1?'<button type="button" data-letter-next>再讀一封</button>':''}<button type="button" data-letter-all>看全部客戶回饋（第 ④ 站）</button><button type="button" class="document-close" data-close-modal>關閉</button></div>`,{pdf:true,letter:true});
 modal.setAttribute('aria-labelledby','letter-title');
 modal.querySelector('[data-letter-next]')?.addEventListener('click',openLetter);
 modal.querySelector('[data-letter-all]')?.addEventListener('click',()=>{modal.close();openStation('university');});}
window.__letterPoints=()=>world?.letterPoints();window.__openLetter=()=>openLetter();
function openDocument(key){const doc=DOCUMENTS[key],urls=documentURLs(key);if(!doc||!urls)return;
 showModal(`<p class="kicker">公開文件 · PDF</p><h2 id="document-title">${escape(doc.title)}</h2><div class="document-bar"><p class="document-fallback">若預覽無法顯示，<a href="${escape(urls.view)}" target="_blank" rel="noopener noreferrer">另開完整 PDF ↗</a>。</p><button type="button" class="document-close" data-close-modal>關閉</button></div><div class="document-frame-wrap"><iframe class="document-frame" src="${escape(urls.preview)}" title="${escape(doc.title)} PDF 預覽" referrerpolicy="no-referrer" allowfullscreen></iframe></div>`,{pdf:true});modal.setAttribute('aria-labelledby','document-title');}
function contactLink(c,content,kind,name=c?.label){return isLink(c?.href)?`<a class="contact-link ${kind}" href="${escape(c.href)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(name)}，在新視窗開啟" title="${escape(name)}，在新視窗開啟">${content}<span class="contact-external" aria-hidden="true">↗</span></a>`:pending(c?.label||'聯繫方式');}
function stationBody(st,extra={}){
 const path=st.id==='fork'&&st.paths.find(p=>p.id===extra.path);
 if(path)return `<section class="card-section">${path.body?`<p>${escape(path.body)}</p>`:''}<p class="helper">這裡是「人生卡住」的比喻，不是指任何人；每個人的路都不同。</p><button class="text-button" data-goto-station="fork">← 回到入口指引牌，比較兩條路</button></section>`;
 if(st.id==='bridge')return `${st.note?`<p class="stairs-note">${escape(st.note)}</p>`:''}`+(st.body?`<section class="card-section"><p>${escape(st.body)}</p></section>`:`<section class="card-section"><h3>老師想說的話</h3>${pending('說明')}</section>`);
 if(st.id==='start')return st.themes.map(t=>`<section class="card-section start-theme"><p class="eyebrow">${escape(t.label)}</p>${t.document?'':`<h3>${escape(t.q)}</h3>`}${t.body?`<p>${escape(t.body)}</p>`:t.document?'':pending('老師的回答')}${t.document?documentCard(t.document):''}</section>`).join('');
 if(st.id==='fork')return `<section class="card-section"><p class="helper">${escape(st.view||'')}</p><h3>左邊：走過奈何橋</h3><button class="path-row right" data-goto-station="bridge"><b>${st.right.name}</b><span>${escape(st.right.caption)}</span><small>${st.right.ends} ↗</small></button></section><section class="card-section"><h3>右邊：崎嶇的山路 · 點一處看看</h3><p class="helper">${escape(st.rough||'')}</p><ol class="path-rows">${st.paths.map(p=>`<li><button class="path-row ${p.id}${extra.path===p.id?' current':''}" data-path="${p.id}" aria-current="${extra.path===p.id}"><b>${p.name}</b><span>${escape(p.caption)}</span><small>${p.ends}</small></button></li>`).join('')}</ol><p class="helper">兩邊都是比喻：右邊說的是人生卡在迴圈時的感覺，並非指任何人或做法。</p></section>`;
 if(st.id==='university'){const list=publicFeedback();return `<section class="card-section"><h3>客戶的回饋</h3>${list.length?`<ul class="feedback-list">${list.map(f=>`<li><p>${escape(f.text.trim())}</p>${feedbackSignature(f)?`<small>— ${escape(feedbackSignature(f))}</small>`:''}</li>`).join('')}</ul>`:pending('客戶回饋（會先取得本人同意再放上）')}<p class="helper">島上也藏著幾架紙飛機，點開會讀到一封客戶來信。</p><p class="helper">回饋島只是意象，不代表任何成效保證。</p></section>`;}
 if(st.id==='calendar'){const open=CLASSES.filter(c=>c.status==='open'),pre=CLASSES.filter(c=>c.status==='preregister');
  return `<section class="card-section">${documentCard(st.document)}</section><section class="card-section"><h3>近期場次</h3>${open.length?`<ul class="class-list">${open.map(c=>`<li><b>${escape(c.grade)}</b><span>${escape([c.schedule,c.start&&('開課 '+c.start),c.note].filter(Boolean).join(' · '))}</span></li>`).join('')}</ul><button class="ask-topic" data-goto-station="signup">前往 LINE 報名 ↗</button>`:pending('最新場次')}</section>
  <section class="card-section"><h3>費用與名額</h3>${PRICING.facts.length?`<dl class="topic-facts">${PRICING.facts.map(([k,v])=>`<div><dt>${escape(k)}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl>`:pending('正式費用')}<p class="helper">報名前可以先知道：</p><ul class="class-list">${PRICING.questions.map(q=>`<li><span>${escape(q)}</span></li>`).join('')}</ul></section>
  </section>`;}
 if(st.id==='signup'){const v=videoSource('trial');return `<section class="card-section"><h3>活動片段</h3>${v?`<div class="station-actions"><button class="ask-topic" data-video="trial">在這裡看${escape(v.title)} ▶</button><a href="${escape(v.view)}" target="_blank" rel="noopener noreferrer">另開影片 ↗</a></div>`:pending('可公開的活動片段')}</section><section class="card-section"><div class="station-actions">${linkButton(LINKS.videoDM,'私訊 LINE 報名／索取報名連結')}${linkButton(LINKS.signup,'開啟報名連結','save-topic')}</div><p class="helper">按下後會開啟外部頁面（LINE）；這個網站不會代你傳送訊息，也不會收集你的資料。</p></section>`;}
 if(st.id==='contact'){
  const line=CONTACTS.find(c=>c.label==='LINE');
  return `<section class="card-section contact-panel"><h3>服務台</h3><p class="helper">還沒打算報名、只是有問題，也可以直接問。推薦先用 LINE 詢問。</p>${contactLink(line,`<svg class="contact-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 17l-2 4 6-2h9a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 2 3Z"/><path d="M7 8h10M7 12h7"/></svg><span><strong>用 LINE 問老師</strong><small>詢問茶會與報名</small></span>`,'contact-primary','用 LINE 問老師')}<p class="helper">這個網站不會代你傳送訊息，也不收集你的資料。</p></section>`;
 }

 return '';}
function openStation(id,extra={}){const st=stationOf(id);if(!st)return;const path=st.id==='fork'&&st.paths.find(p=>p.id===extra.path),k=STATIONS.indexOf(st),prev=STATIONS[k-1],next=st.next&&stationOf(st.next);
 openCastCard('station',`旅程 · ${st.n} ${st.short}`,`<div class="detail-head"><span class="detail-badge cast-badge station-badge" aria-hidden="true">${st.n}</span><div><p class="eyebrow">旅程第 ${k+1} / ${STATIONS.length} 站 · ${st.short}</p><h2 id="detail-title">${escape(path?.title||path?.name||st.title)}</h2></div></div>
 <div class="answer-first"><p class="lead">${escape(path?.caption||st.lead)}</p></div>${stationBody(st,extra)}
 <nav class="step-nav" aria-label="切換旅程站">${prev?`<button data-goto-station="${prev.id}"><small>上一站</small><span>${prev.n} ${prev.short}</span></button>`:'<span></span>'}${next?`<button data-goto-station="${next.id}" class="next"><small>下一站</small><span>${next.n} ${escape(st.nextLabel||next.short)}</span></button>`:'<span></span>'}</nav>`);
 for(const b of document.querySelectorAll('#detail-content [data-video]'))b.onclick=()=>openVideo(b.dataset.video);
 for(const b of document.querySelectorAll('#detail-content [data-document]'))b.onclick=()=>openDocument(b.dataset.document);
 for(const b of document.querySelectorAll('#detail-content [data-goto-station]'))b.onclick=()=>openStation(b.dataset.gotoStation);
 for(const b of document.querySelectorAll('#detail-content [data-path]'))b.onclick=()=>openStation('fork',{path:b.dataset.path});
 world?.stationSelect(id);world?.climb(id==='bridge');if(extra.camera!==false)world?.focusStation(path?.stop||id,insets());cardTourUI(id);$('#map-message').textContent=`旅程 ${st.n} · ${st.short}`;$('#detail').scrollTop=0;$('#detail-title').setAttribute('tabindex','-1');$('#detail-title').focus({preventScroll:true});}
$('#avatar-button').onclick=()=>{if(castCard==='avatar')closeDetail();else openAvatar();};
// Keep live text on the open character card current while people walk.
setInterval(()=>{if(!castCard||!world)return;const b=$('#cast-follow');if(b){b.textContent=followLabel();b.setAttribute('aria-pressed',world.following());}if(castCard==='guide'&&$('#guide-where'))$('#guide-where').textContent=guideWhere();if(castCard!=='avatar')$('#avatar-button').setAttribute('aria-expanded','false');},400);

// ---- Map tools and top actions. ----
$('#reset').onclick=()=>{autoTourStop({quiet:true});if(!$('#detail').hidden)closeDetail({restoreFocus:false});world?.home(insets());setBird(false);};
$('#zoom-in').onclick=()=>world?.zoom(.85);$('#zoom-out').onclick=()=>world?.zoom(1.15);
$('#connection').onclick=()=>{showConnections=!showConnections;$('#connection').setAttribute('aria-pressed',showConnections);updateMap();};
$('#names').onclick=()=>{const on=$('#names').getAttribute('aria-pressed')!=='true';$('#names').setAttribute('aria-pressed',on);$('#names').setAttribute('aria-label',on?'隱藏島名':'顯示島名');world?.names(on);};
function setPaused(paused){document.body.classList.toggle('paused',paused);$('#pause').setAttribute('aria-pressed',paused);$('#pause').innerHTML=paused?'<i>▷</i><span>播放</span>':'<i>Ⅱ</i><span>暫停</span>';$('#pause').setAttribute('aria-label',paused?'播放動畫':'暫停動畫');$('#pause').title=paused?'播放動畫':'暫停動畫';world?.pause(paused);}
$('#pause').onclick=()=>setPaused(!document.body.classList.contains('paused'));
// Hold 15:20 for the first five real seconds, then advance five island minutes per second.
const ISLAND_START=14*60+30,MIN_PER_SEC=0,TIME_NAMES={dawn:'清晨',day:'白天',dusk:'黃昏',night:'夜晚'},TIME_ICONS={dawn:'◒',day:'☀',dusk:'◓',night:'☾'};
const JUMPS=[[6*60,'清晨'],[12*60,'白天'],[18*60,'黃昏'],[21*60,'夜晚']];
let islandSeconds=0,islandOffset=0,clockLast=performance.now(),clockHoldUntil=clockLast+5000,shownClock='';
const islandMinutes=()=>ISLAND_START+islandSeconds*MIN_PER_SEC+islandOffset;
const hhmm=m=>{const d=((Math.floor(m)%1440)+1440)%1440;return `${String(Math.floor(d/60)).padStart(2,'0')}:${String(d%60).padStart(2,'0')}`;};
function nextJump(m){const d=((m%1440)+1440)%1440;return JUMPS.find(([t])=>t>d+1)||[JUMPS[0][0]+1440,JUMPS[0][1]];}
function tickClock(){const now=performance.now();if(!document.body.classList.contains('paused'))islandSeconds+=Math.max(0,now-Math.max(clockLast,clockHoldUntil))/1000;clockLast=now;const m=islandMinutes();world?.setHour(m/60);
 const ph=world?.phase();const name=ph?.name||'day';document.body.classList.toggle('night',(ph?.stars||0)>.5);document.body.dataset.time=name;
 const label=`${TIME_ICONS[name]} ${hhmm(m)}`;if(label!==shownClock){shownClock=label;const [,nextName]=nextJump(m);$('#day').innerHTML=`<i>${TIME_ICONS[name]}</i><span>${hhmm(m)}</span>`;$('#day').setAttribute('aria-label',`島上時間 ${hhmm(m)}（${TIME_NAMES[name]}；孟婆島預設停在明亮的下午），按下跳到${nextName}`);$('#day').title=`島上時間 ${hhmm(m)} · 按下跳到${nextName}`;}}
setInterval(tickClock,250);
$('#day').onclick=()=>{const m=islandMinutes(),[t,nm]=nextJump(m),d=((m%1440)+1440)%1440;islandOffset+=t-d;tickClock();$('#map-message').textContent=`島上時間跳到${nm}`;};
window.__islandClock=()=>({minutes:Math.round(islandMinutes()),time:hhmm(islandMinutes()),phase:world?.phase(),weather:world?.weather()});window.__islandRain=on=>world?.rain(on);window.__islandHazards=()=>world?.hazards();
function setBird(on){$('#bird').setAttribute('aria-pressed',on);$('#bird').setAttribute('aria-label',on?'回到一般視角':'鳥瞰全島');}
$('#bird').onclick=()=>{const on=$('#bird').getAttribute('aria-pressed')!=='true';if(!$('#detail').hidden)closeDetail({restoreFocus:false});world?.home({...insets(),bird:on});setBird(on);$('#map-message').textContent=on?'鳥瞰 · 從正上方看整座島':'點一座島，開始你的孟婆島旅程';};
$('#tools-toggle').onclick=()=>{const open=document.body.classList.toggle('tools-open');$('#tools-toggle').setAttribute('aria-expanded',open);requestAnimationFrame(refitView);};
$('#rotate').onclick=()=>{const rotate=$('#rotate').getAttribute('aria-pressed')!=='true';$('#rotate').setAttribute('aria-pressed',rotate);world?.mode(rotate);$('#map-message').textContent=rotate?'旋轉模式 · 拖曳改變視角':'平移模式 · 拖曳上下左右移動';};
// 清單: phones fold the index sheet down to a slim bar; desktop slides the index away to widen the map.
function syncListToggle(){const open=isPhone()?!$('#index-panel').classList.contains('sheet-peek'):!document.body.classList.contains('index-collapsed');$('#list-toggle').setAttribute('aria-expanded',open);$('#list-toggle').classList.toggle('active',open);}
$('#list-toggle').onclick=()=>{if(isPhone())indexSheet.set(indexSheet.state()==='peek'?'half':'peek');else{document.body.classList.toggle('index-collapsed');syncListToggle();}};

let safeMode=false;try{safeMode=sessionStorage.getItem('mengpo-island-safe-mode')==='1';}catch{}
try{world=createWorld($('#map'),topics,id=>selectTopic(id),{onRelation:openRelation,onStation:(id,extra)=>openStation(id,extra),onGuide,onWalker,onArrive,onLog:logEvent,onPlace,onLetter:()=>openLetter(),avatar:avatarLook,safeMode});setPaused(matchMedia('(prefers-reduced-motion: reduce)').matches);}catch(error){$('#map').innerHTML='<p class="webgl-message">這個瀏覽器無法開啟 3D 地圖。請使用主題清單繼續探索。</p>';console.error(error);}
clockLast=performance.now();clockHoldUntil=clockLast+5000;tickClock();
function syncPhone(){document.body.classList.toggle('shell-mobile',isPhone());}
syncPhone();phone.addEventListener('change',()=>{syncPhone();syncListToggle();requestAnimationFrame(refitView);});
const indexSheet=bindSheet($('#index-panel'),$('#index-handle'),$('#index-size'),{peekable:true,onChange:()=>{syncListToggle();requestAnimationFrame(refitView);}});
// Phones open on the map, full screen (as Puma does): the question list waits as a slim bar at the bottom; 「清單」 opens it.
if(isPhone())indexSheet.set('peek');
bindSheet($('#detail'),$('#detail-handle'),$('#detail-size'),{onChange:()=>requestAnimationFrame(refitView),onClose:()=>closeDetail()});
for(const el of [$('#detail'),$('#index-panel')])el.addEventListener('transitionend',e=>{if(['height','transform'].includes(e.propertyName))refitView();});
new ResizeObserver(()=>requestAnimationFrame(refitView)).observe($('#map'));
document.querySelector('main').addEventListener('transitionend',e=>{if(e.propertyName==='grid-template-columns')refitView();});

// ---- First-visit walkthrough (separate storage key; never touches mengpo-island-course). ----
let introStep=0;const touch=matchMedia('(hover: none) and (pointer: coarse)').matches;
function finishIntro(){try{localStorage.setItem(INTRO_KEY,'1');}catch{}}
function intro(){const s=introSteps[introStep],last=introStep===introSteps.length-1;showModal(`<p class="kicker">HELLO, WRITER · 0${introStep+1} / 0${introSteps.length}</p><h2>${s.title}</h2><p>${touch&&s.touchBody?s.touchBody:s.body}</p><div class="progress"><span style="width:${(introStep+1)/introSteps.length*100}%"></span></div><div class="modal-actions intro-actions"><button id="intro-skip">${introStep?'← 上一步':'略過'}</button><button class="primary" id="intro-next">${last?'開始探索 →':'下一步 →'}</button></div>`);$('#intro-next').focus();$('#intro-skip').onclick=()=>{if(introStep){introStep--;intro();}else modal.close();};$('#intro-next').onclick=()=>{if(last)modal.close();else{introStep++;intro();}};}
modal.addEventListener('close',()=>{if($('#intro-next'))finishIntro();});
$('#help').onclick=()=>{introStep=0;intro();};

updateCount();renderConcerns();renderRelations();syncListToggle();requestAnimationFrame(refitView);
let seenIntro=false;try{seenIntro=localStorage.getItem(INTRO_KEY)==='1';}catch{}if(!seenIntro&&world)intro();
for(const button of document.querySelectorAll('.map-tools button,.top-actions button'))button.title=button.getAttribute('aria-label');
// Read-only camera state for manual QA of pan / rotate / zoom / fly (no effect on the page).
window.__islandView=()=>world?.view();
window.__stationPoint=id=>world?.stationPoint(id);window.__islandPeople=()=>world?.walkerState();window.__walkerPoint=(kind,i)=>world?.walkerPoint(kind,i);window.__islandPoint=(id,dx,dz)=>world?.islandPoint(id,dx,dz);
window.__trailPoint=(seg,u)=>world?.trailPoint(seg,u);window.__islandClimb=()=>({stairs:world?.stairsLit(),trophy:world?.trophy()});window.__stairPoint=t=>world?.stairPoint(t);
setInterval(()=>{if(world)$('#map').dataset.cameraView=JSON.stringify(world.view());},150);
