// ─────────────────────────────────────────────────────────────────────────────
// SAC1 Wallet Dashboard
// Full self-custodial wallet for SableAssent customers
//
// Features:
//   1. Receive SAC1 (Polygon PoS) — auto wallet creation via Privy
//   2. Live SAC1 balance via Polygon RPC
//   3. Send SAC1 to other users by Email / Username / Phone
//   4. Connect balance to virtual card (Transak)
//
// Uses Privy embedded wallet — private key never leaves the user's device
// No seed phrase. No MetaMask required. Works on mobile.
// ─────────────────────────────────────────────────────────────────────────────

'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { GlobalLanguageBanner } from './i18n/LanguageSelector';
import { useTranslation } from './i18n/useTranslation';
import { usePrivy, useWallets, useSendTransaction } from '@privy-io/react-auth';
import { UserComplianceProfile, Transaction } from '@/api/entities';
import PartnerLocatorMap from './PartnerLocatorMap';

// ── Constants ─────────────────────────────────────────────────────────────────
const SAC1_CONTRACT   = '0xedd66688556608518331131713063C1E200C7554';
const POLYGON_RPC     = 'https://polygon-rpc.com';
const POLYGONSCAN     = 'https://polygonscan.com';
const TRANSAK_URL     = 'https://global.transak.com/?apiKey=&defaultCryptoCurrency=SAC1&network=polygon&cryptoCurrencyCode=SAC1&walletAddress=';

// ERC-20 ABI fragments we need
const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { name: 'transfer',  type: 'function', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { name: 'decimals',  type: 'function', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
];

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  navy:     '#1e3a5f',
  navyDark: '#0f2540',
  gold:     '#d4a017',
  goldLight:'#f9e79f',
  green:    '#10b981',
  red:      '#ef4444',
  amber:    '#f59e0b',
  bg:       '#f0f4f8',
  card:     '#ffffff',
  border:   '#e2e8f0',
  text:     '#1e293b',
  muted:    '#64748b',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const short = addr => addr ? `${addr.slice(0,6)}…${addr.slice(-4)}` : '—';
const fmt   = n    => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

async function rpcCall(method, params) {
  const res = await fetch(POLYGON_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

// Encode ERC-20 balanceOf(address) call
function encodeBalanceOf(address) {
  const sig  = '0x70a08231'; // keccak256("balanceOf(address)")[:4]
  const addr = address.toLowerCase().replace('0x','').padStart(64, '0');
  return sig + addr;
}

// Encode ERC-20 transfer(address,uint256)
function encodeTransfer(toAddress, amountWei) {
  const sig    = '0xa9059cbb'; // keccak256("transfer(address,uint256)")[:4]
  const addr   = toAddress.toLowerCase().replace('0x','').padStart(64, '0');
  const amount = BigInt(amountWei).toString(16).padStart(64, '0');
  return sig + addr + amount;
}

async function getSAC1Balance(walletAddress) {
  try {
    const data   = encodeBalanceOf(walletAddress);
    const result = await rpcCall('eth_call', [{ to: SAC1_CONTRACT, data }, 'latest']);
    const raw    = BigInt(result);
    return Number(raw) / 1e18; // SAC1 has 18 decimals
  } catch { return 0; }
}

async function getMaticBalance(walletAddress) {
  try {
    const result = await rpcCall('eth_getBalance', [walletAddress, 'latest']);
    return Number(BigInt(result)) / 1e18;
  } catch { return 0; }
}

// Resolve a user identifier (email/username/phone) to a wallet address
async function resolveRecipient(identifier) {
  try {
    // Search UserComplianceProfile by email
    const byEmail = await UserComplianceProfile.filter({ user_email: identifier.toLowerCase() });
    if (byEmail.length > 0 && byEmail[0].privy_wallet_address) {
      return { address: byEmail[0].privy_wallet_address, name: byEmail[0].user_name, found: true };
    }
    // Search by name
    const byName = await UserComplianceProfile.filter({ user_name: identifier });
    if (byName.length > 0 && byName[0].privy_wallet_address) {
      return { address: byName[0].privy_wallet_address, name: byName[0].user_name, found: true };
    }
    // If it looks like a wallet address already
    if (/^0x[0-9a-fA-F]{40}$/.test(identifier)) {
      return { address: identifier, name: short(identifier), found: true };
    }
    return { found: false };
  } catch {
    return { found: false };
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: T.card, borderRadius: 20, padding: 24,
      boxShadow: '0 4px 24px rgba(0,0,0,0.07)', marginBottom: 16,
      border: `1px solid ${T.border}`, ...style,
    }}>
      {children}
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex', background: '#f1f5f9', borderRadius: 14,
      padding: 4, marginBottom: 20, gap: 4,
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none',
          background: active === t.id ? T.navy : 'transparent',
          color: active === t.id ? '#fff' : T.muted,
          fontWeight: 700, fontSize: 13, cursor: 'pointer',
          transition: 'all 0.2s',
        }}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

function Spinner({ size = 20, color = T.navy }) {
  return (
    <div style={{
      width: size, height: size, border: `3px solid ${color}20`,
      borderTop: `3px solid ${color}`, borderRadius: '50%',
      animation: 'spin 0.8s linear infinite', margin: '0 auto',
    }} />
  );
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        padding: '5px 14px', borderRadius: 8, border: `1px solid ${T.gold}`,
        background: 'transparent', color: T.gold, fontSize: 12,
        fontWeight: 700, cursor: 'pointer',
      }}>
      {copied ? '✓ Copied!' : label}
    </button>
  );
}

