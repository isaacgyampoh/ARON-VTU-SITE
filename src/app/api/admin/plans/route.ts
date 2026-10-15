import { createResourceRoutes } from '@/lib/admin-resource'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const routes = createResourceRoutes({
  table: 'data_plans',
  columns: [
    'network_id', 'name', 'data_amount', 'validity',
    'selling_price', 'cost_price', 'vendor_plan_id',
    'is_active', 'sort_order', 'category',
  ],
  select: '*, networks(name, code, type)',
  order: [{ column: 'network_id' }, { column: 'sort_order' }, { column: 'selling_price' }],
  limit: 1000,
})

export const GET = routes.GET
export const POST = routes.POST
export const PATCH = routes.PATCH
export const DELETE = routes.DELETE
