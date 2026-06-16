// ─────────────────────────────────────────────────────────────────────────────
// SableAssent — POST /sendWelcomeEmail
// Sends a branded welcome email to new SAC1 customers after first purchase
// Called by paypalCaptureOrder and stripeWebhook on first-time buyers
// Body: { email, name, sac1Amount, amountUsd, orderId }
// ─────────────────────────────────────────────────────────────────────────────

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Content-Type': 'application/json',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST')    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });

  const SENDGRID_KEY = Deno.env.get('SENDGRID_API_KEY') ?? '';
  if (!SENDGRID_KEY) return new Response(JSON.stringify({ error: 'No SENDGRID_API_KEY' }), { status: 500, headers: cors });

  let body: { email?: string; name?: string; sac1Amount?: number; amountUsd?: number; orderId?: string };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: cors }); }

  const { email, name = '', sac1Amount = 0, amountUsd = 0, orderId = '' } = body;
  if (!email) return new Response(JSON.stringify({ error: 'email required' }), { status: 400, headers: cors });

  const firstName = name.split(' ')[0] || 'Valued Member';
  const now = new Date().toISOString();

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,95,.10);">

<!-- HEADER -->
<tr><td style="background:linear-gradient(135deg,#1e3a5f,#0f2340);padding:36px 36px 28px;text-align:center;">
  <div style="width:72px;height:72px;background:#d4a017;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:#1e3a5f;line-height:72px;">S</div>
  <div style="color:#d4a017;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:8px;">Welcome to SableAssent Global</div>
  <div style="color:#fff;font-size:26px;font-weight:800;margin-bottom:6px;">You're now a SAC1 holder.</div>
  <div style="color:#94a3b8;font-size:14px;">The future of regulated digital settlement.</div>
</td></tr>

<!-- WELCOME BAND -->
<tr><td style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border-top:3px solid #d4a017;border-bottom:1px solid #fde68a;padding:16px 36px;text-align:center;">
  <span style="font-size:14px;font-weight:700;color:#92400e;">🪙 ${sac1Amount > 0 ? `${sac1Amount.toLocaleString()} SAC1 purchased · Dispatch in progress` : 'Your SAC1 account is active'}</span>
</td></tr>

