import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Play, Pause, ArrowRight } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { useThemeStyles } from "@/hooks/useThemeStyles";

interface DictationSentence {
    id: string;
    topic_id: string;
    sentence_text: string;
    audio_url_us: string | null;
    audio_url_uk: string | null;
    order_index: number;
}

interface DictationTopic {
    id: string;
    title: string;
    icon: string;
}

type Accent = "us" | "uk";

interface SessionResult {
    sentenceId: string;
    correct: boolean;
    userInput: string;
    correctText: string;
}

const DictationPractice = () => {
    const { levelSlug, topicSlug } = useParams<{ levelSlug: string; topicSlug: string }>();
    const [topic, setTopic] = useState<DictationTopic | null>(null);
    const [sentences, setSentences] = useState<DictationSentence[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userInput, setUserInput] = useState("");
    const [isChecked, setIsChecked] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [accent, setAccent] = useState<Accent>("us");
    const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const themeStyles = useThemeStyles();
    const isNoteTheme = themeStyles.theme.name === 'note';

    const basePath = location.pathname.includes('/skills/listening-for-details')
        ? '/skills/listening-for-details'
        : '/dictation';

    useEffect(() => {
        if (levelSlug && topicSlug) {
            loadData();
        }
    }, [levelSlug, topicSlug]);

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
            const { data: { user } } = await supabase.auth.getUser();
            setUserId(user?.id || null);

            // Get level
            const { data: levelData, error: levelError } = await (supabase as any)
                .from("dictation_levels")
                .select("id")
                .eq("slug", levelSlug)
                .single();

            if (levelError) throw levelError;

            // Get topic
            const { data: topicData, error: topicError } = await (supabase as any)
                .from("dictation_topics")
                .select("id, title, icon")
                .eq("level_id", levelData.id)
                .eq("slug", topicSlug)
                .single();

            if (topicError) throw topicError;
            setTopic(topicData);
            document.title = `${topicData.title} | Alfie`;

            // Get sentences
            const { data: sentencesData, error: sentencesError } = await (supabase as any)
                .from("dictation_sentences")
                .select("*")
                .eq("topic_id", topicData.id)
                .order("order_index");

            if (sentencesError) throw sentencesError;
            setSentences(sentencesData || []);
        } catch (err) {
            console.error("Error loading practice data:", err);
        } finally {
            setLoading(false);
        }
    };

    const playAudio = useCallback(() => {
        if (!audioRef.current || sentences.length === 0) return;

        const currentSentence = sentences[currentIndex];
        const audioUrl = accent === "us" ? currentSentence.audio_url_us : currentSentence.audio_url_uk;

        if (audioUrl) {
            audioRef.current.src = audioUrl;
            audioRef.current.play();
            setIsPlaying(true);
        }
    }, [currentIndex, sentences, accent]);

    const handleAudioEnd = () => {
        setIsPlaying(false);
        inputRef.current?.focus();
    };

    const checkAnswer = async () => {
        if (isChecked) return;
        if (!sentences[currentIndex]) return;

        const currentSentence = sentences[currentIndex];
        const normalizedInput = userInput.trim().toLowerCase().replace(/[.,!?;:]/g, "");
        const normalizedCorrect = currentSentence.sentence_text.trim().toLowerCase().replace(/[.,!?;:]/g, "");

        const correct = normalizedInput === normalizedCorrect;
        setIsCorrect(correct);
        setIsChecked(true);

        // Save result locally
        setSessionResults((prev) => [
            ...prev,
            {
                sentenceId: currentSentence.id,
                correct,
                userInput: userInput.trim(),
                correctText: currentSentence.sentence_text,
            },
        ]);

        // Save progress to database if logged in
        if (userId) {
            try {
                const { data: existing } = await (supabase as any)
                    .from("user_dictation_progress")
                    .select("id, attempts, correct_attempts")
                    .eq("user_id", userId)
                    .eq("sentence_id", currentSentence.id)
                    .single();

                if (existing) {
                    await (supabase as any)
                        .from("user_dictation_progress")
                        .update({
                            attempts: existing.attempts + 1,
                            correct_attempts: correct ? existing.correct_attempts + 1 : existing.correct_attempts,
                            last_input: userInput.trim(),
                            is_correct: correct,
                            last_attempt_at: new Date().toISOString(),
                        })
                        .eq("id", existing.id);
                } else {
                    await (supabase as any).from("user_dictation_progress").insert({
                        user_id: userId,
                        sentence_id: currentSentence.id,
                        attempts: 1,
                        correct_attempts: correct ? 1 : 0,
                        last_input: userInput.trim(),
                        is_correct: correct,
                    });
                }
            } catch (err) {
                console.error("Error saving progress:", err);
            }
        }
    };

    const nextSentence = () => {
        if (currentIndex < sentences.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            setUserInput("");
            setIsChecked(false);
            setIsCorrect(false);
            setIsPlaying(false);
            // Small delay to ensure state updates before focus
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setShowResults(true);
        }
    };

    const restartTopic = () => {
        setCurrentIndex(0);
        setUserInput("");
        setIsChecked(false);
        setIsCorrect(false);
        setSessionResults([]);
        setShowResults(false);
        setIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const renderDiff = (input: string, correct: string) => {
        const inputWords = input.split(/\s+/);
        const correctWords = correct.split(/\s+/);

        return (
            <div className="flex flex-wrap gap-x-1 gap-y-1">
                {correctWords.map((word, i) => {
                    const inputWord = inputWords[i] || "";
                    const normalizedInput = inputWord.toLowerCase().replace(/[.,!?;:]/g, "");
                    const normalizedCorrect = word.toLowerCase().replace(/[.,!?;:]/g, "");
                    const isMatch = normalizedInput === normalizedCorrect;

                    return (
                        <span
                            key={i}
                            className={`px-1 rounded-sm ${isMatch ? "text-green-600 font-medium" : "text-red-500 line-through decoration-2"}`}
                        >
                            {word}{" "}
                        </span>
                    );
                })}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FEF9E7]">
                <div className="w-10 h-10 border-4 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (showResults) {
        const correctCount = sessionResults.filter((r) => r.correct).length;
        const percentage = Math.round((correctCount / sentences.length) * 100);

        return (
            <StudentLayout title="Practice Results" showBackButton={false} transparentBackground={true}>
                <div className="flex items-center justify-center p-4" style={{ minHeight: '80vh' }}>
                    <div className="max-w-2xl w-full mx-auto">
                        <div className="p-12 rounded-[2.5rem] border-2 text-center" style={{
                            backgroundColor: '#FFFDF5',
                            borderColor: '#E8D5A3',
                            boxShadow: '0 10px 40px -10px rgba(93, 78, 55, 0.1)'
                        }}>
                            <div className="text-6xl mb-6">🎯</div>
                            <h2 className="text-3xl font-black mb-2 font-nunito" style={{ color: '#5D4E37' }}>Topic Complete!</h2>
                            <p className="text-lg opacity-80 mb-8 font-medium" style={{ color: '#8B6914' }}>Excellent work on finishing this lesson.</p>

                            <div className="flex justify-center gap-12 mb-12">
                                <div>
                                    <div className="text-5xl font-black mb-1" style={{ color: '#D97706' }}>{correctCount}/{sentences.length}</div>
                                    <div className="text-xs font-bold uppercase tracking-widest opacity-60" style={{ color: '#A68B5B' }}>Correct</div>
                                </div>
                                <div>
                                    <div className="text-5xl font-black mb-1" style={{ color: '#D97706' }}>{percentage}%</div>
                                    <div className="text-xs font-bold uppercase tracking-widest opacity-60" style={{ color: '#A68B5B' }}>Accuracy</div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    className="px-8 py-4 rounded-2xl font-black transition-all hover:scale-105 shadow-md"
                                    onClick={() => navigate(`${basePath}/${levelSlug}`)}
                                    style={{
                                        backgroundColor: '#5D4E37',
                                        color: '#FFFDF5'
                                    }}
                                >
                                    Browse Topics
                                </button>
                                <button
                                    className="px-8 py-4 rounded-2xl font-black transition-all hover:scale-105 shadow-md"
                                    onClick={restartTopic}
                                    style={{
                                        backgroundColor: '#D97706',
                                        color: '#FFFDF5'
                                    }}
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </StudentLayout>
        );
    }

    return (
        <div className="min-h-screen relative bg-[#FEF9E7]">
            {isNoteTheme && (
                <style>{`
                    body, html, #root { background-color: #FEF9E7 !important; }
                `}</style>
            )}
            <div className="relative z-10">
                <StudentLayout title={topic?.title || "Practice"} showBackButton={false} transparentBackground={true}>
                    <div className="max-w-3xl mx-auto px-4 py-8">
                        {/* Back Button */}
                        <div className="flex items-center mb-6">
                            <button
                                onClick={() => navigate(`${basePath}/${levelSlug}`)}
                                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold transition-all rounded-full hover:shadow-md"
                                style={{
                                    color: '#5D4E37',
                                    backgroundColor: '#FFFDF5',
                                    border: '1px solid #E8D5A3'
                                }}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Topics
                            </button>
                        </div>

                        <div className="p-8 md:p-10 rounded-[2.5rem] border-2 shadow-xl" style={{
                            backgroundColor: '#FFFDF5',
                            borderColor: '#E8D5A3'
                        }}>
                            {/* Progress */}
                            <div className="flex justify-between items-center mb-8">
                                <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: '#A68B5B' }}>
                                    Sentence {currentIndex + 1} of {sentences.length}
                                </span>
                                <div className="flex gap-2">
                                    {sentences.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === currentIndex ? "scale-125 ring-2 ring-amber-500 ring-offset-2" : ""
                                                }`}
                                            style={{
                                                backgroundColor: i < currentIndex
                                                    ? (sessionResults[i]?.correct ? '#22c55e' : '#ef4444')
                                                    : i === currentIndex ? '#D97706' : 'rgba(0,0,0,0.05)'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Audio Focus Section */}
                            <div className="text-center mb-10 p-10 rounded-[2rem] bg-black/5 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <button
                                    className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-2xl relative z-10 ${isPlaying ? "animate-pulse" : ""
                                        }`}
                                    onClick={playAudio}
                                    style={{ backgroundColor: '#D97706', color: 'white' }}
                                >
                                    {isPlaying ? <Pause size={40} /> : <Play size={40} className="ml-2" />}
                                </button>
                                <div className="mt-8 flex justify-center gap-4 relative z-10">
                                    <button
                                        className={`px-6 py-2 rounded-full text-xs font-black tracking-widest transition-all ${accent === "us" ? "shadow-lg scale-105" : "opacity-40 grayscale"
                                            }`}
                                        onClick={() => setAccent("us")}
                                        style={{
                                            backgroundColor: accent === "us" ? '#5D4E37' : 'transparent',
                                            color: accent === "us" ? 'white' : '#5D4E37',
                                            border: `2px solid ${accent === "us" ? '#5D4E37' : 'rgba(0,0,0,0.1)'}`
                                        }}
                                    >
                                        🇺🇸 US ACCENT
                                    </button>
                                    <button
                                        className={`px-6 py-2 rounded-full text-xs font-black tracking-widest transition-all ${accent === "uk" ? "shadow-lg scale-105" : "opacity-40 grayscale"
                                            }`}
                                        onClick={() => setAccent("uk")}
                                        style={{
                                            backgroundColor: accent === "uk" ? '#5D4E37' : 'transparent',
                                            color: accent === "uk" ? 'white' : '#5D4E37',
                                            border: `2px solid ${accent === "uk" ? '#5D4E37' : 'rgba(0,0,0,0.1)'}`
                                        }}
                                    >
                                        🇬🇧 UK ACCENT
                                    </button>
                                </div>
                            </div>

                            {/* Input Section */}
                            <div className="space-y-6">
                                <textarea
                                    ref={inputRef}
                                    className="w-full min-h-[140px] p-8 text-2xl bg-transparent border-2 rounded-[1.5rem] transition-all focus:outline-none focus:ring-8 ring-amber-500/5 font-medium leading-relaxed"
                                    style={{
                                        borderColor: isChecked ? (isCorrect ? '#22c55e' : '#ef4444') : '#E8D5A3',
                                        color: '#5D4E37'
                                    }}
                                    placeholder="Type the sentence exactly as you hear it..."
                                    value={userInput}
                                    onChange={(e) => !isChecked && setUserInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            isChecked ? nextSentence() : checkAnswer();
                                        }
                                    }}
                                    disabled={isChecked}
                                    autoFocus
                                />

                                {isChecked && (
                                    <div className={`p-8 rounded-[1.5rem] border-2 transition-all animate-in zoom-in-95 duration-300`} style={{
                                        backgroundColor: isCorrect ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                        borderColor: isCorrect ? '#bbf7d0' : '#fecaca'
                                    }}>
                                        <div className="text-xs font-black uppercase tracking-[0.2em] mb-4" style={{ color: isCorrect ? '#16a34a' : '#dc2626' }}>
                                            {isCorrect ? "Perfectly Done! ✨" : "Let's check for differences"}
                                        </div>

                                        <div className="text-xl leading-relaxed">
                                            {renderDiff(userInput, sentences[currentIndex].sentence_text)}
                                        </div>

                                        {!isCorrect && (
                                            <div className="mt-6 pt-6 border-t border-red-200/50">
                                                <div className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-2" style={{ color: '#A68B5B' }}>IDEAL TRANSCRIPTION</div>
                                                <div className="text-xl font-bold" style={{ color: '#5D4E37' }}>{sentences[currentIndex].sentence_text}</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    className="w-full py-5 rounded-[1.5rem] font-black text-xl transition-all hover:scale-[1.01] hover:shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden group"
                                    onClick={isChecked ? nextSentence : checkAnswer}
                                    disabled={!userInput.trim()}
                                    style={{
                                        backgroundColor: isChecked ? '#D97706' : '#5D4E37',
                                        color: 'white',
                                        opacity: userInput.trim() ? 1 : 0.5
                                    }}
                                >
                                    <span className="relative z-10 flex items-center gap-3">
                                        {isChecked ? (
                                            <>
                                                {currentIndex === sentences.length - 1 ? "Complete Topic" : "Next Sentence"}
                                                <ArrowRight size={24} strokeWidth={3} />
                                            </>
                                        ) : (
                                            "Check Accuracy"
                                        )}
                                    </span>
                                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                </StudentLayout>
            </div>
            <audio ref={audioRef} onEnded={handleAudioEnd} hidden />
        </div>
    );
};

export default DictationPractice;
