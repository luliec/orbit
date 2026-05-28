import { pgTable, uuid, varchar, integer, text, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { requests } from './requests'
import { requestVariants } from './request-variants'
import { users } from './users'

export interface CopySection {
  key: string
  label: string
  value: string
  charLimit: number | null
}

export const copyVersions = pgTable('copy_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').references(() => requestVariants.id, {
    onDelete: 'cascade',
  }),
  versionNumber: integer('version_number').notNull(),
  channel: varchar('channel', { length: 50 }).notNull(),
  // Array de secciones: [{ key, label, value, charLimit }]
  content: jsonb('content').$type<CopySection[]>().notNull(),
  generationType: varchar('generation_type', { length: 30 })
    .$type<'manual' | 'ai_generated' | 'ai_edited'>()
    .notNull()
    .default('manual'),
  aiPromptUsed: text('ai_prompt_used'),
  aiModel: varchar('ai_model', { length: 100 }),
  aiContextBundle: text('ai_context_bundle'),
  status: varchar('status', { length: 30 })
    .notNull()
    .default('draft')
    .$type<'draft' | 'in_review' | 'changes_requested' | 'approved'>(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type CopyVersion = typeof copyVersions.$inferSelect
export type NewCopyVersion = typeof copyVersions.$inferInsert
