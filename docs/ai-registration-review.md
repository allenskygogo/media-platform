# AI 自行註冊與 7 天審核

## 操作流程

- 使用者在 `/register?intent=ai` 填姓名、Email、密碼、行業及使用目的。僅建立登入帳號與待審核申請，不建立 AI 使用權限。
- 登入後停在 `/ai-access` 查看狀態，每 30 秒更新。未核准不能进入工具或課程頁。
- 管理員進入「學員管理」頂端的「AI 註冊審核」，確認資料後按「核准 7 天」或「不通過」。
- 核准時間由資料庫決定，期限為核准時間加 168 小時。重複送出核准不會加時。
- 到期後 API 拒絕生成。使用者可申請再開通 7 天，重新進入待審核清單。
- 不通過的申請可聯絡課程顧問。沒有新增寄信、付款或自動扣款。
- 原有課程方案及其 AI 贈送效期不改動；核准時已有有效會員權限會阻擋覆蓋。

## 部署順序

1. 在 Supabase 套用 `supabase/migrations/20260918001000_ai_registration_review.sql`。
2. 部署前端，提供新的註冊/審核介面，並在所有 AI 呼叫附上登入憑證。
3. `wrangler deploy --config worker/wrangler.toml` 部署 Worker。需保留現有 secrets 與 vars；加入 `AI_REGISTRATION_LIMITER` binding。
4. 以專用測試帳號驗證註冊、登入待審核、核准後工具使用、到期拒絕與重申請；完成後清除測試帳號。

## 權限與一致性

- `ai_access_applications` 啟用 RLS，登入者只能讀自己的申請。只有 Worker 的 service role 可以呼叫新增、核准與續申請 RPC。
- 審核 RPC 再檢查管理員身分，鎖定申請與 profile，於同一交易新增 membership 並記錄審核結果。
- 自行註冊採用建立帳號 API，不更新現有帳號密碼；不接受使用者傳入的角色、方案、天數或到期日。
- 註冊每 IP 每分鐘限制 5 次；資料驗證先於帳號建立。申請寫入失敗會清理此次新建的 Auth 帳號。
- 一般 AI、企劃定位、寫作評估均在伺服器檢查會員及精確效期。正式環境 API 失敗不再回傳 mock 內容。
- Email 目前採人工審核，不新增電子郵件驗證流程。

## 驗證

`node --test tests/member-access.test.js tests/planning-conversation.test.js tests/ai-registration.test.js`

`tests/ai-review-db.sql` 是交易內測試，完成會 rollback；可於套用 migrations 的測試 PostgreSQL 執行。測試涵蓋待審核、RPC 權限、精確七天、核准重試、提前續期阻擋、到期重申請、不通過及防止覆蓋既有課程。已用 PGlite 執行通過。
