/**
 * Change log table for tracking table changes.
 */

import { pgTable, serial, varchar, uuid, timestamp, text, boolean, index } from 'drizzle-orm/pg-core';

export const changeLog = pgTable('change_log', {
  id: serial('id').notNull().primaryKey(),
  tableName: varchar('table_name', { length: 50 }).notNull(),
  recordId: uuid('record_id').notNull(),
  operation: varchar('operation', { length: 10 }).notNull(),
  changedAt: timestamp('changed_at', { mode: 'string' }).defaultNow(),
  changedFields: text('changed_fields'),
  priority: varchar('priority', { length: 20 }).default('normal'),
  processed: boolean('processed').default(false),
  batchId: uuid('batch_id'),
}, (table) => ({
  idxChangeLogTableTime: index('idx_change_log_table_time').on(table.tableName, table.changedAt),
  idxChangeLogUnprocessed: index('idx_change_log_unprocessed').on(table.processed),
  idxChangeLogPriority: index('idx_change_log_priority').on(table.changedAt, table.priority),
}));
