# 卡片標題出現藍色焦點框

使用者在 iPad Safari 截圖指出第①站標題外有藍框。基準 main21495d8；狀態：已定位相符的焦點設定，IAB驗證通過，待iPad人工驗收。

實作：openStation 在開卡後設定 #detail-title tabindex=-1 並呼叫 focus({preventScroll:true})，讓輔助科技與閱讀順序移到標題；標題沒有自訂焦點樣式，可能呈現瀏覽器預設框。截圖與程式相符，未在同一iPad直接重現，不冒稱已量到該Safari的computed值。

修正：只對非互動標題 #detail-title:focus 移除outline，保留程式焦點、按鈕／連結／輸入欄原本focus-visible提示。更新cast.css版本URL，防止既有分頁留用舊樣式。

驗證與流程：先前只驗開卡與內容，沒有檢查不同瀏覽器的程式焦點外觀。修改卡片焦點時，開發者須同驗標題無框、標題仍接收焦點、Tab到控制項仍有可見提示，不能用全域outline:none消除所有焦點。驗證證據見 research/evidence/title-focus；Safari/iPad實機驗收仍待確認。

本輪IAB實測標題active且outlineStyle=none，Tab到PDF按鈕時focus-visible=true、solid 3px，見 [持久化證據](../../research/evidence/title-focus/README.md)。
