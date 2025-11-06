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
      // Silently try to update content hash (don't fail if no permissions)
      // Use setTimeout to make it truly async and prevent blocking
      setTimeout(() => {
        updateContentVersion(pageKey, defaultContent).catch(() => {});
      }, 0);
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

// Helper function to update content version - completely silent
async function updateContentVersion(pageKey: string, content: PageContent) {
  try {
    const contentHash = createContentHash(content);
    // Use a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 2000)
    );

    await Promise.race([
      supabase
        .from('page_content_versions')
        .upsert({
          page_key: pageKey,
          content_hash: contentHash,
          last_updated: new Date().toISOString()
        }),
      timeoutPromise
    ]);
  } catch (error) {
    // Completely silent - no console logging
    return;
  }
}
