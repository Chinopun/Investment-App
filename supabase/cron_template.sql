-- Schedule the four edge functions on pg_cron.
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running.
-- Times are in UTC. Digest is timed for Asia/Bangkok (UTC+7, no DST):
--   08:00 Bangkok == 01:00 UTC.  Adjust if you move time zones.

-- fetch-news: every 15 minutes
select cron.schedule(
  'fetch-news-15m',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.functions.supabase.co/fetch-news',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- build-daily-digest: every day at 00:30 UTC = 07:30 Asia/Bangkok
select cron.schedule(
  'build-digest-bkk',
  '30 0 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.functions.supabase.co/build-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- push-digest: every day at 01:00 UTC = 08:00 Asia/Bangkok
select cron.schedule(
  'push-digest-bkk',
  '0 1 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.functions.supabase.co/push-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- breaking-news-watcher: every 15 minutes (offset by 5 so it sees fetch-news's writes)
select cron.schedule(
  'breaking-watch-15m',
  '5,20,35,50 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.functions.supabase.co/breaking-news-watcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
