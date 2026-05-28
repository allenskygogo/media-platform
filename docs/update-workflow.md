# Update Workflow

This project is deployed as an internal beta through GitHub and Vercel. After the first deployment, future changes can continue from the local project and redeploy through the same GitHub repository.

## Daily Update Flow

When you want to modify the website later:

1. Edit files locally.
2. Run a local production build:

   ```bash
   PATH=/opt/homebrew/bin:$PATH npm run build
   ```

3. Stage the changed files:

   ```bash
   git add .
   ```

4. Commit with a clear message:

   ```bash
   git commit -m "Describe this update"
   ```

5. Push to GitHub:

   ```bash
   git push
   ```

6. Vercel will automatically deploy the latest pushed commit.

## How Deployment Works

- Turning off the laptop does not affect the deployed website.
- Vercel deploys from the latest version pushed to GitHub.
- Supabase stores database records and does not depend on the local machine.
- Fixed files in `public/images` are deployed with the code.
- Future admin-uploaded images should be stored in Supabase Storage, not only on the local machine.

## Rollback Options

If a new deployment breaks something:

1. Use the Vercel dashboard to roll back to a previous deployment.
2. Or revert a Git commit locally, then push the revert:

   ```bash
   git revert <commit-hash>
   git push
   ```

Vercel will redeploy the reverted version after the push.

## Modification Rules

- Do not edit application code directly on Vercel.
- Do not commit `.env.local` to GitHub.
- Do not commit `node_modules`, `dist`, or `.claude`.
- Private API keys must not be placed in `VITE_` environment variables.
- OpenAI keys, payment keys, email provider keys, and other private secrets must stay server-side only.

## Cloud Storage Recommendations

- Code: GitHub
- Website deployment: Vercel
- Database: Supabase
- Student screenshots, banners, and admin-uploaded images: Supabase Storage
- Course videos: Vimeo, YouTube unlisted, Cloudflare Stream, or Bunny Stream

## Internal Beta Reminder

This version is for internal beta testing. It is not yet a full production release. Before public launch, confirm real authentication, payment flow, email delivery, storage, and security rules.
