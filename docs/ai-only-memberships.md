# Free AI access

The only AI-only account type is now `ai_free` (AI 使用者／免費). The NT$99 AI trial and AI subscription identities are retired. No AI pricing, recurring billing, automatic paid conversion, or user-count billing trigger is enabled. Future pricing and the activation threshold require a separate decision.

Admins can provision or edit free AI users. Expiry is optional; blank means no expiry. Migrated accounts retain their existing expiry and status. Public registration is not added in this change.

AI users land at `/dashboard/ai-tools` and see only tools and their profile. Courses, replay and booking remain inaccessible. Available tools and existing course memberships (including their one-year AI benefits) remain unchanged. AI plans cannot create paid checkout orders.

After frontend and Worker deployment, apply `supabase/migrations/20260917002000_replace_ai_plans_with_free_access.sql`. It converts old AI membership rows to `ai_free` while preserving status, expiry and other data, then constrains writes to current plans. Old identifiers remain recognized by read/access logic for compatibility; admin assignment rejects them.

Validation: `node --test tests/member-access.test.js`, `npm run build`, `node --check worker/index.js`. Coverage includes AI/course isolation, existing course access, optional free expiry, rejection of retired plans and paid AI checkout.
