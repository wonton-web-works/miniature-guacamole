import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agent-C Dashboard',
  description: 'Real-time workstream monitoring for Agent-C',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
