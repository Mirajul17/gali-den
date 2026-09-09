# Gali Den

An anonymous, live slang wall. Post a message, it slides into a shared panel
everyone watching sees in real time. A separate page shows the day's top 3
most-used slang terms and top 3 most active posters — both reset to zero
every midnight UTC.

## How it works

- **Anonymous by default.** Each device gets a random id (`Anon#xxxx`) stored
  only in that browser's `localStorage` — never sent anywhere else, never
  tied to an email, IP log, or account. Posting a callsign is optional and
  purely cosmetic (see the "Callsign" button) — it's stored the same way.
- **Live panel.** Every visitor is subscribed to Supabase Realtime, so a new
  message slides in for everyone at once, the same instant.
- **Slang detection.** A moderator-curated dictionary table
  (`slang_dictionary`) is the source of truth — messages are checked against
  it word-by-word and phrase-by-phrase. This is deliberately a lookup, not a
  guess: it's what keeps the leaderboard meaningful and hard to game with
  made-up "slang."
- **Daily, not weekly, ranking.** `/api/rank` only ever looks at messages
  from today (UTC). A once-a-day cron job (`/api/cron/reset`) deletes
  yesterday's rows outright, so the database never grows and there's nothing
  to "restart" — today's board is just whatever's left after the delete.
- **Moderation, built in from day one:**
  - Dictionary terms can be tagged `severe` (slurs / targeted hate speech).
    Any message matching a severe term is hidden from the live feed and
    excluded from ranking automatically — it never reaches other users.
  - Every message has a **Report** button. 5 reports auto-hides it.
  - Per-device rate limiting: a minimum gap between posts and a daily cap,
    so one person can't flood the shared panel.

## Why the dictionary starts almost empty

I seeded only a handful of harmless, unambiguous internet slang terms
("lol," "bruh," "no cap," etc.) so the app works immediately. I deliberately
did **not** pre-load a list of curse words, insults, or region-specific
"gali" — you should add those yourself from the `/admin` page once it's
deployed, tagging anything that's a genuine slur as `severe` as you go. That
keeps the moderation judgment calls in your hands, where they belong for a
platform like this.

---

## 1. Get the code onto GitHub

1. Create a new empty repository on GitHub (github.com → **New repository**,
   don't initialize with a README).
2. On your computer, unzip the project you downloaded from this
   conversation, then from inside that folder run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```

## 2. Create the database (Supabase — free tier)

1. Go to [supabase.com](https://supabase.com) → sign up → **New project**.
   Pick any name/region and a database password (save it somewhere, you
   won't need it for this app but Supabase requires one).
2. Once the project is ready, open **SQL Editor** → **New query**.
3. Open `supabase/schema.sql` from this project, paste its entire contents
   into the editor, and click **Run**. This creates all the tables and
   seeds the small starter slang list.
4. Go to **Project Settings → API**. You'll need three values in the next
   step:
   - **Project URL**
   - **anon public** key
   - **service_role** key (click "Reveal" — keep this one secret, never put
     it in frontend code)

## 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → sign up/log in with GitHub →
   **Add New → Project** → import the repository you just pushed.
2. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service_role key |
   | `ADMIN_SECRET` | make up a long random password |
   | `CRON_SECRET` | make up a second long random password |

3. Click **Deploy**. After a minute or two you'll get a live URL like
   `https://gali-den.vercel.app`.

## 4. Confirm the daily reset cron is active

`vercel.json` already tells Vercel to hit `/api/cron/reset` once a day at
00:00 UTC — Vercel wires this up automatically from the file, no manual step
needed on the free (Hobby) plan for a once-daily job. You can double check
under your Vercel project → **Settings → Cron Jobs**.

## 5. Add your own slang / gali terms

1. Visit `https://your-app.vercel.app/admin`.
2. Enter the `ADMIN_SECRET` you set in step 3.
3. Add terms one at a time — mark anything that's a slur or targeted
   insult as **severe** so it's auto-hidden and excluded from ranking
   instead of shown live.

## 6. Try it

- `/` — the live wall + composer.
- `/ranking` — today's top 3 slang terms and top 3 posters.
- `/admin` — dictionary management (password-protected).

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your real Supabase values
npm run dev
```

## Notes on scaling this later

- If you outgrow polling `/api/rank` every 15s, you can switch it to a
  Supabase Realtime subscription the same way the live feed works.
- The rate limiter and dictionary lookups are simple table scans, fine at
  this scale; if the dictionary grows into the thousands of terms, move the
  matching into a Postgres function so it runs inside the database instead
  of round-tripping the whole table on every message.
- `localStorage`-based anon IDs reset if someone clears site data or
  switches devices — that's the deliberate anonymity/tracking tradeoff
  discussed up front, not a bug.
"# gali-den" 
