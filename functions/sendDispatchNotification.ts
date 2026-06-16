// ─────────────────────────────────────────────────────────────────────────────
// SableAssent — POST /sendDispatchNotification
// Called by TokenDispatchPanel when admin marks tokens as Dispatched
// Updates Transaction record with tx hash + sends branded email to buyer
// Body: { transactionId, txHash, walletAddress, amountSac1, amountUsd, userEmail, userName, blockNumber?, gasUsed? }
// ─────────────────────────────────────────────────────────────────────────────

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SAC1_CONTRACT = Deno.env.get('SAC1_CONTRACT_ADDRESS') ?? '0xedd666802003d178c416b4e5dd6a82f76c2c7554';

async function sendDispatchEmail(params: {
  userEmail:    string;
  userName:     string;
  amountSac1:   number;
  amountUsd:    number;
  walletAddress: string;
  txHash:       string;
  transactionId: string;
  blockNumber:  string;
  now:          string;
}): Promise<{ ok: boolean; error?: string }> {
  const SENDGRID_KEY = Deno.env.get('SENDGRID_API_KEY') ?? '';
  if (!SENDGRID_KEY) return { ok: false, error: 'No SENDGRID_API_KEY' };

  const { userEmail, userName, amountSac1, amountUsd, walletAddress, txHash, transactionId, blockNumber, now } = params;
  const firstName   = userName?.split(' ')[0] || 'Valued Customer';
  const walletShort = `${walletAddress.slice(0, 10)}...${walletAddress.slice(-6)}`;
  const txShort     = `${txHash.slice(0, 14)}...${txHash.slice(-8)}`;
  const polyUrl     = `https://polygonscan.com/tx/${txHash}`;
  const dateStr     = new Date(now).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr     = new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,95,.10);">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#065f46,#047857);padding:32px 36px;text-align:center;">
    <div style="font-size:56px;margin-bottom:8px;">🚀</div>
    <div style="color:#6ee7b7;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px;">SableAssent Global</div>
    <div style="color:#fff;font-size:24px;font-weight:800;margin-bottom:4px;">Your SAC1 Has Been Dispatched!</div>
    <div style="color:#a7f3d0;font-size:13px;">${dateStr} · ${timeStr}</div>
  </td></tr>

  <!-- SUCCESS BANNER -->
  <tr><td style="background:#d1fae5;border-top:3px solid #34d399;border-bottom:3px solid #34d399;padding:14px 36px;text-align:center;">
    <span style="font-size:14px;font-weight:800;color:#065f46;">✅ ${amountSac1.toLocaleString()} SAC1 sent on Polygon PoS · Chain ID 137</span>
  </td></tr>

  <!-- BODY -->
  <tr><td style="padding:32px 36px;">
    <p style="color:#374151;font-size:16px;margin:0 0 8px;">Hi ${firstName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 28px;">Great news — your SAC1 tokens have been dispatched and are now on their way to your wallet on the Polygon network.</p>

    <!-- Token Amount Box -->
    <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:2px solid #34d399;border-radius:14px;padding:28px;text-align:center;margin-bottom:24px;">
      <div style="font-size:12px;color:#065f46;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Tokens Dispatched</div>
      <div style="font-size:56px;font-weight:900;color:#065f46;line-height:1;">${amountSac1.toLocaleString()}</div>
      <div style="font-size:14px;color:#047857;font-weight:600;margin-top:6px;">SAC1 · ERC-20 · Polygon PoS</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px;">≈ $${amountUsd.toFixed(2)} USD at $0.0889/SAC1</div>
    </div>

    <!-- Transaction Details -->
    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:14px;text-transform:uppercase;letter-spacing:0.5px;">Transaction Details</div>
      <table width="100%" style="border-collapse:collapse;">
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:8px 0;color:#6b7280;font-size:13px;width:45%;">Receiving Wallet</td>
          <td style="padding:8px 0;font-weight:600;color:#1f2937;font-size:12px;text-align:right;font-family:monospace;">${walletShort}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:8px 0;color:#6b7280;font-size:13px;">Network</td>
          <td style="padding:8px 0;font-weight:600;color:#1f2937;font-size:13px;text-align:right;">Polygon PoS (Chain 137)</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:8px 0;color:#6b7280;font-size:13px;">Token Contract</td>
          <td style="padding:8px 0;font-weight:600;color:#1f2937;font-size:11px;text-align:right;font-family:monospace;">${SAC1_CONTRACT.slice(0,10)}...${SAC1_CONTRACT.slice(-6)}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:8px 0;color:#6b7280;font-size:13px;">Tx Hash</td>
          <td style="padding:8px 0;font-weight:600;color:#1f2937;font-size:11px;text-align:right;font-family:monospace;">${txShort}</td>
        </tr>
        ${blockNumber ? `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;font-size:13px;">Block Number</td><td style="padding:8px 0;font-weight:600;color:#1f2937;font-size:13px;text-align:right;">#${blockNumber}</td></tr>` : ''}
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;">Reference</td>
          <td style="padding:8px 0;font-weight:600;color:#1f2937;font-size:12px;text-align:right;">${transactionId}</td>
        </tr>
      </table>
    </div>

    <!-- Verify on Polygonscan -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${polyUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:8px;">
        🔍 Verify on Polygonscan
      </a>
      <div style="font-size:12px;color:#9ca3af;margin-top:6px;">Full transaction details and confirmation status</div>
    </div>

    <!-- How to view tokens -->
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin-bottom:24px;">
      <div style="font-weight:700;color:#1e40af;font-size:14px;margin-bottom:12px;">📱 How to view your SAC1 tokens</div>
      <div style="font-size:13px;color:#1e40af;line-height:1.7;">
        <strong>MetaMask / Trust Wallet:</strong> Add custom token using contract address<br>
        <code style="background:#dbeafe;padding:2px 6px;border-radius:4px;font-size:11px;">${SAC1_CONTRACT}</code><br><br>
        <strong>Network:</strong> Polygon PoS · Chain ID: 137<br>
        <strong>Symbol:</strong> SAC1 · <strong>Decimals:</strong> 18
      </div>
    </div>

    <!-- Dashboard CTA -->
    <div style="text-align:center;">
      <a href="https://sac1gov.com" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#1e3a5f,#2d5a8f);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
        View Your Wallet Dashboard →
      </a>
    </div>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#f8fafc;padding:20px 36px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:12px;margin:0 0 4px;">SableAssent Global · Regulated Digital Asset Platform</p>
    <p style="color:#9ca3af;font-size:12px;margin:0 0 4px;">Questions? <a href="mailto:support@sableassent.com" style="color:#6b7280;">support@sableassent.com</a></p>
    <p style="color:#d1d5db;font-size:11px;margin:8px 0 0;">This is an automated transaction confirmation. Keep this email for your records.</p>
  </td></tr>
</table></td></tr></table>
</body></html>`;

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: userEmail, name: userName || userEmail }] }],
      from: { email: 'noreply@sableassent.com', name: 'SableAssent' },
      reply_to: { email: 'support@sableassent.com', name: 'SableAssent Support' },
      subject: `🚀 Your ${amountSac1.toLocaleString()} SAC1 Has Been Dispatched`,
      content: [{ type: 'text/html', value: html }],
    }),
  });

  if (res.ok || res.status === 202) {
    return { ok: true };
  } else {
    const err = await res.text();
    return { ok: false, error: `SendGrid ${res.status}: ${err.slice(0, 200)}` };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST')    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });

  let base44: ReturnType<typeof createClientFromRequest>;
  try { base44 = createClientFromRequest(req); }
  catch { return new Response(JSON.stringify({ error: 'Auth failed' }), { status: 401, headers: cors }); }

  let body: {
    transactionId?: string;
    txHash?:        string;
    walletAddress?: string;
    amountSac1?:    number;
    amountUsd?:     number;
    userEmail?:     string;
    userName?:      string;
    blockNumber?:   string;
    gasUsed?:       string;
  };

  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: cors }); }

  const { transactionId, txHash, walletAddress, amountSac1, amountUsd, userEmail, userName, blockNumber = '', gasUsed = '' } = body;

  if (!transactionId || !txHash || !userEmail || !amountSac1) {
    return new Response(JSON.stringify({ error: 'Missing required fields: transactionId, txHash, userEmail, amountSac1' }), { status: 400, headers: cors });
  }

  const now         = new Date().toISOString();
  const polyUrl     = `https://polygonscan.com/tx/${txHash}`;

  console.log(`[Dispatch] Processing ${transactionId} | ${amountSac1} SAC1 → ${walletAddress} | tx: ${txHash}`);

  // 1. Update Transaction record with dispatch details
  let dbUpdateOk = false;
  try {
    const records = await base44.asServiceRole.entities.Transaction.filter({ transaction_id: transactionId });
    if (records?.length > 0) {
      await base44.asServiceRole.entities.Transaction.update(records[0].id, {
        dispatch_status:      'Dispatched',
        dispatch_tx_hash:     txHash,
        dispatch_confirmed_at: now,
        dispatch_block_number: blockNumber,
        dispatch_gas_used:    gasUsed,
        polygonscan_url:      polyUrl,
        status:               'Completed',
        notes:                (records[0].notes || '') + ` | DISPATCHED ${now} | TxHash: ${txHash} | Block: ${blockNumber}`,
      });
      dbUpdateOk = true;
      console.log(`[Dispatch] ✅ Transaction record updated: ${transactionId}`);
    } else {
      console.warn(`[Dispatch] ⚠️ No Transaction record found for ID: ${transactionId}`);
    }
  } catch (e) {
    console.error('[Dispatch] DB update error:', e);
  }

  // 2. Send dispatch confirmation email
  const emailResult = await sendDispatchEmail({
    userEmail:     userEmail!,
    userName:      userName || userEmail!,
    amountSac1:    amountSac1!,
    amountUsd:     amountUsd || (amountSac1! * 0.0889),
    walletAddress: walletAddress || '',
    txHash:        txHash!,
    transactionId: transactionId!,
    blockNumber,
    now,
  });

  console.log(`[Dispatch] Email result: ${emailResult.ok ? '✅ sent' : '❌ ' + emailResult.error}`);

  // 3. Trigger analytics update (fire and forget)
  try {
    const analyticsUrl = `https://app.base44.com/api/apps/${Deno.env.get('BASE44_APP_ID') ?? '6a13d16e7f282082e39578f6'}/functions/updateSalesAnalytics`;
    fetch(analyticsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': Deno.env.get('BASE44_API_KEY') ?? '' },
      body: JSON.stringify({ trigger: 'dispatch', transactionId }),
    }).catch(() => {});
  } catch {}

  return new Response(JSON.stringify({
    success:     true,
    dbUpdated:   dbUpdateOk,
    emailSent:   emailResult.ok,
    emailError:  emailResult.error,
    txHash,
    polygonscanUrl: polyUrl,
    transactionId,
    dispatchedAt: now,
  }), { status: 200, headers: cors });
});
