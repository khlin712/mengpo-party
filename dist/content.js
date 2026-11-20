// 孟婆島內容。文字依老師的兩份對談筆記整理。
// 尚未確認的資料（場次、價格、案例、回饋）一律標示「待老師提供／待確認」，不虛構。
// 場次、聯絡連結、客戶回饋請改 journey.js；這個檔案放島嶼、關聯線與導覽。
import { easeInOutCubic } from './motion.js';
export { easeInOutCubic };

export const PENDING = '待老師提供';
export const GROUPS = ['人生的困境', '認識茶會', '疑問與解法', '體驗與回饋', '報名與聯繫'];

const s = (label, q, body = '') => ({ label, q, body });

// 依旅程順序排列（編號＝順序）：1 崎嶇島 → 2 疑問橋 → 3 茶會 → 4 奈何橋 → 5 繽紛世界 → 6 嘗試（場次）→ 7 報名。
// type 'bridge' 的節點是橋，不是島：疑問橋（心中的疑問，有點可怕）與奈何橋（說明工作怎麼進行），點橋看內容。
// hex：六角格軸座標（q, r），只有島才有。
export const ISLANDS = [
  {
    id: 'start', n: 1, title: '崎嶇島：人生卡住的地方', short: '崎嶇島', tag: '人生的困境', color: '#e8a878', hex: [0, 0], kind: 'volcano',
    intro: '旅程從這裡出發：人生常常卡在迴圈裡。',
    body: '人生常常卡在迴圈裡：關係、金錢、健康、事業……不知道自己到底發生了什麼事。崎嶇的山路比喻「卡住」：翻過崖邊會掉下去，攀著陡峭山壁也許到得了頂，但很慢，爬一爬還可能掉下來。想走出迴圈，要先走過一座橋：那座橋，是人們心中的疑問，橋的另一頭就是茶會。',
    steps: [
      s('困境', '來的人都帶著什麼問題？', '來茶會的人，多半正在迷茫、想找人生方向。最常見的是關係問題（愛情、夫妻、親子），其次是金錢、健康與事業。近期最常出現的是親子關係，例如「為什麼我和孩子關係不好」。'),
      s('迴圈', '同樣的事，為什麼一再發生？', '人生卡住時，常常不是一件事，而是同一個模式反覆出現。看不見它，就容易一再碰壁。'),
      s('迷霧', '很用力，卻不知道卡在哪？', '看不清卡點，就不知道該從哪裡開始。這就是「迷霧」。'),
      s('攀爬', '方法不對，但真的很努力？', '攀著繩子一點一點往上爬，也許真的到得了頂；只是很慢，爬一爬還可能掉下來。'),
    ],
    facts: [['最常見的問題', '關係（愛情、夫妻、親子），其次是金錢、健康與事業'], ['近期最常出現', '親子關係，例如「為什麼我和孩子關係不好」']],
    task: '你現在最想看清楚的，是人生中的哪一個環節？', example: '例如：同樣的事，為什麼一再發生？',
    question: '我最近卡在一件事上，想知道孟婆茶會能怎麼陪我看。',
  },
  {
    id: 'questions', n: 2, type: 'bridge', between: ['start', 'teacher'], kind: 'scary', title: '心中的疑問：通往茶會的橋', short: '疑問橋', tag: '疑問與解法', color: '#c7b6ee',
    intro: '崎嶇島走向茶會的那座橋，是人們心中的疑問。',
    body: '從崎嶇島走向茶會，要先走過一座有點可怕的橋：那是人們心中的疑問，是不是法事？是不是催眠？第一次聽到的人常會有顧慮。這裡先整理最常見的幾個，回答方向來自老師的說法；正式的完整回應與場次資訊仍待老師補充。尚未確認的內容不視為承諾。',
    steps: [
      s('是不是法事', '這是做法事嗎？', '不是法事。'),
      s('是不是催眠', '我會失去意識嗎？', '不是催眠，也不是別人說故事給你聽。你是清醒的。'),
      s('工具來源', '這套工具從哪裡來？', '透過水晶、植物花與星際（待確認）的共振頻率工作，源自古老列穆里亞（待確認）的教導；工具在市場上已超過 35 年，茶會結合這個工具與植物能量一起工作。'),
      s('適合嗎', '我可以來嗎？有條件嗎？', '申請條件：無，有疑問直接 LINE 詢問。'),
      s('怎麼報名', '費用與場次怎麼問？'),
    ],
    facts: [['是不是法事', '不是法事'], ['工具', '透過水晶、植物花與星際（待確認）的共振頻率工作，源自古老列穆里亞（待確認）的教導；工具在市場上已超過 35 年'], ['申請條件', '無，有疑問直接 LINE 詢問']],
    task: '你目前最擔心、或一直想問卻還沒問出口的是什麼？', example: '例如：我只是想看看，不確定要不要報名，可以先問嗎？',
    question: '我想先問清楚這是不是法事、是不是催眠，以及我適不適合參加。',
  },
  {
    id: 'teacher', n: 3, title: '孟婆茶會在做什麼', short: '茶會', tag: '認識茶會', color: '#f2b5c8', hex: [1, 0], kind: 'pavilion',
    intro: '參加茶會，用「上帝視角」看見自己卡住的地方。',
    body: '人生常常卡在迴圈裡，不知道自己到底發生了什麼事。孟婆茶會想做的，是在活動中陪你換一個更高的角度，從全知的視角，看見自己卡住的問題：關係、金錢、身體健康、事業，以及人生各種問題。以下是介紹架構，正式說法與場次細節由老師補充。',
    steps: [
      s('上帝視角', '換一個更高的角度，看見自己卡在哪裡？'),
      s('打開迷霧', '為什麼同樣的事一再發生？'),
      s('關係與其他', '關係、金錢、健康、事業，你最想先看哪一個？'),
    ],
    facts: [['活動性質', '茶會，現場以精油作為代表，對外統一說「植物能量」'], ['適用對象', '18 歲以上'], ['場次與人數', '約二、三十場，每場約 12～15 人；累計 500 人以上為口頭估計，待確認'], ['價格', '約 800～1500 元，依場地與地點而定（待確認）']],
    task: '你現在最想看清楚的，是人生中的哪一個環節？', example: '例如：我和孩子的關係為什麼總是卡住？',
    question: '我想了解孟婆茶會實際在做什麼，以及我的問題適不適合帶來。',
  },
  {
    id: 'teaching', n: 4, type: 'bridge', between: ['teacher', 'stories'], kind: 'naihe', title: '奈何橋：我們的工作怎麼進行', short: '奈何橋', tag: '認識茶會', color: '#9fd8c8',
    intro: '從茶會走向繽紛世界的奈何橋，說明我們的工作怎麼進行。',
    body: '點開這座橋，看我們的工作怎麼進行。茶會以「植物能量」帶領你，從高我（更高的角度）看見人生卡在哪個環節，以及那個卡點如何一路影響到現在，讓你不斷碰壁或繞圈。這不是催眠，也不是別人說故事給你聽。你全程清醒，從自己的第一視角看。流程為示意，實際安排以老師說明為準。',
    steps: [
      s('植物能量', '現場用什麼帶領你？'),
      s('第一視角', '清醒的你會看到什麼？'),
      s('看見卡點', '卡在哪個環節、如何影響到現在？'),
      s('不是催眠', '你最擔心哪一部分？'),
      s('之後', '帶著看見回到生活，下一步想怎麼走？'),
    ],
    facts: [['做法', '以植物能量帶領，從高我看見卡點；現場以精油作為代表，對外統一說「植物能量」'], ['不是什麼', '不是催眠、不是聽別人說故事；你是清醒的'], ['圖騰', '老師設計了一張圖騰放在桌上，「我們接下來就在這個圖騰上工作」，取代過去使用的白紙'], ['深入原理', '不在頁面上深入說明，需要時請私訊詢問']],
    task: '你想先弄懂這套做法的哪一部分？', example: '例如：我是清醒的嗎？現場到底怎麼進行？',
    question: '我想了解植物能量怎麼帶領，以及我全程是不是清醒的。',
  },
  {
    id: 'stories', n: 5, title: '參加後的繽紛世界', short: '繽紛世界', tag: '體驗與回饋', color: '#ffc8e2', hex: [0, 1], kind: 'wheel',
    intro: '走過奈何橋，平凡的人生也能繽紛開心。',
    body: '走過奈何橋，象徵參加活動。橋的另一邊是參加完之後看到的繽紛世界：花開、漂亮的東西、一座摩天輪。這裡預留給參加者「前、中、後」的完整案例（遇到的困擾、過程中的發現、事後的改變）與客戶回饋；目前尚未收到真實案例，不展示虛構故事、回饋或數字。',
    steps: [
      s('繽紛世界', '參加後，平凡的人生可以多開心？'),
      s('前', '參加前遇到什麼困擾？'),
      s('中', '過程中發現了什麼？'),
      s('後', '事後有什麼改變？'),
      s('活動照片', '現場長什麼樣子？'),
    ],
    facts: [['客戶回饋', PENDING], ['案例（前、中、後）', PENDING], ['活動與課程照片', PENDING + '，全部可公開']],
    task: '你想先看別人的哪一種經驗？', example: '例如：和我一樣為親子關係煩惱的人，後來怎麼了？',
    question: '我想看和我情況相近的參加者回饋，以及活動現場的照片。',
  },
  {
    id: 'calendar', n: 6, title: '嘗試：活動場次（行事曆）', short: '場次', tag: '報名與聯繫', color: '#f6d88f', hex: [1, 1], kind: 'tents',
    intro: '走進繽紛世界之後，想試試看？先看近期場次。',
    body: '每期的日期與地點不同，名額可能「即將額滿」。先看看近期場次，再決定要不要報名。',
    steps: [
      s('近期場次', '日期與地點在哪裡？'),
      s('名額', '我來得及報名嗎？', '每場約 12～15 人，快滿時會標示「即將額滿」。'),
      s('費用', '大概多少錢？', '約 800～1500 元（待確認），依場地與地點而定。'),
      s('資格', '誰可以來？', '18 歲以上；沒有其他申請條件，有疑問直接 LINE 詢問。'),
    ],
    facts: [['價格', '約 800～1500 元（待確認），依場地與地點而定'], ['名額', '每場約 12～15 人'], ['條件', '18 歲以上']],
    task: '你方便的時間與地點是哪一種？', example: '例如：平日晚上，還是週末白天？',
    question: '我想知道近期場次的日期、地點與費用。',
  },
  {
    id: 'signup', n: 7, title: 'LINE 報名與服務台', short: '報名', tag: '報名與聯繫', color: '#a8dd9a', hex: [0, 2], kind: 'kiosk',
    intro: '報名不用填表單，先私訊 LINE 就好。',
    body: '報名不用填表單：先私訊 LINE 官方帳號，由老師回覆，並索取報名連結。還沒打算報名、只是有問題嗎？來服務台詢問就好，不用先決定。',
    steps: [
      s('私訊報名', '怎麼報名？', '先私訊 LINE 官方帳號，由老師回覆，並索取報名連結。'),
      s('先問問', '還沒決定可以問嗎？', '可以。只是有問題，直接詢問就好，不用先決定要不要報名。'),
      s('隱私', '我的資料會被收集嗎？', '這個網站不會代你傳訊息，也不收集個人資料；你的筆記只存在這個瀏覽器。'),
    ],
    facts: [['報名方式', '私訊 LINE 官方帳號，由老師回覆'], ['連結', '見下方按鈕（未提供前顯示「連結待老師提供」）']],
    task: '你想先問老師哪一件事？', example: '例如：我只是想看看，可以先問嗎？',
    question: '我想報名或索取報名連結。',
  },
];

