// 孟婆島的七站旅程：崎嶇島 → 奈何橋入口 → 奈何橋 → 回饋 → 活動場次 → LINE 報名 → 服務台 → 回崎嶇島。
// 只改這個檔案：值留空（'' 或 []）時，頁面顯示「待老師提供」，不會憑空填寫。
// 連結會開啟外部頁面（LINE 等）；這個網站不會代你傳訊息，也不收集個人資料。

export const STATIONS=[
 {id:'start',n:'①',title:'崎嶇島：人生卡住的地方',short:'崎嶇島',
  lead:'旅程從這裡出發。人生常常卡在迴圈裡：關係、金錢、健康、事業……不知道自己到底發生了什麼事。',
  // 起點的兩個主題，各附老師自己的回答。回答留空 → 待老師提供。
  themes:[
   {q:'來的人都帶著什麼問題？',label:'主題一 · 困境',body:'來茶會的人，多半正在迷茫、想找人生方向。最常見的是關係問題（愛情、夫妻、親子），其次是金錢、健康與事業。近期最常出現的是親子關係，例如「為什麼我和孩子關係不好」。'},
   {q:'為什麼是孟婆茶會？',label:'主題二 · 選擇',body:''}],
  next:'fork',nextLabel:'走到奈何橋入口'},
 {id:'fork',n:'②',title:'橋頭：過橋，還是繼續繞？',short:'橋頭',
  lead:'走到橋頭，有兩種走法：走上奈何橋，或繼續在崎嶇的路上繞圈。兩邊都是比喻。',
  view:'站在橋頭往前看：中央的河上有奈何橋，通往另一側繽紛的世界；右邊是崎嶇的山路，路上的人常常繞了一圈又回到原地。導覽員可以帶你去看看右邊。',
  right:{name:'走上奈何橋',caption:'走過奈何橋，象徵參加活動。橋的另一邊是參加後看到的繽紛世界。',ends:'通往繽紛世界'},
  paths:[
   {id:'cliff',stop:'pass1',name:'第一道崖邊',title:'同樣的事，一再發生',caption:'換了人、換了場景，卻總是卡在同一個地方，像在崎嶇的山路上繞圈。',body:'人生卡住時，常常不是一件事，而是同一個模式反覆出現。看不見它，就容易一再碰壁。',ends:'繞圈，回到原地'},
   {id:'cliff2',stop:'pass2',name:'第二道崖邊',title:'不知道卡在哪',caption:'很用力，卻不知道自己到底卡在哪個環節，只覺得迷霧一片。',body:'看不清卡點，就不知道該從哪裡開始。這就是「迷霧」。',ends:'迷霧一片'},
   {id:'wall',stop:'wallfoot',name:'陡峭山壁',caption:'方法不對，但真的很努力：攀著繩子一點一點往上爬，也許真的到得了頂；只是很慢，爬一爬還可能掉下來。',ends:'到得了，但很辛苦'}],
  rough:'崎嶇的路上沒有護欄，翻過兩道崖邊，有人會在邊緣掉下去；走到盡頭，還要攀繩爬上陡峭山壁。也有人走到第一道崖邊覺得不對，回頭改走橋——隨時都可以換一條路。',
  next:'bridge',nextLabel:'走上奈何橋'},
 {id:'bridge',n:'③',title:'奈何橋：過橋，象徵參加活動',short:'奈何橋',
  lead:'孟婆一定有河，有橋。走過這座橋，就是參加孟婆茶會。',
  note:'橋下的河上漂著蓮花，點開蓮花，可以看到客戶的回饋。橋的另一邊，是參加後的繽紛世界。',
  body:'',
  next:'university',nextLabel:'看客戶回饋'},
 {id:'university',n:'④',title:'回饋島：客戶回饋',short:'客戶回饋',
  lead:'走出遊樂園，來看看參加者的回饋與案例。',
  next:'calendar',nextLabel:'走滑梯下到活動場次'},
 {id:'calendar',n:'⑤',title:'活動場次',short:'活動場次',
  lead:'每期的日期與地點不同，名額可能「即將額滿」。先看看近期場次，再決定要不要報名。',document:'calendar',
  next:'signup',nextLabel:'前往 LINE 報名'},
 {id:'signup',n:'⑥',title:'LINE 報名',short:'LINE 報名',
  lead:'報名不用填表單：先私訊 LINE 官方帳號，由老師回覆，並索取報名連結。',
  next:'contact',nextLabel:'到服務台'},
 {id:'contact',n:'⑦',title:'服務台',short:'服務台',
  lead:'還沒打算報名、只是有問題嗎？按服務台詢問就好，不用先決定。',
  next:null}
];

