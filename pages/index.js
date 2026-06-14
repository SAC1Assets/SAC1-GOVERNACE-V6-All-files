import Head from 'next/head'
import { useState, useEffect } from 'react'

const API_BASE = 'https://app.base44.com/api/apps/6a13d16e7f282082e39578f6/functions'
const CREATE_URL = `${API_BASE}/paypalCreateOrder`

const PRODUCTS = [
  { customId: 'SAC1GOV_SUBSCRIPTION', label: 'SAC1 Gov Membership', site: '[sac1gov.com](https://sac1gov.com)', icon: '⚖️', color: '#064e3b', accent: '#d97706', description: 'Governance voting rights, protocol proposals, SAC1 allocation', suggestedAmounts: [100, 500, 5000, 50000] },
  { customId: 'SABLE_TOKENIZATION', label: 'SableAssent Tokenization Services', site: '[sableassent.com](https://sableassent.com)', icon: '🪙', color: '#1e3a5f', accent: '#d4a017', description: 'SAC1 token purchase, treasury services, settlement access', suggestedAmounts: [10, 15, 20, 30, 50, 75, 100] },
  { customId: 'FRONTDESKAI_SUB', label: 'AI Front Desk SaaS', site: '[ourfrontdeskai.com](https://ourfrontdeskai.com)', icon: '🤖', color: '#4f46e5', accent: '#0891b2', description: 'AI receptionist subscription — Starter, Growth, or Pro plan', suggestedAmounts: [97, 299, 549] },
]

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [amount, setAmount] = useState('')
  const [email, setEmail] = useState('')
  const [product, setProduct] = useState(PRODUCTS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setMounted(true)
    const params = new URLSearchParams(window.location.search)
    const src = params.get('source') ?? ''
    const amt = params.get('amount') ?? ''
    const em = params.get('email') ?? ''
    if (amt) setAmount(amt)
    if (em) setEmail(decodeURIComponent(em))
    const matched = PRODUCTS.find(p => p.customId === src)
    if (matched) setProduct(matched)
  }, [])

  const handleSubmit = async () => {
    setError('')
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError('Please enter a valid payment amount.'); return }
    if (amt < 1) { setError('Minimum payment is $1.00.'); return }
    if (amt > 100000) { setError('Maximum single payment is $100,000.'); return }
    setLoading(true)
    try {
      const res = await fetch(CREATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, customId: product.customId, email, returnBaseUrl: 'https://pay.sableassent.com' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create payment')
      if ([data.app](https://data.app)rovalUrl) window.location.href = [data.app](https://data.app)rovalUrl
    } catch (err) {
      setError([err.me](https://err.me)ssage ?? 'Payment creation failed. Please try again.')
    }
    setLoading(false)
  }

  if (!mounted) return null

  return (
    <>
      <Head>
        <title>SableAssent Pay — Secure Payment Gateway</title>
        <meta name="description" content="Unified payment gateway for SableAssent, SAC1Gov, and OurFrontDeskAI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 28 }}>⬡</span>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>SableAssent Pay</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Unified Payment Gateway · [pay.sableassent.com](https://pay.sableassent.com)</div>
        </div>
        <div style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}>
          <div style={{ background: `linear-gradient(135deg, ${product.color}, ${product.accent})`, padding: '18px 24px' }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 2 }}>Secure Payment</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{product.icon} {product.label}</div>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase' }}>Payment For</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PRODUCTS.map(p => (
                  <button key={p.customId} onClick={() => { setProduct(p); setAmount('') }}
                    style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', border: `2px solid ${product.customId === p.customId ? p.color : '#e2e8f0'}`, background: product.customId === p.customId ? `${p.color}08` : '#fafafa', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: product.customId === p.customId ? p.color : '#1e293b' }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{p.site}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase' }}>Quick Select</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {product.suggestedAmounts.map(a => (
                  <button key={a} onClick={() => setAmount(String(a))}
                    style={{ padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${parseFloat(amount) === a ? product.color : '#e2e8f0'}`, background: parseFloat(amount) === a ? product.color : '#fff', color: parseFloat(amount) === a ? '#fff' : '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    ${a.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>Amount (USD)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b', fontSize: 16 }}>$</span>
                <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount"
                  style={{ width: '100%', padding: '13px 14px 13px 30px', borderRadius: 10, boxSizing: 'border-box', border: `2px solid ${amount && parseFloat(amount) > 0 ? product.color : '#e2e8f0'}`, fontSize: 18, fontWeight: 700, color: '#1e293b', outline: 'none' }} />
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>Email (optional)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@[email.com](https://email.com)"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, boxSizing: 'border-box', border: '2px solid #e2e8f0', fontSize: 14, color: '#1e293b', outline: 'none' }} />
            </div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <button onClick={handleSubmit} disabled={loading || !amount}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading || !amount ? '#94a3b8' : `linear-gradient(135deg, ${product.color}, ${product.accent})`, color: '#fff', fontWeight: 800, fontSize: 16, cursor: loading || !amount ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Processing...' : `Pay ${amount ? formatUSD(parseFloat(amount)) : ''} via PayPal`}
            </button>
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#94a3b8' }}>🔒 256-bit SSL · PayPal Secured · FATF Compliant</div>
          </div>
        </div>
      </div>
    </>
  )
}
