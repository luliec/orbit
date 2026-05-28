import { pgTable, uuid, varchar, integer, bigint, timestamp } from 'drizzle-orm/pg-core'
import { requests } from './requests'
import { users } from './users'

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull().default(1),
  filename: varchar('filename', { length: 500 }).notNull(),
  originalFilename: varchar('original_filename', { length: 500 }),
  fileType: varchar('file_type', { length: 20 }),
  fileSize: bigint('file_size', { mode: 'number' }),
  fileUrl: varchar('file_url', { length: 1000 }).notNull(),
  storagePath: varchar('storage_path', { length: 1000 }),
  width: integer('width'),
  height: integer('height'),
  channelFormat: varchar('channel_format', { length: 100 }),
  status: varchar('status', { length: 30 })
    .notNull()
    .default('uploaded')
    .$type<'uploaded' | 'ai_reviewing' | 'ai_reviewed' | 'copy_validated' | 'approved' | 'rejected'>(),
  driveFileId: varchar('drive_file_id', { length: 255 }),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert
