DROP TABLE "pending_tenants";--> statement-breakpoint
DROP TABLE "usage_billing";--> statement-breakpoint
DROP TABLE "permission_audit_log";--> statement-breakpoint
DROP TABLE "rate_limit_logs";--> statement-breakpoint
DROP TABLE "organization_subscriptions";--> statement-breakpoint
DROP TABLE "subscription_plans";--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "onboarding_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "onboarding_step" varchar(50);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "onboarding_progress" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "onboarding_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "setup_completion_rate" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "trial_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "trial_status" varchar(20) DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "subscription_status" varchar(20) DEFAULT 'trial';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "features_enabled" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "first_login_at" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "initial_setup_data" jsonb DEFAULT '{}'::jsonb;