import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StudentLayout from "@/components/StudentLayout";
import { supabase } from "@/integrations/supabase/client";
import { Image, Search, Filter, Download, ZoomIn, ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface Template {
  id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string;
  tags: string[];
  view_count: number;
}

const CATEGORIES = [
  { value: 'all', label: 'All Templates' },
  { value: 'writing-task1', label: 'Writing Task 1' },
  { value: 'writing-task2', label: 'Writing Task 2' },
  { value: 'speaking', label: 'Speaking' },
  { value: 'reading', label: 'Reading' },
  { value: 'listening', label: 'Listening' },
  { value: 'general', label: 'General' },
];

const TemplatesGallery = () => {
  const navigate = useNavigate();
  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('id, title, description, category, image_url, tags, view_count')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const incrementViewCount = async (id: string) => {
    try {
      await supabase.rpc('increment_template_view', { template_id: id });
    } catch (error) {
      // Silent fail for view count
      console.error('Error incrementing view count:', error);
    }
  };

  const openTemplate = (template: Template) => {
    setSelectedTemplate(template);
    incrementViewCount(template.id);
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'writing-task1':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'writing-task2':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'speaking':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'reading':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'listening':
        return 'bg-pink-500/10 text-pink-600 border-pink-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.includes(searchQuery.toLowerCase()));
    
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <StudentLayout>
      <SEO 
        title="Templates | English AIdol"
        description="Browse template images for IELTS Writing Task 1, Speaking, and more practice"
      />
      
      <div 
        className={`container max-w-7xl mx-auto px-4 py-8 space-y-8 ${isNoteTheme ? 'font-serif' : ''}`}
        style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.background } : undefined}
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            {!isNoteTheme && <Image className="w-10 h-10 text-primary" />}
            <h1 
              className={`text-4xl font-bold ${!isNoteTheme ? 'bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent' : ''}`}
              style={{ color: themeStyles.textPrimary }}
            >
              Templates
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto" style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
            Browse our collection of charts, graphs, diagrams, and visual templates to practice 
            your IELTS Writing Task 1 and Speaking skills.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
          <div className="relative flex-1">
            {!isNoteTheme && <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />}
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={!isNoteTheme ? "pl-10" : ""}
              style={isNoteTheme ? { borderColor: themeStyles.border, color: themeStyles.textPrimary } : undefined}
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[180px]" style={isNoteTheme ? { borderColor: themeStyles.border, color: themeStyles.textPrimary } : undefined}>
              {!isNoteTheme && <Filter className="w-4 h-4 mr-2" />}
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>{filteredTemplates.length} templates found</span>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden" style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border } : undefined}>
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            {!isNoteTheme && <Image className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />}
            {searchQuery || filterCategory !== 'all' ? (
              <>
                <h3 className="text-xl font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>No templates found</h3>
                <p className="text-muted-foreground mb-4" style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
                  Try adjusting your search or filters
                </p>
                <Button variant="outline" onClick={() => { setSearchQuery(""); setFilterCategory("all"); }} style={isNoteTheme ? { borderColor: themeStyles.border, color: themeStyles.textPrimary } : undefined}>
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>No templates available yet</h3>
                <p className="text-muted-foreground" style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
                  Check back soon for new practice materials!
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTemplates.map((template) => (
              <Card 
                key={template.id} 
                className={`overflow-hidden cursor-pointer transition-all duration-300 ${!isNoteTheme ? 'hover:shadow-xl hover:-translate-y-1' : ''} group`}
                onClick={() => openTemplate(template)}
                style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border } : undefined}
              >
                {/* Image */}
                <div 
                  className={`h-48 relative overflow-hidden ${!isNoteTheme ? 'bg-muted' : ''}`}
                  style={isNoteTheme ? { backgroundColor: 'transparent', borderBottom: `1px solid ${themeStyles.border}` } : undefined}
                >
                  <img
                    src={template.image_url}
                    alt={template.title}
                    className={`w-full h-full object-contain ${!isNoteTheme ? 'group-hover:scale-105' : ''} transition-transform duration-300`}
                    loading="lazy"
                  />
                  {!isNoteTheme && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                  )}
                  <Badge 
                    className={`absolute top-2 right-2 ${!isNoteTheme ? getCategoryColor(template.category) : ''}`}
                    style={isNoteTheme ? { backgroundColor: 'transparent', border: `1px solid ${themeStyles.border}`, color: themeStyles.textSecondary } : undefined}
                  >
                    {getCategoryLabel(template.category)}
                  </Badge>
                </div>

                <CardContent className="p-4 space-y-2">
                  <h3 
                    className={`font-semibold line-clamp-1 ${!isNoteTheme ? 'group-hover:text-primary' : ''} transition-colors`}
                    style={{ color: themeStyles.textPrimary }}
                  >
                    {template.title}
                  </h3>
                  
                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2" style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
                      {template.description}
                    </p>
                  )}

                  {/* Tags */}
                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs" style={isNoteTheme ? { borderColor: themeStyles.border, color: themeStyles.textSecondary } : undefined}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Back Button */}
        <div className="text-center pt-8">
          <Button variant="outline" onClick={() => navigate('/ielts')} style={isNoteTheme ? { borderColor: themeStyles.border, color: themeStyles.textPrimary } : undefined}>
            {!isNoteTheme && <ArrowLeft className="w-4 h-4 mr-2" />}
            {isNoteTheme ? '← ' : ''}Back to IELTS Portal
          </Button>
        </div>

        {/* Full-size Preview Dialog */}
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent 
            className="sm:max-w-4xl max-h-[90vh]"
            style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border } : undefined}
          >
            {selectedTemplate && (
              <>
                <DialogHeader>
                  <DialogTitle style={{ color: themeStyles.textPrimary }}>{selectedTemplate.title}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2" style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
                    <Badge 
                      className={!isNoteTheme ? getCategoryColor(selectedTemplate.category) : ''}
                      style={isNoteTheme ? { backgroundColor: 'transparent', border: `1px solid ${themeStyles.border}`, color: themeStyles.textSecondary } : undefined}
                    >
                      {getCategoryLabel(selectedTemplate.category)}
                    </Badge>
                    {selectedTemplate.description && (
                      <span>• {selectedTemplate.description}</span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 flex justify-center">
                  <img
                    src={selectedTemplate.image_url}
                    alt={selectedTemplate.title}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  />
                </div>
                <div className="flex items-center justify-between">
                  {selectedTemplate.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" style={isNoteTheme ? { backgroundColor: 'transparent', border: `1px solid ${themeStyles.border}`, color: themeStyles.textSecondary } : undefined}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedTemplate.image_url;
                      link.download = selectedTemplate.title;
                      link.target = '_blank';
                      link.click();
                    }}
                    style={isNoteTheme ? { borderColor: themeStyles.border, color: themeStyles.textPrimary } : undefined}
                  >
                    {!isNoteTheme && <Download className="w-4 h-4 mr-2" />}
                    Download
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  );
};

export default TemplatesGallery;