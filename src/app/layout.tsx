import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChaleData — Buy Data Instantly',
  description: 'Buy cheap data bundles for MTN, Telecel & AirtelTigo. Fast checkout, instant delivery across Ghana.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <script src="https://js.paystack.co/v2/inline.js" defer></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
