import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Save, X, FileText, Upload } from "lucide-react";
import CSVImport from "@/components/CSVImport";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminContent } from "@/hooks/useAdminContent";
import { toast } from "sonner";

interface ContentItem {
  id: string;
  title?: string;
  content?: string;
  prompt_text?: string;
  question_text?: string;
  correct_answer?: string;
  options?: any;
  question_type?: string;
  explanation?: string;
  time_limit?: number;
  word_limit?: number;
  created_at: string;
}

const AdminSectionManagement = () => {
  const navigate = useNavigate();
  const { testType, testId, sectionId } = useParams<{ 
    testType: string; 
    testId: string; 
    sectionId: string; 
  }>();
  const { admin, loading } = useAdminAuth();
  const { listContent, createContent, updateContent, deleteContent } = useAdminContent();
  
  const [content, setContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<ContentItem>>({});

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, loading, navigate]);

  useEffect(() => {
    loadContent();
  }, [testType, sectionId]);

  const loadContent = async () => {
    if (!testType || !sectionId) return;
    
    setIsLoading(true);
    try {
      const tableType = getTableType();
      const response = await listContent(tableType);
      setContent(response?.data || []);
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  const getTableType = () => {
    if (sectionId === 'reading' || sectionId === 'listening') {
      return 'questions'; // Use universal questions table
    } else if (sectionId === 'writing') {
      return `${testType === 'ielts' ? '' : testType + '_'}writing_prompts`;
    } else if (sectionId === 'speaking') {
      return `${testType === 'ielts' ? '' : testType + '_'}speaking_prompts`;
    }
    return 'questions';
  };

  const getSectionConfig = () => {
    switch (sectionId) {
      case 'reading':
        return {
          title: 'Reading Passages',
          fields: ['title', 'content', 'passage_type'],
          createFields: ['title', 'content', 'passage_type']
        };
      case 'listening':
        return {
          title: 'Listening Sections',
          fields: ['title', 'instructions', 'audio_url', 'transcript'],
          createFields: ['title', 'instructions', 'audio_url', 'transcript']
        };
      case 'writing':
        return {
          title: 'Writing Prompts',
          fields: ['title', 'prompt_text', 'task_type', 'time_limit', 'word_limit'],
          createFields: ['title', 'prompt_text', 'task_type', 'time_limit', 'word_limit']
        };
      case 'speaking':
        return {
          title: 'Speaking Prompts',
          fields: ['title', 'prompt_text', 'time_limit'],
          createFields: ['title', 'prompt_text', 'time_limit']
        };
      default:
        return { title: 'Content', fields: [], createFields: [] };
    }
  };

  const handleCreate = async () => {
    try {
      const tableType = getTableType();
      const data = {
        ...formData,
        test_number: parseInt(testId || '1'),
        [`${testType}_book`]: `${testType?.toUpperCase()} 20`
      };
      
      await createContent(tableType, data);
      toast.success('Content created successfully');
      setIsCreating(false);
      setFormData({});
      loadContent();
    } catch (error) {
      console.error('Error creating content:', error);
      toast.error('Failed to create content');
    }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    
    try {
      const tableType = getTableType();
      await updateContent(tableType, { ...editingItem, ...formData });
      toast.success('Content updated successfully');
      setEditingItem(null);
      setFormData({});
      loadContent();
    } catch (error) {
      console.error('Error updating content:', error);
      toast.error('Failed to update content');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const tableType = getTableType();
      await deleteContent(tableType, id);
      toast.success('Content deleted successfully');
      loadContent();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  const handleCSVImport = async (questions: any[]) => {
    // CSV import is now handled by the CSVImport component directly
    // This function is kept for compatibility but the actual upload
    // happens through the useCSVUpload hook in CSVImport
    loadContent();
  };

  const startEdit = (item: ContentItem) => {
    setEditingItem(item);
    setFormData(item);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setIsCreating(false);
    setFormData({});
  };

  const renderField = (field: string, value: any, onChange: (value: any) => void) => {
    switch (field) {
      case 'content':
      case 'prompt_text':
      case 'instructions':
      case 'transcript':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${field.replace('_', ' ')}`}
            rows={4}
          />
        );
      case 'time_limit':
      case 'word_limit':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            placeholder={`Enter ${field.replace('_', ' ')}`}
          />
        );
      case 'task_type':
      case 'passage_type':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.replace('_', ' ')}`} />
            </SelectTrigger>
            <SelectContent>
              {field === 'task_type' && (
                <>
                  <SelectItem value="Essay">Essay</SelectItem>
                  <SelectItem value="Report">Report</SelectItem>
                  <SelectItem value="Letter">Letter</SelectItem>
                </>
              )}
              {field === 'passage_type' && (
                <>
                  <SelectItem value="Academic">Academic</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Literary">Literary</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${field.replace('_', ' ')}`}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading Section Management...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  const config = getSectionConfig();

  return (
    <AdminLayout 
      title={`${testType?.toUpperCase()} Test ${testId} - ${config.title}`}
      showBackButton={true}
      backPath={`/admin/${testType}/test/${testId}`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {config.title} Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage {config.title.toLowerCase()} for {testType?.toUpperCase()} Test {testId}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-sm">
              Test {testId}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {sectionId?.charAt(0).toUpperCase()}{sectionId?.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Enhanced Actions for Reading Section */}
        {sectionId === 'reading' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Upload Complete 40-Question Reading Test (3 Parts)</h2>
              <div className="text-sm text-muted-foreground">
                {content.length} passages uploaded
              </div>
            </div>
            
            <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <Upload className="w-12 h-12 text-primary mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">CSV Upload for Full Reading Test</h3>
                    <p className="text-muted-foreground mb-4">
                      Upload a structured CSV file containing all 40 questions divided into 3 parts with passages and questions.
                    </p>
                  </div>
                  <CSVImport
                    onImport={handleCSVImport}
                    type="reading"
                    module={testType as 'ielts' | 'pte' | 'toefl' | 'general'}
                    testId={testId}
                    testType={testType}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                onClick={() => setIsCreating(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New {sectionId?.charAt(0).toUpperCase()}{sectionId?.slice(1)} Content
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {content.length} items total
            </div>
          </div>
        )}

        {/* Create/Edit Form */}
        {(isCreating || editingItem) && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>
                {isCreating ? 'Create New Content' : 'Edit Content'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.createFields.map((field) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>
                    {field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')}
                  </Label>
                  {renderField(field, formData[field as keyof ContentItem], (value) => 
                    setFormData(prev => ({ ...prev, [field]: value }))
                  )}
                </div>
              ))}
              
              <div className="flex gap-2">
                <Button
                  onClick={isCreating ? handleCreate : handleUpdate}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isCreating ? 'Create' : 'Update'}
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Table */}
        <Card>
          <CardHeader>
            <CardTitle>Current Content</CardTitle>
            <CardDescription>
              Manage existing {config.title.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading content...</p>
              </div>
            ) : content.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No content found</p>
                <p className="text-sm text-muted-foreground">Click "Add New Content" to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    {config.fields.slice(1, 3).map(field => (
                      <TableHead key={field}>
                        {field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')}
                      </TableHead>
                    ))}
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {content.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.title || item.prompt_text?.substring(0, 50) + '...' || 'Untitled'}
                      </TableCell>
                      {config.fields.slice(1, 3).map(field => (
                        <TableCell key={field} className="max-w-[200px] truncate">
                          {typeof item[field as keyof ContentItem] === 'string' 
                            ? (item[field as keyof ContentItem] as string)?.substring(0, 50) + '...'
                            : item[field as keyof ContentItem]?.toString() || '-'
                          }
                        </TableCell>
                      ))}
                      <TableCell>
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(item)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSectionManagement;