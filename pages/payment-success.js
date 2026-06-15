// pay.sableassent.com/payment-success
// PayPal redirects here after successful payment approval
// FIX: After capture → redirects to SAC1 Wallet Dashboard (not homepage)

import Head from 'next/head'
import { useState, useEffect } from 'react'

const CAPTURE_URL = 'https://app.base44.com/api/apps/6a13d16e7f282082e39578f6/functions/paypalCaptureOrder'

const PRODUCT_MAP = {
  SAC1GOV_SUBSCRIPTION: { label: 'SAC1 Gov Membership',       site: 'sac1gov.com',       color: '#064e3b', dashboardUrl: 'https://sac1gov.com/dashboard' },
  SABLE_TOKENIZATION:   { label: 'SableAssent Tokenization',   site: 'sableassent.com',   color: '#1e3a5f', dashboardUrl: 'https://sableassent.com/wallet?purchase=success' },
  FRONTDESKAI_SUB:      { label: 'AI Front Desk SaaS',         site: 'ourfrontdeskai.com', color: '#4f46e5', dashboardUrl: 'https://ourfrontdeskai.com/dashboard' },
}

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function PaymentSuccess() {
  const [status, setStatus]   = useState('capturing')
  const [data, setData]       = useState(null)
  const [error, setError]     = useState('')
  const [source, setSource]   = useState('')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token  = params.get('token')
    const src    = params.get('source') ?? ''
    setSource(src)

    if (!token) {
      setStatus('error')
      setError('No order token found. Please contact support@sableassent.com')
      return
    }

    fetch(CAPTURE_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ orderId: token }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) { setData(d); setStatus('success') }
        else { setError(d.error ?? 'Capture failed'); setStatus('error') }
      })
      .catch(e => { setError(e.message); setStatus('error') })
  }, [])

  // Auto-redirect countdown after success
  useEffect(() => {
    if (status !== 'success') return
    if (countdown <= 0) {
      const product = PRODUCT_MAP[source] ?? PRODUCT_MAP.SABLE_TOKENIZATION
      window.location.href = product.dashboardUrl
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [status, countdown, source])

  const product = PRODUCT_MAP[source] ?? PRODUCT_MAP.SABLE_TOKENIZATION
  const sac1Amount = data?.amount ? Math.floor(data.amount / 0.0889).toLocaleString() : null

  return (
    <>
      <Head>
        <title>Payment Confirmed — SableAssent Pay</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 24 }}>⬡</span>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>SableAssent Pay</span>
          </div>
        </div>

        <div style={{
          width: '100%', maxWidth: 480,
          background: '#fff', borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        }}>
          {/* Card header */}
          <div style={{ background: `linear-gradient(135deg, ${product.color}, #d4a017)`, padding: '18px 24px' }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 2 }}>
              {status === 'capturing' ? 'Processing…' : status === 'success' ? '✅ Payment Complete' : '⚠️ Payment Error'}
            </div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{product.label}</div>
          </div>

          <div style={{ padding: 28, textAlign: 'center' }}>

            {/* CAPTURING */}
            {status === 'capturing' && (
              <>
                <div style={{ fontSize: 52, marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Confirming your payment…</div>
                <div style={{ fontSize: 14, color: '#64748b' }}>Please wait, this takes just a moment.</div>
              </>
            )}

            {/* SUCCESS */}
            {status === 'success' && (
              <>
                <div style={{ fontSize: 64, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981', marginBottom: 8 }}>Purchase Complete!</div>
                <div style={{ fontSize: 14, color: '#475569', marginBottom: 20, lineHeight: 1.7 }}>
                  Your SAC1 token purchase has been submitted successfully.
                  {data?.payerEmail && <> A confirmation email has been sent to <strong>{data.payerEmail}</strong>.</>}
                </div>

                {/* Token amount highlight */}
                {sac1Amount && (
                  <div style={{
                    background: 'linear-gradient(135deg, #1e3a5f, #2d5a8e)',
                    borderRadius: 16, padding: '20px', marginBottom: 20,
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 }}>Tokens Purchased</div>
                    <div style={{ color: '#d4a017', fontSize: 36, fontWeight: 900 }}>{sac1Amount} SAC1</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>Delivering to your Polygon wallet within 24 hours</div>
                  </div>
                )}

                {/* Transaction details */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, marginBottom: 20, textAlign: 'left' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', marginBottom: 10, letterSpacing: '0.05em' }}>TRANSACTION DETAILS</div>
                  {[
                    ['Transaction ID', data?.captureId ?? '—'],
                    ['Amount Paid',    data?.amount    != null ? formatUSD(data.amount) : '—'],
                    ['Net Amount',     data?.netAmount != null ? formatUSD(data.netAmount) : '—'],
                    ['Payer',          data?.payerName || '—'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #d1fae5' }}>
                      <span style={{ color: '#64748b' }}>{k}</span>
                      <span style={{ fontWeight: 700, fontFamily: k === 'Transaction ID' ? 'monospace' : 'inherit', color: '#065f46', fontSize: k === 'Transaction ID' ? 11 : 13 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Auto-redirect notice */}
                <div style={{
                  background: '#f0f6ff', border: '1px solid #bfdbfe', borderRadius: 10,
                  padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1e40af',
                }}>
                  Redirecting to your SAC1 Wallet in <strong>{countdown}s</strong>…
                </div>

                {/* Primary CTA — Wallet Dashboard */}
                <a
                  href={product.dashboardUrl}
                  style={{
                    display: 'block', padding: '15px', borderRadius: 12, boxSizing: 'border-box',
                    background: 'linear-gradient(135deg, #1e3a5f, #2d5a8e)',
                    color: '#fff', fontWeight: 800, fontSize: 16,
                    textDecoration: 'none', marginBottom: 10,
                    boxShadow: '0 4px 20px rgba(30,58,95,0.35)',
                  }}
                >
                  💰 View My SAC1 Wallet →
                </a>

                <a
                  href="/"
                  style={{
                    display: 'block', padding: '12px', borderRadius: 12,
                    border: '1px solid #e2e8f0', color: '#64748b',
                    fontWeight: 600, fontSize: 14, textDecoration: 'none',
                  }}
                >
                  Make Another Payment
                </a>
              </>
            )}

            {/* ERROR */}
            {status === 'error' && (
              <>
                <div style={{ fontSize: 52, marginBottom: 8 }}>⚠️</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>Something went wrong</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>{error}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
                  If your payment was charged, please contact{' '}
                  <a href="mailto:support@sableassent.com" style={{ color: '#1e3a5f', fontWeight: 700 }}>support@sableassent.com</a>
                  {' '}with your PayPal transaction ID.
                </div>
                <a href="/" style={{
                  display: 'block', padding: '13px', borderRadius: 12,
                  background: product.color, color: '#fff', fontWeight: 700,
                  fontSize: 14, textDecoration: 'none',
                }}>
                  Try Again →
                </a>
              </>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
          🔒 256-bit SSL · PayPal Secured · SableAssent Global Ltd
        </div>
      </div>
    </>
  )
}
