import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import SEO from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { Home, FileText, Mail, Mic, Briefcase, Building2, ChevronRight, Sparkles, Check } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { useToast } from '@/hooks/use-toast';

// Common occupations grouped by industry
const OCCUPATION_OPTIONS = [
  { value: 'software_engineer', label: 'Software Engineer', industry: 'Technology' },
  { value: 'product_manager', label: 'Product Manager', industry: 'Technology' },
  { value: 'data_analyst', label: 'Data Analyst', industry: 'Technology' },
  { value: 'ux_designer', label: 'UX Designer', industry: 'Technology' },
  { value: 'marketing_manager', label: 'Marketing Manager', industry: 'Business' },
  { value: 'sales_representative', label: 'Sales Representative', industry: 'Business' },
  { value: 'financial_analyst', label: 'Financial Analyst', industry: 'Finance' },
  { value: 'accountant', label: 'Accountant', industry: 'Finance' },
  { value: 'project_manager', label: 'Project Manager', industry: 'Business' },
  { value: 'human_resources', label: 'Human Resources', industry: 'Business' },
  { value: 'consultant', label: 'Consultant', industry: 'Business' },
  { value: 'nurse', label: 'Nurse', industry: 'Healthcare' },
  { value: 'doctor', label: 'Doctor', industry: 'Healthcare' },
  { value: 'teacher', label: 'Teacher', industry: 'Education' },
  { value: 'researcher', label: 'Researcher', industry: 'Education' },
  { value: 'lawyer', label: 'Lawyer', industry: 'Legal' },
  { value: 'architect', label: 'Architect', industry: 'Design' },
  { value: 'graphic_designer', label: 'Graphic Designer', industry: 'Design' },
  { value: 'customer_service', label: 'Customer Service', industry: 'Business' },
  { value: 'operations_manager', label: 'Operations Manager', industry: 'Business' },
  { value: 'other', label: 'Other (specify below)', industry: 'Other' },
];

const INDUSTRY_OPTIONS = [
  'Technology',
  'Business',
  'Finance',
  'Healthcare',
  'Education',
  'Legal',
  'Design',
  'Manufacturing',
  'Retail',
  'Hospitality',
  'Real Estate',
  'Government',
  'Non-Profit',
  'Other',
];

const BUSINESS_FEATURES = [
  {
    id: 'resume',
    title: 'Resume Builder',
    description: 'Create ATS-friendly resumes with AI suggestions',
    icon: FileText,
    path: '/business/resume',
    color: 'from-blue-500 to-cyan-500',
    features: ['5 Professional Templates', 'AI Job Analysis', 'ATS Optimization', 'Cover Letter Generator'],
  },
  {
    id: 'email',
    title: 'Email Practice',
    description: 'Master professional email writing',
    icon: Mail,
    path: '/business/email',
    color: 'from-purple-500 to-pink-500',
    features: ['Industry Scenarios', 'AI Feedback', 'Tone Analysis', 'Vocabulary Tips'],
  },
  {
    id: 'interview',
    title: 'Interview Prep',
    description: 'Practice with AI voice interviewer',
    icon: Mic,
    path: '/business/interview',
    color: 'from-orange-500 to-red-500',
    features: ['Voice Conversations', '10 Custom Questions', 'Quality Grading', 'English Proficiency Check'],
  },
];

