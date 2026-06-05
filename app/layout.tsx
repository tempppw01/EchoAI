import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AppProviders } from '@/components/providers/app-providers';

export const metadata: Metadata = {
  title: 'EchoAI',
  description: 'EchoAI',
  icons: {
    icon: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
