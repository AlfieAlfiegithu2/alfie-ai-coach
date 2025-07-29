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
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
    { code: 'th', name: 'Thai', flag: '🇹🇭' },
    { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
    { code: 'sv', name: 'Swedish', flag: '🇸🇪' }
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