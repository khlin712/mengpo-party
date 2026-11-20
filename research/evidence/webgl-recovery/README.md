# 有界 WebGL 恢復驗證（2026-11-17）

基準 main `f5b3134`，分支 `codex/bounded-webgl-recovery`。報告與紀錄隨修正提交；實際發布 commit 請查本 PR 合併紀錄。原始 Safari 整頁黑屏根因未定。

## 行為與範圍

首次 lost 停止 3D 繪製、隱藏失效名牌，保留清單與卡片。等待原生 restored 最多 8 秒；120 秒內再 lost 便停止自動恢復。尚未進入手動停止時，首次或距上次至少 120 秒的 lost 允許瀏覽器恢復；窗口內重複 lost 阻止 Three.js 重新允許恢復，避免底層循環。逾時晚到的 restored 事件不會擅自繼續繪製。

恢復時先降低畫布到不超過 1 倍、關陰影／雨／彩虹，再讓 Three.js 初始化恢復資源；第一幀真正成功後才提示恢復。當次頁面固定低負載，告示牌不得強制提高。沒有自動整頁重載，也沒有呼叫擴充功能強制恢復。使用者可在 context 已恢復時按「重試地圖」；仍遺失時按明確標示的「手動重新整理頁面」，儲存本次分頁省電設定再重載。這是手動操作，並非自動流程；沒有承諾跨整頁重載保留鏡頭／卡片。

畫質鎖定需要 600ms 穩定，距離 16 進入／19 退出；鏡頭飛行與拖曳中不切解析度，避免額外畫布配置。真正視窗尺寸改變仍需 resize。

## 證據與結果

| 驗證 | 結果 | 紀錄 |
| --- | --- | --- |
| 單元回歸 | PASS，95/95；含狀態機、晚恢復、重複中斷、capture 事件次序、低負載天氣、解析度 | [unit-tests.log](unit-tests.log)，命令 `npm test` |
| Chrome 桌機 DPR2，受控 lost→restored | PASS，保留鏡頭與卡片、timeOrigin 不變、ratio 2→1、關陰影、解鎖告示牌 | [recovery-browser.json](recovery-browser.json)、[腳本](webgl-recovery.mjs) |
| Chrome 模擬手機，8 秒逾時／晚恢復／手動重試／明確手動重載 | PASS；只有明確手動重載才改 timeOrigin，重載後省電 | 同上，mobile 是模擬視窗，不是實機 |
| Chrome 重複中斷 | PASS；第二次停 manual，context 保持 lost，無自動導航 | 同上，原生事件位於 `instrumentation.gl`，頂層 `glEvents` 是未使用的空欄位 |
| 畫布尺寸寫入 | 初始 width/height 兩次、降倍率再兩次；飛行期間零次 | 同上 `instrumentation`；不是零尺寸配置或保證零閃屏 |
| 飛行期間畫質緩衝 | PASS，9 個飛行樣本無 qualityChanges 增加；落定後升回 2 一次 | [quality-flight.json](quality-flight.json)、[腳本](quality-flight.mjs)；35ms 人工主執行緒延遲促成降畫質，不是真機 FPS 壓測 |
| Safari 無注入新舊對照 | PASS 僅指新版停止循環：舊末次取樣 67 lost／67 restored；新 2 lost／1 restored，manual 不再增長 | [safari-compare.json](safari-compare.json)、[採樣腳本](safari-compare.py)、[注入唯讀 logger 的伺服器](compare-server.py) |
| Safari 前景自動恢復完整流程 | **未通過**：主動注入前已有原生 lost→restored→lost，停 manual，無法驗收成功恢復路徑 | [失敗紀錄](safari-recovery-foreground.log)、[注入前樣本](safari-recovery-progress.json)、[腳本](safari-recovery.py)；此失敗不可報作成功恢復 |
| iPhone／iPad 實機、原始 Safari 整頁黑屏根因、長時間恢復 | NOT_RUN／未定因 | 不以模擬或防循環成功替代 |

Chrome 使用獨立 Playwright profile，Mac Chrome headless Metal，1440×900／手機模擬；Safari 使用本機新開 localhost 文件、僅關閉自行開啟的測試視窗。未修改使用者原頁面。AppleScript 程式執行需本機授權；未為測試改瀏覽器偏好。Safari 對照 logger 只計事件，不介入恢復；其 baseline 目錄已改成泛用 `/tmp/island-baseline/dist` 供重跑。Chrome 腳本預期 Playwright 在 `/tmp/fork-browser`；這是可重跑測試工具，並非網站依賴。

這些測試證明有界緩解與 Chrome 受控恢復；無法證明 Safari 初始 context 遺失原因、原始整頁黑屏已修好，或底層中斷完全不黑一下。新舊 Safari 都出現原生中斷，故不將既有硬體／瀏覽器失效當作新版新增的恢復成功。

## 畫面證據

[等待恢復](recovery-waiting.png) · [Chrome 低負載恢復](recovery-safe.png) · [模擬手機逾時手動操作](recovery-timeout-mobile.png)。均為隔離測試網站，不含私人視窗。使用者已允許錯誤提示截圖及去識別監測資料同步 GitHub。

## 審查與交付

獨立 Code Reviewer（隔離 agent `/root/recovery_review`）：無 P0/P1/P2；P3 dispose 清理已修正並複核。capture 事件修正另審查，8 個事件／恢復測試通過。Reviewer 未操作 Safari，不用程式審查替代本機觀測。報告獨立審查結果另記 review.md。

無新增依賴、資料後端、遠端監測上傳；事件紀錄最多 40 筆留在頁面記憶體。唯一新增持久值是分頁的省電旗標；無清除討論清單。回滾可重發先前 `dist`，但會失去防循環保護。

瀏覽器規格依據：[Khronos WEBGL_lose_context](https://registry.khronos.org/webgl/extensions/WEBGL_lose_context/)。測試使用擴充功能注入不等於實際 GPU 故障；正式程式不以擴充功能強制復原。

## 正式發布後驗證

PR #41 合併 source `dddd7ac9839e290b4a8e4d5c76b62051e1761137`；gh-pages `ae0d0f03a87aa81a4c6d083e14f75298fe844788`。首次檢查 Pages 尚未更新；等新模組可存取後才重驗，沒有把舊頁結果當作通過。

[正式資源雜湊](production-bytes.json)：world/recovery/resolution/weather/app/index/cast 七個資源與發布 dist 全部逐位元一致。[正式 Chrome 驗收](production-smoke.json)、[腳本](production-smoke.mjs)：首次受控中斷恢復、鏡頭／卡片保留、低負載；第二次停 manual 並維持 contextLost。唯一 navigation 為首次載入，沒有 pageerror。這是隔離 profile 的公開站故障注入，並非 Safari 硬體成功恢復證據。

人工驗收仍待使用者確認；Safari 與實機限制維持上文，不因發布而解除。
