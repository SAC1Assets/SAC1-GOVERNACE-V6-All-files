// ─────────────────────────────────────────────────────────────────────────────
// pay.sableassent.com/claim-tokens
// SAC1 Token Claim Page — Privy Embedded Wallet Flow
//
// Flow:
//   1. User arrives (linked from post-payment email or SableAssent.com)
//   2. Not logged in → Privy modal (email / Google / social)
//   3. Login → Privy silently auto-creates Polygon embedded wallet
//   4. Wallet address → PUT to Base44 CustomerWallet entity
//   5. All PENDING_WALLET TokenClaim records → flipped to READY_TO_DISPATCH
//   6. TokenDispatchQueue record created → appears in admin Token Dispatch panel
//
// No seed phrase. No MetaMask. No crypto knowledge needed.
// ─────────────────────────────────────────────────────────────────────────────

import Head          from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const BASE44_URL = 'https://app.base44.com/api/apps/6a0cfc5b7b1d08af4a82b9fd';

const THEME = {
  navy:      '#1e3a5f',
  gold:      '#d4a017',
  success:   '#10b981',
  warning:   '#f59e0b',
  error:     '#ef4444',
  navyLight: '#e8f0f9',
  bg:        '#f8fafc',
};

const STATUS_CONFIG = {
  PENDING_WALLET:    { label: 'Awaiting Wallet',    color: THEME.warning, icon: '⏳' },
  READY_TO_DISPATCH: { label: 'Queued for Dispatch', color: THEME.success, icon: '✅' },
  DISPATCHED:        { label: 'Dispatched',           color: THEME.navy,   icon: '🚀' },
  CONFIRMED:         { label: 'Confirmed On-Chain',   color: THEME.success, icon: '⛓️' },
  FAILED:            { label: 'Failed',               color: THEME.error,  icon: '❌' },
};

