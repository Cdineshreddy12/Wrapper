-- Add missing columns to subscriptions table that exist in schema but not in database
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_at" timestamp;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "canceled_at" timestamp;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "suspended_reason" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "add_ons" jsonb DEFAULT '[]';

-- Update any existing NULL json columns to have proper defaults
UPDATE "subscriptions" 
SET 
  "add_ons" = COALESCE("add_ons", '[]'::jsonb),
  "subscribed_tools" = COALESCE("subscribed_tools", '[]'::jsonb),
  "usage_limits" = COALESCE("usage_limits", '{}'::jsonb)
WHERE 
  "add_ons" IS NULL 
  OR "subscribed_tools" IS NULL 
  OR "usage_limits" IS NULL; 