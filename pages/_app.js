import '../styles/globals.css';
import dynamic from 'next/dynamic';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Dynamically import PrivyProvider — skips SSR to avoid build-time errors
const PrivyProviderWrapper = dynamic(
  () => import('../components/PrivyProviderWrapper'),
  { ssr: false }
);

export default function App({ Component, pageProps }) {
  return (
    <PrivyProviderWrapper>
      <Component {...pageProps} />
      <Analytics />
      <SpeedInsights />
    </PrivyProviderWrapper>
  );
}
