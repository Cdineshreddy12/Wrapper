#!/usr/bin/env node

import { db } from './src/db/index.js';
import fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';

async function runOnboardingTrackingMigration() {
  try {
    console.log('🚀 Starting Enhanced Onboarding Tracking Migration...');

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'src/db/migrations/0014_enhanced_onboarding_tracking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📖 Migration SQL loaded');

    // Define the migration statements manually to ensure proper order and avoid parsing issues
    const statements = [
      // 1. Add missing column first
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "trial_onboarding_completed" boolean DEFAULT false`,

      // 2. Add new columns to tenants table
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "trial_onboarding_completed_at" timestamp`,
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "upgrade_onboarding_completed" boolean DEFAULT false`,
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "upgrade_onboarding_completed_at" timestamp`,
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "profile_onboarding_completed" boolean DEFAULT false`,
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "profile_onboarding_completed_at" timestamp`,
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "onboarding_phases" jsonb DEFAULT '{
        "trial": {"completed": false, "completedAt": null, "skipped": false},
        "profile": {"completed": false, "completedAt": null, "skipped": false},
        "upgrade": {"completed": false, "completedAt": null, "skipped": false},
        "team": {"completed": false, "completedAt": null, "skipped": false},
        "integration": {"completed": false, "completedAt": null, "skipped": false}
      }'::jsonb`,
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "user_journey" jsonb DEFAULT '[]'::jsonb`,
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "onboarding_variant" varchar(50)`,

      // 3. Create onboarding_events table
      `CREATE TABLE IF NOT EXISTS "onboarding_events" (
        "event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "event_type" varchar(100) NOT NULL,
        "event_phase" varchar(50) NOT NULL,
        "event_action" varchar(50) NOT NULL,
        "user_id" uuid,
        "session_id" varchar(255),
        "ip_address" varchar(45),
        "user_agent" text,
        "event_data" jsonb DEFAULT '{}'::jsonb,
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "time_spent" integer,
        "completion_rate" integer,
        "step_number" integer,
        "total_steps" integer,
        "variant_id" varchar(50),
        "experiment_id" varchar(50),
        "created_at" timestamp DEFAULT now(),
        "event_timestamp" timestamp DEFAULT now()
      )`,

      // 4. Create indexes
      `CREATE INDEX IF NOT EXISTS "idx_onboarding_events_tenant_id" ON "onboarding_events"("tenant_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_onboarding_events_event_type" ON "onboarding_events"("event_type")`,
      `CREATE INDEX IF NOT EXISTS "idx_onboarding_events_event_phase" ON "onboarding_events"("event_phase")`,
      `CREATE INDEX IF NOT EXISTS "idx_onboarding_events_created_at" ON "onboarding_events"("created_at")`,
      `CREATE INDEX IF NOT EXISTS "idx_onboarding_events_tenant_phase_action" ON "onboarding_events"("tenant_id", "event_phase", "event_action")`,

      // 5. Add foreign key constraint
      `ALTER TABLE "onboarding_events" ADD CONSTRAINT "onboarding_events_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE cascade ON UPDATE no action`,

      // 6. Migrate existing data
      `UPDATE "tenants"
       SET
         "trial_onboarding_completed" = true,
         "trial_onboarding_completed_at" = "onboarded_at",
         "onboarding_phases" = jsonb_set(
           jsonb_set("onboarding_phases", '{trial,completed}', 'true'::jsonb),
           '{trial,completedAt}',
           to_jsonb("onboarded_at")
         )
       WHERE "onboarding_completed" = true AND "onboarded_at" IS NOT NULL`,

      // 7. Create initial onboarding events for existing completed onboardings
      `INSERT INTO "onboarding_events" (
         "tenant_id",
         "event_type",
         "event_phase",
         "event_action",
         "event_data",
         "metadata",
         "completion_rate",
         "step_number",
         "total_steps",
         "created_at",
         "event_timestamp"
       )
       SELECT
         "tenant_id",
         'trial_onboarding_completed',
         'trial',
         'completed',
         jsonb_build_object(
           'migrated', true,
           'original_onboarded_at', "onboarded_at",
           'company_name', "company_name",
           'gstin', "gstin"
         ),
         jsonb_build_object('source', 'migration', 'version', '1.0'),
         100,
         1,
         1,
         "onboarded_at",
         "onboarded_at"
       FROM "tenants"
       WHERE "onboarding_completed" = true AND "onboarded_at" IS NOT NULL`,

      // 8. Update user journey for existing completed onboardings
      `UPDATE "tenants"
       SET "user_journey" = jsonb_build_array(
         jsonb_build_object(
           'event', 'trial_onboarding_completed',
           'timestamp', "onboarded_at",
           'metadata', jsonb_build_object(
             'source', 'migration',
             'version', '1.0',
             'migrated', true
           )
         )
       )
       WHERE "onboarding_completed" = true AND "onboarded_at" IS NOT NULL`,

      // 9. Add comments for documentation
      `COMMENT ON TABLE "onboarding_events" IS 'Detailed tracking of onboarding events for analytics and user journey mapping'`,
      `COMMENT ON COLUMN "tenants"."trial_onboarding_completed" IS 'Tracks completion of initial trial onboarding (4 core fields)'`,
      `COMMENT ON COLUMN "tenants"."upgrade_onboarding_completed" IS 'Tracks completion of payment upgrade onboarding (comprehensive profile)'`,
      `COMMENT ON COLUMN "tenants"."profile_onboarding_completed" IS 'Tracks completion of profile data collection during upgrade'`,
      `COMMENT ON COLUMN "tenants"."onboarding_phases" IS 'Flexible JSON tracking of all onboarding phases with completion status'`,
      `COMMENT ON COLUMN "tenants"."user_journey" IS 'Array of user journey events for analytics'`,
      `COMMENT ON COLUMN "tenants"."onboarding_variant" IS 'A/B testing variant assigned to this tenant'`
    ];

    console.log(`🔧 Executing ${statements.length} migration statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
          console.log(`   SQL: ${statement.substring(0, 80)}...`);

          await db.execute(sql.raw(statement));
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          console.error(`   SQL: ${statement.substring(0, 200)}...`);

          // For some errors, we might want to continue (like duplicate constraints)
          if (error.message.includes('duplicate') ||
              error.message.includes('already exists') ||
              error.message.includes('does not exist, skipping') ||
              error.code === '42701' || // duplicate column
              error.code === '42P07' || // duplicate table
              error.code === '42710') {  // duplicate object
            console.log('⚠️  Continuing despite error (likely duplicate/already exists)');
          } else {
            throw error;
          }
        }
      }
    }

    console.log('🎉 Migration completed successfully!');

    // Verify the changes
    console.log('🔍 Verifying migration results...');

    // Check if new columns were added to tenants table
    const tenantColumns = await db.execute(sql.raw(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tenants'
      AND column_name IN ('trial_onboarding_completed', 'upgrade_onboarding_completed', 'profile_onboarding_completed', 'onboarding_phases', 'user_journey', 'onboarding_variant')
      ORDER BY column_name
    `));

    console.log('📊 New tenants table columns:');
    if (tenantColumns.rows && tenantColumns.rows.length > 0) {
      tenantColumns.rows.forEach(row => {
        console.log(`  ✅ ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } else {
      console.log('  ⚠️  No new columns found in tenants table');
    }

    // Check if onboarding_events table was created
    const tableExists = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'onboarding_events'
      )
    `));

    if (tableExists.rows && tableExists.rows[0].exists) {
      console.log('✅ onboarding_events table created successfully');

      // Check table structure
      const eventColumns = await db.execute(sql.raw(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'onboarding_events'
        ORDER BY ordinal_position
      `));

      console.log('📊 onboarding_events table structure:');
      if (eventColumns.rows) {
        eventColumns.rows.forEach(row => {
          console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
      }
    } else {
      console.log('❌ onboarding_events table was not created');
    }

    // Check indexes
    const indexes = await db.execute(sql.raw(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'onboarding_events'
      ORDER BY indexname
    `));

    console.log('📊 Indexes on onboarding_events table:');
    if (indexes.rows && indexes.rows.length > 0) {
      indexes.rows.forEach(row => {
        console.log(`  ✅ ${row.indexname}: ${row.indexdef}`);
      });
    } else {
      console.log('  ⚠️  No indexes found on onboarding_events table');
    }

    // Check data migration
    try {
      const migratedEvents = await db.execute(sql.raw(`
        SELECT COUNT(*) as count
        FROM onboarding_events
        WHERE metadata->>'source' = 'migration'
      `));

      console.log(`📊 Data migration: ${migratedEvents.rows?.[0]?.count || 0} events migrated from existing tenants`);
    } catch (error) {
      console.log(`📊 Data migration: Unable to check migrated events (${error.message})`);
    }

    // Check phase tracking updates
    const updatedTenants = await db.execute(sql.raw(`
      SELECT COUNT(*) as count
      FROM tenants
      WHERE trial_onboarding_completed = true
    `));

    console.log(`📊 Phase tracking: ${updatedTenants.rows[0]?.count || 0} tenants marked with completed trial onboarding`);

    console.log('\n✅ Migration verification completed!');
    console.log('\n🎯 Enhanced Onboarding Tracking Features Now Available:');
    console.log('  • Phase-specific tracking (trial, profile, upgrade)');
    console.log('  • Detailed event logging with analytics');
    console.log('  • User journey mapping');
    console.log('  • A/B testing support');
    console.log('  • Comprehensive migration of existing data');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runOnboardingTrackingMigration();