// ④ 客戶回饋，逐字、且取得本人同意公開才放。每則：
//   {text:'原話……', who:'小美（化名）', consent:true}
// 沒有 consent:true（或沒有 text）的項目不會顯示，島上的紙飛機也不會出現。
export const FEEDBACK=[];
export const feedbackSignature=f=>[f.school,f.name].map(s=>typeof s==='string'?s.trim():'').filter(Boolean).join(' ')||(typeof f.who==='string'?f.who.trim():'');
export function publicFeedback(list=FEEDBACK){return list.filter(f=>f&&f.consent===true&&typeof f.text==='string'&&f.text.trim());}

// ⑤ 近期場次。status 'open'（可報名）。範例：
//   {grade:'12/6（六）台北',status:'open',schedule:'14:00–17:00',start:'',note:'即將額滿'}
// grade 欄位在這裡當作「日期＋地點」顯示。
export const CLASSES=[];

// ⑤ 費用與名額說明。價格約 800～1500 元（待確認），依場地租金與地點而定；確認後再填入 facts。
export const PRICING={
 questions:['費用：約 800～1500 元（待確認），依場地與地點而定。','名額：每場約 12～15 人，快滿時會標示「即將額滿」。','條件：18 歲以上；沒有其他申請條件，有疑問直接 LINE 詢問。'],
 facts:[]
};

// ⑤⑥⑦ 連結。每個都是完整 https:// 網址；留空 → 按鈕顯示「連結待老師提供」。
export const LINKS={
 preregister:'',
 signup:'',        // 報名連結（可由 LINE 官方帳號提供）
 videoDM:''        // 私訊 LINE 官方帳號報名／索取報名連結
};

// ⑦ 聯繫方式。LINE 官方帳號網址待老師提供後填入 href。
export const CONTACTS=[
 {label:'LINE',value:'私訊 LINE 官方帳號',href:''}
];

// 公開文件（如場次表）放在 Drive；留空表示尚未提供。
export const DOCUMENTS={
 calendar:{title:'孟婆茶會｜活動場次',driveId:''}
};
export function documentURLs(key){if(!Object.hasOwn(DOCUMENTS,key))return null;const d=DOCUMENTS[key];if(typeof d.driveId!=='string'||!/^[-\w]+$/.test(d.driveId))return null;const base='https://drive.google.com/file/d/'+d.driveId;return {view:base+'/view',preview:base+'/preview'};}

export const isLink=s=>typeof s==='string'&&/^https:\/\//.test(s);

// ⑥ 站內影片：只放老師選擇公開的活動片段。填其中一種：
//   driveId：Google Drive 檔案 id；或 hd / sd：完整 https:// 的 .mp4 網址。
export const VIDEOS={
 trial:{title:'活動片段',driveId:'',hd:'',sd:''}
};
export function videoSource(key){if(!Object.hasOwn(VIDEOS,key))return null;const v=VIDEOS[key];
 if(typeof v.driveId==='string'&&/^[-\w]{10,}$/.test(v.driveId))return {kind:'drive',title:v.title,preview:'https://drive.google.com/file/d/'+v.driveId+'/preview',view:'https://drive.google.com/file/d/'+v.driveId+'/view'};
 const files=[v.hd,v.sd].filter(u=>isLink(u)&&/\.mp4(\?|#|$)/i.test(u));
 return files.length?{kind:'file',title:v.title,files,view:files[0]}:null;}
