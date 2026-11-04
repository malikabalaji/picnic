# Picnic (standalone web app)

Your face. Your photos. Automatically.

Next.js app on Vercel, with Supabase for accounts, database and private photo storage. Faces are detected on the phone; matching runs inside the database, only between people who joined the same event and consented.

Everything below uses free plans. Total time: about 45 minutes the first time.

---

## Part A. Supabase (database, accounts, storage), about 10 minutes

1. Go to **supabase.com**, click **Start your project**, and sign in with GitHub.
2. Click **New project**.
   - Name: `picnic`
   - Database password: click **Generate a password** and save it somewhere safe
   - Region: **South Asia (Mumbai)**
   - Plan: Free
   - Click **Create new project** and wait about 2 minutes until it says the project is ready.
3. In the left sidebar, open **SQL Editor**, then click **New query**.
4. Open the file `supabase/schema.sql` from this folder, copy everything, paste it into the editor, and click **Run**.
   You should see **Success. No rows returned**. If you see an error, you probably ran it twice: create a fresh project and run it once.
5. In the left sidebar, open **Authentication**, then **Sign In / Providers** (on some versions: **Providers**), then **Email**.
   Turn **off** "Confirm email" and click **Save**. This lets testers sign up instantly. (Supabase's built-in email only sends a few emails per hour, so confirmations would fail during testing.)
6. Open **Project Settings** (gear icon), then **API** (or **Data API** and **API Keys**). Copy and keep:
   - **Project URL**, looks like `https://abcdefgh.supabase.co`
   - **anon public** key (or **Publishable** key). Never use the `service_role` or secret key in the app.

## Part B. GitHub (holds the code), about 5 minutes

1. Go to **github.com**, click **+** at the top right, then **New repository**.
   - Name: `picnic-web`
   - Visibility: **Private**
   - Do not add a README. Click **Create repository**.
2. Unzip `picnic-web.zip` on your laptop.
3. On the new repository page, click **uploading an existing file**.
4. Open the unzipped `picnic-web` folder, select **everything inside it** (`app`, `public`, `supabase`, `package.json`, and the rest) and drag it into the browser. Wait for all files to upload, then click **Commit changes**.

   If you use Git on your laptop instead:
   ```
   cd picnic-web
   git init
   git add .
   git commit -m "Picnic first version"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/picnic-web.git
   git push -u origin main
   ```

## Part C. Vercel (puts it online), about 5 minutes

1. Go to **vercel.com** and click **Sign Up**, then **Continue with GitHub**. Choose the **Hobby** plan (free, fine for personal testing).
2. Click **Add New**, then **Project**. Find `picnic-web` and click **Import**. (If it isn't listed, click **Adjust GitHub App Permissions** and give Vercel access to the repo.)
3. Leave Framework as **Next.js**. Open **Environment Variables** and add:

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL from Part A step 6 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon or publishable key from Part A step 6 |

4. Click **Deploy** and wait about 2 minutes. You'll get a link like `https://picnic-web-abc123.vercel.app`. Copy it.
5. Back in Supabase: **Authentication**, then **URL Configuration**.
   - Site URL: your Vercel link
   - Redirect URLs: add `https://picnic-web-abc123.vercel.app/**` (your link plus `/**`)
   - Click **Save**.

Picnic is now live. Every time you change the code on GitHub, Vercel redeploys automatically.

## Part D. Test it with a friend, about 15 minutes

You need two phones (you and a friend). Use good light for selfies.

1. **Your phone:** open your Vercel link. Tap **Create an account**, then complete the consent screen and register your face (3 selfies: straight, turned left, turned right).
2. **Your phone:** tap **Create event**, name it (for example "Picnic test"), keep "Approve people before they join" on, and tap **Create event and QR code**.
3. **Friend's phone:** point the normal camera app at your QR code and tap the link. Picnic opens. They create an account, register their face, then tick both boxes and tap **Request to join**.
4. **Your phone:** open **Alerts** and tap **Approve**.
5. **Your phone:** take a photo of your friend (or a group photo with them in it). In Picnic tap **Share photos**, choose the event, then **Choose from gallery** and pick it. Each photo should show something like **2 faces · sent to 1**.
6. **Friend's phone:** within about 20 seconds the photo appears in **Photos of Me**, with a badge on **Alerts**.
7. Check the privacy controls:
   - Friend taps the photo, then **This isn't me: report wrong match**. It disappears for them, and you see the report.
   - You open **My uploads**, tap a photo and turn off **Share this photo**. It disappears from your friend's collection.
   - Ask a third person to join after the photo was shared. Once you approve them, any photo they appear in reaches them too.
8. **iPhone:** in Safari tap **Share**, then **Add to Home Screen** to open Picnic like an app.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| "The Supabase keys are missing" | Add both environment variables in Vercel (Settings, Environment Variables), then **Deployments**, the latest one, **Redeploy** |
| "Check your email to confirm your account" | Turn off "Confirm email" (Part A step 5), then sign up again with a different email or delete the user in Supabase, Authentication, Users |
| "No face found" during setup | Hold the phone at eye level, face a window, move closer |
| A photo shows "0 faces" | Faces were too small or blurred. Try a closer photo |
| Your friend didn't receive a photo | Check: their face profile is set up, they're approved in the event, matching is on, and the photo's sharing is on. Try strictness **Relaxed** in their Privacy dashboard |
| The QR code opens but says "No active event" | The code was revoked, or the event ended. Open the event and use the current QR |

## Optional: Sign in with Google

1. In **console.cloud.google.com** create a project, open **APIs & Services**, then **OAuth consent screen**, choose **External**, fill in the app name and your email.
2. Open **Credentials**, then **Create credentials**, then **OAuth client ID**, type **Web application**. Under **Authorised redirect URIs** add `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
3. Copy the Client ID and Client secret into Supabase, **Authentication**, **Sign In / Providers**, **Google**, and enable it.
4. In Vercel add `NEXT_PUBLIC_GOOGLE_SIGNIN` = `1` and redeploy. A "Continue with Google" button appears.

## Optional: run it on your laptop

Needs Node.js 20 or later.
```
cd picnic-web
cp .env.example .env.local      # then paste your two Supabase values into .env.local
npm install
npm run dev                     # open http://localhost:3000
```
Add `http://localhost:3000/**` to Supabase Redirect URLs too.

## How it is built

| Part | Where |
| --- | --- |
| Screens and app logic | `app/snapback.js` |
| Styles and design tokens | `app/globals.css` |
| Database tables, security rules, matching | `supabase/schema.sql` |
| Face models (detection, landmarks, recognition) | `public/models/` |

Privacy design:
- Selfies never leave the phone. Only 128-number face signatures are stored, and no user can read them.
- Photos sit in a private storage bucket. Each image is shown through a link that expires after an hour, and only to its uploader or to a person matched in it.
- Matching runs only between people in the same event who consented. People who never joined are never identified.
- Face signatures found in shared photos are kept only while the event is active (so late joiners can be matched) and are deleted when the event ends.
- Organisers can't see other people's photos unless they're in them.

Not in this version yet: phone push notifications, phone number sign-in, and automatic gallery scanning (those need the native iOS and Android apps).
