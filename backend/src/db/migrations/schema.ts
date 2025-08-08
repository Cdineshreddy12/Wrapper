import { pgTable, foreignKey, pgEnum, uuid, varchar, jsonb, text, timestamp, integer, numeric, boolean, unique, index } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const factorType = pgEnum("factor_type", ['totp', 'webauthn', 'phone'])
export const factorStatus = pgEnum("factor_status", ['unverified', 'verified'])
export const aalLevel = pgEnum("aal_level", ['aal1', 'aal2', 'aal3'])
export const codeChallengeMethod = pgEnum("code_challenge_method", ['s256', 'plain'])
export const oneTimeTokenType = pgEnum("one_time_token_type", ['confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token'])
export const equalityOp = pgEnum("equality_op", ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in'])
export const action = pgEnum("action", ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ERROR'])
export const enumUserOrganizationsStatus = pgEnum("enum_user_organizations_status", ['invited', 'active', 'inactive'])


export const permissionAuditLog = pgTable("permission_audit_log", {
	logId: uuid("log_id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId),
	userId: uuid("user_id").references(() => tenantUsers.userId),
	action: varchar("action", { length: 50 }).notNull(),
	resourceType: varchar("resource_type", { length: 50 }).notNull(),
	resourceId: varchar("resource_id", { length: 100 }),
	oldValues: jsonb("old_values"),
	newValues: jsonb("new_values"),
	details: jsonb("details"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const usageLogs = pgTable("usage_logs", {
	logId: uuid("log_id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId),
	userId: uuid("user_id").references(() => tenantUsers.userId),
	app: varchar("app", { length: 50 }).notNull(),
	endpoint: varchar("endpoint", { length: 255 }).notNull(),
	method: varchar("method", { length: 10 }).notNull(),
	statusCode: integer("status_code"),
	responseTime: numeric("response_time", { precision: 8, scale:  2 }),
	source: varchar("source", { length: 50 }).notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	requestSize: integer("request_size"),
	responseSize: integer("response_size"),
	metadata: jsonb("metadata").default({}),
	errorMessage: text("error_message"),
	errorStack: text("error_stack"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const roleTemplates = pgTable("role_templates", {
	templateId: uuid("template_id").defaultRandom().primaryKey().notNull(),
	templateName: varchar("template_name", { length: 100 }).notNull(),
	displayName: varchar("display_name", { length: 100 }).notNull(),
	description: text("description"),
	category: varchar("category", { length: 50 }),
	permissions: jsonb("permissions").notNull(),
	restrictions: jsonb("restrictions").default({}),
	targetTools: jsonb("target_tools").notNull(),
	isActive: boolean("is_active").default(true),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const userRoleAssignments = pgTable("user_role_assignments", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull().references(() => tenantUsers.userId),
	roleId: uuid("role_id").notNull().references(() => customRoles.roleId),
	assignedBy: uuid("assigned_by").notNull().references(() => tenantUsers.userId),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
	isTemporary: boolean("is_temporary").default(false),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	deactivatedAt: timestamp("deactivated_at", { mode: 'string' }),
	deactivatedBy: uuid("deactivated_by").references(() => tenantUsers.userId),
});

export const rateLimitLogs = pgTable("rate_limit_logs", {
	logId: uuid("log_id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId),
	userId: uuid("user_id").references(() => tenantUsers.userId),
	endpoint: varchar("endpoint", { length: 255 }).notNull(),
	limitType: varchar("limit_type", { length: 50 }).notNull(),
	limitValue: integer("limit_value").notNull(),
	currentCount: integer("current_count").notNull(),
	windowStart: timestamp("window_start", { mode: 'string' }).notNull(),
	windowEnd: timestamp("window_end", { mode: 'string' }).notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	wasBlocked: boolean("was_blocked").default(false),
	blockedReason: varchar("blocked_reason", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const usageAlerts = pgTable("usage_alerts", {
	alertId: uuid("alert_id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId),
	alertType: varchar("alert_type", { length: 50 }).notNull(),
	severity: varchar("severity", { length: 20 }).notNull(),
	title: varchar("title", { length: 255 }).notNull(),
	message: text("message").notNull(),
	metricType: varchar("metric_type", { length: 50 }).notNull(),
	currentValue: numeric("current_value", { precision: 15, scale:  2 }),
	limitValue: numeric("limit_value", { precision: 15, scale:  2 }),
	percentage: numeric("percentage", { precision: 5, scale:  2 }),
	isRead: boolean("is_read").default(false),
	isSent: boolean("is_sent").default(false),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	readAt: timestamp("read_at", { mode: 'string' }),
	actionRequired: varchar("action_required", { length: 100 }),
	actionTaken: varchar("action_taken", { length: 100 }),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const usageMetricsDaily = pgTable("usage_metrics_daily", {
	metricId: uuid("metric_id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId),
	app: varchar("app", { length: 50 }).notNull(),
	date: timestamp("date", { mode: 'string' }).notNull(),
	apiCalls: integer("api_calls").default(0),
	storageUsed: numeric("storage_used", { precision: 15, scale:  2 }).default('0'),
	activeUsers: integer("active_users").default(0),
	totalRequests: integer("total_requests").default(0),
	avgResponseTime: numeric("avg_response_time", { precision: 8, scale:  2 }).default('0'),
	errorCount: integer("error_count").default(0),
	featureUsage: jsonb("feature_usage").default({}),
	usageBySource: jsonb("usage_by_source").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const tenantInvitations = pgTable("tenant_invitations", {
	invitationId: uuid("invitation_id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId),
	email: varchar("email", { length: 255 }).notNull(),
	roleId: uuid("role_id"),
	invitedBy: uuid("invited_by").notNull(),
	invitationToken: varchar("invitation_token", { length: 255 }).notNull(),
	status: varchar("status", { length: 20 }).default('pending'::character varying),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	acceptedAt: timestamp("accepted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const pendingTenants = pgTable("pending_tenants", {
	tenantId: uuid("tenant_id").primaryKey().notNull(),
	companyName: varchar("company_name", { length: 255 }).notNull(),
	subdomain: varchar("subdomain", { length: 100 }).notNull(),
	adminEmail: varchar("admin_email", { length: 255 }),
	signupToken: varchar("signup_token", { length: 255 }).notNull(),
	signupData: jsonb("signup_data"),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const tenants = pgTable("tenants", {
	tenantId: uuid("tenant_id").defaultRandom().primaryKey().notNull(),
	companyName: varchar("company_name", { length: 255 }).notNull(),
	subdomain: varchar("subdomain", { length: 100 }).notNull(),
	kindeOrgId: varchar("kinde_org_id", { length: 255 }).notNull(),
	adminEmail: varchar("admin_email", { length: 255 }).notNull(),
	logoUrl: varchar("logo_url", { length: 500 }),
	primaryColor: varchar("primary_color", { length: 7 }).default('#2563eb'::character varying),
	customDomain: varchar("custom_domain", { length: 255 }),
	brandingConfig: jsonb("branding_config").default({}),
	companySize: varchar("company_size", { length: 50 }),
	industry: varchar("industry", { length: 100 }),
	timezone: varchar("timezone", { length: 50 }).default('UTC'::character varying),
	country: varchar("country", { length: 100 }),
	isActive: boolean("is_active").default(true),
	isVerified: boolean("is_verified").default(false),
	trialEndsAt: timestamp("trial_ends_at", { mode: 'string' }),
	settings: jsonb("settings").default({}),
	onboardedAt: timestamp("onboarded_at", { mode: 'string' }),
	lastActivityAt: timestamp("last_activity_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		tenantsSubdomainUnique: unique("tenants_subdomain_unique").on(table.subdomain),
		tenantsKindeOrgIdUnique: unique("tenants_kinde_org_id_unique").on(table.kindeOrgId),
	}
});

export const auditLogs = pgTable("audit_logs", {
	logId: uuid("log_id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId),
	userId: uuid("user_id").references(() => tenantUsers.userId),
	action: varchar("action", { length: 100 }).notNull(),
	resourceType: varchar("resource_type", { length: 50 }).notNull(),
	resourceId: varchar("resource_id", { length: 255 }),
	oldValues: jsonb("old_values"),
	newValues: jsonb("new_values"),
	details: jsonb("details"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
	sessionId: uuid("session_id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull().references(() => tenantUsers.userId),
	tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId),
	sessionToken: varchar("session_token", { length: 255 }).notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	loginAt: timestamp("login_at", { mode: 'string' }).defaultNow(),
	lastActivityAt: timestamp("last_activity_at", { mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true),
});

export const payments = pgTable("payments", {
	paymentId: uuid("payment_id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId),
	subscriptionId: uuid("subscription_id").references(() => subscriptions.subscriptionId),
	stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
	stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
	amount: numeric("amount", { precision: 10, scale:  2 }).notNull(),
	currency: varchar("currency", { length: 3 }).default('USD'::character varying),
	status: varchar("status", { length: 20 }).notNull(),
	paymentMethod: varchar("payment_method", { length: 50 }),
	invoiceNumber: varchar("invoice_number", { length: 50 }),
	description: text("description"),
	metadata: jsonb("metadata").default({}),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	failedAt: timestamp("failed_at", { mode: 'string' }),
	refundedAt: timestamp("refunded_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	stripeChargeId: varchar("stripe_charge_id", { length: 255 }),
	stripeRefundId: varchar("stripe_refund_id", { length: 255 }),
	stripeDisputeId: varchar("stripe_dispute_id", { length: 255 }),
	amountRefunded: numeric("amount_refunded", { precision: 10, scale:  2 }).default('0'),
	amountDisputed: numeric("amount_disputed", { precision: 10, scale:  2 }).default('0'),
	paymentMethodDetails: jsonb("payment_method_details").default({}),
	paymentType: varchar("payment_type", { length: 30 }).default('subscription'::character varying),
	billingReason: varchar("billing_reason", { length: 50 }),
	prorationAmount: numeric("proration_amount", { precision: 10, scale:  2 }).default('0'),
	creditAmount: numeric("credit_amount", { precision: 10, scale:  2 }).default('0'),
	refundReason: varchar("refund_reason", { length: 100 }),
	refundRequestedBy: uuid("refund_requested_by").references(() => tenants.tenantId),
	isPartialRefund: boolean("is_partial_refund").default(false),
	disputeReason: varchar("dispute_reason", { length: 100 }),
	disputeStatus: varchar("dispute_status", { length: 30 }),
	disputeEvidenceSubmitted: boolean("dispute_evidence_submitted").default(false),
	taxAmount: numeric("tax_amount", { precision: 10, scale:  2 }).default('0'),
	taxRate: numeric("tax_rate", { precision: 5, scale:  4 }).default('0'),
	taxRegion: varchar("tax_region", { length: 50 }),
	processingFees: numeric("processing_fees", { precision: 10, scale:  2 }).default('0'),
	netAmount: numeric("net_amount", { precision: 10, scale:  2 }),
	riskLevel: varchar("risk_level", { length: 20 }),
	riskScore: integer("risk_score"),
	fraudDetails: jsonb("fraud_details").default({}),
	stripeRawData: jsonb("stripe_raw_data").default({}),
	disputedAt: timestamp("disputed_at", { mode: 'string' }),
	settledAt: timestamp("settled_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idxPaymentsStatus: index("idx_payments_status").on(table.status),
		idxPaymentsCreatedAt: index("idx_payments_created_at").on(table.createdAt),
		idxPaymentsStripePaymentIntent: index("idx_payments_stripe_payment_intent").on(table.stripePaymentIntentId),
		idxPaymentsPaymentType: index("idx_payments_payment_type").on(table.paymentType),
		idxPaymentsBillingReason: index("idx_payments_billing_reason").on(table.billingReason),
		idxPaymentsTenant: index("idx_payments_tenant").on(table.tenantId),
	}
});

export const subscriptions = pgTable("subscriptions", {
	subscriptionId: uuid("subscription_id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId),
	stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
	stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
	stripePriceId: varchar("stripe_price_id", { length: 255 }),
	plan: varchar("plan", { length: 50 }).notNull(),
	status: varchar("status", { length: 20 }).notNull(),
	subscribedTools: jsonb("subscribed_tools").notNull(),
	usageLimits: jsonb("usage_limits").notNull(),
	monthlyPrice: numeric("monthly_price", { precision: 10, scale:  2 }),
	yearlyPrice: numeric("yearly_price", { precision: 10, scale:  2 }),
	billingCycle: varchar("billing_cycle", { length: 20 }).default('monthly'::character varying),
	currentPeriodStart: timestamp("current_period_start", { mode: 'string' }),
	currentPeriodEnd: timestamp("current_period_end", { mode: 'string' }),
	cancelAt: timestamp("cancel_at", { mode: 'string' }),
	canceledAt: timestamp("canceled_at", { mode: 'string' }),
	trialStart: timestamp("trial_start", { mode: 'string' }),
	trialEnd: timestamp("trial_end", { mode: 'string' }),
	addOns: jsonb("add_ons").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		subscriptionsStripeSubscriptionIdUnique: unique("subscriptions_stripe_subscription_id_unique").on(table.stripeSubscriptionId),
	}
});

export const usageBilling = pgTable("usage_billing", {
	billingId: uuid("billing_id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId),
	subscriptionId: uuid("subscription_id").references(() => subscriptions.subscriptionId),
	billingPeriodStart: timestamp("billing_period_start", { mode: 'string' }).notNull(),
	billingPeriodEnd: timestamp("billing_period_end", { mode: 'string' }).notNull(),
	apiCallsUsed: integer("api_calls_used").default(0),
	storageUsed: numeric("storage_used", { precision: 15, scale:  2 }).default('0'),
	activeUsers: integer("active_users").default(0),
	overageCharges: numeric("overage_charges", { precision: 10, scale:  2 }).default('0'),
	overageDetails: jsonb("overage_details").default({}),
	isBilled: boolean("is_billed").default(false),
	billedAt: timestamp("billed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const subscriptionActions = pgTable("subscription_actions", {
	actionId: uuid("action_id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId),
	subscriptionId: uuid("subscription_id").notNull().references(() => subscriptions.subscriptionId),
	actionType: varchar("action_type", { length: 30 }).notNull(),
	fromPlan: varchar("from_plan", { length: 50 }),
	toPlan: varchar("to_plan", { length: 50 }),
	fromBillingCycle: varchar("from_billing_cycle", { length: 20 }),
	toBillingCycle: varchar("to_billing_cycle", { length: 20 }),
	prorationAmount: numeric("proration_amount", { precision: 10, scale:  2 }).default('0'),
	refundAmount: numeric("refund_amount", { precision: 10, scale:  2 }).default('0'),
	chargeAmount: numeric("charge_amount", { precision: 10, scale:  2 }).default('0'),
	effectiveDate: timestamp("effective_date", { mode: 'string' }).notNull(),
	initiatedBy: uuid("initiated_by").references(() => tenants.tenantId),
	reason: varchar("reason", { length: 100 }),
	adminNotes: text("admin_notes"),
	customerNotes: text("customer_notes"),
	status: varchar("status", { length: 20 }).default('pending'::character varying),
	stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
	stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
	impactAssessment: jsonb("impact_assessment").default({}),
	rollbackData: jsonb("rollback_data").default({}),
	requestedAt: timestamp("requested_at", { mode: 'string' }).defaultNow(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	reversedAt: timestamp("reversed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const customRoles = pgTable("custom_roles", {
	roleId: uuid("role_id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId),
	roleName: varchar("role_name", { length: 100 }).notNull(),
	description: text("description"),
	color: varchar("color", { length: 7 }).default('#6b7280'::character varying),
	permissions: jsonb("permissions").notNull(),
	restrictions: jsonb("restrictions").default({}),
	isSystemRole: boolean("is_system_role").default(false),
	isDefault: boolean("is_default").default(false),
	priority: integer("priority").default(0),
	createdBy: uuid("created_by").notNull().references(() => tenantUsers.userId),
	lastModifiedBy: uuid("last_modified_by").references(() => tenantUsers.userId),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	kindeRoleId: varchar("kinde_role_id", { length: 255 }),
	kindeRoleKey: varchar("kinde_role_key", { length: 255 }),
},
(table) => {
	return {
		idxCustomRolesKindeRoleId: index("idx_custom_roles_kinde_role_id").on(table.kindeRoleId),
		idxCustomRolesKindeRoleKey: index("idx_custom_roles_kinde_role_key").on(table.kindeRoleKey),
	}
});

export const tenantUsers = pgTable("tenant_users", {
	userId: uuid("user_id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId),
	kindeUserId: varchar("kinde_user_id", { length: 255 }),
	email: varchar("email", { length: 255 }).notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	avatar: varchar("avatar", { length: 500 }),
	title: varchar("title", { length: 100 }),
	department: varchar("department", { length: 100 }),
	isActive: boolean("is_active").default(true),
	isVerified: boolean("is_verified").default(false),
	isTenantAdmin: boolean("is_tenant_admin").default(false),
	lastActiveAt: timestamp("last_active_at", { mode: 'string' }),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	loginCount: integer("login_count").default(0),
	preferences: jsonb("preferences").default({}),
	onboardingCompleted: boolean("onboarding_completed").default(false),
	onboardingStep: varchar("onboarding_step", { length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	invitedBy: uuid("invited_by"),
	invitedAt: timestamp("invited_at", { mode: 'string' }),
	invitationToken: varchar("invitation_token", { length: 255 }),
	invitationExpiresAt: timestamp("invitation_expires_at", { mode: 'string' }),
	invitationAcceptedAt: timestamp("invitation_accepted_at", { mode: 'string' }),
},
(table) => {
	return {
		idxTenantUsersInvitedBy: index("idx_tenant_users_invited_by").on(table.invitedBy),
		idxTenantUsersInvitationToken: index("idx_tenant_users_invitation_token").on(table.invitationToken),
		tenantUsersInvitedByFkey: foreignKey({
			columns: [table.invitedBy],
			foreignColumns: [table.userId],
			name: "tenant_users_invited_by_fkey"
		}),
	}
});

export const organizationApplications = pgTable("organization_applications", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").references(() => tenants.tenantId),
	appId: uuid("app_id").references(() => applications.appId),
	isEnabled: boolean("is_enabled").default(true),
	enabledModules: jsonb("enabled_modules"),
	customPermissions: jsonb("custom_permissions"),
	licenseCount: integer("license_count").default(0),
	maxUsers: integer("max_users"),
	subscriptionTier: varchar("subscription_tier", { length: 50 }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idxOrganizationApplicationsTenantId: index("idx_organization_applications_tenant_id").on(table.tenantId),
		idxOrganizationApplicationsAppId: index("idx_organization_applications_app_id").on(table.appId),
		organizationApplicationsTenantIdAppIdKey: unique("organization_applications_tenant_id_app_id_key").on(table.tenantId, table.appId),
	}
});

export const applications = pgTable("applications", {
	appId: uuid("app_id").defaultRandom().primaryKey().notNull(),
	appCode: varchar("app_code", { length: 50 }).notNull(),
	appName: varchar("app_name", { length: 100 }).notNull(),
	description: text("description"),
	icon: varchar("icon", { length: 255 }),
	baseUrl: varchar("base_url", { length: 255 }).notNull(),
	status: varchar("status", { length: 20 }).default('active'::character varying).notNull(),
	version: varchar("version", { length: 20 }),
	isCore: boolean("is_core").default(false),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idxApplicationsAppCode: index("idx_applications_app_code").on(table.appCode),
		idxApplicationsStatus: index("idx_applications_status").on(table.status),
		applicationsAppCodeKey: unique("applications_app_code_key").on(table.appCode),
	}
});

export const applicationModules = pgTable("application_modules", {
	moduleId: uuid("module_id").defaultRandom().primaryKey().notNull(),
	appId: uuid("app_id").references(() => applications.appId),
	moduleCode: varchar("module_code", { length: 50 }).notNull(),
	moduleName: varchar("module_name", { length: 100 }).notNull(),
	description: text("description"),
	isCore: boolean("is_core").default(false),
	permissions: jsonb("permissions"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idxApplicationModulesAppId: index("idx_application_modules_app_id").on(table.appId),
	}
});

export const userApplicationPermissions = pgTable("user_application_permissions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").references(() => tenantUsers.userId),
	appId: uuid("app_id").references(() => applications.appId),
	moduleId: uuid("module_id").references(() => applicationModules.moduleId),
	permissions: jsonb("permissions"),
	isActive: boolean("is_active").default(true),
	grantedBy: uuid("granted_by").references(() => tenantUsers.userId),
	grantedAt: timestamp("granted_at", { mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
},
(table) => {
	return {
		idxUserApplicationPermissionsUserId: index("idx_user_application_permissions_user_id").on(table.userId),
		idxUserApplicationPermissionsAppId: index("idx_user_application_permissions_app_id").on(table.appId),
	}
});

export const subscriptionPlans = pgTable("subscription_plans", {
	planId: uuid("plan_id").defaultRandom().primaryKey().notNull(),
	planCode: varchar("plan_code", { length: 50 }).notNull(),
	planName: varchar("plan_name", { length: 100 }).notNull(),
	planType: varchar("plan_type", { length: 20 }).notNull(),
	description: text("description"),
	price: numeric("price", { precision: 10, scale:  2 }),
	billingCycle: varchar("billing_cycle", { length: 20 }),
	includedApps: jsonb("included_apps"),
	features: jsonb("features"),
	maxUsers: integer("max_users"),
	maxOrganizations: integer("max_organizations"),
	isActive: boolean("is_active").default(true),
	isCustom: boolean("is_custom").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idxSubscriptionPlansPlanCode: index("idx_subscription_plans_plan_code").on(table.planCode),
		subscriptionPlansPlanCodeKey: unique("subscription_plans_plan_code_key").on(table.planCode),
	}
});

export const organizationSubscriptions = pgTable("organization_subscriptions", {
	subscriptionId: uuid("subscription_id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").references(() => tenants.tenantId),
	planId: uuid("plan_id").references(() => subscriptionPlans.planId),
	status: varchar("status", { length: 20 }).notNull(),
	currentPeriodStart: timestamp("current_period_start", { mode: 'string' }),
	currentPeriodEnd: timestamp("current_period_end", { mode: 'string' }),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	trialEndsAt: timestamp("trial_ends_at", { mode: 'string' }),
	customPricing: jsonb("custom_pricing"),
	paymentMethodId: varchar("payment_method_id", { length: 255 }),
	lastPaymentAt: timestamp("last_payment_at", { mode: 'string' }),
	nextPaymentAt: timestamp("next_payment_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idxOrganizationSubscriptionsTenantId: index("idx_organization_subscriptions_tenant_id").on(table.tenantId),
	}
});

export const ssoTokens = pgTable("sso_tokens", {
	tokenId: uuid("token_id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").references(() => tenantUsers.userId),
	appId: uuid("app_id").references(() => applications.appId),
	token: text("token").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	isRevoked: boolean("is_revoked").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idxSsoTokensUserId: index("idx_sso_tokens_user_id").on(table.userId),
		idxSsoTokensAppId: index("idx_sso_tokens_app_id").on(table.appId),
		idxSsoTokensToken: index("idx_sso_tokens_token").on(table.token),
	}
});

export const activityLogs = pgTable("activity_logs", {
	logId: uuid("log_id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").references(() => tenantUsers.userId),
	tenantId: uuid("tenant_id").references(() => tenants.tenantId),
	appId: uuid("app_id").references(() => applications.appId),
	action: varchar("action", { length: 100 }).notNull(),
	resourceType: varchar("resource_type", { length: 50 }),
	resourceId: varchar("resource_id", { length: 255 }),
	metadata: jsonb("metadata"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idxActivityLogsUserId: index("idx_activity_logs_user_id").on(table.userId),
		idxActivityLogsTenantId: index("idx_activity_logs_tenant_id").on(table.tenantId),
		idxActivityLogsAppId: index("idx_activity_logs_app_id").on(table.appId),
		idxActivityLogsCreatedAt: index("idx_activity_logs_created_at").on(table.createdAt),
	}
});