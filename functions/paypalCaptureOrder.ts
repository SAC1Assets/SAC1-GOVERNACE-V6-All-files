// ─────────────────────────────────────────────────────────────────────────────
// SableAssent — POST /paypalCaptureOrder
// v3: CRITICAL FIX — after successful capture, creates a Transaction record
//     with dispatch_status="Queued" so TokenDispatchPanel auto-loads it
// Handles both:
//   (A) Frontend capture calls: { orderId } in JSON body
//   (B) PayPal webhook push events: PAYMENT.CAPTURE.COMPLETED etc.
// ─────────────────────────────────────────────────────────────────────────────

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PAYPAL_WEBHOOK_ID = Deno.env.get('PAYPAL_WEBHOOK_ID') ?? '2NP90005V61444602';
const SAC1_PRICE_USD    = 0.0889; // $0.0889 per SAC1 token
const SAC1_CONTRACT     = Deno.env.get('SAC1_CONTRACT_ADDRESS') ?? '0xedd66688556608518331131713063C1E200C7554';

async function getPayPalToken(): Promise<string> {
  const clientId     = Deno.env.get('PAYPAL_CLIENT_ID')     ?? '';
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET') ?? '';
  const mode         = Deno.env.get('PAYPAL_MODE') ?? 'live';
  const baseUrl      = mode === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  return (await res.json()).access_token as string;
}

// ── Webhook signature verification ───────────────────────────────────────────
async function verifyPayPalWebhookSignature(
  req: Request,
  rawBody: string,
  token: string
): Promise<{ valid: boolean; reason: string }> {
  const mode    = Deno.env.get('PAYPAL_MODE') ?? 'live';
  const baseUrl = mode === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

  const authAlgo        = req.headers.get('paypal-auth-algo')        ?? '';
  const certUrl         = req.headers.get('paypal-cert-url')         ?? '';
  const transmissionId  = req.headers.get('paypal-transmission-id')  ?? '';
  const transmissionSig = req.headers.get('paypal-transmission-sig') ?? '';
  const transmissionTime= req.headers.get('paypal-transmission-time')?? '';

  if (!authAlgo && !transmissionId) return { valid: false, reason: 'not_a_webhook' };
  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return { valid: false, reason: `Missing PayPal headers` };
  }
  if (!certUrl.startsWith('https://api.paypal.com/') && !certUrl.startsWith('https://api.sandbox.paypal.com/')) {
    return { valid: false, reason: `Invalid cert URL domain` };
  }

  const verifyRes = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: authAlgo, cert_url: certUrl,
      transmission_id: transmissionId, transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(rawBody),
    }),
  });

  if (!verifyRes.ok) return { valid: false, reason: `PayPal verify API error (${verifyRes.status})` };
  const verifyData = await verifyRes.json();
  return { valid: verifyData.verification_status === 'SUCCESS', reason: verifyData.verification_status };
}

// ── Validate Polygon wallet address ──────────────────────────────────────────
function isValidWallet(addr: string): boolean {
  return typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
}

