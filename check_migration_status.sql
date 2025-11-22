-- Check migration status
-- Run this in Supabase SQL Editor

-- Check if supabase_migrations schema exists and what migrations have been applied
SELECT EXISTS (
  SELECT 1 FROM information_schema.schemata
  WHERE schema_name = 'supabase_migrations'
) as migrations_schema_exists;

-- Check migration history if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'supabase_migrations') THEN
    -- Try to query migration history
    PERFORM 1;
    RAISE NOTICE 'Migration schema exists - checking history...';

    -- This will fail if the table doesn't exist, but at least we know the schema exists
    BEGIN
      EXECUTE 'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Migration history table may not exist or is not accessible';
    END;
  ELSE
    RAISE NOTICE 'Migration schema does not exist - migrations may not be applied';
  END IF;
END $$;
