import { dbManager, initializeDrizzleInstances } from './connection-manager.js';
import 'dotenv/config';

process.stdout.write('🔌 Connecting to PostgreSQL...\n');
await dbManager.initialize();
const { appDb, systemDb } = initializeDrizzleInstances();

export const db = appDb;
export const systemDbConnection = systemDb;
export const connectionString = process.env.DATABASE_URL || '';

export { dbManager };

export const sql = dbManager.getAppConnection();
export const systemSql = dbManager.getSystemConnection();

export { appDb as drizzle };

export const closeConnection = () => dbManager.closeAll();

export const healthCheck = () => dbManager.healthCheck();
