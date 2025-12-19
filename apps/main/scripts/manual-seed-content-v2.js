
import fs from 'fs';
import path from 'path';

const escape = (str) => str ? str.replace(/'/g, "''") : '';
const json = (obj) => obj ? JSON.stringify(obj).replace(/'/g, "''") : '[]';

const TOPICS = [
    {
        slug: 'sentence-structure-svo',
        en: {
            title: "Sentence Structure: SVO",
            theory_definition: "## The Golden Rule: SVO\n\nIn English, clarity comes from order. Unlike some languages where word order is flexible, English is strict.\n\nThe basic \"Skeleton\" of almost every sentence is:\n\n**Subject + Verb + Object**",
            theory_formation: "### Formula\n\nSubject + Verb + Object",
            theory_usage: "Used for almost all statements in English.",
            theory_common_mistakes: "*   ❌ **I you love.** (Object before verb)\n*   ❌ **Yesterday came my friend.** (Verb before subject)",
            localized_tips: "Subject is the driver. Verb is the car. Driver first!",
            rules: [
                { title: "Basic Order", formula: "S + V + O", example: "I (S) love (V) you (O)." },
                { title: "With Time & Place", formula: "S + V + O + Place + Time", example: "I ate pizza at home yesterday." }
            ],
            examples: [
                { sentence: "John eats an apple.", explanation: "Standard SVO." },
                { sentence: "She plays soccer.", explanation: "Standard SVO." },
                { sentence: "I like him.", explanation: "Subject (I), Verb (like), Object (him, not 'he')." }
            ]
        },
        vi: {
            title: "Cấu trúc câu: SVO",
            theory_definition: "## Quy tắc vàng: SVO\n\nTiếng Anh rất nghiêm ngặt về trật tự từ. Cấu trúc cơ bản là:\n\n**Chủ ngữ + Động từ + Tân ngữ**",
            theory_formation: "### Công thức\n\nS + V + O",
            theory_usage: "Dùng cho hầu hết các câu.",
            theory_common_mistakes: "*   ❌ **I you love.** (Sai trật tự)\n*   ❌ **Yesterday came my friend.** (Chủ ngữ phải đứng trước động từ)",
            localized_tips: "SVO là vua. Đừng đảo lộn nó.",
            rules: [
                { title: "Cấu trúc cơ bản", formula: "S + V + O", example: "I (S) love (V) you (O)." },
                { title: "Với Nơi chốn & Thời gian", formula: "S + V + O + Nơi chốn + Thời gian", example: "I ate pizza at home yesterday." }
            ],
            examples: [
                { sentence: "John eats an apple.", translation: "John ăn một quả táo.", explanation: "Cấu trúc SVO chuẩn." },
                { sentence: "She plays soccer.", translation: "Cô ấy chơi bóng đá.", explanation: "SVO." },
                { sentence: "I like him.", translation: "Tôi thích anh ấy.", explanation: "Object là him (không phải he)." }
            ]
        }
    },
    {
        slug: 'adjectives-linking-verbs',
        en: {
            title: "Adjectives with Linking Verbs",
            theory_definition: "## Describing Things\n\nLinking verbs act like an equals sign (=). They connect the subject to an adjective describing it.\n\n**Subject + Linking Verb + Adjective**",
            theory_formation: "### Common Linking Verbs\n*   To Be (am, is, are)\n*   Sense Verbs (look, feel, smell, taste, sound)\n*   Change Verbs (become, get)",
            theory_usage: "To describe a state or condition.",
            theory_common_mistakes: "*   ❌ **She sings good.** (Use adverb for actions)\n*   ❌ **I feel happily.** (Use adjective for linking verbs)",
            localized_tips: "If you can replace the verb with 'IS', it's a linking verb.",
            rules: [
                { title: "The Rule", formula: "Subject + Linking Verb + Adjective", example: "You look tired." },
                { title: "Difference from Action Verbs", formula: "Subject + Action Verb + Adverb", example: "You run quickly." }
            ],
            examples: [
                { sentence: "She is happy.", explanation: "To be + Adjective." },
                { sentence: "He looks tired.", explanation: "Look is a linking verb." },
                { sentence: "This soup tastes good.", explanation: "Taste connects subject to adjective." },
                { sentence: "I feel good.", explanation: "Describing my state." }
            ]
        },
        vi: {
            title: "Tính từ & Động từ nối",
            theory_definition: "## Mô tả sự vật\n\nĐộng từ nối (Linking Verbs) giống như dấu bằng (=). Chúng nối chủ ngữ với tính từ.\n\n**Chủ ngữ + Linking Verb + Tính từ**",
            theory_formation: "### Các từ phổ biến\n*   To Be (am, is, are)\n*   Giác quan (look, feel, smell, taste, sound)\n*   Thay đổi (become, get)",
            theory_usage: "Mô tả trạng thái.",
            theory_common_mistakes: "*   ❌ **I feel happily.** (Phải dùng tính từ)\n*   ✅ **I feel happy.**",
            localized_tips: "Nếu thay được bằng 'thì/là', đó là linking verb.",
            rules: [
                { title: "Quy tắc", formula: "Chủ ngữ + Linking Verb + Tính từ", example: "You look tired." },
                { title: "Khác với Động từ thường", formula: "Chủ ngữ + Động từ thường + Trạng từ", example: "You run quickly." }
            ],
            examples: [
                { sentence: "She is happy.", translation: "Cô ấy hạnh phúc.", explanation: "To be + Tính từ." },
                { sentence: "He looks tired.", translation: "Anh ấy trông mệt mỏi.", explanation: "Look là động từ nối." },
                { sentence: "This soup tastes good.", translation: "Món súp này vị ngon.", explanation: "Taste + Tính từ." }
            ]
        }
    },
    {
        slug: 'word-order-time-place',
        en: {
            title: "Word Order: Place & Time",
            theory_definition: "## Place First, Time Last\n\nEnglish puts **Place** before **Time**.",
            theory_formation: "**Subject + Verb + Place + Time**",
            theory_usage: "Standard sentences.",
            theory_common_mistakes: "*   ❌ **I go every day to school.**\n*   ✅ **I go to school every day.**",
            localized_tips: "P.T. (Place -> Time).",
            rules: [
                { title: "Standard Order", formula: "Place + Time", example: "at home (Place) + now (Time)" }
            ],
            examples: [
                { sentence: "I study at school every day.", explanation: "at school (Place) -> every day (Time)" },
                { sentence: "We met in London in 2010.", explanation: "in London (Place) -> in 2010 (Time)" }
            ]
        },
        vi: {
            title: "Trật tự từ: Nơi chốn & Thời gian",
            theory_definition: "## Nơi chốn trước, Thời gian sau",
            theory_formation: "**Chủ ngữ + Động từ + Nơi chốn + Thời gian**",
            theory_usage: "Câu chuẩn.",
            theory_common_mistakes: "*   ❌ **I go every day to school.**\n*   ✅ **I go to school every day.**",
            localized_tips: "P.T. (Place trước, Time sau).",
            rules: [
                { title: "Quy tắc chuẩn", formula: "Nơi chốn + Thời gian", example: "at home (Nơi chốn) + now (Thời gian)" }
            ],
            examples: [
                { sentence: "I study at school every day.", translation: "Tôi học ở trường mỗi ngày.", explanation: "at school (Nơi chốn) -> every day (Thời gian)" },
                { sentence: "We met in London in 2010.", translation: "Chúng tôi gặp nhau ở London năm 2010.", explanation: "in London (Nơi chốn) -> in 2010 (Thời gian)" }
            ]
        }
    },
    {
        slug: 'adjective-placement',
        en: {
            title: "Adjective Placement",
            theory_definition: "## Before Noun\n\nAdjectives go **before** the noun.",
            theory_formation: "**Adjective + Noun**",
            theory_usage: "Describing things.",
            theory_common_mistakes: "*   ❌ **Car red.**\n*   ✅ **Red car.**",
            localized_tips: "Adjective stands in front to protect the noun.",
            rules: [
                { title: "Attribute Position", formula: "Adjective + Noun", example: "A black cat" },
                { title: "Predicative Position", formula: "To Be + Adjective", example: "The cat is black" }
            ],
            examples: [
                { sentence: "I have a new car.", explanation: "New (adj) + Car (noun)" },
                { sentence: "It is a beautiful day.", explanation: "Beautiful (adj) + Day (noun)" }
            ]
        },
        vi: {
            title: "Vị trí của Tính từ",
            theory_definition: "## Trước Danh từ\n\nTính từ đứng **trước** danh từ.",
            theory_formation: "**Tính từ + Danh từ**",
            theory_usage: "Mô tả.",
            theory_common_mistakes: "*   ❌ **Car red.**\n*   ✅ **Red car.**",
            localized_tips: "Ngược với tiếng Việt.",
            rules: [
                { title: "Vị trí thuộc ngữ", formula: "Tính từ + Danh từ", example: "A black cat" },
                { title: "Vị trí vị ngữ", formula: "To Be + Tính từ", example: "The cat is black" }
            ],
            examples: [
                { sentence: "I have a new car.", translation: "Tôi có xe mới.", explanation: "New (adj) + Car (noun)" },
                { sentence: "It is a beautiful day.", translation: "Hôm nay đẹp trời.", explanation: "Beautiful (adj) + Day (noun)" }
            ]
        }
    },
    // Adding the rest of the 16 topics with RULES and EXAMPLES
    {
        slug: 'plural-nouns-regular-irregular',
        en: {
            title: "Plural Nouns",
            theory_definition: "## Making Plurals",
            theory_formation: "Usually add **-s**.",
            theory_usage: "Counting > 1.",
            theory_common_mistakes: "Childs, Mans, Peoples.",
            localized_tips: "Watch out for irregulars.",
            rules: [
                { title: "Regular", formula: "Add -s", example: "Cat -> Cats" },
                { title: "Ends in -s, -x, -ch, -sh", formula: "Add -es", example: "Box -> Boxes" },
                { title: "Ends in Consonant + y", formula: "Change y to -ies", example: "Baby -> Babies" },
                { title: "Irregular", formula: "Memorize", example: "Man -> Men" }
            ],
            examples: [
                { sentence: "I have two dogs.", explanation: "Regular plural." },
                { sentence: "The children are playing.", explanation: "Irregular plural (Child -> Children)." },
                { sentence: "I brush my teeth.", explanation: "Irregular (Tooth -> Teeth)." }
            ]
        },
        vi: {
            title: "Danh từ số nhiều",
            theory_definition: "## Số nhiều",
            theory_formation: "Thường thêm **-s**.",
            theory_usage: "Đếm > 1.",
            theory_common_mistakes: "Childs, Mans, Peoples.",
            localized_tips: "Cẩn thận từ bất quy tắc.",
            rules: [
                { title: "Thường", formula: "Thêm -s", example: "Cat -> Cats" },
                { title: "Tận cùng -s, -x, -ch, -sh", formula: "Thêm -es", example: "Box -> Boxes" },
                { title: "Tận cùng Phụ âm + y", formula: "Đổi y thành -ies", example: "Baby -> Babies" },
                { title: "Bất quy tắc", formula: "Học thuộc", example: "Man -> Men" }
            ],
            examples: [
                { sentence: "I have two dogs.", translation: "Tôi có 2 con chó.", explanation: "Số nhiều thường." },
                { sentence: "The children are playing.", translation: "Lũ trẻ đang chơi.", explanation: "Bất quy tắc (Child -> Children)." }
            ]
        }
    },
    {
        slug: 'possession-s-vs-of',
        en: {
            title: "Possession: 's vs OF",
            theory_definition: "Ways to show ownership.",
            theory_formation: "**'s** for people/animals. **OF** for things.",
            theory_usage: "Possession.",
            theory_common_mistakes: "The car of John.",
            localized_tips: "People get the S.",
            rules: [
                { title: "People & Animals", formula: "Owner + 's + Item", example: "John's car" },
                { title: "Things & Ideas", formula: "Item + of + Owner", example: "The door of the room" }
            ],
            examples: [
                { sentence: "This is Tom's book.", explanation: "Tom is a person -> 's" },
                { sentence: "The leg of the table is broken.", explanation: "Table is a thing -> of" }
            ]
        },
        vi: {
            title: "Sở hữu: 's hay OF",
            theory_definition: "Cách chỉ sở hữu.",
            theory_formation: "**'s** cho người/vật. **OF** cho đồ vật.",
            theory_usage: "Sở hữu.",
            theory_common_mistakes: "The car of John.",
            localized_tips: "Người thì thêm S.",
            rules: [
                { title: "Người & Động vật", formula: "Chủ + 's + Vật", example: "John's car" },
                { title: "Đồ vật & Ý tưởng", formula: "Vật + of + Chủ", example: "The door of the room" }
            ],
            examples: [
                { sentence: "This is Tom's book.", translation: "Đây là sách của Tom.", explanation: "Tom là người -> 's" },
                { sentence: "The leg of the table is broken.", translation: "Chân bàn bị gãy.", explanation: "Bàn là vật -> of" }
            ]
        }
    },
    {
        slug: 'yes-no-questions',
        en: {
            title: "Yes/No Questions",
            theory_definition: "Questions with Yes/No answers.",
            theory_formation: "Helper + Subject + Verb?",
            theory_usage: "Checking facts.",
            theory_common_mistakes: "You like pizza?",
            localized_tips: "Helper verb goes first.",
            rules: [
                { title: "With Do/Does", formula: "Do/Does + Subject + Verb?", example: "Do you like it?" },
                { title: "With To Be", formula: "Am/Is/Are + Subject + Adjective/Noun?", example: "Are you ready?" }
            ],
            examples: [
                { sentence: "Do you play tennis?", explanation: "Helper 'Do' first." },
                { sentence: "Is she your sister?", explanation: "To Be 'Is' first." }
            ]
        },
        vi: {
            title: "Câu hỏi Yes/No",
            theory_definition: "Câu hỏi có/không.",
            theory_formation: "Trợ động từ + Chủ từ + Động từ?",
            theory_usage: "Kiểm tra thông tin.",
            theory_common_mistakes: "You like pizza?",
            localized_tips: "Trợ động từ lên đầu.",
            rules: [
                { title: "Với Do/Does", formula: "Do/Does + S + V?", example: "Do you like it?" },
                { title: "Với To Be", formula: "Am/Is/Are + S + Adj/Noun?", example: "Are you ready?" }
            ],
            examples: [
                { sentence: "Do you play tennis?", translation: "Bạn chơi tennis không?", explanation: "Đảo Do lên đầu." },
                { sentence: "Is she your sister?", translation: "Cô ấy là chị bạn à?", explanation: "Đảo Is lên đầu." }
            ]

        }
    },
    {
        slug: 'wh-questions',
        en: {
            title: "Wh- Questions",
            theory_definition: "Asking for information.",
            theory_formation: "Wh-Word + Helper + Subject + Verb?",
            theory_usage: "Details.",
            theory_common_mistakes: "Where you go?",
            localized_tips: "Wh-word -> Helper -> Subject.",
            rules: [
                { title: "Structure", formula: "Wh- + Helper + S + V?", example: "Where do you live?" },
                { title: "Exception (Who as Subject)", formula: "Who + Verb?", example: "Who called you?" }
            ],
            examples: [
                { sentence: "What do you want?", explanation: "Wh- + Do + S + V" },
                { sentence: "Where is he?", explanation: "Wh- + Is + S" }
            ]
        },
        vi: {
            title: "Câu hỏi Wh-",
            theory_definition: "Hỏi thông tin.",
            theory_formation: "Từ để hỏi + Trợ động từ + S + V?",
            theory_usage: "Chi tiết.",
            theory_common_mistakes: "Where you go?",
            localized_tips: "Từ để hỏi -> Trợ động từ -> Chủ ngữ.",
            rules: [
                { title: "Cấu trúc", formula: "Wh- + Trợ động từ + S + V?", example: "Where do you live?" },
                { title: "Ngoại lệ (Who là chủ từ)", formula: "Who + V?", example: "Who called you?" }
            ],
            examples: [
                { sentence: "What do you want?", translation: "Bạn muốn gì?", explanation: "Standard form." },
                { sentence: "Where is he?", translation: "Anh ấy ở đâu?", explanation: "With To Be." }
            ]
        }
    },
    {
        slug: 'conjunctions-intro',
        en: {
            title: "Conjunctions",
            theory_definition: "Joining ideas.",
            theory_formation: "And, But, So, Because.",
            theory_usage: "Connecting sentences.",
            theory_common_mistakes: "So vs Because.",
            localized_tips: "So = Result. Because = Reason.",
            rules: [
                { title: "And", formula: "Add info", example: "A and B" },
                { title: "But", formula: "Contrast", example: "A but B" },
                { title: "So", formula: "Result", example: "Cause -> So -> Result" },
                { title: "Because", formula: "Reason", example: "Result <- Because <- Cause" }
            ],
            examples: [
                { sentence: "I like tea but I hate coffee.", explanation: "Contrast." },
                { sentence: "It was raining so I stayed home.", explanation: "Result." }
            ]
        },
        vi: {
            title: "Liên từ",
            theory_definition: "Nối ý.",
            theory_formation: "And, But, So, Because.",
            theory_usage: "Nối câu.",
            theory_common_mistakes: "Nhầm So và Because.",
            localized_tips: "So = Kết quả. Because = Lý do.",
            rules: [
                { title: "And", formula: "Thêm thông tin", example: "A and B" },
                { title: "But", formula: "Tương phản", example: "A but B" },
                { title: "So", formula: "Kết quả", example: "Nguyên nhân -> So -> Kết quả" },
                { title: "Because", formula: "Lý do", example: "Kết quả <- Because <- Nguyên nhân" }
            ],
            examples: [
                { sentence: "I like tea but I hate coffee.", translation: "Tôi thích trà nhưng ghét cà phê.", explanation: "Tương phản." },
                { sentence: "It was raining so I stayed home.", translation: "Trời mưa nên tôi ở nhà.", explanation: "Kết quả." }
            ]
        }
    },
    {
        slug: 'feelings-to-be-vs-to-have',
        en: {
            title: "Feelings: To Be vs To Have",
            theory_definition: "I am hungry, not I have hunger.",
            theory_formation: "Subject + To Be + Adjective.",
            theory_usage: "States.",
            theory_common_mistakes: "I have hungry.",
            localized_tips: "Use TO BE for feelings.",
            rules: [
                { title: "Feelings", formula: "S + am/is/are + Adjective", example: "I am hungry." },
                { title: "Age", formula: "S + am/is/are + Age", example: "I am 20." }
            ],
            examples: [
                { sentence: "I am hungry.", explanation: "Correct (Adj)." },
                { sentence: "She is afraid.", explanation: "Correct (Adj)." },
                { sentence: "I am 10 years old.", explanation: "Use 'am', not 'have'." }
            ]
        },
        vi: {
            title: "Cảm xúc: To Be vs To Have",
            theory_definition: "Tôi thì đói, không phải tôi có đói.",
            theory_formation: "Chủ ngữ + To Be + Tính từ.",
            theory_usage: "Trạng thái.",
            theory_common_mistakes: "I have hungry.",
            localized_tips: "Dùng TO BE cho cảm xúc.",
            rules: [
                { title: "Cảm xúc", formula: "S + am/is/are + Tính từ", example: "I am hungry." },
                { title: "Tuổi", formula: "S + am/is/are + Tuổi", example: "I am 20." }
            ],
            examples: [
                { sentence: "I am hungry.", translation: "Tôi đói.", explanation: "Dùng tính từ." },
                { sentence: "She is afraid.", translation: "Cô ấy sợ.", explanation: "Dùng tính từ." }
            ]
        }
    },
    {
        slug: 'adjective-order',
        en: {
            title: "Adjective Order",
            theory_definition: "OSASCOMP rule.",
            theory_formation: "Opinion -> Size -> Age -> Shape -> Color...",
            theory_usage: "Multiple adjectives.",
            theory_common_mistakes: "Red big ball.",
            localized_tips: "Size first.",
            rules: [
                { title: "Order", formula: "Size - Age - Color", example: "Big old red car" }
            ],
            examples: [
                { sentence: "A beautiful big white house.", explanation: "Opinion -> Size -> Color" },
                { sentence: "A small old wooden box.", explanation: "Size -> Age -> Material" }
            ]
        },
        vi: {
            title: "Trật tự tính từ",
            theory_definition: "Quy tắc OSASCOMP.",
            theory_formation: "Ý kiến -> Kích thước -> Tuổi -> Màu...",
            theory_usage: "Nhiều tính từ.",
            theory_common_mistakes: "Red big ball.",
            localized_tips: "Kích thước trước.",
            rules: [
                { title: "Trật tự", formula: "Kích thước - Tuổi - Màu", example: "Big old red car" }
            ],
            examples: [
                { sentence: "A beautiful big white house.", translation: "Ngôi nhà to, đẹp, trắng.", explanation: "Ý kiến -> Kích thước -> Màu" }
            ]
        }
    },
    {
        slug: 'this-that-these-those',
        en: {
            title: "This, That, These, Those",
            theory_definition: "Demonstratives.",
            theory_formation: "Near/Far + Singular/Plural.",
            theory_usage: "Pointing.",
            theory_common_mistakes: "These is.",
            localized_tips: "This/That -> Single.",
            rules: [
                { title: "Near (Here)", formula: "This (1) / These (>1)", example: "This cat, These cats" },
                { title: "Far (There)", formula: "That (1) / Those (>1)", example: "That dog, Those dogs" }
            ],
            examples: [
                { sentence: "This is my friend.", explanation: "Near, singular." },
                { sentence: "Those are my shoes.", explanation: "Far, plural." }
            ]
        },
        vi: {
            title: "This, That, These, Those",
            theory_definition: "Đại từ chỉ định.",
            theory_formation: "Gần/Xa + Ít/Nhiều.",
            theory_usage: "Chỉ trỏ.",
            theory_common_mistakes: "These is.",
            localized_tips: "This/That -> Số ít.",
            rules: [
                { title: "Gần (Đây)", formula: "This (1) / These (>1)", example: "This cat, These cats" },
                { title: "Xa (Đó)", formula: "That (1) / Those (>1)", example: "That dog, Those dogs" }
            ],
            examples: [
                { sentence: "This is my friend.", translation: "Đây là bạn tôi.", explanation: "Gần, số ít." },
                { sentence: "Those are my shoes.", translation: "Kia là giày của tôi.", explanation: "Xa, số nhiều." }
            ]
        }
    },
    {
        slug: 'he-she-it-the-s-rule',
        en: {
            title: "He/She/It (The S Rule)",
            theory_definition: "Present Simple 3rd Person.",
            theory_formation: "Add -s to verb.",
            theory_usage: "Present Simple.",
            theory_common_mistakes: "He have.",
            localized_tips: "He/She/It likes S.",
            rules: [
                { title: "General Rule", formula: "He/She/It + Verb-s", example: "He plays" },
                { title: "Have / Go / Do", formula: "Has / Goes / Does", example: "She has" }
            ],
            examples: [
                { sentence: "He works here.", explanation: "Add s." },
                { sentence: "She goes to school.", explanation: "Go -> Goes." }
            ]
        },
        vi: {
            title: "Quy tắc thêm S",
            theory_definition: "Ngôi thứ 3 số ít.",
            theory_formation: "Thêm -s vào động từ.",
            theory_usage: "Hiện tại đơn.",
            theory_common_mistakes: "He have.",
            localized_tips: "He/She/It thích S.",
            rules: [
                { title: "Quy tắc chung", formula: "He/She/It + V-s", example: "He plays" },
                { title: "Have / Go / Do", formula: "Has / Goes / Does", example: "She has" }
            ],
            examples: [
                { sentence: "He works here.", translation: "Anh ấy làm ở đây.", explanation: "Thêm s." },
                { sentence: "She goes to school.", translation: "Cô ấy đi học.", explanation: "Go -> Goes." }
            ]
        }
    },
    {
        slug: 'there-is-vs-it-is',
        en: {
            title: "There is vs It is",
            theory_definition: "Existence vs ID.",
            theory_formation: "There is + Noun. It is + Adj.",
            theory_usage: "Introducing vs Describing.",
            theory_common_mistakes: "Have a dog.",
            localized_tips: "There is for new things.",
            rules: [
                { title: "Existence", formula: "There is + Object", example: "There is a car." },
                { title: "Identification", formula: "It is + Object/Adj", example: "It is fast." }
            ],
            examples: [
                { sentence: "There is a problem.", explanation: "Something exists." },
                { sentence: "It is a big problem.", explanation: "Describing it." }
            ]
        },
        vi: {
            title: "There is vs It is",
            theory_definition: "Tồn tại vs Nhận diện.",
            theory_formation: "There is + Noun. It is + Adj.",
            theory_usage: "Giới thiệu vs Mô tả.",
            theory_common_mistakes: "Have a dog.",
            localized_tips: "There is dùng để giới thiệu.",
            rules: [
                { title: "Tồn tại", formula: "There is + Object", example: "There is a car." },
                { title: "Nhận diện", formula: "It is + Object/Adj", example: "It is fast." }
            ],
            examples: [
                { sentence: "There is a problem.", translation: "Có một vấn đề.", explanation: "Tồn tại." },
                { sentence: "It is a big problem.", translation: "Đó là vấn đề lớn.", explanation: "Nhận diện." }
            ]
        }
    },
    {
        slug: 'frequency-adverbs',
        en: {
            title: "Frequency Adverbs",
            theory_definition: "How often.",
            theory_formation: "Before V, After ToBe.",
            theory_usage: "Routines.",
            theory_common_mistakes: "Always I go.",
            localized_tips: "After ToBe.",
            rules: [
                { title: "Normal Verbs", formula: "Subject + Adverb + Verb", example: "I always eat" },
                { title: "To Be", formula: "Subject + Am/Is/Are + Adverb", example: "I am always happy" }
            ],
            examples: [
                { sentence: "I never smoke.", explanation: "Before smoke." },
                { sentence: "She is usually late.", explanation: "After Is." }
            ]
        },
        vi: {
            title: "Trạng từ tần suất",
            theory_definition: "Bao lâu một lần.",
            theory_formation: "Trước V, Sau ToBe.",
            theory_usage: "Thói quen.",
            theory_common_mistakes: "Always I go.",
            localized_tips: "Sau ToBe.",
            rules: [
                { title: "Động từ thường", formula: "S + Trạng từ + V", example: "I always eat" },
                { title: "To Be", formula: "S + ToBe + Trạng từ", example: "I am always happy" }
            ],
            examples: [
                { sentence: "I never smoke.", translation: "Tôi không bao giờ hút thuốc.", explanation: "Trước smoke." },
                { sentence: "She is usually late.", translation: "Cô ấy thường đi trễ.", explanation: "Sau Is." }
            ]
        }
    },
    {
        slug: 'object-pronouns-placement',
        en: {
            title: "Object Placement",
            theory_definition: "Verb and Object stick together.",
            theory_formation: "Verb + Object.",
            theory_usage: "Everywhere.",
            theory_common_mistakes: "I like very much it.",
            localized_tips: "No separation.",
            rules: [
                { title: "No Separation", formula: "Verb + Object (Together)", example: "I love football" }
            ],
            examples: [
                { sentence: "I like pizza very much.", explanation: "Correct." },
                { sentence: "I like very much pizza.", explanation: "Incorrect order!", correct: false }
            ]
        },
        vi: {
            title: "Vị trí tân ngữ",
            theory_definition: "Động từ và tân ngữ dính liền.",
            theory_formation: "V + O.",
            theory_usage: "Mọi nơi.",
            theory_common_mistakes: "Like very much it.",
            localized_tips: "Không tách rời.",
            rules: [
                { title: "Không tách rời", formula: "Động từ + Tân ngữ", example: "I love football" }
            ],
            examples: [
                { sentence: "I like pizza very much.", translation: "Tôi rất thích pizza.", explanation: "Đúng." },
                { sentence: "I like very much pizza.", translation: "Tôi thích rất nhiều pizza.", explanation: "Sai trật tự!", correct: false }
            ]
        }
    }
];

function generateSQL() {
    let sql = `
DO $$
DECLARE
    v_lesson_id uuid;
BEGIN
`;

    for (const topic of TOPICS) {
        // English Update
        sql += `
    -- Updating ${topic.slug} (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = '${escape(topic.en.theory_definition)}',
        theory_formation = '${escape(topic.en.theory_formation)}',
        theory_usage = '${escape(topic.en.theory_usage)}',
        theory_common_mistakes = '${escape(topic.en.theory_common_mistakes)}',
        localized_tips = '${escape(topic.en.localized_tips)}',
        rules = '${json(topic.en.rules)}'::jsonb,
        examples = '${json(topic.en.examples)}'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = '${topic.slug}')
    );
`;

        // Vietnamese Update (Upsert)
        sql += `
    -- Updating ${topic.slug} (Vi)
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
            '${json(topic.vi.rules)}'::jsonb,
            '${json(topic.vi.examples)}'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;
`;
    }

    sql += `
END $$;
`;

    const outputPath = path.join(process.cwd(), 'apps/main/supabase/migrations/20251216_update_foundations_content_v2.sql');
    fs.writeFileSync(outputPath, sql);
    console.log(`✅ Generated SQL at ${outputPath}`);
}

generateSQL();
