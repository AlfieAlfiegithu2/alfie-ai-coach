import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PageContent {
  [key: string]: string | PageContent;
}

export const usePageTranslation = (pageKey: string, defaultContent: PageContent, language: string) => {
  const [content, setContent] = useState<PageContent>(defaultContent);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If English, use default content
    if (language === 'en') {
      setContent(defaultContent);
      return;
    }

    const fetchTranslation = async () => {
      setIsLoading(true);
      
      try {
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
          console.error('Translation error:', error);
          setContent(defaultContent);
        } else if (data?.translation) {
          setContent(data.translation);
        } else {
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
