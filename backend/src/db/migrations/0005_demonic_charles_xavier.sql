CREATE TABLE IF NOT EXISTS "trial_events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"subscription_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"event_data" jsonb DEFAULT '{}'::jsonb,
	"user_id" uuid,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trial_restrictions" (
	"restriction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"restriction_type" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true,
	"restriction_data" jsonb DEFAULT '{}'::jsonb,
	"applied_at" timestamp DEFAULT now(),
	"removed_at" timestamp
);
--> statement-breakpoint
DROP TABLE "role_templates";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_stripe_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "subscribed_tools" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "subscribed_tools" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "usage_limits" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "usage_limits" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "monthly_price" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "yearly_price" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "stripe_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "is_trial_user" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "has_ever_upgraded" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "first_upgrade_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "last_downgrade_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_toggled_off" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "last_reminder_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "reminder_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "restrictions_applied_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "suspended_reason" text;--> statement-breakpoint
ALTER TABLE "user_application_permissions" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "user_application_permissions" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_application_permissions" ADD CONSTRAINT "user_application_permissions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trial_events" ADD CONSTRAINT "trial_events_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trial_events" ADD CONSTRAINT "trial_events_subscription_id_subscriptions_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("subscription_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trial_restrictions" ADD CONSTRAINT "trial_restrictions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
