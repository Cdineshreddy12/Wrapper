-- Add missing columns to subscriptions table
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "is_trial_user" boolean DEFAULT false;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "has_ever_upgraded" boolean DEFAULT false;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "first_upgrade_at" timestamp;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "last_downgrade_at" timestamp;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "trial_toggled_off" boolean DEFAULT false;

-- Update existing records to set proper defaults
UPDATE "subscriptions" SET 
  "is_trial_user" = CASE 
    WHEN "trial_end" IS NOT NULL AND "trial_end" > CURRENT_TIMESTAMP THEN true
    ELSE false
  END,
  "has_ever_upgraded" = CASE 
    WHEN "plan" != 'free' AND "status" = 'active' THEN true
    ELSE false
  END
WHERE "is_trial_user" IS NULL OR "has_ever_upgraded" IS NULL; 