// pay.sableassent.com — Main checkout page v1.4.0
// Flow: Account Info → KYC (Persona) → Payment (PayPal)
// Persona gates payment — no KYC, no pay.

import Head from 'next/head'
import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'

const API_BASE   = 'https://app.base44.com/api/apps/6a13d16e7f282082e39578f6/functions'
const CREATE_URL = `${API_BASE}/paypalCreateOrder`
const TEMPLATE_ID = process.env.NEXT_PUBLIC_PERSONA_TEMPLATE_ID || 'itmpl_ARUhdWEQ35wTqGaCeAk7hatZEg3TbL'

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
    label: 'SAC1 Token Purchase',
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

// KYC steps
const STEP_INFO    = 'info'      // collect name + email
const STEP_KYC     = 'kyc'      // Persona iframe
const STEP_PAYMENT = 'payment'  // PayPal
const STEP_DONE    = 'done'

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function StepBar({ step }) {
  const steps = [
    { id: STEP_INFO,    label: 'Your Info',  icon: '👤' },
    { id: STEP_KYC,     label: 'Verify ID',  icon: '🔒' },
    { id: STEP_PAYMENT, label: 'Payment',    icon: '💳' },
  ]
  const current = steps.findIndex(s => s.id === step)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
      {steps.map((s, i) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 18,
              background: i <= current ? '#d4a017' : '#e5e7eb',
              color: i <= current ? '#fff' : '#9ca3af',
              fontWeight: 700, border: i === current ? '3px solid #1e3a5f' : '3px solid transparent',
              transition: 'all 0.3s',
            }}>
              {i < current ? '✓' : s.icon}
            </div>
            <span style={{ fontSize: 11, color: i <= current ? '#1e3a5f' : '#9ca3af', fontWeight: i === current ? 700 : 400 }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              width: 60, height: 3, margin: '0 4px', marginBottom: 20,
              background: i < current ? '#d4a017' : '#e5e7eb', transition: 'all 0.3s',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

// Persona KYC Component — loads Persona.js SDK dynamically
function PersonaKYC({ email, fullName, onComplete, onError }) {
  const containerRef = useRef(null)
  const clientRef    = useRef(null)
  const [status, setStatus]   = useState('loading') // loading | ready | completed | failed
  const [message, setMessage] = useState('Loading identity verification...')

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Load Persona.js SDK
    const existing = document.getElementById('persona-sdk')
    const init = () => {
      if (!window.Persona) { setStatus('failed'); setMessage('Failed to load Persona SDK.'); return }

      const [firstName, ...rest] = (fullName || '').split(' ')
      const lastName = rest.join(' ')

      const client = new window.Persona.Client({
        templateId: TEMPLATE_ID,
        environment: 'production',
        prefill: {
          emailAddress: email || '',
          nameFirst:    firstName || '',
          nameLast:     lastName  || '',
        },
        onReady:    ()           => { setStatus('ready'); setMessage('') },
        onComplete: ({ inquiryId, status: s, fields }) => {
          setStatus('completed')
          setMessage('✅ Identity verified! Proceeding to payment...')
          onComplete({ inquiryId, status: s, fields })
        },
        onCancel:   ({ inquiryId, sessionToken }) => {
          setStatus('failed')
          setMessage('Verification cancelled. Please complete KYC to proceed.')
        },
        onError:    (error) => {
          setStatus('failed')
          setMessage(`Verification error: ${error.message || 'Please try again.'}`)
          onError && onError(error)
        },
      })

      client.open()
      clientRef.current = client

      // Embed into container
      if (containerRef.current) {
        client.render(containerRef.current)
      }
    }

    if (!existing) {
      const script  = document.createElement('script')
      script.id     = 'persona-sdk'
      script.src    = 'https://cdn.withpersona.com/dist/persona-v4.9.0.js'
      script.async  = true
      script.onload = init
      script.onerror = () => { setStatus('failed'); setMessage('Failed to load verification system.') }
      document.head.appendChild(script)
    } else {
      if (window.Persona) init()
      else existing.addEventListener('load', init)
    }

    return () => { clientRef.current?.destroy?.() }
  }, [email, fullName, onComplete, onError])

  return (
    <div>
      {status === 'loading' && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ color: '#1e3a5f', fontWeight: 600, marginBottom: 8 }}>Setting up identity verification...</div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>Powered by Persona — bank-grade KYC</div>
          <div style={{ marginTop: 20 }}>
            <div className="spinner" />
          </div>
        </div>
      )}
      {status === 'completed' && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
          <div style={{ color: '#065f46', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Identity Verified!</div>
          <div style={{ color: '#6b7280' }}>Proceeding to payment...</div>
        </div>
      )}
      {status === 'failed' && (
        <div style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ color: '#b91c1c', fontWeight: 600, marginBottom: 16 }}>{message}</div>
          <button onClick={() => window.location.reload()} style={{
            padding: '10px 28px', background: '#1e3a5f', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
          }}>Try Again</button>
        </div>
      )}
      <div ref={containerRef} id="persona-container" style={{ minHeight: 520 }} />
    </div>
  )
}

