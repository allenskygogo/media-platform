# AI 線上註冊與自動 7 天試用

## 現行變更（2026-10-01，尚待部署）

- `/register?intent=ai` 填姓名、Email、台灣手機、密碼、行業及使用目的即可建立帳號，不需人工審核。
- 註冊完成後提供登入入口；第一次登入自動建立 `ai_free` 會員，直接進入 `/dashboard/ai-tools`。
- 起算時間由資料庫決定，期限固定為 168 小時。註冊後尚未登入不扣試用天數；重複登入、到期或刪除試用會員紀錄均不會重新贈送。
- 手機正規化為 `09` 開頭 10 碼，存於申請資料，管理員學員清單可查看；沒有增加簡訊驗證或寄信。
- 到期後 API 停止生成，前端顯示到期狀態，不自動扣款。
- 舊人工審核申請及續申請維持原規則；自助註冊會員不可自行續領試用。
- 原課程與管理員開通的 AI 會員不改變效期或權限；AI 試用不開放課程。

## 部署順序

1. 確認資料庫尚未套用的 `20260918001000_ai_registration_review.sql`，必要時先套用。
2. 套用 `supabase/migrations/20261001001000_self_service_ai_trial.sql`。
3. 部署 Worker：`node_modules/.bin/wrangler deploy --config worker/wrangler.toml`，保留現有 secrets 與 vars 及 `AI_REGISTRATION_LIMITER`。
4. 合併已驗證分支至 main 並推送，等待 Vercel 前端部署完成。
5. 以專用測試帳號驗證註冊、手機保存、第一次登入直接進入 AI、固定效期與到期拒絕。不要修改既有學員。

## 權限與驗證

- 申請資料啟用 RLS，登入者只讀自己的資料。新增註冊／試用 RPC 僅 service role 可執行，Worker 使用驗證後的登入者 ID。
- 試用啟動鎖定 profile 與申請資料，交易內新增會員並記錄起算；防止同時登入重複開通。
- 註冊只建立新帳號，不重設既有密碼；不接受呼叫者傳入的角色、方案、期限。
- 每 IP 每分鐘 5 次註冊限制；驗證先於帳號建立，資料庫失敗會清理此次新建 Auth 帳號。
- 一般 AI、企劃定位與寫作評估均檢查登入、有效會員與精確效期。
- Node 測試：`node --test tests/*.test.js`。
- 資料庫測試：依序套用上述 migrations，再執行 `tests/ai-review-db.sql` 與 `tests/ai-self-service-db.sql`；兩者均 rollback。
