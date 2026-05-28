import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb, copyVersions, requests, requestVariants, users, auditLog } from '@orbit/db'
import { eq, and, isNull, desc, max } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'
import { NotFoundError, ForbiddenError, AppError } from '../lib/errors'
import { getAIProvider, isAIAvailable } from '../services/ai'
import type { CopySection } from '@orbit/db'

const app = new Hono()

const copySectionSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  charLimit: z.number().nullable().optional(),
})

// GET /requests/:id/copies
app.get('/', authMiddleware, async (c) => {
  const requestId = c.req.param('requestId')
  const variantId = c.req.query('variantId')
  const user = c.get('user')
  const db = getDb()

  const [request] = await db
    .select()
    .from(requests)
    .where(and(eq(requests.id, requestId), isNull(requests.deletedAt)))
    .limit(1)

  if (!request) throw new NotFoundError('Solicitud')

  const conditions = [eq(copyVersions.requestId, requestId)]
  if (variantId) conditions.push(eq(copyVersions.variantId, variantId))

  const versions = await db
    .select({
      id: copyVersions.id,
      requestId: copyVersions.requestId,
      variantId: copyVersions.variantId,
      versionNumber: copyVersions.versionNumber,
      channel: copyVersions.channel,
      content: copyVersions.content,
      generationType: copyVersions.generationType,
      status: copyVersions.status,
      createdAt: copyVersions.createdAt,
      approvedAt: copyVersions.approvedAt,
      authorName: users.name,
    })
    .from(copyVersions)
    .leftJoin(users, eq(copyVersions.createdBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(copyVersions.versionNumber))

  return c.json({ data: versions })
})

// PUT /requests/:id/copies/:versionId
app.put(
  '/:versionId',
  authMiddleware,
  requireRole('copy', 'admin'),
  zValidator('json', z.object({ content: z.array(copySectionSchema) })),
  async (c) => {
    const requestId = c.req.param('requestId')
    const versionId = c.req.param('versionId')
    const { content } = c.req.valid('json')
    const user = c.get('user')
    const db = getDb()

    const [version] = await db
      .select()
      .from(copyVersions)
      .where(
        and(eq(copyVersions.id, versionId), eq(copyVersions.requestId, requestId))
      )
      .limit(1)

    if (!version) throw new NotFoundError('Versión de copy')
    if (version.status !== 'draft') {
      throw new AppError('INVALID_STATE', 'Solo se pueden editar versiones en borrador', 422)
    }

    const [updated] = await db
      .update(copyVersions)
      .set({
        content: content as CopySection[],
        generationType: version.generationType === 'ai_generated' ? 'ai_edited' : version.generationType,
      })
      .where(eq(copyVersions.id, versionId))
      .returning()

    return c.json({ data: updated })
  }
)

// POST /requests/:id/copies/:versionId/submit
app.post('/:versionId/submit', authMiddleware, requireRole('copy', 'admin'), async (c) => {
  const requestId = c.req.param('requestId')
  const versionId = c.req.param('versionId')
  const db = getDb()

  const [version] = await db
    .select()
    .from(copyVersions)
    .where(and(eq(copyVersions.id, versionId), eq(copyVersions.requestId, requestId)))
    .limit(1)

  if (!version) throw new NotFoundError('Versión de copy')
  if (version.status !== 'draft') {
    throw new AppError('INVALID_STATE', 'Esta versión ya no está en borrador', 422)
  }

  const [updated] = await db
    .update(copyVersions)
    .set({ status: 'in_review' })
    .where(eq(copyVersions.id, versionId))
    .returning()

  return c.json({ data: updated })
})

// POST /requests/:id/copies/:versionId/approve
app.post('/:versionId/approve', authMiddleware, requireRole('pm', 'admin'), async (c) => {
  const requestId = c.req.param('requestId')
  const versionId = c.req.param('versionId')
  const user = c.get('user')
  const db = getDb()

  const [version] = await db
    .select()
    .from(copyVersions)
    .where(and(eq(copyVersions.id, versionId), eq(copyVersions.requestId, requestId)))
    .limit(1)

  if (!version) throw new NotFoundError('Versión de copy')
  if (version.status !== 'in_review') {
    throw new AppError('INVALID_STATE', 'El copy debe estar en revisión para aprobarse', 422)
  }

  const [updated] = await db
    .update(copyVersions)
    .set({ status: 'approved', approvedBy: user.id, approvedAt: new Date() })
    .where(eq(copyVersions.id, versionId))
    .returning()

  return c.json({ data: updated })
})

// POST /requests/:id/copies/generate — IA
app.post('/generate', authMiddleware, requireRole('copy', 'admin'), async (c) => {
  const requestId = c.req.param('requestId')
  const body = await c.req.json().catch(() => ({}))
  const variantId = body?.variantId ?? null
  const user = c.get('user')
  const db = getDb()

  const [request] = await db
    .select()
    .from(requests)
    .where(and(eq(requests.id, requestId), isNull(requests.deletedAt)))
    .limit(1)

  if (!request) throw new NotFoundError('Solicitud')

  // Obtener número de versión
  const [maxResult] = await db
    .select({ max: max(copyVersions.versionNumber) })
    .from(copyVersions)
    .where(
      and(
        eq(copyVersions.requestId, requestId),
        variantId ? eq(copyVersions.variantId, variantId) : isNull(copyVersions.variantId)
      )
    )

  const nextVersion = (maxResult?.max ?? 0) + 1

  const ai = getAIProvider()
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

  const systemPrompt = `Sos un experto en marketing directo. Generás copies persuasivos, claros y con el tono adecuado para cada canal y segmento. Respondés siempre con JSON válido.`

  const userPrompt = `Generá un copy para:
Canal: ${request.channel}
Título de la solicitud: ${request.title}
Objetivo: ${request.objective ?? 'No especificado'}
Brief: ${request.brief ?? 'No especificado'}

Devolvé un JSON con la estructura:
{
  "sections": [
    { "key": "subject", "label": "Asunto", "value": "...", "charLimit": 60 },
    { "key": "preview", "label": "Preview", "value": "...", "charLimit": 90 },
    { "key": "body", "label": "Cuerpo", "value": "...", "charLimit": null },
    { "key": "cta", "label": "Call to action", "value": "...", "charLimit": 30 }
  ],
  "strategyNote": "..."
}`

  const result = await ai.generateCopy({ systemPrompt, userPrompt, model: modelName })

  const content: CopySection[] =
    result[0]?.sections?.map((s) => ({
      key: s.key,
      label: s.label,
      value: s.value,
      charLimit: s.charLimit ?? null,
    })) ?? []

  const [created] = await db
    .insert(copyVersions)
    .values({
      requestId,
      variantId: variantId ?? null,
      versionNumber: nextVersion,
      channel: request.channel,
      content,
      generationType: 'ai_generated',
      status: 'draft',
      createdBy: user.id,
      aiModel: isAIAvailable() ? 'gemini-2.0-flash' : 'mock',
    })
    .returning()

  await db.insert(auditLog).values({
    userId: user.id,
    action: 'copy.generated',
    entityType: 'copy_version',
    entityId: created.id,
  })

  return c.json({ data: created }, 201)
})

export default app