// ── RECEIVE TAB ───────────────────────────────────────────────────────────────
function ReceivePanel({ walletAddress }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
        Send SAC1 tokens to this address on <strong>Polygon PoS (Chain ID 137)</strong>
      </div>

      {/* QR Code using a public API */}
      <div style={{
        background: '#fff', border: `2px solid ${T.border}`,
        borderRadius: 16, padding: 16, display: 'inline-block', marginBottom: 16,
      }}>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${walletAddress}`}
          alt="Wallet QR Code"
          style={{ display: 'block', borderRadius: 8 }}
        />
      </div>

      <div style={{
        background: '#f8fafc', borderRadius: 12, padding: '12px 16px',
        fontFamily: 'monospace', fontSize: 13, color: T.navy,
        wordBreak: 'break-all', marginBottom: 12, border: `1px solid ${T.border}`,
      }}>
        {walletAddress}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <CopyButton text={walletAddress} label={`⎘ ${t('wallet.copy_address')}`} />
        <a href={`${POLYGONSCAN}/address/${walletAddress}`} target="_blank" rel="noreferrer"
          style={{
            padding: '5px 14px', borderRadius: 8, border: `1px solid ${T.border}`,
            color: T.muted, fontSize: 12, fontWeight: 700,
            textDecoration: 'none', display: 'inline-block',
          }}>
          🔍 View on PolygonScan
        </a>
      </div>

      <div style={{
        marginTop: 20, padding: 14, background: '#fffbeb',
        borderRadius: 12, border: `1px solid #fde68a`,
        fontSize: 12, color: '#92400e', textAlign: 'left',
      }}>
        ⚠️ <strong>Important:</strong> Only send SAC1 tokens on the Polygon PoS network to this address.
        Sending on Ethereum mainnet will result in permanent loss of funds.
      </div>
    </div>
  );
}

