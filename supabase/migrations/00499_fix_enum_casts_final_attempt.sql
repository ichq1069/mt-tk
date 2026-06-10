-- Final attempt to fix enum operator ambiguity
-- This migration drops and recreates casts for all public enums as ASSIGNMENT
-- to prevent "operator is not unique" errors.

DO $$
DECLARE
    enum_record RECORD;
BEGIN
    FOR enum_record IN 
        SELECT n.nspname as schema, t.typname as name
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typtype = 'e'
    LOOP
        -- Drop enum -> text cast if it exists
        IF EXISTS (SELECT 1 FROM pg_cast WHERE castsource = (quote_ident(enum_record.schema) || '.' || quote_ident(enum_record.name))::regtype AND casttarget = 'text'::regtype) THEN
            EXECUTE format('DROP CAST (%I.%I AS text)', enum_record.schema, enum_record.name);
        END IF;
        
        -- Drop text -> enum cast if it exists
        IF EXISTS (SELECT 1 FROM pg_cast WHERE castsource = 'text'::regtype AND casttarget = (quote_ident(enum_record.schema) || '.' || quote_ident(enum_record.name))::regtype) THEN
            EXECUTE format('DROP CAST (text AS %I.%I)', enum_record.schema, enum_record.name);
        END IF;

        -- Create casts as ASSIGNMENT
        EXECUTE format('CREATE CAST (%I.%I AS text) WITH INOUT AS ASSIGNMENT', enum_record.schema, enum_record.name);
        EXECUTE format('CREATE CAST (text AS %I.%I) WITH INOUT AS ASSIGNMENT', enum_record.schema, enum_record.name);
    END LOOP;
END $$;
