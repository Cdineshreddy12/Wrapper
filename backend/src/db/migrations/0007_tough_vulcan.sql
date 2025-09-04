CREATE TABLE IF NOT EXISTS "organization_locations" (
	"location_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"location_name" varchar(255) NOT NULL,
	"location_code" varchar(50),
	"location_type" varchar(20) DEFAULT 'office',
	"address" jsonb DEFAULT '{}'::jsonb,
	"coordinates" jsonb DEFAULT '{}'::jsonb,
	"contact_person" varchar(255),
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"timezone" varchar(50) DEFAULT 'UTC',
	"credit_allocation" numeric(15, 4) DEFAULT '0',
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_relationships" (
	"relationship_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_organization_id" uuid NOT NULL,
	"child_organization_id" uuid NOT NULL,
	"relationship_type" varchar(20) DEFAULT 'parent_child',
	"is_active" boolean DEFAULT true,
	"credit_sharing_enabled" boolean DEFAULT false,
	"credit_sharing_limit" numeric(15, 4),
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
	"organization_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"parent_organization_id" uuid,
	"organization_level" integer DEFAULT 1,
	"hierarchy_path" text,
	"organization_name" varchar(255) NOT NULL,
	"organization_code" varchar(50),
	"description" text,
	"organization_type" varchar(20) DEFAULT 'business_unit',
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"address" jsonb DEFAULT '{}'::jsonb,
	"credit_policy" jsonb DEFAULT '{"allowCreditAllocation":true,"maxCreditAllocation":null,"creditExpiryPolicy":{"enabled":true,"defaultDays":365}}'::jsonb,
	"responsible_person_id" uuid,
	"settings" jsonb DEFAULT '{"timezone":"UTC","currency":"USD","language":"en","features":{}}'::jsonb,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organizations_organization_code_unique" UNIQUE("organization_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "location_assignments" (
	"assignment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"assignment_type" varchar(20) DEFAULT 'primary',
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 1,
	"credit_sharing_enabled" boolean DEFAULT false,
	"credit_sharing_percentage" numeric(5, 2) DEFAULT '0',
	"assigned_by" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "location_resources" (
	"resource_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"resource_name" varchar(255) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_code" varchar(50),
	"description" text,
	"specifications" jsonb DEFAULT '{}'::jsonb,
	"quantity" integer DEFAULT 1,
	"unit" varchar(20) DEFAULT 'unit',
	"cost_per_unit" numeric(10, 2),
	"billing_cycle" varchar(20) DEFAULT 'monthly',
	"credit_cost" numeric(10, 4) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"is_available" boolean DEFAULT true,
	"maintenance_schedule" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "location_usage" (
	"usage_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"user_id" uuid,
	"usage_type" varchar(50) NOT NULL,
	"resource_id" uuid,
	"start_time" timestamp,
	"end_time" timestamp,
	"duration" integer,
	"credit_consumed" numeric(10, 4) DEFAULT '0',
	"credit_batch_id" uuid,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "locations" (
	"location_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_name" varchar(255) NOT NULL,
	"location_code" varchar(50),
	"location_type" varchar(20) DEFAULT 'office',
	"address" jsonb DEFAULT '{"street":"","city":"","state":"","zipCode":"","country":"","additionalDetails":""}'::jsonb,
	"coordinates" jsonb DEFAULT '{}'::jsonb,
	"contact_person" varchar(255),
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"emergency_contact" jsonb DEFAULT '{}'::jsonb,
	"timezone" varchar(50) DEFAULT 'UTC',
	"business_hours" jsonb DEFAULT '{"monday":{"open":"09:00","close":"17:00","isOpen":true},"tuesday":{"open":"09:00","close":"17:00","isOpen":true},"wednesday":{"open":"09:00","close":"17:00","isOpen":true},"thursday":{"open":"09:00","close":"17:00","isOpen":true},"friday":{"open":"09:00","close":"17:00","isOpen":true},"saturday":{"open":"09:00","close":"17:00","isOpen":false},"sunday":{"open":"09:00","close":"17:00","isOpen":false}}'::jsonb,
	"capacity" jsonb DEFAULT '{"maxOccupancy":null,"currentOccupancy":0,"resources":{}}'::jsonb,
	"credit_allocation" numeric(15, 4) DEFAULT '0',
	"credit_policy" jsonb DEFAULT '{"allowOverage":true,"overageLimit":10000,"overagePeriod":"day"}'::jsonb,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"is_headquarters" boolean DEFAULT false,
	"settings" jsonb DEFAULT '{"notifications":true,"autoBackup":true,"features":{}}'::jsonb,
	"responsible_person_id" uuid,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "locations_location_code_unique" UNIQUE("location_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "membership_bulk_operations" (
	"operation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"operation_type" varchar(50) NOT NULL,
	"operation_name" varchar(255),
	"description" text,
	"entity_type" varchar(20),
	"entity_id" uuid,
	"status" varchar(20) DEFAULT 'pending',
	"total_records" integer DEFAULT 0,
	"processed_records" integer DEFAULT 0,
	"failed_records" integer DEFAULT 0,
	"results" jsonb DEFAULT '{}'::jsonb,
	"errors" jsonb DEFAULT '[]'::jsonb,
	"error_summary" text,
	"source_file" varchar(500),
	"result_file" varchar(500),
	"initiated_by" uuid NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "membership_history" (
	"history_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_id" uuid NOT NULL,
	"change_type" varchar(50) NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"change_reason" text,
	"changed_by" uuid NOT NULL,
	"change_source" varchar(50) DEFAULT 'manual',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "membership_invitations" (
	"invitation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_id" uuid,
	"invited_user_id" uuid,
	"invited_email" varchar(255) NOT NULL,
	"invitation_token" varchar(255) NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"role_id" uuid,
	"status" varchar(20) DEFAULT 'pending',
	"sent_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"declined_at" timestamp,
	"cancelled_at" timestamp,
	"message" text,
	"invitation_url" varchar(1000),
	"invited_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "membership_invitations_invitation_token_unique" UNIQUE("invitation_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_memberships" (
	"membership_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"role_id" uuid,
	"role_name" varchar(100),
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"membership_type" varchar(20) DEFAULT 'direct',
	"membership_status" varchar(20) DEFAULT 'active',
	"access_level" varchar(20) DEFAULT 'standard',
	"is_primary" boolean DEFAULT false,
	"can_access_sub_entities" boolean DEFAULT false,
	"credit_permissions" jsonb DEFAULT '{"canPurchaseCredits":false,"canTransferCredits":false,"canApproveTransfers":false,"canViewCreditUsage":true,"creditLimit":null}'::jsonb,
	"is_temporary" boolean DEFAULT false,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"timezone" varchar(50) DEFAULT 'UTC',
	"department" varchar(100),
	"team" varchar(100),
	"job_title" varchar(100),
	"employee_id" varchar(50),
	"contact_override" jsonb DEFAULT '{}'::jsonb,
	"preferences" jsonb DEFAULT '{"notifications":{"email":true,"sms":false,"push":true},"dashboard":{"theme":"default","layout":"standard"}}'::jsonb,
	"invited_by" uuid,
	"invited_at" timestamp,
	"joined_at" timestamp,
	"last_accessed_at" timestamp,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_alerts" (
	"alert_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" varchar(20),
	"entity_id" uuid,
	"alert_type" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'info',
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"current_value" numeric(15, 4),
	"threshold_value" numeric(15, 4),
	"percentage" numeric(5, 2),
	"is_read" boolean DEFAULT false,
	"is_sent" boolean DEFAULT false,
	"sent_at" timestamp,
	"read_at" timestamp,
	"notify_users" jsonb DEFAULT '[]'::jsonb,
	"notify_roles" jsonb DEFAULT '[]'::jsonb,
	"action_required" varchar(100),
	"action_taken" varchar(100),
	"resolved_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_transactions" (
	"transaction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid,
	"transaction_type" varchar(30) NOT NULL,
	"amount" numeric(15, 4) NOT NULL,
	"previous_balance" numeric(15, 4),
	"new_balance" numeric(15, 4),
	"operation_code" varchar(255),
	"operation_id" uuid,
	"batch_id" uuid,
	"related_entity_type" varchar(20),
	"related_entity_id" uuid,
	"transfer_id" uuid,
	"payment_id" uuid,
	"stripe_payment_intent_id" varchar(255),
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"initiated_by" uuid,
	"processed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credits" (
	"credit_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid,
	"available_credits" numeric(15, 4) DEFAULT '0',
	"reserved_credits" numeric(15, 4) DEFAULT '0',
	"total_credits" numeric(15, 4) DEFAULT '0',
	"credit_pools" jsonb DEFAULT '[]'::jsonb,
	"credit_policy" jsonb DEFAULT '{"allowOverage":true,"overageLimit":{"period":"day","maxAmount":10000},"expiryPolicy":{"enabled":true,"defaultDays":365,"notificationDays":[30,7,1]},"autoRenewal":false}'::jsonb,
	"total_consumed" numeric(15, 4) DEFAULT '0',
	"total_expired" numeric(15, 4) DEFAULT '0',
	"total_transferred" numeric(15, 4) DEFAULT '0',
	"current_period_consumed" numeric(15, 4) DEFAULT '0',
	"period_start" timestamp,
	"period_end" timestamp,
	"period_type" varchar(20) DEFAULT 'month',
	"is_active" boolean DEFAULT true,
	"is_frozen" boolean DEFAULT false,
	"frozen_reason" text,
	"last_updated_by" uuid,
	"last_updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_purchases" (
	"purchase_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" varchar(20) DEFAULT 'organization',
	"entity_id" uuid,
	"credit_amount" numeric(15, 4) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"unit_price" numeric(10, 4) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"discount_tier" varchar(50),
	"discount_percentage" numeric(5, 2) DEFAULT '0',
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"final_amount" numeric(10, 2) NOT NULL,
	"batch_id" uuid NOT NULL,
	"expiry_date" timestamp,
	"expiry_policy" jsonb DEFAULT '{"type":"fixed_date","period":null,"notificationDays":[30,7,1]}'::jsonb,
	"payment_method" varchar(50),
	"stripe_payment_intent_id" varchar(255),
	"stripe_invoice_id" varchar(255),
	"payment_status" varchar(20) DEFAULT 'pending',
	"status" varchar(20) DEFAULT 'pending',
	"tax_rate" numeric(5, 4) DEFAULT '0',
	"tax_amount" numeric(10, 2) DEFAULT '0',
	"tax_region" varchar(100),
	"processing_fees" numeric(10, 2) DEFAULT '0',
	"net_amount" numeric(10, 2),
	"requested_at" timestamp DEFAULT now(),
	"paid_at" timestamp,
	"credited_at" timestamp,
	"completed_at" timestamp,
	"requested_by" uuid NOT NULL,
	"processed_by" uuid,
	"notes" text,
	"invoice_number" varchar(50),
	"purchase_order_number" varchar(50),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "credit_purchases_batch_id_unique" UNIQUE("batch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discount_tiers" (
	"tier_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tier_code" varchar(50) NOT NULL,
	"tier_name" varchar(100) NOT NULL,
	"description" text,
	"min_credits" numeric(15, 4) DEFAULT '0',
	"max_credits" numeric(15, 4),
	"discount_type" varchar(20) DEFAULT 'percentage',
	"discount_value" numeric(5, 2) NOT NULL,
	"base_price" numeric(10, 4) NOT NULL,
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 0,
	"total_purchases" integer DEFAULT 0,
	"total_credits_sold" numeric(15, 4) DEFAULT '0',
	"total_revenue" numeric(15, 2) DEFAULT '0',
	"valid_from" timestamp,
	"valid_until" timestamp,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "discount_tiers_tier_code_unique" UNIQUE("tier_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_history" (
	"history_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"old_status" varchar(20),
	"new_status" varchar(20),
	"old_payment_status" varchar(20),
	"new_payment_status" varchar(20),
	"change_type" varchar(50) NOT NULL,
	"change_reason" text,
	"changed_by" uuid NOT NULL,
	"change_source" varchar(50) DEFAULT 'manual',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_templates" (
	"template_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_name" varchar(100) NOT NULL,
	"description" text,
	"credit_amount" numeric(15, 4) NOT NULL,
	"payment_method" varchar(50) DEFAULT 'stripe',
	"auto_purchase_enabled" boolean DEFAULT false,
	"auto_purchase_threshold" numeric(15, 4),
	"max_auto_purchases" integer,
	"auto_purchase_count" integer DEFAULT 0,
	"is_recurring" boolean DEFAULT false,
	"recurring_interval" varchar(20),
	"next_purchase_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_transfers" (
	"transfer_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_entity_type" varchar(20) NOT NULL,
	"source_entity_id" uuid NOT NULL,
	"destination_entity_type" varchar(20) NOT NULL,
	"destination_entity_id" uuid NOT NULL,
	"requested_amount" numeric(15, 4) NOT NULL,
	"transfer_amount" numeric(15, 4),
	"transfer_fee" numeric(10, 4) DEFAULT '0',
	"selected_batches" jsonb DEFAULT '[]'::jsonb,
	"transfer_type" varchar(20) DEFAULT 'direct',
	"is_temporary" boolean DEFAULT false,
	"recall_deadline" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"approval_required" boolean DEFAULT true,
	"approved_by" uuid,
	"approved_at" timestamp,
	"approval_notes" text,
	"rejected_by" uuid,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"processed_at" timestamp,
	"processing_notes" text,
	"purpose" varchar(100),
	"reference_number" varchar(50),
	"description" text,
	"requested_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transfer_approval_rules" (
	"rule_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" varchar(20),
	"entity_id" uuid,
	"min_amount" numeric(15, 4) DEFAULT '0',
	"max_amount" numeric(15, 4),
	"requires_approval" boolean DEFAULT true,
	"approval_levels" jsonb DEFAULT '[]'::jsonb,
	"auto_approve_below" numeric(15, 4),
	"auto_approve_roles" jsonb DEFAULT '[]'::jsonb,
	"restricted_destinations" jsonb DEFAULT '[]'::jsonb,
	"allowed_purposes" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 0,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transfer_history" (
	"history_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_id" uuid NOT NULL,
	"old_status" varchar(20),
	"new_status" varchar(20),
	"status_changed_by" uuid,
	"action_type" varchar(50) NOT NULL,
	"action_details" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transfer_limits" (
	"limit_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" varchar(20),
	"entity_id" uuid,
	"period_type" varchar(20) DEFAULT 'month',
	"max_transfer_amount" numeric(15, 4),
	"max_transfer_count" integer,
	"max_recipient_count" integer,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"current_transfer_amount" numeric(15, 4) DEFAULT '0',
	"current_transfer_count" integer DEFAULT 0,
	"current_recipient_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"is_hard_limit" boolean DEFAULT true,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transfer_notifications" (
	"notification_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_id" uuid NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"recipient_email" varchar(255),
	"subject" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"delivery_status" varchar(20) DEFAULT 'pending',
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"next_retry_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_usage" (
	"usage_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"user_id" uuid,
	"session_id" uuid,
	"operation_code" varchar(255) NOT NULL,
	"operation_id" uuid,
	"operation_type" varchar(50) NOT NULL,
	"credits_debited" numeric(10, 4) NOT NULL,
	"pricing_mode" varchar(20) DEFAULT 'credits',
	"credit_batch_id" uuid,
	"module_code" varchar(50),
	"app_code" varchar(20),
	"endpoint" varchar(255),
	"http_method" varchar(10),
	"processing_time" integer,
	"data_size" integer,
	"record_count" integer,
	"ip_address" varchar(45),
	"user_agent" text,
	"request_id" varchar(100),
	"success" boolean DEFAULT true,
	"error_code" varchar(50),
	"error_message" text,
	"cost_breakdown" jsonb DEFAULT '{}'::jsonb,
	"billing_cycle" varchar(20),
	"invoice_id" uuid,
	"is_billable" boolean DEFAULT true,
	"is_refunded" boolean DEFAULT false,
	"refunded_amount" numeric(10, 4) DEFAULT '0',
	"refund_reason" text,
	"refunded_at" timestamp,
	"refunded_by" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_aggregation" (
	"aggregation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" varchar(20),
	"entity_id" uuid,
	"aggregation_type" varchar(20) NOT NULL,
	"aggregation_key" varchar(100) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_operations" integer DEFAULT 0,
	"total_credits_consumed" numeric(15, 4) DEFAULT '0',
	"total_processing_time" integer DEFAULT 0,
	"total_data_processed" bigint DEFAULT 0,
	"operations_by_type" jsonb DEFAULT '{}'::jsonb,
	"credits_by_type" jsonb DEFAULT '{}'::jsonb,
	"active_users" integer DEFAULT 0,
	"new_users" integer DEFAULT 0,
	"avg_response_time" numeric(8, 2),
	"error_rate" numeric(5, 4),
	"success_rate" numeric(5, 4),
	"total_cost" numeric(10, 2) DEFAULT '0',
	"avg_cost_per_operation" numeric(8, 4),
	"is_processed" boolean DEFAULT false,
	"processed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_patterns" (
	"pattern_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" varchar(20),
	"entity_id" uuid,
	"pattern_type" varchar(50) NOT NULL,
	"analysis_period" varchar(20) DEFAULT 'month',
	"period_start" timestamp,
	"period_end" timestamp,
	"pattern_data" jsonb DEFAULT '{}'::jsonb,
	"insights" jsonb DEFAULT '{}'::jsonb,
	"recommendations" jsonb DEFAULT '[]'::jsonb,
	"confidence" numeric(5, 4),
	"last_calculated" timestamp,
	"next_calculation" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_quotas" (
	"quota_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" varchar(20),
	"entity_id" uuid,
	"operation_code" varchar(255),
	"quota_type" varchar(20) DEFAULT 'soft',
	"period_type" varchar(20) DEFAULT 'month',
	"max_operations" integer,
	"max_credits" numeric(15, 4),
	"max_data_size" bigint,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"current_operations" integer DEFAULT 0,
	"current_credits" numeric(15, 4) DEFAULT '0',
	"current_data_size" bigint DEFAULT 0,
	"warning_threshold" numeric(5, 2) DEFAULT '0.8',
	"critical_threshold" numeric(5, 2) DEFAULT '0.95',
	"is_active" boolean DEFAULT true,
	"is_exceeded" boolean DEFAULT false,
	"notify_on_warning" boolean DEFAULT true,
	"notify_on_exceeded" boolean DEFAULT true,
	"notify_users" jsonb DEFAULT '[]'::jsonb,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_credit_configurations" (
	"app_config_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"app_code" varchar(20) NOT NULL,
	"entity_type" varchar(20),
	"entity_id" uuid,
	"billing_model" varchar(20) DEFAULT 'bulk_then_per_usage',
	"default_credit_cost" numeric(10, 4) NOT NULL,
	"default_unit" varchar(20) DEFAULT 'operation',
	"max_daily_operations" integer,
	"max_monthly_operations" integer,
	"credit_budget" numeric(15, 4),
	"premium_features" jsonb DEFAULT '{}'::jsonb,
	"module_defaults" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"is_customized" boolean DEFAULT false,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "configuration_change_history" (
	"change_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"config_type" varchar(30) NOT NULL,
	"config_id" uuid,
	"operation_code" varchar(255),
	"entity_type" varchar(20),
	"entity_id" uuid,
	"change_type" varchar(50) NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"change_reason" text,
	"affected_entities" jsonb DEFAULT '[]'::jsonb,
	"estimated_impact" jsonb DEFAULT '{}'::jsonb,
	"can_rollback" boolean DEFAULT true,
	"rollback_data" jsonb,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_configuration_templates" (
	"template_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_name" varchar(100) NOT NULL,
	"template_code" varchar(50) NOT NULL,
	"description" text,
	"category" varchar(50) DEFAULT 'standard',
	"is_default" boolean DEFAULT false,
	"app_configurations" jsonb DEFAULT '{}'::jsonb,
	"module_configurations" jsonb DEFAULT '{}'::jsonb,
	"operation_configurations" jsonb DEFAULT '{}'::jsonb,
	"version" varchar(20) DEFAULT '1.0',
	"is_active" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"last_used" timestamp,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "credit_configuration_templates_template_code_unique" UNIQUE("template_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_configurations" (
	"config_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"operation_code" varchar(255) NOT NULL,
	"entity_type" varchar(20),
	"entity_id" uuid,
	"credit_cost" numeric(10, 4) NOT NULL,
	"unit" varchar(20) DEFAULT 'operation',
	"unit_multiplier" numeric(10, 4) DEFAULT '1',
	"free_allowance" integer DEFAULT 0,
	"free_allowance_period" varchar(20) DEFAULT 'month',
	"volume_tiers" jsonb DEFAULT '[]'::jsonb,
	"allow_overage" boolean DEFAULT true,
	"overage_limit" integer,
	"overage_period" varchar(20) DEFAULT 'day',
	"overage_cost" numeric(10, 4),
	"scope" varchar(20) DEFAULT 'organization',
	"is_inherited" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"is_customized" boolean DEFAULT false,
	"priority" integer DEFAULT 0,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_credit_configurations" (
	"module_config_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module_code" varchar(100) NOT NULL,
	"entity_type" varchar(20),
	"entity_id" uuid,
	"default_credit_cost" numeric(10, 4) NOT NULL,
	"default_unit" varchar(20) DEFAULT 'operation',
	"max_operations_per_period" integer,
	"period_type" varchar(20) DEFAULT 'month',
	"credit_budget" numeric(15, 4),
	"operation_overrides" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"is_customized" boolean DEFAULT false,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "responsibility_coverage" (
	"coverage_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"coverage_name" varchar(100) NOT NULL,
	"coverage_type" varchar(30) DEFAULT 'emergency',
	"description" text,
	"entity_type" varchar(20),
	"entity_id" uuid,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"backup_assignments" jsonb DEFAULT '[]'::jsonb,
	"escalation_rules" jsonb DEFAULT '{}'::jsonb,
	"last_checked" timestamp,
	"issues_found" integer DEFAULT 0,
	"last_issue_at" timestamp,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "responsibility_delegations" (
	"delegation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"delegator_user_id" uuid NOT NULL,
	"delegate_user_id" uuid NOT NULL,
	"delegated_scope" jsonb DEFAULT '{}'::jsonb,
	"delegation_reason" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"requires_approval" boolean DEFAULT false,
	"approved_by" uuid,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "responsibility_history" (
	"history_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"change_type" varchar(50) NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"change_reason" text,
	"changed_by" uuid NOT NULL,
	"change_source" varchar(50) DEFAULT 'manual',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "responsibility_notifications" (
	"notification_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"priority" varchar(20) DEFAULT 'normal',
	"action_required" varchar(100),
	"action_url" varchar(500),
	"action_deadline" timestamp,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"next_retry_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "responsibility_templates" (
	"template_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_name" varchar(100) NOT NULL,
	"template_code" varchar(50) NOT NULL,
	"description" text,
	"entity_type" varchar(20) NOT NULL,
	"responsibility_level" varchar(20) DEFAULT 'primary',
	"default_scope" jsonb DEFAULT '{}'::jsonb,
	"default_permissions" jsonb DEFAULT '{}'::jsonb,
	"default_notifications" jsonb DEFAULT '{}'::jsonb,
	"usage_count" integer DEFAULT 0,
	"last_used" timestamp,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "responsibility_templates_template_code_unique" UNIQUE("template_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "responsible_persons" (
	"assignment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid,
	"user_id" uuid NOT NULL,
	"responsibility_level" varchar(20) DEFAULT 'primary',
	"scope" jsonb DEFAULT '{"creditManagement":true,"userManagement":true,"auditAccess":true,"configurationManagement":true,"reportingAccess":true}'::jsonb,
	"auto_permissions" jsonb DEFAULT '{"canApproveTransfers":true,"canPurchaseCredits":true,"canManageUsers":true,"canViewAllAuditLogs":true,"canConfigureEntity":true,"canGenerateReports":true}'::jsonb,
	"notification_preferences" jsonb DEFAULT '{"creditAlerts":true,"userActivities":true,"systemAlerts":true,"weeklyReports":true,"monthlyReports":true}'::jsonb,
	"assigned_by" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"assignment_reason" text,
	"is_temporary" boolean DEFAULT false,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"auto_expire" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"is_confirmed" boolean DEFAULT false,
	"confirmed_at" timestamp,
	"can_delegate" boolean DEFAULT false,
	"delegation_limits" jsonb DEFAULT '{}'::jsonb,
	"is_emergency_contact" boolean DEFAULT false,
	"emergency_contact_order" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tenants" RENAME COLUMN "company_id" TO "gstin";--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "gstin" SET DATA TYPE varchar(15);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "parent_organization_id" uuid;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "organization_type" varchar(20) DEFAULT 'standalone';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "default_location_id" uuid;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "responsible_person_id" uuid;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "credit_balance" numeric(15, 4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "credit_expiry_policy" jsonb DEFAULT '{"expiryEnabled":true,"defaultExpiryDays":365,"autoRenewal":false,"notificationDays":[30,7,1]}'::jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "entity_type" varchar(20) DEFAULT 'organization';--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "access_level" varchar(20) DEFAULT 'direct';--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "primary_organization_id" uuid;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "is_responsible_person" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "admin_privileges" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "entity_type" varchar(20) DEFAULT 'organization';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "entity_id" uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "parent_entity_id" uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "billing_model" varchar(20) DEFAULT 'bulk_then_per_usage';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "credit_allocation" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "overage_limits" jsonb DEFAULT '{"period":"day","maxOps":10000,"allowOverage":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "discount_tiers_key" varchar(100);--> statement-breakpoint
ALTER TABLE "custom_roles" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "custom_roles" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "custom_roles" ADD COLUMN "scope" varchar(20) DEFAULT 'organization';--> statement-breakpoint
ALTER TABLE "custom_roles" ADD COLUMN "is_inheritable" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "custom_roles" ADD COLUMN "parent_role_id" uuid;--> statement-breakpoint
ALTER TABLE "custom_roles" ADD COLUMN "created_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD COLUMN "scope" varchar(20) DEFAULT 'organization';--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD COLUMN "is_responsible_person" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD COLUMN "inherited_from" uuid;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "operation_code" varchar(255);--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "credit_consumed" numeric(10, 4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "credit_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "pricing_mode" varchar(20) DEFAULT 'credits';--> statement-breakpoint
ALTER TABLE "usage_metrics_daily" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "usage_metrics_daily" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "usage_metrics_daily" ADD COLUMN "credit_consumed" numeric(15, 4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "usage_metrics_daily" ADD COLUMN "credit_batches_used" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_credit_config" ON "credit_configurations" ("operation_code","entity_type","entity_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenants" ADD CONSTRAINT "tenants_parent_organization_id_tenants_tenant_id_fk" FOREIGN KEY ("parent_organization_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenants" ADD CONSTRAINT "tenants_responsible_person_id_tenant_users_user_id_fk" FOREIGN KEY ("responsible_person_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_tenants_tenant_id_fk" FOREIGN KEY ("organization_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_primary_organization_id_tenants_tenant_id_fk" FOREIGN KEY ("primary_organization_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_roles" ADD CONSTRAINT "custom_roles_organization_id_tenants_tenant_id_fk" FOREIGN KEY ("organization_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_roles" ADD CONSTRAINT "custom_roles_parent_role_id_custom_roles_role_id_fk" FOREIGN KEY ("parent_role_id") REFERENCES "custom_roles"("role_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_roles" ADD CONSTRAINT "custom_roles_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_organization_id_tenants_tenant_id_fk" FOREIGN KEY ("organization_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_inherited_from_user_role_assignments_id_fk" FOREIGN KEY ("inherited_from") REFERENCES "user_role_assignments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_organization_id_tenants_tenant_id_fk" FOREIGN KEY ("organization_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_metrics_daily" ADD CONSTRAINT "usage_metrics_daily_organization_id_tenants_tenant_id_fk" FOREIGN KEY ("organization_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_locations" ADD CONSTRAINT "organization_locations_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("organization_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_locations" ADD CONSTRAINT "organization_locations_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_locations" ADD CONSTRAINT "organization_locations_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_relationships" ADD CONSTRAINT "organization_relationships_parent_organization_id_organizations_organization_id_fk" FOREIGN KEY ("parent_organization_id") REFERENCES "organizations"("organization_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_relationships" ADD CONSTRAINT "organization_relationships_child_organization_id_organizations_organization_id_fk" FOREIGN KEY ("child_organization_id") REFERENCES "organizations"("organization_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_relationships" ADD CONSTRAINT "organization_relationships_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organizations" ADD CONSTRAINT "organizations_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parent_organization_id_organizations_organization_id_fk" FOREIGN KEY ("parent_organization_id") REFERENCES "organizations"("organization_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organizations" ADD CONSTRAINT "organizations_responsible_person_id_tenant_users_user_id_fk" FOREIGN KEY ("responsible_person_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organizations" ADD CONSTRAINT "organizations_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "location_assignments" ADD CONSTRAINT "location_assignments_location_id_locations_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("location_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "location_assignments" ADD CONSTRAINT "location_assignments_assigned_by_tenant_users_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "location_resources" ADD CONSTRAINT "location_resources_location_id_locations_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("location_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "location_resources" ADD CONSTRAINT "location_resources_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "location_resources" ADD CONSTRAINT "location_resources_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "location_usage" ADD CONSTRAINT "location_usage_location_id_locations_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("location_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "location_usage" ADD CONSTRAINT "location_usage_user_id_tenant_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "location_usage" ADD CONSTRAINT "location_usage_resource_id_location_resources_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "location_resources"("resource_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "locations" ADD CONSTRAINT "locations_responsible_person_id_tenant_users_user_id_fk" FOREIGN KEY ("responsible_person_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "locations" ADD CONSTRAINT "locations_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "locations" ADD CONSTRAINT "locations_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membership_bulk_operations" ADD CONSTRAINT "membership_bulk_operations_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membership_bulk_operations" ADD CONSTRAINT "membership_bulk_operations_initiated_by_tenant_users_user_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membership_history" ADD CONSTRAINT "membership_history_membership_id_organization_memberships_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "organization_memberships"("membership_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membership_history" ADD CONSTRAINT "membership_history_changed_by_tenant_users_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membership_invitations" ADD CONSTRAINT "membership_invitations_membership_id_organization_memberships_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "organization_memberships"("membership_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membership_invitations" ADD CONSTRAINT "membership_invitations_invited_user_id_tenant_users_user_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membership_invitations" ADD CONSTRAINT "membership_invitations_role_id_custom_roles_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "custom_roles"("role_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membership_invitations" ADD CONSTRAINT "membership_invitations_invited_by_tenant_users_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_tenant_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "tenant_users"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_role_id_custom_roles_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "custom_roles"("role_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_invited_by_tenant_users_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_alerts" ADD CONSTRAINT "credit_alerts_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_initiated_by_tenant_users_user_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credits" ADD CONSTRAINT "credits_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credits" ADD CONSTRAINT "credits_last_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_requested_by_tenant_users_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_processed_by_tenant_users_user_id_fk" FOREIGN KEY ("processed_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discount_tiers" ADD CONSTRAINT "discount_tiers_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discount_tiers" ADD CONSTRAINT "discount_tiers_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discount_tiers" ADD CONSTRAINT "discount_tiers_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_purchase_id_credit_purchases_purchase_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "credit_purchases"("purchase_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_changed_by_tenant_users_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_templates" ADD CONSTRAINT "purchase_templates_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_templates" ADD CONSTRAINT "purchase_templates_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_templates" ADD CONSTRAINT "purchase_templates_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_transfers" ADD CONSTRAINT "credit_transfers_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_transfers" ADD CONSTRAINT "credit_transfers_approved_by_tenant_users_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_transfers" ADD CONSTRAINT "credit_transfers_rejected_by_tenant_users_user_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_transfers" ADD CONSTRAINT "credit_transfers_requested_by_tenant_users_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_approval_rules" ADD CONSTRAINT "transfer_approval_rules_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_approval_rules" ADD CONSTRAINT "transfer_approval_rules_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_approval_rules" ADD CONSTRAINT "transfer_approval_rules_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_history" ADD CONSTRAINT "transfer_history_transfer_id_credit_transfers_transfer_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "credit_transfers"("transfer_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_history" ADD CONSTRAINT "transfer_history_status_changed_by_tenant_users_user_id_fk" FOREIGN KEY ("status_changed_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_limits" ADD CONSTRAINT "transfer_limits_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_limits" ADD CONSTRAINT "transfer_limits_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_limits" ADD CONSTRAINT "transfer_limits_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_notifications" ADD CONSTRAINT "transfer_notifications_transfer_id_credit_transfers_transfer_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "credit_transfers"("transfer_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_notifications" ADD CONSTRAINT "transfer_notifications_recipient_user_id_tenant_users_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_usage" ADD CONSTRAINT "credit_usage_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_usage" ADD CONSTRAINT "credit_usage_user_id_tenant_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_usage" ADD CONSTRAINT "credit_usage_refunded_by_tenant_users_user_id_fk" FOREIGN KEY ("refunded_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_aggregation" ADD CONSTRAINT "usage_aggregation_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_patterns" ADD CONSTRAINT "usage_patterns_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_quotas" ADD CONSTRAINT "usage_quotas_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_quotas" ADD CONSTRAINT "usage_quotas_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_quotas" ADD CONSTRAINT "usage_quotas_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app_credit_configurations" ADD CONSTRAINT "app_credit_configurations_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app_credit_configurations" ADD CONSTRAINT "app_credit_configurations_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app_credit_configurations" ADD CONSTRAINT "app_credit_configurations_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "configuration_change_history" ADD CONSTRAINT "configuration_change_history_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "configuration_change_history" ADD CONSTRAINT "configuration_change_history_changed_by_tenant_users_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_configuration_templates" ADD CONSTRAINT "credit_configuration_templates_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_configuration_templates" ADD CONSTRAINT "credit_configuration_templates_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_configurations" ADD CONSTRAINT "credit_configurations_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_configurations" ADD CONSTRAINT "credit_configurations_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_configurations" ADD CONSTRAINT "credit_configurations_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "module_credit_configurations" ADD CONSTRAINT "module_credit_configurations_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "module_credit_configurations" ADD CONSTRAINT "module_credit_configurations_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "module_credit_configurations" ADD CONSTRAINT "module_credit_configurations_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsibility_coverage" ADD CONSTRAINT "responsibility_coverage_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsibility_coverage" ADD CONSTRAINT "responsibility_coverage_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsibility_coverage" ADD CONSTRAINT "responsibility_coverage_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsibility_delegations" ADD CONSTRAINT "responsibility_delegations_assignment_id_responsible_persons_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "responsible_persons"("assignment_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsibility_delegations" ADD CONSTRAINT "responsibility_delegations_delegator_user_id_tenant_users_user_id_fk" FOREIGN KEY ("delegator_user_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsibility_delegations" ADD CONSTRAINT "responsibility_delegations_delegate_user_id_tenant_users_user_id_fk" FOREIGN KEY ("delegate_user_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsibility_delegations" ADD CONSTRAINT "responsibility_delegations_approved_by_tenant_users_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsibility_history" ADD CONSTRAINT "responsibility_history_assignment_id_responsible_persons_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "responsible_persons"("assignment_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsibility_history" ADD CONSTRAINT "responsibility_history_changed_by_tenant_users_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsibility_notifications" ADD CONSTRAINT "responsibility_notifications_assignment_id_responsible_persons_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "responsible_persons"("assignment_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsibility_templates" ADD CONSTRAINT "responsibility_templates_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsibility_templates" ADD CONSTRAINT "responsibility_templates_created_by_tenant_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsibility_templates" ADD CONSTRAINT "responsibility_templates_updated_by_tenant_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsible_persons" ADD CONSTRAINT "responsible_persons_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsible_persons" ADD CONSTRAINT "responsible_persons_user_id_tenant_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "responsible_persons" ADD CONSTRAINT "responsible_persons_assigned_by_tenant_users_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "tenant_users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