// 關聯線（協作線）：a → b。kind 'journey' 是旅程動線，'topic' 是主題之間的關係。
export const FLOWS = [
  { id: 'f1', a: 'start', b: 'questions', kind: 'journey', label: '走上疑問橋', why: '想走出迴圈，先要走過心中的疑問。' },
  { id: 'f2', a: 'questions', b: 'teacher', kind: 'journey', label: '走過去', why: '走過疑問，就是茶會。' },
  { id: 'f3', a: 'teacher', b: 'teaching', kind: 'journey', label: '工作怎麼進行', why: '從茶會走向奈何橋：先看懂我們的工作怎麼進行。' },
  { id: 'f4', a: 'teaching', b: 'stories', kind: 'journey', label: '走過奈何橋', why: '走過奈何橋，象徵參加活動；另一邊是繽紛世界。' },
  { id: 'f5', a: 'stories', b: 'calendar', kind: 'journey', label: '想試試看', why: '看過繽紛世界，想嘗試就來看近期場次。' },
  { id: 'f6', a: 'calendar', b: 'signup', kind: 'journey', label: '去報名', why: '選好場次，私訊 LINE 報名。' },
  { id: 'f7', a: 'signup', b: 'start', kind: 'journey', label: '回到起點', why: '還在迷霧裡？隨時可以再繞回來看一次。' },
  { id: 'f8', a: 'questions', b: 'teaching', kind: 'topic', label: '是不是催眠', why: '「我清醒嗎？」是最常見的疑問，奈何橋的說明會回答。' },
  { id: 'f9', a: 'teacher', b: 'stories', kind: 'topic', label: '別人的經驗', why: '想知道別人參加後的樣子，看繽紛世界的回饋與案例。' },
  { id: 'f10', a: 'questions', b: 'signup', kind: 'topic', label: '先問問', why: '疑問還沒問完也沒關係，服務台隨時可以問。' },
];