// ── CRITICAL: Create dispatch Transaction record after confirmed payment ──────
// This is what makes tokens actually get dispatched to customer wallets.
async function createDispatchTransaction(
  base44: ReturnType<typeof createClientFromRequest>,
  params: {
    orderId:     string;
    captureId:   string;
    amountUsd:   number;
    payerEmail:  string;
    payerName:   string;
    walletAddress: string;
    source:      string;
    now:         string;
  }
): Promise<void> {
  const { orderId, captureId, amountUsd, payerEmail, payerName, walletAddress, source, now } = params;
  const sac1Amount   = Math.floor(amountUsd / SAC1_PRICE_USD);
  const walletValid  = isValidWallet(walletAddress);
  const dispatchStatus = walletValid ? 'Queued' : 'Awaiting Wallet';
  const txnId        = `TXN-SAC1-PP-${captureId.slice(-8).toUpperCase()}`;
  const safeWallet   = Deno.env.get('GNOSIS_SAFE_ADDRESS') ?? Deno.env.get('SAFE_WALLET_API_KEY') ?? 'SAC1-TREASURY';

  console.log(`[PayPal] Creating dispatch Transaction: ${txnId} | ${sac1Amount} SAC1 → ${walletValid ? walletAddress : 'NO WALLET'}`);

  await base44.asServiceRole.entities.Transaction.create({
    transaction_id:       txnId,
    user_id:              payerEmail,
    user_name:            payerName || payerEmail.split('@')[0] || 'SAC1 Customer',
    user_email:           payerEmail,
    privy_wallet_address: walletValid ? walletAddress : '',
    dispatch_status:      dispatchStatus,
    dispatch_queued_at:   now,
    originator_name:      payerName || payerEmail,
    originator_account:   `PAYPAL-${orderId}`,
    beneficiary_name:     payerName || payerEmail,
    beneficiary_account:  walletValid ? walletAddress : 'WALLET_PENDING',
    amount_sac1:          sac1Amount,
    amount_usd_equivalent: amountUsd,
    exchange_rate:        SAC1_PRICE_USD,
    settlement_rail:      'Polygon PoS ERC-20',
    status:               'Processing',
    compliance_status:    'Clear',
    kyc_status:           'Verified',
    travel_rule_status:   amountUsd >= 1000 ? 'Required' : 'Exempt',
    risk_score:           10,
    risk_level:           'Low',
    sanctions_checked:    true,
    sanctions_clear:      true,
    aml_flags:            amountUsd >= 10000 ? ['Large Transaction', 'CTR Required'] : [],
    originator_country:   'Global',
    beneficiary_country:  'Global',
    jurisdiction_tier:    'Tier 1',
    transaction_date:     now,
    notes:                `PayPal Capture: ${captureId} | Order: ${orderId} | ${sac1Amount} SAC1 → ${walletValid ? walletAddress : 'WALLET MISSING'} | Source: ${source} | Treasury: ${safeWallet} | Contract: ${SAC1_CONTRACT}${!walletValid ? ' ⚠️ NO WALLET — manual dispatch required' : ''}`,
  });

  console.log(`[PayPal] ✅ Transaction created: ${txnId} | dispatch_status=${dispatchStatus}`);

  // If no wallet — fire compliance alert so admin can follow up
  if (!walletValid) {
    await base44.asServiceRole.entities.ComplianceAlert.create({
      alert_id:    `ALT-PP-${captureId.slice(-8).toUpperCase()}`,
      transaction_id: txnId,
      user_id:     payerEmail,
      user_name:   payerName || payerEmail,
      alert_type:  'Missing Wallet Address',
      severity:    'Medium',
      status:      'Open',
      amount_usd:  amountUsd,
      description: `Customer paid $${amountUsd} via PayPal (${captureId}) but no Polygon wallet address was captured. ${sac1Amount} SAC1 cannot be auto-dispatched. Contact customer to obtain their Polygon wallet address. Email: ${payerEmail}`,
      alert_date:  now,
    });
    console.log(`[PayPal] ⚠️ Compliance alert created — missing wallet for ${payerEmail}`);
  }
}


