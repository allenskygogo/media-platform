# 內部 Beta 測試版 QA Checklist

## 朋友測試說明

可複製給測試者：

```text
這是 TOP LEVEL TRAFFIC 內部 Beta 測試版，不是正式公開版。
目前主要測試首頁、手機版、登入流程、會員後台、方案比較與封測申請。
部分資料仍是測試資料，請不要填寫敏感個資，也不要公開分享網址。
```

## 公開頁面

- [ ] `/` 首頁可開。
- [ ] 首頁不是登入頁。
- [ ] 首頁主要圖片可正常載入。
- [ ] 首頁無明顯破版。
- [ ] 首頁無水平溢出。
- [ ] 方案價格顯示正確。
- [ ] 體驗課顯示 `NT$980`。
- [ ] 頂流達人顯示 `年付 NT$39,800／年`、`月付 NT$3,980／月`。
- [ ] 頂流私塾顯示 `年付 NT$129,800／年`、`月付 NT$14,800／月`。
- [ ] 頂流代操顯示 `專案報價`。
- [ ] 方案比較 Modal 可展開 / 收合。
- [ ] 前端可見文案沒有 `試聽課`。
- [ ] 前端可見文案沒有 `NT$399`。
- [ ] 前端可見文案沒有 `私塾頂流`。

## 手機版

- [ ] 手機版首頁正常顯示。
- [ ] 手機版首頁無水平溢出。
- [ ] 手機版 Hero 可看到主標與 CTA。
- [ ] 手機版 AI 試用區排版正常。
- [ ] 手機版成果案例區排版正常。
- [ ] 手機版最終 CTA 沒有按鈕跑版。
- [ ] 手機版方案比較 Modal 可正常閱讀。

## 登入與會員

- [ ] `/login` 可開。
- [ ] 未登入進 `/dashboard` 會被擋或導登入。
- [ ] 學員登入後可進 `/dashboard`。
- [ ] `/dashboard/profile` 可開。
- [ ] 會員個人資料可正常顯示。
- [ ] 方案比較顯示正確。
- [ ] 升級 / 結帳流程明確顯示為前端預覽。
- [ ] 升級 / 結帳流程不會真的扣款。
- [ ] 升級 / 結帳流程不會真的修改會員方案。

## 管理後台

- [ ] `/admin` 一般學員不能進。
- [ ] admin 帳號可進 `/admin`。
- [ ] `/admin/users` 可開。
- [ ] `/admin/bookings` 可開。
- [ ] `/admin/ai-analytics` 可開。
- [ ] `/admin/beta` 可開，或顯示清楚 Supabase / RLS 錯誤。
- [ ] 後台主要頁面沒有 runtime crash。

## 封測申請

- [ ] `/beta` 可開。
- [ ] `/beta` 手機版正常。
- [ ] `/beta` 必填欄位未填會阻擋提交。
- [ ] `/beta` Email 格式錯誤會阻擋提交。
- [ ] `/beta` 台灣手機格式錯誤會阻擋提交。
- [ ] `/beta` motivation 少於 50 字會阻擋提交。
- [ ] `/beta` 未勾選承諾會阻擋提交。
- [ ] `/beta` 可送出申請。
- [ ] 送出成功後顯示感謝畫面。

## Supabase

- [ ] Vercel 已設定 `VITE_SUPABASE_URL`。
- [ ] Vercel 已設定 `VITE_SUPABASE_ANON_KEY`。
- [ ] Supabase 已建立 `beta_applications`。
- [ ] Supabase 已套用 `supabase/migrations/20260526000000_create_beta_applications.sql`。
- [ ] `/beta` 送出後 `beta_applications` 有寫入。
- [ ] 新資料 `status` 預設為 `pending`。
- [ ] 新資料 `committed` 為 `true`。
- [ ] public 無法 select `beta_applications`。
- [ ] public 無法 update `beta_applications`。
- [ ] public 無法 delete `beta_applications`。
- [ ] `/admin/beta` 可看到申請，或因目前尚未接 Supabase Auth admin 而顯示清楚錯誤。
- [ ] `/admin/beta` 若可讀取資料，可更新狀態或備註。

## Console Error

- [ ] `/` console 沒有阻擋流程的紅色錯誤。
- [ ] `/login` console 沒有阻擋流程的紅色錯誤。
- [ ] `/dashboard` console 沒有阻擋流程的紅色錯誤。
- [ ] `/dashboard/profile` console 沒有阻擋流程的紅色錯誤。
- [ ] `/admin` console 沒有阻擋流程的紅色錯誤。
- [ ] `/beta` console 沒有阻擋流程的紅色錯誤。
- [ ] `/admin/beta` 若因 RLS 失敗，需顯示明確錯誤，不應 crash。

## 安全與風險

- [ ] 沒有私密 key 出現在前端。
- [ ] `.env.local` 沒有提交。
- [ ] `node_modules` 沒有提交。
- [ ] `dist` 沒有提交。
- [ ] `.claude` 沒有提交。
- [ ] localStorage / mockData 已標記為測試版風險。
- [ ] 會員登入仍是測試版 mock/localStorage，不作為正式會員安全系統。
- [ ] admin 權限仍是測試版 mock/localStorage，不作為正式管理員權限系統。
- [ ] 金流尚未開放。
- [ ] AI API 尚未正式串接。
- [ ] Email 自動通知尚未正式串接。