// 島上的人物（示意）。台詞都取自網站自己的問題與介紹，不是真實參加者、老師或客戶的話。
export const PEOPLE_NOTE = '這是示意人物，不是真實的參加者、老師或客戶回饋；台詞取自本站已有的問題與介紹。';
export const PEOPLE = [
  { id: 'guide', island: null, role: '導覽員', name: '導覽員', line: '跟著我走一圈：從崎嶇島出發，過奈何橋，最後到報名。', action: 'tour' },
  { id: 'walker', island: null, role: '參加者', name: '走這一圈的人', line: '我正在走這一圈：卡住、過橋、看見、回到生活。' },
  { id: 'stuck', island: 'start', role: '卡住的人', name: '繞圈的人', line: '同樣的事，為什麼一再發生？' },
  { id: 'teacher', island: 'teacher', role: '老師', name: '老師', line: '我們在活動中換一個更高的角度，一起看看卡在哪裡。' },
  { id: 'guest1', island: 'teacher', role: '參加者', name: '參加者', line: '我和孩子的關係為什麼總是卡住？' },
  { id: 'guest2', island: 'teacher', role: '參加者', name: '參加者', line: '關係、金錢、健康、事業，我最想先看哪一個？' },
  { id: 'plant', island: 'teaching', role: '參加者', name: '參加者', line: '我是清醒的嗎？現場到底怎麼進行？' },
  { id: 'asker', island: 'questions', role: '有顧慮的人', name: '提問的人', line: '是不是法事？是不是催眠？' },
  { id: 'asker2', island: 'questions', role: '有顧慮的人', name: '提問的人', line: '我只是想看看，不確定要不要報名，可以先問嗎？' },
  { id: 'joy1', island: 'stories', role: '橋的另一邊', name: '繽紛世界的人', line: '走過奈何橋，平凡的人生也能繽紛開心。（橋另一邊的比喻）' },
  { id: 'joy2', island: 'stories', role: '橋的另一邊', name: '繽紛世界的人', line: '想看別人的經驗？前、中、後案例等老師提供後放在這裡。' },
  { id: 'plan', island: 'calendar', role: '想報名的人', name: '看場次的人', line: '平日晚上，還是週末白天？' },
  { id: 'staff', island: 'signup', role: '服務台', name: '服務台', line: '報名不用填表單，先私訊 LINE 就好；還沒決定也可以問。' },
  { id: 'guest3', island: 'signup', role: '想先問問的人', name: '提問的人', line: '我只是想看看，可以先問嗎？' },
];

