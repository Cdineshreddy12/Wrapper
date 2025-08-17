#!/usr/bin/env node

/**
 * 🧪 **DATABASE CONNECTION TEST**
 * Tests the database connection before running the sync
 */

import 'dotenv/config';
import { db } from './src/db/index.js';

async function testConnection() {
  console.log('🧪 Testing database connection...');
  
  try {
    // Test basic connection using raw SQL
    const result = await db.execute('SELECT NOW() as current_time');
    console.log('✅ Database connection successful!');
    console.log(`   Current time: ${result[0].current_time}`);
    
    // Test if tables exist
    const tables = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📊 Available tables:');
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.message.includes('DATABASE_URL')) {
      console.log('\n💡 Solution: Create a .env file with DATABASE_URL');
      console.log('   Example: DATABASE_URL=postgresql://user:pass@localhost:5432/dbname');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Solution: Make sure PostgreSQL is running');
    } else if (error.message.includes('does not exist')) {
      console.log('\n💡 Solution: Create the database first');
    } else if (error.message.includes('query.getSQL is not a function')) {
      console.log('\n💡 Solution: Drizzle ORM version compatibility issue');
      console.log('   Try updating drizzle-orm package or check version compatibility');
    }
    
    return false;
  }
}

// Run test
testConnection().then(success => {
  if (success) {
    console.log('\n🎉 Database is ready for sync!');
    console.log('   Run: npm run sync-permissions');
  } else {
    console.log('\n❌ Please fix database connection issues first');
    process.exit(1);
  }
});
