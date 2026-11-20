# 孟婆島

「孟婆茶會」的互動 3D 介紹島。參加活動，就能以「上帝視角」看見自己卡住的人生問題，打開迷霧、跳出迴圈。

目標網址：https://khlin712.github.io/mengpo-party/

本專案由[作文學習島](https://khlin712.github.io/gsat-writing-class-island/)的引擎改編而來（原站不受影響）；內容、造型與動線依兩份對談筆記重新設計。

## 本機預覽與測試

`npm start`（Python 3），開啟 http://127.0.0.1:4173/ 。`npm test`（Node.js），不需安裝套件。

## 動線與場景

白天、天空上的島，永遠有彩虹，不下雨（`dist/weather.js` 的 `NO_RAIN`；島上時間停在下午，按「時段」才切換）。外圍七站繞成一圈：

① 崎嶇島（火山與崎嶇山路，象徵困境）→ ② 橋頭 → ③ 奈何橋（橋下有河，河上漂蓮花，點蓮花讀客戶回饋）→ 繽紛遊樂園（摩天輪）→ ④ 回饋島 → ⑤ 活動場次 → ⑥ LINE 報名 → ⑦ 服務台 → 回崎嶇島。

橋頭右側是崎嶇的山路（崖邊、陡峭山壁），比喻「卡在迴圈裡」；中間三座島是「孟婆茶會在做什麼」「植物能量怎麼帶你看」「常見疑問與顧慮」。全站兩個主按鈕：查看活動場次、私訊 LINE 報名／索取報名連結。

## 還需要老師提供（目前一律顯示「待提供」，不虛構）

- LINE 官方帳號網址：`dist/journey.js` 的 `CONTACTS`、`LINKS`
- 近期場次（日期、地點、名額）：`CLASSES`；價格確認後填 `PRICING.facts`（目前約 800～1500 元，待確認）
- 客戶回饋（需本人同意）：`FEEDBACK`；前、中、後案例：`dist/content.js` 的 `stories`
- 活動與課程照片、可公開的活動影片：`VIDEOS`
- 待確認用語：列穆里亞、「植物花與星際」的共振頻率、累計人數與場次

## 發布

`main` 存完整原始碼，`gh-pages` 存 `dist/` 的網站內容；所有資源使用相對路徑。

```sh
npm test
git push origin main
git subtree push --prefix dist origin gh-pages
```

Three.js 0.180.0 與附屬模組隨站提供，MIT 授權見 `dist/vendor/LICENSE`。訪客的筆記與問題只存在瀏覽器，不會代發訊息。
