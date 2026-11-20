# 課程文件與聯繫方式

基準502b354。本輪加入使用者提供的兩份Drive PDF與五個聯繫／學習入口，沿用直接發布授權。

## 來源

| 網站顯示名稱 | Drive ID | 原檔名稱 | MIME／大小 |
| --- | --- | --- | --- |
| 為何高中一定要學國寫？ | 1s5ue0r9_nz0S_q2fAsaL6fL42LLv-7GV | 為什麼高中一定要學作文？_compressed.pdf | application/pdf／874792 bytes |
| 116學測班｜教學行事曆 | 1Dm7ROkMDJCHvWmUANFYB5VdzL1mi8RCD | 學測國寫 課程安排260901.pdf | application/pdf／93918 bytes |

以Drive connector讀metadata與文字確認文件；兩份permissions均有anyone/reader。另未登入HTTP請求preview皆200，且隔離Chrome實際顯示PDF。未改動Drive權限、檔案或內容；原PDF未複製至repo，僅保存測試截圖。網站依使用者指定標題顯示，不將文件內歷史成效、日期改寫成額外招生承諾。

聯繫網址逐字沿用使用者提供：
- LINE：https://line.me/ti/p/2rcgyFdA-b
- Facebook：https://www.facebook.com/0kh127
- Threads：https://www.threads.com/@0kh127
- Instagram：https://www.instagram.com/0kh127
- Google Classroom：https://classroom.google.com/

Classroom僅為首頁，不是班級邀請，頁面註明需登入、加入班級請索取邀請。未知價格、報名表單與目前開班狀態仍留白。

## 呈現與實作

起點第一主題與行事曆各有「在這裡閱讀PDF」和「另開完整文件」。PDF使用既有dialog加寬，預覽只在開啟時建立；關閉清除iframe、移除寬版樣式並回到原按鈕。一般說明／提綱仍使用原有尺寸與互動。服務台呈現五個入口，另同步修正關於與提綱中的過時「聯絡方式尚待提供」文字。

資料集中dist/journey.js：DOCUMENTS、documentURLs及CONTACTS。documentURLs只接受自有文件key與合法Drive ID，未知／繼承key不產生URL；外連均noopener/noreferrer。文件或社群連結不會代替使用者傳送訊息。

## 驗證

- npm test：60項通過，涵蓋文件對應、預覽與原檔ID一致、未知／constructor key拒絕、五種聯絡資料，以及既有59項回歸。
- 獨立Code Review發現提綱仍說聯絡方式待提供，已修正並複審關閉；獨立重跑60項通過。Reviewer未操作瀏覽器。
- 主代理未登入的隔離headless Chrome／Metal：桌面1440×900、手機390×844；外部字型略過，其餘Drive服務正常連線。
- 國寫PDF實際顯示封面及9頁控制；行事曆實際顯示課程表。PDF關閉後iframe=0、class已重置、焦點回原data-document按鈕；手機Escape亦通過。
- PDF後開「關於」恢復一般dialog，寬680px；手機頁寬390／捲動寬390，dialog位於視窗內，無水平溢出。
- 五個服務台href與使用者提供網址相符、target=_blank且rel含noopener；Classroom首頁註記可見。沒有點擊發送任何訊息，也未用登入帳號驗證社群帳號管理權。
- 全輪無pageerror。原始讀值與截圖在evidence/course-documents。

未驗證真機Safari/Android與所有第三方登入／App跳轉情境；Drive預覽若不可用仍可使用原檔連結。
