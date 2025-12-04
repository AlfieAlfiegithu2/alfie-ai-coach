-- Migration to merge UK/US spelling duplicates in vocab_cards
-- This will:
-- 1. Merge UK/US spelling variants into "UK/US" format
-- 2. Delete duplicate cards
-- 3. Fix exact duplicates (january, december, it)

-- First, let's create a function to safely merge duplicates
CREATE OR REPLACE FUNCTION merge_uk_us_duplicates()
RETURNS TABLE(merged_count int, deleted_count int) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    uk_card RECORD;
    us_card RECORD;
    merged_term TEXT;
    merge_count INT := 0;
    delete_count INT := 0;
    pair RECORD;
BEGIN
    -- UK/US pairs to merge
    FOR pair IN 
        SELECT * FROM (VALUES
            ('sympathise', 'sympathize'),
            ('honour', 'honor'),
            ('fulfil', 'fulfill'),
            ('scrutinise', 'scrutinize'),
            ('harbour', 'harbor'),
            ('personalise', 'personalize'),
            ('personalisation', 'personalization'),
            ('characterisation', 'characterization'),
            ('lacklustre', 'lackluster'),
            ('neutralise', 'neutralize'),
            ('neutralisation', 'neutralization'),
            ('digitalise', 'digitalize'),
            ('digitalisation', 'digitalization'),
            ('archaeologist', 'archeologist'),
            ('catalogue', 'catalog'),
            ('categorisation', 'categorization'),
            ('overemphasise', 'overemphasize'),
            ('penalise', 'penalize'),
            ('popularise', 'popularize'),
            ('crystallise', 'crystallize'),
            ('dehumanise', 'dehumanize'),
            ('endeavour', 'endeavor'),
            ('familiarise', 'familiarize'),
            ('generalisation', 'generalization'),
            ('hospitalise', 'hospitalize'),
            ('humanise', 'humanize'),
            ('idolise', 'idolize'),
            ('industrialise', 'industrialize'),
            ('italicise', 'italicize'),
            ('jeopardise', 'jeopardize'),
            ('mechanise', 'mechanize'),
            ('mediaeval', 'medieval'),
            ('micrometre', 'micrometer'),
            ('millimetre', 'millimeter'),
            ('modernisation', 'modernization'),
            ('modernise', 'modernize'),
            ('offence', 'offense'),
            ('reorganise', 'reorganize'),
            ('revolutionise', 'revolutionize'),
            ('publicise', 'publicize'),
            ('realisation', 'realization'),
            ('tumour', 'tumor'),
            ('utilise', 'utilize'),
            ('vigour', 'vigor'),
            ('socialise', 'socialize'),
            ('disorganised', 'disorganized'),
            ('enrol', 'enroll'),
            ('instil', 'instill'),
            ('neighbouring', 'neighboring'),
            ('unauthorised', 'unauthorized'),
            ('appal', 'appall'),
            ('skilful', 'skillful')
        ) AS pairs(uk, us)
    LOOP
        -- Find UK card
        SELECT * INTO uk_card FROM vocab_cards WHERE LOWER(term) = LOWER(pair.uk) LIMIT 1;
        -- Find US card
        SELECT * INTO us_card FROM vocab_cards WHERE LOWER(term) = LOWER(pair.us) LIMIT 1;
        
        -- If both exist, merge them
        IF uk_card.id IS NOT NULL AND us_card.id IS NOT NULL THEN
            merged_term := pair.uk || '/' || pair.us;
            
            -- Update UK card with merged term
            UPDATE vocab_cards SET term = merged_term WHERE id = uk_card.id;
            
            -- Delete translations for US card
            DELETE FROM vocab_translations WHERE card_id = us_card.id;
            
            -- Delete US card
            DELETE FROM vocab_cards WHERE id = us_card.id;
            
            merge_count := merge_count + 1;
            delete_count := delete_count + 1;
            
            RAISE NOTICE 'Merged: % + % -> %', pair.uk, pair.us, merged_term;
        END IF;
    END LOOP;
    
    -- Fix exact duplicates (case-insensitive)
    -- Keep the oldest entry for each duplicate term
    WITH duplicates AS (
        SELECT id, term, created_at,
               ROW_NUMBER() OVER (PARTITION BY LOWER(term) ORDER BY created_at ASC) as rn
        FROM vocab_cards
    ),
    to_delete AS (
        SELECT id FROM duplicates WHERE rn > 1
    )
    DELETE FROM vocab_translations WHERE card_id IN (SELECT id FROM to_delete);
    
    WITH duplicates AS (
        SELECT id, term, created_at,
               ROW_NUMBER() OVER (PARTITION BY LOWER(term) ORDER BY created_at ASC) as rn
        FROM vocab_cards
    ),
    to_delete AS (
        SELECT id FROM duplicates WHERE rn > 1
    )
    DELETE FROM vocab_cards WHERE id IN (SELECT id FROM to_delete);
    
    GET DIAGNOSTICS delete_count = ROW_COUNT;
    
    RETURN QUERY SELECT merge_count, delete_count;
END;
$$;

-- Execute the merge function
SELECT * FROM merge_uk_us_duplicates();

-- Drop the function after use
DROP FUNCTION IF EXISTS merge_uk_us_duplicates();

