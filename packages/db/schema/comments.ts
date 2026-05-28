import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { requests } from './requests'
import { users } from './users'

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),
  entityType: varchar('entity_type', { length: 20 })
    .notNull()
    .$type<'copy' | 'art' | 'brief' | 'general'>(),
  entityId: uuid('entity_id'),
  // Sección específica: 'subject', 'body', 'cta', etc. (para copies)
  section: varchar('section', { length: 100 }),
  // Para respuestas en thread
  parentId: uuid('parent_id'),
  content: text('content').notNull(),
  isResolved: boolean('is_resolved').notNull().default(false),
  resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert
