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
CREATE TABLE IF NOT EXISTS "user_manager_relationships" (
	"relationship_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"relationship_type" varchar(50) DEFAULT 'direct',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tenant_users" DROP CONSTRAINT "tenant_users_manager_id_tenant_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "tenant_users" DROP CONSTRAINT "tenant_users_invited_by_tenant_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "trial_onboarding_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "trial_onboarding_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "upgrade_onboarding_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "upgrade_onboarding_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "profile_onboarding_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "profile_onboarding_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "onboarding_phases" jsonb DEFAULT '{"trial":{"completed":false,"completedAt":null,"skipped":false},"profile":{"completed":false,"completedAt":null,"skipped":false},"upgrade":{"completed":false,"completedAt":null,"skipped":false},"team":{"completed":false,"completedAt":null,"skipped":false},"integration":{"completed":false,"completedAt":null,"skipped":false}}'::jsonb;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "user_journey" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "onboarding_variant" varchar(50);--> statement-breakpoint
ALTER TABLE "organization_locations" ADD COLUMN "responsible_person_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_locations" ADD CONSTRAINT "organization_locations_responsible_person_id_tenant_users_user_id_fk" FOREIGN KEY ("responsible_person_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_events" ADD CONSTRAINT "onboarding_events_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_manager_relationships" ADD CONSTRAINT "user_manager_relationships_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_manager_relationships" ADD CONSTRAINT "user_manager_relationships_user_id_tenant_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_manager_relationships" ADD CONSTRAINT "user_manager_relationships_manager_id_tenant_users_user_id_fk" FOREIGN KEY ("manager_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
