import { dbManager } from './src/db/index.js';

async function fixTrigger() {
  const systemConnection = dbManager.getSystemConnection();
  
  try {
    console.log('🔧 Dropping old trigger...');
    await systemConnection.unsafe('DROP TRIGGER IF EXISTS trigger_entity_hierarchy_insert ON entities');
    await systemConnection.unsafe('DROP FUNCTION IF EXISTS trigger_entity_hierarchy_insert()');
    console.log('✅ Old trigger dropped');
    
    console.log('🔧 Creating new trigger...');
    await systemConnection.unsafe(`
      CREATE OR REPLACE FUNCTION trigger_entity_hierarchy_insert()
      RETURNS trigger AS $$
      BEGIN
          -- Set hierarchy paths for the new entity
          NEW.hierarchy_path := build_hierarchy_path(NEW.entity_id);
          NEW.full_hierarchy_path := (
              SELECT string_agg(e.entity_name, ' > ' ORDER BY array_position(string_to_array(NEW.hierarchy_path, '.'), path_part::text))
              FROM unnest(string_to_array(NEW.hierarchy_path, '.')) AS path_part
              JOIN entities e ON e.entity_id = path_part::uuid
          );

          -- Update entity level based on hierarchy depth
          NEW.entity_level := array_length(string_to_array(NEW.hierarchy_path, '.'), 1);

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await systemConnection.unsafe(`
      CREATE TRIGGER trigger_entity_hierarchy_insert
          BEFORE INSERT ON entities
          FOR EACH ROW EXECUTE FUNCTION trigger_entity_hierarchy_insert();
    `);
    
    console.log('✅ New trigger created');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixTrigger().catch(console.error);