// ── SEND TAB ──────────────────────────────────────────────────────────────────
function SendPanel({ walletAddress, balance, wallets }) {
  const [recipient,   setRecipient]   = useState('');
  const [amount,      setAmount]      = useState('');
  const [note,        setNote]        = useState('');
  const [resolvedTo,  setResolvedTo]  = useState(null);
  const [resolving,   setResolving]   = useState(false);
  const [sending,     setSending]     = useState(false);
  const [txHash,      setTxHash]      = useState('');
  const [error,       setError]       = useState('');
  const [step,        setStep]        = useState('form'); // form | confirm | sending | done | error
  const debounceRef = useRef(null);

  // Auto-resolve recipient as user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!recipient || recipient.length < 3) { setResolvedTo(null); return; }
    debounceRef.current = setTimeout(async () => {
      setResolving(true);
      const result = await resolveRecipient(recipient);
      setResolvedTo(result.found ? result : null);
      setResolving(false);
    }, 600);
  }, [recipient]);

  const handleSend = async () => {
    setError('');
    if (!resolvedTo?.address) { setError('Recipient not found. Try their email, username, or wallet address.'); return; }
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount.'); return; }
    if (parseFloat(amount) > balance) { setError('Insufficient SAC1 balance.'); return; }

    setStep('sending');
    setSending(true);

    try {
      // Get the Privy embedded wallet
      const embeddedWallet = wallets?.find(w => w.walletClientType === 'privy' || w.connectorType === 'embedded') || wallets?.[0];
      if (!embeddedWallet) throw new Error('Wallet not available');

      // Switch to Polygon
      await embeddedWallet.switchChain(137);

      // Get provider and signer
      const provider = await embeddedWallet.getEthereumProvider();

      // Encode transfer call
      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18)).toString(16).padStart(64, '0');
      const data = encodeTransfer(resolvedTo.address, BigInt(Math.floor(parseFloat(amount) * 1e18)));

      // Send transaction
      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to:   SAC1_CONTRACT,
          data,
        }],
      });

      setTxHash(hash);

      // Log transfer in compliance DB
      try {
        await Transaction.create({
          user_id:             walletAddress,
          user_name:           recipient,
          user_email:          '',
          privy_wallet_address: walletAddress,
          dispatch_status:     'Dispatched',
          originator_account:  walletAddress,
          beneficiary_account: resolvedTo.address,
          beneficiary_name:    resolvedTo.name || recipient,
          amount_sac1:         parseFloat(amount),
          status:              'Completed',
          compliance_status:   'Clear',
          notes:               `P2P transfer. Note: ${note || '—'}. TxHash: ${hash}`,
          transaction_date:    new Date().toISOString(),
          settlement_rail:     'Polygon PoS',
          risk_level:          'Low',
        });
      } catch { /* non-fatal */ }

      setStep('done');
    } catch (err) {
      console.error('[Send]', err);
      setError(err.message || 'Transaction failed. Please try again.');
      setStep('error');
    } finally {
      setSending(false);
    }
  };

  if (step === 'done') {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.green, marginBottom: 8 }}>Sent!</div>
        <div style={{ fontSize: 14, color: T.muted, marginBottom: 20 }}>
          <strong>{fmt(amount)} SAC1</strong> sent to <strong>{resolvedTo?.name || recipient}</strong>
        </div>
        <a href={`${POLYGONSCAN}/tx/${txHash}`} target="_blank" rel="noreferrer"
          style={{
            display: 'inline-block', padding: '10px 20px', borderRadius: 10,
            background: T.navy, color: '#fff', fontWeight: 700, fontSize: 13,
            textDecoration: 'none', marginBottom: 12,
          }}>
          🔍 View Transaction
        </a>
        <br />
        <button onClick={() => { setStep('form'); setAmount(''); setRecipient(''); setNote(''); setResolvedTo(null); setTxHash(''); }}
          style={{ background: 'none', border: 'none', color: T.muted, fontSize: 13, cursor: 'pointer', textDecoration: 'underline', marginTop: 8 }}>
          Send another →
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Recipient */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Send To
        </label>
        <div style={{ position: 'relative' }}>
          <input
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="Email, username, phone or 0x address"
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 12,
              border: `2px solid ${resolvedTo ? T.green : T.border}`,
              fontSize: 15, outline: 'none', boxSizing: 'border-box',
            }}
          />
          {resolving && (
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
              <Spinner size={16} />
            </div>
          )}
        </div>
        {resolvedTo && (
          <div style={{
            marginTop: 6, padding: '8px 12px', background: '#f0fdf4',
            borderRadius: 8, fontSize: 12, color: T.green, fontWeight: 600,
          }}>
            ✅ Found: <strong>{resolvedTo.name}</strong> · {short(resolvedTo.address)}
          </div>
        )}
        {recipient.length > 2 && !resolvedTo && !resolving && (
          <div style={{ marginTop: 6, fontSize: 12, color: T.red }}>
            ⚠️ No SableAssent member found with that identifier
          </div>
        )}
      </div>

      {/* Amount */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Amount
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            style={{
              width: '100%', padding: '13px 60px 13px 16px', borderRadius: 12,
              border: `2px solid ${T.border}`, fontSize: 18,
              fontWeight: 700, outline: 'none', boxSizing: 'border-box',
            }}
          />
          <span style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 13, fontWeight: 700, color: T.muted,
          }}>
            SAC1
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: T.muted }}>
          <span>Available: <strong>{fmt(balance)} SAC1</strong></span>
          <button onClick={() => setAmount(String(balance))}
            style={{ background: 'none', border: 'none', color: T.gold, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            MAX
          </button>
        </div>
      </div>

      {/* Note */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Note (optional)
        </label>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder=t('wallet.note_placeholder')
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 12,
            border: `2px solid ${T.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {error && (
        <div style={{
          padding: 12, borderRadius: 10, background: '#fef2f2',
          border: `1px solid #fecaca`, color: T.red, fontSize: 13, marginBottom: 16,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Confirm summary */}
      {resolvedTo && amount && parseFloat(amount) > 0 && (
        <div style={{
          padding: 14, background: '#f8fafc', borderRadius: 12,
          border: `1px solid ${T.border}`, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: T.muted }}>Sending</span>
            <strong>{fmt(amount)} SAC1</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: T.muted }}>To</span>
            <strong>{resolvedTo.name}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.muted }}>Network</span>
            <strong>Polygon PoS</strong>
          </div>
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={sending || !resolvedTo || !amount || parseFloat(amount) <= 0}
        style={{
          width: '100%', padding: 14, borderRadius: 14,
          background: sending ? T.muted : `linear-gradient(135deg, ${T.navy}, #2d5a8e)`,
          color: '#fff', fontWeight: 800, fontSize: 16,
          border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {sending ? <><Spinner size={18} color="#fff" /> Sending…</> : `🚀 ${t('wallet.send_btn')}`}
      </button>
    </div>
  );
}

// ── VIRTUAL CARD TAB ──────────────────────────────────────────────────────────
function VirtualCardPanel({ walletAddress, balance }) {
  const [cardStep, setCardStep] = useState('info'); // info | connecting | connected

  return (
    <div>
      {cardStep === 'info' && (
        <>
          {/* Card preview */}
          <div style={{
            background: `linear-gradient(135deg, ${T.navyDark} 0%, ${T.navy} 50%, #2d5a8e 100%)`,
            borderRadius: 20, padding: 28, marginBottom: 20, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: T.gold + '20', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: -20, right: 20, width: 80, height: 80, background: T.gold + '15', borderRadius: '50%' }} />
            <div style={{ color: T.gold, fontWeight: 800, fontSize: 16, marginBottom: 20, letterSpacing: '0.1em' }}>SABLEASSENT SAC1</div>
            <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: 16, letterSpacing: '0.15em', marginBottom: 20 }}>
              •••• •••• •••• ????
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginBottom: 2 }}>BALANCE</div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>{fmt(balance)} <span style={{ fontSize: 14, opacity: 0.8 }}>SAC1</span></div>
              </div>
              <div style={{ color: T.gold, fontWeight: 800, fontSize: 18 }}>VISA</div>
            </div>
          </div>

          {/* Benefits */}
          <div style={{ marginBottom: 20 }}>
            {[
              { icon: '💳', title: 'Spend SAC1 anywhere', desc: 'Use your SAC1 balance at any Visa-accepting merchant worldwide' },
              { icon: '🌍', title: '170+ countries', desc: 'Automatically converts SAC1 to local currency at checkout' },
              { icon: '⚡', title: 'Instant top-up', desc: 'Your SAC1 wallet balance reflects on the card in real-time' },
              { icon: '🔒', title: 'KYC protected', desc: 'Your existing SableAssent KYC covers your card — no extra verification' },
            ].map(b => (
              <div key={b.title} style={{
                display: 'flex', gap: 14, padding: '12px 0',
                borderBottom: `1px solid ${T.border}`,
              }}>
                <div style={{ fontSize: 24, width: 32, textAlign: 'center' }}>{b.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 2 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Transak CTA */}
          <a
            href={`${TRANSAK_URL}${walletAddress}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setCardStep('connecting')}
            style={{
              display: 'block', width: '100%', padding: 14, borderRadius: 14,
              background: `linear-gradient(135deg, ${T.gold}, #b8860b)`,
              color: T.navyDark, fontWeight: 800, fontSize: 16,
              textAlign: 'center', textDecoration: 'none', marginBottom: 10,
            }}
          >
            💳 Activate Virtual Card via Transak
          </a>
          <div style={{ fontSize: 11, color: T.muted, textAlign: 'center', lineHeight: 1.6 }}>
            Powered by Transak. Subject to Transak's KYC and card issuance policies.
            Available in supported regions.
          </div>
        </>
      )}

      {cardStep === 'connecting' && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: T.navy, marginBottom: 8 }}>
            Connecting to Transak…
          </div>
          <div style={{ fontSize: 14, color: T.muted, marginBottom: 24 }}>
            Complete your card setup in the Transak window that just opened.
            Come back here once you're done.
          </div>
          <button onClick={() => setCardStep('connected')}
            style={{
              padding: '12px 24px', borderRadius: 12, background: T.green,
              color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
            }}>
            ✅ I've completed setup
          </button>
        </div>
      )}

      {cardStep === 'connected' && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.green, marginBottom: 8 }}>Card Activated!</div>
          <div style={{ fontSize: 14, color: T.muted, marginBottom: 20, lineHeight: 1.7 }}>
            Your SAC1 wallet is now connected to your virtual card.
            You can spend your balance at any Visa merchant.
          </div>
          <button onClick={() => setCardStep('info')}
            style={{ background: 'none', border: 'none', color: T.muted, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
            ← Back to card overview
          </button>
        </div>
      )}
    </div>
  );
}

