import './globals.css';
import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'ReachInbox Email Scheduler',
  description: 'Full-Stack Distributed Email Scheduler Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
