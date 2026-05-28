import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core'
import { aiArtReviews } from './ai-art-reviews'
import { users } from './users'

export const aiFindings = pgTable('ai_findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  aiReviewId: uuid('ai_review_id')
    .notNull()
    .references(() => aiArtReviews.id, { onDelete: 'cascade' }),
  severity: varchar('severity', { length: 20 })
    .notNull()
    .$type<'critical' | 'moderate' | 'minor' | 'info'>(),
  category: varchar('category', { length: 100 }),
  description: text('description').notNull(),
  detectedText: text('detected_text'),
  expectedText: text('expected_text'),
  location: varchar('location', { length: 200 }),
  recommendation: text('recommendation'),
  status: varchar('status', { length: 20 })
    .notNull()
    .default('pending')
    .$type<'pending' | 'confirmed' | 'dismissed'>(),
  confirmedBy: uuid('confirmed_by').references(() => users.id, { onDelete: 'set null' }),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type AiFinding = typeof aiFindings.$inferSelect
export type NewAiFinding = typeof aiFindings.$inferInsert
