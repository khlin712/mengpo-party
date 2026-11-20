# 本機測試讀到舊的模組

基準 c6ef06f。新增 02 島的授課流程時，headless Chrome 一直看不到新卡片，內建瀏覽器也報了已修好的舊錯誤。
實作層：沒有程式問題。`python3 -m http.server` 不送快取標頭，Chrome 對舊檔依修改時間推算「仍新鮮」而不再詢問；測試腳本的暫存設定檔還留著上次的快取，而且 `Network.setCacheDisabled` 沒有先 `Network.enable`，所以沒有生效。
驗證層：先前的畫面（新建築）是新的，容易讓人以為整個頁面都是新檔案；實際上 `architecture.js` 是新的，`content.js` 還是舊的。資源列表中 transferSize 為 0 的就是從快取讀的。
流程層：用「畫面有變化」代替「每個模組都是最新」。
預防：本機驗證用不快取的伺服器（回應 `Cache-Control: no-store`）；Chrome 測試每次刪除設定檔並先 `Network.enable` 再停用快取；除錯時先用 `fetch(url,{cache:'no-store'})` 比對內容與 `performance.getEntriesByType('resource')` 的傳輸大小，再懷疑程式。這只影響本機驗證，不影響正式網址（正式站每個檔案另以 cmp 逐一比對）。