<!-- BODY -->
<tr><td style="padding:32px 36px;">
  <p style="color:#374151;font-size:17px;font-weight:600;margin:0 0 8px;">Hi ${firstName},</p>
  <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 28px;">Welcome to the SableAssent ecosystem — a regulated, compliance-first platform for cross-border digital asset settlement. You've just taken your first step into a borderless financial future.</p>

  <!-- What is SAC1 -->
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin-bottom:24px;">
    <div style="font-weight:800;color:#1e40af;font-size:15px;margin-bottom:12px;">🔵 What is SAC1?</div>
    <p style="color:#1e40af;font-size:14px;line-height:1.7;margin:0;">SAC1 is a regulated digital settlement token on the Polygon PoS network. It's used for fast, low-cost cross-border transfers across the SableAssent global network — powering remittances, treasury operations, and ecosystem governance.</p>
  </div>

  <!-- Your ecosystem -->
  <div style="font-weight:700;color:#1e3a5f;font-size:15px;margin-bottom:16px;">🌐 Your SableAssent Ecosystem</div>
  <table width="100%" style="border-collapse:collapse;margin-bottom:24px;">
    <tr>
      <td style="padding:10px 14px;background:#f0f4f8;border-radius:10px 0 0 10px;border:1px solid #e2e8f0;width:33%;">
        <div style="font-size:20px;margin-bottom:4px;">⚖️</div>
        <div style="font-weight:700;color:#1e3a5f;font-size:13px;">SAC1Gov</div>
        <div style="color:#6b7280;font-size:12px;margin-top:2px;">Protocol governance & voting</div>
        <a href="https://sac1gov.com" style="color:#1e3a5f;font-size:12px;font-weight:600;text-decoration:none;">sac1gov.com →</a>
      </td>
      <td style="width:8px;"></td>
      <td style="padding:10px 14px;background:#f0f4f8;border-radius:0;border:1px solid #e2e8f0;width:33%;">
        <div style="font-size:20px;margin-bottom:4px;">🪙</div>
        <div style="font-weight:700;color:#1e3a5f;font-size:13px;">SableAssent</div>
        <div style="color:#6b7280;font-size:12px;margin-top:2px;">Tokenization & treasury</div>
        <a href="https://sableassent.com" style="color:#1e3a5f;font-size:12px;font-weight:600;text-decoration:none;">sableassent.com →</a>
      </td>
      <td style="width:8px;"></td>
      <td style="padding:10px 14px;background:#f0f4f8;border-radius:0 10px 10px 0;border:1px solid #e2e8f0;width:33%;">
        <div style="font-size:20px;margin-bottom:4px;">🤖</div>
        <div style="font-weight:700;color:#1e3a5f;font-size:13px;">FrontDeskAI</div>
        <div style="color:#6b7280;font-size:12px;margin-top:2px;">AI receptionist for your business</div>
        <a href="https://ourfrontdeskai.com" style="color:#1e3a5f;font-size:12px;font-weight:600;text-decoration:none;">ourfrontdeskai.com →</a>
      </td>
    </tr>
  </table>

  <!-- Next steps -->
  <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin-bottom:24px;">
    <div style="font-weight:700;color:#065f46;font-size:15px;margin-bottom:12px;">✅ Your next steps</div>
    <div style="font-size:13px;color:#065f46;line-height:1.9;">
      <strong>1.</strong> Set up your Polygon wallet (MetaMask or use your Privy embedded wallet)<br>
      <strong>2.</strong> Your SAC1 will be dispatched within 24 hours of purchase<br>
      <strong>3.</strong> You'll receive a separate dispatch confirmation with your tx hash<br>
      <strong>4.</strong> Visit your wallet dashboard to check your balance anytime<br>
      <strong>5.</strong> Explore the SAC1Gov platform to participate in governance
    </div>
  </div>

  <!-- Wallet setup tip -->
  <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:18px;margin-bottom:28px;">
    <div style="font-weight:700;color:#92400e;font-size:14px;margin-bottom:8px;">💡 Add SAC1 to MetaMask</div>
    <div style="font-size:13px;color:#78350f;line-height:1.7;">
      Network: <strong>Polygon PoS</strong> · Chain ID: <strong>137</strong><br>
      Contract: <code style="background:#fff8e1;padding:2px 6px;border-radius:4px;font-size:11px;">0xedd66688556608518331131713063C1E200C7554</code><br>
      Symbol: <strong>SAC1</strong> · Decimals: <strong>18</strong>
    </div>
  </div>

  <!-- CTA buttons -->
  <table width="100%" style="border-collapse:collapse;">
    <tr>
      <td style="padding-right:6px;">
        <a href="https://sac1gov.com" style="display:block;padding:14px;background:linear-gradient(135deg,#1e3a5f,#2d5a8f);color:#fff;border-radius:10px;text-align:center;font-weight:700;font-size:14px;text-decoration:none;">My Wallet Dashboard →</a>
      </td>
      <td style="padding-left:6px;">
        <a href="https://pay.sableassent.com" style="display:block;padding:14px;background:#f3f4f6;color:#374151;border-radius:10px;text-align:center;font-weight:600;font-size:14px;text-decoration:none;border:1px solid #e2e8f0;">Buy More SAC1</a>
      </td>
    </tr>
  </table>
</td></tr>

<!-- FOOTER -->
<tr><td style="background:#1e3a5f;padding:24px 36px;text-align:center;">
  <div style="color:#d4a017;font-size:12px;font-weight:700;letter-spacing:0.1em;margin-bottom:8px;">SABLEASSENT GLOBAL</div>
  <div style="color:#94a3b8;font-size:12px;line-height:1.7;">Regulated Digital Asset Platform · Polygon PoS Network<br>
  Questions? <a href="mailto:support@sableassent.com" style="color:#60a5fa;">support@sableassent.com</a></div>
  <div style="color:#4b5563;font-size:11px;margin-top:12px;">You are receiving this because you made a purchase on SableAssent.com</div>
</td></tr>
</table></td></tr></table>
</body></html>`;

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email, name: name || email }] }],
      from: { email: 'welcome@sableassent.com', name: 'SableAssent Global' },
      reply_to: { email: 'support@sableassent.com', name: 'SableAssent Support' },
      subject: `Welcome to SableAssent, ${firstName}! 🪙`,
      content: [{ type: 'text/html', value: html }],
    }),
  });

  if (res.ok || res.status === 202) {
    console.log(`[Welcome] ✅ Welcome email sent to ${email}`);
    return new Response(JSON.stringify({ success: true, sentTo: email }), { status: 200, headers: cors });
  } else {
    const err = await res.text();
    console.error(`[Welcome] ❌ Error ${res.status}: ${err}`);
    return new Response(JSON.stringify({ success: false, error: `SendGrid ${res.status}` }), { status: 500, headers: cors });
  }
});
