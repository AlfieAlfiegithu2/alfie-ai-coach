import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Lock, Star, CheckCircle, Play, ArrowRight, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import LottieLoadingAnimation from '@/components/animations/LottieLoadingAnimation';

interface SkillTest {
  id: string;
  title: string;
  test_order: number;
}

interface UserProgress {
  test_id: string;
  status: 'locked' | 'unlocked' | 'completed';
  completed_score?: number;
}

interface MapNode {
  test: SkillTest;
  progress: UserProgress;
  position: {
    x: number;
    y: number;
  };
}

const ListeningMapView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<SkillTest[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapNodes, setMapNodes] = useState<MapNode[]>([]);

  // Animal progression for listening
  const animalProgression = [
    { name: "Mouse", image: "/moouse emoji.png" },
    { name: "Hamster", image: "/Hamster.png" },
    { name: "Chick", image: "/chick.png" },
    { name: "Rabbit", image: "/rabbit.png" },
    { name: "Kitten", image: "/cat.png" },
    { name: "Puppy", image: "/puppy.png" },
    { name: "Duck", image: "/duck.png" },
    { name: "Hedgehog", image: "/hedgehog.png" },
    { name: "Squirrel", image: "/squerrel.png" },
    { name: "Penguin", image: "/Penguine.png" },
    { name: "Otter", image: "/otter.png" },
    { name: "Koala", image: "/koala.png" },
    { name: "Piglet", image: "/piglet.png" },
    { name: "Monkey", image: "/Monkey.png" },
    { name: "Fox", image: "/fox.png" },
    { name: "Deer", image: "/dear.png" },
    { name: "Seal", image: "/seal.png" },
    { name: "Panda", image: "/panda.png" },
    { name: "Bear", image: "/bear.png" },
    { name: "Polar Bear", image: "/polar bear.png" },
  ];

  const getAnimalForLevel = (levelIndex: number) => {
    if (levelIndex < animalProgression.length) {
      return animalProgression[levelIndex];
    }
    return animalProgression[animalProgression.length - 1];
  };

  const getStarsFromScore = (score: number) => {
    if (score >= 90) return 3;
    if (score >= 70) return 2;
    return 1;
  };

  const renderStars = (starCount: number) => {
    return (
      <div className="flex items-center justify-center">
        {[1, 2, 3].map((star) => (
          <Star
            key={star}
            className={`w-6 h-6 ${
              star <= starCount 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300'
            }`}
            style={{
              transform: `rotate(${(star - 2) * 15}deg) translateY(${star === 2 ? '0px' : '4px'})`,
              margin: '0 2px'
            }}
          />
        ))}
      </div>
    );
  };

  useEffect(() => {
    if (user) {
      loadMapData();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        loadMapData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  const loadMapData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [testsResponse, progressResponse] = await Promise.all([
        supabase
          .from('skill_tests')
          .select('id, title, test_order')
          .eq('skill_slug', 'listening-for-details')
          .order('test_order', { ascending: true }),
        supabase
          .from('user_test_progress')
          .select('test_id, status, completed_score')
          .eq('user_id', user.id)
      ]);

      if (testsResponse.error) throw testsResponse.error;
      if (progressResponse.error) throw progressResponse.error;

      const testsData = testsResponse.data || [];
      let progressData = progressResponse.data || [];

      const testIds = testsData.map(t => t.id);
      progressData = progressData.filter(p => testIds.includes(p.test_id));

      if (testsData.length > 0 && progressData.length === 0) {
        const firstTest = testsData.find(t => t.test_order === 1) || testsData[0];
        if (firstTest) {
          const newProgress = {
            user_id: user.id,
            test_id: firstTest.id,
            status: 'unlocked' as const
          };
          
          await supabase.from('user_test_progress').insert(newProgress);
          progressData = [{ test_id: firstTest.id, status: 'unlocked', completed_score: null }];
        }
      }

      setTests(testsData);
      setUserProgress(progressData as UserProgress[]);
      generateMapNodes(testsData, progressData as UserProgress[]);
    } catch (error) {
      console.error('Error loading map data:', error);
      toast.error('Failed to load listening map');
    } finally {
      setLoading(false);
    }
  };

  const generateMapNodes = (testsData: SkillTest[], progressData: UserProgress[]) => {
    const nodes: MapNode[] = [];
    const pathWidth = 800;
    const pathHeight = 600;
    const horizontalSpacing = pathWidth / 5;
    const verticalSpacing = pathHeight / 4;

    testsData.forEach((test, index) => {
      const row = Math.floor(index / 5);
      const col = index % 5;
      const isEvenRow = row % 2 === 0;
      const actualCol = isEvenRow ? col : 4 - col;
      const x = actualCol * horizontalSpacing + 50;
      const y = row * verticalSpacing + 20;
      
      const progress = progressData.find(p => p.test_id === test.id) || {
        test_id: test.id,
        status: 'locked' as const
      };
      
      nodes.push({
        test,
        progress,
        position: { x, y }
      });
    });
    
    setMapNodes(nodes);
  };

  const handleNodeClick = (node: MapNode) => {
    navigate(`/skills/listening-for-details/test/${node.test.id}`);
  };

  const handleUnlockLevel = async (node: MapNode) => {
    if (!user) return;
    
    try {
      await supabase
        .from('user_test_progress')
        .upsert({
          user_id: user.id,
          test_id: node.test.id,
          status: 'unlocked'
        }, { onConflict: 'user_id,test_id' });
      
      toast.success(`${getAnimalForLevel(mapNodes.indexOf(node)).name} Level unlocked!`);
      loadMapData();
    } catch (error) {
      console.error('Error unlocking level:', error);
      toast.error('Failed to unlock level');
    }
  };

  const getNodeStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg border-yellow-300 hover:shadow-xl transform hover:scale-105';
      case 'unlocked':
        return 'bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg border-orange-300 hover:shadow-xl transform hover:scale-105 cursor-pointer';
      default:
        return 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed';
    }
  };

  const calculateProgress = () => {
    const completedCount = userProgress.filter(p => p.status === 'completed').length;
    return tests.length > 0 ? completedCount / tests.length * 100 : 0;
  };

  const renderPath = () => {
    if (mapNodes.length < 2) return null;
    let pathData = `M ${mapNodes[0].position.x + 50} ${mapNodes[0].position.y + 50}`;
    for (let i = 1; i < mapNodes.length; i++) {
      const prev = mapNodes[i - 1];
      const curr = mapNodes[i];
      const midX = (prev.position.x + curr.position.x) / 2 + 50;
      const midY = (prev.position.y + curr.position.y) / 2 + 50;
      const controlY = midY + Math.sin(i * 0.5) * 30;
      pathData += ` Q ${midX} ${controlY} ${curr.position.x + 50} ${curr.position.y + 50}`;
    }
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <path d={pathData} stroke="url(#pathGradient)" strokeWidth="4" fill="none" strokeDasharray="8,4" className="animate-pulse" />
        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="50%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LottieLoadingAnimation size="lg" message="Loading your listening journey..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <p className="text-lg mb-4">Please sign in to access your listening journey.</p>
            <Button onClick={() => navigate('/auth')} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Listening for Details Journey
          </h1>
          
          <Card className="max-w-md mx-auto bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-gray-600">
                  {userProgress.filter(p => p.status === 'completed').length} / {tests.length}
                </span>
              </div>
              <Progress value={calculateProgress()} className="h-3" />
            </CardContent>
          </Card>
        </div>

        <Card className="relative bg-white/60 backdrop-blur-sm border-2 border-white/80 shadow-xl">
          <CardContent className="pt-4 pb-8 px-8">
            <div className="relative mx-auto" style={{ width: '900px', height: '700px', minHeight: '600px' }}>
              {renderPath()}
              
              {mapNodes.map((node, index) => (
                <div key={node.test.id} className="absolute" style={{ left: `${node.position.x}px`, top: `${node.position.y}px`, zIndex: 10 }}>
                  {node.progress.status === 'locked' ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`relative w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-300 ease-in-out ${getNodeStyle(node.progress.status)} hover:cursor-pointer`}
                              onClick={() => handleNodeClick(node)}
                            >
                              <img
                                src={getAnimalForLevel(index).image}
                                alt={`${getAnimalForLevel(index).name} level icon`}
                                className="absolute inset-0 w-full h-full rounded-full object-cover transform scale-90"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                <HelpCircle className="w-8 h-8 text-white" />
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {index > 0
                              ? `Complete the ${getAnimalForLevel(index - 1).name} Level to unlock! Or double-click to unlock manually.`
                              : 'This is the first level.'}
                          </TooltipContent>
                        </Tooltip>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Unlock {getAnimalForLevel(index).name} Level?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Do you want to unlock this level? This will allow you to start the {getAnimalForLevel(index).name} listening test.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleUnlockLevel(node)}>
                            Yes, Unlock Level
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <div
                      className={`relative w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-300 ease-in-out ${getNodeStyle(node.progress.status)}`}
                      onClick={() => handleNodeClick(node)}
                    >
                       <img
                         src={getAnimalForLevel(index).image}
                         alt={`${getAnimalForLevel(index).name} level icon`}
                         className="absolute inset-0 w-full h-full rounded-full object-cover transform scale-90"
                         loading="lazy"
                       />
                       
                       {node.progress.status === 'unlocked' && (
                         <div className="absolute bottom-1 right-1">
                           <Play className="w-4 h-4 text-orange-500" />
                         </div>
                       )}

                       {node.progress.status === 'completed' && node.progress.completed_score && (
                         <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                           {renderStars(getStarsFromScore(node.progress.completed_score))}
                         </div>
                       )}
                    </div>
                  )}
                  
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-32 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground truncate">
                      {getAnimalForLevel(index).name} Level
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8 space-x-4">
          <Button variant="outline" onClick={() => navigate('/ielts-portal')} className="bg-white/80 backdrop-blur-sm hover:bg-white">
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Back to IELTS Portal
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ListeningMapView;