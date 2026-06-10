-- Comprehensive fix for enum operator ambiguity
-- This migration ensures that core enums do not have IMPLICIT casts to text,
-- which causes "operator is not unique" errors in comparisons.

DO $$
DECLARE
    enum_list TEXT[] := ARRAY['user_role', 'public.item_status', 'notification_type', 'album_permission_level'];
    e TEXT;
BEGIN
    FOREACH e IN ARRAY enum_list LOOP
        -- Check if the enum type exists
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = e) THEN
            
            -- Remove implicit text -> enum cast if it exists
            IF EXISTS (SELECT 1 FROM pg_cast WHERE castsource = 'text'::regtype AND casttarget = e::regtype AND castcontext = 'i') THEN
                EXECUTE format('DROP CAST (text AS %I)', e);
                EXECUTE format('CREATE CAST (text AS %I) WITH INOUT AS ASSIGNMENT', e);
            ELSIF NOT EXISTS (SELECT 1 FROM pg_cast WHERE castsource = 'text'::regtype AND casttarget = e::regtype) THEN
                EXECUTE format('CREATE CAST (text AS %I) WITH INOUT AS ASSIGNMENT', e);
            END IF;

            -- Remove implicit enum -> text cast if it exists
            IF EXISTS (SELECT 1 FROM pg_cast WHERE castsource = e::regtype AND casttarget = 'text'::regtype AND castcontext = 'i') THEN
                EXECUTE format('DROP CAST (%I AS text)', e);
                EXECUTE format('CREATE CAST (%I AS text) WITH INOUT AS ASSIGNMENT', e);
            ELSIF NOT EXISTS (SELECT 1 FROM pg_cast WHERE castsource = e::regtype AND casttarget = 'text'::regtype) THEN
                EXECUTE format('CREATE CAST (%I AS text) WITH INOUT AS ASSIGNMENT', e);
            END IF;
            
        END IF;
    END LOOP;
END $$;

-- Verify RLS policies and functions that might still be using ambiguous comparisons
-- and add explicit casts to them. (Already did some in previous turn, adding more here for coverage)

-- Fix any media_items RLS policy if still ambiguous
-- Standardizing the "Anyone can view approved media" policy
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_items' AND policyname = 'Anyone can view approved media') THEN
        ALTER POLICY "Anyone can view approved media" ON media_items USING (status::public.item_status = 'approved'::public.item_status);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_items' AND policyname = 'Public View Approved') THEN
        ALTER POLICY "Public View Approved" ON media_items USING (status::public.item_status = 'approved'::public.item_status);
    END IF;
END $$;