// PayPal button component
function PayPalButton({ amount, product, email, fullName, inquiryId }) {
  const containerRef = useRef(null)
  const [loaded, setLoaded]   = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !amount) return

    const existing = document.getElementById('paypal-sdk')
    const initPayPal = () => {
      if (!window.paypal) { setError('PayPal failed to load.'); return }

      window.paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 50 },
        createOrder: async () => {
          setLoading(true); setError('')
          const res = await fetch(CREATE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: parseFloat(amount),
              customId: product.customId,
              email,
              fullName,
              inquiryId,
              returnBaseUrl: 'https://pay.sableassent.com',
            }),
          })
          const data = await res.json()
          setLoading(false)
          if (!res.ok || !data.orderId) throw new Error(data.error || 'Order creation failed')
          return data.orderId
        },
        onApprove: async (data) => {
          setLoading(true)
          const res = await fetch(`${API_BASE}/paypalCaptureOrder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderID, email, inquiryId }),
          })
          const result = await res.json()
          setLoading(false)
          if (result.success) {
            window.location.href = `/payment-success?orderId=${data.orderID}&amount=${amount}&sac1=${result.sac1Amount || ''}&name=${encodeURIComponent(fullName)}`
          } else {
            setError(result.error || 'Payment capture failed.')
          }
        },
        onError: (err) => { setLoading(false); setError('PayPal error. Please try again.') },
        onCancel: ()    => { setLoading(false); setError('Payment cancelled.') },
      }).render(containerRef.current)
      setLoaded(true)
    }

    if (!existing) {
      const script  = document.createElement('script')
      script.id     = 'paypal-sdk'
      script.src    = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'AbnTqBk2pJQkDLzs2L26Sj_YWEJagEsv0JiNJeE4B2vwfP3YwHVIJ7Bk7BT0NPuyxHTmFIc8XiH_pBVl'}&currency=USD&intent=capture`
      script.async  = true
      script.onload = initPayPal
      document.head.appendChild(script)
    } else {
      if (window.paypal) initPayPal()
    }
  }, [amount, product, email, fullName, inquiryId])

  return (
    <div>
      {loading && (
        <div style={{ textAlign: 'center', padding: '12px 0', color: '#1e3a5f', fontWeight: 600 }}>
          Processing...
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#b91c1c', fontSize: 14 }}>
          {error}
        </div>
      )}
      <div ref={containerRef} />
    </div>
  )
}

