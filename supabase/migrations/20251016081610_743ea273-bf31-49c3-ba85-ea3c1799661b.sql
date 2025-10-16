-- Create optimized function to get only cards needing translation
CREATE OR REPLACE FUNCTION get_cards_needing_translation(
  p_offset INTEGER,
  p_limit INTEGER,
  p_languages TEXT[]
)
RETURNS TABLE (
  id UUID,
  term TEXT,
  context_sentence TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT vc.id, vc.term, vc.context_sentence
  FROM vocab_cards vc
  WHERE vc.is_public = true 
    AND vc.language = 'en'
    AND EXISTS (
      SELECT 1 
      FROM unnest(p_languages) lang
      WHERE NOT EXISTS (
        SELECT 1 
        FROM vocab_translations vt 
        WHERE vt.card_id = vc.id 
          AND vt.lang = lang
      )
    )
  ORDER BY vc.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;