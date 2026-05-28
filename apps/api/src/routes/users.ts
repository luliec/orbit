import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb, users } from '@orbit/db'
import { eq, and, isNull } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'
import { NotFoundError } from '../lib/errors'
import { supabaseAdmin } from '../lib/supabase'

const app = new Hono()

// GET /users — lista (solo admin/pm)
app.get('/', authMiddleware, requireRole('admin', 'pm'), async (c) => {
  const db = getDb()
  const result = await db
    .select()
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(users.createdAt)

  return c.json({ data: result })
})

// GET /users/me — perfil propio
app.get('/me', authMiddleware, async (c) => {
  const user = c.get('user')
  const db = getDb()

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  if (!dbUser) throw new NotFoundError('Usuario')

  return c.json({ data: dbUser })
})

// PUT /users/me — actualizar perfil propio
app.put(
  '/me',
  authMiddleware,
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(255).optional(),
      avatarUrl: z.string().url().optional().nullable(),
    })
  ),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    const db = getDb()

    const [updated] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning()

    return c.json({ data: updated })
  }
)

// POST /users/invite — invitar usuario (solo admin)
app.post(
  '/invite',
  authMiddleware,
  requireRole('admin'),
  zValidator(
    'json',
    z.object({
      email: z.string().email(),
      name: z.string().min(1).max(255),
      role: z.enum(['admin', 'pm', 'copy', 'arte']),
    })
  ),
  async (c) => {
    const body = c.req.valid('json')

    // Invitar via Supabase Auth
    const { data: authData, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      body.email,
      { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` }
    )

    if (error) {
      return c.json({ error: { code: 'CONFLICT', message: error.message } }, 409)
    }

    const db = getDb()
    const [newUser] = await db
      .insert(users)
      .values({
        authId: authData.user.id,
        email: body.email,
        name: body.name,
        role: body.role,
      })
      .returning()

    return c.json({ data: newUser }, 201)
  }
)

// PUT /users/:id/role — cambiar rol (solo admin)
app.put(
  '/:id/role',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', z.object({ role: z.enum(['admin', 'pm', 'copy', 'arte']) })),
  async (c) => {
    const { id } = c.req.param()
    const { role } = c.req.valid('json')
    const db = getDb()

    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning()

    if (!updated) throw new NotFoundError('Usuario')

    return c.json({ data: updated })
  }
)

// PUT /users/:id/deactivate — desactivar (solo admin)
app.put('/:id/deactivate', authMiddleware, requireRole('admin'), async (c) => {
  const { id } = c.req.param()
  const db = getDb()

  const [updated] = await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning()

  if (!updated) throw new NotFoundError('Usuario')

  return c.json({ data: updated })
})

export default app
