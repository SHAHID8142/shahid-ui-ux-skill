import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ledger CMS — synthetic admin fixture',
  description:
    'Fixture app C for SUS evaluation (Operate mode). All data synthetic; no real customers, no backend.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
