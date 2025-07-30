import { supabase } from '@/integrations/supabase/client';

interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

interface TranslationResponse {
  translatedText: string;
  error?: string;
}

export class TranslationService {
  private static instance: TranslationService;
  
  private constructor() {}

  public static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  async translateText(request: TranslationRequest): Promise<TranslationResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('translation-service', {
        body: {
          text: request.text,
          targetLang: request.targetLanguage,
          sourceLang: request.sourceLanguage || 'auto',
          includeContext: false
        }
      });

      if (error) {
        console.error('Translation service error:', error);
        return {
          translatedText: this.getFallbackTranslation(request.text, request.targetLanguage),
          error: 'Translation service unavailable'
        };
      }

      if (data.success && data.result) {
        return {
          translatedText: data.result.translation || request.text
        };
      }

      return {
        translatedText: this.getFallbackTranslation(request.text, request.targetLanguage),
        error: 'Translation failed'
      };
    } catch (error) {
      console.error('Translation error:', error);
      return {
        translatedText: this.getFallbackTranslation(request.text, request.targetLanguage),
        error: 'Translation failed'
      };
    }
  }

  // Fallback translations for common words
  private getFallbackTranslation(text: string, targetLanguage: string): string {
    const fallbackTranslations: Record<string, Record<string, string>> = {
      'es': {
        'hello': 'hola',
        'goodbye': 'adiós',
        'yes': 'sí',
        'no': 'no',
        'please': 'por favor',
        'thank you': 'gracias'
      },
      'fr': {
        'hello': 'bonjour',
        'goodbye': 'au revoir',
        'yes': 'oui',
        'no': 'non',
        'please': 's\'il vous plaît',
        'thank you': 'merci'
      },
      'de': {
        'hello': 'hallo',
        'goodbye': 'auf wiedersehen',
        'yes': 'ja',
        'no': 'nein',
        'please': 'bitte',
        'thank you': 'danke'
      }
    };

    const lowerText = text.toLowerCase();
    return fallbackTranslations[targetLanguage]?.[lowerText] || `${text} (${targetLanguage})`;
  }
}

export const translationService = TranslationService.getInstance();