import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings, Calendar as CalendarIcon, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

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
}

const SettingsModal = ({ onSettingsChange }: SettingsModalProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
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

  const [nativeLanguage, setNativeLanguage] = useState('Spanish');

  const languages = [
    { value: 'Spanish', label: 'Spanish (Español)' },
    { value: 'French', label: 'French (Français)' },
    { value: 'German', label: 'German (Deutsch)' },
    { value: 'Italian', label: 'Italian (Italiano)' },
    { value: 'Portuguese', label: 'Portuguese (Português)' },
    { value: 'Chinese', label: 'Chinese (中文)' },
    { value: 'Japanese', label: 'Japanese (日本語)' },
    { value: 'Korean', label: 'Korean (한국어)' },
    { value: 'Arabic', label: 'Arabic (العربية)' },
    { value: 'Hindi', label: 'Hindi (हिन्दी)' },
    { value: 'Vietnamese', label: 'Vietnamese (Tiếng Việt)' },
    { value: 'Indonesian', label: 'Indonesian (Bahasa Indonesia)' },
    { value: 'Thai', label: 'Thai (ไทย)' },
    { value: 'Malay', label: 'Malay (Bahasa Melayu)' },
    { value: 'Filipino', label: 'Filipino (Tagalog)' },
    { value: 'Turkish', label: 'Turkish (Türkçe)' },
    { value: 'Russian', label: 'Russian (Русский)' },
    { value: 'Polish', label: 'Polish (Polski)' },
    { value: 'Dutch', label: 'Dutch (Nederlands)' },
    { value: 'Swedish', label: 'Swedish (Svenska)' },
    { value: 'Norwegian', label: 'Norwegian (Norsk)' },
    { value: 'Danish', label: 'Danish (Dansk)' },
    { value: 'Finnish', label: 'Finnish (Suomi)' },
    { value: 'Hebrew', label: 'Hebrew (עברית)' },
    { value: 'Persian', label: 'Persian (فارسی)' },
    { value: 'Urdu', label: 'Urdu (اردو)' },
    { value: 'Bengali', label: 'Bengali (বাংলা)' },
    { value: 'Tamil', label: 'Tamil (தமிழ்)' },
    { value: 'Telugu', label: 'Telugu (తెలుగు)' },
    { value: 'Marathi', label: 'Marathi (मराठी)' },
    { value: 'Gujarati', label: 'Gujarati (ગુજરાતી)' },
    { value: 'Punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
    { value: 'Czech', label: 'Czech (Čeština)' },
    { value: 'Hungarian', label: 'Hungarian (Magyar)' },
    { value: 'Romanian', label: 'Romanian (Română)' },
    { value: 'Bulgarian', label: 'Bulgarian (Български)' },
    { value: 'Croatian', label: 'Croatian (Hrvatski)' },
    { value: 'Greek', label: 'Greek (Ελληνικά)' },
    { value: 'Ukrainian', label: 'Ukrainian (Українська)' },
    { value: 'Slovak', label: 'Slovak (Slovenčina)' },
    { value: 'Slovenian', label: 'Slovenian (Slovenščina)' },
    { value: 'Estonian', label: 'Estonian (Eesti)' },
    { value: 'Latvian', label: 'Latvian (Latviešu)' },
    { value: 'Lithuanian', label: 'Lithuanian (Lietuvių)' }
  ];

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
    if (user && open) {
      loadUserPreferences();
    }
  }, [user, open]);

  const loadUserPreferences = async () => {
    if (!user) return;

    try {
      // Load preferences
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading preferences:', error);
        return;
      }

      // Load profile for native language
      const { data: profile } = await supabase
        .from('profiles')
        .select('native_language')
        .eq('id', user.id)
        .single();

      if (profile?.native_language) {
        setNativeLanguage(profile.native_language);
      }

      if (data) {
        const defaultScores = {
          reading: 7.0,
          listening: 7.0,
          writing: 7.0,
          speaking: 7.0,
          overall: 7.0
        };
        
        setPreferences({
          target_test_type: data.target_test_type || 'IELTS',
          target_score: data.target_score || 7.0,
          target_deadline: data.target_deadline ? new Date(data.target_deadline) : null,
          preferred_name: data.preferred_name || '',
          target_scores: (data.target_scores as unknown as SectionScores) || defaultScores
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
      setOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Save preferences with proper upsert
      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          target_test_type: preferences.target_test_type,
          target_score: preferences.target_score,
          target_deadline: preferences.target_deadline?.toISOString().split('T')[0] || null,
          preferred_name: preferences.preferred_name,
          target_scores: preferences.target_scores as any
        }, {
          onConflict: 'user_id'
        });

      if (preferencesError) throw preferencesError;

      // Update native language in profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ native_language: nativeLanguage })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success('Settings saved successfully!');
      
      // Trigger language update in GlobalTextSelection
      localStorage.setItem('language-updated', Date.now().toString());
      window.dispatchEvent(new StorageEvent('storage', { key: 'language-updated' }));
      
      setOpen(false);
      onSettingsChange?.();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-white/10 border-white/20 text-slate-800 hover:bg-white/20"
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-white/95 backdrop-blur-xl border-white/20 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-800">Study Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="preferred_name" className="text-slate-700">Preferred Name</Label>
            <Input
              id="preferred_name"
              value={preferences.preferred_name}
              onChange={(e) => setPreferences(prev => ({ ...prev, preferred_name: e.target.value }))}
              placeholder="Enter your preferred name"
              className="bg-white/50 border-white/30"
            />
          </div>

          <div>
            <Label htmlFor="native_language" className="text-slate-700">Translation Language</Label>
            <Select 
              value={nativeLanguage} 
              onValueChange={setNativeLanguage}
            >
              <SelectTrigger className="bg-white/50 border-white/30">
                <SelectValue placeholder="Select your language" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-white/20">
                {languages.map(lang => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="test_type" className="text-slate-700">Target Test Type</Label>
            <Select 
              value={preferences.target_test_type} 
              onValueChange={(value) => setPreferences(prev => ({ ...prev, target_test_type: value }))}
            >
              <SelectTrigger className="bg-white/50 border-white/30">
                <SelectValue placeholder="Select test type" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-white/20">
                {testTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="target_score" className="text-slate-700">Target Score</Label>
            <Input
              id="target_score"
              type="number"
              step="0.5"
              min="1"
              max="9"
              value={preferences.target_score}
              onChange={(e) => setPreferences(prev => ({ ...prev, target_score: parseFloat(e.target.value) || 7.0 }))}
              className="bg-white/50 border-white/30"
            />
          </div>

          <div>
            <Label className="text-slate-700">Target Deadline</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white/50 border-white/30",
                    !preferences.target_deadline && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {preferences.target_deadline ? format(preferences.target_deadline, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white/95 backdrop-blur-xl border-white/20" align="start">
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
            <Label className="text-slate-700 text-base font-semibold mb-3 block">Section Target Scores</Label>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {Object.entries(preferences.target_scores).map(([section, score]) => (
                <div key={section} className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 capitalize">
                    {section}
                  </label>
                  <Select
                    value={score.toString()}
                    onValueChange={(value) => updateSectionScore(section as keyof SectionScores, parseFloat(value))}
                  >
                    <SelectTrigger className="bg-white/50 border-white/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-xl border-white/20">
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
              onClick={savePreferences} 
              disabled={loading}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="bg-white/50 border-white/30"
            >
              Cancel
            </Button>
          </div>
          
          <div className="border-t border-white/20 pt-4">
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="w-full bg-red-50/50 border-red-200/50 text-red-600 hover:bg-red-100/50 hover:text-red-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;