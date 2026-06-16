// pay.sableassent.com/payment-success  v2.0
// Two entry points:
//  A) PayPal JS SDK inline capture → redirected here with ?orderId=&amount=&sac1=&name=  (already captured)
//  B) PayPal redirect flow          → arrives with ?token= (needs capture)
// This page handles BOTH but does NOT double-capture.

import Head from 'next/head'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const API_BASE   = 'https://app.base44.com/api/apps/6a13d16e7f282082e39578f6/functions'
const CAPTURE_URL = `${API_BASE}/paypalCaptureOrder`

const PRODUCT_MAP = {
  SAC1GOV_SUBSCRIPTION: { label: 'SAC1 Gov Membership',       color: '#064e3b', icon: '⚖️' },
  SABLE_TOKENIZATION:   { label: 'SAC1 Token Purchase',        color: '#1e3a5f', icon: '🪙' },
  FRONTDESKAI_SUB:      { label: 'AI Front Desk SaaS',         color: '#4f46e5', icon: '🤖' },
}

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function PaymentSuccess() {
  const [status, setStatus] = useState('loading')  // loading | capturing | success | error
  const [data, setData]     = useState(null)
  const [error, setError]   = useState('')
  const [params, setParams] = useState({})

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const parsed = {
      orderId:  p.get('orderId')  || p.get('token') || '',   // orderId = already captured, token = needs capture
      amount:   p.get('amount')   || '',
      sac1:     p.get('sac1')     || '',
      name:     p.get('name')     ? decodeURIComponent(p.get('name')) : '',
      source:   p.get('source')   || 'SABLE_TOKENIZATION',
      captured: p.get('orderId')  ? true : false,  // if ?orderId= present, already captured by SDK
    }
    setParams(parsed)

    if (!parsed.orderId) {
      setStatus('error')
      setError('No order ID found. Please contact support at support@sableassent.com')
      return
    }

    // If already captured by PayPal SDK (came via ?orderId=), skip recapture
    if (parsed.captured) {
      setStatus('success')
      setData({
        success:     true,
        orderId:     parsed.orderId,
        sac1Amount:  parseInt(parsed.sac1) || 0,
        amountUsd:   parseFloat(parsed.amount) || 0,
        payerName:   parsed.name,
      })
      return
    }

    // PayPal redirect flow — capture via ?token=
    setStatus('capturing')
    fetch(CAPTURE_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ orderId: parsed.orderId }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData(d)
          setStatus('success')
        } else {
          setError(d.error || 'Payment capture failed. Please contact support.')
          setStatus('error')
        }
      })
      .catch(e => {
        setError(e.message || 'Network error. Please contact support.')
        setStatus('error')
      })
  }, [])

  const product = PRODUCT_MAP[params.source] || PRODUCT_MAP.SABLE_TOKENIZATION
  const sac1    = data?.sac1Amount || parseInt(params.sac1) || 0
  const usd     = data?.amountUsd  || parseFloat(params.amount) || 0
  const name    = data?.payerName  || params.name || ''

  return (
    <>
      <Head>
        <title>Payment Confirmed — SableAssent</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; min-height: 100vh; }
        .spinner { width: 48px; height: 48px; border: 5px solid #e5e7eb; border-top-color: #d4a017; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2340)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, background: '#d4a017', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#1e3a5f', fontSize: 18 }}>S</div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700 }}>SableAssent</div>
          <div style={{ color: '#93c5fd', fontSize: 12 }}>Secure Payment Portal</div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '40px auto', padding: '0 16px 60px' }}>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

          {/* Loading / Capturing */}
          {(status === 'loading' || status === 'capturing') && (
            <div style={{ padding: '60px 32px', textAlign: 'center' }}>
              <div className="spinner" style={{ marginBottom: 24 }} />
              <div style={{ fontWeight: 700, fontSize: 20, color: '#1e3a5f', marginBottom: 8 }}>
                {status === 'capturing' ? 'Confirming your payment...' : 'Loading...'}
              </div>
              <div style={{ color: '#6b7280', fontSize: 14 }}>Please don't close this page</div>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <div style={{ background: `linear-gradient(135deg, ${product.color}, ${product.color}dd)`, padding: '32px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 12 }}>✅</div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 24, marginBottom: 6 }}>Payment Confirmed!</div>
                {name && <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>Thank you, {name}</div>}
              </div>

              <div style={{ padding: '28px 28px' }}>
                {/* SAC1 highlight */}
                {sac1 > 0 && (
                  <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '2px solid #d4a017', borderRadius: 12, padding: '20px', marginBottom: 24, textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: '#92400e', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>SAC1 Tokens Purchased</div>
                    <div style={{ fontSize: 40, fontWeight: 900, color: '#1e3a5f' }}>{sac1.toLocaleString()}</div>
                    <div style={{ fontSize: 13, color: '#92400e', marginTop: 4 }}>SAC1 · Polygon PoS Network</div>
                    <div style={{ marginTop: 12, padding: '8px 16px', background: '#fff8e1', borderRadius: 8, fontSize: 13, color: '#6b7280' }}>
                      🕐 Token dispatch initiated · Delivery within 24 hours to your verified wallet
                    </div>
                  </div>
                )}

                {/* Order details */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>Order Details</div>
                  {[
                    ['Product',   product.label],
                    ['Amount',    usd > 0 ? formatUSD(usd) : '—'],
                    ['Order ID',  params.orderId?.slice(0,20) || '—'],
                    ['Status',    '✅ Confirmed & Queued for Dispatch'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                      <span style={{ color: '#6b7280' }}>{k}</span>
                      <span style={{ fontWeight: 600, color: '#1f2937', textAlign: 'right', maxWidth: '60%' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Next steps */}
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '16px', marginBottom: 24 }}>
                  <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 10, fontSize: 14 }}>📬 What happens next</div>
                  {[
                    '1. Confirmation email sent to your inbox',
                    '2. Compliance team verifies your KYC',
                    '3. SAC1 dispatched to your Polygon wallet within 24h',
                    '4. You\'ll receive a dispatch confirmation email',
                  ].map(s => (
                    <div key={s} style={{ fontSize: 13, color: '#1e40af', marginBottom: 6 }}>{s}</div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <a href={`https://sac1gov.com/wallet?email=${encodeURIComponent(data?.payerEmail || params.email || '')}&source=purchase`} style={{
                    flex: 1, padding: '13px', background: 'linear-gradient(135deg, #1e3a5f, #2d5a8f)',
                    color: '#fff', borderRadius: 10, textAlign: 'center', fontWeight: 700,
                    textDecoration: 'none', fontSize: 14,
                  }}>
                    Go to My Wallet →
                  </a>
                  <a href="https://pay.sableassent.com" style={{
                    flex: 1, padding: '13px', background: '#f3f4f6', color: '#374151',
                    borderRadius: 10, textAlign: 'center', fontWeight: 600,
                    textDecoration: 'none', fontSize: 14, border: '1px solid #e5e7eb',
                  }}>
                    Buy More SAC1
                  </a>
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {status === 'error' && (
            <div style={{ padding: '48px 28px', textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
              <div style={{ fontWeight: 700, fontSize: 20, color: '#b91c1c', marginBottom: 8 }}>Payment Issue</div>
              <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>{error}</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <a href="https://pay.sableassent.com" style={{
                  padding: '12px 24px', background: '#1e3a5f', color: '#fff',
                  borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14,
                }}>Try Again</a>
                <a href="mailto:support@sableassent.com" style={{
                  padding: '12px 24px', background: '#f3f4f6', color: '#374151',
                  borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14,
                  border: '1px solid #e5e7eb',
                }}>Contact Support</a>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
          Questions? Email <a href="mailto:support@sableassent.com" style={{ color: '#6b7280' }}>support@sableassent.com</a>
        </div>
      </div>
    </>
  )
}