// ── ACTIVITY TAB ──────────────────────────────────────────────────────────────
function ActivityPanel({ walletAddress }) {
  const [txns, setTxns]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) return;
    Transaction.filter({ privy_wallet_address: walletAddress })
      .then(records => {
        setTxns(records.sort((a,b) => new Date(b.transaction_date) - new Date(a.transaction_date)).slice(0, 20));
      })
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  }, [walletAddress]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>;

  if (txns.length === 0) return (
    <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
      <div style={{ fontWeight: 700 }}>{t('wallet.no_activity')}</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>Your SAC1 activity will appear here</div>
    </div>
  );

  return (
    <div>
      {txns.map(tx => {
        const isOut = tx.originator_account === walletAddress;
        const amt   = tx.amount_sac1 || 0;
        return (
          <div key={tx.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 0', borderBottom: `1px solid ${T.border}`,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: isOut ? '#fef2f2' : '#f0fdf4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>
              {isOut ? '↑' : '↓'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>
                {isOut ? `Sent to ${tx.beneficiary_name || 'Unknown'}` : `Received from ${tx.originator_name || 'SableAssent'}`}
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                {new Date(tx.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {tx.notes && ` · ${tx.notes.slice(0,40)}…`}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, color: isOut ? T.red : T.green, fontSize: 15 }}>
                {isOut ? '−' : '+'}{fmt(amt)} SAC1
              </div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                {tx.status}
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <a href={`${POLYGONSCAN}/address/${walletAddress}#tokentxns`} target="_blank" rel="noreferrer"
          style={{ fontSize: 13, color: T.navy, fontWeight: 700 }}>
          View full history on PolygonScan →
        </a>
      </div>
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function SAC1WalletDashboard({ currentUser }) {
  const { t, dir } = useTranslation();
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets, ready: walletsReady }               = useWallets();

  const [walletAddress,  setWalletAddress]  = useState('');
  const [sac1Balance,    setSac1Balance]    = useState(null);
  const [maticBalance,   setMaticBalance]   = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [walletSynced,   setWalletSynced]   = useState(false);
  const [activeTab,      setActiveTab]      = useState('receive');
  const [profileSaved,   setProfileSaved]   = useState(false);

  const userEmail = user?.email?.address || currentUser?.email || '';
  const userName  = currentUser?.full_name || user?.google?.name || user?.email?.address?.split('@')[0] || 'Member';

  // ── Detect Privy embedded wallet ───────────────────────────────────────────
  useEffect(() => {
    if (!ready || !walletsReady || !authenticated) return;
    const embedded = wallets?.find(w => w.walletClientType === 'privy' || w.connectorType === 'embedded') || wallets?.[0];
    if (embedded?.address) {
      setWalletAddress(embedded.address);
    }
  }, [ready, walletsReady, authenticated, wallets]);

  // ── Fetch balances ─────────────────────────────────────────────────────────
  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingBalance(true);
    try {
      const [sac1, matic] = await Promise.all([
        getSAC1Balance(walletAddress),
        getMaticBalance(walletAddress),
      ]);
      setSac1Balance(sac1);
      setMaticBalance(matic);
    } finally {
      setLoadingBalance(false);
    }
  }, [walletAddress]);

  useEffect(() => { refreshBalance(); }, [walletAddress, refreshBalance]);

  // ── Sync wallet address to compliance DB ──────────────────────────────────
  useEffect(() => {
    if (!walletAddress || !userEmail || walletSynced) return;
    const sync = async () => {
      try {
        const existing = await UserComplianceProfile.filter({ user_email: userEmail });
        const now = new Date().toISOString();
        if (existing.length > 0) {
          await UserComplianceProfile.update(existing[0].id, {
            privy_wallet_address: walletAddress,
            privy_wallet_chain:   'Polygon PoS',
            privy_wallet_linked_at: now,
          });
        } else {
          await UserComplianceProfile.create({
            user_name:            userName,
            user_email:           userEmail,
            privy_wallet_address: walletAddress,
            privy_wallet_chain:   'Polygon PoS',
            privy_wallet_linked_at: now,
            kyc_status:           'Pending',
            account_status:       'Active',
          });
        }
        // ── BACKFILL: Update any 'Awaiting Wallet' transactions for this user ──
        try {
          const awaitingTxns = await Transaction.filter({ user_email: userEmail, dispatch_status: 'Awaiting Wallet' });
          for (const txn of awaitingTxns) {
            await Transaction.update(txn.id, {
              privy_wallet_address: walletAddress,
              beneficiary_account:  walletAddress,
              dispatch_status:      'Queued',
              notes: (txn.notes || '') + ` | Wallet linked ${now} — auto-promoted to Queued`,
            });
          }
          if (awaitingTxns.length > 0) {
            console.log(`[WalletDashboard] ✅ Backfilled ${awaitingTxns.length} Awaiting Wallet txns → Queued`);
          }
        } catch (backfillErr) {
          console.warn('[WalletDashboard] Backfill error:', backfillErr);
        }

        setWalletSynced(true);
        setProfileSaved(true);
      } catch (err) {
        console.warn('[WalletDashboard] Profile sync failed:', err);
      }
    };
    sync();
  }, [walletAddress, userEmail, userName, walletSynced]);

  const tabs = [
    { id: 'receive',  icon: '⬇️', label: t('wallet.receive')  },
    { id: 'send',     icon: '↑',  label: t('wallet.send')     },
    { id: 'card',     icon: '💳', label: t('wallet.card')     },
    { id: 'activity', icon: '📋', label: t('wallet.activity') },
    { id: 'locate',   icon: '📍', label: t('wallet.findatm')  },
  ];

  // ── NOT LOGGED IN ──────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spinner size={40} />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.navy}, ${T.gold})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, margin: '0 auto 20px',
          }}>
            ⬡
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: T.navy, marginBottom: 8 }}>
            Your SAC1 Wallet
          </h2>
          <p style={{ fontSize: 14, color: T.muted, marginBottom: 28, lineHeight: 1.7 }}>
            Sign in to access your self-custodial Polygon wallet.
            No seed phrase needed — your wallet is created automatically.
          </p>
          <button onClick={login} style={{
            width: '100%', padding: 16, borderRadius: 14,
            background: `linear-gradient(135deg, ${T.navy}, #2d5a8e)`,
            color: '#fff', fontWeight: 800, fontSize: 17,
            border: 'none', cursor: 'pointer', marginBottom: 12,
          }}>
            {t('wallet.signin_prompt')}
          </button>
          <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
            🔒 Self-custodial · Polygon PoS · Powered by SableAssent
          </div>
        </div>
      </div>
    );
  }

  // ── LOGGED IN ──────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: T.bg, minHeight: '100vh', padding: '0', direction: dir }}>
      <GlobalLanguageBanner />
      <div style={{ padding: '20px 16px 0' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{
          background: `linear-gradient(135deg, ${T.navyDark} 0%, ${T.navy} 60%, #2d5a8e 100%)`,
          borderRadius: 24, padding: 28, marginBottom: 16, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, background: T.gold + '15', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, background: '#fff' + '05', borderRadius: '50%' }} />

          {/* User info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 2 }}>WELCOME BACK</div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{userName}</div>
            </div>
            <button onClick={logout} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none',
              color: 'rgba(255,255,255,0.7)', padding: '6px 12px',
              borderRadius: 8, fontSize: 12, cursor: 'pointer',
            }}>
              Sign Out
            </button>
          </div>

          {/* Balance */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4 }}>{t('wallet.balance').toUpperCase()}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 36 }}>
                {loadingBalance ? '…' : sac1Balance !== null ? fmt(sac1Balance) : '—'}
              </span>
              <span style={{ color: T.gold, fontWeight: 700, fontSize: 16, alignSelf: 'flex-end', marginBottom: 4 }}>SAC1</span>
              <button onClick={refreshBalance} style={{
                background: 'rgba(255,255,255,0.15)', border: 'none',
                color: '#fff', borderRadius: 8, padding: '4px 8px',
                cursor: 'pointer', fontSize: 14, marginLeft: 4, alignSelf: 'flex-end', marginBottom: 4,
              }}>
                ↻
              </button>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
              {maticBalance !== null ? `${maticBalance.toFixed(4)} MATIC for gas` : ''}
            </div>
          </div>

          {/* Wallet address */}
          <div style={{
            background: 'rgba(255,255,255,0.1)', borderRadius: 10,
            padding: '8px 12px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>POLYGON WALLET</div>
              <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: 13 }}>
                {walletAddress ? short(walletAddress) : 'Creating…'}
              </div>
            </div>
            {walletAddress && <CopyButton text={walletAddress} label="⎘" />}
          </div>

          {profileSaved && (
            <div style={{ marginTop: 10, fontSize: 11, color: T.gold }}>
              ✅ Wallet linked to your compliance profile
            </div>
          )}
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { icon: '⬇️', label: t('wallet.receive'),  tab: 'receive' },
            { icon: '↑',  label: t('wallet.send'),     tab: 'send'    },
            { icon: '💳', label: t('wallet.card'),     tab: 'card'    },
          ].map(a => (
            <button key={a.tab} onClick={() => setActiveTab(a.tab)} style={{
              padding: '14px 8px', borderRadius: 14,
              background: activeTab === a.tab ? T.navy : T.card,
              color: activeTab === a.tab ? '#fff' : T.text,
              border: `2px solid ${activeTab === a.tab ? T.navy : T.border}`,
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <Card>
          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

          {activeTab === 'receive'  && <ReceivePanel   walletAddress={walletAddress} />}
          {activeTab === 'send'     && <SendPanel       walletAddress={walletAddress} balance={sac1Balance || 0} wallets={wallets} />}
          {activeTab === 'card'     && <VirtualCardPanel walletAddress={walletAddress} balance={sac1Balance || 0} />}
          {activeTab === 'activity' && <ActivityPanel   walletAddress={walletAddress} />}
          {activeTab === 'locate'   && (
            <div style={{ marginTop: -8 }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                Find the nearest SableAssent Pay cash-out point to collect your funds in local currency.
              </div>
              <PartnerLocatorMap mode="user" compactList={true} />
            </div>
          )}
        </Card>

      </div>{/* end padding wrapper */}
        {/* ── Footer ── */}
        <div style={{ textAlign: 'center', fontSize: 11, color: T.muted, paddingBottom: 24, padding: '0 16px 24px' }}>
          🔒 Self-custodial · Polygon PoS (Chain ID 137) · SAC1 {SAC1_CONTRACT.slice(0,10)}…
        </div>

      </div>
    </div>
  );
}
