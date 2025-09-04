-- Enhanced Onboarding Tracking Migration
-- Adds comprehensive phase tracking, analytics, and A/B testing support

-- Add new columns to tenants table for enhanced onboarding tracking
ALTER TABLE "tenants" ADD COLUMN "trial_onboarding_completed" boolean DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN "trial_onboarding_completed_at" timestamp;
ALTER TABLE "tenants" ADD COLUMN "upgrade_onboarding_completed" boolean DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN "upgrade_onboarding_completed_at" timestamp;
ALTER TABLE "tenants" ADD COLUMN "profile_onboarding_completed" boolean DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN "profile_onboarding_completed_at" timestamp;
ALTER TABLE "tenants" ADD COLUMN "onboarding_phases" jsonb DEFAULT '{
  "trial": {"completed": false, "completedAt": null, "skipped": false},
  "profile": {"completed": false, "completedAt": null, "skipped": false},
  "upgrade": {"completed": false, "completedAt": null, "skipped": false},
  "team": {"completed": false, "completedAt": null, "skipped": false},
  "integration": {"completed": false, "completedAt": null, "skipped": false}
}'::jsonb;
ALTER TABLE "tenants" ADD COLUMN "user_journey" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "tenants" ADD COLUMN "onboarding_variant" varchar(50);
--> statement-breakpoint

-- Create onboarding_events table for detailed analytics
CREATE TABLE IF NOT EXISTS "onboarding_events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"event_phase" varchar(50) NOT NULL,
	"event_action" varchar(50) NOT NULL,
	"user_id" uuid,
	"session_id" varchar(255),
	"ip_address" varchar(45),
	"user_agent" text,
	"event_data" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"time_spent" integer,
	"completion_rate" integer,
	"step_number" integer,
	"total_steps" integer,
	"variant_id" varchar(50),
	"experiment_id" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"event_timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_onboarding_events_tenant_id" ON "onboarding_events"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_onboarding_events_event_type" ON "onboarding_events"("event_type");
CREATE INDEX IF NOT EXISTS "idx_onboarding_events_event_phase" ON "onboarding_events"("event_phase");
CREATE INDEX IF NOT EXISTS "idx_onboarding_events_created_at" ON "onboarding_events"("created_at");
CREATE INDEX IF NOT EXISTS "idx_onboarding_events_tenant_phase_action" ON "onboarding_events"("tenant_id", "event_phase", "event_action");
--> statement-breakpoint

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "onboarding_events" ADD CONSTRAINT "onboarding_events_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Migrate existing data: Mark tenants with onboarding_completed=true as having completed trial phase
UPDATE "tenants"
SET
  "trial_onboarding_completed" = true,
  "trial_onboarding_completed_at" = "onboarded_at",
  "onboarding_phases" = jsonb_set(
    jsonb_set("onboarding_phases", '{trial,completed}', 'true'::jsonb),
    '{trial,completedAt}',
    to_jsonb("onboarded_at")
  )
WHERE "onboarding_completed" = true AND "onboarded_at" IS NOT NULL;
--> statement-breakpoint

-- Create initial onboarding events for existing completed onboardings
INSERT INTO "onboarding_events" (
  "tenant_id",
  "event_type",
  "event_phase",
  "event_action",
  "event_data",
  "metadata",
  "completion_rate",
  "step_number",
  "total_steps",
  "created_at",
  "event_timestamp"
)
SELECT
  "tenant_id",
  'trial_onboarding_completed',
  'trial',
  'completed',
  jsonb_build_object(
    'migrated', true,
    'original_onboarded_at', "onboarded_at",
    'company_name', "company_name",
    'gstin', "gstin"
  ),
  jsonb_build_object('source', 'migration', 'version', '1.0'),
  100,
  1,
  1,
  "onboarded_at",
  "onboarded_at"
FROM "tenants"
WHERE "onboarding_completed" = true AND "onboarded_at" IS NOT NULL;
--> statement-breakpoint

-- Update user journey for existing completed onboardings
UPDATE "tenants"
SET "user_journey" = jsonb_build_array(
  jsonb_build_object(
    'event', 'trial_onboarding_completed',
    'timestamp', "onboarded_at",
    'metadata', jsonb_build_object(
      'source', 'migration',
      'version', '1.0',
      'migrated', true
    )
  )
)
WHERE "onboarding_completed" = true AND "onboarded_at" IS NOT NULL;
--> statement-breakpoint

-- Add comments for documentation
COMMENT ON TABLE "onboarding_events" IS 'Detailed tracking of onboarding events for analytics and user journey mapping';
COMMENT ON COLUMN "tenants"."trial_onboarding_completed" IS 'Tracks completion of initial trial onboarding (4 core fields)';
COMMENT ON COLUMN "tenants"."upgrade_onboarding_completed" IS 'Tracks completion of payment upgrade onboarding (comprehensive profile)';
COMMENT ON COLUMN "tenants"."profile_onboarding_completed" IS 'Tracks completion of profile data collection during upgrade';
COMMENT ON COLUMN "tenants"."onboarding_phases" IS 'Flexible JSON tracking of all onboarding phases with completion status';
COMMENT ON COLUMN "tenants"."user_journey" IS 'Array of user journey events for analytics';
COMMENT ON COLUMN "tenants"."onboarding_variant" IS 'A/B testing variant assigned to this tenant';
--> statement-breakpoint