// 訪客最在意的問題 → 建議的參觀順序（最後一站固定是報名）
export const ENTRY_ROUTES = {
  couple: { label: '愛情／夫妻', role: '愛情與夫妻關係', intro: '先看這是在做什麼、是否清醒進行，再看別人的經驗。', topics: ['teacher', 'teaching', 'stories', 'questions', 'signup'] },
  family: { label: '親子關係', role: '親子關係', intro: '近期最常見的是「為什麼我和孩子關係不好」，先從活動做什麼與回饋開始看。', topics: ['teacher', 'stories', 'teaching', 'questions', 'signup'] },
  life: { label: '迷茫・人生方向', role: '金錢、健康、事業或人生方向', intro: '正在找方向的人，可以先看上帝視角怎麼幫你打開迷霧。', topics: ['start', 'teacher', 'teaching', 'questions', 'signup'] },
};

// 常見顧慮，會顯示在對應島嶼的卡片上
export const CONCERNS = [
  { id: 'ritual', topic: 'questions', q: '這是不是在做法事？', a: '不是法事。老師用的是一套已在市場上超過 35 年的工具，結合植物能量一起工作；正式說明尚待老師補充。' },
  { id: 'hypnosis', topic: 'teaching', q: '會不會被催眠？我是清醒的嗎？', a: '不是催眠，也不是別人說故事給你聽。你是清醒的，從自己的第一視角走進自己的世界去看。' },
  { id: 'partner', topic: 'teacher', q: '愛情或夫妻關係卡住，適合來嗎？', a: '關係問題是最常見的類型；你的情況是否適合，可以先用 LINE 詢問。' },
  { id: 'child', topic: 'start', q: '為什麼我和孩子關係不好？', a: '這是近期最常出現的問題。活動想做的是換個角度看見卡點；相似案例與回饋尚待老師提供。' },
  { id: 'proof', topic: 'stories', q: '有沒有別人的經驗可以看？', a: '客戶回饋與前、中、後案例會陸續放在這裡；目前尚待老師提供，不展示虛構內容。' },
  { id: 'fit', topic: 'questions', q: '我只是迷茫，沒有特定問題，可以來嗎？', a: '申請條件：無。有疑問可以直接 LINE 詢問，不需要先決定要不要報名。' },
  { id: 'price', topic: 'calendar', q: '費用和場次怎麼看？', a: '價格約 800～1500 元（待確認），依場地與地點而定；每期日期、地點不同，請看活動場次。' },
  { id: 'what', topic: 'teacher', q: '「上帝視角」「植物能量」到底是什麼？', a: '用植物能量帶領你，從更高的角度看見人生卡在哪裡。詳細原理不在頁面深入說明，可私訊詢問。' },
];

