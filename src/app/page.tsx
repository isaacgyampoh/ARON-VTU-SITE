import Shop from './_components/shop'
import { getActiveNetworks, getActivePlans } from '@/lib/shop'

// Bundles and prices are now fetched on the server and rendered into the HTML,
// so the shop is visible on first paint and to search engines. It used to load
// from the browser after mount, leaving an empty page until the data arrived.
// Must be a literal — Next reads segment config statically, so an imported
// constant is silently ignored.
export const revalidate = 60

export default async function Home() {
  const [networks, plans] = await Promise.all([getActiveNetworks(), getActivePlans()])
  return <Shop networks={networks} plans={plans} />
}
