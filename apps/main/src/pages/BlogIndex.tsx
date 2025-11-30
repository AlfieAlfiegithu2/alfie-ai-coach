import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, FileText, Sparkles, Clock } from "lucide-react";
import SEO from "@/components/SEO";
import StudentLayout from "@/components/StudentLayout";

const blogPosts = [
  {
    slug: "how-to-use-ai-for-ielts-speaking",
    title: "How to Use AI to Boost Your IELTS Speaking Score",
    description:
      "A practical, examiner-style guide on using AI tools to improve fluency, coherence, pronunciation, and lexical resource.",
    readTime: "6 min read",
    level: "All Levels",
    category: "IELTS Speaking",
  },
  {
    slug: "ielts-writing-band-7-checklist",
    title: "IELTS Writing Band 7.0+ Checklist (Examiner-Approved)",
    description:
      "A precise checklist used by examiners to evaluate Task Achievement, Coherence, Vocabulary, and Grammar.",
    readTime: "7 min read",
    level: "Intermediate–Advanced",
    category: "IELTS Writing",
  },
  {
    slug: "daily-15-minute-english-routine",
    title: "Daily 15-Minute English Routine for Busy Learners",
    description:
      "Short, high-impact speaking, vocabulary, and pronunciation drills powered by AI feedback.",
    readTime: "5 min read",
    level: "All Levels",
    category: "General English",
  },
];

const BlogIndex = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Scroll to top for SPA navigation
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Match IELTS Speaking Test background style */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage:
            "url('/1000031207.png')",
          backgroundColor: "#ffffff",
        }}
      />
      <div className="relative z-10 min-h-screen flex flex-col">
        <SEO
          title="English AIdol Blog | IELTS & AI English Learning Guides"
          description="Read expert IELTS tips, AI-powered learning strategies, and speaking/writing guides created with examiner-level quality."
          keywords="IELTS blog, IELTS tips, AI English learning, speaking practice, writing band 7, English AIdol"
          type="article"
        />

        <StudentLayout
          title="English AIdol Blog"
          showBackButton
        >
          <div className="flex-1 flex items-start justify-center min-h-[calc(100vh-120px)] py-8">
            <div className="w-full max-w-4xl mx-auto space-y-6 px-4 flex flex-col">
              {/* Header strip, aligned with IELTS Speaking container look */}
              <div className="text-center">
                <Badge
                  variant="outline"
                  className="mb-3 px-4 py-1 text-primary border-primary/20 uppercase tracking-wide text-[11px]"
                >
                  Expert IELTS & AI Learning Insights
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground font-nunito mb-2">
                  Learn Smarter with IELTS Examiners + AI
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground font-nunito max-w-2xl mx-auto">
                  Curated articles on IELTS Speaking, Writing, and AI-powered English learning.
                  Actionable, concise, and aligned with how real examiners think.
                </p>
              </div>

              {/* Blog cards container mimicking test card design */}
              <div className="grid gap-4 mt-4">
                {blogPosts.map((post) => (
                  <Card
                    key={post.slug}
                    className="bg-white/85 backdrop-blur-sm shadow-lg rounded-2xl border border-white/40 hover:shadow-xl hover:bg-white transition-all cursor-pointer"
                    onClick={() => navigate(`/blog/${post.slug}`)}
                  >
                    <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wide px-2 py-0.5 border-primary/20 text-primary"
                          >
                            {post.category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {post.level}
                          </span>
                        </div>
                        <CardTitle className="text-base sm:text-lg font-semibold font-nunito text-foreground">
                          {post.title}
                        </CardTitle>
                      </div>
                      <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-primary/5 border border-primary/15">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs sm:text-sm text-muted-foreground font-nunito mb-2">
                        {post.description}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{post.readTime}</span>
                        </div>
                        <div className="inline-flex items-center gap-1 text-primary font-medium">
                          <span>Read article</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* SEO helper text (visible, but subtle) */}
              <div className="mt-6 text-[10px] sm:text-xs text-muted-foreground font-nunito leading-relaxed bg-white/70 backdrop-blur-sm border border-dashed border-slate-200 rounded-2xl p-3">
                <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span>Why this blog helps your IELTS and English learning SEO-wise:</span>
                </div>
                <p>
                  Each article is designed around real IELTS examiner criteria and AI learning best
                  practices, using clear headings, readable URLs, and focused topics such as IELTS Speaking,
                  Band 7+ Writing, pronunciation, vocabulary, and daily routines. This structure helps
                  both learners and search engines quickly understand what every page is about.
                </p>
              </div>
            </div>
          </div>
        </StudentLayout>
      </div>
    </div>
  );
};

export default BlogIndex;