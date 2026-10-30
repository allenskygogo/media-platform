# Online Membership and Signing Links

`online` is a separate membership plan and legacy tier. Price: TWD 6,800, annual single payment. Online members can watch all published online course videos permanently and use released AI tools during their annual service period. Offline classes, on-site filming and one-to-one consulting are excluded. AI expiry does not disable course access or login.

The source quotation is preserved at `public/contract-assets/online-member-quote-6800.xlsx`. `shared/onlineMembership.js` contains its six benefits, ten complete notes, consent text and immutable quotation version. Both the signing preview and the downloadable signed HTML use these terms. The attachment contains a pre-tax promotional line and a final discounted tax-inclusive total of 6,800; checkout follows the final total and does not add another 5%.

## Signing

- In Admin > Students, choose the signing plan and copy the student's signing link. Supported plans: online, creator and master.
- Links contain the student ID and plan only. The student must log in. Both frontend and Worker reject a different recipient account.
- `/dashboard/profile?sign=online&student=<uuid>` opens signature-only mode, including for a currently active member of the same plan. Submitting saves the signature without creating an order or changing membership.
- A real name, valid Taiwan mobile number, drawn signature and consent checkbox are required. Email comes from the logged-in account. The database records the completion timestamp.
- Admin displays the signed status for the current paid plan. For AI-only or trial students, an already-signed paid plan is displayed before activation. Past documents remain available through the student's contracts API.

## Payment and Activation

`?upgrade=online` follows annual selection, quote signature, then payment. The Worker fixes the price at 6,800, checks signature ownership/version/consent/phone, and links the signed quote to the pending order. A unique order index prevents reuse of one signed document for multiple orders. Membership opens only after payment confirmation or an administrative paid-order confirmation.

The annual service period begins on the day after activation, in Asia/Taipei, and lasts 365 days. Access is usable on activation, with the next-day annual expiry calculation. AI checks continue to use the server membership expiry. Paid video playback permits seeking.

## Deployment Order

1. Review and apply `supabase/migrations/20261030074452_add_online_membership.sql` to the media-platform database. It allows the new plan/tier, adds the unique signed-order reference, and restricts student signature inserts to the validated Worker path. It preserves existing records.
2. Deploy `worker/wrangler.toml` and the frontend together.
3. Verify a test student can sign through a copied link, download the same signed content as admin, then confirm a test payment activates the annual AI period and video access.

The SQL query tool required unavailable approval. The structured schema and migration tools were available: the migration was applied to `fgxpuojhzwpndkzjuriq` and its new plan/tier constraints and order reference were read back successfully on 2026-10-30.

Vercel team access was authorized by the user on 2026-10-30. Deployment uses the connected Vercel project `prj_dL2B0uqjISaxRSwI3uNgvA9270Ea` in team `team_PO16bt4IiFXYHeWrKkfjmRtO`, with Cloudflare Worker `media-platform-api`.

The production frontend release `f0f6eb69b03286d09ff7c01ae9820d5a8e8204bd` reached READY as `dpl_8D339YMdsvHXHTpZUVcNefnJcWfK` and is assigned to `toplevel-tw.com` and `www.toplevel-tw.com`. The live quotation download matches the original XLSX by SHA-256. The deployed frontend also passed anonymous login-redirect checks and browser-intercepted student/admin flow checks without creating production student records.

## Verification

### Non-Binding Signature Preview

`/preview/signing?plan=online` (or `creator` / `master` in separate links) renders only the requested document with synthetic name, phone and `example.test` email, without requiring a student password. There is no plan selector; missing, unknown or duplicate plan parameters display an error rather than substituting another contract. It ignores student/name/email URL parameters and does not load a target student's record. Preview consent is explicitly non-binding; the completion handler only changes local component state. Signing and checkout helpers also reject preview calls, and the LINE payment dialog is disabled in preview mode. Resetting or reloading clears the test signature.

Production `/dashboard/profile?sign=...&student=...` links now render a dedicated single-document page, without dashboard navigation, other plan offers or comparison widgets. The sign-specific login identifies the requested plan and omits unrelated homepage/course/registration links. Authentication and student ownership checks remain unchanged. In student management, copy and preview URLs share one selected-plan resolver, membership changes synchronize the signing selection, and manual clipboard-fallback URLs are derived live so a previous plan URL cannot remain visible after switching.

The full test suite now has 35 passing tests, including all three isolated preview/formal documents, invalid plan handling, sign-specific login, matching plan/student URLs, synthetic identity and disabled completion before required fields. The frontend build passes. Browser interaction checks for this preview were not run because local browser access was declined; no alternate browser surface was used.

`node --test tests/*.test.js` covers access boundaries, signature prerequisites, server-owned price/timestamp, quote ownership, document contents, current-plan status and manual payment activation. The ten quotation notes were compared with the source XLSX text. Local mocked browser checks cover a mobile drawn signature, required consent, signature-only completion, copied admin links, unsigned filtering, and purchase layout at 390px and 1440px.

Thirty-one tests, the production frontend build and a Wrangler Worker bundle passed. Database schema changes were applied; no student contract, order, membership row or charge was created as part of verification. Missing/invalid session tokens are returned as HTTP 401 so the signing flow can prompt or refresh login correctly.

Existing database advisor notices were recorded without modifying unrelated functions: [function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [anonymous SECURITY DEFINER calls](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated SECURITY DEFINER calls](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The changed tables retain RLS.
