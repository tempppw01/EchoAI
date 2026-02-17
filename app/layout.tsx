import './globals.css';
import type { Metadata } from 'next';
import { AppProviders } from '@/components/providers/app-providers';

export const metadata: Metadata = {
  title: 'EchoAI 工作区',
  description: 'EchoAI 多模块工作区',
  icons: {
    icon: '/icon.svg',
  },
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
