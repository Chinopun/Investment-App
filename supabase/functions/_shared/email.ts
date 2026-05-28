// Resend wrapper — primary notification channel (email-to-self).
// 100 free emails/day on the Resend free tier — plenty.

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const key = Deno.env.get('RESEND_KEY');
  const from = Deno.env.get('RESEND_FROM') ?? 'onboarding@resend.dev';
  if (!key) {
    console.warn('RESEND_KEY missing; skipping email');
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text,
    }),
  });
  if (!res.ok) {
    console.warn('resend failed', res.status, await res.text());
    return false;
  }
  return true;
}

export function emailFrame(opts: {
  preheader: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footer?: string;
}): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f5f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111;">
  <span style="display:none;font-size:0;color:transparent;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden">${opts.preheader}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr><td align="center" style="padding:24px 16px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
        <tr><td style="padding:24px 24px 8px 24px;font-size:13px;color:#888;letter-spacing:.5px;text-transform:uppercase">Investment Info</td></tr>
        <tr><td style="padding:0 24px 8px 24px">${opts.bodyHtml}</td></tr>
        <tr><td style="padding:16px 24px 24px 24px">
          <a href="${opts.ctaUrl}" style="display:inline-block;background:#0a84ff;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">${opts.ctaLabel}</a>
        </td></tr>
        ${opts.footer ? `<tr><td style="padding:16px 24px;border-top:1px solid #eef0f4;color:#888;font-size:12px;line-height:18px">${opts.footer}</td></tr>` : ''}
      </table>
    </td></tr>
  </table>
</body></html>`;
}
