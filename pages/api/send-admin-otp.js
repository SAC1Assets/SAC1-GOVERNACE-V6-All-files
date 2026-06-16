// ─────────────────────────────────────────────────────────────────────────────
// SableAssent — POST /api/send-admin-otp
// Sends a 6-digit OTP email to authorised executive staff
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, otp } = req.body || {};
  if (!email || !otp) return res.status(400).json({ error: 'Missing email or otp' });

  const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
  if (!SENDGRID_KEY) return res.status(500).json({ error: 'No SendGrid key configured' });

  const nameMap = {
    'daryl@sableassent.net':       'Daryl',
    'admin@sableassent.com':       'Admin',
    'compliance@sableassent.com':  'Compliance Officer',
    'ceo@sableassent.com':         'Chief Executive',
    'cfo@sableassent.com':         'Chief Financial Officer',
    'cco@sableassent.com':         'Chief Compliance Officer',
    'legal@sableassent.com':       'Legal Counsel',
    'operations@sableassent.com':  'Operations',
  };
  const name = nameMap[email.toLowerCase()] || email.split('@')[0];
  const now  = new Date().toUTCString();

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1923;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="480" cellpadding="0" cellspacing="0" style="background:#1a2a3a;border-radius:16px;overflow:hidden;border:1px solid rgba(212,160,23,0.2);">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#1e3a5f,#0f2340);padding:32px 36px;text-align:center;border-bottom:2px solid #d4a017;">
    <div style="width:60px;height:60px;background:#d4a017;border-radius:50%;margin:0 auto 12px;font-size:28px;font-weight:900;color:#1e3a5f;line-height:60px;text-align:center;">S</div>
    <div style="color:#d4a017;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:4px;">SableAssent Global</div>
    <div style="color:#fff;font-size:20px;font-weight:800;">Executive Admin Portal</div>
    <div style="color:#64748b;font-size:12px;margin-top:4px;">One-Time Access Code</div>
  </td></tr>

  <!-- BODY -->
  <tr><td style="padding:36px;">
    <p style="color:#cbd5e1;font-size:16px;font-weight:600;margin:0 0 6px;">Hi ${name},</p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 28px;">
      Your one-time access code for the SableAssent Executive Admin Portal is:
    </p>

    <!-- OTP Box -->
    <div style="background:linear-gradient(135deg,#0f2340,#1e3a5f);border:2px solid #d4a017;border-radius:14px;padding:28px;text-align:center;margin-bottom:28px;">
      <div style="color:#d4a017;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:12px;">Your Access Code</div>
      <div style="color:#fff;font-size:48px;font-weight:900;letter-spacing:0.3em;font-variant-numeric:tabular-nums;">${otp}</div>
      <div style="color:#64748b;font-size:12px;margin-top:12px;">⏱ Expires in 5 minutes</div>
    </div>

    <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px 16px;margin-bottom:24px;">
      <div style="color:#fca5a5;font-size:13px;line-height:1.6;">
        🔒 <strong>Security Notice:</strong> Never share this code with anyone. SableAssent staff will never ask you for this code. If you did not request this, please contact <a href="mailto:security@sableassent.com" style="color:#f87171;">security@sableassent.com</a> immediately.
      </div>
    </div>

    <div style="color:#475569;font-size:12px;line-height:1.7;">
      <strong style="color:#64748b;">Access Request Details</strong><br>
      Email: ${email}<br>
      Time: ${now}<br>
      Portal: admin.sableassent.com<br>
      Session duration: 4 hours
    </div>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:rgba(0,0,0,0.3);padding:20px 36px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
    <div style="color:#334155;font-size:11px;">SableAssent Global · Executive Admin Portal · Restricted Access</div>
  </td></tr>
</table></td></tr></table>
</body></html>`;

  try {
    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email, name }] }],
        from: { email: 'security@sableassent.com', name: 'SableAssent Security' },
        subject: `🔐 Your Admin Access Code: ${otp}`,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (sgRes.ok || sgRes.status === 202) {
      return res.status(200).json({ success: true });
    } else {
      const err = await sgRes.text();
      console.error('SendGrid error:', sgRes.status, err);
      return res.status(500).json({ error: `SendGrid ${sgRes.status}` });
    }
  } catch (err) {
    console.error('OTP send error:', err);
    return res.status(500).json({ error: 'Failed to send OTP email' });
  }
}
