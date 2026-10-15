import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Checkout from '@/app/_components/checkout'
import { getActiveNetworks, getNetworkByCode, getPlansForNetwork } from '@/lib/shop'

export const revalidate = 60

/** Pre-render the network pages that exist, so they are fast and indexable. */
export async function generateStaticParams() {
  const networks = await getActiveNetworks()
  return networks.map(n => ({ code: n.code }))
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params
  const network = await getNetworkByCode(code)
  if (!network) return { title: 'Not found — ChaleData' }

  const plans = await getPlansForNetwork(network.id)
  const cheapest = plans.length ? Math.min(...plans.map(p => Number(p.selling_price))) : null
  const description = cheapest !== null
    ? `Buy ${network.name} bundles in Ghana from GH₵${cheapest.toFixed(2)}. Pay with mobile money, no account needed.`
    : `Buy ${network.name} on ChaleData. Pay with mobile money, no account needed.`

  return {
    title: `${network.name} — Buy Instantly | ChaleData`,
    description,
    alternates: { canonical: `/detail/${network.code}` },
    openGraph: { title: `${network.name} — ChaleData`, description },
  }
}

export default async function DetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const network = await getNetworkByCode(code)

  // An unknown or deactivated code used to spin forever on a loading dot.
  if (!network) notFound()

  const plans = await getPlansForNetwork(network.id)
  return <Checkout network={network} plans={plans} />
}
