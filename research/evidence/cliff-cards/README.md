# 兩座懸崖獨立卡片驗證

基準 `1cbd7f1`，分支 `codex/distinct-cliff-cards`。第一座 pass1/cliff 說明「沒有固定架構」；第二座 pass2/cliff2 說明「批改沒有遵循最小修改原則」，聚焦先改關鍵問題，避免只改用字遣詞與語句細節。山壁保留原說明，標題改以其名稱呈現。

沿用既有側邊卡片，點擊各自名牌、3D 懸崖與棧道分別開對應內容，鏡頭聚焦各自 stop；返回指引牌仍可比較兩條路。導覽增加第二座懸崖入口並沿用抵達、返回及跳過走路機制。文案保留「有效學習路徑不只一條」及不針對特定老師的澄清。

## 驗證

- `npm test`：97/97 PASS，[完整紀錄](tests.log)。山壁標題 fallback 小改後重跑新卡片測試 2/2 PASS（開發者與 Reviewer 各跑一次）。
- 獨立唯讀 agent `/root/cliff_card_review`：無 P0/P1/P2/P3；檢查所有點擊與導覽 callers，實跑全套97項，複核標題小改2項。Reviewer 沒有操作瀏覽器。
- 開發者使用 CUA IAB 本機頁面實點兩個名牌，標題／說明正確；另在隱藏人物後各點兩座懸崖裸露地面，卡片重建且分別開正確內容。目視鏡頭切到不同懸崖。[第一座桌面](desktop-first.jpg)、[第二座桌面](desktop-second.jpg)。
- 手機斷點實測：DOM innerWidth=480、innerHeight=844、shell-mobile=true，卡片展開、返回及兩個選單入口可用。[第一座手機](mobile-first.jpg)、[第二座手機](mobile-second.jpg)。工具 viewport override 有倍率／最小寬度限制，未成功驗到390寬，不能冒稱390或實機。
- 卡片的棧道映射與兩個目標鏡頭由 tests/cliff-cards.test.js 驗證；未逐塊點擊斷裂中的棧道，未重新實跑完整步行導覽。
- 保留既有 WebGL 恢復程式，本次不改動其狀態機、畫質策略、人物路徑或任何儲存資料。無新增後端、依賴或外連。文字經既有 escape 轉義。

Safari／iPhone 真機、390寬與觸控手勢未執行。原有 Safari 黑屏未定因狀態不因本次卡片更新而解除。圖片為隔離 localhost 網頁，不含私人視窗。
