import { createResourceRoutes } from '@/lib/admin-resource'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const routes = createResourceRoutes({
  table: 'vendor_apis',
  columns: [
    'name', 'base_url', 'api_key', 'purchase_endpoint',
    'headers', 'request_format', 'is_active', 'notes',
  ],
  order: [{ column: 'created_at' }],
})

export const GET = routes.GET
export const POST = routes.POST
export const PATCH = routes.PATCH
export const DELETE = routes.DELETE