// 自動導覽：from/to 為秒。mins 是島上時間（分鐘）。flows 是這一段亮起的關聯線。
export const TOUR = {
  total: 72,
  cues: [
    { from: 0, to: 8, target: 'all', mins: 900, flows: [], caption: '孟婆茶會：用「上帝視角」，看見自己卡住的地方。五座島、兩座橋，就是認識茶會的七個入口。' },
    { from: 8, to: 17, target: 'start', mins: 1080, flows: ['f1'], caption: '旅程從崎嶇島出發：同樣的事一再發生，不知道卡在哪，像在山路上繞圈。想離開，得先走過一座橋。' },
    { from: 17, to: 26, target: 'questions', mins: 1260, flows: ['f1', 'f2', 'f8', 'f10'], caption: '通往茶會的橋，是人們心中的疑問：是不是法事？是不是催眠？先把它說出來。' },
    { from: 26, to: 35, target: 'teacher', mins: 900, flows: ['f2', 'f3', 'f9'], caption: '走過去就是茶會：在活動中換一個更高的角度，看見自己的卡點。' },
    { from: 35, to: 44, target: 'teaching', mins: 720, flows: ['f3', 'f4', 'f8'], caption: '奈何橋說明我們的工作怎麼進行：植物能量帶你看，你全程清醒，從第一視角走進自己的世界。' },
    { from: 44, to: 53, target: 'stories', mins: 720, flows: ['f4', 'f5', 'f9'], caption: '橋的另一邊是繽紛的世界。參加者的前、中、後案例，等老師提供後放在這裡。' },
    { from: 53, to: 62, target: 'calendar', mins: 900, flows: ['f5', 'f6'], caption: '走進繽紛世界之後，想嘗試？先看近期場次（行事曆）。' },
    { from: 62, to: 72, target: 'signup', mins: 1080, flows: ['f6', 'f7', 'f10'], caption: '報名不用填表單，先私訊 LINE 就好。還沒決定也可以問。' },
  ],
};

