import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Image, Upload, Trash2, Eye, EyeOff, Plus, Loader2, X, Search, Filter } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Template {
  id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string;
  thumbnail_url: string | null;
  tags: string[];
  is_published: boolean;
  view_count: number;
  created_at: string;
}

const CATEGORIES = [
  { value: 'writing-task1', label: 'Writing Task 1 (Charts/Graphs)' },
  { value: 'writing-task2', label: 'Writing Task 2 (Essays)' },
  { value: 'speaking', label: 'Speaking' },
  { value: 'reading', label: 'Reading' },
  { value: 'listening', label: 'Listening' },
  { value: 'general', label: 'General' },
];

const AdminTemplates = () => {
  const navigate = useNavigate();
  const { admin, loading: authLoading } = useAdminAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Templates list state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  
  // Upload form state
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formTags, setFormTags] = useState("");
  const [formPublished, setFormPublished] = useState(true);

  // Preview state
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (!authLoading && !admin) {
      navigate('/admin/login');
    } else if (admin) {
      loadTemplates();
    }
  }, [admin, authLoading, navigate]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be less than 10MB');
        return;
      }
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
    }
  };

  const uploadToR2 = async (file: File): Promise<string> => {
    const { data: sessionData } = await supabase.auth.getSession();
    
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `templates/${timestamp}-${safeName}`;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    formData.append('contentType', file.type);

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL || 'https://cuumxmfzhwljylbdlflj.supabase.co'}/functions/v1/r2-upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData?.session?.access_token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    const data = await response.json();
    return data.url;
  };

  const handleUpload = async () => {
    if (!uploadFile || !formTitle.trim()) {
      toast.error('Please provide a title and select an image');
      return;
    }

    setIsUploading(true);
    try {
      // Upload to Cloudflare R2
      const imageUrl = await uploadToR2(uploadFile);

      // Parse tags
      const tags = formTags
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);

      // Save to database
      const { error } = await supabase
        .from('templates')
        .insert({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          category: formCategory,
          image_url: imageUrl,
          tags,
          is_published: formPublished,
        });

      if (error) throw error;

      toast.success('Template uploaded successfully!');
      resetUploadForm();
      setIsUploadDialogOpen(false);
      loadTemplates();
    } catch (error: any) {
      console.error('Error uploading template:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setFormTitle("");
    setFormDescription("");
    setFormCategory("general");
    setFormTags("");
    setFormPublished(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const togglePublished = async (template: Template) => {
    try {
      const { error } = await supabase
        .from('templates')
        .update({ is_published: !template.is_published })
        .eq('id', template.id);

      if (error) throw error;
      
      toast.success(template.is_published ? 'Template hidden' : 'Template published');
      loadTemplates();
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Template deleted');
      loadTemplates();
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!admin) return null;

  return (
    <AdminLayout title="Templates" showBackButton={true} backPath="/admin/ielts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Templates
            </h1>
            <p className="text-muted-foreground">
              Upload and manage template images for students
            </p>
          </div>
          
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Upload Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload New Template</DialogTitle>
                <DialogDescription>
                  Upload an image to the templates library. Images are stored on Cloudflare for fast global delivery.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Image *</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {uploadPreview ? (
                    <div className="relative">
                      <img
                        src={uploadPreview}
                        alt="Preview"
                        className="w-full h-48 object-contain rounded-lg border bg-muted"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setUploadFile(null);
                          setUploadPreview(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload image
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Line Graph - Population Growth"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the template..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger>
                      <SelectValue />
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

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder="e.g., chart, graph, statistics"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                  />
                </div>

                {/* Published Toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="published">Publish immediately</Label>
                  <Switch
                    id="published"
                    checked={formPublished}
                    onCheckedChange={setFormPublished}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetUploadForm();
                    setIsUploadDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || !uploadFile || !formTitle.trim()}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{templates.length} total templates</span>
          <span>•</span>
          <span>{templates.filter(t => t.is_published).length} published</span>
          <span>•</span>
          <span>{filteredTemplates.length} showing</span>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Image className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              {searchQuery || filterCategory !== 'all' ? (
                <>
                  <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search or filters
                  </p>
                  <Button variant="outline" onClick={() => { setSearchQuery(""); setFilterCategory("all"); }}>
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload your first template to get started
                  </p>
                  <Button onClick={() => setIsUploadDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Template
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="overflow-hidden group">
                {/* Image */}
                <div 
                  className="h-40 bg-muted relative cursor-pointer overflow-hidden"
                  onClick={() => setPreviewTemplate(template)}
                >
                  <img
                    src={template.image_url}
                    alt={template.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  {!template.is_published && (
                    <Badge variant="secondary" className="absolute top-2 left-2">
                      <EyeOff className="w-3 h-3 mr-1" />
                      Hidden
                    </Badge>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="text-sm line-clamp-1">{template.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {getCategoryLabel(template.category)}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Tags */}
                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => togglePublished(template)}
                    >
                      {template.is_published ? (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Publish
                        </>
                      )}
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{template.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteTemplate(template.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="sm:max-w-3xl">
            {previewTemplate && (
              <>
                <DialogHeader>
                  <DialogTitle>{previewTemplate.title}</DialogTitle>
                  <DialogDescription>
                    {getCategoryLabel(previewTemplate.category)}
                    {previewTemplate.description && ` • ${previewTemplate.description}`}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <img
                    src={previewTemplate.image_url}
                    alt={previewTemplate.title}
                    className="w-full max-h-[70vh] object-contain rounded-lg"
                  />
                </div>
                {previewTemplate.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminTemplates;