// ── Base44 API helpers ─────────────────────────────────────────────────────────
async function b44Get(path) {
  const r = await fetch(`${BASE44_URL}${path}`, { headers: { 'Content-Type': 'application/json' } });
  return r.json();
}
async function b44Post(path, body) {
  const r = await fetch(`${BASE44_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}
async function b44Put(path, body) {
  const r = await fetch(`${BASE44_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#94a3b8', icon: '•' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: cfg.color + '18', color: cfg.color, border: `1px solid ${cfg.color}40`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Copy-able wallet badge ─────────────────────────────────────────────────────
function WalletBadge({ address }) {
  const [copied, setCopied] = useState(false);
  if (!address) return null;
  const short = `${address.slice(0, 10)}...${address.slice(-6)}`;
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
        background: THEME.success + '15', color: THEME.success,
        border: `1px solid ${THEME.success}40`, cursor: 'pointer', fontFamily: 'monospace',
        outline: 'none',
      }}
    >
      🟢 {short} {copied ? '✓ Copied!' : '⎘'}
    </button>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────────
function Spinner({ color = THEME.navy, size = 20 }) {
  return (
    <>
      <div style={{
        width: size, height: size,
        border: `3px solid ${color}20`, borderTop: `3px solid ${color}`,
        borderRadius: '50%', animation: 'sa-spin 1s linear infinite', flexShrink: 0,
      }} />
      <style>{`@keyframes sa-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ClaimTokensPage() {
  const { ready, authenticated, login, user } = usePrivy();
  const { wallets, ready: walletsReady }       = useWallets();

  const [walletAddress, setWalletAddress] = useState('');
  const [walletSynced,  setWalletSynced]  = useState(false);
  const [claims,        setClaims]        = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [syncing,       setSyncing]       = useState(false);
  const [claimsUpdated, setClaimsUpdated] = useState(false);
  const [error,         setError]         = useState('');
  const [step,          setStep]          = useState('idle');

  const userEmail = user?.email?.address || '';
  const userId    = user?.id             || '';
  const userName  = user?.google?.name   || user?.email?.address || 'SableAssent Member';

  // ── Detect embedded wallet ─────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !walletsReady || !authenticated || walletSynced) return;
    const embedded = wallets?.find(
      w => w.walletClientType === 'privy' || w.connectorType === 'embedded'
    ) || wallets?.[0];
    if (!embedded?.address) { setStep('creating_wallet'); return; }
    setWalletAddress(embedded.address);
    setStep('wallet_ready');
  }, [ready, walletsReady, authenticated, wallets, walletSynced]);

  // ── Sync wallet → CustomerWallet → update TokenClaims ─────────────────────
  const syncWallet = useCallback(async (address) => {
    if (!address || walletSynced || !userId) return;
    setSyncing(true);
    setStep('syncing');
    setError('');

    try {
      const now = new Date().toISOString();

      // 1. Upsert CustomerWallet
      const existing = await b44Get(`/entities/CustomerWallet?userId=${encodeURIComponent(userId)}`);
      if (existing?.entities?.length > 0) {
        await b44Put(`/entities/CustomerWallet/${existing.entities[0].id}`, {
          publicAddress: address, polygonEnabled: true, ethereumEnabled: true,
          walletStatus: 'active', lastBalanceSync: now,
        });
      } else {
        await b44Post('/entities/CustomerWallet', {
          userId, userEmail, userName, publicAddress: address,
          polygonEnabled: true, ethereumEnabled: true, walletStatus: 'active',
          governanceTier: 'community', complianceScore: 0, ofacStatus: 'pending',
          walletCreatedAt: now, lastBalanceSync: now, votingWeight: 1.0, createdBy: userId,
        });
      }

      // 2. Flip PENDING_WALLET claims → READY_TO_DISPATCH
      if (userEmail) {
        const pendingClaims = await b44Get(`/entities/TokenClaim?userEmail=${encodeURIComponent(userEmail)}&status=PENDING_WALLET`);
        for (const claim of (pendingClaims?.entities ?? [])) {
          await b44Put(`/entities/TokenClaim/${claim.id}`, {
            walletAddress: address,
            status: 'READY_TO_DISPATCH',
          });
          // 3. Create TokenDispatchQueue entry
          try {
            await b44Post('/entities/TokenDispatchQueue', {
              userId, userEmail, userName, walletAddress: address,
              amountSac1: claim.tokenAmount, network: 'Polygon PoS',
              status: 'pending', purchaseId: claim.purchaseId,
              governanceTier: 'community', complianceScore: 0, complianceBlocked: false,
              notes: `Auto-queued via Privy wallet claim. Purchase: ${claim.purchaseId}`,
            });
          } catch (_) { /* best-effort */ }
        }
        if ((pendingClaims?.entities ?? []).length > 0) setClaimsUpdated(true);
      }

      setWalletSynced(true);
      setStep('done');
    } catch (err) {
      console.error('[ClaimTokens] sync error:', err);
      setError('Could not save your wallet. Please refresh and try again.');
      setStep('wallet_ready');
    } finally {
      setSyncing(false);
    }
  }, [userId, userEmail, userName, walletSynced]);

  // Auto-trigger sync when wallet is detected
  useEffect(() => {
    if (walletAddress && !walletSynced && step === 'wallet_ready') {
      syncWallet(walletAddress);
    }
  }, [walletAddress, walletSynced, step, syncWallet]);

  // ── Load claims ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userEmail) return;
    setLoadingClaims(true);
    b44Get(`/entities/TokenClaim?userEmail=${encodeURIComponent(userEmail)}`)
      .then(d => {
        const sorted = (d?.entities ?? []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        setClaims(sorted);
      })
      .finally(() => setLoadingClaims(false));
  }, [userEmail, claimsUpdated]);

  const totalPending  = claims.filter(c => c.status === 'PENDING_WALLET').reduce((s, c) => s + (c.tokenAmount || 0), 0);
  const totalQueued   = claims.filter(c => c.status === 'READY_TO_DISPATCH').reduce((s, c) => s + (c.tokenAmount || 0), 0);
  const totalReceived = claims.filter(c => ['DISPATCHED','CONFIRMED'].includes(c.status)).reduce((s, c) => s + (c.tokenAmount || 0), 0);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Claim SAC1 Tokens — SableAssent</title>
        <meta name="description" content="Claim your SAC1 tokens. A Polygon wallet is created for you automatically." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: THEME.bg, minHeight: '100vh', padding: '40px 16px',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🪙</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: THEME.navy, margin: '0 0 8px' }}>
              Claim Your SAC1 Tokens
            </h1>
            <p style={{ fontSize: 15, color: '#64748b', margin: 0 }}>
              Sign in below — your Polygon wallet is created automatically.
              No seed phrase, no extensions needed.
            </p>
          </div>

          {/* ── NOT LOGGED IN ── */}
          {ready && !authenticated && (
            <div style={{
              background: '#fff', borderRadius: 16, padding: 36, textAlign: 'center',
              boxShadow: '0 4px 24px rgba(30,58,95,0.10)',
              border: `1px solid ${THEME.navy}15`, marginBottom: 24,
            }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🔐</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: THEME.navy, marginBottom: 8 }}>
                Sign In to Claim Your Tokens
              </h2>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.7, maxWidth: 420, margin: '0 auto 28px' }}>
                Use your email, Google, or social login. A secure Polygon wallet is
                created for you silently — no MetaMask, no seed phrases, no crypto
                knowledge required.
              </p>
              <button
                onClick={login}
                style={{
                  padding: '15px 40px', borderRadius: 12, fontSize: 16, fontWeight: 800,
                  background: `linear-gradient(135deg, ${THEME.navy}, #2d5a8e)`,
                  color: '#fff', border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(30,58,95,0.30)',
                  transition: 'opacity .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Sign In &amp; Get My Wallet →
              </button>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
                Powered by Privy · Your keys, your wallet · Polygon PoS
              </p>
            </div>
          )}

          {/* ── SDK LOADING ── */}
          {!ready && (
            <div style={{
              background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center',
              boxShadow: '0 4px 24px rgba(30,58,95,0.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <Spinner size={36} />
              </div>
              <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Initializing...</p>
            </div>
          )}

          {/* ── LOGGED IN ── */}
          {ready && authenticated && (
            <>
              {/* Wallet card */}
              <div style={{
                background: '#fff', borderRadius: 16, padding: 24, marginBottom: 20,
                boxShadow: '0 4px 24px rgba(30,58,95,0.08)',
                border: `1px solid ${walletAddress ? THEME.success + '40' : THEME.gold + '40'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 6 }}>
                      YOUR POLYGON WALLET (SAC1 DESTINATION)
                    </div>
                    {syncing || (!walletsReady && authenticated) ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: THEME.gold }}>
                        <Spinner color={THEME.gold} size={16} />
                        <span style={{ fontSize: 14, fontWeight: 600 }}>
                          {step === 'creating_wallet' ? 'Creating your wallet...' : 'Saving wallet address...'}
                        </span>
                      </div>
                    ) : walletAddress ? (
                      <WalletBadge address={walletAddress} />
                    ) : (
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>Generating...</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Network</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: THEME.navy }}>Polygon PoS · Chain 137</div>
                  </div>
                </div>

                {/* Success state */}
                {step === 'done' && claimsUpdated && (
                  <div style={{
                    marginTop: 16, padding: '12px 16px', borderRadius: 10,
                    background: THEME.success + '12', border: `1px solid ${THEME.success}40`,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 20 }}>✅</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: THEME.success }}>
                      Wallet linked! Your SAC1 tokens are queued for dispatch to your Polygon wallet.
                      Our compliance team will complete the final review.
                    </span>
                  </div>
                )}
                {step === 'done' && !claimsUpdated && (
                  <div style={{
                    marginTop: 16, padding: '12px 16px', borderRadius: 10,
                    background: THEME.navyLight, border: `1px solid ${THEME.navy}20`,
                    fontSize: 13, color: THEME.navy, fontWeight: 600,
                  }}>
                    ✅ Wallet ready on Polygon PoS. Purchase SAC1 tokens and they'll be dispatched here automatically.
                  </div>
                )}
                {error && (
                  <div style={{
                    marginTop: 12, padding: '10px 14px', borderRadius: 10,
                    background: THEME.error + '10', border: `1px solid ${THEME.error}30`,
                    fontSize: 13, color: THEME.error,
                  }}>
                    ⚠️ {error}
                  </div>
                )}
              </div>

              {/* Stats row */}
              {claims.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Awaiting Wallet',   value: totalPending,   color: THEME.warning },
                    { label: 'Queued to Dispatch', value: totalQueued,    color: THEME.success },
                    { label: 'Already Received',   value: totalReceived,  color: THEME.navy },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: '#fff', borderRadius: 12, padding: '14px 12px', textAlign: 'center',
                      boxShadow: '0 2px 12px rgba(30,58,95,0.06)', border: `1px solid ${s.color}20`,
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value.toLocaleString()}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: s.color }}>SAC1</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Claims table */}
              <div style={{
                background: '#fff', borderRadius: 16,
                boxShadow: '0 4px 24px rgba(30,58,95,0.08)', overflow: 'hidden',
              }}>
                <div style={{
                  padding: '18px 24px', borderBottom: '1px solid #f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: THEME.navy }}>
                    Your SAC1 Token Claims
                  </h3>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {loadingClaims ? 'Loading...' : `${claims.length} record${claims.length !== 1 ? 's' : ''}`}
                  </span>
                </div>

                {loadingClaims ? (
                  <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                    <Spinner />
                  </div>
                ) : claims.length === 0 ? (
                  <div style={{ padding: 48, textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: THEME.navy, marginBottom: 6 }}>No claims yet</div>
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>
                      Once you purchase SAC1 tokens on{' '}
                      <a href="https://sableassent.com" target="_blank" rel="noopener noreferrer"
                        style={{ color: THEME.navy, fontWeight: 700 }}>sableassent.com</a>,
                      your claims will appear here.
                    </div>
                  </div>
                ) : (
                  claims.map((claim, idx) => (
                    <div key={claim.id} style={{
                      padding: '16px 24px',
                      borderBottom: idx < claims.length - 1 ? '1px solid #f1f5f9' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span style={{ fontSize: 22, fontWeight: 900, color: THEME.navy }}>
                            {(claim.tokenAmount || 0).toLocaleString()}
                          </span>
                          <span style={{
                            fontSize: 13, fontWeight: 700,
                            background: THEME.gold + '20', color: THEME.gold,
                            padding: '2px 8px', borderRadius: 6,
                          }}>SAC1</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                          {claim.purchaseId ? `Ref: ${claim.purchaseId.slice(0, 30)}` : 'No ref'}
                        </div>
                        {claim.txHash && (
                          <a href={`https://polygonscan.com/tx/${claim.txHash}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, color: THEME.success, fontFamily: 'monospace' }}>
                            View on Polygonscan ↗
                          </a>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <StatusBadge status={claim.status} />
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                          {new Date(claim.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        {claim.walletAddress && (
                          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>
                            → {claim.walletAddress.slice(0, 8)}...{claim.walletAddress.slice(-4)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* How it works */}
              <div style={{
                marginTop: 20, padding: '18px 20px', borderRadius: 14,
                background: THEME.navyLight, border: `1px solid ${THEME.navy}18`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: THEME.navy, marginBottom: 14 }}>
                  How SAC1 Token Dispatch Works
                </div>
                {[
                  { icon: '🔐', title: 'You signed in',  desc: 'A self-custodial Polygon wallet was created for you via Privy — you own the keys.' },
                  { icon: '✅', title: 'Wallet saved',   desc: 'Your wallet address is now linked to your purchase and queued for compliance review.' },
                  { icon: '🛡️', title: 'Compliance check', desc: 'Our team verifies KYC and runs OFAC/sanctions screening before dispatch.' },
                  { icon: '🚀', title: 'SAC1 dispatched', desc: 'Tokens are sent to your Polygon wallet directly from our Gnosis Safe treasury.' },
                ].map(s => (
                  <div key={s.title} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: THEME.navy }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Warning */}
              <div style={{
                marginTop: 16, padding: '12px 16px', borderRadius: 12,
                background: '#fef3c7', border: '1px solid #fcd34d', fontSize: 12, color: '#92400e', lineHeight: 1.6,
              }}>
                ⚠️ <strong>Polygon PoS only (Chain ID 137).</strong> SAC1 tokens are dispatched on Polygon.
                Do not attempt to receive on Ethereum mainnet or any other network.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
