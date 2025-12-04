import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Headphones,
  Clock,
  Search,
  Filter,
  Loader2,
  ChevronDown,
  ChevronUp,
  Music
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

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
  play_count: number;
  created_at: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
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
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'advanced', label: 'Advanced', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
];

const PodcastListing = () => {
  const { t } = useTranslation();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [filteredPodcasts, setFilteredPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  
  // Player state
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadPodcasts();
  }, []);

  useEffect(() => {
    filterPodcasts();
  }, [podcasts, searchTerm, selectedCategory, selectedLevel]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const loadPodcasts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('podcasts')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPodcasts(data || []);
    } catch (error) {
      console.error('Error loading podcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPodcasts = () => {
    let filtered = [...podcasts];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (selectedLevel !== 'all') {
      filtered = filtered.filter((p) => p.level === selectedLevel);
    }

    setFilteredPodcasts(filtered);
  };

  const playPodcast = async (podcast: Podcast) => {
    if (currentPodcast?.id === podcast.id) {
      togglePlayPause();
    } else {
      setCurrentPodcast(podcast);
      setIsPlaying(true);
      setShowTranscript(false);
      
      // Increment play count
      await supabase
        .from('podcasts')
        .update({ play_count: podcast.play_count + 1 })
        .eq('id', podcast.id);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 15, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 15, 0);
    }
  };

  const playNext = () => {
    if (!currentPodcast) return;
    const currentIndex = filteredPodcasts.findIndex((p) => p.id === currentPodcast.id);
    if (currentIndex < filteredPodcasts.length - 1) {
      playPodcast(filteredPodcasts[currentIndex + 1]);
    }
  };

  const playPrevious = () => {
    if (!currentPodcast) return;
    const currentIndex = filteredPodcasts.findIndex((p) => p.id === currentPodcast.id);
    if (currentIndex > 0) {
      playPodcast(filteredPodcasts[currentIndex - 1]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLevelStyle = (level: string) => {
    return LEVELS.find((l) => l.value === level)?.color || '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900">
      <Header />
      
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={currentPodcast?.audio_url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={playNext}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        autoPlay={isPlaying}
      />

      <main className="container mx-auto px-4 py-8 pb-40">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-6 shadow-lg">
            <Headphones className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            English Podcasts
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Improve your English listening skills with our curated collection of podcasts. 
            Listen anytime, anywhere at your own pace.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search podcasts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-800"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48 bg-white dark:bg-gray-800">
              <Filter className="w-4 h-4 mr-2" />
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
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="w-full md:w-40 bg-white dark:bg-gray-800">
              <SelectValue placeholder="Level" />
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

        {/* Podcasts Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading podcasts...</p>
          </div>
        ) : filteredPodcasts.length === 0 ? (
          <div className="text-center py-20">
            <Music className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Podcasts Found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || selectedCategory !== 'all' || selectedLevel !== 'all'
                ? 'Try adjusting your filters'
                : 'Check back soon for new episodes!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPodcasts.map((podcast) => (
              <Card
                key={podcast.id}
                className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] overflow-hidden ${
                  currentPodcast?.id === podcast.id
                    ? 'ring-2 ring-purple-500 shadow-lg'
                    : ''
                }`}
                onClick={() => playPodcast(podcast)}
              >
                <div className="relative aspect-square">
                  {podcast.cover_image_url ? (
                    <img
                      src={podcast.cover_image_url}
                      alt={podcast.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
                      <Headphones className="w-20 h-20 text-white/80" />
                    </div>
                  )}
                  
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      {currentPodcast?.id === podcast.id && isPlaying ? (
                        <Pause className="w-8 h-8 text-purple-600" />
                      ) : (
                        <Play className="w-8 h-8 text-purple-600 ml-1" />
                      )}
                    </div>
                  </div>

                  {/* Duration badge */}
                  <div className="absolute bottom-3 right-3 bg-black/70 text-white text-sm px-2 py-1 rounded">
                    {formatTime(podcast.duration_seconds || 0)}
                  </div>

                  {/* Now playing indicator */}
                  {currentPodcast?.id === podcast.id && isPlaying && (
                    <div className="absolute top-3 left-3 bg-purple-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      Now Playing
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1">
                      {podcast.title}
                    </h3>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                    {podcast.description || 'No description available'}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={getLevelStyle(podcast.level)}>
                      {LEVELS.find((l) => l.value === podcast.level)?.label}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {CATEGORIES.find((c) => c.value === podcast.category)?.label}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1 ml-auto">
                      <Headphones className="w-3 h-3" />
                      {podcast.play_count}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Fixed Bottom Player */}
      {currentPodcast && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 shadow-2xl z-50">
          {/* Transcript Panel */}
          {showTranscript && currentPodcast.transcript && (
            <div className="max-h-48 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Transcript</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {currentPodcast.transcript}
              </p>
            </div>
          )}

          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-4">
              {/* Podcast Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {currentPodcast.cover_image_url ? (
                  <img
                    src={currentPodcast.cover_image_url}
                    alt={currentPodcast.title}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Headphones className="w-7 h-7 text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                    {currentPodcast.title}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {CATEGORIES.find((c) => c.value === currentPodcast.category)?.label}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={playPrevious}
                    className="text-gray-600 dark:text-gray-400"
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={skipBackward}
                    className="text-gray-600 dark:text-gray-400"
                  >
                    <span className="text-xs font-medium">-15</span>
                  </Button>
                  <Button
                    onClick={togglePlayPause}
                    className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={skipForward}
                    className="text-gray-600 dark:text-gray-400"
                  >
                    <span className="text-xs font-medium">+15</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={playNext}
                    className="text-gray-600 dark:text-gray-400"
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2 w-full max-w-md">
                  <span className="text-xs text-gray-500 w-10 text-right">
                    {formatTime(currentTime)}
                  </span>
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={1}
                    onValueChange={handleSeek}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-500 w-10">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>

              {/* Volume & Transcript */}
              <div className="flex items-center gap-2 flex-1 justify-end">
                {currentPodcast.transcript && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="hidden md:flex gap-1"
                  >
                    {showTranscript ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                    Transcript
                  </Button>
                )}
                
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-gray-600 dark:text-gray-400"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    max={100}
                    step={1}
                    onValueChange={(v) => {
                      setVolume(v[0] / 100);
                      setIsMuted(false);
                    }}
                    className="w-24"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!currentPodcast && <Footer />}
    </div>
  );
};

export default PodcastListing;

