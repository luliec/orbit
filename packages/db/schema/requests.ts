import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  date,
  timestamp,
  serial,
  jsonb,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { segments } from './segments'
import { campaigns } from './campaigns'

export const requests = pgTable('requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: serial('number').notNull().unique(),
  title: varchar('title', { length: 500 }).notNull(),
  channel: varchar('channel', { length: 50 })
    .notNull()
    .$type<'email' | 'whatsapp' | 'sms' | 'paid_digital'>(),
  objective: text('objective').notNull(),
  brief: text('brief').notNull(),
  // Estructura del Google Sheet asociado (secciones/filas del template)
  sheetUrl: varchar('sheet_url', { length: 1000 }),
  sheetStructure: jsonb('sheet_structure').$type<
    Array<{
      key: string
      rowName: string
      rowIndex: number
      charLimit: number | null
      currentValue?: string
    }>
  >(),
  segmentId: uuid('segment_id').references(() => segments.id, { onDelete: 'set null' }),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  pmId: uuid('pm_id').references(() => users.id, { onDelete: 'set null' }),
  copyId: uuid('copy_id').references(() => users.id, { onDelete: 'set null' }),
  artId: uuid('art_id').references(() => users.id, { onDelete: 'set null' }),
  dueDate: date('due_date'),
  clientCopyReview: boolean('client_copy_review').notNull().default(false),
  clientArtReview: boolean('client_art_review').notNull().default(false),
  clientToken: varchar('client_token', { length: 255 }),
  clientTokenExpiresAt: timestamp('client_token_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type Request = typeof requests.$inferSelect
export type NewRequest = typeof requests.$inferInsert
