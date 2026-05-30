# Investment Information App

Personal iPhone app that tracks your stock holdings, aggregates news from ~13 free sources, summarizes the overnight news with AI every morning, and emails you a digest + breaking-news alerts (the emails *are* the iPhone notifications). Tapping a button in the email deep-links into the app's detail screens.

## Features

- **Portfolio home** — live quotes (Yahoo Finance `/v8/finance/chart`), holdings sorted by current value, total + per-position All-time % / abs and Today % / abs.
- **Privacy toggle** — single tap masks every position-level dollar amount across the app (per-share prices stay visible). Persisted in Secure Store.
- **Light / Dark / Auto theme** — pick one in Settings; "Auto" follows the iOS system setting.
- **Add / edit holdings** — tap a row to drill into details, tap the row's pencil icon to edit shares, cost basis, and per-stock breaking-news alerts.
- **Stock detail** — current price + change, embedded SVG chart for 1d / 5d / 1mo with each range's % change shown on its pill, and a feed of recent news for that ticker.
- **Morning digest** — AI-curated brief (Gemini, with Groq fallback) emailed at your preferred time. Materiality-bar prompt: only flags earnings, M&A, regulatory actions, material analyst calls, and >2% moves with a catalyst. Never cites news sources.
- **Breaking-news alerts** — separate emails throughout the day for impactful items (keyword + AI sentiment scored).
- **News aggregation** — every 30 min from Finnhub, Yahoo, Marketaux, Alpha Vantage, NewsAPI, Google News RSS, MarketWatch, CNBC, Reuters, Seeking Alpha, SEC EDGAR, StockTwits, and Reddit. Per-source rate-limit scheduling so daily-quota APIs (Marketaux, NewsAPI, Alpha Vantage) stay comfortably inside their free tiers.

```
Investment Information App/
├── investment-app/   ← Expo React Native app (runs in Expo Go on your iPhone)
│   ├── app/          ← screens (expo-router): tabs, stock/[ticker], digest/[date]
│   ├── components/   ← PortfolioRow, NewsCard, AddHoldingModal, EditHoldingModal
│   ├── lib/          ← theme, prices (Yahoo), supabase client, notifications
│   └── store/        ← Zustand: portfolio, privacy, theme
└── supabase/         ← Schema, cron schedule, Edge Functions (news + AI + email)
    ├── functions/    ← fetch-news, build-daily-digest, push-digest, breaking-news-watcher
    └── migrations/   ← 0001_init.sql
```

---

## 0. Sign up for the free accounts you'll need (~15 min)

All free tiers, no credit cards required:

| Service | Why | Sign up |
|---|---|---|
| **Supabase** | Postgres + cron + Edge Functions | https://supabase.com |
| **Finnhub** | Best per-ticker news (60 req/min free) | https://finnhub.io |
| **Marketaux** | Sentiment-labelled news (100 req/day) | https://www.marketaux.com |
| **Alpha Vantage** | Backup news + sentiment (25 req/day) | https://www.alphavantage.co/support/#api-key |
| **NewsAPI.org** | Broad press coverage (100 req/day) | https://newsapi.org/register |
| **Google AI Studio** | Gemini 2.5 Flash key for AI summaries | https://aistudio.google.com/apikey |
| **Groq** | Llama 3.3 free fallback | https://console.groq.com/keys |
| **Resend** | Sends the notification emails (100/day free) | https://resend.com |

The RSS-based sources (Yahoo, Google News, MarketWatch, CNBC, Reuters, Seeking Alpha, SEC EDGAR, Reddit) and StockTwits need **no signup at all**.

Install **Expo Go** on your iPhone from the App Store — that's how you'll run the app without paying Apple anything.

---

## 1. Local prerequisites

```sh
# Node 20+
node -v

# Supabase CLI
brew install supabase/tap/supabase

# Optional: EAS CLI if you ever decide to build a standalone app later
# npm i -g eas-cli
```

---

## 2. Backend: Supabase project

