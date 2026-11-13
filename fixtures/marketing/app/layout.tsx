import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nimbus Desk — synthetic marketing fixture',
  description:
    'Fixture app A for SUS evaluation. All content is synthetic and original; no real product, brand or person is represented.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
