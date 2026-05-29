import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ARON VTU — Buy Data Instantly',
  description: 'Buy affordable data bundles for MTN, Telecel, and AirtelTigo instantly. Fast checkout, instant delivery.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-50 min-h-screen">{children}</body>
    </html>
  )
}
