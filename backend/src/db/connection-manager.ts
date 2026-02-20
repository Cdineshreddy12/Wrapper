import postgres, { type Sql } from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';
import dotenv from 'dotenv';
import type { HealthCheckResult } from '../types/common.js';

dotenv.config();

class DatabaseConnectionManager {
  appConnection: Sql | null = null;
  systemConnection: Sql | null = null;
  appDb: PostgresJsDatabase<typeof schema> | null = null;
  systemDb: PostgresJsDatabase<typeof schema> | null = null;
  initialized = false;

  async initialize(): Promise<void> {
    try {
      if (this.initialized) {
        console.log('🔄 Database connections already initialized');
        return;
      }

      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        console.error('❌ DATABASE_URL is not set. Add it to backend/.env (e.g. DATABASE_URL=postgresql://user:pass@localhost:5432/dbname)');
        throw new Error('DATABASE_URL environment variable is required');
      }

      console.log('🔌 Connecting to database...');

      this.appConnection = postgres(databaseUrl, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 5,
      });

      this.systemConnection = postgres(databaseUrl, {
        max: 5,
        idle_timeout: 30,
        connect_timeout: 5,
        transform: {
          value: (value: unknown) => value,
        },
      });

      this.appDb = drizzle(this.appConnection, { schema });
      this.systemDb = drizzle(this.systemConnection, { schema });

      this.initialized = true;
      console.log('✅ Database connections initialized successfully');

    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      console.error('❌ Failed to initialize database connections:', err.message || error);
      if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
        console.error('   Make sure PostgreSQL is running and DATABASE_URL in .env is correct.');
        console.error('   Example: postgresql://user:password@localhost:5432/your_db');
      }
      throw error;
    }
  }

  getAppConnection(): Sql {
    if (!this.appConnection) {
      throw new Error('App database connection not initialized');
    }
    return this.appConnection;
  }

  getSystemConnection(): Sql {
    if (!this.systemConnection) {
      throw new Error('System database connection not initialized');
    }
    return this.systemConnection;
  }

  getAppDb(): PostgresJsDatabase<typeof schema> {
    if (!this.appDb) {
      throw new Error('App Drizzle instance not initialized');
    }
    return this.appDb;
  }

  getSystemDb(): PostgresJsDatabase<typeof schema> {
    if (!this.systemDb) {
      throw new Error('System Drizzle instance not initialized');
    }
    return this.systemDb;
  }

  async closeAll(): Promise<void> {
    try {
      console.log('🔌 Closing database connections...');

      if (this.appConnection) {
        await this.appConnection.end();
        this.appConnection = null;
      }

      if (this.systemConnection) {
        await this.systemConnection.end();
        this.systemConnection = null;
      }

      this.appDb = null;
      this.systemDb = null;
      this.initialized = false;

      console.log('✅ Database connections closed successfully');

    } catch (error) {
      console.error('❌ Error closing database connections:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      if (!this.initialized) {
        return { status: 'not_initialized', message: 'Database connections not initialized' };
      }

      const appResult = await this.appConnection!`SELECT 1 as test`;
      const appHealthy = appResult[0]?.test === 1;

      const systemResult = await this.systemConnection!`SELECT 1 as test`;
      const systemHealthy = systemResult[0]?.test === 1;

      const overallHealthy = appHealthy && systemHealthy;

      return {
        status: overallHealthy ? 'healthy' : 'unhealthy',
        app_connection: appHealthy ? 'healthy' : 'unhealthy',
        system_connection: systemHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      };

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Health check failed:', error);
      return {
        status: 'error',
        error: err.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

const dbManager = new DatabaseConnectionManager();

function getAppDb() {
  return dbManager.getAppDb();
}

function getSystemDb() {
  return dbManager.getSystemDb();
}

function initializeDrizzleInstances() {
  return {
    appDb: dbManager.getAppDb(),
    systemDb: dbManager.getSystemDb()
  };
}

export { dbManager, getAppDb, getSystemDb, initializeDrizzleInstances };
export default dbManager;
