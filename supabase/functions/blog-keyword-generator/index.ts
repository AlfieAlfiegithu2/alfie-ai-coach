import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// TOP 32 LANGUAGES BY INTERNET USERS
// Each language will get NATIVE content with NATIVE KEYWORDS
// Includes Cantonese (Hong Kong/Macau) and Traditional Chinese (Taiwan)
// ============================================
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese Simplified', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese Traditional (Taiwan)', nativeName: '繁體中文' },
  { code: 'yue', name: 'Cantonese', nativeName: '粵語' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' }
];

// ============================================
// NATIVE KEYWORDS DATABASE BY LANGUAGE
// These are authentic search queries in each language
// NOT translations - these are what people actually search
// ============================================
const NATIVE_KEYWORDS: Record<string, { keywords: string[], topics: string[] }> = {
  'zh': {
    // What Chinese users search on Baidu for English learning
    keywords: [
      "雅思口语6.5分备考技巧",
      "雅思写作Task2高分模板",
      "雅思阅读时间不够怎么办",
      "零基础考雅思7分要多久",
      "上班族如何备考雅思",
      "雅思听力提分技巧",
      "托福和雅思哪个更容易",
      "雅思自学可以考到7分吗",
      "托业考试备考攻略",
      "托业800分学习计划",
      "商务英语邮件写作技巧",
      "英语口语练习方法",
      "如何提高英语听力水平",
      "英语语法学习技巧",
      "职场英语常用表达",
      "出国留学英语要求",
      "英语四六级备考攻略",
      "考研英语作文模板",
      "BEC商务英语考试技巧",
      "英语发音纠正方法"
    ],
    topics: ['雅思', '托福', '英语学习', '商务英语', '留学英语']
  },
  'zh-TW': {
    // What Taiwanese users search for
    keywords: [
      "雅思口說準備技巧",
      "雅思寫作高分範文",
      "多益900分準備方法",
      "多益聽力技巧",
      "英文會話練習",
      "托福自學計畫",
      "出國留學英文準備",
      "商業英文書信範例",
      "英文面試技巧",
      "英文學習APP推薦"
    ],
    topics: ['雅思', '多益', '托福', '英文學習']
  },
  'yue': {
    // What Cantonese (HK/Macau) users search
    keywords: [
      "IELTS口試準備方法",
      "IELTS寫作技巧",
      "DSE英文作文範文",
      "英文補習邊間好",
      "商業英文課程推薦",
      "移民英文要求",
      "IELTS聽力練習",
      "英文會話班推薦",
      "職場英文實用句子",
      "英文發音練習"
    ],
    topics: ['IELTS', 'DSE英文', '商業英文', '移民英語']
  },
  'ja': {
    // What Japanese users search on Yahoo Japan / Google Japan
    keywords: [
      "TOEIC 900点 勉強法",
      "TOEIC リスニング 対策",
      "TOEIC 初心者 勉強法",
      "IELTS スピーキング 対策",
      "英語 発音 練習方法",
      "ビジネス英語 メール",
      "英会話 独学 おすすめ",
      "英語 文法 勉強法",
      "TOEFL 対策 参考書",
      "英語 リスニング 上達法",
      "英語 シャドーイング やり方",
      "オンライン英会話 比較",
      "英語 単語 覚え方",
      "TOEIC 時間配分 コツ",
      "英語面接 準備"
    ],
    topics: ['TOEIC', 'IELTS', '英会話', 'ビジネス英語']
  },
  'ko': {
    // What Korean users search on Naver
    keywords: [
      "아이엘츠 스피킹 독학",
      "아이엘츠 라이팅 템플릿",
      "토익 900점 공부법",
      "토익 리스닝 점수 올리는법",
      "영어회화 공부법",
      "비즈니스 영어 이메일",
      "토플 독학 후기",
      "영어 발음 교정",
      "영어 문법 정리",
      "직장인 영어 공부",
      "원어민처럼 영어하기",
      "영어 면접 준비",
      "해외취업 영어 준비",
      "영어 스피킹 연습",
      "토익스피킹 점수 올리기"
    ],
    topics: ['아이엘츠', '토익', '영어회화', '비즈니스영어']
  },
  'vi': {
    // What Vietnamese users search
    keywords: [
      "Cách học IELTS cho người mới bắt đầu",
      "Luyện speaking IELTS tại nhà",
      "Mẹo làm bài IELTS Writing Task 2",
      "IELTS Reading làm sao cho nhanh",
      "Tự học tiếng Anh giao tiếp",
      "Học tiếng Anh online miễn phí",
      "Ngữ pháp tiếng Anh cơ bản",
      "Cách phát âm tiếng Anh chuẩn",
      "Tiếng Anh thương mại",
      "Luyện nghe tiếng Anh hiệu quả",
      "TOEIC 700 trong 3 tháng",
      "Học tiếng Anh cho người đi làm"
    ],
    topics: ['IELTS', 'TOEIC', 'Tiếng Anh giao tiếp', 'Tiếng Anh thương mại']
  },
  'th': {
    // What Thai users search
    keywords: [
      "เทคนิคสอบ IELTS Speaking",
      "วิธีเตรียมตัวสอบ IELTS",
      "TOEIC 700 ใน 3 เดือน",
      "เรียนภาษาอังกฤษด้วยตัวเอง",
      "ฝึกพูดภาษาอังกฤษ",
      "ไวยากรณ์ภาษาอังกฤษ",
      "ภาษาอังกฤษธุรกิจ",
      "ฝึกฟังภาษาอังกฤษ",
      "เตรียมสอบ TOEFL",
      "ภาษาอังกฤษสำหรับการทำงาน"
    ],
    topics: ['IELTS', 'TOEIC', 'ภาษาอังกฤษ', 'ธุรกิจ']
  },
  'id': {
    // What Indonesian users search
    keywords: [
      "Tips IELTS Speaking band 7",
      "Cara belajar IELTS dari nol",
      "Persiapan TOEFL dalam 1 bulan",
      "Belajar bahasa Inggris otodidak",
      "Grammar bahasa Inggris dasar",
      "Cara meningkatkan listening",
      "TOEIC untuk kerja",
      "Bahasa Inggris bisnis",
      "Cara pronunciation yang benar",
      "Les bahasa Inggris online"
    ],
    topics: ['IELTS', 'TOEFL', 'TOEIC', 'Bahasa Inggris']
  },
  'es': {
    // What Spanish speakers search
    keywords: [
      "Cómo preparar IELTS en 3 meses",
      "Tips para IELTS Speaking",
      "TOEFL vs IELTS cuál es mejor",
      "Mejorar inglés rápidamente",
      "Gramática inglés avanzado",
      "Inglés para negocios",
      "Cómo aprobar TOEIC",
      "Practicar listening en inglés",
      "Inglés para entrevistas de trabajo",
      "Mejorar pronunciación inglés"
    ],
    topics: ['IELTS', 'TOEFL', 'Inglés de negocios', 'Inglés general']
  },
  'pt': {
    // What Portuguese speakers (Brazil) search
    keywords: [
      "Como estudar para IELTS sozinho",
      "Dicas IELTS Speaking",
      "TOEFL preparação rápida",
      "Aprender inglês do zero",
      "Gramática inglês completa",
      "Inglês para negócios",
      "Melhorar listening inglês",
      "Inglês para entrevista emprego",
      "Pronúncia inglês americano",
      "TOEIC para empresas"
    ],
    topics: ['IELTS', 'TOEFL', 'Inglês corporativo', 'Aprendizagem']
  },
  'fr': {
    // What French speakers search
    keywords: [
      "Préparer IELTS en 2 mois",
      "Conseils IELTS Speaking",
      "TOEFL ou IELTS lequel choisir",
      "Améliorer son anglais rapidement",
      "Grammaire anglaise avancée",
      "Anglais des affaires",
      "Réussir le TOEIC",
      "Améliorer sa compréhension orale",
      "Anglais pour entretien d'embauche",
      "Perfectionnement anglais"
    ],
    topics: ['IELTS', 'TOEFL', 'TOEIC', 'Anglais professionnel']
  },
  'de': {
    // What German speakers search
    keywords: [
      "IELTS Vorbereitung Tipps",
      "IELTS Speaking üben",
      "TOEFL oder IELTS was ist besser",
      "Englisch schnell verbessern",
      "Business Englisch lernen",
      "TOEIC Prüfung bestehen",
      "Englisch Aussprache verbessern",
      "Englisch für Bewerbungsgespräch",
      "Englisch Grammatik Übungen",
      "Englisch Hörverstehen trainieren"
    ],
    topics: ['IELTS', 'TOEFL', 'TOEIC', 'Business Englisch']
  },
  'ar': {
    // What Arabic speakers search
    keywords: [
      "نصائح اختبار IELTS",
      "تحضير IELTS في شهر",
      "تحسين مهارة التحدث بالإنجليزية",
      "قواعد اللغة الإنجليزية",
      "تعلم الإنجليزية للمبتدئين",
      "إنجليزية الأعمال",
      "اختبار TOEFL التحضير",
      "تحسين الاستماع بالإنجليزية",
      "إنجليزية للمقابلات الوظيفية",
      "نطق الإنجليزية الصحيح"
    ],
    topics: ['IELTS', 'TOEFL', 'تعلم الإنجليزية', 'إنجليزية الأعمال']
  },
  'ru': {
    // What Russian speakers search
    keywords: [
      "Подготовка к IELTS за 3 месяца",
      "Советы IELTS Speaking",
      "TOEFL или IELTS что лучше",
      "Быстро выучить английский",
      "Грамматика английского языка",
      "Деловой английский",
      "Подготовка к TOEIC",
      "Улучшить аудирование на английском",
      "Английский для собеседования",
      "Произношение английских слов"
    ],
    topics: ['IELTS', 'TOEFL', 'TOEIC', 'Деловой английский']
  },
  'hi': {
    // What Hindi speakers search
    keywords: [
      "IELTS की तैयारी कैसे करें",
      "IELTS Speaking टिप्स",
      "अंग्रेजी बोलना कैसे सीखें",
      "English grammar in Hindi",
      "TOEFL vs IELTS कौन सा बेहतर है",
      "Business English कैसे सीखें",
      "अंग्रेजी सुनने की क्षमता कैसे बढ़ाएं",
      "Interview के लिए English",
      "English pronunciation सुधारें",
      "IELTS Writing tips Hindi में"
    ],
    topics: ['IELTS', 'TOEFL', 'English Learning', 'Business English']
  },
  'tr': {
    // What Turkish speakers search  
    keywords: [
      "IELTS hazırlık ipuçları",
      "IELTS Speaking nasıl çalışılır",
      "İngilizce konuşma pratiği",
      "İngilizce dilbilgisi",
      "TOEFL mu IELTS mi",
      "İş İngilizcesi",
      "TOEIC sınavı hazırlık",
      "İngilizce dinleme geliştirme",
      "İngilizce mülakat hazırlık",
      "İngilizce telaffuz"
    ],
    topics: ['IELTS', 'TOEFL', 'TOEIC', 'İş İngilizcesi']
  },
  'it': {
    // What Italian speakers search
    keywords: [
      "Preparazione IELTS consigli",
      "IELTS Speaking come prepararsi",
      "Migliorare inglese velocemente",
      "Grammatica inglese avanzata",
      "Inglese commerciale",
      "Preparazione TOEIC",
      "Migliorare ascolto inglese",
      "Inglese per colloquio lavoro",
      "Pronuncia inglese corretta",
      "TOEFL vs IELTS differenze"
    ],
    topics: ['IELTS', 'TOEFL', 'TOEIC', 'Inglese business']
  },
  'pl': {
    // What Polish speakers search
    keywords: [
      "Przygotowanie do IELTS",
      "IELTS Speaking porady",
      "Jak szybko nauczyć się angielskiego",
      "Gramatyka angielska",
      "Angielski biznesowy",
      "Przygotowanie TOEIC",
      "Ćwiczenia słuchanie angielski",
      "Angielski na rozmowę kwalifikacyjną",
      "Wymowa angielska",
      "TOEFL czy IELTS"
    ],
    topics: ['IELTS', 'TOEFL', 'TOEIC', 'Angielski biznesowy']
  }
};

