import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { segments } from './segments'
import { requests } from './requests'
import { copyVersions } from './copy-versions'
import { users } from './users'

export const segmentExamples = pgTable('segment_examples', {
  id: uuid('id').primaryKey().defaultRandom(),
  segmentId: uuid('segment_id').references(() => segments.id, { onDelete: 'cascade' }),
  requestId: uuid('request_id').references(() => requests.id, { onDelete: 'set null' }),
  copyVersionId: uuid('copy_version_id').references(() => copyVersions.id, {
    onDelete: 'set null',
  }),
  channel: varchar('channel', { length: 50 }),
  title: varchar('title', { length: 255 }),
  notes: text('notes'),
  isReference: boolean('is_reference').notNull().default(false),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type SegmentExample = typeof segmentExamples.$inferSelect
export type NewSegmentExample = typeof segmentExamples.$inferInsert