export default function Home() {
  const [mounted, setMounted]     = useState(false)
  const [step, setStep]           = useState(STEP_INFO)
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [amount, setAmount]       = useState('')
  const [product, setProduct]     = useState(PRODUCTS[1])
  const [inquiryId, setInquiryId] = useState('')
  const [kycFields, setKycFields] = useState(null)
  const [infoError, setInfoError] = useState('')

  useEffect(() => {
    setMounted(true)
    const params  = new URLSearchParams(window.location.search)
    const src     = params.get('source') ?? ''
    const amt     = params.get('amount') ?? ''
    const em      = params.get('email')  ?? ''
    const nm      = params.get('name')   ?? ''
    if (amt) setAmount(amt)
    if (em)  setEmail(decodeURIComponent(em))
    if (nm)  setFullName(decodeURIComponent(nm))
    const matched = PRODUCTS.find(p => p.customId === src)
    if (matched) setProduct(matched)
  }, [])

  const handleInfoNext = () => {
    setInfoError('')
    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      setInfoError('Please enter your full name (first and last).')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setInfoError('Please enter a valid email address.')
      return
    }
    const amt = parseFloat(amount)
    if (!amt || amt < 1)       { setInfoError('Minimum purchase is $1.00.'); return }
    if (amt > 100000)          { setInfoError('Maximum single purchase is $100,000.'); return }
    setStep(STEP_KYC)
  }

  const handleKYCComplete = useCallback(({ inquiryId: id, status, fields }) => {
    setInquiryId(id)
    setKycFields(fields)
    // Short delay so user sees the success state
    setTimeout(() => setStep(STEP_PAYMENT), 1800)
  }, [])

  const sac1Estimate = amount ? Math.floor(parseFloat(amount) / 0.0889) : 0

  if (!mounted) return null

  return (
    <>
      <Head>
        <title>SableAssent — Secure Payment Portal</title>
        <meta name="description" content="Purchase SAC1 tokens securely with identity verification" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; min-height: 100vh; }
        input, select { outline: none; }
        input:focus { border-color: #1e3a5f !important; box-shadow: 0 0 0 3px rgba(30,58,95,0.12); }
        .spinner {
          width: 36px; height: 36px; border: 4px solid #e5e7eb;
          border-top-color: #d4a017; border-radius: 50%;
          animation: spin 0.8s linear infinite; margin: 0 auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .btn-primary {
          width: 100%; padding: 14px; background: linear-gradient(135deg, #1e3a5f, #2d5a8f);
          color: #fff; border: none; border-radius: 10px; font-size: 16px;
          font-weight: 700; cursor: pointer; transition: all 0.2s;
          letter-spacing: 0.3px;
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(30,58,95,0.3); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .input-field {
          width: 100%; padding: 13px 14px; border: 2px solid #e5e7eb;
          border-radius: 10px; font-size: 15px; color: #1f2937;
          transition: border-color 0.2s, box-shadow 0.2s;
          background: #fff;
        }
        .amount-btn {
          flex: 1; padding: 10px 6px; border: 2px solid #e5e7eb;
          border-radius: 8px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; background: #fff; color: #374151;
        }
        .amount-btn:hover { border-color: #d4a017; color: #92400e; }
        .amount-btn.active { border-color: #d4a017; background: #fffbeb; color: #92400e; }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2340 100%)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: '#d4a017', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#1e3a5f', fontSize: 18 }}>S</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>SableAssent</div>
            <div style={{ color: '#93c5fd', fontSize: 11 }}>Secure Payment Portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '6px 14px' }}>
          <span style={{ fontSize: 12 }}>🔒</span>
          <span style={{ color: '#93c5fd', fontSize: 12, fontWeight: 600 }}>256-bit SSL</span>
        </div>
      </div>

      {/* Compliance Banner */}
      <div style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a', padding: '8px 20px', textAlign: 'center', fontSize: 12, color: '#92400e' }}>
        🛡️ Regulated digital asset platform · KYC/AML verified · FATF compliant · All transactions monitored
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: 520, margin: '32px auto', padding: '0 16px 60px' }}>

        {/* Product Selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {PRODUCTS.map(p => (
            <button key={p.customId} onClick={() => { setProduct(p); setAmount('') }} style={{
              flex: 1, padding: '10px 6px', border: `2px solid ${product.customId === p.customId ? p.accent : '#e5e7eb'}`,
              borderRadius: 10, background: product.customId === p.customId ? p.color : '#fff',
              color: product.customId === p.customId ? '#fff' : '#6b7280',
              cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.2s', textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, marginBottom: 2 }}>{p.icon}</div>
              <div>{p.label.split(' ').slice(0, 2).join(' ')}</div>
            </button>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {/* Card Header */}
          <div style={{ background: `linear-gradient(135deg, ${product.color}, ${product.color}dd)`, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 32 }}>{product.icon}</span>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>{product.label}</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{product.description}</div>
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div style={{ padding: '28px 24px' }}>
            <StepBar step={step} />

            {/* ── STEP 1: INFO ── */}
            {step === STEP_INFO && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f', marginBottom: 4 }}>Your Information</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>Required for compliance and token delivery</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Full Legal Name *</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="First Last"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email Address *</label>
                    <input
                      className="input-field"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Purchase Amount (USD) *
                    </label>
                    {product.suggestedAmounts && (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                        {product.suggestedAmounts.slice(0, 5).map(a => (
                          <button key={a} className={`amount-btn ${parseFloat(amount) === a ? 'active' : ''}`}
                            onClick={() => setAmount(String(a))}>
                            {formatUSD(a)}
                          </button>
                        ))}
                      </div>
                    )}
                    <input
                      className="input-field"
                      type="number"
                      placeholder="Enter amount (min $1)"
                      value={amount}
                      min="1"
                      onChange={e => setAmount(e.target.value)}
                    />
                    {amount && parseFloat(amount) > 0 && product.customId === 'SABLE_TOKENIZATION' && (
                      <div style={{ marginTop: 8, padding: '10px 14px', background: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#1e40af', fontWeight: 600 }}>
                        ≈ {sac1Estimate.toLocaleString()} SAC1 tokens at $0.0889/SAC1
                      </div>
                    )}
                  </div>
                </div>

                {infoError && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#b91c1c', fontSize: 13 }}>
                    {infoError}
                  </div>
                )}

                <div style={{ marginTop: 20 }}>
                  <button className="btn-primary" onClick={handleInfoNext}>
                    Continue to Identity Verification →
                  </button>
                </div>

                <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
                  🔒 Identity verification is required by law for digital asset purchases
                </div>
              </div>
            )}

            {/* ── STEP 2: KYC ── */}
            {step === STEP_KYC && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f', marginBottom: 4 }}>Identity Verification</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>
                    Securely verify your identity with a government-issued ID. Required by FATF AML regulations.
                  </div>
                </div>

                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#0369a1' }}>
                  <strong>What you'll need:</strong> Government photo ID (passport, driver's license, or national ID) + selfie
                </div>

                <PersonaKYC
                  email={email}
                  fullName={fullName}
                  onComplete={handleKYCComplete}
                  onError={(err) => console.error('KYC error:', err)}
                />

                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <button onClick={() => setStep(STEP_INFO)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                    ← Go back
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: PAYMENT ── */}
            {step === STEP_PAYMENT && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f', marginBottom: 4 }}>Complete Payment</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>KYC verified ✅ — you're cleared to pay</div>
                </div>

                {/* Order Summary */}
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 12, fontSize: 15 }}>Order Summary</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                    <span style={{ color: '#6b7280' }}>Product</span>
                    <span style={{ fontWeight: 600 }}>{product.label}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                    <span style={{ color: '#6b7280' }}>Verified Name</span>
                    <span style={{ fontWeight: 600 }}>{fullName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                    <span style={{ color: '#6b7280' }}>Email</span>
                    <span style={{ fontWeight: 600 }}>{email}</span>
                  </div>
                  {product.customId === 'SABLE_TOKENIZATION' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                      <span style={{ color: '#6b7280' }}>SAC1 Tokens</span>
                      <span style={{ fontWeight: 600, color: '#d4a017' }}>≈ {sac1Estimate.toLocaleString()} SAC1</span>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#1e3a5f' }}>Total</span>
                    <span style={{ fontWeight: 800, fontSize: 20, color: '#1e3a5f' }}>{formatUSD(parseFloat(amount))}</span>
                  </div>
                </div>

                {/* KYC Badge */}
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <div>
                    <strong style={{ color: '#065f46' }}>Identity Verified</strong>
                    <span style={{ color: '#6b7280', marginLeft: 6 }}>Inquiry ID: {inquiryId?.slice(0, 16)}...</span>
                  </div>
                </div>

                <PayPalButton
                  amount={amount}
                  product={product}
                  email={email}
                  fullName={fullName}
                  inquiryId={inquiryId}
                />

                <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
                  Secured by PayPal · SAC1 delivered to your Polygon wallet within 24 hours
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>
          <div>🛡️ SableAssent Global Ltd · Regulated Digital Asset Platform</div>
          <div style={{ marginTop: 4 }}>
            <a href="https://sableassent.com/terms" style={{ color: '#9ca3af' }}>Terms</a>
            {' · '}
            <a href="https://sableassent.com/privacy" style={{ color: '#9ca3af' }}>Privacy</a>
            {' · '}
            <a href="https://sableassent.com/compliance" style={{ color: '#9ca3af' }}>Compliance</a>
          </div>
          <div style={{ marginTop: 4 }}>FATF compliant · OFAC screened · Travel Rule enforced</div>
        </div>
      </div>
    </>
  )
}
