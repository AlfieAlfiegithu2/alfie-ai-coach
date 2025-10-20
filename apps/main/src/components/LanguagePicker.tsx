import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Languages, Globe } from 'lucide-react';

interface LanguagePickerProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

const LanguagePicker: React.FC<LanguagePickerProps> = ({
  selectedLanguage,
  onLanguageChange
}) => {
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
    { code: 'ur', name: 'اردو', flag: '🇵🇰' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'fa', name: 'فارسی', flag: '🇮🇷' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'ne', name: 'नेपाली', flag: '🇳🇵' },
    { code: 'th', name: 'ไทย', flag: '🇹🇭' },
    { code: 'yue', name: '粵語', flag: '🇭🇰' },
    { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
    { code: 'kk', name: 'Қазақша', flag: '🇰🇿' }
  ];

  const selectedLang = languages.find(lang => lang.code === selectedLanguage);

  return (
    <Card className="glass-effect border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Select Your Native Language
        </CardTitle>
        <p className="text-sm text-text-secondary">
          Choose your mother language for better vocabulary and translation support
        </p>
      </CardHeader>
      <CardContent>
        <Select value={selectedLanguage} onValueChange={onLanguageChange}>
          <SelectTrigger className="w-full bg-surface-1/50 border-border/30">
            <SelectValue>
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedLang?.flag}</span>
                <span>{selectedLang?.name}</span>
                <Languages className="w-4 h-4 ml-auto text-text-secondary" />
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {languages.map((language) => (
              <SelectItem key={language.code} value={language.code}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{language.flag}</span>
                  <span>{language.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedLanguage !== 'en' && (
          <div className="mt-3 p-3 bg-primary/10 rounded-lg">
            <p className="text-sm text-primary font-medium">
              ✨ Translation support enabled
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Get vocabulary help and translations in {selectedLang?.name}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LanguagePicker;