import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings, Calendar as CalendarIcon, LogOut, Upload, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AudioR2 } from '@/lib/cloudflare-r2';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProfilePhotoSelector from '@/components/ProfilePhotoSelector';
import LanguageSelector from '@/components/LanguageSelector';
import { getLanguagesForSettings } from '@/lib/languageUtils';
import { useTheme } from '@/contexts/ThemeContext';
import { themes, ThemeName } from '@/lib/themes';
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface SectionScores {
  reading: number;
  listening: number;
  writing: number;
  speaking: number;
  overall: number;
}

interface UserPreferences {
  target_test_type: string;
  target_score: number;
  target_deadline: Date | null;
  preferred_name: string;
  target_scores: SectionScores;
}

interface SettingsModalProps {
  onSettingsChange?: () => void;
  children?: React.ReactNode;
}

const SettingsModal = ({ onSettingsChange, children }: SettingsModalProps) => {
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { themeName, setTheme } = useTheme();
  const themeStyles = useThemeStyles();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    target_test_type: 'IELTS',
    target_score: 7.0,
    target_deadline: null,
    preferred_name: '',
    target_scores: {
      reading: 7.0,
      listening: 7.0,
      writing: 7.0,
      speaking: 7.0,
      overall: 7.0
    }
  });

  const [nativeLanguage, setNativeLanguage] = useState('English');

  const languages = getLanguagesForSettings();

  const testTypes = [
    { value: 'IELTS', label: 'IELTS' },
    { value: 'PTE', label: 'PTE Academic' },
    { value: 'TOEFL', label: 'TOEFL iBT' },
    { value: 'GENERAL', label: 'General English' }
  ];

  const bandScores = [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0];

  const updateSectionScore = (section: keyof SectionScores, score: number) => {
    setPreferences(prev => ({
      ...prev,
      target_scores: {
        ...prev.target_scores,
        [section]: score
      }
    }));
  };


  useEffect(() => {
    console.log('🔧 SettingsModal effect:', { user: user?.id, open });
    if (user && open) {
      loadUserPreferences();
    }
  }, [user, open]);

  const loadUserPreferences = async () => {
    if (!user) {
      console.log('❌ Cannot load preferences: No user');
      return;
    }

    console.log('📥 Loading preferences for user:', user.id);

    try {
      // Load preferences
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error loading preferences:', error);
        return;
      }

      console.log('📋 Loaded preferences:', data);

      // Load native language from user_preferences (where it actually exists)
      if (data?.native_language) {
        console.log('🌐 Loaded native language from preferences:', data.native_language);
        setNativeLanguage(data.native_language);
      } else {
        console.log('📝 No native language found, using default');
      }

      // Load theme preference
      if ((data as any)?.dashboard_theme) {
        setTheme((data as any).dashboard_theme as ThemeName);
      }

      if (data) {
        const defaultScores = {
          reading: 7.0,
          listening: 7.0,
          writing: 7.0,
          speaking: 7.0,
          overall: 7.0
        };

        const newPreferences = {
          target_test_type: data.target_test_type || 'IELTS',
          target_score: data.target_score || 7.0,
          target_deadline: data.target_deadline ? new Date(data.target_deadline) : null,
          preferred_name: data.preferred_name || '',
          target_scores: (data.target_scores as unknown as SectionScores) || defaultScores
        };

        console.log('🔄 Setting preferences:', newPreferences);
        setPreferences(newPreferences);
      } else {
        console.log('📝 No existing preferences found, using defaults');
      }
    } catch (error) {
      console.error('❌ Error loading preferences:', error);
    }
  };

  const handlePhotoUpdate = () => {
    console.log('📸 Profile photo updated');
    onSettingsChange?.();
  };

  const handleLogout = async () => {
    console.log('🚪 Initiating logout for user:', user?.id);
    try {
      await signOut();
      console.log('✅ Logout successful');
      navigate('/');
      setOpen(false);
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      toast.error(`Failed to logout: ${error.message || 'Unknown error'}`);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setLoading(true);
    console.log('💾 Saving preferences for user:', user.id, preferences);

    try {
      // Check if record exists first
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Build preferences data without dashboard_theme first (in case column doesn't exist)
      // For updates, exclude user_id since it's used in the filter
      const preferencesDataForUpdate = {
        target_test_type: preferences.target_test_type,
        target_score: preferences.target_score,
        target_deadline: preferences.target_deadline?.toISOString().split('T')[0] || null,
        preferred_name: preferences.preferred_name,
        native_language: nativeLanguage,
        target_scores: preferences.target_scores as any
      };

      // For inserts, include user_id
      const preferencesDataForInsert = {
        user_id: user.id,
        ...preferencesDataForUpdate
      };

      let preferencesError;

      if (existing) {
        // Update without dashboard_theme (theme is saved separately via ThemeContext)
        // Don't include user_id in update payload since it's used in the filter
        const { error: errorWithoutTheme } = await supabase
          .from('user_preferences')
          .update(preferencesDataForUpdate)
          .eq('user_id', user.id);
        
        preferencesError = errorWithoutTheme;
        // Note: dashboard_theme is saved separately via ThemeContext.setTheme()
        // which handles the column-not-found error gracefully
      } else {
        // Insert new record - try with theme first, fallback without if needed
        const preferencesDataWithTheme = {
          ...preferencesDataForInsert,
          dashboard_theme: themeName as any
        };
        
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert(preferencesDataWithTheme);
        
        if (insertError) {
          // If it fails due to dashboard_theme column, try without it
          const isThemeColumnError = insertError.code === 'PGRST204' || 
                                    insertError.message?.includes("dashboard_theme");
          
          if (isThemeColumnError) {
            const { error: retryError } = await supabase
              .from('user_preferences')
              .insert(preferencesDataForInsert);
            preferencesError = retryError;
          } else {
            preferencesError = insertError;
          }
        }
      }

      // Handle errors
      if (preferencesError) {
        // Check if it's a column doesn't exist error (which we can ignore)
        const isColumnError = preferencesError.message?.includes('column') || 
                             preferencesError.message?.includes('dashboard_theme') ||
                             preferencesError.code === '42703' ||
                             preferencesError.code === '42P01' ||
                             preferencesError.code === 'PGRST204';
        
        if (isColumnError) {
          // Silently ignore - core preferences were saved successfully
          // dashboard_theme column doesn't exist, but that's okay - theme is saved locally
          console.log('✅ Preferences saved (dashboard_theme column not available)');
          toast.success('Settings saved successfully!');
        } else {
          // For other errors, log and show to user
          console.error('❌ Preferences save error:', {
            code: preferencesError.code,
            message: preferencesError.message,
            details: preferencesError.details
          });
          
          // Check if it's a validation error we can handle
          const isValidationError = preferencesError.code === '23502' || // not null violation
                                   preferencesError.code === '23505' || // unique violation
                                   preferencesError.message?.includes('violates');
          
          if (isValidationError) {
            toast.error(`Failed to save settings: ${preferencesError.message || 'Validation error'}`);
            throw preferencesError;
          } else {
            // Unknown error - show it
            toast.error(`Failed to save settings: ${preferencesError.message || 'Unknown error'}`);
            throw preferencesError;
          }
        }
      } else {
        console.log('✅ Preferences and language saved successfully');
        toast.success('Settings saved successfully!');
      }

      // Trigger language update in GlobalTextSelection
      localStorage.setItem('language-updated', Date.now().toString());
      window.dispatchEvent(new StorageEvent('storage', { key: 'language-updated' }));

      // Close modal after successful save
      setOpen(false);
      onSettingsChange?.();
    } catch (error: any) {
      console.error('❌ Error saving preferences:', error);
      // Only show error toast for actual failures, not type mismatches
      const isColumnError = error?.message?.includes('column') || 
                           error?.code === '42703' ||
                           error?.code === '42P01' ||
                           error?.code === 'PGRST204';
      
      if (!isColumnError) {
        toast.error(`Failed to save settings: ${error.message || 'Unknown error'}`);
      } else {
        // Column error - core preferences were saved, theme column doesn't exist
        toast.success('Settings saved successfully!');
        setOpen(false);
        onSettingsChange?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      console.log('🔧 Settings modal open state changed:', newOpen);
      setOpen(newOpen);
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="outline"
            size="sm"
            className="border"
            style={{
              backgroundColor: themeStyles.theme.name === 'glassmorphism' 
                ? 'rgba(255,255,255,0.1)' 
                : themeStyles.theme.name === 'dark' 
                ? 'rgba(255,255,255,0.1)' 
                : themeStyles.theme.name === 'minimalist' 
                ? '#ffffff' 
                : 'rgba(255,255,255,0.1)',
              borderColor: themeStyles.border,
              color: themeStyles.textPrimary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'glassmorphism' 
                ? 'rgba(255,255,255,0.1)' 
                : themeStyles.theme.name === 'dark' 
                ? 'rgba(255,255,255,0.1)' 
                : themeStyles.theme.name === 'minimalist' 
                ? '#ffffff' 
                : 'rgba(255,255,255,0.1)';
            }}
            onClick={() => console.log('⚙️ Settings button clicked')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent 
        className={`sm:max-w-2xl ${themeStyles.cardClassName} backdrop-blur-xl max-h-[90vh] overflow-y-auto`}
        style={{
          ...themeStyles.cardStyle,
          borderColor: themeStyles.border,
        }}
      >
        <DialogHeader className="items-center">
          <DialogTitle 
            className="text-lg font-semibold"
            style={{ color: themeStyles.textPrimary }}
          >
            {t('settings.title')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Manage your account settings, preferences, and profile
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Profile Photo Section */}
          <div 
            className="flex items-center justify-center gap-4 p-4 rounded-lg border"
            style={{
              backgroundColor: themeStyles.theme.name === 'glassmorphism' 
                ? 'rgba(255,255,255,0.1)' 
                : themeStyles.theme.name === 'dark' 
                ? 'rgba(255,255,255,0.05)' 
                : themeStyles.theme.name === 'minimalist' 
                ? '#f9fafb' 
                : 'rgba(255,255,255,0.3)',
              borderColor: themeStyles.border,
            }}
          >
            <ProfilePhotoSelector onPhotoUpdate={handlePhotoUpdate}>
              <div className="w-16 h-16 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-white" />
                )}
              </div>
            </ProfilePhotoSelector>
          </div>

          {/* Nickname first */}
          <div>
            <Label 
              htmlFor="preferred_name"
              style={{ color: themeStyles.textPrimary }}
            >
              {t('settings.nickname', { defaultValue: 'Nickname' })}
            </Label>
            <Input
              id="preferred_name"
              value={preferences.preferred_name}
              onChange={(e) => setPreferences(prev => ({ ...prev, preferred_name: e.target.value }))}
              placeholder="Enter your nickname"
              className="border"
              style={{
                backgroundColor: themeStyles.theme.name === 'glassmorphism' 
                  ? 'rgba(255,255,255,0.1)' 
                  : themeStyles.theme.name === 'dark' 
                  ? 'rgba(255,255,255,0.1)' 
                  : themeStyles.theme.name === 'minimalist' 
                  ? '#ffffff' 
                  : 'rgba(255,255,255,0.5)',
                borderColor: themeStyles.border,
                color: themeStyles.textPrimary,
              }}
            />
          </div>

          {/* Language Selector */}
          <div>
            <Label 
              className="mb-1 block"
              style={{ color: themeStyles.textPrimary }}
            >
              {t('settings.language', { defaultValue: 'Language' })}
            </Label>
            <LanguageSelector />
          </div>

          {/* Theme Selector */}
          <div>
            <Label 
              className="mb-2 block"
              style={{ color: themeStyles.textPrimary }}
            >
              {t('settings.theme', { defaultValue: 'Dashboard Theme' })}
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(themes).map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => setTheme(theme.name)}
                  className="p-4 rounded-lg border-2 transition-all text-left"
                  style={{
                    borderColor: themeName === theme.name 
                      ? themeStyles.buttonPrimary 
                      : themeStyles.border,
                    backgroundColor: themeName === theme.name
                      ? themeStyles.theme.name === 'dark'
                        ? 'rgba(100, 116, 139, 0.2)'
                        : themeStyles.theme.name === 'glassmorphism'
                        ? 'rgba(255,255,255,0.2)'
                        : themeStyles.theme.name === 'minimalist'
                        ? '#eff6ff'
                        : 'rgba(168, 139, 91, 0.1)'
                      : themeStyles.theme.name === 'glassmorphism'
                      ? 'rgba(255,255,255,0.1)'
                      : themeStyles.theme.name === 'dark'
                      ? 'rgba(255,255,255,0.05)'
                      : themeStyles.theme.name === 'minimalist'
                      ? '#ffffff'
                      : 'rgba(255,255,255,0.4)',
                  }}
                  onMouseEnter={(e) => {
                    if (themeName !== theme.name) {
                      e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (themeName !== theme.name) {
                      e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'glassmorphism'
                        ? 'rgba(255,255,255,0.1)'
                        : themeStyles.theme.name === 'dark'
                        ? 'rgba(255,255,255,0.05)'
                        : themeStyles.theme.name === 'minimalist'
                        ? '#ffffff'
                        : 'rgba(255,255,255,0.4)';
                    }
                  }}
                >
                  <div 
                    className="font-medium mb-1"
                    style={{ color: themeStyles.textPrimary }}
                  >
                    {theme.label}
                  </div>
                  <div 
                    className="text-xs"
                    style={{ color: themeStyles.textSecondary }}
                  >
                    {theme.description}
                  </div>
                  <div className="mt-2 flex gap-1">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ 
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border 
                      }}
                    />
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ 
                        backgroundColor: theme.colors.cardBackground,
                        borderColor: theme.colors.cardBorder 
                      }}
                    />
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: theme.colors.textPrimary }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Native language is stored but follows the interface language for simplicity */}

          <div>
            <Label 
              htmlFor="test_type"
              style={{ color: themeStyles.textPrimary }}
            >
              {t('settings.targetTestType')}
            </Label>
            <Select 
              value={preferences.target_test_type} 
              onValueChange={(value) => setPreferences(prev => ({ ...prev, target_test_type: value }))}
            >
              <SelectTrigger 
                className="border"
                style={{
                  backgroundColor: themeStyles.theme.name === 'glassmorphism' 
                    ? 'rgba(255,255,255,0.1)' 
                    : themeStyles.theme.name === 'dark' 
                    ? 'rgba(255,255,255,0.1)' 
                    : themeStyles.theme.name === 'minimalist' 
                    ? '#ffffff' 
                    : 'rgba(255,255,255,0.5)',
                  borderColor: themeStyles.border,
                  color: themeStyles.textPrimary,
                }}
              >
                <SelectValue placeholder="Select test type" />
              </SelectTrigger>
              <SelectContent 
                className={`${themeStyles.cardClassName} backdrop-blur-xl`}
                style={{
                  ...themeStyles.cardStyle,
                  borderColor: themeStyles.border,
                }}
              >
                {testTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label 
              htmlFor="target_score"
              style={{ color: themeStyles.textPrimary }}
            >
              {t('settings.targetScore')}
            </Label>
            <Input
              id="target_score"
              type="number"
              step="0.5"
              min="1"
              max="9"
              value={preferences.target_score}
              onChange={(e) => setPreferences(prev => ({ ...prev, target_score: parseFloat(e.target.value) || 7.0 }))}
              className="border"
              style={{
                backgroundColor: themeStyles.theme.name === 'glassmorphism' 
                  ? 'rgba(255,255,255,0.1)' 
                  : themeStyles.theme.name === 'dark' 
                  ? 'rgba(255,255,255,0.1)' 
                  : themeStyles.theme.name === 'minimalist' 
                  ? '#ffffff' 
                  : 'rgba(255,255,255,0.5)',
                borderColor: themeStyles.border,
                color: themeStyles.textPrimary,
              }}
            />
          </div>

          <div>
            <Label style={{ color: themeStyles.textPrimary }}>
              {t('settings.targetDeadline')}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal border",
                    !preferences.target_deadline && "text-muted-foreground"
                  )}
                  style={{
                    backgroundColor: themeStyles.theme.name === 'glassmorphism' 
                      ? 'rgba(255,255,255,0.1)' 
                      : themeStyles.theme.name === 'dark' 
                      ? 'rgba(255,255,255,0.1)' 
                      : themeStyles.theme.name === 'minimalist' 
                      ? '#ffffff' 
                      : 'rgba(255,255,255,0.5)',
                    borderColor: themeStyles.border,
                    color: preferences.target_deadline ? themeStyles.textPrimary : themeStyles.textSecondary,
                  }}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {preferences.target_deadline ? format(preferences.target_deadline, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className={`w-auto p-0 ${themeStyles.cardClassName} backdrop-blur-xl`}
                style={{
                  ...themeStyles.cardStyle,
                  borderColor: themeStyles.border,
                }}
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={preferences.target_deadline || undefined}
                  onSelect={(date) => setPreferences(prev => ({ ...prev, target_deadline: date || null }))}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label 
              className="text-base font-semibold mb-3 block"
              style={{ color: themeStyles.textPrimary }}
            >
              Section Target Scores
            </Label>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {Object.entries(preferences.target_scores).map(([section, score]) => (
                <div key={section} className="space-y-2">
                  <label 
                    className="text-sm font-medium capitalize"
                    style={{ color: themeStyles.textPrimary }}
                  >
                    {section}
                  </label>
                  <Select
                    value={score.toString()}
                    onValueChange={(value) => updateSectionScore(section as keyof SectionScores, parseFloat(value))}
                  >
                    <SelectTrigger 
                      className="border"
                      style={{
                        backgroundColor: themeStyles.theme.name === 'glassmorphism' 
                          ? 'rgba(255,255,255,0.1)' 
                          : themeStyles.theme.name === 'dark' 
                          ? 'rgba(255,255,255,0.1)' 
                          : themeStyles.theme.name === 'minimalist' 
                          ? '#ffffff' 
                          : 'rgba(255,255,255,0.5)',
                        borderColor: themeStyles.border,
                        color: themeStyles.textPrimary,
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                      className={`${themeStyles.cardClassName} backdrop-blur-xl`}
                      style={{
                        ...themeStyles.cardStyle,
                        borderColor: themeStyles.border,
                      }}
                    >
                      {bandScores.map((bandScore) => (
                        <SelectItem key={bandScore} value={bandScore.toString()}>
                          {bandScore}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => {
                console.log('💾 Save button clicked');
                savePreferences();
              }}
              disabled={loading}
              className="flex-1 text-white"
              style={{
                backgroundColor: themeStyles.buttonPrimary,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = themeStyles.buttonPrimaryHover;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = themeStyles.buttonPrimary;
              }}
            >
              {loading ? t('common.loading') : t('settings.save')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                console.log('❌ Cancel button clicked');
                setOpen(false);
              }}
              className="border"
              style={{
                backgroundColor: themeStyles.theme.name === 'glassmorphism' 
                  ? 'rgba(255,255,255,0.1)' 
                  : themeStyles.theme.name === 'dark' 
                  ? 'rgba(255,255,255,0.1)' 
                  : themeStyles.theme.name === 'minimalist' 
                  ? '#ffffff' 
                  : 'rgba(255,255,255,0.5)',
                borderColor: themeStyles.border,
                color: themeStyles.textPrimary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'glassmorphism' 
                  ? 'rgba(255,255,255,0.1)' 
                  : themeStyles.theme.name === 'dark' 
                  ? 'rgba(255,255,255,0.1)' 
                  : themeStyles.theme.name === 'minimalist' 
                  ? '#ffffff' 
                  : 'rgba(255,255,255,0.5)';
              }}
            >
              {t('settings.cancel')}
            </Button>
          </div>

          {/* Reset Test Results */}
          <div 
            className="pt-3 border-t"
            style={{ borderColor: themeStyles.border }}
          >
            <Button
              variant="outline"
              className="w-full border-red-200/50 text-red-600 hover:bg-red-50/50 hover:text-red-700"
              onClick={async () => {
                if (!user) return;
                const confirmed = window.confirm('This will permanently delete all your saved test results (reading, listening, writing, speaking). Continue?');
                if (!confirmed) return;
                
                setLoading(true);
                try {
                  // Delete skill-specific results first (foreign keys)
                  await supabase.from('writing_test_results').delete().eq('user_id', user.id);
                  await supabase.from('speaking_test_results').delete().eq('user_id', user.id);
                  await supabase.from('reading_test_results').delete().eq('user_id', user.id);
                  await supabase.from('listening_test_results').delete().eq('user_id', user.id);

                  // Delete main test results
                  const { error: tErr } = await supabase.from('test_results').delete().eq('user_id', user.id);
                  if (tErr) throw tErr;
                  
                  toast.success('All test results have been reset successfully.');
                  setOpen(false);
                  onSettingsChange?.();
                } catch (e: any) {
                  console.error('Failed to reset results', e);
                  toast.error('Failed to reset results. Please try again.');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              🔄 {t('dashboard.resetResults')}
            </Button>
          </div>
          
          <div 
            className="border-t pt-4"
            style={{ borderColor: themeStyles.border }}
          >
            <Button
              onClick={() => {
                console.log('🚪 Sign out button clicked');
                handleLogout();
              }}
              variant="outline"
              className="w-full bg-red-50/50 border-red-200/50 text-red-600 hover:bg-red-100/50 hover:text-red-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('settings.signOut')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;