// ============================================
// KEYWORD DISCOVERY SYSTEM
// Multiple fallback methods for reliability
// ============================================

// Method 1: Google Autocomplete API (free, reliable)
async function discoverFromGoogleAutocomplete(
  query: string,
  langCode: string
): Promise<string[]> {
  try {
    // Google's autocomplete API is publicly accessible
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}&hl=${langCode}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    // Response format: [query, [suggestions]]
    return data[1] || [];
  } catch (error) {
    console.error('Google Autocomplete error:', error);
    return [];
  }
}

// Method 2: AI-generated keyword (fallback)
async function discoverNativeKeyword(
  langCode: string,
  langName: string,
  nativeName: string,
  subject: string
): Promise<string | null> {
  try {
    // First try Google Autocomplete with seed queries
    const seedQueries = {
      'zh': ['雅思备考', '托福考试', '英语学习', '托业考试'],
      'ja': ['TOEIC 勉強', 'IELTS 対策', '英語 上達'],
      'ko': ['아이엘츠 공부', '토익 준비', '영어 회화'],
      'vi': ['học IELTS', 'thi TOEIC', 'tiếng Anh'],
      'th': ['เรียน IELTS', 'สอบ TOEIC', 'ภาษาอังกฤษ'],
      'default': ['IELTS preparation', 'TOEIC study', 'English learning']
    };

    const seeds = seedQueries[langCode as keyof typeof seedQueries] || seedQueries.default;
    const randomSeed = seeds[Math.floor(Math.random() * seeds.length)];
    
    // Try Google Autocomplete first
    const autocompleteSuggestions = await discoverFromGoogleAutocomplete(randomSeed, langCode);
    if (autocompleteSuggestions.length > 0) {
      // Pick a random suggestion that's long enough to be a good long-tail keyword
      const goodSuggestions = autocompleteSuggestions.filter(s => s.length > 10);
      if (goodSuggestions.length > 0) {
        console.log(`📡 Got ${goodSuggestions.length} suggestions from Google Autocomplete for ${langName}`);
        return goodSuggestions[Math.floor(Math.random() * goodSuggestions.length)];
      }
    }

    // Fallback: AI generation
    console.log(`🤖 Using AI fallback for ${langName} keyword discovery`);
    
    const prompt = `You are an SEO expert who understands what people in ${langName}-speaking countries actually search for.

Generate ONE realistic long-tail search query that ${langName} speakers would type into their search engine (like ${langCode === 'zh' ? 'Baidu' : langCode === 'ja' ? 'Yahoo Japan' : langCode === 'ko' ? 'Naver' : 'Google'}) about ${subject} or English learning.

REQUIREMENTS:
1. Write the query in ${nativeName} (${langName}) - NOT in English
2. Make it sound natural, like a real person searching
3. Include specific details (timeframes, scores, situations)
4. Make it a question or problem people actually have
5. Focus on: IELTS, TOEIC, TOEFL, PTE, NCLEX, Business English, or general English improvement

Examples of natural queries:
- Chinese: "雅思口语6.5分怎么准备"
- Japanese: "TOEIC 900点 独学 勉強法"
- Korean: "아이엘츠 라이팅 독학 후기"
- Vietnamese: "Cách học IELTS Writing từ đầu"

Return ONLY the search query in ${nativeName}, nothing else.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 100,
      }),
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('Error discovering native keyword:', error);
    return null;
  }
}

// ============================================
// ACHIEVABLE LONG-TAIL KEYWORDS DATABASE
// ============================================
const KEYWORD_DATABASE = {
  IELTS: {
    category: 'IELTS',
    keywords: [
      // Study Time & Planning
      "how many hours a day should I study for IELTS",
      "how long to prepare for IELTS from 5.5 to 7",
      "how long to prepare for IELTS from 6 to 7.5",
      "how many months to prepare for IELTS 7",
      "best IELTS study schedule for working professionals",
      "can I prepare for IELTS in 1 month",
      "can I prepare for IELTS in 2 weeks",
      "realistic IELTS preparation timeline",
      
      // Speaking Specific
      "how to improve IELTS speaking from 6 to 7",
      "IELTS speaking topics 2025 with answers",
      "how to speak fluently in IELTS speaking test",
      "IELTS speaking part 2 cue card tips",
      "how to avoid fillers in IELTS speaking",
      "best way to practice IELTS speaking alone at home",
      "IELTS speaking band descriptors explained simply",
      "common IELTS speaking mistakes to avoid",
      
      // Writing Specific
      "how to write IELTS Task 1 bar chart step by step",
      "how to write IELTS Task 2 essay in 40 minutes",
      "IELTS writing band 7 sample essays",
      "how to improve IELTS writing from 5.5 to 7",
      "IELTS writing task 2 opinion essay structure",
      "IELTS academic vs general writing differences",
      "how to paraphrase in IELTS writing",
      "common IELTS writing mistakes that lose marks",
      
      // Reading Specific
      "how to finish IELTS reading in time",
      "IELTS reading True False Not Given tips",
      "IELTS reading matching headings strategy",
      "how to improve IELTS reading speed",
      "IELTS reading skimming and scanning techniques",
      "how to score 8 in IELTS reading",
      
      // Listening Specific
      "how to improve IELTS listening from 6 to 7.5",
      "IELTS listening map labeling tips",
      "how to concentrate during IELTS listening test",
      "IELTS listening multiple choice strategies",
      "common IELTS listening spelling mistakes",
      
      // Score & Results
      "what IELTS score do I need for Canada PR",
      "what IELTS score do I need for UK visa",
      "what IELTS score do I need for Australia migration",
      "what IELTS score do I need for nursing in USA",
      "IELTS score validity for immigration",
      "how is IELTS score calculated overall band",
      "IELTS band score conversion chart explained",
      
      // Cost & Registration
      "how much does IELTS cost in 2025",
      "how to book IELTS test online step by step",
      "IELTS paper based vs computer based which is easier",
      "IELTS test day rules and what to expect",
      "what to bring to IELTS test center",
      
      // Self Study
      "best free IELTS preparation resources online",
      "can I get band 7 in IELTS with self study",
      "best IELTS books for self study 2025",
      "free IELTS practice tests with answers",
      "how to prepare for IELTS at home without coaching",
      
      // Comparison & Alternatives
      "IELTS vs PTE which is easier",
      "IELTS vs TOEFL for USA universities",
      "IELTS academic vs general which should I take",
      "online IELTS coaching vs offline which is better"
    ]
  },
  
  TOEIC: {
    category: 'TOEIC',
    keywords: [
      "how to get 900+ on TOEIC",
      "how to improve TOEIC score from 600 to 800",
      "how to improve TOEIC listening score quickly",
      "how to improve TOEIC reading score",
      "TOEIC score requirements for jobs",
      "what TOEIC score do I need for international company",
      "how long to prepare for TOEIC 800",
      "how many hours to study for TOEIC",
      "can I prepare for TOEIC in one month",
      "best TOEIC study plan for beginners",
      "TOEIC preparation schedule for working professionals",
      "TOEIC listening part 1 photo description tips",
      "TOEIC listening part 2 question response strategies",
      "TOEIC listening part 3 and 4 techniques",
      "TOEIC reading part 5 grammar tips",
      "TOEIC reading part 6 text completion strategies",
      "TOEIC reading part 7 time management",
      "how to finish TOEIC reading section in time",
      "best TOEIC preparation books 2025",
      "free TOEIC practice tests online",
      "TOEIC vocabulary list for 800 score",
      "best apps for TOEIC preparation",
      "TOEIC practice questions with explanations",
      "most common TOEIC grammar points",
      "TOEIC business vocabulary list",
      "TOEIC phrasal verbs to memorize",
      "common TOEIC mistakes to avoid",
      "what to expect on TOEIC test day",
      "TOEIC test format explained",
      "how is TOEIC scored",
      "TOEIC certificate validity"
    ]
  },
  
  TOEFL: {
    category: 'TOEFL',
    keywords: [
      "how to get 100+ on TOEFL iBT",
      "how to improve TOEFL score from 80 to 100",
      "what TOEFL score do I need for Harvard",
      "what TOEFL score do I need for US universities",
      "minimum TOEFL score for graduate school",
      "how long to prepare for TOEFL 100",
      "can I prepare for TOEFL in 2 months",
      "TOEFL study plan for 3 months",
      "how many hours a day to study for TOEFL",
      "how to improve TOEFL speaking from 22 to 26",
      "TOEFL speaking independent task tips",
      "TOEFL speaking integrated task strategies",
      "TOEFL speaking templates that work",
      "how to reduce accent for TOEFL speaking",
      "how to write TOEFL integrated essay step by step",
      "TOEFL independent writing template",
      "how to improve TOEFL writing score",
      "TOEFL writing time management tips",
      "TOEFL academic discussion task tips",
      "how to improve TOEFL reading speed",
      "TOEFL reading inference questions tips",
      "TOEFL reading vocabulary in context strategies",
      "how to score 28+ in TOEFL reading",
      "how to improve TOEFL listening note taking",
      "TOEFL listening lecture tips",
      "TOEFL listening conversation strategies",
      "how to concentrate during TOEFL listening",
      "TOEFL iBT vs TOEFL Essentials differences",
      "TOEFL home edition vs test center",
      "best TOEFL preparation books 2025",
      "free TOEFL practice tests with answers"
    ]
  },
  
  PTE: {
    category: 'PTE',
    keywords: [
      "how to get 79+ in PTE Academic",
      "how to improve PTE score from 65 to 79",
      "PTE score for Australia PR 2025",
      "PTE to IELTS score conversion chart",
      "PTE score requirements for UK visa",
      "how long to prepare for PTE 79",
      "PTE preparation plan for 1 month",
      "can I crack PTE in 2 weeks",
      "best PTE study schedule",
      "PTE read aloud tips for 90 score",
      "PTE repeat sentence strategies",
      "PTE describe image template",
      "PTE retell lecture tips",
      "PTE answer short question list",
      "how to improve PTE speaking fluency",
      "PTE summarize written text template",
      "PTE write essay structure",
      "PTE writing tips for 79 score",
      "common PTE essay topics 2025",
      "PTE reading fill in the blanks tips",
      "PTE reorder paragraphs strategy",
      "PTE multiple choice strategies",
      "how to improve PTE reading score",
      "PTE summarize spoken text template",
      "PTE write from dictation tips",
      "PTE listening fill in the blanks strategies",
      "PTE highlight correct summary tips",
      "PTE vs IELTS which is easier",
      "best PTE preparation app 2025",
      "PTE practice tests free online",
      "PTE test format and duration",
      "PTE at home vs test center"
    ]
  },
  
  'Business English': {
    category: 'Business English',
    keywords: [
      "how to write professional emails in English",
      "business email examples for different situations",
      "how to end a professional email politely",
      "email phrases for requests in business English",
      "how to write follow up email professionally",
      "formal vs informal business email differences",
      "useful phrases for business meetings in English",
      "how to lead a meeting in English",
      "how to disagree politely in business meetings",
      "business English phrases for negotiations",
      "how to give opinion in meetings professionally",
      "how to start a presentation in English professionally",
      "business English phrases for presentations",
      "how to handle Q&A in English presentations",
      "transition phrases for business presentations",
      "common job interview questions and answers in English",
      "how to talk about weaknesses in English interview",
      "how to negotiate salary in English",
      "business English phrases for job interviews",
      "how to describe work experience in English interview",
      "business English phrases for phone calls",
      "how to make conference calls in English",
      "useful phrases for video meetings in English",
      "how to leave professional voicemail in English",
      "how to write resume summary in English",
      "action verbs for resume in English",
      "how to describe achievements in English CV",
      "business English vocabulary for LinkedIn profile",
      "how to give feedback professionally in English",
      "business English phrases for customer service",
      "how to apologize professionally at work in English",
      "how to make small talk at work in English",
      "how to write business report in English",
      "business English phrases for proposals",
      "how to write executive summary in English",
      "professional writing tips for non native speakers"
    ]
  },
  
  NCLEX: {
    category: 'NCLEX',
    keywords: [
      "how many hours a day should I study for NCLEX",
      "how long to study for NCLEX RN",
      "can I pass NCLEX in 2 months of studying",
      "best NCLEX study schedule working nurses",
      "NCLEX study plan for repeat test takers",
      "how to pass NCLEX RN on first try",
      "NCLEX CAT explained how it works",
      "why did my NCLEX shut off at 75 questions",
      "NCLEX trick does it really work",
      "what to do if NCLEX shuts off at 145 questions",
      "how to answer NCLEX select all that apply",
      "NCLEX priority questions strategies",
      "NCLEX delegation questions tips",
      "NCLEX pharmacology review simplified",
      "NCLEX lab values to memorize",
      "NCLEX infection control questions",
      "NCLEX safety and infection control tips",
      "NCLEX mental health questions strategies",
      "best NCLEX prep course 2025",
      "UWorld vs Kaplan for NCLEX which is better",
      "free NCLEX practice questions online",
      "best NCLEX review book 2025",
      "is Archer good for NCLEX prep",
      "what to expect on NCLEX test day",
      "what to bring to NCLEX exam",
      "NCLEX test anxiety tips",
      "how long are NCLEX results",
      "how to check NCLEX results quick results",
      "NCLEX requirements for international nurses",
      "how to apply for NCLEX from Philippines",
      "NCLEX for foreign educated nurses",
      "CGFNS requirements for NCLEX",
      "how to pass NCLEX after failing",
      "NCLEX retake waiting period by state",
      "how to study differently for NCLEX retake",
      "NCLEX remediation plan after failing"
    ]
  },

  // ============================================
  // ULTRA-NICHE LONG-TAIL KEYWORDS
  // Easy to rank #1 - less competition
  // ============================================
  'Niche IELTS': {
    category: 'IELTS',
    keywords: [
      "IELTS speaking part 1 hometown questions with answers",
      "IELTS speaking cue cards about technology with sample answers",
      "how to describe a graph with no clear trend IELTS",
      "IELTS writing task 2 agree disagree essay structure PDF",
      "IELTS reading heading matching trick that always works",
      "IELTS listening section 4 academic vocabulary list",
      "best time of day to take IELTS computer test",
      "IELTS writing task 1 water cycle diagram vocabulary",
      "how to answer IELTS speaking when you dont understand",
      "IELTS speaking topics January to April 2025",
      "IELTS speaking part 3 environment questions band 8",
      "IELTS writing task 2 education topics prediction 2025",
      "common IELTS examiner questions part 1 work",
      "IELTS advantage disadvantage essay without opinion",
      "what happens if you run out of time in IELTS writing"
    ]
  },

  'Niche TOEIC': {
    category: 'TOEIC',
    keywords: [
      "TOEIC part 5 grammar questions about tenses",
      "TOEIC listening part 3 office conversation vocabulary",
      "why is TOEIC part 7 so difficult and how to improve",
      "TOEIC reading double passage time saving strategy",
      "common TOEIC business vocabulary about shipping",
      "TOEIC listening Australian accent tips",
      "TOEIC part 6 email completion most common topics",
      "how to guess answers in TOEIC when running out of time",
      "TOEIC vocabulary about human resources and hiring",
      "TOEIC part 2 indirect answer patterns",
      "why did my TOEIC score decrease after studying",
      "TOEIC listening part 4 talk about company policy",
      "TOEIC reading weather and travel related passages",
      "TOEIC grammar questions about prepositions",
      "difference between TOEIC bridge and TOEIC listening reading"
    ]
  },

  'Niche PTE': {
    category: 'PTE',
    keywords: [
      "PTE read aloud punctuation pause rules",
      "PTE repeat sentence what to do if you miss words",
      "PTE describe image graph with fluctuations template",
      "why my PTE speaking score is lower than listening",
      "PTE summarize written text one sentence trick",
      "PTE write from dictation spelling American vs British",
      "PTE reorder paragraph first sentence trick",
      "how PTE AI scores pronunciation explained",
      "PTE fill in the blanks reading collocations list",
      "PTE listening highlight incorrect words strategy PDF",
      "PTE speaking oral fluency score explained",
      "why is my PTE written discourse score low",
      "PTE multiple choice single answer elimination technique",
      "PTE at home microphone and headset requirements",
      "PTE score report sample what each section means"
    ]
  },

  'Niche TOEFL': {
    category: 'TOEFL',
    keywords: [
      "TOEFL speaking task 1 personal choice templates",
      "TOEFL integrated writing lecture contradicts reading example",
      "why TOEFL listening conversations are harder than lectures",
      "TOEFL reading reference questions strategy",
      "TOEFL speaking task 4 academic topic note taking",
      "how to paraphrase in TOEFL integrated writing",
      "TOEFL listening main idea vs detail questions",
      "TOEFL academic discussion writing task tips",
      "TOEFL speaking pronunciation score breakdown",
      "TOEFL home edition ID requirements international students",
      "TOEFL reading prose summary question strategy",
      "why did my TOEFL score not improve after practice",
      "TOEFL listening attitude and stance questions",
      "TOEFL speaking task 2 campus situation template",
      "TOEFL writing word count minimum and maximum"
    ]
  },

  'Niche Business English': {
    category: 'Business English',
    keywords: [
      "how to politely reject a meeting request email sample",
      "business English phrases for apologizing for late reply",
      "how to ask for clarification in meeting without sounding stupid",
      "email template for requesting deadline extension professionally",
      "how to introduce yourself in online meeting for job",
      "business English phrases for giving bad news to client",
      "how to follow up after no response to email politely",
      "phrases to use when you disagree with your boss",
      "how to ask for feedback from manager in English",
      "business email sign off formal vs semi formal",
      "how to write out of office message professional examples",
      "phrases for networking events for non native speakers",
      "how to small talk in elevator with CEO in English",
      "email phrases when you made a mistake at work",
      "how to decline additional work politely in email"
    ]
  },

  'Niche NCLEX': {
    category: 'NCLEX',
    keywords: [
      "NCLEX questions about chest tube management",
      "how to answer NCLEX questions about patient falls",
      "NCLEX lab values potassium high vs low symptoms",
      "NCLEX priority questions about bleeding disorders",
      "NCLEX delegation what can LPN do vs RN",
      "NCLEX questions about tracheostomy suctioning",
      "how to study NCLEX pharmacology drug suffixes",
      "NCLEX questions about isolation precautions by disease",
      "NCLEX maternal newborn Apgar score questions",
      "NCLEX psych questions about therapeutic communication",
      "NCLEX questions about blood transfusion reactions",
      "how to answer NCLEX questions about pain management",
      "NCLEX pediatric growth and development milestones",
      "NCLEX questions about insulin types and peaks",
      "NCLEX cardiac medication questions digoxin"
    ]
  },

  // ============================================
  // GENERAL ENGLISH IMPROVEMENT
  // For anyone learning English - not test specific
  // ============================================
  'General English': {
    category: 'General English',
    keywords: [
      // Speaking & Pronunciation
      "how to improve English speaking fluency at home",
      "how to think in English instead of translating",
      "how to reduce accent when speaking English",
      "how to speak English confidently without fear",
      "how to improve English pronunciation by yourself",
      "best way to practice English speaking alone",
      "how to stop translating in your head when speaking English",
      "how to sound more natural when speaking English",
      "how to improve English intonation and rhythm",
      "shadowing technique for English fluency explained",
      
      // Vocabulary Building
      "how to remember English vocabulary permanently",
      "best way to learn English words and actually use them",
      "how many English words do you need to be fluent",
      "how to expand English vocabulary as an adult",
      "best English vocabulary learning methods that work",
      "how to learn English collocations naturally",
      "spaced repetition for English vocabulary explained",
      "how to learn phrasal verbs without memorizing",
      "how to use new English words in daily conversation",
      "best apps to learn English vocabulary 2025",
      
      // Grammar
      "how to improve English grammar without boring exercises",
      "most common English grammar mistakes by non native speakers",
      "how to use articles a an the correctly in English",
      "when to use present perfect vs past simple explained",
      "how to master English prepositions once and for all",
      "conditional sentences in English explained simply",
      "how to use English tenses correctly when speaking",
      "subject verb agreement mistakes to avoid",
      "how to improve English grammar through reading",
      "relative clauses in English made easy",
      
      // Listening Comprehension
      "how to improve English listening skills fast",
      "why can I read English but not understand when people speak",
      "how to understand native English speakers better",
      "how to understand English movies without subtitles",
      "best podcasts for learning English intermediate level",
      "how to improve English listening with music",
      "why is British English harder to understand than American",
      "how to understand fast English speech",
      "active listening techniques for English learners",
      "how to train your ear to understand English accents",
      
      // Reading & Writing
      "how to improve English writing skills for non native speakers",
      "how to read English books without getting bored",
      "best English books for intermediate learners",
      "how to write better sentences in English",
      "how to improve English writing style",
      "common writing mistakes in English and how to fix them",
      "how to write naturally in English like a native",
      "how to improve English reading speed and comprehension",
      "how to learn English through reading newspapers",
      "journaling in English for language improvement",
      
      // Study Methods & Motivation
      "how long does it take to become fluent in English",
      "best way to learn English by yourself at home",
      "how to stay motivated when learning English",
      "how to learn English when you have no time",
      "immersion method for learning English at home",
      "how to create an English learning routine that sticks",
      "language learning plateau how to break through",
      "how to practice English every day without getting bored",
      "best free resources to learn English online 2025",
      "how to measure your English progress",
      
      // Common Challenges
      "why is my English not improving despite studying",
      "how to overcome fear of speaking English",
      "how to stop making the same English mistakes",
      "why do I forget English words I just learned",
      "how to improve English when living in non English country",
      "how to learn English as a busy adult",
      "common English learning mistakes that slow your progress",
      "how to fix fossilized errors in English",
      "why grammar study alone does not improve speaking",
      "how to build English confidence step by step"
    ]
  },

  // ============================================
  // ENGLISH FOR SPECIFIC PURPOSES
  // Career and life situations
  // ============================================
  'English for Life': {
    category: 'General English',
    keywords: [
      "how to improve English for job interviews",
      "English phrases for traveling abroad",
      "how to write English resume that gets interviews",
      "small talk topics in English for networking",
      "how to negotiate in English as non native speaker",
      "English for doctors and medical professionals",
      "English for engineers technical vocabulary",
      "how to give presentations in English confidently",
      "English for customer service jobs",
      "how to write LinkedIn profile in English",
      "English for IT professionals common terms",
      "how to handle phone calls in English at work",
      "English for hospitality and tourism industry",
      "how to write cover letter in English",
      "everyday English phrases for daily life",
      "how to order food in English confidently",
      "English for academic writing university level",
      "how to participate in English meetings",
      "English for sales and marketing professionals",
      "how to ask for help in English politely"
    ]
  }
};

// Helper: Convert text to URL slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

// Check if keyword already has a blog post
async function isKeywordUsed(keyword: string): Promise<boolean> {
  const slug = slugify(keyword);
  
  const { data: slugMatch } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (slugMatch) return true;
  
  const keywordWords = keyword.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  const { data: posts } = await supabase
    .from('blog_post_translations')
    .select('title')
    .eq('language_code', 'en')
    .limit(500);
  
  if (posts) {
    for (const post of posts) {
      const titleWords = post.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
      const intersection = keywordWords.filter(w => titleWords.includes(w)).length;
      const similarity = intersection / Math.max(keywordWords.length, titleWords.length);
      if (similarity > 0.7) return true;
    }
  }
  
  return false;
}

// Get unused keywords for a subject
async function getUnusedKeywords(subject: string): Promise<string[]> {
  const config = KEYWORD_DATABASE[subject as keyof typeof KEYWORD_DATABASE];
  if (!config) return [];
  
  const unused: string[] = [];
  
  for (const keyword of config.keywords) {
    const isUsed = await isKeywordUsed(keyword);
    if (!isUsed) {
      unused.push(keyword);
    }
  }
  
  return unused;
}

// ============================================
// GENERATE HIGH-QUALITY NATIVE CONTENT
// No markdown, human-like, SEO optimized
// ============================================
async function generateNativeContent(
  keyword: string, 
  subject: string, 
  languageCode: string,
  languageName: string,
  nativeName: string
): Promise<{
  title: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  metaKeywords: string;
} | null> {
  try {
    const isEnglish = languageCode === 'en';
    
    const prompt = `You are a professional content writer who writes like a skilled human journalist, NOT like AI. You are writing for ${languageName} speakers in their native language (${nativeName}).

${isEnglish ? `TARGET KEYWORD: "${keyword}"` : `TOPIC (translate and adapt for ${languageName} audience): "${keyword}"`}

SUBJECT: ${subject}

CRITICAL WRITING RULES - FOLLOW EXACTLY:

1. WRITE 100% IN ${languageName.toUpperCase()} (${nativeName})
   - Do NOT mix languages
   - Use natural ${languageName} expressions and idioms
   - Adapt examples for ${languageName}-speaking countries/culture

2. WRITE LIKE A HUMAN, NOT AI:
   - NO hashtags (#) or markdown formatting
   - NO bullet points that start with asterisks (*)
   - NO phrases like "In this article" or "Let's dive in" or "In conclusion"
   - NO robotic transitions like "Furthermore" "Moreover" "Additionally"
   - Use natural conversational transitions instead
   - Vary sentence length - mix short punchy sentences with longer ones
   - Include personal touches like "I remember when..." or "Many of my students ask..."
   - Use contractions naturally (don't → don't, it's, you'll, etc.)

3. FORMAT AS CLEAN HTML ONLY:
   - Use <h2> and <h3> for headings (NOT # markdown)
   - Use <p> for paragraphs
   - Use <ul><li> or <ol><li> for lists (sparingly, not everything needs to be a list)
   - Use <strong> for emphasis (sparingly)
   - Use <blockquote> for tips or important notes

4. SEO OPTIMIZATION:
   - ${isEnglish ? `Include the exact keyword "${keyword}" in:` : 'Include the main topic naturally in:'}
     * The title
     * First paragraph (within 100 words)
     * At least one <h2> heading
     * 2-3 more times naturally throughout
   - Answer the question DIRECTLY in the first paragraph (for featured snippets)

5. STRUCTURE:
   - Engaging opening that hooks the reader (personal story, surprising fact, or direct answer)
   - 4-6 main sections with <h2> headings
   - Each section 150-250 words
   - Total: 1200-1800 words
   - End with practical next steps, not generic conclusions

6. QUALITY MARKERS:
   - Include specific numbers, statistics, timeframes
   - Add real examples and scenarios
   - Share practical tips that actually help
   - Reference credible sources where appropriate
   - Write with expertise and confidence

7. BRANDING (SUBTLE - DO NOT OVERDO):
   - At the END of the article only, include ONE natural call-to-action mentioning "English AIdol"
   - Example: "If you want to practice these techniques, you can try AI-powered speaking practice at English AIdol."
   - DO NOT mention English AIdol more than once
   - DO NOT make it sound promotional or salesy
   - The focus is on HELPING the reader, not advertising
   - If the content doesn't naturally fit a CTA, don't force one

8. FOR FEATURED SNIPPETS (AI/Google):
   - First paragraph should DIRECTLY answer the question in 2-3 sentences
   - Use clear, definitive language (avoid "might", "could be", "perhaps")
   - Include a quick summary list or key takeaways early
   - Structure content so AI assistants can easily extract the answer

OUTPUT FORMAT (use these exact markers):

===TITLE===
[Compelling title in ${languageName}, 50-70 characters, includes main topic]

===CONTENT===
[Full HTML content - well-formatted, engaging, human-like]

===EXCERPT===
[Engaging 150-160 character summary in ${languageName}]

===META_DESCRIPTION===
[SEO meta description in ${languageName}, 150-155 characters with call-to-action]

===META_KEYWORDS===
[8-10 relevant keywords in ${languageName}, comma-separated]

Remember: Write as if you're a knowledgeable friend explaining something, not a robot generating content. The reader should feel like they're getting advice from an expert who genuinely wants to help them succeed.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://englishaidol.com',
        'X-Title': 'English AIdol Blog Generator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8, // Slightly higher for more natural variation
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API error:', error);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content returned');
      return null;
    }

    // Parse sections
    const parseSection = (marker: string): string => {
      const regex = new RegExp(`===${marker}===\\s*([\\s\\S]*?)(?====|$)`, 'i');
      const match = content.match(regex);
      return match ? match[1].trim() : '';
    };

    const title = parseSection('TITLE');
    const htmlContent = parseSection('CONTENT');
    const excerpt = parseSection('EXCERPT');
    const metaDescription = parseSection('META_DESCRIPTION');
    const metaKeywords = parseSection('META_KEYWORDS');

    // Clean up any remaining markdown that slipped through
    let cleanContent = htmlContent
      .replace(/^#{1,6}\s+(.+)$/gm, '<h2>$1</h2>') // Convert any # headers to h2
      .replace(/^\*\s+(.+)$/gm, '<li>$1</li>') // Convert * bullets to li
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Convert **bold** to strong
      .replace(/\*(.+?)\*/g, '<em>$1</em>'); // Convert *italic* to em

    // Validate
    if (!title || !cleanContent || cleanContent.length < 1000) {
      console.error('Content validation failed');
      return null;
    }

    return {
      title,
      content: cleanContent,
      excerpt: excerpt || cleanContent.replace(/<[^>]+>/g, '').slice(0, 160),
      metaDescription: metaDescription || excerpt || cleanContent.replace(/<[^>]+>/g, '').slice(0, 155),
      metaKeywords: metaKeywords || `${subject}, ${keyword}`
    };
  } catch (error) {
    console.error('Error generating content:', error);
    return null;
  }
}

// Get or create category
async function getOrCreateCategory(categoryName: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('blog_categories')
    .select('id')
    .eq('slug', slugify(categoryName))
    .single();

  if (existing) return existing.id;

  const { data: newCategory, error } = await supabase
    .from('blog_categories')
    .insert({
      name: categoryName,
      slug: slugify(categoryName),
      description: `${categoryName} preparation and learning resources`
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return null;
  }

  return newCategory?.id || null;
}

// Save blog post with multiple language versions
async function saveBlogPost(
  keyword: string,
  subject: string,
  languages: typeof SUPPORTED_LANGUAGES,
  publishImmediately: boolean = true
): Promise<{ success: boolean; postId?: string; languagesGenerated?: number; error?: string }> {
  try {
    // Generate English first (for the slug)
    console.log(`📝 Generating English content for: "${keyword}"`);
    const englishContent = await generateNativeContent(keyword, subject, 'en', 'English', 'English');
    
    if (!englishContent) {
      return { success: false, error: 'English content generation failed' };
    }

    const slug = slugify(englishContent.title);

    // Check duplicate
    const { data: existingSlug } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      return { success: false, error: 'Slug already exists' };
    }

    const categoryId = await getOrCreateCategory(subject);

    // Create post
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        status: publishImmediately ? 'published' : 'draft',
        published_at: publishImmediately ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (postError) throw postError;

    // Save English translation
    await supabase
      .from('blog_post_translations')
      .insert({
        blog_post_id: post.id,
        language_code: 'en',
        title: englishContent.title,
        content: englishContent.content,
        excerpt: englishContent.excerpt,
        meta_description: englishContent.metaDescription,
        meta_keywords: englishContent.metaKeywords
      });

    let languagesGenerated = 1;

    // Generate for other languages - pick 7 more to stay within timeout
    // Priority: Chinese variants first, then random selection
    const otherLanguages = languages.filter(l => l.code !== 'en');
    
    // Priority languages (always include if requested)
    const priorityLangs = ['zh', 'zh-TW', 'yue', 'ja', 'ko', 'vi', 'es'];
    const priorityToGen = otherLanguages.filter(l => priorityLangs.includes(l.code));
    
    // Random additional languages
    const remainingLangs = otherLanguages.filter(l => !priorityLangs.includes(l.code));
    const shuffled = remainingLangs.sort(() => Math.random() - 0.5);
    
    // Take priority + random to get up to 7 additional languages (8 total including English)
    const maxAdditional = 7;
    const langsToGenerate = [
      ...priorityToGen.slice(0, maxAdditional),
      ...shuffled.slice(0, Math.max(0, maxAdditional - priorityToGen.length))
    ].slice(0, maxAdditional);
    
    console.log(`🌍 Generating ${langsToGenerate.length} additional languages: ${langsToGenerate.map(l => l.code).join(', ')}`);
    
    // Generate in parallel batches of 3 to speed up
    const batchSize = 3;
    for (let i = 0; i < langsToGenerate.length; i += batchSize) {
      const batch = langsToGenerate.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (lang) => {
          console.log(`🌍 Generating ${lang.name} (${lang.nativeName}) content...`);
          
          const nativeContent = await generateNativeContent(
            keyword, 
            subject, 
            lang.code, 
            lang.name,
            lang.nativeName
          );
          
          if (nativeContent) {
            await supabase
              .from('blog_post_translations')
              .insert({
                blog_post_id: post.id,
                language_code: lang.code,
                title: nativeContent.title,
                content: nativeContent.content,
                excerpt: nativeContent.excerpt,
                meta_description: nativeContent.metaDescription,
                meta_keywords: nativeContent.metaKeywords
              });
            
            console.log(`✅ ${lang.name} content saved`);
            return true;
          } else {
            console.log(`⚠️ ${lang.name} content generation failed, skipping`);
            return false;
          }
        })
      );
      
      // Count successes
      languagesGenerated += batchResults.filter(r => r.status === 'fulfilled' && r.value).length;
      
      // Brief pause between batches
      if (i + batchSize < langsToGenerate.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Link category
    if (categoryId) {
      await supabase
        .from('blog_post_categories')
        .insert({
          blog_post_id: post.id,
          category_id: categoryId
        });
    }

    // Log the keyword used
    await supabase
      .from('blog_keyword_log')
      .insert({
        keyword,
        subject,
        blog_post_id: post.id,
        status: 'published'
      });

    console.log(`✅ Blog post created with ${languagesGenerated} language versions`);

    return { success: true, postId: post.id, languagesGenerated };
  } catch (error: any) {
    console.error('Error saving post:', error);
    return { success: false, error: error.message };
  }
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const body = await req.json().catch(() => ({}));
    const {
      action = 'generate_daily',
      subject,
      keyword,
      languages = ['en', 'zh', 'es', 'ar', 'pt', 'vi', 'ko', 'ja', 'fr', 'de'] // Default: top 10 languages
    } = body;

    console.log(`🎯 Keyword Blog Generator: action=${action}`);

    // Get language configs for requested languages
    const selectedLanguages = SUPPORTED_LANGUAGES.filter(l => languages.includes(l.code));

    // ============================================
    // ACTION: generate_native_multilang (NEW - AUTHENTIC)
    // Creates SEPARATE posts with NATIVE keywords for each language
    // Each language gets its own authentic questions/topics
    // ============================================
    if (action === 'generate_native_multilang') {
      console.log('🌍 Running AUTHENTIC native multilingual blog generation...');
      
      const targetLang = body.language_code || 'zh'; // Default to Chinese
      const lang = SUPPORTED_LANGUAGES.find(l => l.code === targetLang);
      
      if (!lang) {
        return new Response(JSON.stringify({
          success: false,
          error: `Unsupported language: ${targetLang}`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get native keyword for this language
      let nativeKeyword: string | null = null;
      const nativeKeywords = NATIVE_KEYWORDS[targetLang];
      
      if (nativeKeywords && nativeKeywords.keywords.length > 0) {
        // Pick random native keyword
        nativeKeyword = nativeKeywords.keywords[Math.floor(Math.random() * nativeKeywords.keywords.length)];
        console.log(`📝 Using pre-researched ${lang.name} keyword: "${nativeKeyword}"`);
      } else {
        // Discover keyword using AI
        nativeKeyword = await discoverNativeKeyword(targetLang, lang.name, lang.nativeName, 'English Learning');
        console.log(`🔍 AI-discovered ${lang.name} keyword: "${nativeKeyword}"`);
      }

      if (!nativeKeyword) {
        return new Response(JSON.stringify({
          success: false,
          error: `Could not find/generate native keyword for ${lang.name}`
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if this native keyword was already used
      const { data: existingKeyword } = await supabase
        .from('blog_keyword_log')
        .select('id')
        .eq('keyword', nativeKeyword)
        .single();

      if (existingKeyword) {
        // Try to get another keyword
        if (nativeKeywords && nativeKeywords.keywords.length > 1) {
          const unusedNative = nativeKeywords.keywords.filter(async k => {
            const { data } = await supabase.from('blog_keyword_log').select('id').eq('keyword', k).single();
            return !data;
          });
          if (unusedNative.length > 0) {
            nativeKeyword = unusedNative[Math.floor(Math.random() * unusedNative.length)];
          }
        }
      }

      console.log(`🎯 Creating NATIVE ${lang.name} post for: "${nativeKeyword}"`);

      // Generate content in native language with native keyword
      const content = await generateNativeContent(
        nativeKeyword,
        nativeKeywords?.topics?.[0] || 'English Learning',
        targetLang,
        lang.name,
        lang.nativeName
      );

      if (!content) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Content generation failed'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create post with language-specific slug
      const slug = slugify(`${lang.code}-${content.title.slice(0, 50)}-${Date.now()}`);

      const { data: post, error: postError } = await supabase
        .from('blog_posts')
        .insert({
          slug,
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (postError) throw postError;

      // Save translation (single language, native content)
      await supabase
        .from('blog_post_translations')
        .insert({
          blog_post_id: post.id,
          language_code: targetLang,
          title: content.title,
          content: content.content,
          excerpt: content.excerpt,
          meta_description: content.metaDescription,
          meta_keywords: content.metaKeywords
        });

      // Log the native keyword
      await supabase.from('blog_keyword_log').insert({
        keyword: nativeKeyword,
        subject: `Native ${lang.name}`,
        blog_post_id: post.id,
        status: 'published'
      });

      return new Response(JSON.stringify({
        success: true,
        postId: post.id,
        slug,
        language: targetLang,
        languageName: lang.name,
        nativeKeyword,
        title: content.title,
        isAuthenticallyNative: true // Flag that this is a truly native post
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: generate_all_native (NEW - BATCH)
    // Creates native posts for multiple languages at once
    // Each language gets its OWN authentic question/topic
    // ============================================
    if (action === 'generate_all_native') {
      console.log('🌍 Batch generating AUTHENTIC native posts for all languages...');
      
      const targetLanguages = body.languages || ['zh', 'ja', 'ko', 'vi', 'th'];
      const results: any[] = [];
      
      for (const langCode of targetLanguages) {
        const lang = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
        if (!lang) continue;

        // Get native keyword
        let nativeKeyword: string | null = null;
        const nativeKeywords = NATIVE_KEYWORDS[langCode];
        
        if (nativeKeywords && nativeKeywords.keywords.length > 0) {
          // Pick random unused native keyword
          for (const kw of nativeKeywords.keywords.sort(() => Math.random() - 0.5)) {
            const { data } = await supabase.from('blog_keyword_log').select('id').eq('keyword', kw).single();
            if (!data) {
              nativeKeyword = kw;
              break;
            }
          }
        }
        
        if (!nativeKeyword) {
          nativeKeyword = await discoverNativeKeyword(langCode, lang.name, lang.nativeName, 'English Learning');
        }

        if (!nativeKeyword) {
          results.push({ language: langCode, success: false, error: 'No keyword available' });
          continue;
        }

        console.log(`📝 ${lang.name}: "${nativeKeyword}"`);

        try {
          const content = await generateNativeContent(
            nativeKeyword,
            nativeKeywords?.topics?.[0] || 'English Learning',
            langCode,
            lang.name,
            lang.nativeName
          );

          if (!content) {
            results.push({ language: langCode, success: false, error: 'Content generation failed' });
            continue;
          }

          const slug = slugify(`${langCode}-${content.title.slice(0, 40)}-${Date.now()}`);

          const { data: post } = await supabase
            .from('blog_posts')
            .insert({ slug, status: 'published', published_at: new Date().toISOString() })
            .select('id')
            .single();

          if (post) {
            await supabase.from('blog_post_translations').insert({
              blog_post_id: post.id,
              language_code: langCode,
              title: content.title,
              content: content.content,
              excerpt: content.excerpt,
              meta_description: content.metaDescription,
              meta_keywords: content.metaKeywords
            });

            await supabase.from('blog_keyword_log').insert({
              keyword: nativeKeyword,
              subject: `Native ${lang.name}`,
              blog_post_id: post.id,
              status: 'published'
            });

            results.push({
              language: langCode,
              languageName: lang.name,
              success: true,
              postId: post.id,
              keyword: nativeKeyword,
              title: content.title
            });
          }
        } catch (error: any) {
          results.push({ language: langCode, success: false, error: error.message });
        }

        // Brief pause between languages
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return new Response(JSON.stringify({
        success: true,
        languagesProcessed: results.length,
        successCount: results.filter(r => r.success).length,
        results,
        isAuthenticallyNative: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: generate_daily (ORIGINAL - still available)
    // Generates one English post with translations
    // ============================================
    if (action === 'generate_daily' || action === 'auto_post') {
      console.log('🤖 Running automatic blog generation (English + translations)...');
      
      // Check schedule settings
      const { data: settings } = await supabase
        .from('blog_auto_schedule')
        .select('*')
        .limit(1)
        .single();

      // Check if enabled (skip check if manual trigger)
      if (action === 'auto_post' && settings && !settings.enabled) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Auto-posting is disabled',
          skipped: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check daily limit
      const today = new Date().toISOString().split('T')[0];
      const lastRunDate = settings?.last_run_at ? new Date(settings.last_run_at).toISOString().split('T')[0] : null;
      let postsToday = settings?.posts_generated_today || 0;
      
      if (lastRunDate !== today) {
        postsToday = 0; // Reset counter for new day
      }

      const dailyLimit = settings?.posts_per_day || 3;
      if (action === 'auto_post' && postsToday >= dailyLimit) {
        return new Response(JSON.stringify({
          success: true,
          message: `Daily limit reached (${postsToday}/${dailyLimit} posts)`,
          skipped: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const subjects = Object.keys(KEYWORD_DATABASE);
      
      // Pick random subject
      const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
      
      console.log(`📚 Today's subject: ${randomSubject}`);

      // Get unused keywords
      const unusedKeywords = await getUnusedKeywords(randomSubject);
      
      if (unusedKeywords.length === 0) {
        // Log the skip
        await supabase.from('blog_generation_log').insert({
          keyword: 'N/A',
          subject: randomSubject,
          source: 'auto',
          status: 'skipped',
          error_message: 'All keywords covered for this subject'
        });
        
        return new Response(JSON.stringify({
          success: true,
          message: `All ${randomSubject} keywords have been covered!`,
          subject: randomSubject,
          unusedCount: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Pick random unused keyword
      const selectedKeyword = unusedKeywords[Math.floor(Math.random() * unusedKeywords.length)];
      
      console.log(`🎯 Generating NATIVE multilingual post for: "${selectedKeyword}"`);
      console.log(`🌍 Languages: ${selectedLanguages.map(l => l.code).join(', ')}`);

      const saveResult = await saveBlogPost(
        selectedKeyword, 
        randomSubject, 
        selectedLanguages,
        true // auto-publish
      );

      // Log the generation
      await supabase.from('blog_generation_log').insert({
        keyword: selectedKeyword,
        subject: randomSubject,
        source: 'auto',
        post_id: saveResult.postId || null,
        status: saveResult.success ? 'success' : 'failed',
        languages_generated: saveResult.languagesGenerated || 0,
        error_message: saveResult.error
      });

      // Update schedule counter
      if (saveResult.success && settings) {
        await supabase.from('blog_auto_schedule').update({
          posts_generated_today: postsToday + 1,
          last_run_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', settings.id);
      }

      return new Response(JSON.stringify({
        success: saveResult.success,
        postId: saveResult.postId,
        keyword: selectedKeyword,
        subject: randomSubject,
        languagesGenerated: saveResult.languagesGenerated,
        unusedKeywordsRemaining: unusedKeywords.length - (saveResult.success ? 1 : 0),
        postsToday: postsToday + (saveResult.success ? 1 : 0),
        dailyLimit,
        isNativeContent: true, // Flag that this is native, not translated
        error: saveResult.error
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: generate_specific
    // ============================================
    if (action === 'generate_specific') {
      if (!subject || !keyword) {
        throw new Error('Subject and keyword are required');
      }

      const isUsed = await isKeywordUsed(keyword);
      if (isUsed) {
        return new Response(JSON.stringify({
          success: false,
          error: 'This keyword has already been covered'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`🎯 Generating multilingual post for: "${keyword}" (${subject})`);

      const saveResult = await saveBlogPost(
        keyword, 
        subject, 
        selectedLanguages,
        true
      );

      return new Response(JSON.stringify({
        success: saveResult.success,
        postId: saveResult.postId,
        languagesGenerated: saveResult.languagesGenerated,
        error: saveResult.error
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: generate_single_language
    // Generate for ONE language only (faster)
    // ============================================
    if (action === 'generate_single_language') {
      if (!subject || !keyword) {
        throw new Error('Subject and keyword are required');
      }

      const langCode = body.languageCode || 'en';
      const lang = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
      
      if (!lang) {
        throw new Error(`Unsupported language: ${langCode}`);
      }

      console.log(`🎯 Generating ${lang.name} content for: "${keyword}"`);

      const content = await generateNativeContent(keyword, subject, lang.code, lang.name, lang.nativeName);

      if (!content) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Content generation failed'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        language: lang.code,
        preview: {
          title: content.title,
          excerpt: content.excerpt,
          contentLength: content.content.length
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: list_keywords
    // ============================================
    if (action === 'list_keywords') {
      const allKeywords: Array<{ subject: string; keyword: string; used: boolean }> = [];

      for (const [subjectName, config] of Object.entries(KEYWORD_DATABASE)) {
        for (const kw of config.keywords) {
          const isUsed = await isKeywordUsed(kw);
          allKeywords.push({ subject: subjectName, keyword: kw, used: isUsed });
        }
      }

      const totalKeywords = allKeywords.length;
      const usedKeywords = allKeywords.filter(k => k.used).length;

      const bySubject: Record<string, { total: number; used: number; unused: number }> = {};
      for (const k of allKeywords) {
        if (!bySubject[k.subject]) {
          bySubject[k.subject] = { total: 0, used: 0, unused: 0 };
        }
        bySubject[k.subject].total++;
        if (k.used) bySubject[k.subject].used++;
        else bySubject[k.subject].unused++;
      }

      return new Response(JSON.stringify({
        success: true,
        summary: {
          totalKeywords,
          usedKeywords,
          unusedKeywords: totalKeywords - usedKeywords,
          percentageComplete: Math.round((usedKeywords / totalKeywords) * 100)
        },
        bySubject,
        supportedLanguages: SUPPORTED_LANGUAGES.map(l => ({ code: l.code, name: l.name })),
        keywords: allKeywords
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: get_unused
    // ============================================
    if (action === 'get_unused') {
      if (!subject) {
        throw new Error('Subject is required');
      }

      const unused = await getUnusedKeywords(subject);

      return new Response(JSON.stringify({
        success: true,
        subject,
        unusedKeywords: unused,
        count: unused.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: list_languages
    // ============================================
    if (action === 'list_languages') {
      return new Response(JSON.stringify({
        success: true,
        languages: SUPPORTED_LANGUAGES,
        totalLanguages: SUPPORTED_LANGUAGES.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: fill_translations
    // Add missing translations to existing posts (called by separate cron)
    // ============================================
    if (action === 'fill_translations') {
      console.log('🔄 Running fill_translations to add missing language versions...');
      
      // Get a post that doesn't have all translations yet
      const { data: posts } = await supabase
        .from('blog_posts')
        .select(`
          id, 
          slug,
          blog_post_translations(language_code)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!posts || posts.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'No posts to fill',
          skipped: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Find a post missing translations
      let targetPost: any = null;
      let missingLangs: typeof SUPPORTED_LANGUAGES = [];
      
      for (const post of posts) {
        const existingLangs = (post.blog_post_translations || []).map((t: any) => t.language_code);
        missingLangs = SUPPORTED_LANGUAGES.filter(l => !existingLangs.includes(l.code));
        
        if (missingLangs.length > 0) {
          targetPost = post;
          break;
        }
      }

      if (!targetPost || missingLangs.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'All recent posts have full translations',
          skipped: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get the English content to derive the keyword
      const { data: englishContent } = await supabase
        .from('blog_post_translations')
        .select('title, content')
        .eq('blog_post_id', targetPost.id)
        .eq('language_code', 'en')
        .single();

      if (!englishContent) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No English content found for post'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const keyword = englishContent.title;
      
      // Pick up to 3 languages to fill in this run (to avoid timeout)
      const langsToFill = missingLangs.slice(0, 3);
      let filled = 0;

      console.log(`📝 Filling ${langsToFill.length} languages for: "${targetPost.slug}"`);
      
      // Generate in parallel to speed up
      const results = await Promise.allSettled(
        langsToFill.map(async (lang) => {
          console.log(`🌍 Generating ${lang.name}...`);
          
          const content = await generateNativeContent(
            keyword,
            'General', // We don't know the original subject
            lang.code,
            lang.name,
            lang.nativeName
          );

          if (content) {
            await supabase
              .from('blog_post_translations')
              .insert({
                blog_post_id: targetPost.id,
                language_code: lang.code,
                title: content.title,
                content: content.content,
                excerpt: content.excerpt,
                meta_description: content.metaDescription,
                meta_keywords: content.metaKeywords
              });
            console.log(`✅ ${lang.name} added`);
            return true;
          }
          return false;
        })
      );
      
      filled = results.filter(r => r.status === 'fulfilled' && r.value).length;

      return new Response(JSON.stringify({
        success: true,
        postId: targetPost.id,
        slug: targetPost.slug,
        languagesFilled: filled,
        remainingMissing: missingLangs.length - filled
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: get_schedule_status
    // Get current auto-posting status and history
    // ============================================
    if (action === 'get_schedule_status') {
      const { data: settings } = await supabase
        .from('blog_auto_schedule')
        .select('*')
        .limit(1)
        .single();

      // Get recent generation history
      const { data: recentLogs } = await supabase
        .from('blog_generation_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      // Get keyword stats
      const allKeywords: Array<{ subject: string; used: boolean }> = [];
      for (const [subjectName, config] of Object.entries(KEYWORD_DATABASE)) {
        for (const kw of config.keywords) {
          const isUsed = await isKeywordUsed(kw);
          allKeywords.push({ subject: subjectName, used: isUsed });
        }
      }

      const totalKeywords = allKeywords.length;
      const usedKeywords = allKeywords.filter(k => k.used).length;

      return new Response(JSON.stringify({
        success: true,
        schedule: settings || { enabled: false, posts_per_day: 3 },
        recentGenerations: recentLogs || [],
        keywordStats: {
          total: totalKeywords,
          used: usedKeywords,
          remaining: totalKeywords - usedKeywords,
          percentComplete: Math.round((usedKeywords / totalKeywords) * 100)
        },
        supportedLanguages: SUPPORTED_LANGUAGES.length,
        isNativeContentSystem: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: update_schedule
    // Update auto-posting settings
    // ============================================
    if (action === 'update_schedule') {
      const { enabled, posts_per_day, languages: langCodes, auto_publish } = body;
      
      const { data: existing } = await supabase
        .from('blog_auto_schedule')
        .select('id')
        .limit(1)
        .single();

      const updates: any = { updated_at: new Date().toISOString() };
      if (enabled !== undefined) updates.enabled = enabled;
      if (posts_per_day !== undefined) updates.posts_per_day = posts_per_day;
      if (langCodes !== undefined) updates.languages = langCodes;
      if (auto_publish !== undefined) updates.auto_publish = auto_publish;

      if (existing?.id) {
        await supabase
          .from('blog_auto_schedule')
          .update(updates)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('blog_auto_schedule')
          .insert({ ...updates, enabled: true, posts_per_day: 3 });
      }

      const { data: settings } = await supabase
        .from('blog_auto_schedule')
        .select('*')
        .limit(1)
        .single();

      return new Response(JSON.stringify({
        success: true,
        message: enabled ? 'Auto-posting enabled' : 'Settings updated',
        schedule: settings
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // ACTION: trigger_now
    // Manually trigger generation (ignores daily limit)
    // ============================================
    if (action === 'trigger_now') {
      const targetSubject = body.subject;
      const targetKeyword = body.keyword;
      
      let selectedSubject: string;
      let selectedKeyword: string;

      if (targetKeyword && targetSubject) {
        selectedSubject = targetSubject;
        selectedKeyword = targetKeyword;
      } else {
        // Pick random
        const subjects = Object.keys(KEYWORD_DATABASE);
        selectedSubject = subjects[Math.floor(Math.random() * subjects.length)];
        const unusedKeywords = await getUnusedKeywords(selectedSubject);
        
        if (unusedKeywords.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: `No unused keywords for ${selectedSubject}`
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        selectedKeyword = unusedKeywords[Math.floor(Math.random() * unusedKeywords.length)];
      }

      console.log(`🚀 Manual trigger: "${selectedKeyword}" (${selectedSubject})`);
      console.log(`🌍 Generating NATIVE content for ${selectedLanguages.length} languages`);

      const saveResult = await saveBlogPost(
        selectedKeyword, 
        selectedSubject, 
        selectedLanguages,
        true
      );

      // Log
      await supabase.from('blog_generation_log').insert({
        keyword: selectedKeyword,
        subject: selectedSubject,
        source: 'manual',
        post_id: saveResult.postId || null,
        status: saveResult.success ? 'success' : 'failed',
        languages_generated: saveResult.languagesGenerated || 0,
        error_message: saveResult.error
      });

      return new Response(JSON.stringify({
        success: saveResult.success,
        postId: saveResult.postId,
        keyword: selectedKeyword,
        subject: selectedSubject,
        languagesGenerated: saveResult.languagesGenerated,
        isNativeContent: true,
        error: saveResult.error
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
