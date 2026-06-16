// ─────────────────────────────────────────────────────────────────────────────
// SableAssent — Executive Admin Portal  /admin
// Email-gated access for executive staff
// Loads the Base44 Compliance Dashboard in a full-screen iframe once verified
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import Head from 'next/head';

// ── Authorised executive staff emails ────────────────────────────────────────
const AUTHORISED_EMAILS = [
  'daryl@sableassent.net',
  'iimpacttheworld@gmail.com',
  'admin@sableassent.com',
  'compliance@sableassent.com',
  'ceo@sableassent.com',
  'cfo@sableassent.com',
  'cco@sableassent.com',
  'legal@sableassent.com',
  'operations@sableassent.com',
];

// Base44 Compliance Dashboard URL
const DASHBOARD_URL = 'https://app.base44.com/superagent/6a13d16e7f282082e39578f6';

export default function AdminPortal() {
  const [step, setStep]           = useState('email');   // email | code | dashboard
  const [email, setEmail]         = useState('');
  const [code, setCode]           = useState('');
  const [sentCode, setSentCode]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [staffName, setStaffName] = useState('');
  const [timeLeft, setTimeLeft]   = useState(300); // 5 min expiry

  // Restore session
  useEffect(() => {
    const saved = sessionStorage.getItem('sa_admin_auth');
    if (saved) {
      try {
        const { email: e, ts } = JSON.parse(saved);
        if (Date.now() - ts < 4 * 60 * 60 * 1000) { // 4hr session
          setEmail(e);
          setStep('dashboard');
        }
      } catch {}
    }
  }, []);

  // Countdown timer for OTP
  useEffect(() => {
    if (step !== 'code') return;
    setTimeLeft(300);
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); setStep('email'); setError('Code expired. Please try again.'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [step]);

  const fmtTime = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  // ── Step 1: Verify email ───────────────────────────────────────────────────
  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!AUTHORISED_EMAILS.includes(trimmed)) {
      setError('This email is not authorised for admin access. Contact compliance@sableassent.com to request access.');
      return;
    }
    setLoading(true);
    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    setSentCode(otp);

    // Send OTP via our backend
    try {
      await fetch('/api/send-admin-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, otp }),
      });
      // Derive staff name from email prefix
      const prefix = trimmed.split('@')[0];
      const nameMap = {
        daryl: 'Daryl', admin: 'Admin', compliance: 'Compliance Officer',
        ceo: 'Chief Executive', cfo: 'Chief Financial Officer',
        cco: 'Chief Compliance Officer', legal: 'Legal Counsel', operations: 'Operations',
      };
      setStaffName(nameMap[prefix] || prefix.charAt(0).toUpperCase() + prefix.slice(1));
      setStep('code');
    } catch {
      setError('Failed to send code. Please try again.');
    }
    setLoading(false);
  }

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  function handleCodeSubmit(e) {
    e.preventDefault();
    setError('');
    if (code.trim() !== sentCode) {
      setError('Incorrect code. Please check your email and try again.');
      return;
    }
    sessionStorage.setItem('sa_admin_auth', JSON.stringify({ email, ts: Date.now() }));
    setStep('dashboard');
  }

  // ── Step 3: Dashboard ─────────────────────────────────────────────────────
  if (step === 'dashboard') {
    return (
      <>
        <Head>
          <title>SableAssent Admin Portal</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#0f2340' }}>
          {/* Top bar */}
          <div style={{
            height: 48, background: 'linear-gradient(135deg,#1e3a5f,#0f2340)',
            borderBottom: '1px solid rgba(212,160,23,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, background: '#d4a017', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 14, color: '#1e3a5f',
              }}>S</div>
              <span style={{ color: '#d4a017', fontWeight: 700, fontSize: 13, letterSpacing: '0.05em' }}>
                SABLEASSENT EXECUTIVE PORTAL
              </span>
              <span style={{
                background: 'rgba(212,160,23,0.15)', border: '1px solid rgba(212,160,23,0.4)',
                color: '#d4a017', fontSize: 10, fontWeight: 700, padding: '2px 8px',
                borderRadius: 20, letterSpacing: '0.1em',
              }}>RESTRICTED ACCESS</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>
                🔒 {email}
              </span>
              <button
                onClick={() => { sessionStorage.removeItem('sa_admin_auth'); setStep('email'); setEmail(''); setCode(''); }}
                style={{
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#fca5a5', fontSize: 12, padding: '4px 12px', borderRadius: 6,
                  cursor: 'pointer', fontWeight: 600,
                }}
              >Sign Out</button>
            </div>
          </div>
          {/* Dashboard iframe */}
          <iframe
            src={DASHBOARD_URL}
            style={{ flex: 1, border: 'none', width: '100%' }}
            allow="fullscreen"
            title="SableAssent Compliance Dashboard"
          />
        </div>
      </>
    );
  }

  // ── Auth screens (shared card layout) ────────────────────────────────────
  return (
    <>
      <Head>
        <title>SableAssent Admin — Sign In</title>
        <meta name="robots" content="noindex,nofollow" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          input { font-family: inherit; }
          input:focus { outline: none; }
          button:hover { opacity: 0.9; }
          .input-field {
            width: 100%; padding: 13px 16px;
            background: rgba(255,255,255,0.07);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px; color: #fff; font-size: 15px;
            transition: border-color 0.2s;
          }
          .input-field:focus { border-color: #d4a017; background: rgba(255,255,255,0.1); }
          .input-field::placeholder { color: rgba(255,255,255,0.35); }
          .btn-primary {
            width: 100%; padding: 14px;
            background: linear-gradient(135deg,#d4a017,#b8860b);
            color: #1e3a5f; border: none; border-radius: 10px;
            font-size: 15px; font-weight: 800; cursor: pointer;
            transition: opacity 0.2s; letter-spacing: 0.03em;
          }
          .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        `}</style>
      </Head>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg,#0a1628 0%,#1e3a5f 50%,#0f2340 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
        {/* Background pattern */}
        <div style={{
          position: 'fixed', inset: 0, opacity: 0.03,
          backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,1) 40px,rgba(255,255,255,1) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,1) 40px,rgba(255,255,255,1) 41px)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 72, height: 72, background: '#d4a017', borderRadius: '50%',
              margin: '0 auto 16px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 32, fontWeight: 900, color: '#1e3a5f',
              boxShadow: '0 8px 32px rgba(212,160,23,0.3)',
            }}>S</div>
            <div style={{ color: '#d4a017', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', marginBottom: 6 }}>
              SABLEASSENT GLOBAL
            </div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>Executive Admin Portal</div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Restricted — Authorised Staff Only</div>
          </div>

          {/* Card */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: 36,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          }}>

            {/* ── EMAIL STEP ── */}
            {step === 'email' && (
              <form onSubmit={handleEmailSubmit}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
                    🔐 Enter your authorised staff email to receive a one-time access code.
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Staff Email Address
                  </label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="you@sableassent.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    required
                    autoFocus
                  />
                </div>
                {error && (
                  <div style={{
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                    color: '#fca5a5', fontSize: 13,
                  }}>{error}</div>
                )}
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Sending Code…' : 'Send Access Code →'}
                </button>
              </form>
            )}

            {/* ── OTP STEP ── */}
            {step === 'code' && (
              <form onSubmit={handleCodeSubmit}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: '#10b981', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    ✅ Code sent to {email}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>
                    Welcome, {staffName}. Enter the 6-digit code from your email.
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    6-Digit Access Code
                    <span style={{ float: 'right', color: timeLeft < 60 ? '#ef4444' : '#64748b', fontWeight: 400 }}>
                      ⏱ {fmtTime(timeLeft)}
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="000000"
                    value={code}
                    onChange={e => { setCode(e.target.value.replace(/\D/g,'')); setError(''); }}
                    maxLength={6}
                    pattern="\d{6}"
                    required
                    autoFocus
                    style={{ fontSize: 24, letterSpacing: '0.3em', textAlign: 'center' }}
                  />
                </div>
                {error && (
                  <div style={{
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                    color: '#fca5a5', fontSize: 13,
                  }}>{error}</div>
                )}
                <button type="submit" className="btn-primary" disabled={code.length !== 6}>
                  Verify & Enter Dashboard →
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setCode(''); setError(''); }}
                  style={{
                    width: '100%', marginTop: 10, padding: '10px',
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8', borderRadius: 10, cursor: 'pointer', fontSize: 13,
                  }}
                >← Use a different email</button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 24, color: '#334155', fontSize: 12 }}>
            Unauthorised access is strictly prohibited · SableAssent Global © 2026
          </div>
        </div>
      </div>
    </>
  );
}
