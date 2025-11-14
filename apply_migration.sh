#!/bin/bash

# Script to apply test_subtype migration
# This requires the Supabase database password

echo "Applying test_subtype migration..."

# The SQL to execute
SQL="
ALTER TABLE public.tests
ADD COLUMN IF NOT EXISTS test_subtype TEXT;

ALTER TABLE public.tests
DROP CONSTRAINT IF EXISTS valid_test_subtype;

ALTER TABLE public.tests
ADD CONSTRAINT valid_test_subtype
CHECK (
  (skill_category = 'Writing' AND test_subtype IN ('Academic', 'General')) OR
  (skill_category != 'Writing' AND test_subtype IS NULL) OR
  test_subtype IS NULL
);

UPDATE public.tests
SET test_subtype = 'Academic'
WHERE skill_category = 'Writing' AND test_subtype IS NULL;
"

echo "Migration SQL prepared. Please run this in Supabase SQL Editor:"
echo ""
echo "$SQL"
echo ""
echo "Or visit: https://supabase.com/dashboard/project/cuumxmfzhwljylbdlflj/sql/new"

