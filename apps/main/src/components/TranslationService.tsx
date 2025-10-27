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
          targetLanguage: request.targetLanguage,
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

      if (data.success) {
        // Handle both response formats (DeepSeek format and Google format)
        if (data.result && data.result.translation) {
          // DeepSeek format
          return {
            translatedText: data.result.translation
          };
        } else if (data.translated && data.original) {
          // Google Translate format
          return {
            translatedText: data.translated
          };
        }
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
      'Spanish': {
        'hello': 'hola', 'goodbye': 'adiós', 'yes': 'sí', 'no': 'no',
        'please': 'por favor', 'thank you': 'gracias', 'the': 'el/la'
      },
      'French': {
        'hello': 'bonjour', 'goodbye': 'au revoir', 'yes': 'oui', 'no': 'non',
        'please': 's\'il vous plaît', 'thank you': 'merci', 'the': 'le/la'
      },
      'German': {
        'hello': 'hallo', 'goodbye': 'auf wiedersehen', 'yes': 'ja', 'no': 'nein',
        'please': 'bitte', 'thank you': 'danke', 'the': 'der/die/das'
      },
      'Korean': {
        'hello': '안녕하세요', 'goodbye': '안녕히 가세요', 'yes': '네', 'no': '아니요',
        'please': '제발', 'thank you': '감사합니다', 'the': '그'
      },
      'Japanese': {
        'hello': 'こんにちは', 'goodbye': 'さようなら', 'yes': 'はい', 'no': 'いいえ',
        'please': 'お願いします', 'thank you': 'ありがとうございます', 'the': 'の'
      },
      'Chinese': {
        'hello': '你好', 'goodbye': '再见', 'yes': '是', 'no': '不',
        'please': '请', 'thank you': '谢谢', 'the': '的'
      },
      'Vietnamese': {
        'hello': 'xin chào', 'goodbye': 'tạm biệt', 'yes': 'có', 'no': 'không',
        'please': 'làm ơn', 'thank you': 'cảm ơn', 'the': 'cái'
      },
      'Indonesian': {
        'hello': 'halo', 'goodbye': 'selamat tinggal', 'yes': 'ya', 'no': 'tidak',
        'please': 'tolong', 'thank you': 'terima kasih', 'the': 'yang'
      }
    };

    const lowerText = text.toLowerCase();
    return fallbackTranslations[targetLanguage]?.[lowerText] || `${text} → ${targetLanguage}`;
  }
}

export const translationService = TranslationService.getInstance();