import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Play, Pause, Check, Globe } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import LottieLoadingAnimation from "@/components/animations/LottieLoadingAnimation";
import { useThemeStyles } from "@/hooks/useThemeStyles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchDictationTranslations } from "@/lib/d1Client";
import { useAuth } from "@/hooks/useAuth";

interface DictationSentence {
    id: string;
    topic_id: string;
    sentence_text: string;
    audio_url_us: string | null;
    audio_url_uk: string | null;
    order_index: number;
    hints?: string;
    translations?: {
        ko?: string;
        [key: string]: string | undefined;
    };
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
    userAnswer: string;
    correctAnswer: string;
}

const DictationPractice = () => {
    const { levelSlug, topicSlug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const themeStyles = useThemeStyles();
    const { user } = useAuth();

    // State
    const [topic, setTopic] = useState<DictationTopic | null>(null);
    const [sentences, setSentences] = useState<DictationSentence[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);

    const [wordValues, setWordValues] = useState<string[]>([]);
    const [currentWords, setCurrentWords] = useState<string[]>([]);
    const [showTranslation, setShowTranslation] = useState(false);

    const [isChecked, setIsChecked] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
    const [accent, setAccent] = useState<Accent>("us");
    const [nativeLanguage, setNativeLanguage] = useState<string>("ko");

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const wordInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const basePath = location.pathname.split('/skills/listening-for-details')[0] + '/skills/listening-for-details';

    useEffect(() => {
        loadContent();
    }, [levelSlug, topicSlug]);

    // Global keyboard listener for Enter to go to next question when answer is checked
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nextSentence();
            }
        };

        if (isChecked) {
            // Small delay to prevent the same Enter keypress from triggering both check and next
            timeoutId = setTimeout(() => {
                window.addEventListener('keydown', handleGlobalKeyDown);
            }, 100);
        }

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [isChecked]);

    const loadContent = async () => {
        try {
            const { data: topicData, error: topicError } = await (supabase
                .from('dictation_topics' as any)
                .select('*')
                .eq('slug', topicSlug)
                .single() as unknown as Promise<{ data: DictationTopic | null; error: any }>);

            if (topicError) throw topicError;
            if (!topicData) throw new Error('Topic not found');
            setTopic(topicData);

            const { data: sentencesData, error: sentencesError } = await (supabase
                .from('dictation_sentences' as any)
                .select('*')
                .eq('topic_id', topicData.id)
                .order('order_index') as unknown as Promise<{ data: DictationSentence[] | null; error: any }>);

            if (sentencesError) throw sentencesError;

            if (sentencesData && sentencesData.length > 0) {
                // Fetch user language if not already known
                let userLang = nativeLanguage;
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('native_language')
                        .eq('id', user.id)
                        .single();
                    if (profile?.native_language) {
                        userLang = profile.native_language;
                        setNativeLanguage(userLang);
                    }
                }

                // Fetch translations from Cloudflare D1 for the user's language
                const sentenceIds = sentencesData.map(s => s.id);
                const d1Translations = await fetchDictationTranslations(sentenceIds, userLang);
                const d1Map: Record<string, string> = {};
                d1Translations.forEach(t => { d1Map[t.sentence_id] = t.translation; });

                // Process sentences to handle fallback translations from D1, Supabase, or hardcoded list
                const processedSentences = sentencesData.map(s => {
                    let translations = s.translations || {};

                    // Priority 1: Cloudflare D1
                    if (d1Map[s.id]) {
                        translations = { ...translations, [userLang]: d1Map[s.id] };
                    }

                    // Fallback 1: check if hints contains JSON with translation
                    if (!translations.ko && s.hints && typeof s.hints === 'string' && s.hints.trim().startsWith('{')) {
                        try {
                            const parsed = JSON.parse(s.hints);
                            if (parsed.ko) {
                                translations = { ...translations, ko: parsed.ko };
                            }
                        } catch (e) {
                            // Not JSON, ignore
                        }
                    }

                    // Fallback 2: Hardcoded for "numbers-counting" (For Try / Demo)
                    if (!translations.ko && topicSlug === 'numbers-counting') {
                        const demoTranslations: Record<string, string> = {
                            "I have two small cats": "저는 작은 고양이 두 마리를 키웁니다.",
                            "She has three red pens": "그녀는 빨간 펜 세 자루를 가지고 있습니다.",
                            "There are four chairs here": "여기 의자가 네 개 있습니다.",
                            "I see five big birds": "저는 큰 새 다섯 마리가 보입니다.",
                            "He needs six white eggs": "그는 하얀 달걀 여섯 개가 필요합니다.",
                            "The bus comes in seven minutes": "버스는 7분 후에 옵니다.",
                            "There are eight books on the desk": "책상 위에 책 여덟 권이 있습니다.",
                            "I want nine apples please": "사과 아홉 개 주세요.",
                            "Ten students are in the class": "교실에 학생 열 명이 있습니다.",
                            "I am twenty years old": "저는 스무 살입니다.",
                            "The room number is twelve": "방 번호는 12번입니다.",
                            "I have one brother and one sister": "저는 남동생 한 명과 여동생 한 명이 있습니다.",
                            "There are seven days in a week": "일주일은 7일입니다.",
                            "I need five dollars for coffee": "커피를 마시려면 5달러가 필요합니다.",
                            "It is three o'clock now": "지금은 3시입니다.",
                            "He drinks two cups of water": "그는 물 두 잔을 마십니다.",
                            "She buys four blue shirts": "그녀는 파란색 셔츠 네 벌을 삽니다.",
                            "The house has three small rooms": "이 집에는 작은 방이 세 개 있습니다.",
                            "There are ten fingers on my hands": "제 손에는 손가락이 열 개 있습니다.",
                            "I walk for thirty minutes every day": "저는 매일 30분 동안 걷습니다."
                        };

                        // Normalization helper
                        const norm = (str: string) => str.toLowerCase().replace(/[.,!?;:]/g, "").trim();
                        const currentNorm = norm(s.sentence_text);

                        const matchedKey = Object.keys(demoTranslations).find(k => norm(k) === currentNorm);

                        if (matchedKey) {
                            translations = { ...translations, ko: demoTranslations[matchedKey] };
                        }
                    }

                    return { ...s, translations };
                });

                setSentences(processedSentences);
                initializeSentence(processedSentences[0].sentence_text);
            }
        } catch (error) {
            console.error('Error loading dictation content:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const initializeSentence = (text: string) => {
        const words = text.split(" ");
        setCurrentWords(words);
        setWordValues(new Array(words.length).fill(""));
        wordInputRefs.current = new Array(words.length).fill(null);
        setIsChecked(false);
        setIsCorrect(false);
        setShowTranslation(false);
        setTimeout(() => wordInputRefs.current[0]?.focus(), 100);
    };

    // Auto-play audio when entering a new question
    useEffect(() => {
        if (sentences.length > 0 && !isChecked && audioRef.current) {
            const url = accent === 'us'
                ? sentences[currentIndex]?.audio_url_us
                : sentences[currentIndex]?.audio_url_uk;

            if (url) {
                // Small delay to ensure sentence is loaded
                setTimeout(() => {
                    if (audioRef.current) {
                        audioRef.current.src = url;
                        audioRef.current.play().catch(() => {
                            // Autoplay might be blocked by browser - that's okay
                            console.log('Autoplay blocked by browser');
                        });
                        setIsPlaying(true);
                    }
                }, 300);
            }
        }
    }, [currentIndex, sentences.length]);

    const handleWordChange = (value: string, index: number) => {
        const newValues = [...wordValues];
        newValues[index] = value;
        setWordValues(newValues);

        if (value.endsWith(" ")) {
            newValues[index] = value.trim();
            setWordValues(newValues);
            if (index < currentWords.length - 1) {
                wordInputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === " " && wordValues[index].length > 0) {
            e.preventDefault();
            if (index < currentWords.length - 1) {
                wordInputRefs.current[index + 1]?.focus();
            }
        }
        if (e.key === "Backspace" && wordValues[index] === "" && index > 0) {
            e.preventDefault();
            wordInputRefs.current[index - 1]?.focus();
        }
        if (e.key === "Enter" && !isChecked) {
            checkAnswer();
        } else if (e.key === "Enter" && isChecked) {
            nextSentence();
        }
    };

    const handleInputFocus = (index: number) => {
        if (wordValues.every(v => !v) && index !== 0) {
            setTimeout(() => wordInputRefs.current[0]?.focus(), 10);
        }
    };

    const playAudio = useCallback(() => {
        if (!audioRef.current || !sentences[currentIndex]) return;

        const url = accent === 'us'
            ? sentences[currentIndex].audio_url_us
            : sentences[currentIndex].audio_url_uk;

        if (url) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.src = url;
                audioRef.current.play();
                setIsPlaying(true);
            }
        }
    }, [currentIndex, sentences, accent, isPlaying]);

    const handleAudioEnd = () => setIsPlaying(false);

    const checkAnswer = () => {
        if (!wordValues.some(v => v?.trim())) return;

        const currentSentence = sentences[currentIndex];
        const userSentence = wordValues.join(" ").trim();
        const normalize = (s: string) => s.replace(/[.,!?;:]/g, "").toLowerCase().trim();

        const isMatch = normalize(userSentence) === normalize(currentSentence.sentence_text);

        setIsCorrect(isMatch);
        setIsChecked(true);

        const result: SessionResult = {
            sentenceId: currentSentence.id,
            correct: isMatch,
            userAnswer: userSentence,
            correctAnswer: currentSentence.sentence_text
        };

        const newResults = [...sessionResults];
        newResults[currentIndex] = result;
        setSessionResults(newResults);
    };

    const nextSentence = () => {
        if (currentIndex < sentences.length - 1) {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            initializeSentence(sentences[nextIdx].sentence_text);
        } else {
            navigate(`${basePath}/${levelSlug}`, {
                state: {
                    completedTopic: topic?.id,
                    results: sessionResults
                }
            });
        }
    };

    const renderDiff = () => {
        return (
            <div className="flex flex-wrap gap-2 justify-center">
                {currentWords.map((word, idx) => {
                    const userWord = wordValues[idx] || "";
                    const cleanUser = userWord.replace(/[.,!?;:]/g, "").toLowerCase();
                    const cleanActual = word.replace(/[.,!?;:]/g, "").toLowerCase();
                    const isWordCorrect = cleanUser === cleanActual;

                    return (
                        <span key={idx} style={{ color: isWordCorrect ? '#799351' : '#B2533E' }} className={`${!isWordCorrect ? 'line-through decoration-2' : ''} font-bold text-xl md:text-2xl`}>
                            {word}
                        </span>
                    );
                })}
            </div>
        );
    };

    if (isLoading) return <LottieLoadingAnimation />;

    // EXACT COPY from IELTSSpeakingTest.tsx - Background and Container Styling
    return (
        <div
            className="min-h-screen relative"
            style={{
                backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
            }}
        >
            {/* Background - EXACT COPY from IELTSSpeakingTest.tsx lines 2017-2023 */}
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
                style={{
                    backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
                        ? 'none'
                        : `url('/1000031207.png')`,
                    backgroundColor: themeStyles.backgroundImageColor
                }} />

            {/* Content - EXACT COPY from IELTSSpeakingTest.tsx lines 2024-2029 */}
            <div
                className="relative z-10 min-h-screen flex flex-col"
                style={{
                    backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
                }}
            >
                <StudentLayout title={topic?.title || "Listening Practice"} showBackButton>
                    {/* Layout - EXACT COPY from IELTSSpeakingTest.tsx lines 2031-2033 */}
                    <div className="flex-1 flex justify-center min-h-[calc(100vh-120px)] py-8 sm:items-center sm:py-8">
                        <div className="w-full max-w-4xl mx-auto space-y-4 px-4 flex flex-col">

                            {/* Header: Progress - EXACT COPY from IELTSSpeakingTest.tsx lines 2035-2037 */}
                            <div className="text-center py-2 sm:py-2 sm:mb-0 mb-0 flex items-center justify-center gap-2">
                                <span className="text-lg font-semibold" style={{ color: themeStyles.textPrimary }}>
                                    {currentIndex + 1} / {sentences.length}
                                </span>
                            </div>

                            {/* Main Card - EXACT COPY from IELTSSpeakingTest.tsx lines 2061-2074 */}
                            <Card
                                className="backdrop-blur-sm shadow-lg rounded-2xl flex flex-col relative"
                                style={{
                                    backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                                    borderColor: themeStyles.border,
                                    backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : themeStyles.theme.name === 'dark' ? 'blur(8px)' : 'none',
                                    boxShadow: themeStyles.theme.name === 'dark'
                                        ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                                        : themeStyles.theme.name === 'note'
                                            ? themeStyles.theme.styles.cardStyle?.boxShadow
                                            : '0 8px 32px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(148, 163, 253, 0.06)',
                                    ...themeStyles.cardStyle
                                }}
                            >
                                {/* Translation Toggle - Top Right */}
                                {/* Translation Toggle - Top Right */}
                                <div className="absolute top-6 right-6 z-20">
                                    <Button
                                        onClick={() => setShowTranslation(!showTranslation)}
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 opacity-70 hover:opacity-100 transition-opacity"
                                        style={{
                                            backgroundColor: showTranslation ? (themeStyles.theme.name === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff') : 'transparent',
                                            color: showTranslation ? themeStyles.buttonPrimary : themeStyles.textSecondary
                                        }}
                                    >
                                        <Globe className="w-5 h-5" />
                                    </Button>
                                </div>

                                <CardContent className="p-8 md:p-12 flex flex-col items-center justify-end min-h-[400px]">
                                    {/* Center Content: Inputs - Truly centered */}
                                    <div className="w-full flex flex-col items-center justify-center">
                                        <div
                                            className="w-full flex justify-center py-8"
                                            onClick={() => {
                                                if (wordValues.every(v => !v)) {
                                                    wordInputRefs.current[0]?.focus();
                                                }
                                            }}
                                        >
                                            <div className="flex flex-wrap justify-center items-baseline gap-x-3 gap-y-6">
                                                {currentWords.map((word, idx) => {
                                                    const cleanWord = word.replace(/[.,!?;:]/g, "");
                                                    const punctuation = word.slice(cleanWord.length);
                                                    // Add random variation (0-2 extra chars) based on word index for unpredictability
                                                    // Use a simple hash to make it consistent per word but not obvious
                                                    const randomExtra = ((idx * 7 + word.length * 3) % 3);
                                                    const baseWidth = Math.max(cleanWord.length * 0.9, 2); // ch units for character-based sizing
                                                    const width = `${baseWidth + randomExtra + 1.5}ch`;

                                                    return (
                                                        <div key={idx} className="relative inline-flex items-baseline">
                                                            <input
                                                                ref={el => wordInputRefs.current[idx] = el}
                                                                type="text"
                                                                value={wordValues[idx] || ""}
                                                                onChange={(e) => handleWordChange(e.target.value, idx)}
                                                                onKeyDown={(e) => handleKeyDown(e, idx)}
                                                                onFocus={() => handleInputFocus(idx)}
                                                                disabled={isChecked}
                                                                autoFocus={idx === 0}
                                                                autoComplete="off"
                                                                spellCheck={false}
                                                                className={`
                                                                    min-w-[2rem] text-2xl md:text-3xl font-semibold text-center 
                                                                    bg-transparent outline-none focus:outline-none ring-0 focus:ring-0
                                                                    transition-all duration-200 border-b-2
                                                                    ${isChecked
                                                                        ? ''
                                                                        : 'border-black/15 focus:border-black/40'
                                                                    }
                                                                `}
                                                                style={{
                                                                    width,
                                                                    color: isChecked ? (isCorrect ? '#799351' : '#B2533E') : themeStyles.textPrimary,
                                                                    borderColor: isChecked ? (isCorrect ? '#799351' : '#B2533E') : undefined
                                                                }}
                                                            />
                                                            {punctuation && (
                                                                <span className="text-2xl md:text-3xl font-semibold opacity-40 select-none ml-0.5"
                                                                    style={{ color: themeStyles.textPrimary }}>
                                                                    {punctuation}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Feedback */}
                                        {isChecked && (
                                            <div className="text-center animate-in fade-in slide-in-from-bottom-2 mt-4">
                                                {renderDiff()}
                                                {!isCorrect && (
                                                    <div className="mt-3 text-base font-medium opacity-60" style={{ color: themeStyles.textPrimary }}>
                                                        {sentences[currentIndex].sentence_text}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Translation Display */}
                                        {showTranslation && (
                                            <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-1">
                                                <p className="text-lg font-medium" style={{ color: themeStyles.textPrimary }}>
                                                    {sentences[currentIndex]?.translations?.[nativeLanguage] || sentences[currentIndex]?.translations?.ko || "Translation not available"}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom Controls - Centered like IELTS Speaking */}
                                    <div className="flex items-center justify-center gap-3 mt-8">
                                        {/* Accent Toggle */}
                                        <Button
                                            onClick={() => setAccent(accent === 'us' ? 'uk' : 'us')}
                                            variant="outline"
                                            size="icon"
                                            className="h-12 w-12 rounded-xl"
                                            style={{
                                                borderColor: themeStyles.border,
                                                backgroundColor: 'transparent',
                                                color: themeStyles.textSecondary
                                            }}
                                        >
                                            <span className="text-lg">{accent === 'us' ? '🇺🇸' : '🇬🇧'}</span>
                                        </Button>



                                        {/* Play Button - EXACT COPY from IELTSSpeakingTest.tsx */}
                                        <Button
                                            onClick={playAudio}
                                            variant="outline"
                                            size="icon"
                                            className="h-12 w-12 rounded-xl"
                                            style={{
                                                borderColor: themeStyles.border,
                                                color: themeStyles.buttonPrimary,
                                                backgroundColor: 'transparent'
                                            }}
                                        >
                                            {isPlaying ? (
                                                <Pause className="w-5 h-5" />
                                            ) : (
                                                <Play className="w-5 h-5" />
                                            )}
                                        </Button>

                                        {/* Check/Next Button */}
                                        <Button
                                            onClick={isChecked ? nextSentence : checkAnswer}
                                            disabled={!wordValues.some(v => v?.trim())}
                                            variant="outline"
                                            size="icon"
                                            className={`h-12 w-12 rounded-xl ${!wordValues.some(v => v?.trim()) ? 'opacity-30' : ''}`}
                                            style={{
                                                borderColor: isChecked ? '#799351' : themeStyles.border,
                                                backgroundColor: isChecked ? '#799351' : 'transparent',
                                                color: isChecked ? 'white' : themeStyles.buttonPrimary
                                            }}
                                        >
                                            {isChecked ? <ArrowRight className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                                        </Button>
                                    </div>

                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </StudentLayout>
            </div>
            <audio ref={audioRef} onEnded={handleAudioEnd} hidden />
        </div>
    );
};

export default DictationPractice;
