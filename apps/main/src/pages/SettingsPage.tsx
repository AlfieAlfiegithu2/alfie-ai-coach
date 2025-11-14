import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, User, Bell, Globe, Target, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getLanguagesForSettings } from '@/lib/languageUtils';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    name: '',
    email: '',
    targetBand: '7.5',
    testDate: '',
    translationLanguage: 'English',
    notifications: true,
    emailUpdates: false,
    reminderTime: '09:00',
    studyGoal: '30'
  });

  // Load user settings on component mount
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Load profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, native_language')
          .eq('id', user.id)
          .single();

        // Load user preferences  
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        setSettings({
          name: profile?.full_name || user.email || '',
          email: user.email || '',
          targetBand: preferences?.target_score?.toString() || '7.5',
          testDate: preferences?.target_deadline || '',
          translationLanguage: profile?.native_language || 'English',
          notifications: true,
          emailUpdates: false,
          reminderTime: '09:00',
          studyGoal: '30'
        });
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      // Update profile
      await supabase
        .from('profiles')
        .update({
          full_name: settings.name,
          native_language: settings.translationLanguage
        })
        .eq('id', user.id);

      // Update or insert user preferences
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          target_score: parseFloat(settings.targetBand),
          target_deadline: settings.testDate || null,
          preferred_name: settings.name
        });

      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardTitle className="text-2xl mb-4">Loading Settings...</CardTitle>
        </Card>
      </div>
    );
  }

  return (
    <StudentLayout title="Settings" showBackButton={true}>
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Profile Settings */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-brand-blue" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) => setSettings({...settings, name: e.target.value})}
                  className="input-modern"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({...settings, email: e.target.value})}
                  className="input-modern"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Study Goals */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-brand-green" />
              Study Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="targetBand">Target IELTS Band</Label>
                <Select value={settings.targetBand} onValueChange={(value) => setSettings({...settings, targetBand: value})}>
                  <SelectTrigger className="glass-button">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6.0">Band 6.0</SelectItem>
                    <SelectItem value="6.5">Band 6.5</SelectItem>
                    <SelectItem value="7.0">Band 7.0</SelectItem>
                    <SelectItem value="7.5">Band 7.5</SelectItem>
                    <SelectItem value="8.0">Band 8.0</SelectItem>
                    <SelectItem value="8.5">Band 8.5</SelectItem>
                    <SelectItem value="9.0">Band 9.0</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="testDate">Target Test Date</Label>
                <Input
                  id="testDate"
                  type="date"
                  value={settings.testDate}
                  onChange={(e) => setSettings({...settings, testDate: e.target.value})}
                  className="input-modern"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="studyGoal">Daily Study Goal (minutes)</Label>
              <Select value={settings.studyGoal} onValueChange={(value) => setSettings({...settings, studyGoal: value})}>
                <SelectTrigger className="glass-button">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Language & Translation */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-brand-purple" />
              Language & Translation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="translationLanguage">Translation Language</Label>
              <Select value={settings.translationLanguage} onValueChange={(value) => setSettings({...settings, translationLanguage: value})}>
                <SelectTrigger className="glass-button">
                  <SelectValue />
                </SelectTrigger>
                 <SelectContent>
                   {getLanguagesForSettings().map(lang => (
                     <SelectItem key={lang.value} value={lang.value}>
                       {lang.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
              </Select>
              <p className="text-sm text-text-secondary mt-1">
                Choose your preferred language for word translations during reading practice
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand-orange" />
              Notifications & Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications">Push Notifications</Label>
                <p className="text-sm text-text-secondary">Receive study reminders and progress updates</p>
              </div>
              <Switch
                id="notifications"
                checked={settings.notifications}
                onCheckedChange={(checked) => setSettings({...settings, notifications: checked})}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailUpdates">Email Updates</Label>
                <p className="text-sm text-text-secondary">Weekly progress reports and study tips</p>
              </div>
              <Switch
                id="emailUpdates"
                checked={settings.emailUpdates}
                onCheckedChange={(checked) => setSettings({...settings, emailUpdates: checked})}
              />
            </div>
            
            <div>
              <Label htmlFor="reminderTime">Daily Reminder Time</Label>
              <Input
                id="reminderTime"
                type="time"
                value={settings.reminderTime}
                onChange={(e) => setSettings({...settings, reminderTime: e.target.value})}
                className="input-modern"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="btn-primary">
            <Settings className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </StudentLayout>
  );
};

export default SettingsPage;