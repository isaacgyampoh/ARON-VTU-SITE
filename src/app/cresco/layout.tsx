import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cresco Susu — Save today, secure tomorrow',
  description: 'A rotational savings plan coming soon from ChaleData. Cresco Susu — where every seed grows.',
  openGraph: {
    title: 'Cresco Susu — Coming soon',
    description: 'Save today, secure tomorrow. Where every seed grows.',
    type: 'website',
  },
}

export default function CrescoLayout({ children }: { children: React.ReactNode }) {
  return children
}
