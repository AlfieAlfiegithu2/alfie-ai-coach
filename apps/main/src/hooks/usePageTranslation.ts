import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PageContent {
  [key: string]: string | string[] | PageContent;
}

// Helper to create content hash
const createContentHash = (content: PageContent): string => {
  return btoa(JSON.stringify(content)).substring(0, 32);
};

export const usePageTranslation = (pageKey: string, defaultContent: PageContent, language: string) => {
  const [content, setContent] = useState<PageContent>(defaultContent);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If English, use default content
    if (language === 'en') {
      setContent(defaultContent);
      // Update content hash for tracking
      updateContentVersion(pageKey, defaultContent);
      return;
    }

    const fetchTranslation = async () => {
      setIsLoading(true);
      
      try {
        // Check if content has changed
        const contentHash = createContentHash(defaultContent);
        const { data: versionData } = await supabase
          .from('page_content_versions')
          .select('content_hash')
          .eq('page_key', pageKey)
          .single();

        // If content changed, invalidate old translations
        if (versionData && versionData.content_hash !== contentHash) {
          await supabase
            .from('page_translations')
            .delete()
            .eq('page_key', pageKey);
        }

        // Try to get from cache first
        const { data: cached } = await supabase
          .from('page_translations')
          .select('content')
          .eq('page_key', pageKey)
          .eq('language_code', language)
          .single();

        if (cached) {
          setContent(cached.content as PageContent);
          setIsLoading(false);
          return;
        }

        // If not cached, request translation
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

// Helper function to update content version
async function updateContentVersion(pageKey: string, content: PageContent) {
  try {
    const contentHash = createContentHash(content);
    await supabase
      .from('page_content_versions')
      .upsert({
        page_key: pageKey,
        content_hash: contentHash,
        last_updated: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to update content version:', error);
  }
}
