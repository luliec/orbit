import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { Context } from 'hono'
import { AppError } from './lib/errors'

// Routes
import usersRoute from './routes/users'
import segmentsRoute from './routes/segments'
import requestsRoute from './routes/requests'
import copiesRoute from './routes/copies'
import notificationsRoute from './routes/notifications'

const app = new Hono()

// Middlewares globales
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: [
      process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'http://localhost:3000',
    ],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  })
)

// Health check — sin auth
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Rutas API v1
app.route('/api/v1/users', usersRoute)
app.route('/api/v1/segments', segmentsRoute)
app.route('/api/v1/requests', requestsRoute)
app.route('/api/v1/requests/:requestId/copies', copiesRoute)
app.route('/api/v1/notifications', notificationsRoute)

// Error handler global
app.onError((err: unknown, c: Context) => {
  console.error('[API Error]', err)

  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 500
    )
  }

  // Error inesperado
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servidor',
      },
    },
    500
  )
})

// 404
app.notFound((c) =>
  c.json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } }, 404)
)

const port = parseInt(process.env.PORT ?? '3001')

serve({ fetch: app.fetch, port }, () => {
  console.log(`🚀 Orbit API corriendo en http://localhost:${port}`)
})
