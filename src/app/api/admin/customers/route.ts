import { createResourceRoutes } from '@/lib/admin-resource'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const routes = createResourceRoutes({
  table: 'customers',
  columns: [],   // read-only: customers are written by the payment webhook
  order: [{ column: 'total_spent', ascending: false }],
})

export const GET = routes.GET
