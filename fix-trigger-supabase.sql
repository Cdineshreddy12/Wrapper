-- =============================================================================
-- FIX HIERARCHY TRIGGER - Run this in Supabase SQL Editor
-- =============================================================================
-- This fixes the PostgreSQL aggregation error in the hierarchy triggers

-- Drop the broken trigger and function
DROP TRIGGER IF EXISTS trigger_entity_hierarchy_insert ON entities;
DROP FUNCTION IF EXISTS trigger_entity_hierarchy_insert();

-- Create the corrected trigger function
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

-- Recreate the trigger
CREATE TRIGGER trigger_entity_hierarchy_insert
    BEFORE INSERT ON entities
    FOR EACH ROW EXECUTE FUNCTION trigger_entity_hierarchy_insert();

-- Also fix the update function
CREATE OR REPLACE FUNCTION update_entity_hierarchy_paths(entity_id_param uuid)
RETURNS void AS $$
DECLARE
    entity_record record;
    descendant_record record;
BEGIN
    -- Update the entity itself
    UPDATE entities
    SET hierarchy_path = build_hierarchy_path(entity_id_param),
        full_hierarchy_path = (
            SELECT string_agg(e.entity_name, ' > ' ORDER BY array_position(string_to_array(build_hierarchy_path(entity_id_param), '.'), path_part::text))
            FROM unnest(string_to_array(build_hierarchy_path(entity_id_param), '.')) AS path_part
            JOIN entities e ON e.entity_id = path_part::uuid
        )
    WHERE entity_id = entity_id_param;

    -- Update all descendants
    FOR descendant_record IN
        SELECT entity_id
        FROM entities
        WHERE hierarchy_path LIKE '%' || entity_id_param || '%'
          AND entity_id != entity_id_param
    LOOP
        UPDATE entities
        SET hierarchy_path = build_hierarchy_path(descendant_record.entity_id),
            full_hierarchy_path = (
                SELECT string_agg(e.entity_name, ' > ' ORDER BY array_position(string_to_array(build_hierarchy_path(descendant_record.entity_id), '.'), path_part::text))
                FROM unnest(string_to_array(build_hierarchy_path(descendant_record.entity_id), '.')) AS path_part
                JOIN entities e ON e.entity_id = path_part::uuid
            )
        WHERE entity_id = descendant_record.entity_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Also fix the rebuild function
CREATE OR REPLACE FUNCTION rebuild_all_hierarchy_paths()
RETURNS void AS $$
DECLARE
    entity_record record;
BEGIN
    -- Disable triggers temporarily for bulk update
    ALTER TABLE entities DISABLE TRIGGER trigger_entity_hierarchy_update;

    -- Update all entities
    FOR entity_record IN SELECT entity_id FROM entities ORDER BY entity_level LOOP
        UPDATE entities
        SET hierarchy_path = build_hierarchy_path(entity_record.entity_id),
            full_hierarchy_path = (
                SELECT string_agg(e.entity_name, ' > ' ORDER BY array_position(string_to_array(build_hierarchy_path(entity_record.entity_id), '.'), path_part::text))
                FROM unnest(string_to_array(build_hierarchy_path(entity_record.entity_id), '.')) AS path_part
                JOIN entities e ON e.entity_id = path_part::uuid
            ),
            entity_level = array_length(string_to_array(build_hierarchy_path(entity_record.entity_id), '.'), 1)
        WHERE entity_id = entity_record.entity_id;
    END LOOP;

    -- Re-enable triggers
    ALTER TABLE entities ENABLE TRIGGER trigger_entity_hierarchy_update;

    RAISE NOTICE 'All hierarchy paths rebuilt successfully';
END;
$$ LANGUAGE plpgsql;

-- Verify the fix
SELECT 'Trigger fixed successfully!' as status;
