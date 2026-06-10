# Codex Handoff - 2026-06-10

This project is the production web app for TOP LEVEL TRAFFIC.

Production site:
- https://toplevel-tw.com

Worker API:
- https://media-platform-api.allen-a76.workers.dev

Vercel project:
- xgfx-allen-s-projects18/media-platform

## Current Production State

- Frontend is deployed to Vercel production and aliased to `https://toplevel-tw.com`.
- Cloudflare Worker `media-platform-api` is deployed.
- The git worktree was clean before this handoff file was added.
- Latest important commit before this file: `cfd79c5 Hide payment provider branding`.

## Payment / Checkout

- Checkout was switched back to ECPay.
- Frontend should not display the provider name "綠界" to customers.
- Public-facing copy now uses generic wording:
  - `立即購買`
  - `前往付款`
  - `付款系統`
- Actual checkout flow still uses ECPay through Worker endpoint:
  - `POST /api/checkout/orders`
- Worker ECPay secrets exist in Cloudflare:
  - `ECPAY_MERCHANT_ID`
  - `ECPAY_HASH_KEY`
  - `ECPAY_HASH_IV`
  - `ECPAY_ENV`
  - `ECPAY_CHOOSE_PAYMENT`
- Worker CORS allows `GET,POST,PUT,PATCH,DELETE,OPTIONS`.

Important files:
- `worker/index.js`
- `src/pages/SalesPage.jsx`
- `src/pages/HomePage.jsx`
- `src/pages/CheckoutResult.jsx`

## Course Covers

- Admin course editor supports uploading course cover images.
- Covers are uploaded through Worker, not directly through frontend Supabase Storage.
- Worker endpoint:
  - `POST /api/admin/course-cover`
- Worker auto-creates/uses public Supabase Storage bucket:
  - `course-covers`
- Course catalog stores only the public cover URL, not base64 image data.
- `src/services/courseCatalog.js` sanitizes old base64 cover URLs before remote sync.
- Student home course cards show compact original card layout with normal 16:9 cover ratio.
- Course detail cover also uses 16:9 ratio.

Important files:
- `src/pages/admin/CoursesAdmin.jsx`
- `src/services/courseCatalog.js`
- `src/pages/dashboard/StandardHome.jsx`
- `src/pages/dashboard/PremiumHome.jsx`
- `src/pages/dashboard/CourseDetail.jsx`
- `src/index.css`
- `worker/index.js`

## Course Progress

- Course progress saves through Worker first.
- Large lesson/course IDs are hashed for Supabase integer columns and mapped back by Worker.
- Completion should save progress and set next lesson resume target.
- Earlier issue: if user finished lesson 1 but did not click lesson 2, refresh could resume lesson 1. Fixes were added around resume target and progress save.

Important commits:
- `de685e6 Save course progress through worker first`
- `8ccbbd9 Support large lesson ids in progress tracking`
- `4fe5977 Apply trial sequencing by course type`
- `97e6932 Persist course progress on mobile exits`

Important files:
- `src/pages/dashboard/CourseDetail.jsx`
- `src/components/LessonPlayer.jsx`
- `src/components/StreamPlayer.jsx`
- `src/services/courseProgress.js`
- `worker/index.js`

## AI Tool State

- Public/open AI tools include:
  - 爆款選題腳本
  - 教知識腳本
  - 說觀點腳本
  - 說故事腳本
  - 曬過程腳本
- Other AI tools remain locked or marked coming soon depending on current UI.
- There is one test account intended to have all AI systems open, per prior work.
- AI script workspace/drafts had fixes for:
  - script switching warning modal
  - per-script topic regeneration
  - draft duplication
  - mobile layout
  - practice writing download threshold and validation

Important file:
- `src/pages/dashboard/AITools.jsx`

## Admin Features Added Recently

- Course/video management supports course types and access-level multi-select.
- Student management supports deletion and last login date.
- Orders admin supports deletion and payment confirmation/opening access.
- Learning progress admin was added, but if progress still shows 0%, check Worker progress mapping and Supabase rows.
- Activity management replaced old trial management naming.

Important files:
- `src/pages/admin/CoursesAdmin.jsx`
- `src/pages/admin/Users.jsx`
- `src/pages/admin/OrdersAdmin.jsx`
- `src/pages/admin/LearningProgressAdmin.jsx`
- `worker/index.js`

## Deployment Commands

Frontend:

```bash
npm run build
npx vercel --prod --yes
```

Worker:

```bash
cd worker
npx wrangler deploy
```

Use Worker deploy whenever `worker/index.js` changes.

## Verification Notes

- There is no lint script currently.
- `npm run build` is the main frontend verification.
- `node --check worker/index.js` is useful before Worker deploy.
- For CORS:

```bash
curl -i -X OPTIONS https://media-platform-api.allen-a76.workers.dev/api/checkout/orders \
  -H 'Origin: https://toplevel-tw.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

## Recent Commit Trail

- `cfd79c5 Hide payment provider branding`
- `37c64a2 Switch checkout back to ECPay`
- `248289a Keep home course covers compact`
- `97447b0 Show course covers on student home`
- `bc191d6 Allow course catalog sync cors`
- `71a5bf8 Upload course covers through worker`
- `d32e5dd Store course covers as public urls`
- `32a44f5 Add editable course covers`
- `8ccbbd9 Support large lesson ids in progress tracking`
- `de685e6 Save course progress through worker first`

## Important User Preferences

- User usually wants direct implementation, build, deploy, and commit.
- Keep design changes minimal unless explicitly requested.
- Do not expose payment provider branding on public checkout buttons.
- Do not remove locked/upcoming features unless explicitly requested; keep them but disable/lock.
- Public-facing Chinese should be Traditional Chinese.

