# AI 專用會員設定

新增兩個會員方案：

- `ai_trial`：引流課 AI（無線上回放）。
- `ai_subscription`：AI 訂閱（僅 AI 工具）。

後台「學員管理」→「協助開通已購學員」或「編輯」可選擇方案。兩者都必須指定 AI 使用到期日；試用期、月費與額度尚未定案，因此不自動填天數、不啟用定期扣款。這次也不提供新的公開購買入口。

登入後直接進入 `/dashboard/ai-tools`。桌面、側欄與手機只顯示 AI 工具及個人資料。個人資料保留姓名、密碼與效期，隱藏課程方案比較和課程升級視窗。可用 AI 範圍為現有已開放的爆款選題腳本、素材靈感、社群貼文；即將開放的工具仍不開放。

前端直接開啟課程、體驗回放、預約、一般首頁等學生頁面會返回 AI 工具。Worker 課程目錄、進度、影片資訊與播放 token 會驗證 Supabase 身分及伺服器上的有效課程會員，拒絕 AI 專用會員。前端課程 API client 已加入登入 token。

既有 `trial/basic` 是原 NT$980 線上體驗課，保留原權益，不能與新引流課混為一談。`creator/standard`、`master/advanced` 的課程與一年 AI 體系維持原設定。此次沒有批量修改任何既有學員。

不需要增加資料表：現有 `memberships.plan_id` 與 `legacy_tier` 是文字欄位。前後端必須一起部署，新方案才能由後台開通。先部署前端，再部署 Worker，讓課程 API 的新驗證方式與 client 相容。

驗證：`node --test tests/member-access.test.js`、`npm run build`、`node --check worker/index.js`；另以本機隔離瀏覽器測試兩種 AI 身分的桌面／手機／直接網址導向與舊三種課程身分的入口。
