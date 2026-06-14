export default function ClaimTokensPage() {
  return (
    <div style={{
      fontFamily: 'sans-serif',
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: 40,
        textAlign: 'center',
        maxWidth: 480,
        width: '100%',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⬡</div>
        <h1 style={{ color: '#1e3a5f', fontWeight: 800, fontSize: 24, marginBottom: 8 }}>
          Claim SAC1 Tokens
        </h1>
        <p style={{ color: '#64748b', fontSize: 15 }}>
          Page is live. Wallet integration loading...
        </p>
      </div>
    </div>
  )
}
