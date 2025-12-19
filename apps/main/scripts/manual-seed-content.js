
import fs from 'fs';
import path from 'path';

const escape = (str) => str ? str.replace(/'/g, "''") : '';

// ------------------------------------------------------------------
// 1. DATA DEFINITIONS
// ------------------------------------------------------------------

const TOPICS = [
    {
        slug: 'sentence-structure-svo',
        en: {
            title: "Sentence Structure: SVO",
            theory_definition: "## The Golden Rule: SVO\n\nIn English, clarity comes from order. Unlike some languages where word order is flexible, English is strict.\n\nThe basic \"Skeleton\" of almost every sentence is:\n\n**Subject + Verb + Object**\n\n*   **Subject (S)**: The 'doer' (I, She, The cat).\n*   **Verb (V)**: The action (eat, likes, is).\n*   **Object (O)**: The receiver (pizza, him, the ball).\n\nIf you mess up this order, you sound confused or like Yoda!",
            theory_formation: "### Formula\n\n| Subject | Verb | Object (Optional) |\n| :--- | :--- | :--- |\n| I | love | you. |\n| John | eats | an apple. |\n| The bus | arrived. | (No object) |",
            theory_usage: "*   **Status:** The most important rule in English.\n*   **When:** All the time, for statements.\n*   **Why:** English uses order to show who does what. \"John loves Mary\" is totally different from \"Mary loves John\".",
            theory_common_mistakes: "*   ❌ **I you love.** (Putting object before verb)\n*   ❌ **Eats John an apple.** (Putting verb first - unless it's a question)\n*   ❌ **Yesterday came my friend.** (Subject must usually come before verb -> *My friend came yesterday*)",
            localized_tips: "Think of the Subject as the driver and the Verb as the car. The driver must get in before the car moves!"
        },
        vi: {
            title: "Cấu trúc câu: SVO",
            theory_definition: "## Quy tắc vàng: SVO\n\nTrong tiếng Anh, thứ tự từ rất quan trọng. \"Bộ xương\" cơ bản của hầu hết mọi câu là:\n\n**Subject (Chủ ngữ) + Verb (Động từ) + Object (Tân ngữ)**\n\n*   **Subject**: Người thực hiện hành động (I, She, The cat).\n*   **Verb**: Hành động (eat, likes, is).\n*   **Object**: Người/vật nhận hành động (pizza, him, the ball).",
            theory_formation: "### Công thức\n\n| Chủ ngữ | Động từ | Tân ngữ |\n| :--- | :--- | :--- |\n| I | love | you. |\n| John | eats | an apple. |\n| The bus | arrived. | (Không có tân ngữ) |",
            theory_usage: "*   **Khi nào:** Hầu như tất cả các câu khẳng định.\n*   **Tại sao:** \"John loves Mary\" (John yêu Mary) rất khác với \"Mary loves John\" (Mary yêu John).",
            theory_common_mistakes: "*   ❌ **I you love.** (Sai trật tự)\n*   ❌ **Yesterday came my friend.** (Chủ ngữ phải đứng trước động từ -> *My friend came yesterday*)",
            localized_tips: "SVO là vua! Luôn nhớ: Ai (S) làm gì (V) cho ai/cái gì (O)."
        }
    },
    {
        slug: 'adjectives-linking-verbs',
        en: {
            title: "Adjectives with Linking Verbs",
            theory_definition: "## Describing Things\n\nUsually, verbs are actions (run, jump). But \"Linking Verbs\" are different. They act like an equals sign (=). They connect the subject to an adjective describing it.\n\n**Subject + Linking Verb + Adjective**",
            theory_formation: "### Common Linking Verbs\n\n1.  **To Be**: am, is, are, was, were\n2.  **Sense Verbs**: look, feel, smell, taste, sound\n3.  **Change Verbs**: become, get",
            theory_usage: "Use these when you want to describe a **state** or **condition**, not an action.",
            theory_common_mistakes: "*   ❌ **She sings good.** (Use adverb 'well' for actions)\n*   ❌ **I feel happily.** (With linking verbs, use Adjectives, not Adverbs)\n*   ✅ **I feel happy.**\n*   ✅ **She looks tired.**",
            localized_tips: "If you can replace the verb with 'IS' and it makes sense, it's a linking verb! (You look tired -> You ARE tired)."
        },
        vi: {
            title: "Tính từ & Động từ nối",
            theory_definition: "## Mô tả sự vật\n\nĐộng từ thường chỉ hành động. Nhưng \"Linking Verbs\" (Động từ nối) hoạt động giống như dấu bằng (=). Chúng nối chủ ngữ với tính từ mô tả nó.\n\n**Chủ ngữ + Linking Verb + Tính từ**",
            theory_formation: "### Các từ phổ biến\n\n1.  **To Be**: am, is, are\n2.  **Giác quan**: look (trông), feel (cảm thấy), smell (ngửi), taste (nếm), sound (nghe)\n3.  **Thay đổi**: become (trở nên), get (trở nên)",
            theory_usage: "Dùng để mô tả trạng thái, cảm giác.",
            theory_common_mistakes: "*   ❌ **I feel happily.** (Sai! Sau linking verb phải là Tính từ)\n*   ✅ **I feel happy.**\n*   ✅ **It tastes good.** (Không phải 'well')",
            localized_tips: "Nếu bạn có thể thay thế động từ bằng 'thì/là' (IS), đó là linking verb."
        }
    },
    {
        slug: 'word-order-time-place',
        en: {
            title: "Word Order: Place & Time",
            theory_definition: "## Place Before Time\n\nWhen you need to say WHERE and WHEN something happened, English has a strict preference:\n\n**Place + Time**\n\nThink of specific details first (where), then general context (when).",
            theory_formation: "### Structure\n**Subject + Verb + [WHERE] + [WHEN]**\n\n*   I go **[to school] [every day]**.\n*   We arrived **[at the airport] [at 2 PM]**.",
            theory_usage: "Used in standard sentences involving both location and time.",
            theory_common_mistakes: "*   ❌ **I go every day to school.** (Don't put time in the middle)\n*   ❌ **I saw at the party him.** (Keep verb and object together!) -> **I saw him at the party.**",
            localized_tips: "Remember **P.T.** (Place -> Time). Just like a P.T. (Personal Trainer)!"
        },
        vi: {
            title: "Trật tự từ: Nơi chốn & Thời gian",
            theory_definition: "## Nơi chốn trước, Thời gian sau\n\nKhi bạn muốn nói Ở ĐÂU và KHI NÀO, tiếng Anh có quy tắc:\n\n**Nơi chốn (Place) + Thời gian (Time)**",
            theory_formation: "### Cấu trúc\n**Chủ ngữ + Động từ + [Ở Đâu] + [Khi Nào]**\n\n*   I go **[to school] [every day]**.\n*   We arrived **[at the airport] [at 2 PM]**.",
            theory_usage: "Dùng trong hầu hết các câu.",
            theory_common_mistakes: "*   ❌ **I go every day to school.** (Sai! Đừng chèn thời gian vào giữa)\n*   ✅ **I go to school every day.**",
            localized_tips: "Hãy nhớ quy tắc **P.T.** (Place trước, Time sau)."
        }
    },
    {
        slug: 'adjective-placement',
        en: {
            title: "Adjective Placement",
            theory_definition: "## Before the Noun\n\nIn English, adjectives (words that describe) are surprisingly stubborn. They almost ALWAYS go **before** the noun they describe.\n\n**Adjective + Noun**",
            theory_formation: "*   **Red** car (Not 'car red')\n*   **Big** house\n*   **Interesting** book\n\nHowever, if using 'to be', they go after:\n*   The car is **red**.",
            theory_usage: "Describing any object, person, or idea.",
            theory_common_mistakes: "*   ❌ **I have a car blue.** (Spanish/French style)\n*   ✅ **I have a blue car.**",
            localized_tips: "Adjectives are shy; they like to hide behind the noun (just kidding, they stand in front to protect it!)."
        },
        vi: {
            title: "Vị trí của Tính từ",
            theory_definition: "## Trước Danh từ\n\nTrong tiếng Việt, ta nói \"xe đỏ\". Trong tiếng Anh, ta nói \"đỏ xe\" (red car). Tính từ luôn đứng **TRƯỚC** danh từ.\n\n**Tính từ + Danh từ**",
            theory_formation: "*   **Red** car\n*   **Beautiful** girl\n*   **Hot** coffee",
            theory_usage: "Dùng để miêu tả.",
            theory_common_mistakes: "*   ❌ **I like coffee hot.**\n*   ✅ **I like hot coffee.**\n*   (Nhưng: The coffee is hot - OK)",
            localized_tips: "Tiếng Anh ngược với tiếng Việt: Tính từ đi trước!"
        }
    },
    {
        slug: 'plural-nouns-regular-irregular',
        en: {
            title: "Plural Nouns",
            theory_definition: "## More Than One\n\nWhen we talk about more than one thing, we usually add **-s**. But, English loves drama, so there are many exceptions!\n\n*   One cat -> Two cats\n*   One bus -> Two buses",
            theory_formation: "### The Rules\n\n1.  **Regular**: Add **-s** (dog -> dogs)\n2.  **Ending in -s, -sh, -ch, -x**: Add **-es** (box -> boxes, watch -> watches)\n3.  **Ending in -y**: Change to **-ies** (baby -> babies) *unless there is a vowel before y (boy -> boys)*\n4.  **Irregular**: Complete change (man -> men, child -> children, foot -> feet)",
            theory_usage: "Used whenever counting items > 1.",
            theory_common_mistakes: "*   ❌ **Childs.** -> ✅ **Children**\n*   ❌ **Peoples.** -> ✅ **People**\n*   ❌ **The police is...** -> ✅ **The police are...** (Police is always plural!)",
            localized_tips: "Memories the \"super irregularities\" first: Men, Women, Children, People, Teeth, Feet."
        },
        vi: {
            title: "Danh từ số nhiều",
            theory_definition: "## Hơn một sự vật\n\nTrong tiếng Việt, ta dùng \"những\", \"các\". Trong tiếng Anh, ta thêm **-s**. Nhưng có nhiều ngoại lệ!\n\n*   One cat -> Two cats\n*   One bus -> Two buses",
            theory_formation: "### Quy tắc\n\n1.  **Thường**: Thêm **-s** (dog -> dogs)\n2.  **Tận cùng -s, -sh, -ch, -x**: Thêm **-es** (box -> boxes)\n3.  **Tận cùng -y**: Đổi thành **-ies** (baby -> babies) *trừ khi trước y là nguyên âm (boy -> boys)*\n4.  **Bất quy tắc (Học thuộc)**: man -> men, child -> children, foot -> feet",
            theory_usage: "Dùng khi đếm số lượng > 1.",
            theory_common_mistakes: "*   ❌ **Childs.** -> ✅ **Children**\n*   ❌ **The police is...** -> ✅ **The police are...** (Cảnh sát luôn là số nhiều!)",
            localized_tips: "Học thuộc lòng những từ siêu bất quy tắc: Men, Women, Children, People, Teeth, Feet."
        }
    },
    {
        slug: 'possession-s-vs-of',
        en: {
            title: "Possession: 's vs OF",
            theory_definition: "## Whose is it?\n\nTo show ownership, we have two main ways: **'s** (Apostrophe S) and **OF**.\n\n*   **'s**: Used mostly for PEOPLE and ANIMALS.\n*   **OF**: Used mostly for THINGS and IDEAS.",
            theory_formation: "*   **John's** car (Person)\n*   The cat**'s** toy (Animal)\n*   The door **of** the house (Thing)\n*   The end **of** the movie (Abstract)",
            theory_usage: "Showing who owns what.",
            theory_common_mistakes: "*   ❌ **The car of John.** (Too French/Spanish!)\n*   ✅ **John's car.**\n*   ❌ **The house's door.** (A bit unnatural)\n*   ✅ **The door of the house.**",
            localized_tips: "Humans get the 'S'!"
        },
        vi: {
            title: "Sở hữu: 's hay OF",
            theory_definition: "## Của ai?\n\nĐể chỉ sự sở hữu, có 2 cách chính: **'s** và **OF**.\n\n*   **'s**: Dùng cho CON NGƯỜI và ĐỘNG VẬT.\n*   **OF**: Dùng cho ĐỒ VẬT và Ý TƯỞNG.",
            theory_formation: "*   **John's** car (Xe của John)\n*   The cat**'s** toy (Đồ chơi của mèo)\n*   The door **of** the house (Cửa của ngôi nhà)",
            theory_usage: "Chỉ sự sở hữu.",
            theory_common_mistakes: "*   ❌ **The car of John.** (Nghe rất tây nhưng... sai!)\n*   ✅ **John's car.**",
            localized_tips: "Người thì dùng 's. Vật thì dùng OF."
        }
    },
    {
        slug: 'yes-no-questions',
        en: {
            title: "Yes/No Questions",
            theory_definition: "## Asking for Confirmation\n\nThese are questions you can answer with just a nod (Yes) or a shake of the head (No). In English, you usually need a **Helper Verb** (Auxiliary) to start the question.\n\n**Helper + Subject + Verb?**",
            theory_formation: "### Standard Verbs (Do/Does)\n*   **Do** you typically like pizza?\n*   **Does** she work here?\n\n### To Be (Am/Is/Are)\n*   **Are** you happy?\n*   **Is** he strong?\n\n### Can/Should/Will\n*   **Can** you swim?",
            theory_usage: "Asking for confirmation.",
            theory_common_mistakes: "*   ❌ **You like pizza?** (Intonation question - informal, but grammatically weak)\n*   ✅ **Do you like pizza?**\n*   ❌ **Live you here?** (Old English style, incorrect now)\n*   ✅ **Do you live here?**",
            localized_tips: "Don't just raise your voice at the end! Use 'DO' or 'ARE' at the start."
        },
        vi: {
            title: "Câu hỏi Yes/No",
            theory_definition: "## Hỏi xác nhận\n\nĐây là những câu hỏi chỉ cần trả lời Có hoặc Không. Trong tiếng Anh, bạn CẦN trợ động từ đứng đầu câu.\n\n**Trợ động từ + Chủ ngữ + Động từ?**",
            theory_formation: "### Động từ thường (mượn Do/Does)\n*   **Do** you like pizza?\n*   **Does** she work here?\n\n### Động từ To Be (Đảo ngữ)\n*   **Are** you happy?\n*   **Is** he strong?",
            theory_usage: "Xác nhận thông tin.",
            theory_common_mistakes: "*   ❌ **You like pizza?** (Câu hỏi ngữ điệu - chỉ dùng văn nói suồng sã)\n*   ✅ **Do you like pizza?**\n*   ❌ **Live you here?** (Sai ngữ pháp nghiêm trọng)\n*   ✅ **Do you live here?**",
            localized_tips: "Đừng chỉ lên giọng cuối câu như tiếng Việt. Hãy 'quăng' Do/Does/Am/Is/Are ra đầu câu!"
        }
    },
    {
        slug: 'wh-questions',
        en: {
            title: "Wh- Questions",
            theory_definition: "## Information Questions\n\nWhen 'Yes' or 'No' isn't enough, we use Wh- words. The structure is almost the same as Yes/No questions, just put the **Wh- Word** at the very front.\n\n**Wh- + Helper + Subject + Verb?**",
            theory_formation: "### The Wh- Words\n*   **Who** (Person)\n*   **What** (Thing)\n*   **Where** (Place)\n*   **When** (Time)\n*   **Why** (Reason)\n*   **How** (Method)\n\n### Examples\n*   **Where** do you live?\n*   **What** are you doing?\n*   **Why** is he crying?",
            theory_usage: "Asking for specific details.",
            theory_common_mistakes: "*   ❌ **Where you go?** (Missing helper)\n*   ✅ **Where DO you go?**\n*   ❌ **What means this word?**\n*   ✅ **What DOES this word mean?**",
            localized_tips: "Wh- word first, then the 'muscle' word (helper), then the person, then the action."
        },
        vi: {
            title: "Câu hỏi Wh-",
            theory_definition: "## Hỏi thông tin\n\nKhi 'Có' hoặc 'Không' là chưa đủ. Cấu trúc giống hệt câu hỏi Yes/No, chỉ cần đặt từ để hỏi lên đầu.\n\n**Từ để hỏi + Trợ động từ + Chủ ngữ + Động từ?**",
            theory_formation: "### Các từ để hỏi\n*   **Who** (Ai)\n*   **What** (Cái gì)\n*   **Where** (Ở đâu)\n*   **When** (Khi nào)\n*   **Why** (Tại sao)\n*   **How** (Như thế nào)\n\n### Ví dụ\n*   **Where** do you live?\n*   **What** are you doing?",
            theory_usage: "Hỏi chi tiết.",
            theory_common_mistakes: "*   ❌ **Where you go?** (Thiếu trợ động từ)\n*   ✅ **Where DO you go?**\n*   ❌ **What means this?**\n*   ✅ **What DOES this mean?**",
            localized_tips: "Từ để hỏi -> Trợ động từ -> Chủ ngữ -> Động từ."
        }
    },
    {
        slug: 'conjunctions-intro',
        en: {
            title: "Conjunctions (And, But, So, Because)",
            theory_definition: "## Glue Words\n\nConjunctions glue two ideas together. Without them, we speak in short, robot sentences.\n\n*   **And**: Addition (+)\n*   **But**: Contrast (-)\n*   **So**: Result (->)\n*   **Because**: Reason (<-)",
            theory_formation: "*   I like tea **and** coffee.\n*   I like tea, **but** I hate coffee.\n*   I was tired, **so** I slept.\n*   I slept **because** I was tired.",
            theory_usage: "Connecting simple sentences to make complex ones.",
            theory_common_mistakes: "*   Starting every sentence with 'And' or 'But' in formal writing (Avoid it).\n*   Confusing 'So' (Result) vs 'Because' (Reason).",
            localized_tips: "**So** looks forward (to the result). **Because** looks backward (to the cause)."
        },
        vi: {
            title: "Liên từ (And, But, So, Because)",
            theory_definition: "## Từ nối\n\nLiên từ giúp nối các ý lại với nhau. Không có nó, bạn nói như robot.\n\n*   **And**: Và (+)\n*   **But**: Nhưng (-)\n*   **So**: Nên/Vì vậy (->)\n*   **Because**: Bởi vì (<-)",
            theory_formation: "*   I like tea **and** coffee.\n*   I like tea, **but** I hate coffee.\n*   I was tired, **so** I slept. (Mệt -> Ngủ)\n*   I slept **because** I was tired. (Ngủ <- Vì mệt)",
            theory_usage: "Nối câu đơn thành câu ghép.",
            theory_common_mistakes: "*   Nhầm lẫn 'So' và 'Because'. 'So' chỉ kết quả, 'Because' chỉ lý do.",
            localized_tips: "**So** hướng về tương lai (kết quả). **Because** nhìn về quá khứ (lý do)."
        }
    },
    {
        slug: 'feelings-to-be-vs-to-have',
        en: {
            title: "Feelings: To Be vs To Have",
            theory_definition: "## I am Hungry (Not I Have Hunger)\n\nIn many languages (Spanish, French, etc.), you \"have\" hunger or \"have\" cold. In English, you **ARE** these things because they are adjectives describing your state.\n\n**Subject + To Be + Adjective**",
            theory_formation: "*   ✅ **I am** hungry.\n*   ✅ **I am** cold.\n*   ✅ **I am** afraid.\n*   ✅ **I am** 20 years old. (Important!)",
            theory_usage: "Describing physical or emotional states.",
            theory_common_mistakes: "*   ❌ **I have hunger.**\n*   ❌ **I have cold.**\n*   ❌ **I have 20 years.** (Very common mistake!) -> ✅ **I am 20.**",
            localized_tips: "'Hungry', 'Cold', 'Afraid' are Adjectives in English, not Nouns. So use 'TO BE'."
        },
        vi: {
            title: "Cảm xúc: To Be vs To Have",
            theory_definition: "## I am Hungry (Không phải I Have Hunger)\n\nTrong nhiều ngôn ngữ, người ta nói \"tôi có đói\". Trong tiếng Anh, đói/lạnh/sợ là TÍNH TỪ. Vì vậy bạn phải dùng động từ **TO BE**.\n\n**Subject + To Be + Adjective**",
            theory_formation: "*   ✅ **I am** hungry. (Tôi thì đói)\n*   ✅ **I am** cold. (Tôi thì lạnh)\n*   ✅ **I am** 20 years old. (Tôi thì 20 tuổi)",
            theory_usage: "Mô tả trạng thái cơ thể/tâm lý.",
            theory_common_mistakes: "*   ❌ **I have hunger.**\n*   ❌ **I have 20 years.** (Sai lầm kinh điển!) -> ✅ **I am 20.**",
            localized_tips: "Trong tiếng Anh, bạn 'LÀ' tuổi của bạn, bạn không 'CÓ' nó."
        }
    },
    {
        slug: 'adjective-order',
        en: {
            title: "Adjective Order",
            theory_definition: "## The Secret Code\n\nDid you know English speakers instinctively order adjectives? A \"green big dragon\" sounds wrong. It must be a \"big green dragon\".\n\n**O.S.A.S.C.O.M.P.**\nOpinion -> Size -> Age -> Shape -> Color -> Origin -> Material -> Purpose",
            theory_formation: "1.  **Opinion**: Good, ugly\n2.  **Size**: Big, small\n3.  **Age**: Old, new\n... \n5.  **Color**: Red, blue\n\n*   ✅ A **lovely little old** house.\n*   ❌ An **old lovely little** house.",
            theory_usage: "When using 2+ adjectives.",
            theory_common_mistakes: "*   Putting color before size. (Red big ball ❌ -> Big red ball ✅)",
            localized_tips: "Size usually comes first. Color usually comes close to the noun. \"Big Red Bus\"."
        },
        vi: {
            title: "Trật tự tính từ",
            theory_definition: "## Mật mã ngầm\n\nNgười bản xứ luôn sắp xếp tính từ theo một trật tự nhất định mà đôi khi họ không nhận ra. \"Green big dragon\" nghe rất sai. Phải là \"Big green dragon\".\n\n**O.S.A.S.C.O.M.P.**\nQuan điểm -> Kích thước -> Tuổi -> Hình dáng -> Màu -> Nguồn gốc -> Chất liệu",
            theory_formation: "1.  **Quan điểm**: Good, beautiful\n2.  **Kích thước**: Big, small\n3.  **Tuổi**: Old, new\n... \n5.  **Màu**: Red, blue\n\n*   ✅ A **lovely little old** house.",
            theory_usage: "Khi dùng 2 tính từ trở lên.",
            theory_common_mistakes: "*   Đặt màu trước kích thước. (Red big ball ❌ -> Big red ball ✅)",
            localized_tips: "Kích thước thường đi trước. Màu sắc thường đứng sát danh từ. \"Big Red Bus\"."
        }
    },
    {
        slug: 'this-that-these-those',
        en: {
            title: "This, That, These, Those",
            theory_definition: "## Pointing Fingers\n\nThese words act like a finger pointing at something. We choose the word based on **Distance** (Near/Far) and **Number** (One/Many).",
            theory_formation: "| | Near (Here) | Far (There) |\n| :--- | :--- | :--- |\n| **Singular (1)** | **This** is a cat. | **That** is a star. |\n| **Plural (>1)** | **These** are cats. | **Those** are stars. |",
            theory_usage: "Identifying specific objects relative to you.",
            theory_common_mistakes: "*   ❌ **These is my friend.** (These = Plural -> These **ARE**)\n*   ❌ **I like that shoes.** (Shoes = Plural -> **Those** shoes)",
            localized_tips: "**Th**is/**Th**ese have a 'h' sound like **H**ere. **Th**at/**Th**ose point away."
        },
        vi: {
            title: "This, That, These, Those",
            theory_definition: "## Chỉ trỏ\n\nChúng ta chọn từ dựa trên **Khoảng cách** (Gần/Xa) và **Số lượng** (Ít/Nhiều).",
            theory_formation: "| | Gần (Đây) | Xa (Đó/Kia) |\n| :--- | :--- | :--- |\n| **Số ít (1)** | **This** (Cái này) | **That** (Cái kia) |\n| **Số nhiều (>1)** | **These** (Những cái này) | **Those** (Những cái kia) |",
            theory_usage: "Chỉ định danh sự vật.",
            theory_common_mistakes: "*   ❌ **These is...** (These đi với Are)\n*   ❌ **I like that shoes.** (Giày là số nhiều -> **Those** shoes)",
            localized_tips: "This/That -> Số ít. These/Those -> Số nhiều."
        }
    },
    {
        slug: 'he-she-it-the-s-rule',
        en: {
            title: "He/She/It (The S Rule)",
            theory_definition: "## The Lonely Third Person\n\nIn Present Simple, **I, You, We, They** change nothing. But **He, She, It** gets lonely, so they bring a snake (**S**)!\n\n**He/She/It + Verb-S**",
            theory_formation: "*   I work -> He work**s**\n*   You play -> She play**s**\n*   It rain**s**\n\n**Special Cases:**\n*   Have -> **Has**\n*   Go -> **Goes**\n*   Do -> **Does**",
            theory_usage: "Present Simple tense only.",
            theory_common_mistakes: "*   ❌ He **have** a car. -> ✅ He **has**.\n*   ❌ She **go** to school. -> ✅ She **goes**.\n*   ❌ Does he **works**? (After 'Does', eat the 's' -> Does he **work**?)",
            localized_tips: "He, She, It loves the SSSS sound."
        },
        vi: {
            title: "Quy tắc thêm S (He/She/It)",
            theory_definition: "## Ngôi thứ 3 cô đơn\n\nỞ thì hiện tại đơn, **I, You, We, They** giữ nguyên động từ. Nhưng **He, She, It** (Ngôi thứ 3 số ít) thì cần thêm **S**!\n\n**He/She/It + Verb-S**",
            theory_formation: "*   I work -> He work**s**\n*   You play -> She play**s**\n*   Nó mưa -> It rain**s**\n\n**Đặc biệt:**\n*   Have (Có) -> **Has**\n*   Go (Đi) -> **Goes**\n*   Do (Làm) -> **Does**",
            theory_usage: "Thì hiện tại đơn.",
            theory_common_mistakes: "*   ❌ He **have** a car. -> ✅ He **has**.\n*   ❌ Does he **works**? (Sau Does -> động từ nguyên mẫu -> Does he **work**?)",
            localized_tips: "He/She/It yêu tiếng xì (S)."
        }
    },
    {
        slug: 'there-is-vs-it-is',
        en: {
            title: "There is vs It is",
            theory_definition: "## Existence vs Definition\n\n*   **There is**: Introduce something new (It exists).\n*   **It is**: Talk about something specific (Identify it).\n\nThink of 'There is' as presenting a new character on stage.",
            theory_formation: "*   **There is** a dog in the garden. (Fact: A dog exists there)\n*   Look at the dog. **It is** big. (Description: The dog is big)",
            theory_usage: "There is = Introduction. It is = Identification.",
            theory_common_mistakes: "*   ❌ **Is a dog in the garden.** (Missing subject)\n*   ❌ **It is a dog in the garden.** (Wrong, us There is for location)\n*   ❌ **Have a dog in the garden.** (No! Don't translate directly from 'Il y a' or 'Hay' or 'Có')",
            localized_tips: "Don't use 'HAVE' to say something exists. Use 'THERE IS'."
        },
        vi: {
            title: "There is vs It is",
            theory_definition: "## Tồn tại hay Nhận diện\n\n*   **There is**: Giới thiệu cái gì đó mới (Có một...)\n*   **It is**: Nói về cái cụ thể (Nó là...)\n\nĐừng dịch \"Ở đây có\" thành \"Here have\". Hãy dùng \"There is\"!",
            theory_formation: "*   **There is** a dog in the garden. (Có một con chó...)\n*   Look at the dog. **It is** big. (Nó thì to)",
            theory_usage: "There is = Giới thiệu. It is = Nhận diện.",
            theory_common_mistakes: "*   ❌ **Have a dog in the garden.** (Sai lầm lớn nhất của người Việt!)\n*   ✅ **There is a dog...**",
            localized_tips: "Cấm dùng 'HAVE' để nói 'Có cái gì ở đâu'. Phải dùng 'THERE IS'."
        }
    },
    {
        slug: 'frequency-adverbs',
        en: {
            title: "Frequency Adverbs",
            theory_definition: "## How Often?\n\nWords like **Always, Usually, Never** tell us how often we do things. But where do we put them? It depends on the verb!",
            theory_formation: "1.  **Before Action Verbs**:\n    *   I **always** eat breakfast.\n    *   She **never** smoke**s**.\n2.  **After 'To Be'** (The King Verb):\n    *   I am **always** happy.\n    *   He is **never** late.",
            theory_usage: "Describing routines.",
            theory_common_mistakes: "*   ❌ I eat **always** breakfast. (Adverb too late)\n*   ❌ I **always** am happy. (Adverb too early)",
            localized_tips: "To Be is the King, it goes FIRST. Other verbs are servants, they go AFTER the adverb."
        },
        vi: {
            title: "Trạng từ chỉ tần suất",
            theory_definition: "## Bao lâu một lần?\n\nNhững từ như **Always (Luôn luôn), Usually (Thường), Never (Không bao giờ)**. Vị trí của chúng phụ thuộc vào động từ.",
            theory_formation: "1.  **Trước Động từ thường**:\n    *   I **always** eat breakfast.\n2.  **Sau động từ To Be** (Động từ Vua):\n    *   I am **always** happy.\n    *   He is **never** late.",
            theory_usage: "Mô tả thói quen.",
            theory_common_mistakes: "*   ❌ I eat **always** breakfast.\n*   ❌ I **always** am happy.",
            localized_tips: "To Be là Vua -> Đi trước. Động từ thường là lính -> Đi sau trạng từ."
        }
    },
    {
        slug: 'object-pronouns-placement',
        en: {
            title: "Object Placement",
            theory_definition: "## The Magnetic Bond\n\nIn English, the **Verb** and the **Object** are like magnets stuck together. You CANNOT separate them with other words (like time or adverbs).",
            theory_formation: "✅ **I [like] [pizza] very much.**\n❌ I [like] very much [pizza].\n\n✅ **He [speaks] [English] well.**\n❌ He [speaks] well [English].",
            theory_usage: "Standard sentence structure.",
            theory_common_mistakes: "*   Separating verb and object is the #1 sign of a non-native speaker.",
            localized_tips: "Glue the Object to the Verb. Put everything else (time, place, degree) at the END."
        },
        vi: {
            title: "Vị trí tân ngữ",
            theory_definition: "## Liên kết nam châm\n\nTrong tiếng Anh, **Động từ** và **Tân ngữ** dính chặt với nhau như nam châm. Bạn KHÔNG ĐƯỢC tách chúng ra bằng trạng từ hay thời gian.",
            theory_formation: "✅ **I [like] [pizza] very much.** (Tôi rất thích pizza)\n❌ I [like] very much [pizza]. (Dịch từng chữ từ tiếng Việt -> Sai!)\n\n✅ **He [speaks] [English] well.**\n❌ He [speaks] well [English].",
            theory_usage: "Cấu trúc câu chuẩn.",
            theory_common_mistakes: "*   Chèn trạng từ vào giữa động từ và tân ngữ.",
            localized_tips: "Động từ + Tân ngữ là cặp bài trùng. Đừng chia cắt chúng. Đẩy mọi thứ khác (rất nhiều, hôm qua...) ra cuối câu."
        }
    }
];

// ------------------------------------------------------------------
// 2. GENERATE SQL
// ------------------------------------------------------------------

function generateSQL() {
    let sql = `
-- Updating Content for Foundation Topics
-- Generated by manual-seed-content.js

DO $$
DECLARE
    v_lesson_id uuid;
BEGIN
`;

    for (const topic of TOPICS) {
        // 1. Update English content
        sql += `
    -- Updating ${topic.slug} (English)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = '${escape(topic.en.theory_definition)}',
        theory_formation = '${escape(topic.en.theory_formation)}',
        theory_usage = '${escape(topic.en.theory_usage)}',
        theory_common_mistakes = '${escape(topic.en.theory_common_mistakes)}',
        localized_tips = '${escape(topic.en.localized_tips)}'
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = '${topic.slug}')
    );

    -- Ensure Topic Translations are correct
    UPDATE grammar_topic_translations
    SET title = '${escape(topic.en.title)}'
    WHERE language_code = 'en'
    AND topic_id = (SELECT id FROM grammar_topics WHERE slug = '${topic.slug}');
`;

        // 2. Update Vietnamese content (Insert if missing, or update)
        // We first need to make sure the row exists.
        sql += `
    -- Updating ${topic.slug} (Vietnamese)
    -- Get Lesson ID
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = '${topic.slug}')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            '${escape(topic.vi.title)}',
            '${escape(topic.vi.theory_definition)}',
            '${escape(topic.vi.theory_formation)}',
            '${escape(topic.vi.theory_usage)}',
            '${escape(topic.vi.theory_common_mistakes)}',
            '${escape(topic.vi.localized_tips)}',
            '[]'::jsonb,
            '[]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips;
            
        -- Topic Translation
        INSERT INTO grammar_topic_translations (topic_id, language_code, title, description)
        VALUES (
            (SELECT id FROM grammar_topics WHERE slug = '${topic.slug}'),
            'vi',
            '${escape(topic.vi.title)}',
            'Đã được dịch sang tiếng Việt.'
        )
        ON CONFLICT (topic_id, language_code) DO UPDATE SET
            title = EXCLUDED.title;
    END IF;
`;
    }

    sql += `
END $$;
`;

    const outputPath = path.join(process.cwd(), 'apps/main/supabase/migrations/20251216_update_foundations_content.sql');
    fs.writeFileSync(outputPath, sql);
    console.log(`✅ Generated SQL at ${outputPath}`);
}

generateSQL();
