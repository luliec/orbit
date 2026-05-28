import type { Context, Next } from 'hono'
import { getDb, auditLog } from '@orbit/db'

// Mapeo de método + ruta a acción legible
const ACTION_MAP: Record<string, string> = {
  'POST /api/v1/requests': 'request.created',
  'PUT /api/v1/requests/:id': 'request.updated',
  'POST /api/v1/requests/:id/transition': 'request.status_changed',
  'POST /api/v1/requests/:id/copies': 'copy_version.created',
  'PUT /api/v1/copies/:id': 'copy_version.updated',
  'POST /api/v1/copies/generate': 'ai.copy_generated',
  'POST /api/v1/requests/:id/assets': 'asset.uploaded',
  'POST /api/v1/requests/:id/approve': 'approval.created',
  'POST /api/v1/requests/:id/request-changes': 'approval.changes_requested',
  'POST /api/v1/segments': 'segment.created',
  'PUT /api/v1/segments/:id': 'segment.updated',
}

export async function auditMiddleware(c: Context, next: Next) {
  await next()

  // Solo auditar mutaciones exitosas
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(c.req.method) && c.res.status < 400) {
    try {
      const user = c.get('user')
      if (!user) return

      const routePattern = `${c.req.method} ${c.req.routePath}`
      const action = ACTION_MAP[routePattern] ?? `${c.req.method.toLowerCase()}.${c.req.routePath}`

      const db = getDb()
      await db.insert(auditLog).values({
        userId: user.id,
        action,
        entityType: extractEntityType(c.req.routePath),
        metadata: { path: c.req.path, method: c.req.method },
      })
    } catch {
      // El audit log nunca debe romper la respuesta principal
    }
  }
}

function extractEntityType(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments[2] ?? 'unknown'
}
