import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb, segments } from '@orbit/db'
import { eq, isNull } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'
import { NotFoundError } from '../lib/errors'

const app = new Hono()

const segmentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  audience: z.string().optional().nullable(),
  tone: z.string().optional().nullable(),
  brandVoice: z
    .object({
      wordsYes: z.array(z.string()).default([]),
      wordsNo: z.array(z.string()).default([]),
      style: z.string().default(''),
      personality: z.string().default(''),
    })
    .optional()
    .nullable(),
  restrictions: z
    .array(
      z.object({
        text: z.string(),
        severity: z.enum(['critical', 'moderate', 'minor']),
        type: z.enum(['legal', 'commercial', 'brand', 'channel']),
      })
    )
    .optional()
    .nullable(),
  preferredChannels: z.array(z.string()).optional().nullable(),
  isActive: z.boolean().optional().default(true),
})

// GET /segments
app.get('/', authMiddleware, async (c) => {
  const db = getDb()
  const result = await db
    .select()
    .from(segments)
    .where(isNull(segments.deletedAt))
    .orderBy(segments.name)

  return c.json({ data: result })
})

// GET /segments/:id
app.get('/:id', authMiddleware, async (c) => {
  const { id } = c.req.param()
  const db = getDb()

  const [segment] = await db
    .select()
    .from(segments)
    .where(eq(segments.id, id))
    .limit(1)

  if (!segment || segment.deletedAt) throw new NotFoundError('Segmento')

  return c.json({ data: segment })
})

// POST /segments
app.post(
  '/',
  authMiddleware,
  requireRole('admin', 'pm'),
  zValidator('json', segmentSchema),
  async (c) => {
    const body = c.req.valid('json')
    const user = c.get('user')
    const db = getDb()

    const [created] = await db
      .insert(segments)
      .values({ ...body, createdBy: user.id })
      .returning()

    return c.json({ data: created }, 201)
  }
)

// PUT /segments/:id
app.put(
  '/:id',
  authMiddleware,
  requireRole('admin', 'pm'),
  zValidator('json', segmentSchema.partial()),
  async (c) => {
    const { id } = c.req.param()
    const body = c.req.valid('json')
    const db = getDb()

    const [updated] = await db
      .update(segments)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(segments.id, id))
      .returning()

    if (!updated) throw new NotFoundError('Segmento')

    return c.json({ data: updated })
  }
)

// DELETE /segments/:id (soft delete)
app.delete('/:id', authMiddleware, requireRole('admin', 'pm'), async (c) => {
  const { id } = c.req.param()
  const db = getDb()

  const [updated] = await db
    .update(segments)
    .set({ deletedAt: new Date() })
    .where(eq(segments.id, id))
    .returning()

  if (!updated) throw new NotFoundError('Segmento')

  return c.json({ data: { success: true } })
})

export default app
