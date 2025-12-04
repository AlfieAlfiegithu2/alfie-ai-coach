import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import SEO from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  FileText, Plus, Trash2, Save, Download, Eye, Sparkles, 
  Target, CheckCircle2, AlertCircle, Lightbulb, Copy, 
  ChevronRight, Home, Briefcase, GraduationCap, Award,
  Code, Languages, Mail
} from 'lucide-react';
import { 
  RESUME_TEMPLATES, 
  EMPTY_RESUME_DATA,
  ResumeData,
  ResumeExperience,
  ResumeEducation,
  ResumeCertification,
  ResumeProject
} from '@/components/resume/ResumeTemplates';

const ResumeBuilder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const themeStyles = useThemeStyles();
  const previewRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const [selectedTemplate, setSelectedTemplate] = useState('harvard-classic');
  const [resumeData, setResumeData] = useState<ResumeData>(EMPTY_RESUME_DATA);
  const [resumeId, setResumeId] = useState<string | null>(null);
  
  // Job analysis
  const [jobPost, setJobPost] = useState('');
  const [extractedKeywords, setExtractedKeywords] = useState<string[]>([]);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsSuggestions, setAtsSuggestions] = useState<string[]>([]);
  
  // Cover letter
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [coverLetterCompany, setCoverLetterCompany] = useState('');
  const [coverLetterPosition, setCoverLetterPosition] = useState('');
  
  // Preview
  const [showPreview, setShowPreview] = useState(false);

  // Load existing resume
  useEffect(() => {
    const loadResume = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('resumes')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_primary', true)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading resume:', error);
        }

        if (data) {
          setResumeId(data.id);
          setSelectedTemplate(data.template_id || 'harvard-classic');
          setResumeData({
            fullName: data.full_name || '',
            email: data.email || '',
            phone: data.phone || '',
            location: data.location || '',
            linkedinUrl: data.linkedin_url || '',
            portfolioUrl: data.portfolio_url || '',
            summary: data.summary || '',
            experience: (data.experience as ResumeExperience[]) || [],
            education: (data.education as ResumeEducation[]) || [],
            skills: (data.skills as string[]) || [],
            certifications: (data.certifications as ResumeCertification[]) || [],
            projects: (data.projects as ResumeProject[]) || [],
            languages: (data.languages as { language: string; proficiency: string }[]) || [],
          });
          setJobPost(data.target_job_post || '');
          setExtractedKeywords((data.extracted_keywords as string[]) || []);
          setAtsScore(data.ats_score);
          setAtsSuggestions((data.ats_suggestions as string[]) || []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadResume();
  }, [user]);

  // Auto-fill from user profile
  useEffect(() => {
    if (user && !resumeData.fullName && !resumeData.email) {
      setResumeData(prev => ({
        ...prev,
        email: user.email || '',
      }));
    }
  }, [user]);

  const handleSaveResume = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save your resume',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const resumePayload = {
        user_id: user.id,
        template_id: selectedTemplate,
        full_name: resumeData.fullName,
        email: resumeData.email,
        phone: resumeData.phone,
        location: resumeData.location,
        linkedin_url: resumeData.linkedinUrl || null,
        portfolio_url: resumeData.portfolioUrl || null,
        summary: resumeData.summary,
        experience: resumeData.experience,
        education: resumeData.education,
        skills: resumeData.skills,
        certifications: resumeData.certifications,
        projects: resumeData.projects,
        languages: resumeData.languages,
        target_job_post: jobPost || null,
        extracted_keywords: extractedKeywords,
        ats_score: atsScore,
        ats_suggestions: atsSuggestions,
        is_primary: true,
        updated_at: new Date().toISOString(),
      };

      if (resumeId) {
        const { error } = await supabase
          .from('resumes')
          .update(resumePayload)
          .eq('id', resumeId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('resumes')
          .insert(resumePayload)
          .select('id')
          .single();
        if (error) throw error;
        setResumeId(data.id);
      }

      toast({
        title: 'Resume saved!',
        description: 'Your resume has been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving resume:', error);
      toast({
        title: 'Error',
        description: 'Failed to save resume. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyzeJobPost = async () => {
    if (!jobPost.trim()) {
      toast({
        title: 'Job post required',
        description: 'Please paste a job description to analyze',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('resume-ai-assistant', {
        body: {
          action: 'analyze_job',
          jobPost: jobPost,
          resumeData: resumeData,
        },
      });

      if (error) throw error;

      if (data.success) {
        setExtractedKeywords(data.keywords || []);
        setAtsScore(data.atsScore || 0);
        setAtsSuggestions(data.suggestions || []);
        
        toast({
          title: 'Analysis complete!',
          description: `Your resume matches ${data.atsScore}% of the job requirements`,
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Error analyzing job:', error);
      toast({
        title: 'Analysis failed',
        description: 'Could not analyze the job post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!coverLetterCompany || !coverLetterPosition) {
      toast({
        title: 'Missing information',
        description: 'Please enter the company name and position',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingCoverLetter(true);

    try {
      const { data, error } = await supabase.functions.invoke('resume-ai-assistant', {
        body: {
          action: 'generate_cover_letter',
          resumeData: resumeData,
          jobPost: jobPost,
          companyName: coverLetterCompany,
          position: coverLetterPosition,
        },
      });

      if (error) throw error;

      if (data.success && data.coverLetter) {
        setCoverLetter(data.coverLetter);
        toast({
          title: 'Cover letter generated!',
          description: 'Your personalized cover letter is ready',
        });
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Error generating cover letter:', error);
      toast({
        title: 'Generation failed',
        description: 'Could not generate cover letter. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!previewRef.current) {
      toast({
        title: 'Error',
        description: 'Please preview your resume first',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingPDF(true);

    try {
      const element = previewRef.current;
      
      // Configure html2canvas options for better quality
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      // Calculate PDF dimensions (A4: 210mm x 297mm)
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // If content is taller than one page, add multiple pages
      const pageHeight = 297; // A4 height in mm
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename
      const fileName = resumeData.fullName 
        ? `${resumeData.fullName.replace(/\s+/g, '_')}_Resume.pdf`
        : 'Resume.pdf';

      // Save PDF
      pdf.save(fileName);

      toast({
        title: 'PDF Downloaded!',
        description: 'Your resume has been downloaded successfully',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'PDF Generation Failed',
        description: 'Could not generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Experience management
  const addExperience = () => {
    const newExp: ResumeExperience = {
      id: crypto.randomUUID(),
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      achievements: [''],
    };
    setResumeData(prev => ({
      ...prev,
      experience: [...prev.experience, newExp],
    }));
  };

  const updateExperience = (id: string, field: keyof ResumeExperience, value: any) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    }));
  };

  const removeExperience = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id),
    }));
  };

  // Education management
  const addEducation = () => {
    const newEdu: ResumeEducation = {
      id: crypto.randomUUID(),
      institution: '',
      degree: '',
      field: '',
      location: '',
      graduationDate: '',
    };
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, newEdu],
    }));
  };

  const updateEducation = (id: string, field: keyof ResumeEducation, value: string) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    }));
  };

  const removeEducation = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id),
    }));
  };

  // Skills management
  const [newSkill, setNewSkill] = useState('');
  
  const addSkill = () => {
    if (newSkill.trim() && !resumeData.skills.includes(newSkill.trim())) {
      setResumeData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setResumeData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill),
    }));
  };

  // Get selected template component
  const SelectedTemplateComponent = RESUME_TEMPLATES.find(t => t.id === selectedTemplate)?.component;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeStyles.theme.colors.background }}>
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: themeStyles.theme.colors.background }}>
      <SEO
        title="Resume Builder - Business English"
        description="Create professional, ATS-friendly resumes with AI-powered suggestions. Choose from 5 beautiful templates."
        keywords="resume builder, ATS resume, professional resume, job application, cover letter"
      />

      <StudentLayout title="Resume Builder" showBackButton backPath="/business-portal">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate('/hero')} className="text-muted-foreground hover:text-primary">
              <Home className="h-4 w-4" />
            </button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <button onClick={() => navigate('/business-portal')} className="text-muted-foreground hover:text-primary">
              Business English
            </button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span style={{ color: themeStyles.textPrimary }}>Resume Builder</span>
          </div>

          {/* Header Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: themeStyles.textPrimary }}>Resume Builder</h1>
              <p className="text-muted-foreground">Create an ATS-optimized resume that gets you interviews</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPreview(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleSaveResume} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Editor - Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Template Selection */}
              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    Choose Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {RESUME_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          selectedTemplate === template.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                            : 'border-border hover:border-blue-300'
                        }`}
                      >
                        <p className="font-medium text-sm" style={{ color: themeStyles.textPrimary }}>{template.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{template.bestFor}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Resume Form Tabs */}
              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                <Tabs defaultValue="personal" className="w-full">
                  <CardHeader className="pb-0">
                    <TabsList className="grid grid-cols-5 w-full">
                      <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
                      <TabsTrigger value="experience" className="text-xs">Experience</TabsTrigger>
                      <TabsTrigger value="education" className="text-xs">Education</TabsTrigger>
                      <TabsTrigger value="skills" className="text-xs">Skills</TabsTrigger>
                      <TabsTrigger value="extra" className="text-xs">Extra</TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {/* Personal Information Tab */}
                    <TabsContent value="personal" className="space-y-4 mt-0">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="fullName">Full Name *</Label>
                          <Input
                            id="fullName"
                            value={resumeData.fullName}
                            onChange={(e) => setResumeData(prev => ({ ...prev, fullName: e.target.value }))}
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={resumeData.email}
                            onChange={(e) => setResumeData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="john@example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={resumeData.phone}
                            onChange={(e) => setResumeData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                        <div>
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            value={resumeData.location}
                            onChange={(e) => setResumeData(prev => ({ ...prev, location: e.target.value }))}
                            placeholder="San Francisco, CA"
                          />
                        </div>
                        <div>
                          <Label htmlFor="linkedin">LinkedIn URL</Label>
                          <Input
                            id="linkedin"
                            value={resumeData.linkedinUrl}
                            onChange={(e) => setResumeData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                            placeholder="linkedin.com/in/johndoe"
                          />
                        </div>
                        <div>
                          <Label htmlFor="portfolio">Portfolio URL</Label>
                          <Input
                            id="portfolio"
                            value={resumeData.portfolioUrl}
                            onChange={(e) => setResumeData(prev => ({ ...prev, portfolioUrl: e.target.value }))}
                            placeholder="johndoe.com"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="summary">Professional Summary</Label>
                        <Textarea
                          id="summary"
                          value={resumeData.summary}
                          onChange={(e) => setResumeData(prev => ({ ...prev, summary: e.target.value }))}
                          placeholder="A brief 2-3 sentence summary of your professional background and key achievements..."
                          rows={4}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Tip: Include keywords from the job description for better ATS matching
                        </p>
                      </div>
                    </TabsContent>

                    {/* Experience Tab */}
                    <TabsContent value="experience" className="space-y-4 mt-0">
                      {resumeData.experience.map((exp, index) => (
                        <Card key={exp.id} className="p-4 relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => removeExperience(exp.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Company *</Label>
                                <Input
                                  value={exp.company}
                                  onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                                  placeholder="Company Name"
                                />
                              </div>
                              <div>
                                <Label>Position *</Label>
                                <Input
                                  value={exp.position}
                                  onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                                  placeholder="Job Title"
                                />
                              </div>
                              <div>
                                <Label>Location</Label>
                                <Input
                                  value={exp.location}
                                  onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                                  placeholder="City, State"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label>Start Date</Label>
                                  <Input
                                    value={exp.startDate}
                                    onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                                    placeholder="Jan 2020"
                                  />
                                </div>
                                <div>
                                  <Label>End Date</Label>
                                  <Input
                                    value={exp.current ? 'Present' : exp.endDate}
                                    onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                                    placeholder="Present"
                                    disabled={exp.current}
                                  />
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label>Achievements (one per line)</Label>
                              <Textarea
                                value={exp.achievements.join('\n')}
                                onChange={(e) => updateExperience(exp.id, 'achievements', e.target.value.split('\n'))}
                                placeholder="• Led team of 5 engineers to deliver project 2 weeks early&#10;• Increased revenue by 25% through optimization&#10;• Implemented CI/CD pipeline reducing deploy time by 50%"
                                rows={4}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Start each achievement with an action verb and include metrics when possible
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                      <Button variant="outline" onClick={addExperience} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Experience
                      </Button>
                    </TabsContent>

                    {/* Education Tab */}
                    <TabsContent value="education" className="space-y-4 mt-0">
                      {resumeData.education.map((edu) => (
                        <Card key={edu.id} className="p-4 relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => removeEducation(edu.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Institution *</Label>
                              <Input
                                value={edu.institution}
                                onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                                placeholder="University Name"
                              />
                            </div>
                            <div>
                              <Label>Degree *</Label>
                              <Input
                                value={edu.degree}
                                onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                                placeholder="Bachelor of Science"
                              />
                            </div>
                            <div>
                              <Label>Field of Study</Label>
                              <Input
                                value={edu.field}
                                onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                                placeholder="Computer Science"
                              />
                            </div>
                            <div>
                              <Label>Graduation Date</Label>
                              <Input
                                value={edu.graduationDate}
                                onChange={(e) => updateEducation(edu.id, 'graduationDate', e.target.value)}
                                placeholder="May 2020"
                              />
                            </div>
                            <div>
                              <Label>GPA (Optional)</Label>
                              <Input
                                value={edu.gpa || ''}
                                onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)}
                                placeholder="3.8/4.0"
                              />
                            </div>
                            <div>
                              <Label>Honors (Optional)</Label>
                              <Input
                                value={edu.honors || ''}
                                onChange={(e) => updateEducation(edu.id, 'honors', e.target.value)}
                                placeholder="Magna Cum Laude"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                      <Button variant="outline" onClick={addEducation} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Education
                      </Button>
                    </TabsContent>

                    {/* Skills Tab */}
                    <TabsContent value="skills" className="space-y-4 mt-0">
                      <div>
                        <Label>Add Skills</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            placeholder="e.g., JavaScript, Project Management, Data Analysis"
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                          />
                          <Button onClick={addSkill}>Add</Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {resumeData.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm">
                            {skill}
                            <button
                              onClick={() => removeSkill(skill)}
                              className="ml-2 hover:text-red-500"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      {resumeData.skills.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No skills added yet. Add skills that match the job requirements.
                        </p>
                      )}
                    </TabsContent>

                    {/* Extra Tab (Certifications, Projects, Languages) */}
                    <TabsContent value="extra" className="space-y-4 mt-0">
                      <p className="text-sm text-muted-foreground">
                        Add certifications, projects, and languages to strengthen your resume.
                      </p>
                      {/* Simplified for now - can be expanded */}
                      <Card className="p-4">
                        <p className="text-center text-muted-foreground">
                          Coming soon: Certifications, Projects, and Languages editors
                        </p>
                      </Card>
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Job Post Analyzer */}
              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-500" />
                    Job Post Analyzer
                  </CardTitle>
                  <CardDescription>
                    Paste a job description to optimize your resume
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={jobPost}
                    onChange={(e) => setJobPost(e.target.value)}
                    placeholder="Paste the job description here..."
                    rows={6}
                  />
                  <Button 
                    onClick={handleAnalyzeJobPost} 
                    disabled={isAnalyzing || !jobPost.trim()}
                    className="w-full"
                  >
                    {isAnalyzing ? (
                      <>Analyzing...</>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyze & Optimize
                      </>
                    )}
                  </Button>

                  {/* ATS Score */}
                  {atsScore !== null && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">ATS Match Score</span>
                        <span className={`text-2xl font-bold ${
                          atsScore >= 70 ? 'text-green-600' : atsScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {atsScore}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            atsScore >= 70 ? 'bg-green-500' : atsScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${atsScore}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Keywords */}
                  {extractedKeywords.length > 0 && (
                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Key Skills to Include
                      </Label>
                      <div className="flex flex-wrap gap-1">
                        {extractedKeywords.map((keyword, idx) => (
                          <Badge 
                            key={idx} 
                            variant={resumeData.skills.some(s => s.toLowerCase().includes(keyword.toLowerCase())) ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {atsSuggestions.length > 0 && (
                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Suggestions
                      </Label>
                      <ul className="space-y-2">
                        {atsSuggestions.map((suggestion, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-500" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cover Letter Generator */}
              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5 text-purple-500" />
                    Cover Letter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCoverLetterModal(true)}
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Cover Letter
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Tips */}
              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    ATS Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>✓ Use standard section headings</p>
                  <p>✓ Include keywords from the job description</p>
                  <p>✓ Avoid graphics, tables, or columns</p>
                  <p>✓ Use common fonts like Arial or Calibri</p>
                  <p>✓ Save as PDF for best compatibility</p>
                  <p>✓ Keep it to 1-2 pages maximum</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Preview Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Resume Preview</DialogTitle>
            </DialogHeader>
            <div 
              ref={previewRef} 
              className="border rounded-lg overflow-hidden bg-white"
              style={{ minWidth: '8.5in' }}
            >
              {SelectedTemplateComponent && (
                <SelectedTemplateComponent data={resumeData} />
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close
              </Button>
              <Button onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
                <Download className="h-4 w-4 mr-2" />
                {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cover Letter Modal */}
        <Dialog open={showCoverLetterModal} onOpenChange={setShowCoverLetterModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate Cover Letter</DialogTitle>
              <DialogDescription>
                Create a personalized cover letter based on your resume
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company Name *</Label>
                  <Input
                    id="company"
                    value={coverLetterCompany}
                    onChange={(e) => setCoverLetterCompany(e.target.value)}
                    placeholder="Google"
                  />
                </div>
                <div>
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={coverLetterPosition}
                    onChange={(e) => setCoverLetterPosition(e.target.value)}
                    placeholder="Software Engineer"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleGenerateCoverLetter}
                disabled={isGeneratingCoverLetter}
                className="w-full"
              >
                {isGeneratingCoverLetter ? 'Generating...' : 'Generate Cover Letter'}
              </Button>

              {coverLetter && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Generated Cover Letter</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(coverLetter);
                        toast({ title: 'Copied to clipboard!' });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </StudentLayout>
    </div>
  );
};

export default ResumeBuilder;

