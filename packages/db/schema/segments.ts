import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { users } from './users'

export const segments = pgTable('segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  audience: text('audience'),
  tone: text('tone'),
  // { words_yes: string[], words_no: string[], style: string, personality: string }
  brandVoice: jsonb('brand_voice').$type<{
    wordsYes: string[]
    wordsNo: string[]
    style: string
    personality: string
  }>(),
  // [{ text: string, severity: 'critical' | 'moderate' | 'minor', type: 'legal' | 'commercial' | 'brand' }]
  restrictions: jsonb('restrictions').$type<
    Array<{
      text: string
      severity: 'critical' | 'moderate' | 'minor'
      type: 'legal' | 'commercial' | 'brand' | 'channel'
    }>
  >(),
  preferredChannels: jsonb('preferred_channels').$type<string[]>(),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type Segment = typeof segments.$inferSelect
export type NewSegment = typeof segments.$inferInsert
