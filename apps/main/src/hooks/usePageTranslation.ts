import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PageContent {
  [key: string]: string | string[] | PageContent;
}

// Helper to create content hash
const createContentHash = (content: PageContent): string => {
  // Use a simple hash function that works with Unicode characters
  const str = JSON.stringify(content);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 8);
};

export const usePageTranslation = (pageKey: string, defaultContent: PageContent, language: string) => {
  const [content, setContent] = useState<PageContent>(defaultContent);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If English, use default content
    if (language === 'en') {
      setContent(defaultContent);
      // Skip content version update - this requires service_role permissions
      // and causes 403 errors for regular users. This is a background operation
      // that doesn't affect functionality, so we skip it entirely.
      return;
    }

    const fetchTranslation = async () => {
      setIsLoading(true);

      try {
        // Try to get from cache first (this should work with public read access)
        const { data: cached, error: cacheError } = await supabase
          .from('page_translations')
          .select('content')
          .eq('page_key', pageKey)
          .eq('language_code', language)
          .single();

        if (cached && !cacheError) {
          setContent(cached.content as PageContent);
          setIsLoading(false);
          return;
        }

        // If not cached or cache read failed, request translation
        const { data, error } = await supabase.functions.invoke('translate-page', {
          body: {
            pageKey,
            targetLanguage: language,
            content: defaultContent
          }
        });

        if (error) {
          console.error(`Translation error for ${language}:`, error);
          setContent(defaultContent);
        } else if (data?.translation) {
          console.log(`Successfully loaded translation for ${language}`);
          setContent(data.translation);
        } else {
          console.warn(`No translation data returned for ${language}`);
          setContent(defaultContent);
        }
      } catch (error) {
        console.error('Failed to fetch translation:', error);
        setContent(defaultContent);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranslation();
  }, [pageKey, language]);

  return { content, isLoading };
};

// Helper function to update content version - DISABLED
// This function is disabled because it requires service_role permissions
// and causes 403 errors for regular authenticated users.
// Content version tracking should be handled server-side if needed.
async function updateContentVersion(pageKey: string, content: PageContent) {
  // Function disabled to prevent 403 errors
  // This is a background operation that doesn't affect user experience
  return;
}
