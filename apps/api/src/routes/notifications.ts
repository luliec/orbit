import { Hono } from 'hono'
import { getDb, notifications } from '@orbit/db'
import { eq, and, desc } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'

const app = new Hono()

// GET /notifications — mis notificaciones
app.get('/', authMiddleware, async (c) => {
  const user = c.get('user')
  const db = getDb()

  const result = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50)

  const unreadCount = result.filter((n) => !n.isRead).length

  return c.json({ data: result, meta: { unread_count: unreadCount } })
})

// PUT /notifications/read-all
app.put('/read-all', authMiddleware, async (c) => {
  const user = c.get('user')
  const db = getDb()

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)))

  return c.json({ data: { success: true } })
})

// PUT /notifications/:id/read
app.put('/:id/read', authMiddleware, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')
  const db = getDb()

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))

  return c.json({ data: { success: true } })
})

export default app