const BusinessPortal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  // Form state
  const [selectedOccupation, setSelectedOccupation] = useState('');
  const [customOccupation, setCustomOccupation] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [targetRole, setTargetRole] = useState('');

  // Load existing profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading business profile:', error);
        }

        if (data) {
          setHasProfile(true);
          setSelectedOccupation(data.occupation || '');
          setSelectedIndustry(data.industry || '');
          setYearsExperience(data.years_of_experience?.toString() || '');
          setTargetRole(data.target_role || '');
        } else {
          setShowSetup(true);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Auto-set industry when occupation is selected
  useEffect(() => {
    if (selectedOccupation && selectedOccupation !== 'other') {
      const occupation = OCCUPATION_OPTIONS.find(o => o.value === selectedOccupation);
      if (occupation) {
        setSelectedIndustry(occupation.industry);
      }
    }
  }, [selectedOccupation]);

  const handleSaveProfile = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save your profile',
        variant: 'destructive',
      });
      return;
    }

    const occupation = selectedOccupation === 'other' ? customOccupation : selectedOccupation;

    if (!occupation) {
      toast({
        title: 'Occupation required',
        description: 'Please select or enter your occupation',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const profileData = {
        user_id: user.id,
        occupation: occupation,
        industry: selectedIndustry || null,
        years_of_experience: yearsExperience ? parseInt(yearsExperience) : null,
        target_role: targetRole || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('business_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;

      setHasProfile(true);
      setShowSetup(false);
      toast({
        title: 'Profile saved!',
        description: 'Your business profile has been updated',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFeatureClick = (path: string) => {
    if (!hasProfile && !user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in and set up your profile first',
        variant: 'destructive',
      });
      return;
    }

    if (!hasProfile) {
      setShowSetup(true);
      toast({
        title: 'Setup required',
        description: 'Please complete your profile first',
      });
      return;
    }

    navigate(path);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeStyles.theme.colors.background }}>
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen relative ${isNoteTheme ? 'font-serif' : ''}`}
      style={{
        backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
      }}
    >
      {/* Background Texture for Note Theme - ENHANCED NOTEBOOK EFFECT */}
      {(themeStyles.theme.name === 'note') && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-50 z-0"
            style={{
              backgroundColor: '#FFFAF0',
              backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")`,
              mixBlendMode: 'multiply'
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-30 z-0"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/notebook.png")`,
              mixBlendMode: 'multiply',
              filter: 'contrast(1.2)'
            }}
          />
        </>
      )}

      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
            ? 'none'
            : `url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')`,
          backgroundColor: themeStyles.theme.name === 'note' ? '#FFFAF0' : themeStyles.backgroundImageColor
        }} />

      <div className="relative z-10">
        <SEO
          title="Business English Portal"
          description="Master professional English communication. Create ATS-friendly resumes, practice business emails, and prepare for job interviews with AI-powered feedback."
          keywords="business English, resume builder, professional email, interview preparation, career development, job search"
          type="website"
        />

        <StudentLayout title="Business English" showBackButton>
          <div className="space-y-6 max-w-6xl mx-auto px-3 md:px-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => navigate('/hero')}
                className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium transition-colors rounded-md hover:bg-muted"
                style={{ color: themeStyles.textSecondary }}
              >
                {!isNoteTheme && <Home className="h-4 w-4" />}
                {isNoteTheme && <span>Home</span>}
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium" style={{ color: themeStyles.textPrimary }}>
                Business English
              </span>
            </div>

            {/* Hero Section */}
            <div className="text-center mb-8">
              {!isNoteTheme && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-4">
                  <Briefcase className="h-5 w-5 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Career Development</span>
                </div>
              )}
              <h1 className={`text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-3 ${isNoteTheme ? 'font-serif' : ''}`} style={{ color: themeStyles.textPrimary }}>
                Business English
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Build your professional profile and master business communication skills
              </p>
            </div>

            {/* Profile Setup / Display */}
            {showSetup || !hasProfile ? (
              <Card
                className="border-2 border-dashed"
                style={{
                  backgroundColor: themeStyles.theme.colors.cardBackground,
                  borderColor: themeStyles.border
                }}
              >
                <CardHeader className="text-center pb-2">
                  {!isNoteTheme && (
                    <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mb-3">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <CardTitle style={{ color: themeStyles.textPrimary }}>
                    Set Up Your Profile
                  </CardTitle>
                  <CardDescription>
                    Tell us about your career to get personalized content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 max-w-xl mx-auto">
                  {/* Occupation */}
                  <div className="space-y-2">
                    <Label htmlFor="occupation">Your Occupation *</Label>
                    <Select value={selectedOccupation} onValueChange={setSelectedOccupation}>
                      <SelectTrigger id="occupation">
                        <SelectValue placeholder="Select your occupation" />
                      </SelectTrigger>
                      <SelectContent>
                        {OCCUPATION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Occupation */}
                  {selectedOccupation === 'other' && (
                    <div className="space-y-2">
                      <Label htmlFor="customOccupation">Specify Your Occupation *</Label>
                      <Input
                        id="customOccupation"
                        value={customOccupation}
                        onChange={(e) => setCustomOccupation(e.target.value)}
                        placeholder="e.g., Digital Marketing Specialist"
                      />
                    </div>
                  )}

                  {/* Industry */}
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                      <SelectTrigger id="industry">
                        <SelectValue placeholder="Select your industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRY_OPTIONS.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Years of Experience */}
                  <div className="space-y-2">
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Select value={yearsExperience} onValueChange={setYearsExperience}>
                      <SelectTrigger id="experience">
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Entry Level (0-1 years)</SelectItem>
                        <SelectItem value="2">Junior (2-3 years)</SelectItem>
                        <SelectItem value="4">Mid-Level (4-6 years)</SelectItem>
                        <SelectItem value="7">Senior (7-10 years)</SelectItem>
                        <SelectItem value="10">Expert (10+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Target Role */}
                  <div className="space-y-2">
                    <Label htmlFor="targetRole">Target Role (Optional)</Label>
                    <Input
                      id="targetRole"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g., Senior Product Manager at Google"
                    />
                    <p className="text-xs text-muted-foreground">
                      What's your dream job? We'll tailor content to help you get there.
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="w-full bg-gradient-to-r from-amber-50 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                    size="lg"
                    style={{
                      background: isNoteTheme ? themeStyles.theme.colors.buttonPrimary : undefined,
                      color: isNoteTheme ? '#FFF' : undefined
                    }}
                  >
                    {isSaving ? 'Saving...' : 'Save & Continue'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              /* Profile Summary Card */
              <Card
                className="border"
                style={{
                  backgroundColor: themeStyles.theme.colors.cardBackground,
                  borderColor: themeStyles.border
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {!isNoteTheme && (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                          <Briefcase className="h-6 w-6 text-white" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold capitalize" style={{ color: themeStyles.textPrimary }}>
                          {selectedOccupation === 'other' ? customOccupation : selectedOccupation.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedIndustry} {yearsExperience && `• ${yearsExperience}+ years`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSetup(true)}
                    >
                      Edit Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {BUSINESS_FEATURES.map((feature) => {
                const IconComponent = feature.icon;
                return (
                  <SpotlightCard
                    key={feature.id}
                    className="cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                    onClick={() => handleFeatureClick(feature.path)}
                    style={{
                      backgroundColor: themeStyles.theme.colors.cardBackground,
                      borderColor: themeStyles.border,
                    }}
                  >
                    <CardHeader className="pb-3">
                      {!isNoteTheme && (
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                          <IconComponent className="h-7 w-7 text-white" />
                        </div>
                      )}
                      <CardTitle className="text-xl" style={{ color: themeStyles.textPrimary }}>
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-2">
                        {feature.features.map((item, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                            {!isNoteTheme && <Check className="h-4 w-4 text-green-500 flex-shrink-0" />}
                            {isNoteTheme && <span style={{ color: themeStyles.textSecondary }}>•</span>}
                            <span style={{ color: isNoteTheme ? themeStyles.textPrimary : undefined }}>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Get started</span>
                          {!isNoteTheme && <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />}
                        </div>
                      </div>
                    </CardContent>
                  </SpotlightCard>
                );
              })}
            </div>

            {/* Why Business English Section */}
            <Card
              className={`mt-8 border ${!isNoteTheme ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20' : ''}`}
              style={{
                borderColor: themeStyles.border,
                backgroundColor: isNoteTheme ? themeStyles.theme.colors.cardBackground : undefined
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {!isNoteTheme && (
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>
                      Why Business English?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      In today's global job market, professional English communication is essential.
                      Our AI-powered tools help you create compelling resumes that pass ATS systems,
                      write professional emails that make the right impression, and practice interviews
                      with real-time feedback to land your dream job.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </StudentLayout>
      </div>
    </div>
  );
};

export default BusinessPortal;