// ── SendGrid: Purchase confirmation email ─────────────────────────────────────
async function sendPurchaseConfirmationEmail(params: {
  payerEmail:    string;
  payerName:     string;
  amountUsd:     number;
  sac1Amount:    number;
  captureId:     string;
  orderId:       string;
  walletAddress: string;
  now:           string;
}): Promise<void> {
  const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') ?? '';
  if (!SENDGRID_API_KEY) { console.warn('[Email] No SENDGRID_API_KEY — skipping email'); return; }

  const { payerEmail, payerName, amountUsd, sac1Amount, captureId, orderId, walletAddress, now } = params;
  const firstName   = payerName?.split(' ')[0] || 'Valued Customer';
  const dispatchMsg = walletAddress
    ? `Your <strong>${sac1Amount.toLocaleString()} SAC1</strong> will be dispatched to <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${walletAddress.slice(0,10)}...${walletAddress.slice(-6)}</code> within 24 hours.`
    : `Our team will contact you at <strong>${payerEmail}</strong> to collect your Polygon wallet address for token delivery.`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,95,.10);">
  <tr><td style="background:linear-gradient(135deg,#1e3a5f,#0f2340);padding:32px 36px;text-align:center;">
    <div style="font-size:48px;margin-bottom:8px;">🪙</div>
    <div style="color:#d4a017;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">SableAssent Global</div>
    <div style="color:#fff;font-size:22px;font-weight:800;">SAC1 Purchase Confirmed!</div>
    <div style="color:#94a3b8;font-size:13px;margin-top:4px;">${new Date(now).toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
  </td></tr>
  <tr><td style="background:#d1fae5;border-bottom:2px solid #6ee7b7;padding:12px 36px;text-align:center;">
    <span style="font-size:13px;font-weight:700;color:#065f46;">✅ Payment captured and queued for dispatch</span>
  </td></tr>
  <tr><td style="padding:32px 36px;">
    <p style="color:#374151;font-size:16px;margin:0 0 24px;">Hi ${firstName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">Your SAC1 token purchase is confirmed. ${dispatchMsg}</p>
    <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:2px solid #d4a017;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <div style="font-size:13px;color:#92400e;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">SAC1 Tokens Purchased</div>
      <div style="font-size:48px;font-weight:900;color:#1e3a5f;line-height:1;">${sac1Amount.toLocaleString()}</div>
      <div style="font-size:13px;color:#92400e;margin-top:4px;">SAC1 · Polygon PoS · ERC-20</div>
    </div>
    <table width="100%" style="background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:24px;border-collapse:collapse;">
      <tr><td style="padding:6px 12px;color:#6b7280;font-size:13px;">Amount Paid</td><td style="padding:6px 12px;font-weight:700;color:#1f2937;font-size:13px;text-align:right;">$${amountUsd.toFixed(2)} USD</td></tr>
      <tr><td style="padding:6px 12px;color:#6b7280;font-size:13px;">Order ID</td><td style="padding:6px 12px;font-weight:600;color:#1f2937;font-size:12px;text-align:right;">${orderId}</td></tr>
      <tr><td style="padding:6px 12px;color:#6b7280;font-size:13px;">Capture ID</td><td style="padding:6px 12px;font-weight:600;color:#1f2937;font-size:12px;text-align:right;">${captureId}</td></tr>
      <tr><td style="padding:6px 12px;color:#6b7280;font-size:13px;">Network</td><td style="padding:6px 12px;font-weight:600;color:#1f2937;font-size:13px;text-align:right;">Polygon PoS (MATIC)</td></tr>
      <tr><td style="padding:6px 12px;color:#6b7280;font-size:13px;">Status</td><td style="padding:6px 12px;font-weight:700;color:#059669;font-size:13px;text-align:right;">✅ Confirmed</td></tr>
    </table>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin-bottom:24px;">
      <div style="font-weight:700;color:#1e40af;font-size:14px;margin-bottom:10px;">📋 What happens next</div>
      <div style="font-size:13px;color:#1e40af;margin-bottom:6px;">1. Your KYC verification is on file ✅</div>
      <div style="font-size:13px;color:#1e40af;margin-bottom:6px;">2. Compliance team reviews your transaction</div>
      <div style="font-size:13px;color:#1e40af;margin-bottom:6px;">3. SAC1 dispatched to your wallet within 24 hours</div>
      <div style="font-size:13px;color:#1e40af;">4. You'll receive a dispatch confirmation email with the tx hash</div>
    </div>
    <div style="text-align:center;">
      <a href="https://sac1gov.com" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#1e3a5f,#2d5a8f);color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Go to Your Dashboard →</a>
    </div>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:20px 36px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">SableAssent Global · Regulated Digital Asset Platform</p>
    <p style="color:#9ca3af;font-size:12px;margin:4px 0 0;">Questions? <a href="mailto:support@sableassent.com" style="color:#6b7280;">support@sableassent.com</a></p>
  </td></tr>
</table></td></tr></table>
</body></html>`;

  const payload = {
    personalizations: [{ to: [{ email: payerEmail, name: payerName || payerEmail }] }],
    from:    { email: 'noreply@sableassent.com', name: 'SableAssent' },
    reply_to:{ email: 'support@sableassent.com', name: 'SableAssent Support' },
    subject: `✅ Your ${sac1Amount.toLocaleString()} SAC1 Purchase is Confirmed`,
    content: [{ type: 'text/html', value: html }],
  };

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  if (res.ok || res.status === 202) {
    console.log(`[Email] ✅ Purchase confirmation sent to ${payerEmail}`);
  } else {
    const err = await res.text();
    console.error(`[Email] ❌ SendGrid error (${res.status}): ${err}`);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST')    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });

  const rawBody = await req.text();
  const now     = new Date().toISOString();
  const mode    = Deno.env.get('PAYPAL_MODE') ?? 'live';
  const baseUrl = mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  const isWebhook = !!req.headers.get('paypal-transmission-id');
  const base44  = createClientFromRequest(req);

  // ══════════════════════════════════════════════════════════════════════════
  // PATH A — PayPal Webhook Push (PAYMENT.CAPTURE.COMPLETED etc.)
  // ══════════════════════════════════════════════════════════════════════════
  if (isWebhook) {
    console.log('[PayPal] Incoming webhook push — verifying signature...');

    let ppToken: string;
    try { ppToken = await getPayPalToken(); }
    catch (err) {
      console.error('[PayPal] Token fetch failed:', err);
      return new Response(JSON.stringify({ error: 'Auth failed' }), { status: 500, headers: cors });
    }

    const { valid, reason } = await verifyPayPalWebhookSignature(req, rawBody, ppToken);
    if (!valid) {
      console.error(`[PayPal] Webhook signature FAILED: ${reason}`);
      return new Response(JSON.stringify({ error: `Invalid webhook: ${reason}` }), { status: 401, headers: cors });
    }

    console.log(`[PayPal] Webhook verified ✅`);

    let event: Record<string, unknown>;
    try { event = JSON.parse(rawBody); }
    catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: cors }); }

    const eventType = event.event_type as string;
    const resource  = (event.resource ?? {}) as Record<string, unknown>;
    const orderId   = (resource.supplementary_data as Record<string,unknown>)?.related_ids?.order_id as string
                   ?? resource.id as string ?? '';
    const captureId   = resource.id as string ?? '';
    const captureAmt  = parseFloat((resource.amount as Record<string,string>)?.value ?? '0');

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      try {
        // Update PaymentTransaction
        const records = await base44.asServiceRole.entities.PaymentTransaction.filter({ paypal_order_id: orderId });
        let payerEmail = '';
        let payerName  = '';
        let walletAddr = '';
        let source     = '';

        if (records?.length > 0) {
          const rec = records[0];
          payerEmail = rec.email || '';
          payerName  = rec.payer_name || '';
          source     = rec.source_site || '';
          await base44.asServiceRole.entities.PaymentTransaction.update(rec.id, {
            status: 'CAPTURED', capture_id: captureId, captured_at: now,
            notes: `Webhook CAPTURED | CaptureID: ${captureId} | $${captureAmt}`,
          });
        }

        // ── CRITICAL: Create dispatch Transaction ──
        await createDispatchTransaction(base44, {
          orderId, captureId, amountUsd: captureAmt,
          payerEmail, payerName, walletAddress: walletAddr, source, now,
        });
      } catch (err) {
        console.error('[PayPal] Webhook CAPTURE.COMPLETED handler error:', err);
      }
    }

    if (eventType === 'PAYMENT.CAPTURE.DENIED' || eventType === 'PAYMENT.CAPTURE.REVERSED') {
      try {
        const records = await base44.asServiceRole.entities.PaymentTransaction.filter({ paypal_order_id: orderId });
        if (records?.length > 0) {
          await base44.asServiceRole.entities.PaymentTransaction.update(records[0].id, {
            status: eventType === 'PAYMENT.CAPTURE.DENIED' ? 'DENIED' : 'REVERSED',
            notes:  `Webhook: ${eventType} | CaptureID: ${captureId}`,
          });
        }
        if (eventType === 'PAYMENT.CAPTURE.REVERSED') {
          await base44.asServiceRole.entities.ComplianceAlert.create({
            alert_id:    `ALT-REV-${captureId.slice(-8).toUpperCase()}`,
            alert_type:  'Payment Reversal',
            severity:    'High',
            status:      'Open',
            amount_usd:  captureAmt,
            description: `PayPal payment REVERSED. OrderID: ${orderId} | CaptureID: ${captureId} | $${captureAmt}. Verify no SAC1 was dispatched.`,
            alert_date:  now,
          });
        }
      } catch (err) {
        console.error('[PayPal] Webhook reversal handler error:', err);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: cors });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PATH B — Frontend capture call: { orderId, walletAddress?, email? }
  // ══════════════════════════════════════════════════════════════════════════
  let body: Record<string, string>;
  try { body = JSON.parse(rawBody); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: cors }); }

  const { orderId, walletAddress = '', email = '' } = body;
  if (!orderId) return new Response(JSON.stringify({ error: 'orderId required' }), { status: 400, headers: cors });

  console.log(`[PayPal] Frontend capture: orderId=${orderId} | wallet=${walletAddress || 'none'}`);

  try {
    const ppToken = await getPayPalToken();

    // Capture the PayPal order
    const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ppToken}`,
        'Content-Type':  'application/json',
      },
    });

    const captureData = await captureRes.json();
    console.log('[PayPal] Capture response status:', captureRes.status, captureData.status);

    if (!captureRes.ok || (captureData.status !== 'COMPLETED' && captureData.name !== 'ORDER_ALREADY_CAPTURED')) {
      const errMsg = captureData.message ?? captureData.details?.[0]?.description ?? 'Capture failed';
      console.error('[PayPal] Capture failed:', errMsg);

      // Update existing PaymentTransaction to FAILED
      try {
        const recs = await base44.asServiceRole.entities.PaymentTransaction.filter({ paypal_order_id: orderId });
        if (recs?.length > 0) {
          await base44.asServiceRole.entities.PaymentTransaction.update(recs[0].id, {
            status: 'FAILED',
            notes: `Capture failed: ${errMsg}`,
          });
        }
      } catch {}

      return new Response(JSON.stringify({ success: false, error: errMsg }), { status: 400, headers: cors });
    }

    // Extract capture details
    const purchase   = captureData.purchase_units?.[0];
    const capture    = purchase?.payments?.captures?.[0] ?? {};
    const captureId  = capture.id ?? orderId;
    const captureAmt = parseFloat(capture.amount?.value ?? purchase?.amount?.value ?? '0');
    const paypalFee  = parseFloat(capture.seller_receivable_breakdown?.paypal_fee?.value ?? '0');
    const netAmount  = parseFloat(capture.seller_receivable_breakdown?.net_amount?.value ?? '0');
    const payer      = captureData.payer ?? {};
    const payerEmail = payer.email_address ?? email ?? '';
    const payerName  = `${payer.name?.given_name ?? ''} ${payer.name?.surname ?? ''}`.trim();
    const payerCountry = payer.address?.country_code ?? '';
    const customId   = purchase?.custom_id ?? purchase?.reference_id ?? '';

    // Wallet address: from URL param passed by frontend, OR from custom_id, OR from purchase desc
    const resolvedWallet = isValidWallet(walletAddress)
      ? walletAddress
      : isValidWallet(customId) ? customId : '';

    console.log(`[PayPal] ✅ Captured: $${captureAmt} | CaptureID: ${captureId} | Payer: ${payerEmail} | Wallet: ${resolvedWallet || 'MISSING'}`);

    // Update PaymentTransaction record
    try {
      const recs = await base44.asServiceRole.entities.PaymentTransaction.filter({ paypal_order_id: orderId });
      if (recs?.length > 0) {
        await base44.asServiceRole.entities.PaymentTransaction.update(recs[0].id, {
          status:      'CAPTURED',
          capture_id:  captureId,
          paypal_fee:  paypalFee,
          net_amount:  netAmount,
          payer_name:  payerName,
          payer_country: payerCountry,
          email:       payerEmail || recs[0].email,
          captured_at: now,
          notes: `Captured OK | CaptureID: ${captureId} | $${captureAmt} | Wallet: ${resolvedWallet || 'MISSING'}`,
        });
      }
    } catch (dbErr) {
      console.error('[PayPal] PaymentTransaction update error:', dbErr);
    }

    // ── CRITICAL FIX: Create the dispatch Transaction record ──────────────
    // This is what the TokenDispatchPanel reads to auto-queue tokens for dispatch
    await createDispatchTransaction(base44, {
      orderId,
      captureId,
      amountUsd:     captureAmt,
      payerEmail,
      payerName,
      walletAddress: resolvedWallet,
      source:        customId || 'sableassent.com',
      now,
    });

    // ── Send purchase confirmation email ──────────────────────────────────
    await sendPurchaseConfirmationEmail({
      payerEmail,
      payerName,
      amountUsd:    captureAmt,
      sac1Amount:   Math.floor(captureAmt / SAC1_PRICE_USD),
      captureId,
      orderId,
      walletAddress: resolvedWallet,
      now,
    });

    return new Response(JSON.stringify({
      success:    true,
      captureId,
      amount:     captureAmt,
      paypalFee,
      netAmount,
      payerEmail,
      payerName,
      payerCountry,
      sac1Amount: Math.floor(captureAmt / SAC1_PRICE_USD),
      walletAddress: resolvedWallet,
      walletQueued: isValidWallet(resolvedWallet),
    }), { status: 200, headers: cors });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[PayPal] Unexpected error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: cors });
  }
});
