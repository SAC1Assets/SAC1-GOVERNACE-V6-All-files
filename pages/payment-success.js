import Head from 'next/head'
import { useState, useEffect } from 'react'

const CAPTURE_URL = 'https://app.base44.com/api/apps/6a13d16e7f282082e39578f6/functions/paypalCaptureOrder'
const PRODUCT_MAP = {
  SAC1GOV_SUBSCRIPTION: { label: 'SAC1 Gov Membership',       site: '[sac1gov.com](https://sac1gov.com)',       color: '#064e3b' },
  SABLE_TOKENIZATION:   { label: 'SableAssent Tokenization',   site: '[sableassent.com](https://sableassent.com)',   color: '#1e3a5f' },
  FRONTDESKAI_SUB:      { label: 'AI Front Desk SaaS',         site: '[ourfrontdeskai.com](https://ourfrontdeskai.com)', color: '#4f46e5' },
}

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function PaymentSuccess() {
  const [status, setStatus] = useState('capturing')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [source, setSource] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const src = params.get('source') ?? ''
    setSource(src)
    if (!token) { setStatus('error'); setError('No order token found. Please contact support.'); return }
    fetch(CAPTURE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: token }) })
      .then(r => r.json())
      .then(d => { if (d.success) { setData(d); setStatus('success') } else { setError(d.error ?? 'Capture failed'); setStatus('error') } })
      .catch(e => { setError([e.me](https://e.me)ssage); setStatus('error') })
  }, [])

  const product = PRODUCT_MAP[source] ?? PRODUCT_MAP.SABLE_TOKENIZATION

  return (
    <>
      <Head>
        <title>Payment Confirmed — SableAssent Pay</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}>
          <div style={{ background: `linear-gradient(135deg, ${product.color}, #d4a017)`, padding: '18px 24px' }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 2 }}>{status === 'capturing' ? 'Processing…' : status === 'success' ? 'Payment Complete' : 'Payment Error'}</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{product.label}</div>
          </div>
          <div style={{ padding: 24, textAlign: 'center' }}>
            {status === 'capturing' && (<><div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div><div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Confirming your payment…</div><div style={{ fontSize: 14, color: '#64748b' }}>Please wait, this takes just a moment.</div></>)}
            {status === 'success' && (
              <>
                <div style={{ fontSize: 56, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981', marginBottom: 8 }}>Payment Confirmed!</div>
                <div style={{ fontSize: 14, color: '#475569', marginBottom: 24, lineHeight: 1.7 }}>Your payment has been captured and confirmed by PayPal.{data?.payerEmail && <> A receipt was sent to <strong>{data.payerEmail}</strong>.</>}</div>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, marginBottom: 20, textAlign: 'left' }}>
                  {[['Capture ID', data?.captureId ?? '—'], ['Amount', data?.amount != null ? formatUSD(data.amount) : '—'], ['PayPal Fee', data?.paypalFee != null ? formatUSD(data.paypalFee) : '—'], ['Net Amount', data?.netAmount != null ? formatUSD([data.net](https://data.net)Amount) : '—'], ['Payer', data?.payerName || '—']].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: '#64748b' }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <a href={`https://${product.site}`} style={{ display: 'block', padding: '13px', borderRadius: 12, background: product.color, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none', marginBottom: 10 }}>Return to {product.site} →</a>
                <a href="/" style={{ display: 'block', padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: 14 }}>Make Another Payment</a>
              </>
            )}
            {status === 'error' && (<><div style={{ fontSize: 52, marginBottom: 8 }}>⚠️</div><div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>Something went wrong</div><div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>{error}</div><a href="/" style={{ display: 'block', padding: '13px', borderRadius: 12, background: product.color, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Try Again →</a></>)}
          </div>
        </div>
      </div>
    </>
  )
}
