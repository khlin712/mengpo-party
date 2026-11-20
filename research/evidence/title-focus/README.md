# 卡片標題焦點框修正

2026-11-17（Asia/Taipei），基準main21495d8。只新增 #detail-title:focus{outline:none}，保留 tabindex=-1 與程式focus，控制項focus-visible不變。index採新版cast.css URL。

IAB瀏覽器實際點第①站：activeElement.id=detail-title、outlineStyle=none；按Tab後焦點在「在這裡閱讀PDF」BUTTON，focus-visible=true、outlineStyle=solid、outlineWidth=3px。原始數值見 [focus.json](focus.json)，無框標題見 [heading.jpg](heading.jpg)。截圖保留卡片及附近地圖作為上下文。

這是純CSS樣式與URL引用修正，未新增鏡像CSS值單測或重跑全套JS測試。沒有更動資料、路由、儲存、外連或WebGL。iPad/Safari原始裝置沒有直接實測；不把IAB測試冒稱Safari實機復現。

獨立唯讀agent `/root/title_focus_review` 無阻擋問題，核對精準選擇器、focus callers、focus-visible及資源順序，未做iPad實機；公開站發布後再驗版本化CSS及實際焦點，結果附PR說明。
