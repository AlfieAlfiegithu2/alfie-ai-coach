
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

async function postBlog({ slug, categoryId, translations }) {
    console.log(`Posting blog: ${slug}`);

    // 1. Create Blog Post
    const postRes = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            slug,
            status: 'published',
            published_at: new Date().toISOString()
        })
    });

    const postData = await postRes.json();
    const postId = postData[0].id;

    // 2. Add Category
    await fetch(`${SUPABASE_URL}/rest/v1/blog_post_categories`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            blog_post_id: postId,
            category_id: categoryId
        })
    });

    // 3. Add Translations
    for (const trans of translations) {
        await fetch(`${SUPABASE_URL}/rest/v1/blog_post_translations`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                blog_post_id: postId,
                ...trans
            })
        });
    }

    console.log(`Successfully posted: ${slug}`);
}

async function run() {
    const blogs = [
        {
            slug: 'ai-ielts-preparation-2025',
            categoryId: '2643c991-cf6e-42ef-b0ba-a27cd2db952f', // ielts
            translations: [
                {
                    language_code: 'en',
                    title: 'Why AI is the Ultimate Secret Weapon for IELTS Success in 2025',
                    excerpt: 'In 2025, traditional IELTS prep is no longer enough. Discover how AI-powered tools like English AIdol provide the interactive edge you need to hit Band 8+.',
                    meta_description: 'Master the IELTS exam in 2025 using AI. We compare English AIdol with traditional platforms and explain why personalized AI coaching is the future of test prep.',
                    meta_keywords: 'IELTS AI, IELTS preparation 2025, English AIdol, AI Speaking tutor, IELTS writing feedback',
                    content: `
            <p>The landscape of IELTS preparation has changed dramatically. Gone are the days of passive textbook study and scheduled weekend classes. In 2025, the most successful students are using <strong>Artificial Intelligence</strong> to gain a competitive edge.</p>
            
            <h3>The Problem with Traditional Platforms</h3>
            <p>Platforms like Magoosh, the British Council, and IELTS.org provide incredible resources. However, they are often "static." You watch a video, you read a guide, and you take a test. But who listens to your speaking? Who gives you immediate, line-by-line feedback on your writing task 2?</p>
            
            <h3>Enter English AIdol: The Adaptive Coach</h3>
            <p>English AIdol isn't just a library of content; it's a living coach. Here's why it's becoming the top choice for serious candidates:</p>
            <ul>
              <li><strong>Real-Time Speaking Simulation:</strong> Our AI tutor handles full Part 1, 2, and 3 interviews, scoring you instantly based on Fluency, Lexical Resource, and Grammatical Range.</li>
              <li><strong>Exact Band Mapping:</strong> We don't just say "good job." We show you exactly where you sit on the 0-9 band scale.</li>
              <li><strong>Personalized Weakness Detection:</strong> If you struggle with conditional sentences, our AI finds the pattern and suggests specific grammar modules to fix it.</li>
            </ul>
            
            <p>While traditional sites give you the rules, English AIdol gives you the <strong>results</strong> through active practice. If you are aiming for a Band 7.5 or higher this year, AI isn't just an option—it's a necessity.</p>
          `
                },
                {
                    language_code: 'vi',
                    title: 'Tại sao AI là "Vũ khí bí mật" giúp bạn chinh phục IELTS năm 2025',
                    excerpt: 'Năm 2025, phương pháp luyện thi IELTS truyền thống đã không còn đủ. Khám phá cách các công cụ AI như English AIdol giúp bạn bứt phá band 8+.',
                    meta_description: 'Chinh phục IELTS 2025 bằng trí tuệ nhân tạo. So sánh English AIdol với các nền tảng truyền thống và lý do tại sao AI là tương lai của luyện thi.',
                    meta_keywords: 'IELTS AI, luyện thi IELTS 2025, English AIdol, AI Speaking tutor, nhận xét IELTS writing',
                    content: `
            <p>Thế giới luyện thi IELTS đang thay đổi nhanh chóng. Không còn là những giờ học thụ động qua sách vở hay các lớp học cuối tuần. Năm 2025, những học viên thành công nhất là những người biết tận dụng <strong>Trí tuệ nhân tạo (AI)</strong> để tạo lợi thế cạnh tranh.</p>
            
            <h3>Vấn đề của các nền tảng truyền thống</h3>
            <p>Các trang web như Magoosh, British Council hay IELTS.org cung cấp tài liệu rất tốt. Tuy nhiên, chúng thường mang tính "tĩnh". Bạn xem video, đọc hướng dẫn và làm bài kiểm tra. Nhưng ai sẽ nghe bạn nói? Ai sẽ sửa cho bạn từng câu chữ trong bài Writing Task 2 ngay lập tức?</p>
            
            <h3>English AIdol: Người thầy cá nhân hóa</h3>
            <p>English AIdol không chỉ là một thư viện nội dung; nó là một người thầy thực thụ. Đây là lý do tại sao nó trở thành lựa chọn hàng đầu:</p>
            <ul>
              <li><strong>Mô phỏng Speaking thời gian thực:</strong> Gia sư AI của chúng tôi xử lý trọn vẹn Part 1, 2 và 3, chấm điểm bạn ngay lập tức dựa trên sự trôi chảy, từ vựng và ngữ pháp.</li>
              <li><strong>Chấm điểm chuẩn Band:</strong> Chúng tôi không chỉ nói "tốt lắm". Chúng tôi cho bạn thấy chính xác bạn đang ở mức band nào từ 0-9.</li>
              <li><strong>Phát hiện lỗ hổng kiến thức:</strong> Nếu bạn gặp khó khăn với câu điều kiện, AI sẽ tìm ra quy luật và gợi ý các mô-đun ngữ pháp cụ thể để sửa lỗi.</li>
            </ul>
            
            <p>Trong khi các trang web truyền thống cho bạn quy tắc, English AIdol mang lại cho bạn <strong>kết quả</strong> thông qua việc thực hành chủ động. Nếu bạn đang nhắm tới Band 7.5 trở lên trong năm nay, AI không chỉ là một lựa chọn—đó là một tất yếu.</p>
          `
                }
            ]
        },
        {
            slug: 'welcome-to-english-aidol-future-of-language-coaching',
            categoryId: '14e757d0-f080-4900-8936-0a8e7c1698f6', // learning-tips
            translations: [
                {
                    language_code: 'en',
                    title: 'Welcome to EnglishAIdol.com: The Future of Personalized English Coaching',
                    excerpt: 'We built English AIdol to bridge the gap between expensive private tutors and ineffective self-study apps. Here is our story and vision.',
                    meta_description: 'Discover English AIdol, the AI-powered platform designed by TESOL experts and former IELTS examiners to help you master English faster.',
                    meta_keywords: 'English AIdol, AI English coach, personalized learning, IELTS preparation, English mastery',
                    content: `
            <p>Welcome to <strong>EnglishAIdol.com</strong>. If you are here, you probably know that learning a language is one of the most rewarding—and difficult—things you can do. Our mission is simple: to make world-class English coaching accessible to every student on the planet, regardless of their budget.</p>
            
            <h3>Why we started English AIdol</h3>
            <p>The "English gap" is real. Wealthy students can afford private tutors who charge $50/hour to give them feedback. Most students, however, are forced to use apps that just use flashcards or repetitive multiple-choice questions. We believe you deserve better.</p>
            
            <h3>What makes us different?</h3>
            <p>English AIdol was built at the intersection of <strong>Pedagogy</strong> and <strong>Technology</strong>. Our team includes TESOL-certified experts and former IELTS examiners who worked alongside AI engineers to build a brain that understands <em>not just what you say, but how you say it</em>.</p>
            
            <ul>
              <li><strong>No Judgement:</strong> Practice speaking at 2 AM in your pajamas. The AI never gets tired and never judges your mistakes.</li>
              <li><strong>Deep Personalization:</strong> No two students have the same path. English AIdol adapts to your level in real-time.</li>
              <li><strong>Exact Feedback:</strong> We don't just point out mistakes; we explain the cultural context and natural alternatives used by native speakers.</li>
            </ul>
            
            <p>We are just getting started. Thank you for being part of our community. Let\'s master English together.</p>
          `
                },
                {
                    language_code: 'vi',
                    title: 'Chào mừng bạn đến với EnglishAIdol.com: Tương lai của việc học tiếng Anh cá nhân hóa',
                    excerpt: 'Chúng tôi xây dựng English AIdol để lấp đầy khoảng trống giữa các gia sư riêng đắt đỏ và các ứng dụng tự học kém hiệu quả.',
                    meta_description: 'Khám phá English AIdol, nền tảng được thiết kế bởi các chuyên gia TESOL và cựu giám khảo IELTS để giúp bạn làm chủ tiếng Anh nhanh hơn.',
                    meta_keywords: 'English AIdol, AI English coach, học tiếng Anh cá nhân hóa, luyện thi IELTS',
                    content: `
            <p>Chào mừng bạn đến với <strong>EnglishAIdol.com</strong>. Nếu bạn ở đây, có lẽ bạn biết rằng học một ngôn ngữ mới là một trong những điều bổ ích nhất—nhưng cũng khó khăn nhất. Sứ mệnh của chúng tôi rất đơn giản: mang lại sự hỗ trợ tiếng Anh đẳng cấp thế giới cho mọi học viên trên toàn cầu, bất kể ngân sách của họ là bao nhiêu.</p>
            
            <h3>Tại sao chúng tôi bắt đầu English AIdol</h3>
            <p>"Khoảng cách tiếng Anh" là có thật. Những học sinh có điều kiện có thể thuê gia sư riêng với giá $50/giờ. Hầu hết các bạn khác phải sử dụng các ứng dụng flashcard đơn giản hoặc trắc nghiệm lặp đi lặp lại. Chúng tôi tin rằng bạn xứng đáng nhận được nhiều hơn thế.</p>
            
            <h3>Điều gì làm chúng tôi khác biệt?</h3>
            <p>English AIdol được xây dựng dựa trên sự giao thoa giữa <strong>Sư phạm</strong> và <strong>Công nghệ</strong>. Đội ngũ của chúng tôi bao gồm các chuyên gia có chứng chỉ TESOL và cựu giám khảo IELTS, làm việc cùng các kỹ sư AI để tạo ra một "bộ não" có thể hiểu <em>không chỉ những gì bạn nói, mà cả cách bạn nói</em>.</p>
            
            <ul>
              <li><strong>Không áp lực:</strong> Bạn có thể luyện nói lúc 2 giờ sáng trong bộ đồ ngủ. AI không bao giờ mệt mỏi và không bao giờ phán xét lỗi sai của bạn.</li>
              <li><strong>Cá nhân hóa sâu sắc:</strong> Không có hai học viên nào có lộ trình giống hệt nhau. English AIdol tự điều chỉnh theo trình độ của bạn trong thời gian thực.</li>
              <li><strong>Nhận xét chính xác:</strong> Chúng tôi không chỉ chỉ ra lỗi sai; chúng tôi giải thích bối cảnh văn hóa và các cách diễn đạt tự nhiên của người bản xứ.</li>
            </ul>
            
            <p>Đây chỉ là bước khởi đầu. Cảm ơn bạn đã là một phần của cộng đồng chúng tôi. Hãy cùng nhau chinh phục tiếng Anh!</p>
          `
                }
            ]
        }
    ];

    for (const blog of blogs) {
        await postBlog(blog);
    }
}

run().catch(console.error);
