import { createResourceRoutes } from '@/lib/admin-resource'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const routes = createResourceRoutes({
  table: 'networks',
  columns: ['name', 'code', 'logo_url', 'is_active', 'type'],
  order: [{ column: 'type' }, { column: 'name' }],
})

export const GET = routes.GET
export const POST = routes.POST
export const PATCH = routes.PATCH
export const DELETE = routes.DELETE
