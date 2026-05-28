-- Schedule the four edge functions on pg_cron.
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running.
-- Times are in UTC. ET is UTC-5 (winter) / UTC-4 (summer). Pick whichever fits your needs;
-- adjust twice a year, or use multiple cron rows.

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

-- build-daily-digest: weekdays at 11:30 UTC = 06:30 ET (winter) / 07:30 ET (summer)
select cron.schedule(
  'build-digest-630et',
  '30 11 * * 1-5',
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

-- push-digest: weekdays at 12:00 UTC = 07:00 ET (winter) / 08:00 ET (summer)
select cron.schedule(
  'push-digest-700et',
  '0 12 * * 1-5',
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
