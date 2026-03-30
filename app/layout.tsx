import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Todo List',
  description: 'A simple todo list app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
