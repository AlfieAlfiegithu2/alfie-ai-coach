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
import type { Json } from '@/integrations/supabase/types';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import SEO from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import {
  FileText, Plus, Trash2, Save, Download, Eye, Sparkles,
  Target, CheckCircle2, AlertCircle, Lightbulb, Copy,
  ChevronRight, ChevronUp, ChevronDown, Home, Briefcase, GraduationCap, Award,
  Code, Languages, Mail, GripVertical, FolderOpen, FolderPlus, Wand2, Loader2, User
} from 'lucide-react';
import {
  RESUME_TEMPLATES,
  EMPTY_RESUME_DATA,
  TEMPLATE_SAMPLES,
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
  const isNoteTheme = themeStyles.theme.name === 'note';
  const previewRef = useRef<HTMLDivElement>(null);

  // Input style for note theme - use white/cream background instead of dark
  const inputStyle = isNoteTheme ? {
    backgroundColor: '#FFFEF7',
    borderColor: '#D4C4A8',
    color: '#3D3929'
  } : {};

  // Label style for note theme - ensure dark text color
  const labelStyle = isNoteTheme ? { color: '#3D3929' } : {};

  // Tab trigger style for note theme - cream/amber colors instead of black
  const tabActiveStyle = isNoteTheme ? {
    backgroundColor: '#F5ECD7',
    color: '#3D3929',
    borderColor: '#D4C4A8'
  } : {};

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingExperience, setIsGeneratingExperience] = useState(false);

  // -- AI State & Profile Utils --
  const [generatingBullets, setGeneratingBullets] = useState<Record<string, boolean>>({});

  const saveInfoToProfile = () => {
    const profile = {
      fullName: resumeData.fullName,
      email: resumeData.email,
      phone: resumeData.phone,
      location: resumeData.location,
      linkedinUrl: resumeData.linkedinUrl,
      portfolioUrl: resumeData.portfolioUrl,
      summary: resumeData.summary,
    };
    localStorage.setItem('alfie_resume_profile', JSON.stringify(profile));
    toast({ title: "Profile Saved", description: "Your personal information has been saved." });
  };

  const loadInfoFromProfile = () => {
    const saved = localStorage.getItem('alfie_resume_profile');
    if (saved) {
      const profile = JSON.parse(saved);
      setResumeData(prev => ({ ...prev, ...profile }));
      toast({ title: "Profile Loaded", description: "Personal information loaded from profile." });
    } else {
      toast({ title: "No Profile Found", description: "Please save your information first.", variant: "destructive" });
    }
  };

  const handleGenerateBullets = async (expId: string, jobTitle: string, company: string) => {
    if (!jobTitle) return;
    setGeneratingBullets(prev => ({ ...prev, [expId]: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resume-enhancer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ jobTitle, company })
      });
      const res = await response.json();
      if (res.success && res.data?.bullets) {
        updateExperience(expId, 'achievements', res.data.bullets);
      }
    } catch (e) {
      console.error("AI Bullet Gen Error", e);
    } finally {
      setGeneratingBullets(prev => ({ ...prev, [expId]: false }));
    }
  };

  // PDF ref for full-size rendering
  const pdfRef = useRef<HTMLDivElement>(null);

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

  // Saved experiences from profile
  const [savedExperiences, setSavedExperiences] = useState<ResumeExperience[]>([]);
  const [showSavedExperiences, setShowSavedExperiences] = useState(false);

  // Drag state for reordering
  const [draggedExpIndex, setDraggedExpIndex] = useState<number | null>(null);

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
            experience: (data.experience as unknown as ResumeExperience[]) || [],
            education: (data.education as unknown as ResumeEducation[]) || [],
            skills: (data.skills as string[]) || [],
            certifications: (data.certifications as unknown as ResumeCertification[]) || [],
            projects: (data.projects as unknown as ResumeProject[]) || [],
            languages: (data.languages as unknown as { language: string; proficiency: string }[]) || [],
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
        experience: resumeData.experience as unknown as Json,
        education: resumeData.education as unknown as Json,
        skills: resumeData.skills,
        certifications: resumeData.certifications as unknown as Json,
        projects: resumeData.projects as unknown as Json,
        languages: resumeData.languages as unknown as Json,
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

  // AI Generate Experience Content based on Job Post
  const handleGenerateExperience = async () => {
    if (!jobPost.trim()) {
      toast({
        title: 'Missing job description',
        description: 'Please paste a job description first to generate tailored experience',
        variant: 'destructive',
      });
      return;
    }

    if (resumeData.experience.length === 0) {
      toast({
        title: 'No experience entries',
        description: 'Please add at least one experience entry first',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingExperience(true);

    try {
      const { data, error } = await supabase.functions.invoke('resume-ai-assistant', {
        body: {
          action: 'enhance_experience',
          resumeData: resumeData,
          jobPost: jobPost,
          currentExperience: resumeData.experience,
        },
      });

      if (error) throw error;

      if (data.success && data.enhancedExperience) {
        setResumeData(prev => ({
          ...prev,
          experience: data.enhancedExperience,
        }));
        toast({
          title: 'Experience enhanced!',
          description: 'Your experience has been tailored to the job description',
        });
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Error generating experience:', error);
      toast({
        title: 'Generation failed',
        description: 'Could not enhance experience. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingExperience(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    // Use pdfRef if available (hidden full-size render), otherwise fall back to previewRef
    const element = pdfRef.current || previewRef.current;

    if (!element) {
      toast({
        title: 'Error',
        description: 'Please wait for the preview to load',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingPDF(true);

    try {
      // Configure html2canvas options for better quality
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 816, // 8.5 inches at 96 DPI
        windowHeight: 1056, // 11 inches at 96 DPI
      });

      // Calculate PDF dimensions (Letter: 8.5in x 11in = 215.9mm x 279.4mm)
      const imgWidth = 210; // A4 width in mm (slightly smaller for margins)
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

  // Download Word Document (.docx)
  const handleDownloadWord = async () => {
    setIsGeneratingPDF(true);

    try {
      // Build document sections
      const children: Paragraph[] = [];

      // Name (centered, bold, large)
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: resumeData.fullName || 'Your Name',
              bold: true,
              size: 32,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        })
      );

      // Contact info (centered)
      const contactParts = [resumeData.email, resumeData.phone, resumeData.location]
        .filter(Boolean)
        .join(' | ');
      if (contactParts) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: contactParts, size: 20 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          })
        );
      }

      if (resumeData.linkedinUrl) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: resumeData.linkedinUrl, size: 20 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          })
        );
      }

      // Professional Summary
      if (resumeData.summary) {
        children.push(
          new Paragraph({
            text: 'PROFESSIONAL SUMMARY',
            heading: HeadingLevel.HEADING_2,
            border: { bottom: { color: '333333', size: 6, style: BorderStyle.SINGLE } },
            spacing: { before: 300, after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: resumeData.summary, size: 22 })],
            spacing: { after: 200 },
          })
        );
      }

      // Experience
      if (resumeData.experience.length > 0) {
        children.push(
          new Paragraph({
            text: 'EXPERIENCE',
            heading: HeadingLevel.HEADING_2,
            border: { bottom: { color: '333333', size: 6, style: BorderStyle.SINGLE } },
            spacing: { before: 300, after: 100 },
          })
        );

        resumeData.experience.forEach(exp => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: exp.company, bold: true, size: 24 }),
                new TextRun({ text: ` — ${exp.location}`, size: 22 }),
              ],
              spacing: { before: 150 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: exp.position, italics: true, size: 22 }),
                new TextRun({ text: ` | ${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`, size: 22 }),
              ],
              spacing: { after: 50 },
            })
          );

          exp.achievements.filter(a => a.trim()).forEach(achievement => {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: `• ${achievement}`, size: 22 })],
                indent: { left: 360 },
              })
            );
          });
        });
      }

      // Education
      if (resumeData.education.length > 0) {
        children.push(
          new Paragraph({
            text: 'EDUCATION',
            heading: HeadingLevel.HEADING_2,
            border: { bottom: { color: '333333', size: 6, style: BorderStyle.SINGLE } },
            spacing: { before: 300, after: 100 },
          })
        );

        resumeData.education.forEach(edu => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: edu.institution, bold: true, size: 24 }),
              ],
              spacing: { before: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `${edu.degree} in ${edu.field}`, size: 22 }),
                new TextRun({ text: ` | ${edu.graduationDate}`, size: 22 }),
                ...(edu.gpa ? [new TextRun({ text: ` | GPA: ${edu.gpa}`, size: 22 })] : []),
              ],
            })
          );
        });
      }

      // Skills
      if (resumeData.skills.length > 0) {
        children.push(
          new Paragraph({
            text: 'SKILLS',
            heading: HeadingLevel.HEADING_2,
            border: { bottom: { color: '333333', size: 6, style: BorderStyle.SINGLE } },
            spacing: { before: 300, after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: resumeData.skills.join(' • '), size: 22 })],
          })
        );
      }

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: children,
        }],
      });

      // Generate and download
      const blob = await Packer.toBlob(doc);
      const fileName = resumeData.fullName
        ? `${resumeData.fullName.replace(/\s+/g, '_')}_Resume.docx`
        : 'Resume.docx';
      saveAs(blob, fileName);

      toast({
        title: 'Word Document Downloaded!',
        description: 'Your resume has been downloaded as a .docx file',
      });
    } catch (error) {
      console.error('Error generating Word:', error);
      toast({
        title: 'Word Generation Failed',
        description: 'Could not generate Word document. Please try again.',
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

  // Save experience to profile for later use (using localStorage for simplicity)
  const saveExperienceToProfile = (exp: ResumeExperience) => {
    if (!user) return;

    try {
      const storageKey = `saved_experiences_${user.id}`;
      const existingSaved = JSON.parse(localStorage.getItem(storageKey) || '[]') as ResumeExperience[];

      // Check if already saved (by company + position)
      const alreadySaved = existingSaved.some(
        e => e.company === exp.company && e.position === exp.position
      );

      if (alreadySaved) {
        toast({
          title: 'Already saved',
          description: 'This experience is already in your profile',
        });
        return;
      }

      const updatedSaved = [...existingSaved, exp];
      localStorage.setItem(storageKey, JSON.stringify(updatedSaved));
      setSavedExperiences(updatedSaved);

      toast({
        title: 'Experience saved!',
        description: 'You can load this experience from your profile anytime',
      });
    } catch (error) {
      console.error('Error saving experience:', error);
      toast({
        title: 'Save failed',
        description: 'Could not save experience to profile',
        variant: 'destructive',
      });
    }
  };

  // Load saved experiences from localStorage
  const loadSavedExperiences = () => {
    if (!user) return;

    try {
      const storageKey = `saved_experiences_${user.id}`;
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]') as ResumeExperience[];
      setSavedExperiences(saved);
      setShowSavedExperiences(true);
    } catch (error) {
      console.error('Error loading saved experiences:', error);
    }
  };

  // Delete saved experience from localStorage
  const deleteSavedExperience = (exp: ResumeExperience) => {
    if (!user) return;

    try {
      const storageKey = `saved_experiences_${user.id}`;
      const existingSaved = JSON.parse(localStorage.getItem(storageKey) || '[]') as ResumeExperience[];
      const updated = existingSaved.filter(e => !(e.company === exp.company && e.position === exp.position));
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setSavedExperiences(updated);
      toast({
        title: 'Removed',
        description: 'Experience removed from saved list',
      });
    } catch (error) {
      console.error('Error deleting saved experience:', error);
    }
  };

  // Add saved experience to resume
  const addSavedExperience = (exp: ResumeExperience) => {
    const newExp = { ...exp, id: crypto.randomUUID() };
    setResumeData(prev => ({
      ...prev,
      experience: [...prev.experience, newExp],
    }));
    setShowSavedExperiences(false);
    toast({
      title: 'Experience added!',
      description: `${exp.company} - ${exp.position} added to your resume`,
    });
  };

  // Reorder experience - move up
  const moveExperienceUp = (index: number) => {
    if (index === 0) return;
    setResumeData(prev => {
      const newExp = [...prev.experience];
      [newExp[index - 1], newExp[index]] = [newExp[index], newExp[index - 1]];
      return { ...prev, experience: newExp };
    });
  };

  // Reorder experience - move down
  const moveExperienceDown = (index: number) => {
    if (index === resumeData.experience.length - 1) return;
    setResumeData(prev => {
      const newExp = [...prev.experience];
      [newExp[index], newExp[index + 1]] = [newExp[index + 1], newExp[index]];
      return { ...prev, experience: newExp };
    });
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
              {isNoteTheme ? <span>Home</span> : <Home className="h-4 w-4" />}
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
              <h1 className={`text-2xl font-bold ${isNoteTheme ? 'font-serif' : ''}`} style={{ color: themeStyles.textPrimary }}>Resume Builder</h1>
              <p className="text-muted-foreground">Create an ATS-optimized resume that gets you interviews</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPreview(true)}>
                {!isNoteTheme && <Eye className="h-4 w-4 mr-2" />}
                Preview
              </Button>
              <Button onClick={handleSaveResume} disabled={isSaving}>
                {!isNoteTheme && <Save className="h-4 w-4 mr-2" />}
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Main Layout: Editor on left, Live Preview on right */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left Column - Editor */}
            <div className="space-y-6">
              {/* Template Selection */}
              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className={`text-lg ${isNoteTheme ? 'font-serif' : 'flex items-center gap-2'}`} style={{ color: themeStyles.textPrimary }}>
                      {!isNoteTheme && <FileText className="h-5 w-5 text-blue-500" />}
                      Choose Template
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const sampleData = TEMPLATE_SAMPLES[selectedTemplate];
                        if (sampleData) {
                          setResumeData(sampleData);
                          toast({
                            title: 'Sample loaded!',
                            description: `Loaded sample data for ${RESUME_TEMPLATES.find(t => t.id === selectedTemplate)?.name}`,
                          });
                        }
                      }}
                      style={isNoteTheme ? { backgroundColor: '#F5ECD7', color: '#5D4E37' } : {}}
                    >
                      📋 Load Sample
                    </Button>
                  </div>
                  <CardDescription>
                    Select a template and click "Load Sample" to preview with professional example data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {RESUME_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${selectedTemplate === template.id
                          ? isNoteTheme ? 'border-amber-600 bg-amber-50' : 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : 'border-border hover:border-blue-300'
                          }`}
                        style={{ backgroundColor: selectedTemplate === template.id && isNoteTheme ? themeStyles.theme.colors.cardBackground : undefined }}
                      >
                        <p className="font-medium text-sm" style={{ color: themeStyles.textPrimary }}>{template.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{template.bestFor}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Resume Form Tabs */}
              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}>
                <Tabs defaultValue="personal" className="w-full">
                  <CardHeader className="pb-0">
                    <TabsList
                      className="grid grid-cols-5 w-full"
                      style={{
                        backgroundColor: isNoteTheme ? '#F5ECD7' : undefined,
                        borderRadius: '8px'
                      }}
                    >
                      <TabsTrigger
                        value="personal"
                        className={`text-xs ${isNoteTheme ? 'data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900' : ''}`}
                        style={isNoteTheme ? { color: '#5D4E37' } : {}}
                      >Personal</TabsTrigger>
                      <TabsTrigger
                        value="experience"
                        className={`text-xs ${isNoteTheme ? 'data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900' : ''}`}
                        style={isNoteTheme ? { color: '#5D4E37' } : {}}
                      >Experience</TabsTrigger>
                      <TabsTrigger
                        value="education"
                        className={`text-xs ${isNoteTheme ? 'data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900' : ''}`}
                        style={isNoteTheme ? { color: '#5D4E37' } : {}}
                      >Education</TabsTrigger>
                      <TabsTrigger
                        value="skills"
                        className={`text-xs ${isNoteTheme ? 'data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900' : ''}`}
                        style={isNoteTheme ? { color: '#5D4E37' } : {}}
                      >Skills</TabsTrigger>
                      <TabsTrigger
                        value="extra"
                        className={`text-xs ${isNoteTheme ? 'data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900' : ''}`}
                        style={isNoteTheme ? { color: '#5D4E37' } : {}}
                      >Extra</TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {/* Personal Information Tab */}
                    <TabsContent value="personal" className="space-y-4 mt-0">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="fullName" style={labelStyle}>Full Name *</Label>
                          <Input
                            id="fullName"
                            value={resumeData.fullName}
                            onChange={(e) => setResumeData(prev => ({ ...prev, fullName: e.target.value }))}
                            placeholder="John Doe"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email" style={labelStyle}>Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={resumeData.email}
                            onChange={(e) => setResumeData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="john@example.com"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone" style={labelStyle}>Phone</Label>
                          <Input
                            id="phone"
                            value={resumeData.phone}
                            onChange={(e) => setResumeData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+1 (555) 123-4567"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <Label htmlFor="location" style={labelStyle}>Location</Label>
                          <Input
                            id="location"
                            value={resumeData.location}
                            onChange={(e) => setResumeData(prev => ({ ...prev, location: e.target.value }))}
                            placeholder="San Francisco, CA"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <Label htmlFor="linkedin" style={labelStyle}>LinkedIn URL</Label>
                          <Input
                            id="linkedin"
                            value={resumeData.linkedinUrl}
                            onChange={(e) => setResumeData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                            placeholder="linkedin.com/in/johndoe"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <Label htmlFor="portfolio" style={labelStyle}>Portfolio URL</Label>
                          <Input
                            id="portfolio"
                            value={resumeData.portfolioUrl}
                            onChange={(e) => setResumeData(prev => ({ ...prev, portfolioUrl: e.target.value }))}
                            placeholder="johndoe.com"
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      {/* Photo Upload Section */}
                      <div className="border rounded-lg p-4" style={{ borderColor: themeStyles.border, backgroundColor: isNoteTheme ? '#FDFBF5' : undefined }}>
                        <Label style={labelStyle} className="mb-2 block">Profile Photo (Optional)</Label>
                        <div className="flex items-center gap-4">
                          {/* Photo Preview */}
                          <div
                            className="w-20 h-20 rounded-full border-2 overflow-hidden flex items-center justify-center bg-gray-100"
                            style={{ borderColor: themeStyles.border }}
                          >
                            {resumeData.photoUrl ? (
                              <img
                                src={resumeData.photoUrl}
                                alt="Profile"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl text-gray-400">📷</span>
                            )}
                          </div>

                          {/* Photo URL Input */}
                          <div className="flex-1">
                            <Input
                              id="photoUrl"
                              value={resumeData.photoUrl || ''}
                              onChange={(e) => setResumeData(prev => ({ ...prev, photoUrl: e.target.value }))}
                              placeholder="Image URL"
                              style={inputStyle}
                            />
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                id="photo-upload"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setResumeData(prev => ({ ...prev, photoUrl: reader.result as string }));
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                              <label
                                htmlFor="photo-upload"
                                className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                                style={isNoteTheme ? { backgroundColor: '#F5ECD7', color: '#3D3929', borderColor: '#D4C4A8' } : {}}
                              >
                                {isNoteTheme ? 'Upload' : <><FolderOpen className="h-4 w-4 mr-2" /> Upload</>}
                              </label>
                              {resumeData.photoUrl && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setResumeData(prev => ({ ...prev, photoUrl: '' }))}
                                  className="text-red-500 hover:text-red-700 h-9 w-9"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="summary" style={labelStyle}>Professional Summary</Label>
                        <Textarea
                          id="summary"
                          value={resumeData.summary}
                          onChange={(e) => setResumeData(prev => ({ ...prev, summary: e.target.value }))}
                          placeholder="A brief 2-3 sentence summary of your professional background and key achievements..."
                          rows={4}
                          style={inputStyle}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Tip: Include keywords from the job description for better ATS matching
                        </p>
                      </div>
                      <div className="flex gap-2 pt-4 border-t mt-4" style={{ borderColor: themeStyles.border }}>
                        <Button onClick={saveInfoToProfile} variant="outline" className="flex-1" style={isNoteTheme ? { backgroundColor: '#F5ECD7', color: '#3D3929' } : {}}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Profile
                        </Button>
                        <Button onClick={loadInfoFromProfile} variant="outline" className="flex-1" style={isNoteTheme ? { backgroundColor: '#F5ECD7', color: '#3D3929' } : {}}>
                          <User className="h-4 w-4 mr-2" />
                          Load Profile
                        </Button>
                      </div>
                    </TabsContent>

                    {/* Experience Tab */}
                    <TabsContent value="experience" className="space-y-4 mt-0">
                      {resumeData.experience.map((exp, index) => (
                        <Card key={exp.id} className="p-4 relative" style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}>
                          {/* Control buttons */}
                          <div className="absolute top-2 right-2 flex gap-1">
                            {/* Reorder buttons */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => moveExperienceUp(index)}
                              disabled={index === 0}
                              title="Move up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => moveExperienceDown(index)}
                              disabled={index === resumeData.experience.length - 1}
                              title="Move down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            {/* Save to profile */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-500 hover:text-blue-700"
                              onClick={() => saveExperienceToProfile(exp)}
                              title="Save to profile"
                            >
                              <FolderPlus className="h-4 w-4" />
                            </Button>
                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700"
                              onClick={() => removeExperience(exp.id)}
                              title="Delete"
                            >
                              {isNoteTheme ? <span className="text-xs">✕</span> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                          <div className="space-y-3 pr-32">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label style={labelStyle}>Company *</Label>
                                <Input
                                  value={exp.company}
                                  onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                                  placeholder="Company Name"
                                  style={inputStyle}
                                />
                              </div>
                              <div>
                                <Label style={labelStyle}>Position *</Label>
                                <Input
                                  value={exp.position}
                                  onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                                  placeholder="Job Title"
                                  style={inputStyle}
                                />
                              </div>
                              <div>
                                <Label style={labelStyle}>Location</Label>
                                <Input
                                  value={exp.location}
                                  onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                                  placeholder="City, State"
                                  style={inputStyle}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label style={labelStyle}>Start Date</Label>
                                  <Input
                                    value={exp.startDate}
                                    onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                                    placeholder="Jan 2020"
                                    style={inputStyle}
                                  />
                                </div>
                                <div>
                                  <Label style={labelStyle}>End Date</Label>
                                  <Input
                                    value={exp.current ? 'Present' : exp.endDate}
                                    onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                                    placeholder="Present"
                                    disabled={exp.current}
                                    style={inputStyle}
                                  />
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <Label style={labelStyle}>Achievements (one per line)</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs text-blue-600 gap-1 hover:text-blue-800"
                                  onClick={() => handleGenerateBullets(exp.id, exp.position, exp.company)}
                                  disabled={generatingBullets[exp.id]}
                                  type="button"
                                >
                                  {generatingBullets[exp.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                                  AI Generate
                                </Button>
                              </div>
                              <Textarea
                                value={exp.achievements.join('\n')}
                                onChange={(e) => updateExperience(exp.id, 'achievements', e.target.value.split('\n'))}
                                placeholder="• Led team of 5 engineers to deliver project 2 weeks early&#10;• Increased revenue by 25% through optimization&#10;• Implemented CI/CD pipeline reducing deploy time by 50%"
                                rows={4}
                                style={inputStyle}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Start each achievement with an action verb and include metrics when possible
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" onClick={addExperience} className="flex-1 min-w-[140px]">
                          {!isNoteTheme && <Plus className="h-4 w-4 mr-2" />}
                          {isNoteTheme ? '+ Add New' : 'Add New'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={loadSavedExperiences}
                          className="flex-1 min-w-[140px]"
                          style={isNoteTheme ? { backgroundColor: '#F5ECD7', color: '#5D4E37' } : {}}
                        >
                          {!isNoteTheme && <FolderOpen className="h-4 w-4 mr-2" />}
                          📂 Load Saved
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleGenerateExperience}
                          disabled={isGeneratingExperience || !jobPost.trim() || resumeData.experience.length === 0}
                          className="flex-1 min-w-[140px]"
                          style={isNoteTheme ? { backgroundColor: '#F5ECD7', color: '#5D4E37' } : {}}
                        >
                          {!isNoteTheme && <Sparkles className="h-4 w-4 mr-2" />}
                          {isGeneratingExperience ? 'Enhancing...' : '✨ AI Enhance'}
                        </Button>
                      </div>
                      {!jobPost.trim() && resumeData.experience.length > 0 && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          💡 Paste a job description in the Job Post Analyzer to enable AI enhancement
                        </p>
                      )}
                    </TabsContent>

                    {/* Education Tab */}
                    <TabsContent value="education" className="space-y-4 mt-0">
                      {resumeData.education.map((edu) => (
                        <Card key={edu.id} className="p-4 relative" style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => removeEducation(edu.id)}
                          >
                            {isNoteTheme ? <span className="text-xs">✕</span> : <Trash2 className="h-4 w-4" />}
                          </Button>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label style={labelStyle}>Institution *</Label>
                              <Input
                                value={edu.institution}
                                onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                                placeholder="University Name"
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <Label style={labelStyle}>Degree *</Label>
                              <Input
                                value={edu.degree}
                                onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                                placeholder="Bachelor of Science"
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <Label style={labelStyle}>Field of Study</Label>
                              <Input
                                value={edu.field}
                                onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                                placeholder="Computer Science"
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <Label style={labelStyle}>Graduation Date</Label>
                              <Input
                                value={edu.graduationDate}
                                onChange={(e) => updateEducation(edu.id, 'graduationDate', e.target.value)}
                                placeholder="May 2020"
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <Label style={labelStyle}>GPA (Optional)</Label>
                              <Input
                                value={edu.gpa || ''}
                                onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)}
                                placeholder="3.8/4.0"
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <Label style={labelStyle}>Honors (Optional)</Label>
                              <Input
                                value={edu.honors || ''}
                                onChange={(e) => updateEducation(edu.id, 'honors', e.target.value)}
                                placeholder="Magna Cum Laude"
                                style={inputStyle}
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                      <Button variant="outline" onClick={addEducation} className="w-full">
                        {!isNoteTheme && <Plus className="h-4 w-4 mr-2" />}
                        {isNoteTheme ? '+ Add Education' : 'Add Education'}
                      </Button>
                    </TabsContent>

                    {/* Skills Tab */}
                    <TabsContent value="skills" className="space-y-4 mt-0">
                      <div>
                        <Label style={labelStyle}>Add Skills</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            placeholder="e.g., JavaScript, Project Management, Data Analysis"
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                            style={inputStyle}
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
                      <Card className="p-4" style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}>
                        <p className="text-center text-muted-foreground">
                          Coming soon: Certifications, Projects, and Languages editors
                        </p>
                      </Card>
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>

              {/* Job Post Analyzer */}
              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-lg ${isNoteTheme ? 'font-serif' : 'flex items-center gap-2'}`} style={{ color: themeStyles.textPrimary }}>
                    {!isNoteTheme && <Target className="h-5 w-5 text-orange-500" />}
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
                    style={inputStyle}
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
                        {!isNoteTheme && <Sparkles className="h-4 w-4 mr-2" />}
                        Analyze & Optimize
                      </>
                    )}
                  </Button>

                  {/* ATS Score */}
                  {atsScore !== null && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">ATS Match Score</span>
                        <span className={`text-2xl font-bold ${atsScore >= 70 ? 'text-green-600' : atsScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                          {atsScore}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${atsScore >= 70 ? 'bg-green-500' : atsScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                          style={{ width: `${atsScore}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Keywords */}
                  {extractedKeywords.length > 0 && (
                    <div>
                      <Label className="flex items-center gap-2 mb-2" style={labelStyle}>
                        {!isNoteTheme && <CheckCircle2 className="h-4 w-4 text-green-500" />}
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
                      <Label className="flex items-center gap-2 mb-2" style={labelStyle}>
                        {!isNoteTheme && <Lightbulb className="h-4 w-4 text-yellow-500" />}
                        Suggestions
                      </Label>
                      <ul className="space-y-2">
                        {atsSuggestions.map((suggestion, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            {isNoteTheme ? <span>•</span> : <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-500" />}
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cover Letter Generator */}
              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-lg ${isNoteTheme ? 'font-serif' : 'flex items-center gap-2'}`} style={{ color: themeStyles.textPrimary }}>
                    {!isNoteTheme && <Mail className="h-5 w-5 text-purple-500" />}
                    Cover Letter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => setShowCoverLetterModal(true)}
                    className="w-full"
                  >
                    {!isNoteTheme && <Sparkles className="h-4 w-4 mr-2" />}
                    Generate Cover Letter
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Tips */}
              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-lg ${isNoteTheme ? 'font-serif' : 'flex items-center gap-2'}`} style={{ color: themeStyles.textPrimary }}>
                    {!isNoteTheme && <Lightbulb className="h-5 w-5 text-yellow-500" />}
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

            {/* Right Column - Live Preview (Sticky) */}
            <div className="hidden xl:block">
              <div className="sticky top-24">
                <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className={`text-lg ${isNoteTheme ? 'font-serif' : ''}`} style={{ color: themeStyles.textPrimary }}>
                        Live Preview
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadWord}
                          disabled={isGeneratingPDF}
                          style={isNoteTheme ? { backgroundColor: '#F5ECD7', color: '#3D3929', borderColor: '#D4C4A8' } : {}}
                        >
                          Word
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleDownloadPDF}
                          disabled={isGeneratingPDF}
                          style={isNoteTheme ? { backgroundColor: '#3D3929', color: '#FFFEF7' } : {}}
                        >
                          {isGeneratingPDF ? '...' : 'PDF'}
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      Your resume updates as you type
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div
                      className="border rounded-lg overflow-hidden shadow-sm"
                      style={{
                        backgroundColor: '#ffffff',
                        height: '450px',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        ref={previewRef}
                        style={{
                          transform: 'scale(0.38)',
                          transformOrigin: 'top left',
                          width: '260%',
                          minHeight: '400px'
                        }}
                      >
                        {SelectedTemplateComponent && (
                          <>
                            <SelectedTemplateComponent data={resumeData} />
                            {/* Visual Page 1 Indicator (A4 @ 96 DPI approx 1123px) */}
                            <div
                              className="absolute left-0 right-0 border-b-2 border-dashed border-red-500 opacity-40 pointer-events-none flex justify-end"
                              style={{ top: '1123px' }}
                            >
                              <span className="text-red-500 text-[10px] uppercase font-bold bg-white px-2 py-0.5 border border-red-200 rounded shadow-sm relative -top-3 mr-4">
                                Page 1 Limit
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
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
                  {!isNoteTheme && <Download className="h-4 w-4 mr-2" />}
                  {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Saved Experiences Modal */}
          <Dialog open={showSavedExperiences} onOpenChange={setShowSavedExperiences}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Saved Experiences</DialogTitle>
                <DialogDescription>
                  Click to add a saved experience to your resume. Use the folder icon on each experience card to save new ones.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {savedExperiences.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No saved experiences yet.</p>
                    <p className="text-sm mt-2">Use the 📁 icon on experience cards to save them to your profile.</p>
                  </div>
                ) : (
                  savedExperiences.map((exp, idx) => (
                    <Card key={idx} className="p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 cursor-pointer" onClick={() => addSavedExperience(exp)}>
                          <h4 className="font-semibold">{exp.company}</h4>
                          <p className="text-sm text-muted-foreground">{exp.position}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {exp.startDate} - {exp.current ? 'Present' : exp.endDate} | {exp.location}
                          </p>
                          {exp.achievements.length > 0 && exp.achievements[0] && (
                            <p className="text-xs mt-2 truncate">{exp.achievements[0]}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addSavedExperience(exp)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteSavedExperience(exp)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={() => setShowSavedExperiences(false)}>
                  Close
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
                    <Label htmlFor="company" style={labelStyle}>Company Name *</Label>
                    <Input
                      id="company"
                      value={coverLetterCompany}
                      onChange={(e) => setCoverLetterCompany(e.target.value)}
                      placeholder="Google"
                    />
                  </div>
                  <div>
                    <Label htmlFor="position" style={labelStyle}>Position *</Label>
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
                      <Label style={labelStyle}>Generated Cover Letter</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(coverLetter);
                          toast({ title: 'Copied to clipboard!' });
                        }}
                        style={{ color: themeStyles.textPrimary }}
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
        </div>
      </StudentLayout>

      {/* Hidden full-size container for PDF generation */}
      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '8.5in',
          minHeight: '11in',
          backgroundColor: '#ffffff'
        }}
      >
        <div ref={pdfRef}>
          {SelectedTemplateComponent && (
            <SelectedTemplateComponent data={resumeData} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;

