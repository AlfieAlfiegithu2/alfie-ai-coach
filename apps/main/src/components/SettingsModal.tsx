import React, { useState, useEffect, useRef, type RefObject } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings, Calendar as CalendarIcon, LogOut, Upload, User, CreditCard, Sparkles, CheckCircle2, Palette, AlertTriangle, Info, BookOpen, GraduationCap, FileText, Briefcase, Activity, MessageSquare, Globe, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AudioR2 } from '@/lib/cloudflare-r2';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProfilePhotoSelector, { animalPhotos } from '@/components/ProfilePhotoSelector';
import LanguageSelector from '@/components/LanguageSelector';

import WordTranslationLanguageSelector from '@/components/WordTranslationLanguageSelector';
import { getLanguagesForSettings, codeToEnglishName, englishNameToCode } from '@/lib/languageUtils';
import { useTheme } from '@/contexts/ThemeContext';
import { themes, ThemeName, getStoredTheme, saveTheme } from '@/lib/themes';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

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

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
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
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null);

  const [nativeLanguage, setNativeLanguage] = useState('English');
  const [wordTranslationLanguage, setWordTranslationLanguage] = useState<string>('en');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'free' | 'pro' | 'premium' | 'ultra'>('free');
  const [activeTab, setActiveTab] = useState('profile');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedCancelReason, setSelectedCancelReason] = useState<string | null>(null);

  const cancelReasonOptions = [
    { id: 'too_expensive', label: 'Too expensive' },
    { id: 'not_using', label: 'Not using it enough' },
    { id: 'missing_features', label: 'Missing features I need' },
    { id: 'found_alternative', label: 'Found a better alternative' },
    { id: 'temporary', label: 'Just need a break' },
    { id: 'other', label: 'Other reason' },
  ];

  const getPlanFeatures = (plan: string) => {
    if (plan === 'ultra') {
      return [
        'Unlimited AI feedback',
        'Priority support',
        'Advanced analytics',
        'All practice tests',
        'Personalized study plans',
        'Speaking practice with AI',
      ];
    } else if (plan === 'pro' || plan === 'premium') {
      return [
        'Extended AI feedback',
        'More practice tests',
        'Basic analytics',
        'Email support',
      ];
    }
    return [];
  };

  const profileRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<HTMLDivElement>(null);
  const preferencesRef = useRef<HTMLDivElement>(null);
  const appearanceRef = useRef<HTMLDivElement>(null);
  const dangerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const tabRefs: Record<string, RefObject<HTMLDivElement>> = {
    profile: profileRef,
    subscription: subscriptionRef,
    preferences: preferencesRef,
    appearance: appearanceRef,
    danger: dangerRef,
  };

  const scrollToSection = (tab: string) => {
    isScrolling.current = true;
    const ref = tabRefs[tab];
    if (ref?.current && contentRef.current) {
      const top = ref.current.offsetTop - 12;
      contentRef.current.scrollTo({ top, behavior: 'smooth' });
      setTimeout(() => { isScrolling.current = false; }, 800);
    } else {
      // Fallback
      ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => { isScrolling.current = false; }, 800);
    }
    setActiveTab(tab);
  };

  // Scroll spy logic
  useEffect(() => {
    const handleScroll = () => {
      if (isScrolling.current || !contentRef.current) return;

      const scrollPosition = contentRef.current.scrollTop + 100; // Adjusted offset for better accuracy
      const sections = ['profile', 'subscription', 'preferences', 'appearance', 'danger'];

      for (const section of sections) {
        const element = tabRefs[section].current;
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveTab(section);
            break;
          }
        }
      }
    };

    const contentDiv = contentRef.current;
    contentDiv?.addEventListener('scroll', handleScroll);
    return () => contentDiv?.removeEventListener('scroll', handleScroll);
  }, []);

  const freeHighlights = [
    'Daily Practice Limit',
    'Basic Score Analysis',
    'Standard Pronunciation Feedback',
    'Community Access'
  ];

  const proHighlights = [
    'Unlimited AI Practice Tests',
    'Examiner-Level Detailed Feedback',
    'Advanced Pronunciation Coaching',
    'Personalized Study Roadmap'
  ];

  const ultraHighlights = [
    'Everything in Pro',
    '1-on-1 Personal Meeting with Developers',
    'All Premium Templates & E-books',
    'Direct Access to New Beta Features'
  ];

  const testTypes = [
    { value: 'IELTS', label: 'IELTS', icon: Globe, color: 'text-blue-600', bg: 'bg-white' },
    { value: 'PTE', label: 'PTE Academic', icon: GraduationCap, color: 'text-orange-600', bg: 'bg-white' },
    { value: 'TOEFL', label: 'TOEFL iBT', icon: BookOpen, color: 'text-blue-500', bg: 'bg-white' },
    { value: 'TOEIC', label: 'TOEIC', icon: FileText, color: 'text-purple-600', bg: 'bg-white' },
    { value: 'Business', label: 'Business English', icon: Briefcase, color: 'text-amber-600', bg: 'bg-white' },
    { value: 'NCLEX', label: 'NCLEX', icon: Activity, color: 'text-red-600', bg: 'bg-white' },
    { value: 'GENERAL', label: 'General English', icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-white' }
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
    if (user && open) {
      setOriginalTheme(themeName);
      setOriginalProfile(profile ? JSON.parse(JSON.stringify(profile)) : null);
      loadUserPreferences();

      // Randomly select avatar if none exists
      if (!profile?.avatar_url && !tempAvatarUrl) {
        const randomPhoto = animalPhotos[Math.floor(Math.random() * animalPhotos.length)];
        setTempAvatarUrl(randomPhoto.src);
        setHasUnsavedChanges(true);
      }
    }
  }, [user, open, profile?.avatar_url]);

  // Listen for word translation language changes from the selector component
  useEffect(() => {
    const handleWordTransLangUpdate = () => {
      const cached = localStorage.getItem('word_translation_language');
      if (cached) {
        setWordTranslationLanguage(cached);
        console.log('🌐 SettingsModal synced word translation language:', cached);
      }
    };

    window.addEventListener('word-translation-language-updated', handleWordTransLangUpdate);
    return () => {
      window.removeEventListener('word-translation-language-updated', handleWordTransLangUpdate);
    };
  }, []);

  const loadUserPreferences = async (retryCount = 0) => {
    if (!user) {
      console.log('❌ Cannot load preferences: No user');
      return;
    }

    const maxRetries = 1;
    const retryDelay = 2000;

    console.log('📥 Loading preferences for user:', user.id);

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData?.subscription_status) {
        setSubscriptionStatus(profileData.subscription_status as 'free' | 'pro' | 'premium' | 'ultra');
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
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

        if (!isNetworkError && import.meta.env.DEV) {
          console.error('❌ Error loading preferences:', error);
        }
        return;
      }

      console.log('📋 Loaded preferences:', data);

      if (data?.native_language) {
        console.log('🌐 Loaded native language from preferences:', data.native_language);
        const englishName = codeToEnglishName(data.native_language);
        setNativeLanguage(englishName);
      } else {
        console.log('📝 No native language found, using default');
      }

      // Load word translation language
      const dataAny = data as any;
      if (dataAny?.word_translation_language) {
        console.log('🌐 Loaded word translation language from preferences:', dataAny.word_translation_language);
        setWordTranslationLanguage(dataAny.word_translation_language);
        localStorage.setItem('word_translation_language', dataAny.word_translation_language);
      } else if (data?.native_language) {
        // Fallback to native_language if word_translation_language not set
        console.log('📝 No word translation language found, using native_language as fallback');
        setWordTranslationLanguage(data.native_language);
        localStorage.setItem('word_translation_language', data.native_language);
      }

      if ((data as any)?.dashboard_theme) {
        setTheme((data as any).dashboard_theme as ThemeName);
      }

      // Try to find a cached nickname from signup if data is missing
      let cachedNickname = '';
      try {
        if (user?.id) {
          const cached = localStorage.getItem(`nickname_${user.id}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.nickname) cachedNickname = parsed.nickname;
          }
        }
      } catch (e) { }

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
          preferred_name: data.preferred_name || cachedNickname || profile?.full_name || '',
          target_scores: (data.target_scores as unknown as SectionScores) || defaultScores
        };

        console.log('🔄 Setting preferences:', newPreferences);
        setPreferences(newPreferences);
        setOriginalPreferences(JSON.parse(JSON.stringify(newPreferences)));
      } else {
        console.log('📝 No existing preferences found, using defaults with fallbacks');
        const defaultsWithFullName = {
          ...preferences,
          preferred_name: cachedNickname || profile?.full_name || ''
        };
        setPreferences(defaultsWithFullName);
        setOriginalPreferences(JSON.parse(JSON.stringify(defaultsWithFullName)));
      }
    } catch (error: any) {
      const isNetworkError = error?.message?.includes('ERR_CONNECTION_CLOSED') ||
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('NetworkError');

      if (isNetworkError && retryCount < 1) {
        if (import.meta.env.DEV) {
          console.warn(`Network error loading preferences (attempt ${retryCount + 1}/2), retrying in 2000ms...`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        return loadUserPreferences(retryCount + 1);
      }

      if (!isNetworkError && import.meta.env.DEV) {
        console.error('❌ Error loading preferences:', error);
      }
    }
  };

  const handlePhotoUpdate = (url: string) => {
    console.log('📸 Profile photo selected (pending save):', url);
    setTempAvatarUrl(url);
    setHasUnsavedChanges(true);
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

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    const confirmation = window.prompt('Type "DELETE" to confirm account deletion:');
    if (confirmation !== 'DELETE') return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');

      if (error) {
        throw error;
      }

      toast.success('Account deleted successfully');
      await signOut();
      navigate('/');
      setOpen(false);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account automatically. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (reason?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: { reason: reason || 'No reason provided' }
      });
      if (error) throw error;

      toast.success('Subscription cancelled successfully');
      await refreshProfile();
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      toast.error(error.message || 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setLoading(true);
    console.log('💾 Saving preferences for user:', user.id, preferences);

    try {
      if (tempAvatarUrl) {
        console.log('💾 Saving deferred profile photo...');
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ avatar_url: tempAvatarUrl })
          .eq('id', user.id);

        if (profileError) {
          console.error('❌ Failed to save profile photo:', profileError);
        } else {
          await refreshProfile();
          setTempAvatarUrl(null);
        }
      }

      const { data: existing } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Get current word translation language from localStorage (set by WordTranslationLanguageSelector)
      const currentWordTransLang = localStorage.getItem('word_translation_language') || wordTranslationLanguage || 'en';

      const preferencesDataForUpdate = {
        target_test_type: preferences.target_test_type,
        target_score: preferences.target_score,
        target_deadline: preferences.target_deadline?.toISOString().split('T')[0] || null,
        preferred_name: preferences.preferred_name,
        native_language: englishNameToCode(nativeLanguage),
        target_scores: preferences.target_scores as any,
        word_translation_language: currentWordTransLang
      };

      const preferencesDataForInsert = {
        user_id: user.id,
        ...preferencesDataForUpdate
      };

      let preferencesError;

      // Data without word_translation_language (fallback if column doesn't exist)
      const preferencesDataWithoutWordTrans = {
        target_test_type: preferences.target_test_type,
        target_score: preferences.target_score,
        target_deadline: preferences.target_deadline?.toISOString().split('T')[0] || null,
        preferred_name: preferences.preferred_name,
        native_language: englishNameToCode(nativeLanguage),
        target_scores: preferences.target_scores as any
      };

      if (existing) {
        // Try update with word_translation_language first
        const { error: updateError } = await supabase
          .from('user_preferences')
          .update(preferencesDataForUpdate as any)
          .eq('user_id', user.id);

        // If word_translation_language column doesn't exist, retry without it
        if (updateError && (
          updateError.message?.includes('word_translation_language') ||
          updateError.message?.includes('column') ||
          updateError.code === '42703'
        )) {
          console.log('⚠️ word_translation_language column not found, saving without it...');
          const { error: retryError } = await supabase
            .from('user_preferences')
            .update(preferencesDataWithoutWordTrans)
            .eq('user_id', user.id);
          preferencesError = retryError;
        } else {
          preferencesError = updateError;
        }
      } else {
        const preferencesDataWithTheme = {
          ...preferencesDataForInsert,
          dashboard_theme: themeName as any
        };

        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert(preferencesDataWithTheme as any);

        if (insertError) {
          const isColumnError = insertError.code === 'PGRST204' ||
            insertError.message?.includes("dashboard_theme") ||
            insertError.message?.includes("word_translation_language") ||
            insertError.code === '42703';

          if (isColumnError) {
            // Try without theme and word_translation_language
            const { error: retryError } = await supabase
              .from('user_preferences')
              .insert({
                user_id: user.id,
                ...preferencesDataWithoutWordTrans
              });
            preferencesError = retryError;
          } else {
            preferencesError = insertError;
          }
        }
      }

      if (preferencesError) {
        const isColumnError = preferencesError.message?.includes('column') ||
          preferencesError.message?.includes('dashboard_theme') ||
          preferencesError.code === '42703' ||
          preferencesError.code === '42P01' ||
          preferencesError.code === 'PGRST204';

        if (isColumnError) {
          console.log('✅ Preferences saved (dashboard_theme column not available)');
          toast.success('Settings saved successfully!');
          if (preferences.preferred_name && user?.id) {
            try {
              localStorage.setItem(`nickname_${user.id}`, JSON.stringify({
                nickname: preferences.preferred_name,
                timestamp: Date.now()
              }));
            } catch (e) { }
          }
        } else {
          console.error('❌ Preferences save error:', preferencesError);
          const isValidationError = preferencesError.code === '23502' ||
            preferencesError.code === '23505' ||
            preferencesError.message?.includes('violates');

          if (isValidationError) {
            toast.error(`Failed to save settings: ${preferencesError.message || 'Validation error'}`);
            throw preferencesError;
          } else {
            toast.error(`Failed to save settings: ${preferencesError.message || 'Unknown error'}`);
            throw preferencesError;
          }
        }
      } else {
        console.log('✅ Preferences and language saved successfully');
        toast.success('Settings saved successfully!');
        if (preferences.preferred_name && user?.id) {
          try {
            localStorage.setItem(`nickname_${user.id}`, JSON.stringify({
              nickname: preferences.preferred_name,
              timestamp: Date.now()
            }));
          } catch (e) { }
        }
      }

      localStorage.setItem('language-updated', Date.now().toString());
      window.dispatchEvent(new StorageEvent('storage', { key: 'language-updated' }));

      setOriginalPreferences(null);
      setOriginalTheme(null);
      setOriginalProfile(null);
      setHasUnsavedChanges(false);

      onSettingsChange?.();
    } catch (error: any) {
      console.error('❌ Error saving preferences:', error);
      const isColumnError = error?.message?.includes('column') ||
        error?.code === '42703' ||
        error?.code === '42P01' ||
        error?.code === 'PGRST204';

      if (!isColumnError) {
        toast.error(`Failed to save settings: ${error.message || 'Unknown error'}`);
      } else {
        toast.success('Settings saved successfully!');
        onSettingsChange?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasUnsavedChanges) {
      if (originalPreferences) {
        setPreferences(originalPreferences);
        setOriginalPreferences(null);
      }

      if (originalTheme && originalTheme !== themeName) {
        setTheme(originalTheme);
        saveTheme(originalTheme);
        setOriginalTheme(null);
      }

      if (user) {
        refreshProfile();
        setOriginalProfile(null);
      }

      setHasUnsavedChanges(false);
    } else if (!newOpen) {
      setOriginalPreferences(null);
      setOriginalTheme(null);
      setOriginalProfile(null);
    }

    setOpen(newOpen);
  };

  const NavButton = ({ tab, icon: Icon, label }: { tab: string; icon: any; label: string }) => (
    <button
      onClick={() => scrollToSection(tab)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
        activeTab === tab ? "bg-accent/10" : "hover:bg-accent/5"
      )}
      style={{
        color: activeTab === tab ? themeStyles.buttonPrimary : themeStyles.textSecondary,
        backgroundColor: activeTab === tab ? themeStyles.hoverBg : 'transparent'
      }}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <>
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
          className={`w-full h-[100dvh] sm:h-[85vh] sm:max-w-5xl p-0 overflow-hidden ${themeStyles.cardClassName} ${themeStyles.theme.name === 'note' ? '' : 'backdrop-blur-xl'} flex flex-col`}
          style={{
            ...themeStyles.cardStyle,
            borderColor: themeStyles.border,
            backgroundColor: themeStyles.theme.name === 'note' ? themeStyles.backgroundImageColor : (themeStyles.cardStyle as any)?.backgroundColor
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          <div className="sr-only">
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Manage your account settings and preferences.</DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              aria-label="Close"
              className="absolute top-3 right-3 rounded-full p-2 transition focus:outline-none focus-visible:outline-none"
              style={{
                color: themeStyles.textPrimary,
                backgroundColor: themeStyles.cardBackground,
                border: `1px solid ${themeStyles.border}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.hoverBg}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeStyles.cardBackground}
            >
              <X className="w-4 h-4" />
            </button>
          </DialogClose>
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-64 border-r p-6 space-y-1 overflow-y-auto hidden md:block flex-shrink-0" style={{ borderColor: themeStyles.border }}>
              <h2 className="text-xl font-bold mb-6 px-2" style={{ color: themeStyles.textPrimary }}>{t('settings.title')}</h2>
              <NavButton tab="profile" icon={User} label={t('settings.nav.profile')} />
              <NavButton tab="subscription" icon={CreditCard} label={t('settings.nav.subscription')} />
              <NavButton tab="preferences" icon={Settings} label={t('settings.nav.preferences')} />
              <NavButton tab="appearance" icon={Palette} label={t('settings.nav.appearance')} />

              <div className="pt-4 mt-4 border-t" style={{ borderColor: themeStyles.border }}>
                <button
                  onClick={() => scrollToSection('danger')}
                  className={cn("w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors")}
                  style={{
                    color: activeTab === 'danger' ? '#ef4444' : themeStyles.textSecondary,
                    backgroundColor: activeTab === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                  }}
                >
                  <AlertTriangle className="w-4 h-4" />
                  {t('settings.nav.accountActions')}
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto"
              style={{ backgroundColor: themeStyles.backgroundImageColor }}
            >
              <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 md:space-y-8 pb-12 min-h-full flex flex-col">
                <div className="mb-4">
                  <h2 className="text-xl md:text-2xl font-bold" style={{ color: themeStyles.textPrimary }}>
                    {t('settings.title')}
                  </h2>
                </div>

                {/* Profile Section */}
                <div ref={profileRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <ProfilePhotoSelector onPhotoSelect={handlePhotoUpdate}>
                      <div className="w-24 h-24 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity shadow-lg group relative">
                        {tempAvatarUrl || profile?.avatar_url ? (
                          <img src={tempAvatarUrl || profile?.avatar_url || ''} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-white" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Palette className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </ProfilePhotoSelector>
                    <div className="flex-1 space-y-2 min-w-[220px]">
                      <div>
                        <h3 className="font-medium text-lg" style={{ color: themeStyles.textPrimary }}>{t('settings.nicknameProfile')}</h3>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preferred_name" className="text-base" style={{ color: themeStyles.textPrimary }}></Label>
                        <Input
                          id="preferred_name"
                          value={preferences.preferred_name}
                          onChange={(e) => {
                            setPreferences(prev => ({ ...prev, preferred_name: e.target.value }));
                            setHasUnsavedChanges(true);
                          }}
                          placeholder={t('settings.enterNickname')}
                          className="h-12 text-lg px-4"
                          style={{
                            backgroundColor: themeStyles.cardBackground,
                            borderColor: themeStyles.border,
                            color: themeStyles.textPrimary,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subscription Section */}
                <div ref={subscriptionRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div
                    className={`relative overflow-hidden p-6 rounded-xl border ${themeStyles.cardClassName}`}
                    style={{
                      ...themeStyles.cardStyle,
                      borderColor: themeStyles.border
                    }}
                  >
                    <div className="relative z-10 space-y-8">
                      {/* Header Row: Plan & Test Type */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-dashed" style={{ borderColor: themeStyles.border }}>
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="font-bold text-xl" style={{ color: themeStyles.textPrimary }}>{t('settings.currentPlan')}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {subscriptionStatus === 'ultra' ? (
                                <Badge className="px-2 py-0.5 text-xs bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 shadow-sm">
                                  {t('settings.plan.ultra')}
                                </Badge>
                              ) : subscriptionStatus === 'premium' || subscriptionStatus === 'pro' ? (
                                <Badge className="px-2 py-0.5 text-xs bg-gradient-to-r from-[#d97757] to-[#e8956f] text-white border-0">
                                  {t('settings.plan.pro')}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="px-2 py-0.5 text-xs font-normal text-muted-foreground">
                                  {t('settings.plan.free')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{t('settings.preparingFor')}</span>
                          <Select
                            value={preferences.target_test_type}
                            onValueChange={(value) => {
                              setPreferences(prev => ({ ...prev, target_test_type: value }));
                              setHasUnsavedChanges(true);
                            }}
                          >
                            <SelectTrigger className="w-[140px] h-9 bg-transparent" style={{ borderColor: themeStyles.border, color: themeStyles.textPrimary }}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {testTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                              ))}
                              <SelectItem value="GENERAL">{t('settings.testTypes.GENERAL')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        {/* Free Plan Card */}
                        <div className="p-5 rounded-xl border" style={{ borderColor: themeStyles.border, backgroundColor: themeStyles.cardBackground }}>
                          <h4 className="font-semibold text-base mb-4" style={{ color: themeStyles.textPrimary }}>{t('settings.freeFeatures.title')}</h4>
                          <ul className="space-y-3">
                            {['dailyPractice', 'basicAnalysis', 'pronunciation', 'community'].map((key) => (
                              <li key={key} className="flex items-start gap-3 text-sm text-muted-foreground">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                <span className="leading-snug">{t(`settings.freeFeatures.${key}`)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Pro Plan Card */}
                        <div className="p-5 rounded-xl border" style={{ borderColor: subscriptionStatus === 'pro' || subscriptionStatus === 'premium' ? themeStyles.buttonPrimary : themeStyles.border, backgroundColor: themeStyles.cardBackground }}>
                          <h4 className="font-semibold text-base mb-4" style={{ color: themeStyles.textPrimary }}>{t('settings.proFeatures.title')}</h4>
                          <ul className="space-y-3">
                            {['unlimitedPractice', 'detailedFeedback', 'pronunciationCoaching', 'studyRoadmap'].map((key) => (
                              <li key={key} className="flex items-start gap-3 text-sm text-muted-foreground">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 text-[#d97757] flex-shrink-0" />
                                <span className="leading-snug">{t(`settings.proFeatures.${key}`)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Ultra Plan Card */}
                        <div className="p-5 rounded-xl border" style={{ borderColor: subscriptionStatus === 'ultra' ? themeStyles.buttonPrimary : themeStyles.border, backgroundColor: themeStyles.cardBackground }}>
                          <h4 className="font-semibold text-base mb-4" style={{ color: themeStyles.textPrimary }}>{t('settings.ultraFeatures.title')}</h4>
                          <ul className="space-y-3">
                            {['everythingPro', 'personalMeeting', 'premiumTemplates', 'betaAccess'].map((key) => (
                              <li key={key} className="flex items-start gap-3 text-sm text-muted-foreground">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" />
                                <span className="leading-snug">{t(`settings.ultraFeatures.${key}`)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        {subscriptionStatus === 'free' ? (
                          <>
                            <Button
                              size="lg"
                              onClick={() => {
                                setOpen(false);
                                navigate('/pay?plan=premium');
                              }}
                              className="flex-1 bg-[#d97757] hover:bg-[#c56a4b] text-white h-12 shadow-md hover:shadow-lg transition-all"
                            >
                              <Sparkles className="w-5 h-5 mr-2" />
                              {t('settings.upgradePro')}
                            </Button>
                            <Button
                              size="lg"
                              onClick={() => {
                                setOpen(false);
                                navigate('/pay?plan=ultra');
                              }}
                              className="flex-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white h-12 shadow-md hover:shadow-lg transition-all border-0"
                            >
                              {t('settings.goUltra')}
                            </Button>
                          </>
                        ) : subscriptionStatus !== 'ultra' ? (
                          <>
                            <Button
                              size="lg"
                              onClick={() => {
                                setOpen(false);
                                navigate('/pay?plan=ultra');
                              }}
                              className="flex-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white h-12 shadow-md hover:shadow-lg transition-all border-0"
                            >
                              {t('settings.upgradeUltra')}
                            </Button>
                            <Button
                              size="lg"
                              variant="ghost"
                              onClick={() => handleCancelSubscription()}
                              className="flex-1 text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-12"
                              disabled={loading}
                            >
                              {loading ? t('settings.cancel.loading') : t('settings.cancelSubscription')}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => {
                              setOpen(false);
                              navigate('/settings');
                            }}
                            className="w-full bg-transparent h-12 border-dashed"
                            style={{
                              borderColor: themeStyles.border,
                              color: themeStyles.textSecondary,
                            }}
                          >
                            {t('settings.manageSubscription')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preferences Section */}
                <div ref={preferencesRef} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2" style={{ borderColor: themeStyles.border, color: themeStyles.textPrimary }}>{t('settings.languageSettings')}</h3>
                    <div className="grid gap-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Label className="text-base" style={{ color: themeStyles.textPrimary }}>{t('settings.displayLanguage')}</Label>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 cursor-help" style={{ color: themeStyles.textSecondary }} />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{t('settings.displayLanguageTooltip')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <LanguageSelector />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Label className="text-base" style={{ color: themeStyles.textPrimary }}>{t('settings.wordTranslationLanguage')}</Label>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 cursor-help" style={{ color: themeStyles.textSecondary }} />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{t('settings.wordTranslationLanguageTooltip')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <WordTranslationLanguageSelector key={open ? 'open-word' : 'closed-word'} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2" style={{ borderColor: themeStyles.border, color: themeStyles.textPrimary }}>{t('settings.studyGoals')}</h3>

                    <div className="grid md:grid-cols-2 gap-6 pt-1">
                      <div className="space-y-2">
                        <Label style={{ color: themeStyles.textPrimary }}>{t('settings.targetDeadline')}</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn("w-full justify-start text-left font-normal h-10 bg-transparent", !preferences.target_deadline && "text-muted-foreground")}
                              style={{
                                borderColor: themeStyles.border,
                                color: preferences.target_deadline ? themeStyles.textPrimary : themeStyles.textSecondary,
                                backgroundColor: (themeStyles.theme.name === 'dark' || themeStyles.theme.name === 'glassmorphism')
                                  ? themeStyles.backgroundImageColor
                                  : themeStyles.cardBackground
                              }}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" style={{ color: themeStyles.textPrimary }} />
                              {preferences.target_deadline ? format(preferences.target_deadline, "PPP") : <span>{t('settings.pickDate')}</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-0"
                            align="start"
                            style={{
                              backgroundColor: (themeStyles.theme.name === 'dark' || themeStyles.theme.name === 'glassmorphism')
                                ? themeStyles.backgroundImageColor
                                : themeStyles.cardBackground,
                              borderColor: themeStyles.border,
                              color: themeStyles.textPrimary
                            }}
                          >
                            <Calendar
                              mode="single"
                              className="p-3"
                              style={{ color: themeStyles.textPrimary }}
                              selected={preferences.target_deadline || undefined}
                              onSelect={(date) => {
                                setPreferences(prev => ({ ...prev, target_deadline: date || null }));
                                setHasUnsavedChanges(true);
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label style={{ color: themeStyles.textPrimary }}>{t('settings.targetScores')}</Label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {Object.entries(preferences.target_scores).map(([section, score]) => (
                          <div key={section} className="space-y-1.5">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t(`settings.targetScoresSections.${section}`)}</label>
                            <Select
                              value={score.toString()}
                              onValueChange={(value) => updateSectionScore(section as keyof SectionScores, parseFloat(value))}
                            >
                              <SelectTrigger
                                className="h-9 bg-transparent focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                                style={{
                                  borderColor: themeStyles.border,
                                  color: themeStyles.textPrimary,
                                  backgroundColor: themeStyles.cardBackground,
                                  boxShadow: 'none'
                                }}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent style={{ backgroundColor: themeStyles.cardBackground, color: themeStyles.textPrimary, borderColor: themeStyles.border }}>
                                {bandScores.map((bandScore) => (
                                  <SelectItem key={bandScore} value={bandScore.toString()}>{bandScore}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appearance Section */}
                <div ref={appearanceRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="font-semibold text-lg border-b pb-2" style={{ borderColor: themeStyles.border, color: themeStyles.textPrimary }}>{t('settings.appearance')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.values(themes).map((theme) => (
                      <button
                        key={theme.name}
                        onClick={() => {
                          setTheme(theme.name);
                          setHasUnsavedChanges(true);
                        }}
                        className="p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden group"
                        style={{
                          borderColor: themeName === theme.name ? themeStyles.buttonPrimary : themeStyles.border,
                          backgroundColor: themeName === theme.name ? themeStyles.hoverBg : themeStyles.cardBackground,
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold" style={{ color: themeStyles.textPrimary }}>{theme.label}</span>
                          {themeName === theme.name && (
                            <CheckCircle2 className="w-5 h-5" style={{ color: themeStyles.buttonPrimary }} />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">{theme.description}</p>
                        <div className="flex gap-2">
                          {[theme.colors.background, theme.colors.cardBackground, theme.colors.buttonPrimary].map((color, i) => (
                            <div key={i} className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: color, borderColor: theme.colors.border }} />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div
                  className="pt-6 mt-2 border-t flex justify-end py-4"
                  style={{ borderColor: themeStyles.border }}
                >
                  <Button
                    onClick={savePreferences}
                    disabled={loading}
                    size="lg"
                    className="w-full sm:w-auto min-w-[150px] text-white shadow-lg"
                    style={{ backgroundColor: themeStyles.buttonPrimary }}
                  >
                    {loading ? t('common.loading') : t('settings.save')}
                  </Button>
                </div>

                {/* Danger Zone Section */}
                <div ref={dangerRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
                  <h3 className="font-semibold text-lg border-b pb-2" style={{ borderColor: themeStyles.border, color: themeStyles.textPrimary }}>{t('settings.accountActions')}</h3>

                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    {/* Sign Out */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center justify-between p-4 rounded-lg border text-left transition"
                      style={{
                        borderColor: themeStyles.border,
                        backgroundColor: themeStyles.cardBackground,
                        color: themeStyles.textPrimary
                      }}
                    >
                      <span className="font-medium">{t('settings.signOut')}</span>
                      <LogOut className="w-4 h-4" />
                    </button>

                    {/* Cancel Subscription */}
                    <button
                      type="button"
                      onClick={() => setCancelDialogOpen(true)}
                      className="flex items-center justify-between p-4 rounded-lg border text-left transition"
                      style={{
                        borderColor: themeStyles.border,
                        backgroundColor: themeStyles.cardBackground,
                        color: themeStyles.textPrimary
                      }}
                    >
                      <span className="font-medium">{t('settings.cancelSubscription')}</span>
                      <span className="text-sm" style={{ color: themeStyles.textSecondary }}>→</span>
                    </button>

                    {/* Reset Results */}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!user) return;
                        const confirmed = window.confirm(t('settings.resetConfirm'));
                        if (!confirmed) return;

                        setLoading(true);
                        try {
                          await supabase.from('writing_test_results').delete().eq('user_id', user.id);
                          await supabase.from('speaking_test_results').delete().eq('user_id', user.id);
                          await supabase.from('reading_test_results').delete().eq('user_id', user.id);
                          await supabase.from('listening_test_results').delete().eq('user_id', user.id);
                          const { error: tErr } = await supabase.from('test_results').delete().eq('user_id', user.id);
                          if (tErr) throw tErr;

                          toast.success(t('settings.resetSuccess'));
                          setOpen(false);
                          onSettingsChange?.();
                        } catch (e: any) {
                          console.error('Failed to reset results', e);
                          toast.error(t('settings.resetError'));
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="flex items-center justify-between p-4 rounded-lg border text-left transition"
                      style={{
                        borderColor: themeStyles.border,
                        backgroundColor: themeStyles.cardBackground,
                        color: themeStyles.textPrimary
                      }}
                      disabled={loading}
                    >
                      <span className="font-medium">{t('settings.reset')}</span>
                      <span className="text-sm" style={{ color: themeStyles.textSecondary }}>→</span>
                    </button>

                    {/* Delete Account */}
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className="flex items-center justify-between p-4 rounded-lg border text-left transition"
                      style={{
                        borderColor: themeStyles.border,
                        backgroundColor: themeStyles.cardBackground,
                        color: themeStyles.textPrimary
                      }}
                      disabled={loading}
                    >
                      <span className="font-medium" style={{ color: 'crimson' }}>{t('settings.delete')}</span>
                      <span className="text-sm" style={{ color: themeStyles.textSecondary }}>→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Cancel Subscription Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) {
          setCancelReason('');
          setSelectedCancelReason(null);
        }
      }}>
        <DialogContent
          className="sm:max-w-lg"
          style={{
            backgroundColor: themeStyles.cardBackground,
            borderColor: themeStyles.border,
            color: themeStyles.textPrimary
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: themeStyles.textPrimary }}>Cancel Subscription</DialogTitle>
            <DialogDescription style={{ color: themeStyles.textSecondary }}>
              We're sorry to see you go. Please let us know why you're leaving.
            </DialogDescription>
          </DialogHeader>

          {/* Current Plan Info */}
          <div
            className="p-4 rounded-lg border mb-2"
            style={{ borderColor: themeStyles.border, backgroundColor: themeStyles.hoverBg }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: themeStyles.textSecondary }}>Your Current Plan</span>
              <Badge
                className="px-2 py-0.5 text-xs text-white border-0"
                style={{
                  background: subscriptionStatus === 'ultra'
                    ? 'linear-gradient(to right, #f59e0b, #fbbf24)'
                    : 'linear-gradient(to right, #d97757, #e8956f)'
                }}
              >
                {subscriptionStatus === 'ultra' ? 'Ultra' : subscriptionStatus === 'pro' || subscriptionStatus === 'premium' ? 'Pro' : 'Free'}
              </Badge>
            </div>
            <p className="text-sm" style={{ color: themeStyles.textSecondary }}>
              Your subscription will remain active until the end of your current billing period. After that, you'll be moved to the Free plan.
            </p>
          </div>

          {/* Features You'll Lose */}
          {(subscriptionStatus === 'pro' || subscriptionStatus === 'premium' || subscriptionStatus === 'ultra') && (
            <div className="mb-2">
              <p className="text-sm font-medium mb-2" style={{ color: themeStyles.textPrimary }}>Features you'll lose:</p>
              <ul className="space-y-1.5">
                {getPlanFeatures(subscriptionStatus).map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm" style={{ color: themeStyles.textSecondary }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cancellation Reasons */}
          <div className="space-y-3">
            <Label style={{ color: themeStyles.textPrimary }}>Why are you cancelling?</Label>
            <div className="grid gap-2">
              {cancelReasonOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedCancelReason(option.id)}
                  className="flex items-center gap-3 p-3 rounded-lg border text-left transition-colors"
                  style={{
                    borderColor: selectedCancelReason === option.id ? themeStyles.buttonPrimary : themeStyles.border,
                    backgroundColor: selectedCancelReason === option.id ? themeStyles.hoverBg : 'transparent',
                    color: themeStyles.textPrimary
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: selectedCancelReason === option.id ? themeStyles.buttonPrimary : themeStyles.border }}
                  >
                    {selectedCancelReason === option.id && (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeStyles.buttonPrimary }} />
                    )}
                  </div>
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Comments */}
          {selectedCancelReason === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="cancel-reason" style={{ color: themeStyles.textPrimary }}>Tell us more (optional)</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Let us know how we can improve..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="min-h-[80px]"
                style={{
                  backgroundColor: themeStyles.cardBackground,
                  borderColor: themeStyles.border,
                  color: themeStyles.textPrimary
                }}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setCancelReason('');
                setSelectedCancelReason(null);
              }}
              style={{
                borderColor: themeStyles.border,
                color: themeStyles.textPrimary,
                backgroundColor: 'transparent'
              }}
            >
              Keep My Plan
            </Button>
            <Button
              variant="destructive"
              disabled={loading || !selectedCancelReason}
              onClick={async () => {
                const reason = selectedCancelReason === 'other'
                  ? cancelReason
                  : cancelReasonOptions.find(o => o.id === selectedCancelReason)?.label || '';
                await handleCancelSubscription(reason);
                setCancelDialogOpen(false);
                setCancelReason('');
                setSelectedCancelReason(null);
              }}
            >
              {loading ? 'Cancelling...' : 'Cancel Subscription'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SettingsModal;
