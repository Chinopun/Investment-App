// Pulls today's pre-built digest and emails it. Subject line *is* the notification preview.
// Runs at the user's preferred notify_time via pg_cron.

import { adminClient } from '../_shared/db.ts';
import { sendEmail, emailFrame } from '../_shared/email.ts';

function mdToHtml(md: string): string {
  // Minimal markdown → HTML for digest emails.
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.*)$/gm, '<h3 style="margin:18px 0 6px 0;font-size:15px">$1</h3>')
    .replace(/^## (.*)$/gm, '<h2 style="margin:22px 0 6px 0;font-size:18px;color:#0a84ff">$1</h2>')
    .replace(/^# (.*)$/gm, '<h1 style="margin:8px 0 12px 0;font-size:22px">$1</h1>')
    .replace(/^- (.*)$/gm, '<li style="margin:4px 0">$1</li>')
    .replace(/(?:^|\n)((?:<li[\s\S]*?<\/li>\s*)+)/g, '\n<ul style="padding-left:18px;margin:6px 0">$1</ul>\n')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '<br><br>');
}

Deno.serve(async (_req) => {
  const sb = adminClient();
  const today = new Date().toISOString().slice(0, 10);
  const appBase = Deno.env.get('APP_DEEP_LINK_BASE') ?? 'investment-app://';

  const { data: users } = await sb.from('users').select('id, email');
  const results: any[] = [];

  for (const u of users ?? []) {
    const { data: digest } = await sb
      .from('daily_digests')
      .select('*')
      .eq('user_id', u.id)
      .eq('digest_date', today)
      .maybeSingle();
    if (!digest) { results.push({ user: u.email, skipped: 'no digest yet' }); continue; }
    if (digest.sent_at) { results.push({ user: u.email, skipped: 'already sent' }); continue; }

    const subject = digest.subject_line || `Morning markets — ${today}`;
    const html = emailFrame({
      preheader: subject,
      bodyHtml:
        `<div style="font-size:13px;color:#888;letter-spacing:.5px;text-transform:uppercase;margin-top:8px">${today}</div>` +
        `<div style="font-size:18px;font-weight:700;margin:6px 0 12px 0">${subject}</div>` +
        `<div style="font-size:15px;line-height:22px">${mdToHtml(digest.body_md)}</div>`,
      ctaLabel: 'Open full digest in the app',
      ctaUrl: `${appBase}digest/${today}`,
      footer: 'Sent because you set a morning digest in Investment Info. Tap the button to open the app for full details and charts.',
    });

    const ok = await sendEmail({ to: u.email, subject, html, text: digest.body_md });
    if (ok) {
      await sb.from('daily_digests').update({ sent_at: new Date().toISOString() }).eq('id', digest.id);
    }
    results.push({ user: u.email, sent: ok });
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
