# 七站標籤縮小驗證

基準 main `6899df8`，分支 `codex/compact-station-labels`。只修改 dist/cast.css 的兩條基礎樣式；沒有改卡片文字、鏡頭、手勢或WebGL策略。

IAB CUA 實測，桌面 viewport2560×1440。原 font 簡寫 CSS.supports=false，computed16px，高33px，圓圈22px。修改後明確12.5px，高24px，圓圈18px；第①站寬221→172px。尺寸是offset，不含hover/selected transform。原始數值見 [sizes.json](sizes.json)，畫面見 [desktop.jpg](desktop.jpg)。

點擊縮小後②標籤，正確開啟入口指引牌卡片，返回全景可用。手機480×844斷點的七站維持10.5px／圓圈17px／高23px，見 [mobile.json](mobile.json)、[mobile.jpg](mobile.jpg)。工具最小viewport限制，未驗390寬及iPhone/Safari實機。

獨立唯讀 agent `/root/label_review`：核對站點建立、樣式順序、路徑及手機覆寫、hover/focus/selected，未發現P0/P1/P2/P3。Reviewer 沒有操作瀏覽器；上述為開發者實測。純CSS視覺修改採實際computed style／畫面／點擊驗證，沒有新增鏡像CSS值的單元測試，未重跑全套JS測試。

未新增依賴、資料寫入或外連；字體無效宣告及防再發紀錄於 .ai-quality/rca/CASE-20261117-station-label-size.md。公開發布後驗證另附PR說明。畫面均為隔離測試網站。
