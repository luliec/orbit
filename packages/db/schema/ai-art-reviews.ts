import { pgTable, uuid, varchar, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { assets } from './assets'
import { requests } from './requests'
import { copyVersions } from './copy-versions'
import { users } from './users'

export const aiArtReviews = pgTable('ai_art_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id')
    .notNull()
    .references(() => assets.id, { onDelete: 'cascade' }),
  requestId: uuid('request_id').references(() => requests.id, { onDelete: 'cascade' }),
  copyVersionId: uuid('copy_version_id').references(() => copyVersions.id, {
    onDelete: 'set null',
  }),
  overallStatus: varchar('overall_status', { length: 50 })
    .notNull()
    .$type<'approved' | 'approved_with_observations' | 'requires_changes'>(),
  findings: jsonb('findings').$type<
    Array<{
      severity: 'critical' | 'moderate' | 'minor' | 'info'
      category: string
      description: string
      detectedText?: string
      expectedText?: string
      location?: string
      recommendation?: string
    }>
  >(),
  briefChecklist: jsonb('brief_checklist').$type<
    Array<{
      item: string
      status: 'pass' | 'fail' | 'na'
      notes?: string
    }>
  >(),
  extractedText: text('extracted_text'),
  aiModel: varchar('ai_model', { length: 100 }),
  processingMs: integer('processing_ms'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull().defaultNow(),
  validatedBy: uuid('validated_by').references(() => users.id, { onDelete: 'set null' }),
  validatedAt: timestamp('validated_at', { withTimezone: true }),
})

export type AiArtReview = typeof aiArtReviews.$inferSelect
export type NewAiArtReview = typeof aiArtReviews.$inferInsert
