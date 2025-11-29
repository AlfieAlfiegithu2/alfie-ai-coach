import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings, Calendar as CalendarIcon, LogOut, Upload, User, CreditCard, Crown, Sparkles, CheckCircle2, Globe, Palette, AlertTriangle, LayoutDashboard, Info } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('profile');

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
        .maybeSingle();

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

      const preferencesDataForUpdate = {
        target_test_type: preferences.target_test_type,
        target_score: preferences.target_score,
        target_deadline: preferences.target_deadline?.toISOString().split('T')[0] || null,
        preferred_name: preferences.preferred_name,
        native_language: englishNameToCode(nativeLanguage),
        target_scores: preferences.target_scores as any
      };

      const preferencesDataForInsert = {
        user_id: user.id,
        ...preferencesDataForUpdate
      };

      let preferencesError;

      if (existing) {
        const { error: errorWithoutTheme } = await supabase
          .from('user_preferences')
          .update(preferencesDataForUpdate)
          .eq('user_id', user.id);
        
        preferencesError = errorWithoutTheme;
      } else {
        const preferencesDataWithTheme = {
          ...preferencesDataForInsert,
          dashboard_theme: themeName as any
        };
        
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert(preferencesDataWithTheme);
        
        if (insertError) {
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
            } catch (e) {}
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
          } catch (e) {}
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
      onClick={() => setActiveTab(tab)}
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
        className={`max-w-5xl p-0 overflow-hidden ${themeStyles.cardClassName} backdrop-blur-xl h-[85vh] flex flex-col`}
        style={{
          ...themeStyles.cardStyle,
          borderColor: themeStyles.border,
        }}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <div className="sr-only">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your account settings and preferences.</DialogDescription>
        </div>
        <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-64 border-r p-6 space-y-1 overflow-y-auto hidden md:block flex-shrink-0" style={{ borderColor: themeStyles.border }}>
                <h2 className="text-xl font-bold mb-6 px-2" style={{ color: themeStyles.textPrimary }}>Settings</h2>
                <NavButton tab="profile" icon={User} label="Profile" />
                <NavButton tab="subscription" icon={CreditCard} label="Subscription" />
                <NavButton tab="preferences" icon={Settings} label="Preferences" />
                <NavButton tab="appearance" icon={Palette} label="Appearance" />
                
                <div className="pt-4 mt-4 border-t" style={{ borderColor: themeStyles.border }}>
                     <button
                        onClick={() => setActiveTab('danger')}
                        className={cn("w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors")}
            style={{
                            color: activeTab === 'danger' ? '#ef4444' : themeStyles.textSecondary,
                            backgroundColor: activeTab === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                        }}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Danger Zone
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-black/20">
                <div className="p-8 max-w-3xl mx-auto space-y-8 pb-24">
                    {/* Mobile Tab Select */}
                    <div className="md:hidden mb-6">
                        <Select value={activeTab} onValueChange={setActiveTab}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="profile">Profile</SelectItem>
                                <SelectItem value="subscription">Subscription</SelectItem>
                                <SelectItem value="preferences">Preferences</SelectItem>
                                <SelectItem value="appearance">Appearance</SelectItem>
                                <SelectItem value="danger">Danger Zone</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-2xl font-bold" style={{ color: themeStyles.textPrimary }}>
                            {activeTab === 'profile' && 'Profile Settings'}
                            {activeTab === 'subscription' && 'Subscription Plan'}
                            {activeTab === 'preferences' && 'Study Preferences'}
                            {activeTab === 'appearance' && 'Appearance'}
                            {activeTab === 'danger' && 'Danger Zone'}
                        </h2>
                        <p className="text-sm mt-1" style={{ color: themeStyles.textSecondary }}>
                            {activeTab === 'profile' && 'Manage your personal information and profile photo.'}
                            {activeTab === 'subscription' && 'Manage your subscription plan and billing.'}
                            {activeTab === 'preferences' && 'Customize your learning experience and goals.'}
                            {activeTab === 'appearance' && 'Customize the look and feel of your dashboard.'}
                            {activeTab === 'danger' && 'Manage sensitive actions like data deletion and sign out.'}
                        </p>
                    </div>

                    {activeTab === 'profile' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl border" style={{ borderColor: themeStyles.border }}>
                                <ProfilePhotoSelector onPhotoUpdate={handlePhotoUpdate}>
                                    <div className="w-24 h-24 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity ring-4 ring-offset-4 ring-offset-background shadow-lg group relative">
                {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-10 h-10 text-white" />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Upload className="w-6 h-6 text-white" />
                                        </div>
              </div>
            </ProfilePhotoSelector>
                                <div className="text-center sm:text-left">
                                    <h3 className="font-medium text-lg" style={{ color: themeStyles.textPrimary }}>Profile Photo</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Click the avatar to upload a new photo. <br/>Recommended size: 400x400px.</p>
                                </div>
          </div>

                            <div className="space-y-3">
                                <Label htmlFor="preferred_name" className="text-base" style={{ color: themeStyles.textPrimary }}>Nickname</Label>
            <Input
              id="preferred_name"
              value={preferences.preferred_name}
              onChange={(e) => {
                setPreferences(prev => ({ ...prev, preferred_name: e.target.value }));
                setHasUnsavedChanges(true);
              }}
              placeholder="Enter your nickname"
                                    className="h-12 text-lg px-4"
              style={{
                                        backgroundColor: themeStyles.cardBackground,
                borderColor: themeStyles.border,
                color: themeStyles.textPrimary,
              }}
            />
                                <p className="text-sm text-muted-foreground">This is how we'll refer to you in the app.</p>
          </div>
                        </div>
                    )}

                    {activeTab === 'subscription' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div 
                            className="p-6 rounded-xl border shadow-sm relative overflow-hidden"
                            style={{
                              borderColor: themeStyles.border,
                            }}
                          >
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Crown className="w-32 h-32" />
                            </div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 rounded-full bg-accent/10">
                                        <CreditCard className="w-6 h-6" style={{ color: themeStyles.buttonPrimary }} />
                                    </div>
            <div>
                                        <h3 className="font-semibold text-lg" style={{ color: themeStyles.textPrimary }}>Current Plan</h3>
                                        <p className="text-sm text-muted-foreground">Your subscription status</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 mb-8">
                                    {subscriptionStatus === 'ultra' ? (
                                        <Badge className="h-8 px-4 text-sm bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 shadow-sm">
                                        <Crown className="w-4 h-4 mr-2" />
                                        Ultra Plan
                                        </Badge>
                                    ) : subscriptionStatus === 'premium' || subscriptionStatus === 'pro' ? (
                                        <Badge className="h-8 px-4 text-sm bg-gradient-to-r from-[#d97757] to-[#e8956f] text-white border-0">
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Pro Plan
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="h-8 px-4 text-sm bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                        Explorer (Free)
                                        </Badge>
                                    )}
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-3">
                                {subscriptionStatus === 'free' ? (
                                    <>
                                    <Button 
                                        size="lg"
                                        onClick={() => {
                                        setOpen(false);
                                        navigate('/pay?plan=premium');
                                        }}
                                        className="flex-1 bg-[#d97757] hover:bg-[#c56a4b] text-white"
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Upgrade to Pro
                                    </Button>
                                    <Button 
                                        size="lg"
                                        variant="outline"
                                        onClick={() => {
                                        setOpen(false);
                                        navigate('/pay?plan=ultra');
                                        }}
                                        className="flex-1 border-amber-300 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                    >
                                        <Crown className="w-4 h-4 mr-2" />
                                        Go Ultra
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
                                        className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white"
                                    >
                                        <Crown className="w-4 h-4 mr-2" />
                                        Upgrade to Ultra
                                    </Button>
                                    <Button 
                                        size="lg"
                                        variant="outline"
                                        onClick={() => {
                                        setOpen(false);
                                        navigate('/settings');
                                        }}
                                        style={{
                                        borderColor: themeStyles.border,
                                        color: themeStyles.textSecondary,
                                        }}
                                    >
                                        Manage Subscription
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
                                    className="w-full"
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
                          </div>
                        </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             {/* Language Selectors */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg border-b pb-2" style={{ borderColor: themeStyles.border, color: themeStyles.textPrimary }}>Language Settings</h3>
                                <div className="grid gap-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Label className="text-base" style={{ color: themeStyles.textPrimary }}>Display Language</Label>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 cursor-help" style={{ color: themeStyles.textSecondary }} />
                    </TooltipTrigger>
                                                <TooltipContent className="max-w-xs">
                                                <p className="text-sm">Choose the language for displaying the website interface.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <LanguageSelector />
            </div>
            <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Label className="text-base" style={{ color: themeStyles.textPrimary }}>Preferred Feedback Language</Label>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 cursor-help" style={{ color: themeStyles.textSecondary }} />
                    </TooltipTrigger>
                                                <TooltipContent className="max-w-xs">
                                                <p className="text-sm">Your native language for receiving feedback and explanations.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <TestTranslationLanguageSelector key={open ? 'open' : 'closed'} />
            </div>
            </div>
          </div>

                            {/* Study Goals */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg border-b pb-2" style={{ borderColor: themeStyles.border, color: themeStyles.textPrimary }}>Study Goals</h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label style={{ color: themeStyles.textPrimary }}>Target Test</Label>
                                        <Select 
                                        value={preferences.target_test_type} 
                                        onValueChange={(value) => {
                                            setPreferences(prev => ({ ...prev, target_test_type: value }));
                                            setHasUnsavedChanges(true);
                                        }}
                                        >
                                        <SelectTrigger className="h-10 bg-transparent" style={{ borderColor: themeStyles.border, color: themeStyles.textPrimary }}>
                                            <SelectValue placeholder="Select test type" />
                                        </SelectTrigger>
                                        <SelectContent>
                {testTypes.map(type => (
                                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

                                    <div className="space-y-2">
                                        <Label style={{ color: themeStyles.textPrimary }}>Target Deadline</Label>
                                        <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                            variant="outline"
                                            className={cn("w-full justify-start text-left font-normal h-10 bg-transparent", !preferences.target_deadline && "text-muted-foreground")}
                                            style={{ borderColor: themeStyles.border, color: preferences.target_deadline ? themeStyles.textPrimary : themeStyles.textSecondary }}
                                            >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {preferences.target_deadline ? format(preferences.target_deadline, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
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
                                    <Label style={{ color: themeStyles.textPrimary }}>Target Scores</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(preferences.target_scores).map(([section, score]) => (
                                            <div key={section} className="space-y-1.5">
                                            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{section}</label>
                                            <Select
                                                value={score.toString()}
                                                onValueChange={(value) => updateSectionScore(section as keyof SectionScores, parseFloat(value))}
                                            >
                                                <SelectTrigger className="h-9 bg-transparent" style={{ borderColor: themeStyles.border, color: themeStyles.textPrimary }}>
                                                <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
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
                    )}

                    {activeTab === 'appearance' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.values(themes).map((theme) => (
                                    <button
                                    key={theme.name}
              onClick={() => {
                                        setTheme(theme.name);
                                        setHasUnsavedChanges(true);
                                    }}
                                    className={cn(
                                        "p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden group",
                                        themeName === theme.name ? "ring-2 ring-primary ring-offset-2" : "hover:border-primary/50"
                                    )}
              style={{
                                        borderColor: themeName === theme.name ? themeStyles.buttonPrimary : themeStyles.border,
                                        backgroundColor: themeName === theme.name ? themeStyles.hoverBg : 'transparent',
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
                    )}

                    {activeTab === 'danger' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="p-6 rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/30">
                                <h3 className="text-lg font-semibold text-red-600 mb-2">Reset Progress</h3>
                                <p className="text-sm text-muted-foreground mb-6">
                                    Permanently delete all your saved test results including reading, listening, writing, and speaking scores. 
                                    <strong className="block mt-1">This action cannot be undone.</strong>
                                </p>
                  <Button
                                    variant="destructive"
                    onClick={async () => {
                      if (!user) return;
                                        const confirmed = window.confirm('Are you absolutely sure? This will permanently delete all your data.');
                      if (!confirmed) return;
                      
                      setLoading(true);
                      try {
                        await supabase.from('writing_test_results').delete().eq('user_id', user.id);
                        await supabase.from('speaking_test_results').delete().eq('user_id', user.id);
                        await supabase.from('reading_test_results').delete().eq('user_id', user.id);
                        await supabase.from('listening_test_results').delete().eq('user_id', user.id);
                        const { error: tErr } = await supabase.from('test_results').delete().eq('user_id', user.id);
                        if (tErr) throw tErr;
                        
                        toast.success('All test results have been reset successfully.');
                        setOpen(false);
                        onSettingsChange?.();
                      } catch (e: any) {
                        console.error('Failed to reset results', e);
                                            toast.error('Failed to reset results.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    Reset Test Results
                  </Button>
                             </div>

                             <div className="p-6 rounded-xl border" style={{ borderColor: themeStyles.border }}>
                                <h3 className="text-lg font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>Sign Out</h3>
                                <p className="text-sm text-muted-foreground mb-6">
                                    Sign out of your account on this device.
                                </p>
            <Button
                                    onClick={handleLogout}
              variant="outline"
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('settings.signOut')}
            </Button>
                             </div>
                        </div>
                    )}
                    
                    {/* Footer Actions (Save) */}
                    {activeTab !== 'danger' && (
                        <div 
                            className="pt-6 mt-6 border-t flex justify-end sticky bottom-0 py-4" 
                            style={{ 
                                borderColor: themeStyles.border,
                            }}
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
                    )}
                </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;