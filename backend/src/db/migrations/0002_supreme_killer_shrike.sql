CREATE TABLE IF NOT EXISTS "activity_logs" (
	"log_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"tenant_id" uuid,
	"app_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" varchar(255),
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_modules" (
	"module_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid,
	"module_code" varchar(50) NOT NULL,
	"module_name" varchar(100) NOT NULL,
	"description" text,
	"is_core" boolean DEFAULT false,
	"permissions" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
	"app_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_code" varchar(50) NOT NULL,
	"app_name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(255),
	"base_url" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"version" varchar(20),
	"is_core" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "applications_app_code_unique" UNIQUE("app_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"app_id" uuid,
	"is_enabled" boolean DEFAULT true,
	"enabled_modules" jsonb,
	"custom_permissions" jsonb,
	"license_count" integer DEFAULT 0,
	"max_users" integer,
	"subscription_tier" varchar(50),
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_subscriptions" (
	"subscription_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"plan_id" uuid,
	"status" varchar(20) NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"trial_ends_at" timestamp,
	"custom_pricing" jsonb,
	"payment_method_id" varchar(255),
	"last_payment_at" timestamp,
	"next_payment_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sso_tokens" (
	"token_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"app_id" uuid,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_revoked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_plans" (
	"plan_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_code" varchar(50) NOT NULL,
	"plan_name" varchar(100) NOT NULL,
	"plan_type" varchar(20) NOT NULL,
	"description" text,
	"price" numeric(10, 2),
	"billing_cycle" varchar(20),
	"included_apps" jsonb,
	"features" jsonb,
	"max_users" integer,
	"max_organizations" integer,
	"is_active" boolean DEFAULT true,
	"is_custom" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subscription_plans_plan_code_unique" UNIQUE("plan_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_application_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"app_id" uuid,
	"module_id" uuid,
	"permissions" jsonb,
	"is_active" boolean DEFAULT true,
	"granted_by" uuid,
	"granted_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "tenant_users" ALTER COLUMN "kinde_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "logo" varchar(500);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "custom_branding" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "invited_by" uuid;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "invited_at" timestamp;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "invitation_token" varchar(255);--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "invitation_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "invitation_accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "custom_roles" ADD COLUMN "kinde_role_id" varchar(255);--> statement-breakpoint
ALTER TABLE "custom_roles" ADD COLUMN "kinde_role_key" varchar(255);--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD COLUMN "id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_invited_by_tenant_users_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "user_role_assignments" DROP COLUMN IF EXISTS "assignment_id";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_tenant_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_app_id_applications_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "applications"("app_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application_modules" ADD CONSTRAINT "application_modules_app_id_applications_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "applications"("app_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_applications" ADD CONSTRAINT "organization_applications_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_applications" ADD CONSTRAINT "organization_applications_app_id_applications_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "applications"("app_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_plan_id_subscription_plans_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("plan_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sso_tokens" ADD CONSTRAINT "sso_tokens_user_id_tenant_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sso_tokens" ADD CONSTRAINT "sso_tokens_app_id_applications_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "applications"("app_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_application_permissions" ADD CONSTRAINT "user_application_permissions_user_id_tenant_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_application_permissions" ADD CONSTRAINT "user_application_permissions_app_id_applications_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "applications"("app_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_application_permissions" ADD CONSTRAINT "user_application_permissions_module_id_application_modules_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "application_modules"("module_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_application_permissions" ADD CONSTRAINT "user_application_permissions_granted_by_tenant_users_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
