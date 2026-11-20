依使用者推薦組合完成1-5：LINE主按鈕、三社群合列、Classroom獨立課程資訊、整個連結卡可點/新視窗名稱、手機上下排。6討論清單串接與7最後站導覽不在本次範圍。五個原始href均未改，不新增回覆時間或服務承諾。
contactLink共用https檢查、escaping、target=_blank、noopener/noreferrer。LINE可見名稱與aria-label均為「用 LINE 問老師」加新視窗提示。無資料傳送/儲存或權限變更。Classroom仍是原首頁，使用者導向文案說明邀請碼可向LINE索取，不稱可直接入班。
獨立contact_review發現LINE名稱不一致，已修正並複審關閉；新增正式render的五連結/分區/缺資料/不安全URL/escaping/名稱測試。主代理全套85/85通過，reviewer獨立新測試1/1通過。
隔離Chrome/Metal實拍1440x900、390x844及320x700。手機展開與捲動核對。五連結每個rect至少44x44，詳細卡和document無水平溢出；點LINE卡空白padding觸發精確原始URL的新分頁，攔截外連回傳空白QA頁，未實際傳訊或登入。主代理目視截圖，pageerror=[]。正式站另驗同流程及手機觸控。
未驗實體手機、第三方登入/通訊App跳轉，6和7留待後續。
