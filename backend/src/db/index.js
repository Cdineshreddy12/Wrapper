import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import 'dotenv/config';

// Database connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create the connection
export const sql = postgres(connectionString, { 
  max: parseInt(process.env.DB_POOL_SIZE || '20'),
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance
export const db = drizzle(sql, { 
  schema,
  logger: process.env.NODE_ENV === 'development',
});

// Close connection helper
export const closeConnection = async () => {
  await sql.end();
}; 