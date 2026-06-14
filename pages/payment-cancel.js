import Head from 'next/head'
import { useState, useEffect } from 'react'

const PRODUCT_MAP = {
  SAC1GOV_SUBSCRIPTION: { label: 'SAC1 Gov Membership',      site: '[sac1gov.com](https://sac1gov.com)',        color: '#064e3b' },
  SABLE_TOKENIZATION:   { label: 'SableAssent Tokenization',  site: '[sableassent.com](https://sableassent.com)',    color: '#1e3a5f' },
  FRONTDESKAI_SUB:      { label: 'AI Front Desk SaaS',        site: '[ourfrontdeskai.com](https://ourfrontdeskai.com)', color: '#4f46e5' },
}

export default function PaymentCancel() {
  const [source, setSource] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSource(params.get('source') ?? '')
  }, [])

  const product = PRODUCT_MAP[source] ?? PRODUCT_MAP.SABLE_TOKENIZATION

  return (
    <>
      <Head>
        <title>Payment Cancelled — SableAssent Pay</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}>
          <div style={{ background: `linear-gradient(135deg, ${product.color}, #d4a017)`, padding: '18px 24px' }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 2 }}>Payment Cancelled</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{product.label}</div>
          </div>
          <div style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>❌</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>Payment Cancelled</div>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
              Your payment was cancelled. No charges were made to your account. You can try again whenever you're ready.
            </div>
            <a href={`/?source=${source}`} style={{ display: 'block', padding: '13px', borderRadius: 12, background: product.color, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none', marginBottom: 10 }}>
              Try Again →
            </a>
            <a href={`https://${product.site}`} style={{ display: 'block', padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: 14 }}>
              Return to {product.site}
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
