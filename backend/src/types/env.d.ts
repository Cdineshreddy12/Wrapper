declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Server
      PORT?: string;
      HOST?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
      SERVICE_NAME?: string;
      LOG_LEVEL?: string;
      DISABLE_LOGGING?: string;
      SUPPRESS_CONSOLE?: string;
      BACKEND_VERBOSE_LOGS?: string;

      // Database
      DATABASE_URL?: string;
      DB_POOL_SIZE?: string;
      APP_POOL_SIZE?: string;
      SYSTEM_POOL_SIZE?: string;

      // Authentication (Kinde)
      KINDE_DOMAIN?: string;
      KINDE_CLIENT_ID?: string;
      KINDE_CLIENT_SECRET?: string;
      KINDE_M2M_CLIENT_ID?: string;
      KINDE_M2M_CLIENT_SECRET?: string;
      KINDE_REDIRECT_URI?: string;
      KINDE_LOGOUT_REDIRECT_URI?: string;
      KINDE_MANAGEMENT_AUDIENCE?: string;
      KINDE_MANAGEMENT_SCOPES?: string;

      // JWT / Sessions
      JWT_SECRET?: string;
      SESSION_SECRET?: string;
      OPERATIONS_JWT_SECRET?: string;
      SHARED_APP_JWT_SECRET?: string;
      BCRYPT_ROUNDS?: string;

      // Cookies
      COOKIE_DOMAIN?: string;
      COOKIE_SECURE?: string;
      COOKIE_SAME_SITE?: string;

      // URLs
      FRONTEND_URL?: string;
      FRONTEND_DOMAIN?: string;
      BACKEND_URL?: string;
      BASE_URL?: string;
      BASE_DOMAIN?: string;
      INVITATION_BASE_URL?: string;
      PROTOCOL?: string;

      // App URLs
      CRM_APP_URL?: string;
      HR_APP_URL?: string;
      AFFILIATE_APP_URL?: string;
      ACCOUNTING_APP_URL?: string;
      INVENTORY_APP_URL?: string;
      BUSINESS_SUITE_TARGET_APPS?: string;

      // Rate Limiting
      RATE_LIMIT_MAX?: string;
      RATE_LIMIT_WINDOW?: string;

      // File Uploads
      MAX_FILE_SIZE?: string;
      UPLOAD_DIR?: string;

      // Stripe
      STRIPE_SECRET_KEY?: string;
      STRIPE_PUBLISHABLE_KEY?: string;
      STRIPE_WEBHOOK_SECRET?: string;
      BYPASS_WEBHOOK_SIGNATURE?: string;
      STRIPE_STARTER_MONTHLY_PRICE_ID?: string;
      STRIPE_STARTER_YEARLY_PRICE_ID?: string;
      STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID?: string;
      STRIPE_PROFESSIONAL_YEARLY_PRICE_ID?: string;
      STRIPE_ENTERPRISE_MONTHLY_PRICE_ID?: string;
      STRIPE_ENTERPRISE_YEARLY_PRICE_ID?: string;

      // AWS
      AWS_ACCESS_KEY_ID?: string;
      AWS_SECRET_ACCESS_KEY?: string;
      AWS_REGION?: string;
      AWS_HOSTED_ZONE_ID?: string;

      // Amazon MQ
      AMAZON_MQ_PROTOCOL?: string;
      AMAZON_MQ_HOSTNAME?: string;
      AMAZON_MQ_PORT?: string;
      AMAZON_MQ_USERNAME?: string;
      AMAZON_MQ_PASSWORD?: string;
      AMAZON_MQ_URL?: string;

      // Email
      BREVO_API_KEY?: string;
      BREVO_SENDER_EMAIL?: string;
      BREVO_SENDER_NAME?: string;

      // Redis
      REDIS_ENABLED?: string;
      REDIS_URL?: string;

      // Elasticsearch
      ELASTICSEARCH_URL?: string;

      // Temporal
      TEMPORAL_ENABLED?: string;
      TEMPORAL_ADDRESS?: string;
      TEMPORAL_NAMESPACE?: string;
      TEMPORAL_TASK_QUEUE_WRAPPER?: string;

      // AI Services
      OPENAI_API_KEY?: string;

      // Verification
      VERIFICATION_API_KEY?: string;
      VERIFICATION_API_SECRET?: string;
      VERIFICATION_API_VERSION?: string;
      VERIFICATION_USE_LIVE?: string;

      // DNS
      SERVER_TARGET?: string;

      // Credits / Trial
      DEFAULT_FREE_CREDITS?: string;
      TRIAL_PERIOD_DAYS?: string;

      // Wrapper Internal
      WRAPPER_SECRET_KEY?: string;
      WRAPPER_ORG_CODE?: string;
      WRAPPER_API_URL?: string;
      WRAPPER_APP_CODE?: string;
      AUTH_TOKEN?: string;
      API_BASE_URL?: string;
    }
  }
}

export {};
