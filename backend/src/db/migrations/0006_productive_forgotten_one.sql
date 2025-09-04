CREATE TABLE IF NOT EXISTS "webhook_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"status" varchar(50) NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "webhook_logs_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "custom_roles" DROP CONSTRAINT "custom_roles_created_by_tenant_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD COLUMN "invitation_url" varchar(1000);--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD COLUMN "cancelled_by" uuid;--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "legal_company_name" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "company_id" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "duns_number" varchar(50);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "company_type" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "ownership" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "annual_revenue" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "number_of_employees" integer;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "ticker_symbol" varchar(20);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "website" varchar(500);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "company_description" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "founded_date" date;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "billing_street" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "billing_city" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "billing_state" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "billing_zip" varchar(20);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "billing_country" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "shipping_street" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "shipping_city" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "shipping_state" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "shipping_zip" varchar(20);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "shipping_country" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "fax" varchar(50);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "default_language" varchar(10) DEFAULT 'en';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "default_locale" varchar(20) DEFAULT 'en-US';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "default_currency" varchar(3) DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "multi_currency_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "advanced_currency_management" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "default_timezone" varchar(50) DEFAULT 'UTC';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "first_day_of_week" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "first_name" varchar(100);--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "last_name" varchar(100);--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "username" varchar(100);--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "alias" varchar(100);--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "mobile" varchar(50);--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "manager_id" uuid;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "profile_data" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_logs_event_id_idx" ON "webhook_logs" ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_logs_event_type_idx" ON "webhook_logs" ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_logs_status_idx" ON "webhook_logs" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_logs_created_at_idx" ON "webhook_logs" ("created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_manager_id_tenant_users_user_id_fk" FOREIGN KEY ("manager_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "tenant_users" DROP COLUMN IF EXISTS "invitation_token";--> statement-breakpoint
ALTER TABLE "tenant_users" DROP COLUMN IF EXISTS "invitation_expires_at";--> statement-breakpoint
ALTER TABLE "tenant_users" DROP COLUMN IF EXISTS "invitation_accepted_at";--> statement-breakpoint
ALTER TABLE "custom_roles" DROP COLUMN IF EXISTS "created_by";--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_invitation_token_unique" UNIQUE("invitation_token");