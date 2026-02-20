/**
 * Enhanced Logging Utility
 * Provides structured logging for debugging onboarding, user management, roles, billing, and Stripe operations
 */

class Logger {
  colors: Record<string, string> = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  };

  constructor() {}

  // Generate unique request ID
  generateRequestId(prefix = 'req'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Format timestamp
  getTimestamp(): string {
    return new Date().toISOString();
  }

  // Get formatted duration
  getDuration(startTime: number): string {
    return `${Date.now() - startTime}ms`;
  }

  // Base logging method with context
  log(level: string, category: string, requestId: string, message: string, data: Record<string, unknown> = {}): void {
    const timestamp = this.getTimestamp();
    const emoji = this.getEmoji(level, category);
    
    console.log(`\n${emoji} [${requestId}] ${category}: ${message}`);
    console.log(`⏰ Timestamp: ${timestamp}`);
    
    if (Object.keys(data).length > 0) {
      console.log(`📊 Data:`, JSON.stringify(data, null, 2));
    }
  }

  // Get emoji based on level and category
  getEmoji(level: string, category: string): string {
    const emojiMap: Record<string, string> = {
      // Levels
      'info': '📋',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌',
      'debug': '🔍',
      
      // Categories
      'onboarding': '🚀',
      'user': '👤',
      'role': '🔐',
      'billing': '💳',
      'stripe': '🟢',
      'database': '💾',
      'kinde': '🔑',
      'email': '📧',
      'validation': '✅',
      'transaction': '🔄'
    };
    
    return (emojiMap[category] ?? emojiMap[level]) ?? '📋';
  }

  // Onboarding specific logs
  onboarding = {
    start: (requestId: string, data: Record<string, unknown>) => {
      console.log('\n🚀 =================== ONBOARDING STARTED ===================');
      console.log(`📋 Request ID: ${requestId}`);
      console.log(`⏰ Timestamp: ${this.getTimestamp()}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log('📦 Request Data:', JSON.stringify(data, null, 2));
    },

    step: (requestId: string, stepNumber: number, description: string, data: Record<string, unknown> = {}) => {
      console.log(`\n🔄 [${requestId}] Step ${stepNumber}: ${description}`);
      if (Object.keys(data).length > 0) {
        console.log(`📊 [${requestId}] Data:`, JSON.stringify(data, null, 2));
      }
    },

    success: (requestId: string, message: string, data: Record<string, unknown> = {}) => {
      console.log(`✅ [${requestId}] ${message}`);
      if (Object.keys(data).length > 0) {
        console.log(`📊 [${requestId}] Result:`, JSON.stringify(data, null, 2));
      }
    },

    error: (requestId: string, message: string, error: Error & { code?: string; statusCode?: number }, startTime: number) => {
      console.error(`❌ [${requestId}] ${message}`);
      console.error(`📋 [${requestId}] Error:`, error.message);
      if (error.code) console.error(`🔢 [${requestId}] Error Code:`, error.code);
      if (error.statusCode) console.error(`🌐 [${requestId}] Status Code:`, error.statusCode);
      if (error.stack) console.error(`📋 [${requestId}] Stack:`, error.stack);
      console.log(`⏱️ [${requestId}] Failed after ${this.getDuration(startTime)}`);
    },

    complete: (requestId: string, startTime: number, data: Record<string, unknown> = {}) => {
      console.log(`\n🎉 [${requestId}] ONBOARDING COMPLETED SUCCESSFULLY!`);
      console.log(`⏱️ [${requestId}] Total Duration: ${this.getDuration(startTime)}`);
      if (Object.keys(data).length > 0) {
        console.log(`📊 [${requestId}] Final Result:`, JSON.stringify(data, null, 2));
      }
      console.log('🚀 =================== ONBOARDING ENDED ===================\n');
    }
  };

  // User management logs
  user = {
    invitation: {
      start: (requestId: string, data: Record<string, unknown>) => {
        console.log('\n👤 ================ USER INVITATION STARTED ================');
        console.log(`📋 Request ID: ${requestId}`);
        console.log(`⏰ Timestamp: ${this.getTimestamp()}`);
        console.log('📧 Invitation Data:', JSON.stringify(data, null, 2));
      },

      step: (requestId: string, step: string, description: string, data: Record<string, unknown> = {}) => {
        console.log(`\n📧 [${requestId}] ${step}: ${description}`);
        if (Object.keys(data).length > 0) {
          console.log(`📊 [${requestId}] Data:`, JSON.stringify(data, null, 2));
        }
      },

      success: (requestId: string, startTime: number, data: Record<string, unknown> = {}) => {
        console.log(`\n✅ [${requestId}] USER INVITATION COMPLETED!`);
        console.log(`⏱️ [${requestId}] Duration: ${this.getDuration(startTime)}`);
        console.log(`📊 [${requestId}] Result:`, JSON.stringify(data, null, 2));
        console.log('👤 ================ USER INVITATION ENDED ================\n');
      },

      error: (requestId: string, error: Error, startTime: number) => {
        console.error(`\n❌ [${requestId}] USER INVITATION FAILED!`);
        console.error(`📋 [${requestId}] Error:`, error.message);
        console.log(`⏱️ [${requestId}] Failed after ${this.getDuration(startTime)}`);
        console.log('👤 ================ USER INVITATION ENDED ================\n');
      }
    }
  };

  // Role management logs
  role = {
    create: {
      start: (requestId: string, data: Record<string, unknown>) => {
        console.log('\n🔐 ================ ROLE CREATION STARTED ================');
        console.log(`📋 Request ID: ${requestId}`);
        console.log(`⏰ Timestamp: ${this.getTimestamp()}`);
        console.log('🔐 Role Data:', JSON.stringify(data, null, 2));
      },

      step: (requestId: string, step: string, description: string, data: Record<string, unknown> = {}) => {
        console.log(`\n🔐 [${requestId}] ${step}: ${description}`);
        if (Object.keys(data).length > 0) {
          console.log(`📊 [${requestId}] Data:`, JSON.stringify(data, null, 2));
        }
      },

      success: (requestId: string, startTime: number, data: Record<string, unknown> = {}) => {
        console.log(`\n✅ [${requestId}] ROLE CREATED SUCCESSFULLY!`);
        console.log(`⏱️ [${requestId}] Duration: ${this.getDuration(startTime)}`);
        console.log(`📊 [${requestId}] Role:`, JSON.stringify(data, null, 2));
        console.log('🔐 ================ ROLE CREATION ENDED ================\n');
      }
    },

    assign: {
      start: (requestId: string, data: Record<string, unknown>) => {
        console.log('\n👥 ================ ROLE ASSIGNMENT STARTED ================');
        console.log(`📋 Request ID: ${requestId}`);
        console.log(`⏰ Timestamp: ${this.getTimestamp()}`);
        console.log('👥 Assignment Data:', JSON.stringify(data, null, 2));
      },

      success: (requestId: string, startTime: number, data: Record<string, unknown> = {}) => {
        console.log(`\n✅ [${requestId}] ROLE ASSIGNED SUCCESSFULLY!`);
        console.log(`⏱️ [${requestId}] Duration: ${this.getDuration(startTime)}`);
        console.log(`📊 [${requestId}] Assignment:`, JSON.stringify(data, null, 2));
        console.log('👥 ================ ROLE ASSIGNMENT ENDED ================\n');
      }
    }
  };

  // Billing and Stripe logs
  billing = {
    start: (requestId: string, operation: string, data: Record<string, unknown>) => {
      console.log(`\n💳 ================ ${operation.toUpperCase()} STARTED ================`);
      console.log(`📋 Request ID: ${requestId}`);
      console.log(`⏰ Timestamp: ${this.getTimestamp()}`);
      console.log('💳 Billing Data:', JSON.stringify(data, null, 2));
    },

    stripe: {
      request: (requestId: string, method: string, endpoint: string, data: Record<string, unknown> = {}) => {
        console.log(`\n🟢 [${requestId}] Stripe API Request:`);
        console.log(`🌐 [${requestId}] Method: ${method}`);
        console.log(`🔗 [${requestId}] Endpoint: ${endpoint}`);
        if (Object.keys(data).length > 0) {
          console.log(`📊 [${requestId}] Payload:`, JSON.stringify(data, null, 2));
        }
      },

      response: (requestId: string, status: number | string, data: Record<string, unknown> = {}) => {
        console.log(`🟢 [${requestId}] Stripe API Response:`);
        console.log(`📊 [${requestId}] Status: ${status}`);
        console.log(`📄 [${requestId}] Data:`, JSON.stringify(data, null, 2));
      },

      error: (requestId: string, error: Error & { code?: string; statusCode?: number; decline_code?: string }) => {
        console.error(`❌ [${requestId}] Stripe API Error:`);
        console.error(`📋 [${requestId}] Message:`, error.message);
        console.error(`🔢 [${requestId}] Code:`, error.code);
        console.error(`🌐 [${requestId}] Status:`, error.statusCode);
        if (error.decline_code) {
          console.error(`💳 [${requestId}] Decline Code:`, error.decline_code);
        }
      }
    },

    success: (requestId: string, operation: string, startTime: number, data: Record<string, unknown> = {}) => {
      console.log(`\n✅ [${requestId}] ${operation.toUpperCase()} COMPLETED!`);
      console.log(`⏱️ [${requestId}] Duration: ${this.getDuration(startTime)}`);
      console.log(`📊 [${requestId}] Result:`, JSON.stringify(data, null, 2));
      console.log(`💳 ================ ${operation.toUpperCase()} ENDED ================\n`);
    }
  };

  // Database operation logs
  database = {
    transaction: {
      start: (requestId: string, description: string) => {
        console.log(`\n💾 [${requestId}] Database Transaction Started: ${description}`);
        console.log(`⏰ [${requestId}] Timestamp: ${this.getTimestamp()}`);
      },

      step: (requestId: string, operation: string, table: string, data: Record<string, unknown> = {}) => {
        console.log(`📝 [${requestId}] ${operation} → ${table}`);
        if (Object.keys(data).length > 0) {
          console.log(`📊 [${requestId}] Data:`, JSON.stringify(data, null, 2));
        }
      },

      success: (requestId: string, description: string, duration: string, data: Record<string, unknown> = {}) => {
        console.log(`✅ [${requestId}] Transaction Completed: ${description}`);
        console.log(`⏱️ [${requestId}] Duration: ${duration}`);
        if (Object.keys(data).length > 0) {
          console.log(`📊 [${requestId}] Result:`, JSON.stringify(data, null, 2));
        }
      },

      error: (requestId: string, error: Error & { code?: string }, duration: string) => {
        console.error(`❌ [${requestId}] Transaction Failed after ${duration}`);
        console.error(`📋 [${requestId}] Error:`, error.message);
        if (error.code) console.error(`🔢 [${requestId}] Error Code:`, error.code);
      }
    }
  };

  // Activity logs
  activity = {
    log: (requestId: string, action: string, resourceType: string, resourceId: string, data: Record<string, unknown> = {}) => {
      console.log(`📋 [${requestId}] Activity Logged:`);
      console.log(`🎯 [${requestId}] Action: ${action}`);
      console.log(`📦 [${requestId}] Resource: ${resourceType} (${resourceId})`);
      if (Object.keys(data).length > 0) {
        console.log(`📊 [${requestId}] Details:`, JSON.stringify(data, null, 2));
      }
    }
  };

  // Email logs
  email = {
    send: (requestId: string, type: string, recipient: string, data: Record<string, unknown> = {}) => {
      console.log(`📧 [${requestId}] Sending Email:`);
      console.log(`📮 [${requestId}] Type: ${type}`);
      console.log(`👤 [${requestId}] To: ${recipient}`);
      if (Object.keys(data).length > 0) {
        console.log(`📊 [${requestId}] Data:`, JSON.stringify(data, null, 2));
      }
    },

    success: (requestId: string, type: string, recipient: string) => {
      console.log(`✅ [${requestId}] Email sent successfully: ${type} to ${recipient}`);
    },

    error: (requestId: string, type: string, recipient: string, error: Error) => {
      console.error(`❌ [${requestId}] Email failed: ${type} to ${recipient}`);
      console.error(`📋 [${requestId}] Error:`, error.message);
    }
  };

  // Trial and subscription logs
  trial = {
    start: (requestId: string, tenantId: string, duration: string) => {
      console.log(`⏰ [${requestId}] Trial Started:`);
      console.log(`🏢 [${requestId}] Tenant: ${tenantId}`);
      console.log(`⏱️ [${requestId}] Duration: ${duration}`);
    },

    expiry: (requestId: string, tenantId: string, expiredAt: string) => {
      console.log(`⏰ [${requestId}] Trial Expired:`);
      console.log(`🏢 [${requestId}] Tenant: ${tenantId}`);
      console.log(`📅 [${requestId}] Expired at: ${expiredAt}`);
    },

    reminder: (requestId: string, tenantId: string, timeLeft: string) => {
      console.log(`⏰ [${requestId}] Trial Reminder:`);
      console.log(`🏢 [${requestId}] Tenant: ${tenantId}`);
      console.log(`⏱️ [${requestId}] Time left: ${timeLeft}`);
    }
  };
}

// Export singleton instance
export default new Logger(); 