export const DAY_NOTES = [
  [0, 300, '深夜：燈籠還亮著，迷霧在島的四周。'],
  [300, 480, '清晨：迷霧還沒散，島上很安靜。'],
  [480, 1020, '白天：天空放晴，彩虹出現。（島上的天氣只是裝飾，不代表任何成效。）'],
  [1020, 1200, '黃昏：崎嶇島的火山口發光，燈籠一盞盞亮起。'],
  [1200, 1440, '夜晚：看得到星星。'],
];
export const dayNote = (m) => (DAY_NOTES.find(([a, b]) => m >= a && m < b) || DAY_NOTES[0])[2];

export const INTRO_KEY = 'mengpo-island-onboarded-v2';
export const INTRO_STEPS = [
  { title: '五座島、兩座橋，七個入口', body: '旅程從崎嶇島出發：先走過「心中的疑問」那座有點可怕的橋，來到茶會；再走過奈何橋，看我們的工作怎麼進行，到達繽紛世界；接著是嘗試（場次）與報名。點島或橋看介紹，點小屋與路牌看重點。' },
  { title: '用你的角度看地圖', body: '拖曳旋轉，滾輪（或雙指捏合）縮放，右鍵或雙指拖曳平移；選一座島時鏡頭會飛過去。左下可以拉時間，看島上的一天；按「全景」回到整張地圖，按「導覽」看自動介紹。', touchBody: '單指拖曳旋轉，雙指捏合縮放、兩指一起拖曳平移；選一座島時鏡頭會飛過去。下方可以拉時間，看島上的一天；按「全景」回到整張地圖，按「導覽」看自動介紹。' },
  { title: '把問題整理好，再來聊', body: '收藏你有興趣的島、寫下自己的情況，最後產生一份諮詢提綱，複製後貼到 LINE 官方帳號詢問。內容只存在這個瀏覽器，網站不會代你寄送訊息。' },
];

// ── 搜尋、提綱、儲存（純函式，可在 Node 測試）─────────────────────────────
const haystack = (t) => [t.title, t.tag, t.intro, t.body, t.task, t.question, t.example, ...t.steps.flatMap((x) => [x.label, x.q, x.body]), ...t.facts.flat()].join(' ').toLowerCase();
export function findIslands(query = '', groups = []) {
  const q = query.trim().toLowerCase();
  return ISLANDS.filter((t) => (!groups.length || groups.includes(t.tag)) && (!q || haystack(t).includes(q)));
}
export function makeOutline({ role = '', ids = [], note = '', questions = [] } = {}) {
  const chosen = ISLANDS.filter((t) => ids.includes(t.id));
  const list = chosen.length ? chosen : ISLANDS.filter((t) => t.id === 'teacher');
  return `孟婆島｜報名前諮詢提綱\n我最在意的：${role || '還沒決定'}\n想聊的主題：${list.map((t) => t.title).join('、')}\n\n${list.map((t) => '• ' + t.question).join('\n')}\n\n${questions.length ? '想帶進討論的問題：\n' + questions.map((q) => '• ' + q).join('\n') + '\n\n' : ''}我的情況與問題：\n${note.trim() || '希望先了解孟婆茶會，再決定是否報名。'}\n\n（此提綱只存在你的瀏覽器，網站不會代你寄送。複製後可貼到 LINE 官方帳號詢問。）`;
}
export function readStored(raw) {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
export function cueAt(cues, seconds) {
  const i = cues.findIndex((c) => seconds >= c.from && seconds < c.to);
  return i === -1 ? cues.length - 1 : i;
}
