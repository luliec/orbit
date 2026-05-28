import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core'
import { requests } from './requests'
import { users } from './users'

export const approvals = pgTable('approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),
  stage: varchar('stage', { length: 30 })
    .notNull()
    .$type<'copy' | 'copy_client' | 'art' | 'art_client'>(),
  status: varchar('status', { length: 30 })
    .notNull()
    .default('pending')
    .$type<'pending' | 'approved' | 'rejected' | 'changes_requested'>(),
  entityId: uuid('entity_id'),
  approverId: uuid('approver_id').references(() => users.id, { onDelete: 'set null' }),
  approverEmail: varchar('approver_email', { length: 255 }),
  approverName: varchar('approver_name', { length: 255 }),
  notes: text('notes'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Approval = typeof approvals.$inferSelect
export type NewApproval = typeof approvals.$inferInsert
