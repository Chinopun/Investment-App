# Investment Information App

A personal iOS application for tracking stock holdings. It aggregates news from 13 free sources, summarizes overnight coverage with AI each morning, and delivers a daily digest plus breaking-news alerts by email — the emails serve as the iPhone notifications. Call-to-action buttons in each email deep-link directly into the app's detail screens.

## Features

- **Portfolio home** — live quotes (Yahoo Finance `/v8/finance/chart`), holdings sorted by current value, with total and per-position all-time %/absolute and today %/absolute figures.
- **Privacy toggle** — a single tap masks every position-level dollar amount across the app; per-share prices remain visible. Persisted in Secure Store.
- **Light / Dark / Auto theme** — selected in Settings. Auto follows the iOS system setting.
- **Add / edit holdings** — tapping a row opens its detail screen; the row's pencil icon edits shares, cost basis, and per-stock breaking-news alerts.
- **Stock detail** — current price and change, an embedded SVG chart for 1d / 5d / 1mo ranges with each range's percentage change shown on its pill, and a feed of recent news for that ticker.
- **Morning digest** — an AI-curated brief (Gemini, with Groq fallback) emailed at the configured notification time. A materiality-bar prompt restricts the digest to earnings, M&A, regulatory actions, material analyst calls, and moves greater than 2% with an identifiable catalyst. News sources are never cited.
- **Breaking-news alerts** — separate emails throughout the day for impactful items, scored by keyword matching and AI sentiment.
- **News aggregation** — runs every 15 minutes across Finnhub, Yahoo, Marketaux, Alpha Vantage, NewsAPI, Google News RSS, MarketWatch, CNBC, Reuters, Seeking Alpha, SEC EDGAR, StockTwits, and Reddit. Per-source rate-limit scheduling keeps the daily-quota APIs (Marketaux, NewsAPI, Alpha Vantage) within their free tiers.

## Repository layout

```
Investment Information App/
├── investment-app/   ← Expo React Native app (runs in Expo Go)
│   ├── app/          ← screens (expo-router): tabs, stock/[ticker], digest/[date]
│   ├── components/   ← PortfolioRow, NewsCard, AddHoldingModal, EditHoldingModal
│   ├── lib/          ← theme, prices (Yahoo), supabase client, notifications
│   └── store/        ← Zustand: portfolio, privacy, theme
└── supabase/         ← Schema, cron schedule, Edge Functions (news + AI + email)
    ├── functions/    ← fetch-news, build-daily-digest, push-digest, breaking-news-watcher
    └── migrations/   ← 0001_init.sql
```

---

## 1. Required services

Every service below operates on a free tier and requires no credit card.

| Service | Purpose | Registration |
|---|---|---|
| **Supabase** | Postgres + cron + Edge Functions | https://supabase.com |
| **Finnhub** | Primary per-ticker news (60 req/min) | https://finnhub.io |
| **Marketaux** | Sentiment-labelled news (100 req/day) | https://www.marketaux.com |
| **Alpha Vantage** | Backup news and sentiment (25 req/day) | https://www.alphavantage.co/support/#api-key |
| **NewsAPI.org** | Broad press coverage (100 req/day) | https://newsapi.org/register |
| **Google AI Studio** | Gemini 2.5 Flash key for AI summaries | https://aistudio.google.com/apikey |
| **Groq** | Llama 3.3 fallback model | https://console.groq.com/keys |
| **Resend** | Delivers notification emails (100/day) | https://resend.com |

The RSS-based sources (Yahoo, Google News, MarketWatch, CNBC, Reuters, Seeking Alpha, SEC EDGAR, Reddit) and StockTwits require no registration.

Expo Go, available on the App Store, hosts the app on-device. No Apple Developer Program membership is required.

---

## 2. Prerequisites

The app targets **Expo SDK 57** (React Native 0.86, React 19.2).

```sh
# Node 20+
node -v

# Supabase CLI
brew install supabase/tap/supabase

# EAS CLI — only required for standalone native builds
# npm i -g eas-cli
```

---

## 3. Backend: Supabase project

