import { PrivyProvider } from '@privy-io/react-auth';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

const POLYGON = {
  id: 137,
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

export default function PrivyProviderWrapper({ children }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
        defaultChain: POLYGON,
        supportedChains: [POLYGON],
        loginMethods: ['email', 'google', 'twitter', 'discord', 'wallet'],
        appearance: {
          theme: 'light',
          accentColor: '#d4a017',
          logo: 'https://sableassent.com/logo.png',
          showWalletLoginFirst: false,
        },
        legal: {
          termsAndConditionsUrl: 'https://sableassent.com/terms',
          privacyPolicyUrl: 'https://sableassent.com/privacy',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
