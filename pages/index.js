// pay.sableassent.com — Main checkout page (v1.3.2 + i18n)
// Reads ?source= and ?amount= from URL to auto-fill from any referring site

import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'

// i18n — dynamic import to avoid SSR issues
const GlobalLanguageBanner = dynamic(
  () => import('../utils/i18n/LanguageSelector').then(m => m.GlobalLanguageBanner),
  { ssr: false }
)
const NavbarLanguageButton = dynamic(
  () => import('../utils/i18n/LanguageSelector').then(m => m.NavbarLanguageButton),
  { ssr: false }
)

const API_BASE = 'https://app.base44.com/api/apps/6a13d16e7f282082e39578f6/functions'
const CREATE_URL = `${API_BASE}/paypalCreateOrder`

const PRODUCTS = [
  {
    customId: 'SAC1GOV_SUBSCRIPTION',
    label: 'SAC1 Gov Membership',
    site: 'sac1gov.com',
    icon: '⚖️',
    color: '#064e3b',
    accent: '#d97706',
    description: 'Governance voting rights, protocol proposals, SAC1 allocation',
    suggestedAmounts: [100, 500, 5000, 50000],
  },
  {
    customId: 'SABLE_TOKENIZATION',
    label: 'SableAssent Tokenization Services',
    site: 'sableassent.com',
    icon: '🪙',
    color: '#1e3a5f',
    accent: '#d4a017',
    description: 'SAC1 token purchase, treasury services, settlement access',
    suggestedAmounts: [10, 15, 20, 30, 50, 75, 100],
  },
  {
    customId: 'FRONTDESKAI_SUB',
    label: 'AI Front Desk SaaS',
    site: 'ourfrontdeskai.com',
    icon: '🤖',
    color: '#4f46e5',
    accent: '#0891b2',
    description: 'AI receptionist subscription — Starter, Growth, or Pro plan',
    suggestedAmounts: [97, 299, 549],
  },
]

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function Home() {
  const [mounted, setMounted]   = useState(false)
  const [source, setSource]     = useState('')
  const [amount, setAmount]     = useState('')
  const [email, setEmail]       = useState('')
  const [product, setProduct]   = useState(PRODUCTS[0])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    setMounted(true)
    const params = new URLSearchParams(window.location.search)
    const src = params.get('source') ?? ''
    const amt = params.get('amount') ?? ''
    const em  = params.get('email')  ?? ''
    setSource(src)
    if (amt) setAmount(amt)
    if (em)  setEmail(decodeURIComponent(em))
    const matched = PRODUCTS.find(p => p.customId === src)
    if (matched) setProduct(matched)
  }, [])

  const handleSubmit = async () => {
    setError('')
    const amt = parseFloat(amount)
    if (!amt || amt <= 0)    { setError('Please enter a valid payment amount.'); return }
    if (amt < 1)             { setError('Minimum payment is $1.00.'); return }
    if (amt > 100000)        { setError('Maximum single payment is $100,000.'); return }

    setLoading(true)
    try {
      const res = await fetch(CREATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          customId: product.customId,
          email,
          returnBaseUrl: 'https://pay.sableassent.com',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create payment')
      if (data.approvalUrl) window.location.href = data.approvalUrl
    } catch (err) {
      setError(err.message ?? 'Payment creation failed. Please try again.')
    }
    setLoading(false)
  }

  if (!mounted) return null

  return (
    <>
      <Head>
        <title>SableAssent Pay — Secure Payment Gateway</title>
        <meta name="description" content="Unified payment gateway for SableAssent, SAC1Gov, and OurFrontDeskAI — 170+ countries" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* ── Global Language Banner — sticky top bar ── */}
      <GlobalLanguageBanner site="SACPay" />

      <div style={{
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 28 }}>⬡</span>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em' }}>
              SableAssent Pay
            </span>
            {/* Compact language picker in header area */}
            <NavbarLanguageButton style={{ marginLeft: 8 }} />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            Unified Payment Gateway · pay.sableassent.com · 🌍 170+ Countries
          </div>
        </div>

        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 480,
          background: '#fff', borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        }}>
          {/* Card header */}
          <div style={{
            background: `linear-gradient(135deg, ${product.color}, ${product.accent})`,
            padding: '18px 24px',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 2 }}>Secure Payment</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{product.icon} {product.label}</div>
          </div>

          {/* Card body */}
          <div style={{ padding: 24 }}>

            {/* Product selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Payment For
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PRODUCTS.map(p => (
                  <button key={p.customId} onClick={() => { setProduct(p); setAmount('') }}
                    style={{
                      padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      border: `2px solid ${product.customId === p.customId ? p.color : '#e2e8f0'}`,
                      background: product.customId === p.customId ? `${p.color}08` : '#fafafa',
                      transition: 'all .12s', display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: product.customId === p.customId ? p.color : '#1e293b' }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{p.site}</div>
                    </div>
                    {product.customId === p.customId && (
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#fff', fontSize: 10 }}>✓</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick amounts */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Quick Select
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {product.suggestedAmounts.map(a => (
                  <button key={a} onClick={() => setAmount(String(a))}
                    style={{
                      padding: '7px 14px', borderRadius: 8,
                      border: `1.5px solid ${parseFloat(amount) === a ? product.color : '#e2e8f0'}`,
                      background: parseFloat(amount) === a ? product.color : '#fff',
                      color: parseFloat(amount) === a ? '#fff' : '#374151',
                      fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .12s',
                    }}>
                    ${a.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount input */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Amount (USD)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b', fontSize: 16 }}>$</span>
                <input
                  type="number" min="1" step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  style={{
                    width: '100%', padding: '13px 14px 13px 30px', borderRadius: 10, boxSizing: 'border-box',
                    border: `2px solid ${amount && parseFloat(amount) > 0 ? product.color : '#e2e8f0'}`,
                    fontSize: 18, fontWeight: 700, color: '#1e293b', outline: 'none', background: '#fff',
                  }}
                />
              </div>
              {amount && parseFloat(amount) > 0 && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  You will pay <strong>{formatUSD(parseFloat(amount))}</strong> for <strong>{product.label}</strong>
                </div>
              )}
            </div>

            {/* Email */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email (optional)
              </label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10, boxSizing: 'border-box',
                  border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{
                background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10,
                padding: '10px 14px', fontSize: 13, color: '#991b1b', marginBottom: 16,
              }}>⚠️ {error}</div>
            )}

            {/* Pay button */}
            <button
              onClick={handleSubmit}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              style={{
                width: '100%', padding: '15px', borderRadius: 12, border: 'none',
                background: loading || !amount || parseFloat(amount) <= 0
                  ? '#e2e8f0'
                  : 'linear-gradient(135deg, #003087, #009cde)',
                color: loading || !amount || parseFloat(amount) <= 0 ? '#94a3b8' : '#fff',
                fontWeight: 800, fontSize: 16,
                cursor: loading || !amount || parseFloat(amount) <= 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              {loading ? '⏳ Creating order…' : `🅿 Pay ${amount && parseFloat(amount) > 0 ? formatUSD(parseFloat(amount)) : ''} with PayPal`}
            </button>

            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#94a3b8' }}>
              🔒 Secured by PayPal · You will be redirected to complete payment
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 20, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
          🔒 256-bit SSL · PayPal Secured · SableAssent Global Ltd · 🌍 170+ Countries
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
          {PRODUCTS.map(p => (
            <a key={p.site} href={`https://${p.site}`}
              style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
              {p.site}
            </a>
          ))}
        </div>
      </div>
    </>
  )
}
