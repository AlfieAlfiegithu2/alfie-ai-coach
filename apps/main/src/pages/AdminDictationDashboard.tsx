import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, Headphones, Volume2 } from "lucide-react";

interface DictationLevel {
    id: string;
    name: string;
    slug: string;
    description: string;
    order_index: number;
    icon: string;
    color: string;
    topic_count?: number;
    sentence_count?: number;
    audio_count?: number;
}

const AdminDictationDashboard = () => {
    const [levels, setLevels] = useState<DictationLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Dictation Practice | Admin";
        loadLevels();
    }, []);

    const loadLevels = async () => {
        setLoading(true);
        try {
            // Get all levels
            const { data: levelsData, error: levelsError } = await supabase
                .from("dictation_levels")
                .select("*")
                .order("order_index");

            if (levelsError) throw levelsError;

            // Get topic counts per level
            const { data: topicsData } = await supabase
                .from("dictation_topics")
                .select("level_id");

            // Get sentence counts and audio status per level
            const { data: sentencesData } = await supabase
                .from("dictation_sentences")
                .select("topic_id, audio_url_us, audio_url_uk, dictation_topics!inner(level_id)");

            // Calculate stats
            const enrichedLevels = (levelsData || []).map((level: DictationLevel) => {
                const topicCount = topicsData?.filter((t: { level_id: string }) => t.level_id === level.id).length || 0;

                const levelSentences = sentencesData?.filter(
                    (s: { dictation_topics: { level_id: string } }) => s.dictation_topics?.level_id === level.id
                ) || [];

                const sentenceCount = levelSentences.length;
                const audioCount = levelSentences.filter(
                    (s: { audio_url_us: string | null; audio_url_uk: string | null }) => s.audio_url_us || s.audio_url_uk
                ).length;

                return {
                    ...level,
                    topic_count: topicCount,
                    sentence_count: sentenceCount,
                    audio_count: audioCount,
                };
            });

            setLevels(enrichedLevels);
        } catch (err) {
            console.error("Error loading levels:", err);
        } finally {
            setLoading(false);
        }
    };

    const getLevelColor = (slug: string) => {
        switch (slug) {
            case "beginner": return "bg-green-500/10 text-green-600 border-green-200";
            case "intermediate": return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
            case "advanced": return "bg-red-500/10 text-red-600 border-red-200";
            default: return "bg-gray-500/10 text-gray-600 border-gray-200";
        }
    };

    return (
        <AdminLayout title="Dictation Practice" showBackButton>
            <div className="space-y-6">
                {/* Header Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Topics</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {levels.reduce((sum, l) => sum + (l.topic_count || 0), 0)}
                            </div>
                            <p className="text-xs text-muted-foreground">across all levels</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Sentences</CardTitle>
                            <Headphones className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {levels.reduce((sum, l) => sum + (l.sentence_count || 0), 0)}
                            </div>
                            <p className="text-xs text-muted-foreground">dictation exercises</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Audio Generated</CardTitle>
                            <Volume2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {levels.reduce((sum, l) => sum + (l.audio_count || 0), 0)}
                            </div>
                            <p className="text-xs text-muted-foreground">with TTS audio</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Level Cards */}
                <div className="grid gap-6 md:grid-cols-3">
                    {loading ? (
                        <div className="col-span-3 flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        levels.map((level) => (
                            <Card
                                key={level.id}
                                className="hover:shadow-lg transition-all cursor-pointer group"
                                onClick={() => navigate(`/admin/dictation/${level.slug}`)}
                            >
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <span className="text-3xl">{level.icon}</span>
                                        <Badge className={getLevelColor(level.slug)}>
                                            {level.name}
                                        </Badge>
                                    </div>
                                    <CardTitle className="group-hover:text-primary transition-colors">
                                        {level.name} Level
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {level.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Topics</span>
                                            <span className="font-medium">{level.topic_count || 0} / 30</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Sentences</span>
                                            <span className="font-medium">{level.sentence_count || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Audio Ready</span>
                                            <span className="font-medium">
                                                {level.audio_count || 0} / {level.sentence_count || 0}
                                            </span>
                                        </div>
                                        {/* Progress bar */}
                                        <div className="h-2 bg-muted rounded-full overflow-hidden mt-3">
                                            <div
                                                className="h-full bg-primary transition-all"
                                                style={{
                                                    width: `${level.sentence_count ? (level.audio_count || 0) / level.sentence_count * 100 : 0}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full mt-4"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/admin/dictation/${level.slug}`);
                                        }}
                                    >
                                        Manage Topics
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Help Section */}
                <Card className="bg-muted/50">
                    <CardHeader>
                        <CardTitle className="text-lg">How Dictation Practice Works</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>• <strong>3 Levels:</strong> Beginner (daily English), Intermediate (TOEIC-style business), Advanced (IELTS-style academic)</p>
                        <p>• <strong>30 Topics per Level:</strong> Each topic covers a specific context or theme</p>
                        <p>• <strong>20 Sentences per Topic:</strong> Students listen and type exactly what they hear</p>
                        <p>• <strong>Dual Accent Audio:</strong> Each sentence has both American (US) and British (UK) accent versions</p>
                        <p>• <strong>Instant Feedback:</strong> Character-by-character diff shows exactly where mistakes were made</p>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default AdminDictationDashboard;
