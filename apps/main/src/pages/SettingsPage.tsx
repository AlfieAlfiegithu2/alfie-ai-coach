import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, User, Bell, Globe, Target, Calendar, CreditCard, Crown, Sparkles, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getLanguagesForSettings } from '@/lib/languageUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SubscriptionInfo {
  status: 'free' | 'premium' | 'ultra' | 'explorer' | 'pro';
  displayName: string;
  expiresAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

const SettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    status: 'free',
    displayName: 'Explorer',
    expiresAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null
  });
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
        // Load profile data with subscription info
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, native_language, subscription_status, subscription_expires_at, stripe_customer_id')
          .eq('id', user.id)
          .single();

        // Load user preferences  
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Determine subscription display name
        const subStatus = profileData?.subscription_status || 'free';
        let displayName = 'Explorer';
        if (subStatus === 'premium' || subStatus === 'pro') {
          displayName = 'Pro';
        } else if (subStatus === 'ultra') {
          displayName = 'Ultra';
        }

        setSubscriptionInfo({
          status: subStatus as SubscriptionInfo['status'],
          displayName,
          expiresAt: profileData?.subscription_expires_at || null,
          stripeCustomerId: profileData?.stripe_customer_id || null,
          stripeSubscriptionId: null // Will be fetched if needed
        });

        setSettings({
          name: profileData?.full_name || user.email || '',
          email: user.email || '',
          targetBand: preferences?.target_score?.toString() || '7.5',
          testDate: preferences?.target_deadline || '',
          translationLanguage: profileData?.native_language || 'English',
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
        variant: "destructive"
      });
    }
  };

  const handleCancelSubscription = async () => {
    setCancellingSubscription(true);
    try {
      // Call edge function to cancel subscription
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { userId: user?.id }
      });

      if (error) throw error;

      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled. You'll retain access until the end of your billing period.",
      });

      // Update local state
      setSubscriptionInfo(prev => ({
        ...prev,
        status: 'free',
        displayName: 'Explorer'
      }));

    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: "Cancellation Failed",
        description: error.message || "Please contact support at hello@englishaidol.com",
        variant: "destructive"
      });
    } finally {
      setCancellingSubscription(false);
    }
  };

  const getSubscriptionBadge = () => {
    const { status, displayName } = subscriptionInfo;
    
    if (status === 'ultra') {
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 shadow-lg">
          <Crown className="w-3 h-3 mr-1" />
          {displayName}
        </Badge>
      );
    } else if (status === 'premium' || status === 'pro') {
      return (
        <Badge className="bg-gradient-to-r from-[#d97757] to-[#e8956f] text-white border-0">
          <Sparkles className="w-3 h-3 mr-1" />
          {displayName}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
        {displayName}
      </Badge>
    );
  };

  const isPaidPlan = subscriptionInfo.status === 'premium' || 
                     subscriptionInfo.status === 'pro' || 
                     subscriptionInfo.status === 'ultra';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <CardTitle className="text-2xl">Loading Settings...</CardTitle>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <StudentLayout title="Settings" showBackButton={true}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Subscription Status - Prominent Display */}
        <Card className="card-modern border-2 border-[#d97757]/20 bg-gradient-to-br from-white to-[#faf8f6]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#d97757]" />
              Subscription & Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Plan Display */}
            <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-[#e6e0d4] shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-[#2d2d2d]">
                    {subscriptionInfo.displayName} Plan
                  </span>
                  {getSubscriptionBadge()}
                </div>
                <p className="text-sm text-[#666666]">
                  {isPaidPlan ? (
                    subscriptionInfo.expiresAt ? (
                      <>Active until {new Date(subscriptionInfo.expiresAt).toLocaleDateString()}</>
                    ) : (
                      <>Your subscription is active</>
                    )
                  ) : (
                    <>Free forever • Limited features</>
                  )}
                </p>
              </div>
              {isPaidPlan && (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              )}
            </div>

            {/* Plan Features */}
            <div className="grid gap-3">
              <h4 className="text-sm font-semibold text-[#2d2d2d] uppercase tracking-wide">
                Your Plan Includes:
              </h4>
              {isPaidPlan ? (
                <ul className="grid gap-2 text-sm text-[#666666]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Unlimited AI Practice Tests
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Examiner-Level Detailed Feedback
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Advanced Pronunciation Coaching
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Personalized Study Roadmap
                  </li>
                  {subscriptionInfo.status === 'ultra' && (
                    <>
                      <li className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        1-on-1 Personal Meeting with Developers
                      </li>
                      <li className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        Direct Access to New Beta Features
                      </li>
                    </>
                  )}
                </ul>
              ) : (
                <ul className="grid gap-2 text-sm text-[#666666]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Access to 1 Full Practice Test
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Basic AI Scoring & Feedback
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Limited Vocabulary Builder
                  </li>
                  <li className="flex items-center gap-2 text-[#999999]">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Upgrade for unlimited tests & advanced feedback
                  </li>
                </ul>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {isPaidPlan ? (
                <>
                  {subscriptionInfo.status !== 'ultra' && (
                    <Button 
                      onClick={() => navigate('/pay?plan=ultra')} 
                      className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Ultra
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Your Subscription?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>Are you sure you want to cancel your {subscriptionInfo.displayName} subscription?</p>
                          <p>You'll lose access to:</p>
                          <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                            <li>Unlimited AI Practice Tests</li>
                            <li>Examiner-Level Detailed Feedback</li>
                            <li>Advanced Pronunciation Coaching</li>
                            <li>Personalized Study Roadmap</li>
                          </ul>
                          <p className="mt-3 text-sm">
                            Your access will continue until the end of your current billing period.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep My Subscription</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleCancelSubscription}
                          className="bg-red-600 hover:bg-red-700"
                          disabled={cancellingSubscription}
                        >
                          {cancellingSubscription ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Cancelling...
                            </>
                          ) : (
                            'Yes, Cancel'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => navigate('/pay?plan=premium')} 
                    className="flex-1 bg-[#d97757] hover:bg-[#c56a4b] text-white"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Upgrade to Pro - $49/mo
                  </Button>
                  <Button 
                    onClick={() => navigate('/pay?plan=ultra')} 
                    variant="outline"
                    className="flex-1 border-amber-300 text-amber-600 hover:bg-amber-50"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Go Ultra - $199/mo
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

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
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="input-modern"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  disabled
                  className="input-modern bg-gray-50"
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
                <Select value={settings.targetBand} onValueChange={(value) => setSettings({ ...settings, targetBand: value })}>
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
                  onChange={(e) => setSettings({ ...settings, testDate: e.target.value })}
                  className="input-modern"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="studyGoal">Daily Study Goal (minutes)</Label>
              <Select value={settings.studyGoal} onValueChange={(value) => setSettings({ ...settings, studyGoal: value })}>
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
              <Select value={settings.translationLanguage} onValueChange={(value) => setSettings({ ...settings, translationLanguage: value })}>
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
                onCheckedChange={(checked) => setSettings({ ...settings, notifications: checked })}
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
                onCheckedChange={(checked) => setSettings({ ...settings, emailUpdates: checked })}
              />
            </div>

            <div>
              <Label htmlFor="reminderTime">Daily Reminder Time</Label>
              <Input
                id="reminderTime"
                type="time"
                value={settings.reminderTime}
                onChange={(e) => setSettings({ ...settings, reminderTime: e.target.value })}
                className="input-modern"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="btn-primary bg-[#d97757] hover:bg-[#c56a4b]">
            <Settings className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </StudentLayout>
  );
};

export default SettingsPage;
