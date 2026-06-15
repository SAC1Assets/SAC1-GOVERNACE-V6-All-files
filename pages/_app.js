// ─────────────────────────────────────────────────────────────────────────────
// SableAssent Pay — App Root
// Wraps all pages with PrivyProvider for embedded wallet support
// Privy App ID read from NEXT_PUBLIC_PRIVY_APP_ID environment variable
//
// SDK: @privy-io/react-auth ^1.91.0
// Privy config: embeddedWallets.ethereum.createOnLogin (v1.91+ shape)
// ─────────────────────────────────────────────────────────────────────────────

import '../styles/globals.css';
import { PrivyProvider } from '@privy-io/react-auth';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

// Polygon PoS chain definition (viem-compatible shape required by Privy v1.91+)
const POLYGON = {
  id:   137,
  name: 'Polygon',
  network: 'matic',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://polygon-rpc.com'] },
    public:  { http: ['https://polygon-rpc.com'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://polygonscan.com' },
  },
};

export default function App({ Component, pageProps }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // ── Embedded wallets — v1.91+ nested shape ───────────────────────────
        // Auto-creates a Polygon embedded wallet for every new user on login.
        // No seed phrase, no MetaMask, no key management required.
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },

        // ── Default chain: Polygon PoS (137) ─────────────────────────────────
        defaultChain:    POLYGON,
        supportedChains: [POLYGON],

        // ── Login methods ────────────────────────────────────────────────────
        loginMethods: ['email', 'google', 'twitter', 'discord', 'wallet'],

        // ── Appearance — SableAssent brand ───────────────────────────────────
        appearance: {
          theme:       'light',
          accentColor: '#d4a017',   // SableAssent gold
          logo:        'https://sableassent.com/logo.png',
          showWalletLoginFirst: false,
        },

        // ── Legal ────────────────────────────────────────────────────────────
        legal: {
          termsAndConditionsUrl: 'https://sableassent.com/terms',
          privacyPolicyUrl:      'https://sableassent.com/privacy',
        },
      }}
    >
      <Component {...pageProps} />
    </PrivyProvider>
  );
}
