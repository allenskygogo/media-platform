# 測試版部署準備說明

## 版本定位

目前版本定位為「內部 Beta 測試版」，用於團隊內部與少數朋友檢查公開頁、會員流程、管理後台、封測申請與基礎資料串接。

此版本不適合正式公開營運，也不適合正式公開投流，原因如下：

- 會員登入與管理員權限仍有 mockData / localStorage 測試資料。
- AI 工具部分資料與結果仍可能是 mock data 或前端展示資料。
- 金流尚未正式串接，目前升級 / 結帳流程只是前端流程預覽。
- Email 自動通知尚未正式串接，目前封測後台 Email 僅作為文案預覽。
- Supabase 目前至少只要求 `beta_applications` 可供 `/beta` 申請表測試。
- 正式會員 Auth、付款 webhook、會員方案自動升級、正式 Email 發送都尚未完成。

## 本機 Build

本機部署前檢查使用：

```bash
PATH=/opt/homebrew/bin:$PATH npm run build
```

## Vercel 部署設定

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Node 版本已在 `package.json` 指定：

```json
"engines": {
  "node": ">=20 <23"
}
```

## Vercel 環境變數

測試版建議設定：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

可先留空：

- `VITE_FB_PIXEL_ID`
- `VITE_WORKER_URL`

說明：

- `VITE_SUPABASE_URL`：Supabase project URL。
- `VITE_SUPABASE_ANON_KEY`：Supabase anon key，需搭配 RLS policy。
- `VITE_FB_PIXEL_ID`：留空時 Facebook Pixel 不載入。
- `VITE_WORKER_URL`：留空時 Cloudflare Worker / 影片上傳相關功能不可用。

## 不可放入 VITE_ 的私密 Key

`VITE_` 變數會被打包到前端，任何使用者都可能看到，因此不可放入：

- OpenAI API Key
- Supabase service role key
- Resend API key
- SendGrid API key
- 金流私鑰
- Cloudflare Stream API token
- Webhook secret
- 任何 `sk-` 開頭私鑰

上述私密 key 未來需放在後端、Supabase Edge Function、Cloudflare Worker secrets，或部署平台 server-side env。

## Supabase 最低需求

測試 `/beta` 與 `/admin/beta` 至少需要：

- `public.beta_applications`

Migration：

```text
supabase/migrations/20260526000000_create_beta_applications.sql
```

RLS 方向：

- `anon` / public 可以 insert 申請資料。
- public 不可 select / update / delete。
- admin select / update 目前設計為 Supabase Auth `app_metadata.role = admin`。

注意：

目前專案 admin 權限仍是 localStorage / mock auth，尚未正式接 Supabase Auth。因此測試版中 `/admin/beta` 可能因 RLS 無法直接讀取資料。這是安全的失敗狀態，不應為了方便把 `select` 開給 `anon`。

## 內部 Beta 標示

此文件即為目前版本的正式部署標示：

```text
內部 Beta 測試版
```

若未來需要在 UI 顯示，建議只在 footer 或版本資訊低調顯示 `Beta Test`，不要放在首頁 Hero 或主要轉換區。

## 部署後 QA Checklist

### 公開頁與手機版

- [ ] `/` 首頁可公開開啟。
- [ ] 首頁不是登入頁。
- [ ] 手機版首頁無水平溢出。
- [ ] 手機版 Hero 可看到主標與 CTA。
- [ ] 首頁圖片正常載入。
- [ ] 首頁沒有出現舊文案「試聽課」。
- [ ] 首頁價格與體驗課文案一致。

### 登入與權限

- [ ] `/login` 可正常開啟。
- [ ] 測試帳號可登入。
- [ ] 未登入進 `/dashboard` 會被保護。
- [ ] 未登入進 `/admin` 會被保護。
- [ ] 一般會員不能進入 `/admin`。
- [ ] 管理員帳號可進入 `/admin`。

### 會員後台

- [ ] `/dashboard` 登入後可正常開啟。
- [ ] `/dashboard/profile` 可正常開啟。
- [ ] 方案比較 Modal 可正常開啟。
- [ ] 升級 / 結帳流程清楚標示為前端預覽，不會真的扣款或升級。
- [ ] `/dashboard/courses` 可正常開啟。
- [ ] `/dashboard/courses/1` 課程觀看頁可正常開啟。
- [ ] `/dashboard/ai-tools` 可正常開啟。
- [ ] 手機版會員頁無明顯水平溢出。

### 管理員後台

- [ ] `/admin` 可正常開啟。
- [ ] `/admin/users` 可正常開啟。
- [ ] `/admin/bookings` 可正常開啟。
- [ ] `/admin/ai-analytics` 可正常開啟。
- [ ] `/admin/beta` 可正常進入，或顯示清楚 Supabase / RLS 錯誤。
- [ ] 後台 sidebar 與主要頁面沒有 runtime crash。

### 封測申請

- [ ] `/beta` 可公開開啟。
- [ ] 必填欄位未填會阻擋提交。
- [ ] Email 格式錯誤會阻擋提交。
- [ ] 台灣手機格式錯誤會阻擋提交。
- [ ] motivation 少於 50 字會阻擋提交。
- [ ] 未勾選承諾會阻擋提交。
- [ ] 提交成功後顯示感謝畫面。

### Supabase

- [ ] Vercel 已設定 `VITE_SUPABASE_URL`。
- [ ] Vercel 已設定 `VITE_SUPABASE_ANON_KEY`。
- [ ] Supabase 已執行 `beta_applications` migration。
- [ ] `/beta` 送出後 Supabase `beta_applications` 有新增資料。
- [ ] 新增資料 `status` 預設為 `pending`。
- [ ] 新增資料 `committed` 為 `true`。
- [ ] public 無法 select / update / delete `beta_applications`。

### Console 與風險確認

- [ ] `/` console 無紅色 runtime error。
- [ ] `/login` console 無紅色 runtime error。
- [ ] `/dashboard` console 無紅色 runtime error。
- [ ] `/admin` console 無紅色 runtime error。
- [ ] `/beta` console 無紅色 runtime error。
- [ ] `/admin/beta` 若因 RLS 失敗，需顯示明確錯誤，不應 crash。
- [ ] 確認會員 Auth 仍是測試版 mock/localStorage，不適合正式公開營運。
- [ ] 確認 admin 權限仍是測試版 mock/localStorage，不適合正式公開營運。
- [ ] 確認金流尚未串接。
- [ ] 確認 Email 自動通知尚未串接。
- [ ] 確認不可將私密 key 放入 `VITE_`。
