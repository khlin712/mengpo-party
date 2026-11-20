# 自動角色停留認識老師並反覆抵達提示

基準 fcf3dde，使用者回報。
實作層：初始island=order[0]即teacher，mode=stroll僅在同島漫步；updateMe將所有local route完成均當成跨島onArrive，介面每次吐司提示抵達認識老師。
驗證層：既有測試驗角色外觀／指定目的地，沒驗初始出生點、自動模式及本島漫步不應發抵達通知。
流程層：把NPC散步與使用者手動指定抵達共用無分類通知，造成低價值連續提示。
預防：驗角色從起點出生、預設跨島探索；本島移動不發抵達事件，自動跨島保持安靜，手動指定仍通知。回歸tests/walker-recovery.test.js與瀏覽器toast監測。
