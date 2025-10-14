-- Create function to get translation statistics
CREATE OR REPLACE FUNCTION get_translation_stats()
RETURNS TABLE (
  total_translations BIGINT,
  unique_cards BIGINT,
  last_translation TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_translations,
    COUNT(DISTINCT card_id)::BIGINT as unique_cards,
    MAX(created_at) as last_translation
  FROM vocab_translations
  WHERE is_system = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;