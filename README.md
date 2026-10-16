# Mathurapur Free Primary School Result Cards

A React/Vite app for creating three-term student result cards and exporting them as PDF or DOCX. Staff sign in with email and password using Supabase Auth. The app does not provide a public sign-up page.

## Create Staff Accounts

Create and manage allowed accounts in the Supabase dashboard; no email list or passwords are stored in the React source.

1. Open **Authentication → Users** in your Supabase project.
2. Choose **Add user** / **Create new user**.
3. Enter the staff member's email address and set a temporary or initial password.
4. Confirm the user/email if the dashboard asks. Share the credentials with that staff member securely.
5. To remove access, disable or delete that user from the same Users page. To change a password, update it through the dashboard or your chosen secure account-recovery process.

The app uses Supabase `signInWithPassword`; visitors cannot create accounts through the app. Keep access to the Supabase dashboard limited to trusted administrators.

## Local Development

Requirements: Node.js and npm.

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Copy the environment template:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Confirm `.env.local` has the project URL and public anon/publishable key from **Supabase → Project Settings → API**:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
   ```

   The `.env.example` in this workspace already has your project URL and publishable key; copying it will carry those values into `.env.local`. The publishable/anon key is intended for browser use. **Never** use a Supabase `service_role` or secret key here; Vite variables are compiled into public browser assets.

4. Start the app:

   ```powershell
   npm run dev
   ```

5. Visit the local URL printed by Vite, usually `http://localhost:5173`.

The app displays a setup screen until both Supabase values are available. Restart Vite after changing `.env.local`.

## Deploy to Vercel

1. Push this project to a GitHub, GitLab, or Bitbucket repository.
2. In Vercel, choose **Add New → Project**, import the repository, and keep the Vite defaults: build command `npm run build`, output directory `dist`.
3. Under **Project → Settings → Environment Variables**, add these for Production (and Preview if needed):
   - `VITE_SUPABASE_URL`: the Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY`: the Supabase anon/publishable key.
4. Deploy. When environment values change, trigger a new deployment because Vite embeds `VITE_*` values at build time.
5. In Supabase **Authentication → URL Configuration**, set the Site URL to your deployed Vercel domain and add any required local or preview URLs to the allowed redirect URL list. Local sign-in uses `http://localhost:5173`.
6. Test the deployed login using an email/password account created in Supabase Authentication → Users.

The `.env.local` file is excluded from Git. Do not put account passwords, service-role keys, or other server secrets in a `VITE_*` variable. Account passwords belong only in Supabase Auth and in the user's password manager.

## Security Scope

Supabase verifies each email/password before the result editor is displayed. The app currently keeps result data in browser memory and does not save it to a database. For persistent student records, add a database with Row Level Security (RLS) policies or a server API that checks the authenticated user's session before reading or writing data. The public anon/publishable key is not a secret; database security must come from Auth and server-side/RLS policies.

## Checks

```powershell
npm run lint
npm run build
```
