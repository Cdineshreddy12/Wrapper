CREATE TABLE IF NOT EXISTS "subscription_actions" (
	"action_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"action_type" varchar(30) NOT NULL,
	"from_plan" varchar(50),
	"to_plan" varchar(50),
	"from_billing_cycle" varchar(20),
	"to_billing_cycle" varchar(20),
	"proration_amount" numeric(10, 2) DEFAULT '0',
	"refund_amount" numeric(10, 2) DEFAULT '0',
	"charge_amount" numeric(10, 2) DEFAULT '0',
	"effective_date" timestamp NOT NULL,
	"initiated_by" uuid,
	"reason" varchar(100),
	"admin_notes" text,
	"customer_notes" text,
	"status" varchar(20) DEFAULT 'pending',
	"stripe_subscription_id" varchar(255),
	"stripe_invoice_id" varchar(255),
	"impact_assessment" jsonb DEFAULT '{}'::jsonb,
	"rollback_data" jsonb DEFAULT '{}'::jsonb,
	"requested_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"completed_at" timestamp,
	"reversed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "stripe_charge_id" varchar(255);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "stripe_refund_id" varchar(255);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "stripe_dispute_id" varchar(255);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "amount_refunded" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "amount_disputed" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_method_details" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_type" varchar(30) DEFAULT 'subscription';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "billing_reason" varchar(50);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "proration_amount" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "credit_amount" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refund_reason" varchar(100);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refund_requested_by" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "is_partial_refund" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "dispute_reason" varchar(100);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "dispute_status" varchar(30);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "dispute_evidence_submitted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "tax_amount" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "tax_rate" numeric(5, 4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "tax_region" varchar(50);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "processing_fees" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "net_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "risk_level" varchar(20);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "risk_score" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "fraud_details" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "stripe_raw_data" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "disputed_at" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "settled_at" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_refund_requested_by_tenants_tenant_id_fk" FOREIGN KEY ("refund_requested_by") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription_actions" ADD CONSTRAINT "subscription_actions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription_actions" ADD CONSTRAINT "subscription_actions_subscription_id_subscriptions_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("subscription_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription_actions" ADD CONSTRAINT "subscription_actions_initiated_by_tenants_tenant_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