```sh
cd "Investment Information App/supabase"

# Create the project in the Supabase dashboard first, copy the project ref.
supabase link --project-ref YOUR_PROJECT_REF

# Apply schema + cron schedule
supabase db push

# Insert your user row (this is the one row of personal-app state)
supabase db query "insert into public.users (email) values ('chinopun2008@gmail.com') on conflict do nothing;"

# Store API keys as function secrets
supabase secrets set \
  FINNHUB_KEY=... \
  MARKETAUX_KEY=... \
  ALPHAVANTAGE_KEY=... \
  NEWSAPI_KEY=... \
  GEMINI_KEY=... \
  GROQ_KEY=... \
  RESEND_KEY=... \
  RESEND_FROM='alerts@yourdomain.com' \
  APP_DEEP_LINK_BASE='investment-app://'

# Deploy the four Edge Functions
supabase functions deploy fetch-news build-daily-digest push-digest breaking-news-watcher
```

**Schedule the cron jobs** by opening `supabase/migrations/0002_cron.sql`, replacing `YOUR_PROJECT_REF` and `YOUR_SERVICE_ROLE_KEY`, and running it in the Supabase SQL editor. (Service role key: dashboard → Project Settings → API.)

> **Resend sender setup.** To start, you can use Resend's default `onboarding@resend.dev` sender — set `RESEND_FROM=onboarding@resend.dev`. For better deliverability later, verify any domain you own at https://resend.com/domains and switch the `RESEND_FROM` env var.

---

## 3. Mobile app: run on your iPhone

```sh
cd "Investment Information App/investment-app"

cp .env.example .env
# Edit .env — paste your Supabase URL + anon key (Project Settings → API)

npm install
npx expo start
```

Open **Expo Go** on your iPhone → scan the QR code that prints in your terminal. The app loads over Wi-Fi.

In the app:
1. Tap **+ Add holding** on the Portfolio tab. Search for a ticker (e.g. `NVDA`), enter optional shares + cost basis, hit **Add**.
2. Give the news pipeline 15 minutes — `fetch-news` runs on the quarter-hour. The **News** tab will populate.
3. The morning digest fires on weekdays at the time you set in **Settings** (defaults to 07:00 ET). Tap the CTA button in the email to deep-link back into the app.

---

## 4. Verification checklist

Run these to confirm each layer is healthy:

```sh
# Manually trigger news ingestion right now
curl -X POST -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.functions.supabase.co/fetch-news

# Check rows landed across sources
supabase db query "select source, count(*) from news_articles group by source order by 2 desc;"

# Build today's digest on demand
curl -X POST -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.functions.supabase.co/build-daily-digest

# Send the morning email right now
curl -X POST -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.functions.supabase.co/push-digest

# Probe the breaking-news watcher
curl -X POST -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.functions.supabase.co/breaking-news-watcher
```

You should see:
- An email arrive in your inbox within seconds with the TL;DR as the subject and a styled body.
- iOS shows it as a lock-screen notification.
- Tapping the **Open digest** button launches Expo Go straight into the `/digest/<today>` screen.

---

## 5. Architecture at a glance

```
                ┌────────────────────────────┐
   pg_cron ───▶ │ fetch-news (every 15 min)  │ ──┐
                └────────────────────────────┘   │ writes
                ┌────────────────────────────┐   ▼
   pg_cron ───▶ │ breaking-news-watcher      │ ┌──────────────────┐
                └────────────────────────────┘ │ news_articles    │
                ┌────────────────────────────┐ │ daily_digests    │
   pg_cron ───▶ │ build-daily-digest (06:30) │ │ holdings, users  │
                └────────────────────────────┘ └──────────────────┘
                ┌────────────────────────────┐   ▲ reads
   pg_cron ───▶ │ push-digest (07:00)        │ ──┘
                └────────────────────────────┘
                          │ Resend API
                          ▼
                  📧 your inbox (iOS notification)
                  └─ CTA button → investment-app:// deep link
                                       │
                                       ▼
                            Expo Go app on iPhone
                            ├─ Portfolio (live quotes)
                            ├─ News feed (multi-source)
                            ├─ Stock detail + chart
                            └─ Daily digest detail
```

---

## 6. Future upgrades (later, optional)

- **Real APNs push** instead of email: pay Apple $99/yr, run `npx eas build -p ios --profile development`, swap `sendEmail` calls for `expo-server-sdk` push calls. No other code changes needed.
- **More holdings types**: extend the `holdings` table with `asset_type` to support ETFs, crypto, etc.
- **Sector / macro context** in the digest: have `build-daily-digest` also pull `^GSPC` and sector ETFs into the Gemini prompt.
- **Tap-to-read on the email itself**: replace the CTA button with one section per article when you want a fully self-contained email.
