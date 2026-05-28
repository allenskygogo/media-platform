# 封測申請系統交接 notes

## 定位

- `beta_applications` 是封測申請表，不是正式會員帳號資料表。
- `approved` 只代表通過封測審核，不代表已建立正式會員帳號。
- 目前 Email 通知只提供後台預覽與 mailto，不會自動寄出。

## localStorage fallback

- localStorage fallback 只允許開發測試使用。
- 正式環境如果 Supabase 未設定或讀寫失敗，前台與後台都應顯示錯誤，不應假裝成功。
- 後台出現 localStorage fallback 提示時，代表目前看到的是本機測試資料，不是正式 Supabase 資料。

## Admin 權限風險

目前會員系統仍是 localStorage auth，admin 判斷來自前端 `currentUser.role === 'admin'`。
這只能保護 UI，不能保護 Supabase 資料。正式環境不應把 `beta_applications`
的 select/update RLS 直接開給 anon。

安全做法：

1. 短期：後台讀寫申請資料走 server API / Supabase Edge Function / service role。
2. 中期：導入 Supabase Auth，將 admin role 放在 server-controlled `app_metadata`。
3. 長期：用 RLS 控制 admin select/update，學員與申請資料依 `auth.uid()` 隔離。

## 後續會員開通流程建議

1. 管理員在 `/admin/beta` 將申請狀態改為 `approved`。
2. 系統寄出封測通過信與開通連結。
3. 使用者透過 invite link 建立 Supabase Auth 帳號。
4. 建立 `profiles` / `memberships` 資料，標記 `beta` plan 或 role。
5. 封測期結束後再轉換成正式會員方案。

## Email 最小正式方案

- 建立 Supabase Edge Function，例如 `send-beta-email`。
- 使用 Resend / SendGrid API key，並將 key 放在 Supabase secrets。
- 後台通過/拒絕時呼叫 Edge Function。
- Edge Function 需要驗證 admin 身分後才寄信。
- 不要把任何第三方 Email API key 放在前端。
