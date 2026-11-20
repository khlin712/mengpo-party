# 刷新後錯誤橋學生倒走

基準 fcf3dde，使用者發現。修正前讀碼確認：buildGraph為每條路產生正反兩條edge；開場學生只按kind和from尋找第一條edge，當from=pass1時先找到pass1→fork，當from=pass2時先找到pass2→pass1。dir=1只是沿選到的路線增加距離，不能證明前往路線終點。

實作層：初始化少核對to端點，誤用雙向圖中的反向邊。
驗證層：原測試只數4位正確橋／16位錯誤橋，以及dir正值，未按指引牌→懸崖1→懸崖2→攀岩入口檢查實際目標及幾何方向。
流程層：把沿route正向誤認為沿旅程正向，未以刷新場景的世界座標變化驗收。

預防：初始化橋上人物須同驗from、to與幾何trailU單調增加；刷新後所有錯誤橋開場學生向前，並保留導覽員主動返回的雙向路線。入口AGENTS.md／本索引與tests/walker-recovery.test.js。