```sh
cd "Investment Information App/supabase"

# Create the project in the Supabase dashboard first, then copy the project ref.
supabase link --project-ref YOUR_PROJECT_REF

# Apply schema and cron schedule
supabase db push

# Insert the owner row — the single row of personal application state
supabase db query "insert into public.users (email) values ('owner@example.com') on conflict do nothing;"

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

**Cron scheduling.** Open `supabase/cron_template.sql`, replace `YOUR_PROJECT_REF` and `YOUR_SERVICE_ROLE_KEY`, and run the result in the Supabase SQL editor. The service role key is found under Dashboard → Project Settings → API. The schedule registers four jobs:

| Job | Cron (UTC) | Frequency |
|---|---|---|
| `fetch-news-15m` | `*/15 * * * *` | Every 15 minutes |
| `breaking-watch-15m` | `5,20,35,50 * * * *` | Every 15 minutes, offset by 5 |
| `build-digest-bkk` | `30 0 * * *` | Daily, 00:30 UTC |
| `push-digest-bkk` | `0 1 * * *` | Daily, 01:00 UTC |

Digest delivery is keyed to the `users.notify_time` and `users.tz` columns, which default to `08:00` in `Asia/Bangkok` — matching the `0 1 * * *` UTC push job.

> **Resend sender configuration.** Resend's default `onboarding@resend.dev` sender works immediately: set `RESEND_FROM=onboarding@resend.dev`. For improved deliverability, verify an owned domain at https://resend.com/domains and update the `RESEND_FROM` environment variable.

---

## 4. Mobile app

```sh
cd "Investment Information App/investment-app"

cp .env.example .env
# Populate .env with the Supabase URL and anon key (Project Settings → API)

npm install
npx expo start
```

Launch Expo Go and scan the QR code printed in the terminal. The app loads over the local Wi-Fi network.

First run:

1. Tap **+ Add holding** on the Portfolio tab, search for a ticker such as `NVDA`, optionally enter shares and cost basis, and confirm with **Add**.
2. Allow up to 15 minutes for the news pipeline to populate the **News** tab; `fetch-news` runs on the quarter-hour.
3. The morning digest is delivered daily at the time configured in **Settings**. The call-to-action button in the email deep-links back into the app.

Available scripts:

```sh
npm start          # Expo dev server
npm run ios        # Expo dev server, iOS target
npm run android    # Expo dev server, Android target
npm run typecheck  # tsc --noEmit
```

---

## 5. Verification

The following commands confirm each layer independently.

```sh
# Trigger news ingestion immediately
curl -X POST -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.functions.supabase.co/fetch-news

# Confirm rows landed across sources
supabase db query "select source, count(*) from news_articles group by source order by 2 desc;"

# Build the current day's digest on demand
curl -X POST -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.functions.supabase.co/build-daily-digest

# Send the morning email immediately
curl -X POST -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.functions.supabase.co/push-digest

# Probe the breaking-news watcher
curl -X POST -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT_REF.functions.supabase.co/breaking-news-watcher
```

Expected results:

- An email arrives within seconds, carrying the TL;DR as its subject line and a styled body.
- iOS surfaces the email as a lock-screen notification.
- The **Open digest** button launches Expo Go directly into the `/digest/<today>` screen.

---

## 6. Architecture

```
                ┌────────────────────────────┐
   pg_cron ───▶ │ fetch-news (every 15 min)  │ ──┐
                └────────────────────────────┘   │ writes
                ┌────────────────────────────┐   ▼
   pg_cron ───▶ │ breaking-news-watcher      │ ┌──────────────────┐
                │ (every 15 min, offset 5)   │ │ news_articles    │
                └────────────────────────────┘ │ daily_digests    │
                ┌────────────────────────────┐ │ holdings, users  │
   pg_cron ───▶ │ build-daily-digest (00:30) │ └──────────────────┘
                └────────────────────────────┘   ▲ reads
                ┌────────────────────────────┐   │
   pg_cron ───▶ │ push-digest (01:00 UTC)    │ ──┘
                └────────────────────────────┘
                          │ Resend API
                          ▼
                  📧 inbox (iOS notification)
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

## 7. Roadmap

- **Native APNs push** in place of email: requires Apple Developer Program membership, a build via `npx eas build -p ios --profile development`, and swapping `sendEmail` calls for `expo-server-sdk` push calls. No further code changes are needed.
- **Additional asset types**: extend the `holdings` table with an `asset_type` column to cover ETFs and crypto.
- **Sector and macro context** in the digest: extend `build-daily-digest` to pull `^GSPC` and sector ETFs into the Gemini prompt.
- **Self-contained email**: replace the single CTA button with one section per article.
