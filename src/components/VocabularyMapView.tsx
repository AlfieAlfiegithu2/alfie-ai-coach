import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Lock, Star, CheckCircle, Play, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
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
const VocabularyMapView = () => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<SkillTest[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapNodes, setMapNodes] = useState<MapNode[]>([]);

  // Animal progression from weakest to strongest with images
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
    // For levels beyond our array, cycle through or use the last one
    return animalProgression[animalProgression.length - 1];
  };
  useEffect(() => {
    if (user) {
      loadMapData();
    }
  }, [user]);
  const loadMapData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load all vocabulary tests ordered by test_order
      const {
        data: testsData,
        error: testsError
      } = await supabase.from('skill_tests').select('id, title, test_order').eq('skill_slug', 'vocabulary-builder').order('test_order', {
        ascending: true
      });
      if (testsError) throw testsError;

      // Load user's progress for these tests
      const {
        data: progressData,
        error: progressError
      } = await supabase.from('user_test_progress').select('test_id, status, completed_score').eq('user_id', user.id).in('test_id', testsData?.map(t => t.id) || []);
      if (progressError) throw progressError;

      // If no progress exists and there are tests, unlock the first one
      if (testsData && testsData.length > 0 && (!progressData || progressData.length === 0)) {
        const firstTest = testsData.find(t => t.test_order === 1) || testsData[0];
        if (firstTest) {
          await supabase.from('user_test_progress').insert({
            user_id: user.id,
            test_id: firstTest.id,
            status: 'unlocked'
          });

          // Reload progress data
          const {
            data: updatedProgressData
          } = await supabase.from('user_test_progress').select('test_id, status, completed_score').eq('user_id', user.id).in('test_id', testsData.map(t => t.id));
          setUserProgress((updatedProgressData || []) as UserProgress[]);
          generateMapNodes(testsData, (updatedProgressData || []) as UserProgress[]);
        }
      } else {
        setUserProgress((progressData || []) as UserProgress[]);
        generateMapNodes(testsData || [], (progressData || []) as UserProgress[]);
      }
      setTests(testsData || []);
    } catch (error) {
      console.error('Error loading map data:', error);
      toast.error('Failed to load vocabulary map');
    } finally {
      setLoading(false);
    }
  };
  const generateMapNodes = (testsData: SkillTest[], progressData: UserProgress[]) => {
    const nodes: MapNode[] = [];
    const pathWidth = 800;
    const pathHeight = 600;
    const horizontalSpacing = pathWidth / 5; // 5 nodes per row
    const verticalSpacing = pathHeight / 4; // 4 rows

    testsData.forEach((test, index) => {
      const row = Math.floor(index / 5);
      const col = index % 5;

      // Create a winding path effect
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
        position: {
          x,
          y
        }
      });
    });
    setMapNodes(nodes);
  };
  const handleNodeClick = (node: MapNode) => {
    if (node.progress.status === 'locked') {
      toast.error('This level is still locked! Complete previous levels to unlock.');
      return;
    }
    navigate(`/skills/vocabulary-builder/test/${node.test.id}`);
  };
  const getNodeIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Star className="w-6 h-6 text-yellow-500" fill="currentColor" />;
      case 'unlocked':
        return <Play className="w-6 h-6 text-green-500" />;
      default:
        return <Lock className="w-5 h-5 text-gray-400" />;
    }
  };
  const getNodeStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg border-yellow-300 hover:shadow-xl transform hover:scale-105';
      case 'unlocked':
        return 'bg-gradient-to-br from-green-400 to-blue-500 text-white shadow-lg border-green-300 hover:shadow-xl transform hover:scale-105 cursor-pointer';
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

      // Create curved connections between nodes
      const midX = (prev.position.x + curr.position.x) / 2 + 50;
      const midY = (prev.position.y + curr.position.y) / 2 + 50;
      const controlY = midY + Math.sin(i * 0.5) * 30; // Add some wave effect

      pathData += ` Q ${midX} ${controlY} ${curr.position.x + 50} ${curr.position.y + 50}`;
    }
    return <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{
      zIndex: 1
    }}>
        <path d={pathData} stroke="url(#pathGradient)" strokeWidth="4" fill="none" strokeDasharray="8,4" className="animate-pulse" />
        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      </svg>;
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-lg">Loading your vocabulary journey...</p>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Vocabulary Journey
          </h1>
          
          
          {/* Progress Bar */}
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

        {/* Map Container */}
        <Card className="relative bg-white/60 backdrop-blur-sm border-2 border-white/80 shadow-xl">
          <CardContent className="pt-4 pb-8 px-8">
            <div className="relative mx-auto" style={{
            width: '900px',
            height: '700px',
            minHeight: '600px'
          }}>
              {/* Path */}
              {renderPath()}
              
              {/* Nodes */}
              {mapNodes.map((node, index) => <div key={node.test.id} className="absolute" style={{
              left: `${node.position.x}px`,
              top: `${node.position.y}px`,
              zIndex: 10
            }}>
                  {node.progress.status === 'locked' ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`
                            relative w-24 h-24 rounded-full border-4 flex items-center justify-center
                            transition-all duration-300 ease-in-out
                            ${getNodeStyle(node.progress.status)}
                          `}
                          onClick={() => handleNodeClick(node)}
                        >
                          <img
                            src={getAnimalForLevel(index).image}
                            alt={`${getAnimalForLevel(index).name} level icon`}
                            className="absolute inset-0 w-full h-full rounded-full object-cover transform scale-90"
                            loading="lazy"
                          />
                          
                          {/* Jail bars overlay */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex space-x-1">
                              {[...Array(4)].map((_, i) => (
                                <div key={i} className="w-1 h-16 bg-gray-600 rounded-full opacity-80"></div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {index > 0
                          ? `Complete the ${getAnimalForLevel(index - 1).name} Level to unlock!`
                          : 'This is the first level.'}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div
                      className={`
                        relative w-24 h-24 rounded-full border-4 flex items-center justify-center
                        transition-all duration-300 ease-in-out
                        ${getNodeStyle(node.progress.status)}
                      `}
                      onClick={() => handleNodeClick(node)}
                    >
                       <img
                         src={getAnimalForLevel(index).image}
                         alt={`${getAnimalForLevel(index).name} level icon`}
                         className="absolute inset-0 w-full h-full rounded-full object-cover transform scale-90"
                         loading="lazy"
                       />
                       
                       <div className="absolute bottom-1 right-1">
                         {node.progress.status === 'completed' ? (
                           <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                         ) : (
                           <Play className="w-4 h-4 text-green-500" />
                         )}
                       </div>

                      {node.progress.status === 'completed' && node.progress.completed_score && (
                        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                          <div className="bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold">
                            {node.progress.completed_score}%
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Level Title */}
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-32 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground truncate">
                      {getAnimalForLevel(index).name} Level
                    </p>
                  </div>
                </div>)}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="text-center mt-8 space-x-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="bg-white/80 backdrop-blur-sm hover:bg-white">
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Back to Dashboard
          </Button>
          
          <Button onClick={() => navigate('/vocabulary')} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <CheckCircle className="w-4 h-4 mr-2" />
            View Saved Vocabulary
          </Button>
        </div>

        {/* Legend */}
        <Card className="mt-8 bg-white/60 backdrop-blur-sm">
          
        </Card>
      </div>
    </div>;
};
export default VocabularyMapView;