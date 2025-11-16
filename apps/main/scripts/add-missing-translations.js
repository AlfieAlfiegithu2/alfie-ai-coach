#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const translations = {
  ko: { clickToOpenSettings: '설정을 열려면 클릭하세요', studyCommunity: '학습 커뮤니티' },
  zh: { clickToOpenSettings: '点击打开设置', studyCommunity: '学习社区' },
  ja: { clickToOpenSettings: '設定を開くにはクリック', studyCommunity: '学習コミュニティ' },
  es: { clickToOpenSettings: 'Haz clic para abrir la configuración', studyCommunity: 'Comunidad de Estudio' },
  pt: { clickToOpenSettings: 'Clique para abrir as configurações', studyCommunity: 'Comunidade de Estudo' },
  fr: { clickToOpenSettings: 'Cliquez pour ouvrir les paramètres', studyCommunity: 'Communauté d\'Étude' },
  de: { clickToOpenSettings: 'Klicken Sie, um die Einstellungen zu öffnen', studyCommunity: 'Lerngemeinschaft' },
  ru: { clickToOpenSettings: 'Нажмите, чтобы открыть настройки', studyCommunity: 'Учебное Сообщество' },
  hi: { clickToOpenSettings: 'सेटिंग्स खोलने के लिए क्लिक करें', studyCommunity: 'अध्ययन समुदाय' },
  vi: { clickToOpenSettings: 'Nhấp để mở cài đặt', studyCommunity: 'Cộng Đồng Học Tập' },
  ar: { clickToOpenSettings: 'انقر لفتح الإعدادات', studyCommunity: 'مجتمع الدراسة' },
  bn: { clickToOpenSettings: 'সেটিংস খুলতে ক্লিক করুন', studyCommunity: 'অধ্যয়ন সম্প্রদায়' },
  ur: { clickToOpenSettings: 'ترتیبات کھولنے کے لیے کلک کریں', studyCommunity: 'مطالعہ کمیونٹی' },
  id: { clickToOpenSettings: 'Klik untuk membuka pengaturan', studyCommunity: 'Komunitas Belajar' },
  tr: { clickToOpenSettings: 'Ayarları açmak için tıklayın', studyCommunity: 'Çalışma Topluluğu' },
  fa: { clickToOpenSettings: 'برای باز کردن تنظیمات کلیک کنید', studyCommunity: 'جامعه مطالعاتی' },
  ta: { clickToOpenSettings: 'அமைப்புகளைத் திறக்க கிளிக் செய்யவும்', studyCommunity: 'படிப்பு சமூகம்' },
  ne: { clickToOpenSettings: 'सेटिङहरू खोल्न क्लिक गर्नुहोस्', studyCommunity: 'अध्ययन समुदाय' },
  th: { clickToOpenSettings: 'คลิกเพื่อเปิดการตั้งค่า', studyCommunity: 'ชุมชนการศึกษา' },
  yue: { clickToOpenSettings: '點擊打開設置', studyCommunity: '學習社群' },
  ms: { clickToOpenSettings: 'Klik untuk membuka tetapan', studyCommunity: 'Komuniti Pembelajaran' },
  kk: { clickToOpenSettings: 'Баптауларды ашу үшін басыңыз', studyCommunity: 'Оқу Қауымдастығы' },
  sr: { clickToOpenSettings: 'Кликните да отворите подешавања', studyCommunity: 'Студијска Заједница' }
};

const localesDir = path.join(__dirname, '../public/locales');

async function main() {
  for (const [lang, trans] of Object.entries(translations)) {
    const filePath = path.join(localesDir, `${lang}.json`);
    const content = JSON.parse(await fs.readFile(filePath, 'utf8'));
    
    // Add clickToOpenSettings to dashboard
    if (!content.dashboard) content.dashboard = {};
    content.dashboard.clickToOpenSettings = trans.clickToOpenSettings;
    
    // Add community section at root level (preserve highlights.community if it exists)
    // Check if there's already a root-level community that's not the highlights one
    const hasHighlightsCommunity = content.highlights?.community;
    
    if (!content.community || (hasHighlightsCommunity && content.community === content.highlights.community)) {
      // Create new root-level community section
      content.community = { studyCommunity: trans.studyCommunity };
    } else if (typeof content.community === 'object' && !Array.isArray(content.community)) {
      // Add to existing community object
      content.community.studyCommunity = trans.studyCommunity;
    }
    
    await fs.writeFile(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
    console.log(`✅ Updated ${lang}.json`);
  }
  
  console.log('\n🎉 All translations updated!');
}

main().catch(console.error);


