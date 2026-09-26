# Burn Log for iPhone

Burn Log packaged as a native iOS app with [Capacitor](https://capacitorjs.com). It uses iPhone haptics, keeps the screen on in workout mode, works offline, and can sync through Supabase.

`src/app.html` is the only app source. The same file is published as the Claude link
(https://claude.ai/artifact/VMui6Ct3G2CWrQ9qF47yXo). `npm run build` wraps it into `www/` for the app.

```
src/app.html            app source (also the Claude artifact)
scripts/build.mjs       src/app.html -> www/ (local fonts, supabase-js, config.js)
burnlog.config.json     your Supabase URL + publishable key (create from the .example file)
supabase/schema.sql     table + row-level security, paste into the Supabase SQL editor
ios/                    Xcode project (Swift Package Manager, no CocoaPods)
assets/icon.svg         app icon source (icon-1024.png is the rendered version)
```

## Web link (free, no Apple account needed)

The same app runs as a Home Screen web app at **https://pratikjoshi1.github.io/burn-log/**.
Open it in Safari on the iPhone, tap **Share → Add to Home Screen**, then open it from the new icon. It runs full-screen, works offline, and never expires.

```sh
npm run deploy     # rebuild www/ and publish it to the gh-pages branch (live in about a minute)
```

This repo pushes as `pratikjoshi1` through a repo-local credential helper (`gh auth token --user pratikjoshi1`), whichever `gh` account is active.

## 1. One-time Mac setup (native iOS app, optional)

1. Install **Xcode** from the Mac App Store and open it once to accept the license. When it asks for platforms, include **iOS**.
2. Point the command-line tools at it:
   ```sh
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```
3. In Xcode, go to **Settings → Accounts** and add your Apple ID.

## 2. Cloud sync (Supabase + Sign in with Google)

**Supabase**
1. At https://supabase.com, create a project (Free plan). Save the database password in a password manager; nothing in the app needs it.
2. Go to **SQL Editor → New query**, paste `supabase/schema.sql`, and run it.
3. Go to **Authentication → URL Configuration**:
   - Site URL: `https://pratikjoshi1.github.io/burn-log/`
   - Redirect URLs: add `https://pratikjoshi1.github.io/burn-log/**` (and `http://localhost:8080/**` for `npm run serve`)
4. Open **Authentication → Sign In / Providers → Google** and copy its **Callback URL** (`https://<ref>.supabase.co/auth/v1/callback`).

**Google Cloud** (signed in with your personal Gmail)
5. At https://console.cloud.google.com, create a project called "Burn Log".
6. Go to **Google Auth Platform → Get started**:
   - App name: Burn Log
   - Support email: your Gmail
   - Audience: External
   - Then create it.
7. Go to **Audience → Publish app**. Burn Log only asks for your name and email, so Google doesn't need to review it.
8. Go to **Clients → Create client → Web application**:
   - Authorized JavaScript origins: `https://pratikjoshi1.github.io`
   - Authorized redirect URIs: the Supabase Callback URL from step 4
   - Create it, then copy the **Client ID** and **Client secret**.
9. Back in Supabase, open the **Google** provider, turn it on, paste the Client ID and Client secret, and save.

**App config**
10. Copy `burnlog.config.example.json` to `burnlog.config.json` and fill in:
    - **supabaseUrl**: Project Settings → Data API → Project URL
    - **supabaseKey**: Project Settings → API Keys → the *publishable* key

    Then run `npm run deploy`. The publishable key is safe in the app, because row-level security limits each account to its own rows. Never put the Google client secret, the database password, or the Supabase secret/service_role key in the app.

The native iOS build uses email and password, because Google blocks sign-in inside app web views.

## 3. Build and run on your iPhone

```sh
npm install        # first time only
npm run ios        # builds www/, syncs it into ios/, opens Xcode
```

In Xcode:
1. Select the **App** target → **Signing & Capabilities**. Set **Team** to your Apple ID (Personal Team). If Xcode complains that the bundle ID is taken, change it to something unique, like `com.<yourname>.burnlog`.
2. Plug in your iPhone and pick it as the run destination at the top of the window.
3. On the iPhone, go to **Settings → Privacy & Security → Developer Mode**, turn it on, and restart.
4. Press **Run** (⌘R). The first time, iOS asks you to trust the developer: **Settings → General → VPN & Device Management → your Apple ID → Trust**.

**Free Apple ID vs paid:** with a free Personal Team, the app stops opening after **7 days**. Plug in and press Run again to renew it; your data stays. The Apple Developer Program ($99/year) removes that limit and lets you use TestFlight or the App Store. The project is the same either way.

After any change to `src/app.html`, run `npm run ios` again, then press Run.

## 4. Move your existing log from the Claude link

1. On the Claude link, tap the **gear → Copy backup**.
2. In the iPhone app, tap the **gear → Restore from a backup**, paste, and tap **Restore**.
3. Sign in (or create an account) in the same Settings panel. Everything on the phone uploads on first sign-in.

Restoring skips entries you already have, so running it twice is safe.

## How sync works

- The phone keeps a full local copy, and the screen always reads from it, so the app works offline.
- Every change is saved locally and put in an upload queue. The queue uploads right away when online, and again when the app comes to the foreground, when the connection returns, and every 60 seconds.
- After uploading, the app downloads the whole account and applies any changes still waiting in the queue on top. That way deletes made on another device carry over, and an upload in progress is never overwritten.
- The first sign-in on a phone uploads everything already on it. Signing out removes the log from that phone; it stays in your account.
- The gear icon shows a green dot when synced and an orange dot when changes are waiting or sync failed. Free Supabase projects pause after a week without use; resume yours from the dashboard if sync stops.

## Using it on the laptop

The Claude link keeps its own separate log and doesn't sync with the app. To see your synced log on the Mac, run the same app in a browser:

```sh
npm run serve      # then open http://localhost:8080 and sign in
```

## Notes

- Restore a backup on **one** device only. Restore skips entries already on that device, not entries already in your account, so restoring on a second device creates duplicates.

- The rest-timer beep follows the ring/silent switch and doesn't play while the phone is locked. The timer is clock-based, so it stays correct.
- Claude features (reading free-text workouts, coach review) only work on the Claude link. In the app, "Log workout" uses the built-in parser for text like "ran 5 km in 28 min" or "45 min yoga", and the coach review is hidden.
