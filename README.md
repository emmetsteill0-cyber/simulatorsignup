[README.md](https://github.com/user-attachments/files/33303449/README.md)
# Weekend Simulator Schedule

A single-page HTML/CSS/JavaScript scheduling site with Supabase authentication, invite-only membership, shared weekend shifts, admin assignments, and a hard four-person shift limit.

## Files
- `index.html` — website interface.
- `schema.sql` — database tables, access policies, and capacity-enforced signup function.
- `supabase/functions/admin-invite/index.ts` — secure admin-only email invitation endpoint.

## 1. Create Supabase project
1. Create a project at https://supabase.com/.
2. In **Project Settings → API**, copy the Project URL and the anon/publishable key.
3. Open `index.html` and replace `PASTE_SUPABASE_PROJECT_URL_HERE` and `PASTE_SUPABASE_ANON_OR_PUBLISHABLE_KEY_HERE`.
   Never put the `service_role` key in `index.html`.

## 2. Set up the database
1. In Supabase, open **SQL Editor → New query**.
2. Paste all of `schema.sql` and run it.
3. In **Authentication → URL Configuration**, set the Site URL to your eventual Vercel URL. Add local development URL and Vercel preview URLs to Redirect URLs if needed.
4. In **Authentication → Providers → Email**, keep email enabled. Supabase email invitations may require SMTP configuration for reliable production delivery; configure custom SMTP under **Project Settings → Authentication/SMTP Settings** if prompted.

## 3. Create the first administrator
1. In Supabase Authentication, invite your own email (or use the function after an admin exists; for bootstrap, use the dashboard).
2. Complete the email invitation and sign in to the site.
3. In Supabase SQL Editor, run this once, replacing the email:
   ```sql
   update public.profiles set role='admin' where email='you@example.com';
   ```
4. Sign out and back in. Your header should say Administrator.

This manual bootstrap is intentional: nobody can self-promote by changing browser data.

## 4. Deploy the admin invitation function
Install the Supabase CLI and sign in, then from the folder containing `supabase/`:
```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy admin-invite
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```
Supabase normally supplies `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Edge Functions. If your environment requires it, set them as secrets too. The service-role key belongs only in Edge Function secrets, never in HTML or a public repository.

The function checks the signed-in caller's profile and role before inviting anyone. If deploying with JWT verification disabled in your Supabase configuration, the function still verifies the user's token itself; do not remove that check.

## 5. Deploy to Vercel
1. Put `index.html`, `schema.sql`, `README.md`, and the `supabase/` folder in a project directory.
2. Push the directory to a private GitHub repository or import it to Vercel.
3. Vercel can serve the static `index.html` directly. No build command is required.
4. Add the production URL to Supabase Auth's allowed redirect URLs and set it as the Site URL.
5. Test in a private/incognito window using a member invitation.

## How the schedule works
- Admins create shifts for any date, including weekends and optional extra days.
- Admins set each shift's title, date, start/end time, location, and notes.
- Members can see the shared schedule and sign themselves up for open slots.
- Each shift has exactly four available places. The database function locks the shift row while checking capacity, preventing simultaneous signups from exceeding four.
- Admins can assign a member, remove an assignment, edit a shift, and delete a shift.
- The date filters initially show the next weekend through the following 90 days. Admins can create shifts on other dates as needed.

## Notes / security
- RLS protects tables; regular members cannot create, update, or delete shifts or assign other users.
- Role changes are restricted to trusted admin actions in the database/function.
- Only invite users you know. Assign administrator role sparingly.
- For a real deployment, consider a custom SMTP provider, backups, and a privacy notice.
