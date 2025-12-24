import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, Lock } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import SpotlightCard from "@/components/SpotlightCard";
import { CardContent } from "@/components/ui/card";
import { useThemeStyles } from "@/hooks/useThemeStyles";
import { useSubscription } from "@/hooks/useSubscription";
import { ProLockOverlay, LockBadge, useProLockOverlay } from "@/components/ProLockOverlay";

interface DictationTopic {
    id: string;
    level_id: string;
    title: string;
    slug: string;
    order_index: number;
    sentence_count?: number;
    completed_count?: number;
}

interface DictationLevel {
    id: string;
    name: string;
}

const DictationTopics = () => {
    const { levelSlug } = useParams<{ levelSlug: string }>();
    const [level, setLevel] = useState<DictationLevel | null>(null);
    const [topics, setTopics] = useState<DictationTopic[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const themeStyles = useThemeStyles();
    const isNoteTheme = themeStyles.theme.name === 'note';
    const { isItemLocked, isPro } = useSubscription();
    const { isOpen: lockOverlayOpen, showLockOverlay, hideLockOverlay, totalLockedCount } = useProLockOverlay();

    const basePath = location.pathname.includes('/skills/listening-for-details')
        ? '/skills/listening-for-details'
        : '/dictation';

    useEffect(() => {
        if (levelSlug) {
            loadData();
        }
    }, [levelSlug]);

    // Ensure background covers whole body for note theme
    useEffect(() => {
        if (isNoteTheme) {
            const originalHtmlBg = document.documentElement.style.backgroundColor;
            const originalBodyBg = document.body.style.backgroundColor;
            document.documentElement.style.backgroundColor = '#FEF9E7';
            document.body.style.backgroundColor = '#FEF9E7';
            return () => {
                document.documentElement.style.backgroundColor = originalHtmlBg;
                document.body.style.backgroundColor = originalBodyBg;
            };
        }
    }, [isNoteTheme]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Parallel fetch level info and user
            const [{ data: { user } }, { data: levelData, error: levelError }] = await Promise.all([
                supabase.auth.getUser(),
                (supabase as any).from("dictation_levels").select("*").eq("slug", levelSlug).single()
            ]);

            if (levelError) throw levelError;
            setLevel(levelData);
            document.title = `${levelData.name} Topics | Alfie`;

            // 2. Get topics for this level
            const { data: topicsData, error: topicsError } = await (supabase as any)
                .from("dictation_topics")
                .select("*")
                .eq("level_id", levelData.id)
                .order("order_index");

            if (topicsError) throw topicsError;
            if (!topicsData || topicsData.length === 0) {
                setTopics([]);
                return;
            }

            const topicIds = topicsData.map(t => t.id);

            // 3. Parallel fetch sentence counts and user progress ONLY for these topics
            const [sentencesResult, progressResult] = await Promise.all([
                (supabase as any)
                    .from("dictation_sentences")
                    .select("id, topic_id")
                    .in("topic_id", topicIds),
                user?.id
                    ? (supabase as any)
                        .from("user_dictation_progress")
                        .select("sentence_id, is_correct")
                        .eq("user_id", user.id)
                    // Note: We'd ideally filter by sentence_ids here too, 
                    // but let's first get the relevant sentences
                    : Promise.resolve({ data: [] })
            ]);

            const sentencesData = sentencesResult.data || [];
            const userProgress = progressResult.data || [];
            const sentenceIdsInLevel = new Set(sentencesData.map(s => s.id));

            // Filter progress to only include sentences in this level
            const relevantProgress = userProgress.filter(p => sentenceIdsInLevel.has(p.sentence_id));

            // Enrich topics
            const enrichedTopics = topicsData.map((topic: DictationTopic) => {
                const topicSentences = sentencesData.filter((s: { topic_id: string }) => s.topic_id === topic.id);
                const topicSentenceIds = new Set(topicSentences.map((s: { id: string }) => s.id));

                const completedCount = relevantProgress.filter(
                    (p) => topicSentenceIds.has(p.sentence_id) && p.is_correct
                ).length;

                return {
                    ...topic,
                    sentence_count: topicSentences.length,
                    completed_count: completedCount,
                };
            });

            setTopics(enrichedTopics);
        } catch (err) {
            console.error("Error loading topics:", err);
        } finally {
            setLoading(false);
        }
    };

    const getTopicProgress = (topic: DictationTopic) => {
        if (!topic.sentence_count) return 0;
        return Math.round((topic.completed_count || 0) / topic.sentence_count * 100);
    };

    return (
        <div className="min-h-screen relative bg-[#FEF9E7]">
            {isNoteTheme && (
                <style>{`
                    body, html, #root { background-color: #FEF9E7 !important; }
                `}</style>
            )}
            <div className="relative z-10">
                <StudentLayout title={level?.name || "Topics"} showBackButton={false} transparentBackground={true}>
                    <div className="max-w-6xl mx-auto px-4 py-8">
                        {/* Back Button */}
                        <div className="flex items-center mb-8">
                            <button
                                onClick={() => navigate(basePath)}
                                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold transition-all rounded-full hover:shadow-md"
                                style={{
                                    color: '#5D4E37',
                                    backgroundColor: '#FFFDF5',
                                    border: '1px solid #E8D5A3'
                                }}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Levels
                            </button>
                        </div>

                        {/* Header */}
                        <header className="mb-12">
                            <h1 className="text-3xl md:text-5xl font-black mb-2 font-nunito tracking-tight" style={{ color: '#5D4E37' }}>
                                {level?.name} Topics
                            </h1>
                            <p className="opacity-80 font-medium text-lg" style={{ color: '#8B6914' }}>
                                Select a topic to start your listening practice.
                            </p>
                        </header>

                        {/* Topics Grid */}
                        {loading ? (
                            <div className="flex justify-center py-24">
                                <div className="w-10 h-10 border-4 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                                {topics.map((topic, index) => {
                                    const isCompleted = getTopicProgress(topic) === 100;
                                    const isLocked = isItemLocked(index, 1); // First topic is free
                                    const lockedTopicsCount = isPro ? 0 : Math.max(0, topics.length - 1);

                                    return (
                                        <SpotlightCard
                                            key={topic.id}
                                            className={`cursor-pointer min-h-[140px] transition-all duration-300 flex flex-col group relative rounded-[1.5rem] border-2 ${isLocked ? 'opacity-75' : 'hover:scale-105 hover:shadow-lg'
                                                }`}
                                            onClick={() => {
                                                if (isLocked) {
                                                    showLockOverlay('This listening topic', lockedTopicsCount);
                                                } else {
                                                    navigate(`${basePath}/${levelSlug}/${topic.slug}`);
                                                }
                                            }}
                                            style={{
                                                backgroundColor: isLocked ? '#F5F0E6' : isCompleted ? '#F7FBEF' : '#FFFDF5',
                                                borderColor: isLocked ? '#D4C4A8' : isCompleted ? '#C0CFB2' : '#E8D5A3'
                                            }}
                                        >
                                            <CardContent className="p-6 flex flex-col h-full justify-center">
                                                {isLocked ? (
                                                    <LockBadge />
                                                ) : isCompleted ? (
                                                    <div className="absolute top-4 right-4 text-green-500">
                                                        <Check className="w-5 h-5 stroke-[3]" />
                                                    </div>
                                                ) : null}
                                                <h3
                                                    className="text-xl font-black mb-3 font-nunito tracking-tight"
                                                    style={{ color: isLocked ? '#8B6914' : '#5D4E37' }}
                                                >
                                                    {topic.title}
                                                </h3>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-xs font-bold uppercase tracking-wider opacity-60" style={{ color: '#A68B5B' }}>
                                                        {isLocked ? 'Pro' : `${topic.sentence_count} Sentences`}
                                                    </span>
                                                    {!isLocked && getTopicProgress(topic) > 0 && !isCompleted && (
                                                        <span className="text-xs font-black" style={{ color: '#D97706' }}>
                                                            {getTopicProgress(topic)}%
                                                        </span>
                                                    )}
                                                </div>

                                                {!isLocked && getTopicProgress(topic) > 0 && !isCompleted && (
                                                    <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden mt-4">
                                                        <div
                                                            className="h-full bg-amber-500 transition-all duration-500"
                                                            style={{ width: `${getTopicProgress(topic)}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </CardContent>
                                        </SpotlightCard>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Pro Lock Overlay */}
                    <ProLockOverlay
                        isOpen={lockOverlayOpen}
                        onClose={hideLockOverlay}
                        featureName="This listening topic"
                        totalLockedCount={totalLockedCount}
                    />
                </StudentLayout>
            </div>
        </div>
    );
};

export default DictationTopics;
