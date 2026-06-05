import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'ChaleData — Buy Data & Streaming Instantly',
  description: 'Buy cheap data bundles for MTN, Telecel & AirtelTigo. Netflix, Amazon Prime streaming plans. Fast checkout, instant delivery across Ghana.',
  keywords: 'MTN data Ghana, Telecel data, AirtelTigo data, Netflix Ghana, buy data online Ghana, MoMo payment',
  metadataBase: new URL('https://chaledata.com'),
  openGraph: {
    title: 'ChaleData — Buy Data Instantly',
    description: 'Fast data & streaming plans for Ghana. Pay with MoMo.',
    type: 'website',
    url: 'https://chaledata.com',
    siteName: 'ChaleData',
  },
  twitter: {
    card: 'summary',
    title: 'ChaleData — Buy Data Instantly',
    description: 'Fast data & streaming plans for Ghana. Pay with MoMo.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
