import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb, requests, requestVariants, auditLog } from '@orbit/db'
import { eq, isNull, and, or, desc } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'
import { NotFoundError, ApprovalBlockedError, AppError } from '../lib/errors'
import { TRANSITIONS, type RequestStatus } from '@orbit/config'

const app = new Hono()

const requestSchema = z.object({
  title: z.string().min(1).max(500),
  channel: z.enum(['email', 'whatsapp', 'sms', 'paid_digital']),
  objective: z.string().min(1),
  brief: z.string().min(1),
  segmentId: z.string().uuid().optional().nullable(),
  campaignId: z.string().uuid().optional().nullable(),
  pmId: z.string().uuid().optional().nullable(),
  copyId: z.string().uuid().optional().nullable(),
  artId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  clientCopyReview: z.boolean().optional().default(false),
  clientArtReview: z.boolean().optional().default(false),
  sheetUrl: z.string().url().optional().nullable(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        sheetTabName: z.string().optional(),
        sortOrder: z.number().optional().default(0),
      })
    )
    .optional()
    .default([]),
})

// GET /requests — lista con filtros
app.get('/', authMiddleware, async (c) => {
  const user = c.get('user')
  const { status, channel, page = '1', per_page = '20' } = c.req.query()
  const db = getDb()

  const pageNum = parseInt(page)
  const perPageNum = Math.min(parseInt(per_page), 100)
  const offset = (pageNum - 1) * perPageNum

  // Construir condiciones según rol
  const conditions = [isNull(requests.deletedAt)]

  if (user.role === 'copy') {
    conditions.push(eq(requests.copyId, user.id))
  } else if (user.role === 'arte') {
    conditions.push(eq(requests.artId, user.id))
  }

  if (status) conditions.push(eq(requests.status, status))
  if (channel) conditions.push(eq(requests.channel, channel))

  const result = await db
    .select()
    .from(requests)
    .where(and(...conditions))
    .orderBy(desc(requests.createdAt))
    .limit(perPageNum)
    .offset(offset)

  return c.json({
    data: result,
    meta: { page: pageNum, per_page: perPageNum },
  })
})

// GET /requests/:id — detalle
app.get('/:id', authMiddleware, async (c) => {
  const { id } = c.req.param()
  const db = getDb()

  const [request] = await db
    .select()
    .from(requests)
    .where(and(eq(requests.id, id), isNull(requests.deletedAt)))
    .limit(1)

  if (!request) throw new NotFoundError('Solicitud')

  // Cargar variantes
  const variants = await db
    .select()
    .from(requestVariants)
    .where(eq(requestVariants.requestId, id))
    .orderBy(requestVariants.sortOrder)

  return c.json({ data: { ...request, variants } })
})

// POST /requests — crear
app.post(
  '/',
  authMiddleware,
  requireRole('admin', 'pm'),
  zValidator('json', requestSchema),
  async (c) => {
    const body = c.req.valid('json')
    const user = c.get('user')
    const db = getDb()

    const { variants, ...requestData } = body

    const [created] = await db
      .insert(requests)
      .values({
        ...requestData,
        pmId: requestData.pmId ?? user.id,
        status: 'brief_ready',
      })
      .returning()

    // Crear variantes si se proporcionaron
    if (variants.length > 0) {
      await db.insert(requestVariants).values(
        variants.map((v) => ({ ...v, requestId: created.id }))
      )
    }

    await db.insert(auditLog).values({
      userId: user.id,
      action: 'request.created',
      entityType: 'request',
      entityId: created.id,
      newValue: { title: created.title, status: created.status },
    })

    const variantsCreated = await db
      .select()
      .from(requestVariants)
      .where(eq(requestVariants.requestId, created.id))

    return c.json({ data: { ...created, variants: variantsCreated } }, 201)
  }
)

// PUT /requests/:id — actualizar brief
app.put(
  '/:id',
  authMiddleware,
  requireRole('admin', 'pm'),
  zValidator('json', requestSchema.partial()),
  async (c) => {
    const { id } = c.req.param()
    const body = c.req.valid('json')
    const { variants, ...requestData } = body
    const user = c.get('user')
    const db = getDb()

    const [existing] = await db
      .select()
      .from(requests)
      .where(and(eq(requests.id, id), isNull(requests.deletedAt)))
      .limit(1)

    if (!existing) throw new NotFoundError('Solicitud')

    const [updated] = await db
      .update(requests)
      .set({ ...requestData, updatedAt: new Date() })
      .where(eq(requests.id, id))
      .returning()

    await db.insert(auditLog).values({
      userId: user.id,
      action: 'request.updated',
      entityType: 'request',
      entityId: id,
    })

    return c.json({ data: updated })
  }
)

// POST /requests/:id/transition — cambiar estado
app.post(
  '/:id/transition',
  authMiddleware,
  zValidator('json', z.object({ action: z.string() })),
  async (c) => {
    const { id } = c.req.param()
    const { action } = c.req.valid('json')
    const user = c.get('user')
    const db = getDb()

    const [request] = await db
      .select()
      .from(requests)
      .where(and(eq(requests.id, id), isNull(requests.deletedAt)))
      .limit(1)

    if (!request) throw new NotFoundError('Solicitud')

    const transition = TRANSITIONS[action]
    if (!transition) {
      throw new AppError('INVALID_TRANSITION', `Acción '${action}' no existe`, 400)
    }

    if (request.status !== transition.from) {
      throw new ApprovalBlockedError('INVALID_TRANSITION')
    }

    if (!(transition.allowedRoles as string[]).includes(user.role)) {
      throw new ApprovalBlockedError('INVALID_TRANSITION')
    }

    const [updated] = await db
      .update(requests)
      .set({ status: transition.to, updatedAt: new Date() })
      .where(eq(requests.id, id))
      .returning()

    await db.insert(auditLog).values({
      userId: user.id,
      action: 'request.status_changed',
      entityType: 'request',
      entityId: id,
      oldValue: { status: request.status },
      newValue: { status: transition.to, action },
    })

    return c.json({ data: updated })
  }
)

// GET /requests/:id/history
app.get('/:id/history', authMiddleware, async (c) => {
  const { id } = c.req.param()
  const db = getDb()

  const history = await db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.entityType, 'request'), eq(auditLog.entityId, id)))
    .orderBy(desc(auditLog.createdAt))

  return c.json({ data: history })
})

// DELETE /requests/:id — soft delete
app.delete('/:id', authMiddleware, requireRole('admin', 'pm'), async (c) => {
  const { id } = c.req.param()
  const db = getDb()

  const [updated] = await db
    .update(requests)
    .set({ deletedAt: new Date() })
    .where(eq(requests.id, id))
    .returning()

  if (!updated) throw new NotFoundError('Solicitud')

  return c.json({ data: { success: true } })
})

export default app
