# 七站標籤過大

狀態：已修正，瀏覽器驗證通過，待使用者確認。使用者提供全景截圖指出①～⑦標籤過大。基準 source `6899df8`，發布 `887b947`。

## 實作層

`dist/cast.css` 使用 `font:700 12.5px/1.2 inherit`。IAB 瀏覽器實測 CSS.supports 回傳 false，七個標籤 computed font-size 均為16px，offsetHeight33px，編號圓圈22px；因此不能把原碼中的12.5當作實際呈現字級。字體簡寫的inherit不能作為此處font-family的一部分。

本次改為明確的 font-family/font-size/font-weight/line-height，字級12.5px，圓圈18px，縮小gap與padding。路徑標籤及手機字級仍由既有覆寫控制。卡片內文、標題與3D鏡頭不變。

## 驗證與流程層

先前只核對CSS字面值與一般截圖，未針對七站標籤核對computed style，因此未攔下無效宣告。不是新懸崖卡片映射造成；本次僅更動樣式。

## 防再發

修改字體時由開發者在瀏覽器核對computed style及實際外框尺寸，不能以原碼字級代替。交接先讀本案；本案已加入索引。CSS純視覺改動以瀏覽器桌面／手機斷點、焦點與點擊驗證，不新增鏡像CSS值的單元測試。

修正後IAB實測七站字級12.5px、高24px、圓圈18px；第①站寬221→172px，手機480×844維持原10.5px。②點擊開卡及返回正常。驗證證據見 [紀錄](../../research/evidence/compact-labels/README.md)；iPhone／Safari實機未測，不能推定所有瀏覽器完全一致。

## 發布後快取補正

首次CSS發布55afc51，直接HTTP位元比對是新版，但既有IAB公開頁導航及重整仍顯示16px／33px／22px；不能據位元比對宣稱使用者已看到新版。補上index的cast.css版本查詢參數，要求頁面引用新的資源URL，再驗computed style。這是已觀測的舊樣式留存，未據此推斷是哪一層快取。後續CSS發布須同驗資源內容與既有分頁實際computed style。
