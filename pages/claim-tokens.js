import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const BASE44_URL = 'https://app.base44.com/api/apps/6a0cfc5b7b1d08af4a82b9fd';
const THEME = { navy: '#1e3a5f', gold: '#d4a017', success: '#10b981', warning: '#f59e0b', error: '#ef4444', navyLight: '#e8f0f9', bg: '#f8fafc' };
const STATUS_CONFIG = {
  PENDING_WALLET:    { label: 'Awaiting Wallet',     color: '#f59e0b', icon: '⏳' },
  READY_TO_DISPATCH: { label: 'Queued for Dispatch',  color: '#10b981', icon: '✅' },
  DISPATCHED:        { label: 'Dispatched',            color: '#1e3a5f', icon: '🚀' },
  CONFIRMED:         { label: 'Confirmed On-Chain',    color: '#10b981', icon: '⛓️' },
  FAILED:            { label: 'Failed',                color: '#ef4444', icon: '❌' },
};

async function b44Get(path) {
  const r = await fetch(`${BASE44_URL}${path}`, { headers: { 'Content-Type': 'application/json' } });
  return r.json();
}
async function b44Post(path, body) {
  const r = await fetch(`${BASE44_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
async function b44Put(path, body) {
  const r = await fetch(`${BASE44_URL}${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#94a3b8', icon: '•' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: cfg.color + '18', color: cfg.color, border: `1px solid ${cfg.color}40` }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function WalletBadge({ address }) {
  const [copied, setCopied] = useState(false);
  if (!address) return null;
  const short = `${address.slice(0, 10)}...${address.slice(-6)}`;
  return (
    <button onClick={() => { navigator.clipboard?.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#10b98115', color: '#10b981', border: '1px solid #10b98140', cursor: 'pointer', fontFamily: 'monospace', outline: 'none' }}>
      🟢 {short} {copied ? '✓ Copied!' : '⎘'}
    </button>
  );
}

function Spinner({ color = '#1e3a5f', size = 20 }) {
  return (
    <>
      <div style={{ width: size, height: size, border: `3px solid ${color}20`, borderTop: `3px solid ${color}`, borderRadius: '50%', animation: 'sa-spin 1s linear infinite', flexShrink: 0 }} />
      <style>{`@keyframes sa-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export default function ClaimTokensPage() {
  const { ready, authenticated, login, user } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const [walletAddress, setWalletAddress] = useState('');
  const [walletSynced, setWalletSynced] = useState(false);
  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [claimsUpdated, setClaimsUpdated] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('idle');

  const userEmail = user?.email?.address || '';
  const userId = user?.id || '';
  const userName = user?.google?.name || user?.email?.address || 'SableAssent Member';

  useEffect(() => {
    if (!ready || !walletsReady || !authenticated || walletSynced) return;
    const embedded = wallets?.find(w => w.walletClientType === 'privy' || w.connectorType === 'embedded') || wallets?.[0];
    if (!embedded?.address) { setStep('creating_wallet'); return; }
    setWalletAddress(embedded.address);
    setStep('wallet_ready');
  }, [ready, walletsReady, authenticated, wallets, walletSynced]);

  const syncWallet = useCallback(async (address) => {
    if (!address || walletSynced || !userId) return;
    setSyncing(true); setStep('syncing'); setError('');
    try {
      const now = new Date().toISOString();
      const existing = await b44Get(`/entities/CustomerWallet?userId=${encodeURIComponent(userId)}`);
      if (existing?.entities?.length > 0) {
        await b44Put(`/entities/CustomerWallet/${existing.entities[0].id}`, { publicAddress: address, polygonEnabled: true, walletStatus: 'active', lastBalanceSync: now });
      } else {
        await b44Post('/entities/CustomerWallet', { userId, userEmail, userName, publicAddress: address, polygonEnabled: true, ethereumEnabled: true, walletStatus: 'active', governanceTier: 'community', complianceScore: 0, ofacStatus: 'pending', walletCreatedAt: now, lastBalanceSync: now, votingWeight: 1.0, createdBy: userId });
      }
      if (userEmail) {
        const pendingClaims = await b44Get(`/entities/TokenClaim?userEmail=${encodeURIComponent(userEmail)}&status=PENDING_WALLET`);
        for (const claim of (pendingClaims?.entities ?? [])) {
          await b44Put(`/entities/TokenClaim/${claim.id}`, { walletAddress: address, status: 'READY_TO_DISPATCH' });
          try {
            await b44Post('/entities/TokenDispatchQueue', { userId, userEmail, userName, walletAddress: address, amountSac1: claim.tokenAmount, network: 'Polygon PoS', status: 'pending', purchaseId: claim.purchaseId, governanceTier: 'community', complianceScore: 0, complianceBlocked: false, notes: `Auto-queued via Privy wallet claim. Purchase: ${claim.purchaseId}` });
          } catch (_) {}
        }
        if ((pendingClaims?.entities ?? []).length > 0) setClaimsUpdated(true);
      }
      setWalletSynced(true); setStep('done');
    } catch (err) {
      setError('Could not save your wallet. Please refresh and try again.');
      setStep('wallet_ready');
    } finally { setSyncing(false); }
  }, [userId, userEmail, userName, walletSynced]);

  useEffect(() => {
    if (walletAddress && !walletSynced && step === 'wallet_ready') syncWallet(walletAddress);
  }, [walletAddress, walletSynced, step, syncWallet]);

  useEffect(() => {
    if (!userEmail) return;
    setLoadingClaims(true);
    b44Get(`/entities/TokenClaim?userEmail=${encodeURIComponent(userEmail)}`)
      .then(d => { const sorted = (d?.entities ?? []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)); setClaims(sorted); })
      .finally(() => setLoadingClaims(false));
  }, [userEmail, claimsUpdated]);

  const totalQueued = claims.filter(c => c.status === 'READY_TO_DISPATCH').reduce((s, c) => s + (c.tokenAmount || 0), 0);
  const totalReceived = claims.filter(c => ['DISPATCHED','CONFIRMED'].includes(c.status)).reduce((s, c) => s + (c.tokenAmount || 0), 0);

  return (
    <>
      <Head>
        <title>Claim SAC1 Tokens — SableAssent</title>
        <meta name="description" content="Claim your SAC1 tokens. A Polygon wallet is created for you automatically." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#f8fafc', minHeight: '100vh', padding: '40px 16px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 32 }}>⬡</span>
              <span style={{ color: '#1e3a5f', fontWeight: 800, fontSize: 24 }}>SableAssent</span>
            </div>
            <h1 style={{ color: '#1e3a5f', fontWeight: 800, fontSize: 28, margin: '0 0 8px' }}>Claim Your SAC1 Tokens</h1>
            <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>A secure Polygon wallet is created for you automatically — no crypto experience needed.</p>
          </div>

          {!ready && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={32} /></div>
          )}

          {ready && !authenticated && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
              <h2 style={{ color: '#1e3a5f', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Sign in to claim your tokens</h2>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>Use the same email you used at checkout. We'll create your wallet automatically.</p>
              <button onClick={login} style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #1e3a5f, #d4a017)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
                Sign In & Claim Tokens
              </button>
            </div>
          )}

          {ready && authenticated && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Signed in as</div>
                    <div style={{ fontWeight: 700, color: '#1e3a5f' }}>{userName}</div>
                    {userEmail && <div style={{ fontSize: 12, color: '#64748b' }}>{userEmail}</div>}
                  </div>
                  <div>
                    {syncing && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13 }}><Spinner size={16} /> Syncing wallet...</div>}
                    {!syncing && walletAddress && <WalletBadge address={walletAddress} />}
                    {!syncing && !walletAddress && step === 'creating_wallet' && <div style={{ fontSize: 13, color: '#f59e0b' }}>⏳ Creating your wallet...</div>}
                  </div>
                </div>
                {error && <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 13 }}>{error}</div>}
                {step === 'done' && !error && (
                  <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', fontSize: 13, fontWeight: 600 }}>
                    ✅ Wallet saved! Your tokens are queued for dispatch.
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{totalQueued.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>SAC1 Queued</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#1e3a5f' }}>{totalReceived.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>SAC1 Received</div>
                </div>
              </div>

              {loadingClaims && <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>}
              {!loadingClaims && claims.length === 0 && (
                <div style={{ background: '#fff', borderRadius: 12, padding: 24, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                  No token claims found for this account yet.
                </div>
              )}
              {!loadingClaims && claims.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                  <h3 style={{ color: '#1e3a5f', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Your Token Claims</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {claims.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{(c.tokenAmount || 0).toLocaleString()} SAC1</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{new Date(c.created_date).toLocaleDateString()}</div>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
