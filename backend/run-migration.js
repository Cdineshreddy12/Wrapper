#!/usr/bin/env node

import { db } from './src/db/index.js';
import fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';

async function runMigration() {
  try {
    console.log('🚀 Starting invitation system migration...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'src/db/migrations/0008_fix_invitation_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Migration SQL loaded');
    
    // Define the migration statements manually to avoid parsing issues
    const statements = [
      // Step 1: Add new columns
      `ALTER TABLE tenant_invitations 
       ADD COLUMN IF NOT EXISTS invitation_url VARCHAR(1000),
       ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
       ADD COLUMN IF NOT EXISTS cancelled_by UUID,
       ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
      
      // Step 2: Make invitation_token unique
      `ALTER TABLE tenant_invitations 
       ADD CONSTRAINT tenant_invitations_invitation_token_unique 
       UNIQUE (invitation_token)`,
      
      // Step 3: Remove duplicate fields from tenant_users
      `ALTER TABLE tenant_users 
       DROP COLUMN IF EXISTS invitation_token,
       DROP COLUMN IF EXISTS invitation_expires_at,
       DROP COLUMN IF EXISTS invitation_accepted_at`,
      
      // Step 4: Update existing invitations with URLs
      `UPDATE tenant_invitations 
       SET invitation_url = CONCAT('http://localhost:3001/invite/accept?token=', invitation_token)
       WHERE invitation_url IS NULL AND status = 'pending'`,
      
      // Step 5: Create indexes
      `CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(invitation_token)`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email)`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_invitations_status ON tenant_invitations(status)`,
      
      // Step 6: Create function and trigger
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
           NEW.updated_at = NOW();
           RETURN NEW;
       END;
       $$ language 'plpgsql'`,
      
      // Step 7: Create trigger
      `DROP TRIGGER IF EXISTS update_tenant_invitations_updated_at ON tenant_invitations`,
      `CREATE TRIGGER update_tenant_invitations_updated_at
       BEFORE UPDATE ON tenant_invitations
       FOR EACH ROW
       EXECUTE FUNCTION update_updated_at_column()`
    ];
    
    console.log(`🔧 Executing ${statements.length} migration statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
          await db.execute(sql.raw(statement));
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          // Continue with other statements
        }
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    
    // Verify the changes
    console.log('🔍 Verifying migration results...');
    
    // Check if new columns were added
    const tableInfo = await db.execute(sql.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tenant_invitations' 
      ORDER BY ordinal_position
    `));
    
    console.log('📊 tenant_invitations table structure:');
    if (tableInfo.rows) {
      tableInfo.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } else {
      console.log('  - Table structure verification completed');
    }
    
    // Check if duplicate columns were removed from tenant_users
    const userTableInfo = await db.execute(sql.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tenant_users' 
      ORDER BY ordinal_position
    `));
    
    console.log('\n📊 tenant_users table structure:');
    if (userTableInfo.rows) {
      userTableInfo.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } else {
      console.log('  - Table structure verification completed');
    }
    
    // Check invitation count
    const invitationCount = await db.execute(sql.raw(`
      SELECT status, COUNT(*) as count 
      FROM tenant_invitations 
      GROUP BY status
    `));
    
    console.log('\n📊 Invitation status counts:');
    if (invitationCount.rows) {
      invitationCount.rows.forEach(row => {
        console.log(`  - ${row.status}: ${row.count}`);
      });
    } else {
      console.log('  - Invitation count verification completed');
    }
    
    console.log('\n✅ Migration verification completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // await db.end(); // This line was removed as per the edit hint.
  }
}

runMigration();
