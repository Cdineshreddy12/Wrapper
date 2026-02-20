/**
 * Contact Submissions Schema
 * Stores contact form and demo form submissions from the public landing page
 * Platform-level table (no tenant_id) - these are pre-signup inquiries
 */

import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';

export const contactSubmissions = pgTable('contact_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  jobTitle: varchar('job_title', { length: 255 }),
  companySize: varchar('company_size', { length: 50 }),
  preferredTime: varchar('preferred_time', { length: 50 }),
  comments: text('comments'),
  source: varchar('source', { length: 20 }).notNull().default('contact'), // 'contact' or 'demo'
  ip: varchar('ip', { length: 45 }), // IPv6 can be up to 45 chars
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('idx_contact_submissions_email').on(table.email),
  sourceIdx: index('idx_contact_submissions_source').on(table.source),
  createdAtIdx: index('idx_contact_submissions_created_at').on(table.createdAt),
  emailSourceIdx: index('idx_contact_submissions_email_source').on(table.email, table.source),
}));
