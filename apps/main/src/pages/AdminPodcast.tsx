import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Play, Pause, Upload, Music, Clock, Eye, Headphones, Loader2, Image as ImageIcon } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadToR2 } from '@/lib/cloudflare-r2';

interface Podcast {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  cover_image_url: string | null;
  duration_seconds: number | null;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  transcript: string | null;
  is_published: boolean;
  play_count: number;
  created_at: string;
}

const CATEGORIES = [
  { value: 'general', label: 'General English' },
  { value: 'ielts', label: 'IELTS Preparation' },
  { value: 'business', label: 'Business English' },
  { value: 'pronunciation', label: 'Pronunciation' },
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'grammar', label: 'Grammar' },
  { value: 'listening', label: 'Listening Practice' },
  { value: 'culture', label: 'Culture & Idioms' },
];

const LEVELS = [
  { value: 'beginner', label: 'Beginner', color: 'bg-green-100 text-green-800' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-blue-100 text-blue-800' },
  { value: 'advanced', label: 'Advanced', color: 'bg-purple-100 text-purple-800' },
];

const AdminPodcast = () => {
  const navigate = useNavigate();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPodcast, setEditingPodcast] = useState<Podcast | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [transcript, setTranscript] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadPodcasts();
  }, []);

  const loadPodcasts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('podcasts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPodcasts(data || []);
    } catch (error) {
      console.error('Error loading podcasts:', error);
      toast.error('Failed to load podcasts');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('general');
    setLevel('intermediate');
    setTranscript('');
    setIsPublished(false);
    setAudioFile(null);
    setCoverFile(null);
    setAudioUrl('');
    setCoverUrl('');
    setEditingPodcast(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEditDialog = (podcast: Podcast) => {
    setEditingPodcast(podcast);
    setTitle(podcast.title);
    setDescription(podcast.description || '');
    setCategory(podcast.category);
    setLevel(podcast.level);
    setTranscript(podcast.transcript || '');
    setIsPublished(podcast.is_published);
    setAudioUrl(podcast.audio_url);
    setCoverUrl(podcast.cover_image_url || '');
    setShowCreateDialog(true);
  };

  const handleAudioUpload = async (file: File) => {
    try {
      setUploadingAudio(true);
      const path = `podcasts/audio/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const result = await uploadToR2(file, path, { contentType: file.type || 'audio/mpeg' });
      
      if (result.url) {
        setAudioUrl(result.url);
        toast.success('Audio uploaded successfully!');
        
        // Try to get duration
        const audio = new Audio(result.url);
        audio.addEventListener('loadedmetadata', () => {
          // Duration will be set when saving
        });
      }
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error('Failed to upload audio');
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    try {
      setUploadingCover(true);
      const path = `podcasts/covers/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const result = await uploadToR2(file, path, { contentType: file.type || 'image/jpeg' });
      
      if (result.url) {
        setCoverUrl(result.url);
        toast.success('Cover image uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading cover:', error);
      toast.error('Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const savePodcast = async () => {
    try {
      if (!title.trim()) {
        toast.error('Title is required');
        return;
      }
      if (!audioUrl) {
        toast.error('Please upload an audio file');
        return;
      }

      setIsSubmitting(true);

      // Get audio duration
      let durationSeconds: number | null = null;
      try {
        const audio = new Audio(audioUrl);
        await new Promise((resolve, reject) => {
          audio.addEventListener('loadedmetadata', () => {
            durationSeconds = Math.round(audio.duration);
            resolve(null);
          });
          audio.addEventListener('error', reject);
          setTimeout(resolve, 3000); // Timeout after 3 seconds
        });
      } catch (e) {
        console.log('Could not get audio duration');
      }

      const podcastData = {
        title: title.trim(),
        description: description.trim() || null,
        audio_url: audioUrl,
        cover_image_url: coverUrl || null,
        duration_seconds: durationSeconds,
        category,
        level,
        transcript: transcript.trim() || null,
        is_published: isPublished,
      };

      if (editingPodcast) {
        const { error } = await supabase
          .from('podcasts')
          .update(podcastData)
          .eq('id', editingPodcast.id);

        if (error) throw error;
        toast.success('Podcast updated successfully!');
      } else {
        const { error } = await supabase
          .from('podcasts')
          .insert(podcastData);

        if (error) throw error;
        toast.success('Podcast created successfully!');
      }

      setShowCreateDialog(false);
      resetForm();
      loadPodcasts();
    } catch (error: any) {
      console.error('Error saving podcast:', error);
      toast.error(error.message || 'Failed to save podcast');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deletePodcast = async (id: string) => {
    try {
      const { error } = await supabase
        .from('podcasts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Podcast deleted successfully');
      loadPodcasts();
    } catch (error: any) {
      console.error('Error deleting podcast:', error);
      toast.error(error.message || 'Failed to delete podcast');
    }
  };

  const togglePublished = async (podcast: Podcast) => {
    try {
      const { error } = await supabase
        .from('podcasts')
        .update({ is_published: !podcast.is_published })
        .eq('id', podcast.id);

      if (error) throw error;
      toast.success(podcast.is_published ? 'Podcast unpublished' : 'Podcast published');
      loadPodcasts();
    } catch (error: any) {
      console.error('Error toggling publish:', error);
      toast.error('Failed to update podcast');
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playPreview = (podcast: Podcast) => {
    if (playingId === podcast.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = podcast.audio_url;
        audioRef.current.play();
        setPlayingId(podcast.id);
      }
    }
  };

  return (
    <AdminLayout title="Podcast Management" showBackButton>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Podcasts</h1>
            <p className="text-gray-600 mt-1">Create and manage audio podcasts for students</p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Podcast
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Music className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{podcasts.length}</p>
                <p className="text-sm text-gray-600">Total Podcasts</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{podcasts.filter(p => p.is_published).length}</p>
                <p className="text-sm text-gray-600">Published</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Headphones className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{podcasts.reduce((acc, p) => acc + p.play_count, 0)}</p>
                <p className="text-sm text-gray-600">Total Plays</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatDuration(podcasts.reduce((acc, p) => acc + (p.duration_seconds || 0), 0))}
                </p>
                <p className="text-sm text-gray-600">Total Duration</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Podcasts List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-4 text-gray-600">Loading podcasts...</p>
          </div>
        ) : podcasts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Music className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Podcasts Yet</h3>
              <p className="text-gray-600 mb-6">Create your first podcast to share with students</p>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Podcast
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {podcasts.map((podcast) => (
              <Card key={podcast.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Cover Image */}
                    <div className="flex-shrink-0">
                      {podcast.cover_image_url ? (
                        <img
                          src={podcast.cover_image_url}
                          alt={podcast.title}
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Headphones className="w-10 h-10 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{podcast.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">{podcast.description || 'No description'}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={podcast.is_published ? 'default' : 'secondary'}>
                            {podcast.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3">
                        <Badge variant="outline" className={LEVELS.find(l => l.value === podcast.level)?.color}>
                          {LEVELS.find(l => l.value === podcast.level)?.label}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {CATEGORIES.find(c => c.value === podcast.category)?.label}
                        </span>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(podcast.duration_seconds)}
                        </span>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Headphones className="w-4 h-4" />
                          {podcast.play_count} plays
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => playPreview(podcast)}
                          className="gap-1"
                        >
                          {playingId === podcast.id ? (
                            <>
                              <Pause className="w-4 h-4" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Preview
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(podcast)}
                          className="gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePublished(podcast)}
                        >
                          {podcast.is_published ? 'Unpublish' : 'Publish'}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Podcast</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{podcast.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePodcast(podcast.id)} className="bg-red-600 hover:bg-red-700">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPodcast ? 'Edit Podcast' : 'Create New Podcast'}</DialogTitle>
            <DialogDescription>
              {editingPodcast ? 'Update the podcast details below' : 'Fill in the details to create a new podcast episode'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Episode title..."
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the episode..."
                rows={3}
              />
            </div>

            {/* Audio Upload */}
            <div className="space-y-2">
              <Label>Audio File *</Label>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAudioFile(file);
                    handleAudioUpload(file);
                  }
                }}
                className="hidden"
              />
              {audioUrl ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <Music className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800 flex-1 truncate">Audio uploaded successfully</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => audioInputRef.current?.click()}
                    disabled={uploadingAudio}
                  >
                    Replace
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={uploadingAudio}
                  className="w-full h-20 border-dashed"
                >
                  {uploadingAudio ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Click to upload audio file
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Cover Image Upload */}
            <div className="space-y-2">
              <Label>Cover Image (optional)</Label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCoverFile(file);
                    handleCoverUpload(file);
                  }
                }}
                className="hidden"
              />
              {coverUrl ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <img src={coverUrl} alt="Cover" className="w-16 h-16 rounded object-cover" />
                  <span className="text-sm text-blue-800 flex-1">Cover image uploaded</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                  >
                    Replace
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="w-full h-16 border-dashed"
                >
                  {uploadingCover ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5 mr-2" />
                      Click to upload cover image
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Category and Level */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
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
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={level} onValueChange={(v) => setLevel(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((lvl) => (
                      <SelectItem key={lvl.value} value={lvl.value}>
                        {lvl.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Transcript */}
            <div className="space-y-2">
              <Label htmlFor="transcript">Transcript (optional)</Label>
              <Textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Full transcript of the audio..."
                rows={5}
              />
            </div>

            {/* Publish Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="publish" className="text-base font-medium">Publish immediately</Label>
                <p className="text-sm text-gray-600">Make this podcast visible to students</p>
              </div>
              <Switch
                id="publish"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={savePodcast} disabled={isSubmitting || uploadingAudio || uploadingCover}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingPodcast ? (
                'Update Podcast'
              ) : (
                'Create Podcast'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPodcast;

