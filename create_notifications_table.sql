-- Fix database schema for seasonal credits and notifications

-- Add missing columns to credit_allocations table
ALTER TABLE "credit_allocations" ADD COLUMN IF NOT EXISTS "campaign_id" varchar(100);
ALTER TABLE "credit_allocations" ADD COLUMN IF NOT EXISTS "campaign_name" varchar(255);
ALTER TABLE "credit_allocations" ADD COLUMN IF NOT EXISTS "credit_metadata" jsonb;
ALTER TABLE "credit_allocations" ADD COLUMN IF NOT EXISTS "expiry_rule" varchar(50) DEFAULT 'fixed_date';
ALTER TABLE "credit_allocations" ADD COLUMN IF NOT EXISTS "expiry_warning_days" numeric(5, 0) DEFAULT '7';

-- Create notifications table for tenant dashboard
CREATE TABLE IF NOT EXISTS "notifications" (
	"notification_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"action_url" text,
	"action_label" text,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_dismissed" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"scheduled_at" timestamp,
	"target_user_id" uuid
);

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_id" ON "notifications"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_type" ON "notifications"("type");
CREATE INDEX IF NOT EXISTS "idx_notifications_priority" ON "notifications"("priority");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON "notifications"("is_read");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_dismissed" ON "notifications"("is_dismissed");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_active" ON "notifications"("is_active");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications"("created_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_expires_at" ON "notifications"("expires_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_scheduled_at" ON "notifications"("scheduled_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_target_user_id" ON "notifications"("target_user_id");

-- Verify the setup
SELECT
  'credit_allocations columns' as check_type,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'credit_allocations'
  AND column_name IN ('campaign_id', 'campaign_name', 'credit_metadata', 'expiry_rule', 'expiry_warning_days')

UNION ALL

SELECT
  'notifications table exists' as check_type,
  COUNT(*) as table_count
FROM information_schema.tables
WHERE table_name = 'notifications';
