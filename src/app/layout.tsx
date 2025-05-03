'use client';

import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { UPContextProvider } from '../context/UPContext';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>LuksoPoll</title>
        <meta name="description" content="LUKSO blockchain üzerinde anket oluşturun ve oy verin" />
      </head>
      <body className={inter.className}>
        <UPContextProvider>
          {children}
        </UPContextProvider>
      </body>
    </html>
  );
} 