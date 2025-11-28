import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings, Calendar as CalendarIcon, LogOut, Upload, User, CreditCard, Crown, Sparkles, CheckCircle2 } from 'lucide-react';
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
import TestTranslationLanguageSelector from '@/components/MotherLanguageSelector';
import { getLanguagesForSettings, codeToEnglishName, englishNameToCode } from '@/lib/languageUtils';
import { useTheme } from '@/contexts/ThemeContext';
import { themes, ThemeName, getStoredTheme, saveTheme } from '@/lib/themes';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SettingsModal = ({ onSettingsChange, children, open: controlledOpen, onOpenChange }: SettingsModalProps) => {
  const { user, signOut, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { themeName, setTheme } = useTheme();
  const themeStyles = useThemeStyles();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled open if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
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
  const [originalPreferences, setOriginalPreferences] = useState<UserPreferences | null>(null);
  const [originalTheme, setOriginalTheme] = useState<ThemeName | null>(null);
  const [originalProfile, setOriginalProfile] = useState<typeof profile | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [nativeLanguage, setNativeLanguage] = useState('English');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'free' | 'pro' | 'premium' | 'ultra'>('free');

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
    setHasUnsavedChanges(true);
  };


  useEffect(() => {
    console.log('🔧 SettingsModal effect:', { user: user?.id, open });
    if (user && open) {
      // Store original theme and profile when opening
      setOriginalTheme(themeName);
      setOriginalProfile(profile ? JSON.parse(JSON.stringify(profile)) : null);
      loadUserPreferences();
    }
  }, [user, open]);

  const loadUserPreferences = async (retryCount = 0) => {
    if (!user) {
      console.log('❌ Cannot load preferences: No user');
      return;
    }

    const maxRetries = 1; // Only retry once
    const retryDelay = 2000; // 2 second delay

    console.log('📥 Loading preferences for user:', user.id);

    try {
      // Load subscription status from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();

      if (profileData?.subscription_status) {
        setSubscriptionStatus(profileData.subscription_status as 'free' | 'pro' | 'premium' | 'ultra');
      }

      // Load preferences
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        // Check if it's a network error that we should retry
        const isNetworkError = error.message?.includes('ERR_CONNECTION_CLOSED') ||
                              error.message?.includes('Failed to fetch') ||
                              error.message?.includes('NetworkError');
        
        if (isNetworkError && retryCount < maxRetries) {
          if (import.meta.env.DEV) {
            console.warn(`Network error loading preferences (attempt ${retryCount + 1}/${maxRetries + 1}), retrying in ${retryDelay}ms...`);
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return loadUserPreferences(retryCount + 1);
        }
        
        // Only log non-network errors in dev mode
        if (!isNetworkError && import.meta.env.DEV) {
          console.error('❌ Error loading preferences:', error);
        }
        return;
      }

      console.log('📋 Loaded preferences:', data);

      // Load native language from user_preferences (where it actually exists)
      // Convert DB code to English name for dropdown
      if (data?.native_language) {
        console.log('🌐 Loaded native language from preferences:', data.native_language);
        const englishName = codeToEnglishName(data.native_language);
        setNativeLanguage(englishName);
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
        // Store original preferences when loading
        setOriginalPreferences(JSON.parse(JSON.stringify(newPreferences)));
      } else {
        console.log('📝 No existing preferences found, using defaults');
        // Store original defaults
        setOriginalPreferences(JSON.parse(JSON.stringify(preferences)));
      }
    } catch (error: any) {
      // Check if it's a network error
      const isNetworkError = error?.message?.includes('ERR_CONNECTION_CLOSED') ||
                            error?.message?.includes('Failed to fetch') ||
                            error?.message?.includes('NetworkError');
      
      // Retry network errors once
      if (isNetworkError && retryCount < 1) {
        if (import.meta.env.DEV) {
          console.warn(`Network error loading preferences (attempt ${retryCount + 1}/2), retrying in 2000ms...`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        return loadUserPreferences(retryCount + 1);
      }
      
      // Only log non-network errors in dev mode
      if (!isNetworkError && import.meta.env.DEV) {
        console.error('❌ Error loading preferences:', error);
      }
    }
  };

  const handlePhotoUpdate = async () => {
    console.log('📸 Profile photo updated');
    // Force refresh profile to show new photo immediately
    if (user) {
      try {
        await refreshProfile();
      } catch (error) {
        console.warn('Error refreshing profile after photo update:', error);
      }
    }
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
      // Convert English name to language code for DB storage
      // NOTE: native_language is for UI language, NOT feedback language
      // preferred_feedback_language is handled separately by TestTranslationLanguageSelector
      const preferencesDataForUpdate = {
        target_test_type: preferences.target_test_type,
        target_score: preferences.target_score,
        target_deadline: preferences.target_deadline?.toISOString().split('T')[0] || null,
        preferred_name: preferences.preferred_name,
        native_language: englishNameToCode(nativeLanguage), // Convert to code for DB - this is UI language
        target_scores: preferences.target_scores as any
        // Do NOT update preferred_feedback_language here - it's handled by TestTranslationLanguageSelector
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
          // Cache nickname for instant display
          if (preferences.preferred_name && user?.id) {
            try {
              localStorage.setItem(`nickname_${user.id}`, JSON.stringify({
                nickname: preferences.preferred_name,
                timestamp: Date.now()
              }));
            } catch (e) {
              // Ignore localStorage errors
            }
          }
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
        // Cache nickname for instant display
        if (preferences.preferred_name && user?.id) {
          try {
            localStorage.setItem(`nickname_${user.id}`, JSON.stringify({
              nickname: preferences.preferred_name,
              timestamp: Date.now()
            }));
          } catch (e) {
            // Ignore localStorage errors
          }
        }
      }

      // Trigger language update in GlobalTextSelection
      localStorage.setItem('language-updated', Date.now().toString());
      window.dispatchEvent(new StorageEvent('storage', { key: 'language-updated' }));

      // Clear original preferences and unsaved changes flag after successful save
      setOriginalPreferences(null);
      setOriginalTheme(null);
      setOriginalProfile(null);
      setHasUnsavedChanges(false);
      
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

  const handleOpenChange = (newOpen: boolean) => {
    console.log('🔧 Settings modal open state changed:', newOpen);
    
    if (!newOpen && hasUnsavedChanges) {
      // When closing without saving (X button or ESC), restore everything
      if (originalPreferences) {
        setPreferences(originalPreferences);
        setOriginalPreferences(null);
      }
      
      // Restore original theme if it was changed (theme is saved to localStorage immediately, so restore it)
      if (originalTheme && originalTheme !== themeName) {
        // Restore theme in context and localStorage
        setTheme(originalTheme);
        saveTheme(originalTheme);
        setOriginalTheme(null);
      }
      
      // Restore original profile photo by refreshing from database
      if (user) {
        refreshProfile();
        setOriginalProfile(null);
      }
      
      setHasUnsavedChanges(false);
    } else if (!newOpen) {
      // Just closing, no unsaved changes - clear tracking
      setOriginalPreferences(null);
      setOriginalTheme(null);
      setOriginalProfile(null);
    }
    
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
        onInteractOutside={(e) => {
          // Prevent closing on outside click - user must use X or Save
          e.preventDefault();
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

          {/* Subscription Status Section */}
          <div 
            className="p-4 rounded-lg border"
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" style={{ color: themeStyles.textSecondary }} />
                <span className="text-sm font-medium" style={{ color: themeStyles.textPrimary }}>
                  Subscription
                </span>
              </div>
              {subscriptionStatus === 'ultra' ? (
                <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 shadow-sm">
                  <Crown className="w-3 h-3 mr-1" />
                  Ultra
                </Badge>
              ) : subscriptionStatus === 'premium' || subscriptionStatus === 'pro' ? (
                <Badge className="bg-gradient-to-r from-[#d97757] to-[#e8956f] text-white border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Pro
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  Explorer (Free)
                </Badge>
              )}
            </div>
            
            {/* Upgrade/Cancel Actions */}
            <div className="flex gap-2">
              {subscriptionStatus === 'free' ? (
                <>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      navigate('/pay?plan=premium');
                    }}
                    className="flex-1 bg-[#d97757] hover:bg-[#c56a4b] text-white text-xs"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Upgrade to Pro
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      navigate('/pay?plan=ultra');
                    }}
                    className="flex-1 border-amber-300 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-xs"
                  >
                    <Crown className="w-3 h-3 mr-1" />
                    Go Ultra
                  </Button>
                </>
              ) : subscriptionStatus !== 'ultra' ? (
                <>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      navigate('/pay?plan=ultra');
                    }}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white text-xs"
                  >
                    <Crown className="w-3 h-3 mr-1" />
                    Upgrade to Ultra
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      navigate('/settings');
                    }}
                    className="text-xs"
                    style={{
                      borderColor: themeStyles.border,
                      color: themeStyles.textSecondary,
                    }}
                  >
                    Manage
                  </Button>
                </>
              ) : (
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full text-xs"
                  style={{
                    borderColor: themeStyles.border,
                    color: themeStyles.textSecondary,
                  }}
                >
                  Manage Subscription
                </Button>
              )}
            </div>
          </div>

          {/* Nickname first */}
          <div>
            <Label 
              htmlFor="preferred_name"
              style={{ color: themeStyles.textPrimary }}
            >
              Nickname
            </Label>
            <Input
              id="preferred_name"
              value={preferences.preferred_name}
              onChange={(e) => {
                setPreferences(prev => ({ ...prev, preferred_name: e.target.value }));
                setHasUnsavedChanges(true);
              }}
              placeholder="Enter your nickname"
              className="focus:outline-none focus:ring-2 focus:ring-offset-0"
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
                outline: 'none',
                boxShadow: 'none',
              }}
            />
          </div>

          {/* Language Selectors - Combined Container */}
          <div 
            className="p-4 rounded-lg border space-y-4"
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
            {/* Display Language Selector */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label 
                  className="block"
                  style={{ color: themeStyles.textPrimary }}
                >
                  Display Language
                </Label>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 cursor-help" style={{ color: themeStyles.textSecondary }} />
                    </TooltipTrigger>
                    <TooltipContent 
                      className="max-w-xs z-[10000]"
                      style={{
                        backgroundColor: themeStyles.cardBackground,
                        borderColor: themeStyles.border,
                        color: themeStyles.textPrimary,
                      }}
                    >
                      <p className="text-sm">
                        Choose the language for displaying the website interface, menus, buttons, and all UI elements. This changes how the website looks to you.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <LanguageSelector />
            </div>

            {/* Preferred Feedback Language Selector */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label 
                  className="block"
                  style={{ color: themeStyles.textPrimary }}
                >
                  Preferred Feedback Language
                </Label>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 cursor-help" style={{ color: themeStyles.textSecondary }} />
                    </TooltipTrigger>
                    <TooltipContent 
                      className="max-w-xs z-[10000]"
                      style={{
                        backgroundColor: themeStyles.cardBackground,
                        borderColor: themeStyles.border,
                        color: themeStyles.textPrimary,
                      }}
                    >
                      <p className="text-sm mb-2">
                        Your native language for receiving feedback and explanations. This helps us provide better translations when you're practicing speaking or writing in English.
                      </p>
                      <p className="text-xs" style={{ color: themeStyles.textSecondary }}>
                        Don't worry - you'll be able to choose if you want the feedback to be in English at the submit page.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <TestTranslationLanguageSelector key={open ? 'open' : 'closed'} />
            </div>
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
                  onClick={() => {
                    setTheme(theme.name);
                    setHasUnsavedChanges(true);
                  }}
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
                        borderColor: theme.colors.border,
                        borderWidth: '1px'
                      }}
                    />
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ 
                        backgroundColor: theme.colors.cardBackground,
                        borderColor: theme.colors.cardBorder,
                        borderWidth: '1px'
                      }}
                    />
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ 
                        backgroundColor: theme.colors.buttonPrimary,
                        borderColor: theme.colors.border,
                        borderWidth: '1px'
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
              onValueChange={(value) => {
                setPreferences(prev => ({ ...prev, target_test_type: value }));
                setHasUnsavedChanges(true);
              }}
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
                side="bottom"
                align="start"
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
                  onSelect={(date) => {
                    setPreferences(prev => ({ ...prev, target_deadline: date || null }));
                    setHasUnsavedChanges(true);
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
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
                      side="bottom"
                      align="start"
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

          <div className="pt-4">
            <Button
              onClick={() => {
                console.log('💾 Save button clicked');
                savePreferences();
              }}
              disabled={loading}
              className="w-full text-white"
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
          </div>

          {/* Reset Test Results and Sign Out - Same Row */}
          <div 
            className="pt-3 border-t flex gap-2"
            style={{ borderColor: themeStyles.border }}
          >
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 transition-all"
                    style={{
                      borderColor: themeStyles.theme.name === 'dark' 
                        ? 'rgba(239, 68, 68, 0.3)' 
                        : 'rgba(239, 68, 68, 0.2)',
                      color: themeStyles.theme.name === 'dark' 
                        ? '#fca5a5' 
                        : '#dc2626',
                      backgroundColor: themeStyles.theme.name === 'dark' 
                        ? 'rgba(239, 68, 68, 0.1)' 
                        : 'rgba(239, 68, 68, 0.05)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'dark' 
                        ? 'rgba(239, 68, 68, 0.2)' 
                        : 'rgba(239, 68, 68, 0.1)';
                      e.currentTarget.style.borderColor = themeStyles.theme.name === 'dark' 
                        ? 'rgba(239, 68, 68, 0.4)' 
                        : 'rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'dark' 
                        ? 'rgba(239, 68, 68, 0.1)' 
                        : 'rgba(239, 68, 68, 0.05)';
                      e.currentTarget.style.borderColor = themeStyles.theme.name === 'dark' 
                        ? 'rgba(239, 68, 68, 0.3)' 
                        : 'rgba(239, 68, 68, 0.2)';
                    }}
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
                    Reset Test Results
                  </Button>
                </TooltipTrigger>
                <TooltipContent 
                  className="max-w-xs z-[10000]"
                  style={{
                    backgroundColor: themeStyles.cardBackground,
                    borderColor: themeStyles.border,
                    color: themeStyles.textPrimary,
                  }}
                >
                  <p className="text-sm">
                    Permanently delete all your saved test results including reading, listening, writing, and speaking scores. This action cannot be undone.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button
              onClick={() => {
                console.log('🚪 Sign out button clicked');
                handleLogout();
              }}
              variant="outline"
              className="flex-1 bg-red-50/50 border-red-200/50 text-red-600 hover:bg-red-100/50 hover:text-red-700"
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