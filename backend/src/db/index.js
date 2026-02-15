import { dbManager, getAppDb, getSystemDb, initializeDrizzleInstances } from './connection-manager.js';
import * as schema from './schema/index.js';
import 'dotenv/config';

process.stdout.write('🔌 Connecting to PostgreSQL...\n');
await dbManager.initialize();
const { appDb, systemDb } = initializeDrizzleInstances();

// Export connections for backward compatibility
export const db = appDb;
export const systemDbConnection = systemDb;
export const connectionString = process.env.DATABASE_URL || '';

export { dbManager };

export const sql = dbManager.getAppConnection();
export const systemSql = dbManager.getSystemConnection();

export { appDb as drizzle };

// Close connection helper
export const closeConnection = () => dbManager.closeAll();

// Health check helper
export const healthCheck = () => dbManager.healthCheck(); 