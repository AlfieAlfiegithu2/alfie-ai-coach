#!/usr/bin/env node

/**
 * Script to add Earthworm navigation translations to all language files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '../public/locales');

// Translations for each language
const translations = {
  'ar.json': {
    "practice": "ممارسة",
    "sentenceBuilder": "بناء الجملة",
    "adminLogin": "تسجيل الدخول للمسؤول",
    "adminDashboard": "لوحة تحكم المسؤول"
  },
  'bn.json': {
    "practice": "অনুশীলন",
    "sentenceBuilder": "বাক্য নির্মাণ",
    "adminLogin": "প্রশাসক লগইন",
    "adminDashboard": "প্রশাসক ড্যাশবোর্ড"
  },
  'de.json': {
    "practice": "Üben",
    "sentenceBuilder": "Satzbildung",
    "adminLogin": "Admin-Anmeldung",
    "adminDashboard": "Admin-Dashboard"
  },
  'es.json': {
    "practice": "Práctica",
    "sentenceBuilder": "Constructor de Oraciones",
    "adminLogin": "Inicio de sesión de administrador",
    "adminDashboard": "Panel de administrador"
  },
  'fa.json': {
    "practice": "تمرین",
    "sentenceBuilder": "سازنده جملات",
    "adminLogin": "ورود مدیر",
    "adminDashboard": "داشبورد مدیر"
  },
  'fr.json': {
    "practice": "Pratique",
    "sentenceBuilder": "Constructeur de phrases",
    "adminLogin": "Connexion administrateur",
    "adminDashboard": "Tableau de bord administrateur"
  },
  'hi.json': {
    "practice": "अभ्यास",
    "sentenceBuilder": "वाक्य निर्माता",
    "adminLogin": "एडमिन लॉगिन",
    "adminDashboard": "एडमिन डैशबोर्ड"
  },
  'id.json': {
    "practice": "Praktik",
    "sentenceBuilder": "Pembuat Kalimat",
    "adminLogin": "Login Admin",
    "adminDashboard": "Dasbor Admin"
  },
  'ja.json': {
    "practice": "練習",
    "sentenceBuilder": "文構築ツール",
    "adminLogin": "管理者ログイン",
    "adminDashboard": "管理者ダッシュボード"
  },
  'kk.json': {
    "practice": "Жаттығу",
    "sentenceBuilder": "Сөйлем құрастырғышы",
    "adminLogin": "Администратор кірісі",
    "adminDashboard": "Администратор бақылау тақтасы"
  },
  'ko.json': {
    "practice": "연습",
    "sentenceBuilder": "문장 빌더",
    "adminLogin": "관리자 로그인",
    "adminDashboard": "관리자 대시보드"
  },
  'ms.json': {
    "practice": "Latihan",
    "sentenceBuilder": "Pembina Ayat",
    "adminLogin": "Log Masuk Pentadbir",
    "adminDashboard": "Papan Pemuka Pentadbir"
  },
  'ne.json': {
    "practice": "अभ्यास",
    "sentenceBuilder": "वाक्य निर्माणकर्ता",
    "adminLogin": "प्रशासक लॉगिन",
    "adminDashboard": "प्रशासक ड्याशबोर्ड"
  },
  'pt.json': {
    "practice": "Prática",
    "sentenceBuilder": "Construtor de Sentenças",
    "adminLogin": "Login de Administrador",
    "adminDashboard": "Painel de Controle do Administrador"
  },
  'ru.json': {
    "practice": "Практика",
    "sentenceBuilder": "Конструктор предложений",
    "adminLogin": "Вход администратора",
    "adminDashboard": "Панель администратора"
  },
  'ta.json': {
    "practice": "பயிற்சி",
    "sentenceBuilder": "வாக்கிய வளர்ப்பாளர்",
    "adminLogin": "நிர்வாகி உள்நுழைவு",
    "adminDashboard": "நிர்வாகி டாஷ்போர்டு"
  },
  'th.json': {
    "practice": "ฝึกหัด",
    "sentenceBuilder": "ตัวสร้างประโยค",
    "adminLogin": "เข้าสู่ระบบผู้ดูแล",
    "adminDashboard": "แดชบอร์ดผู้ดูแล"
  },
  'tr.json': {
    "practice": "Pratik",
    "sentenceBuilder": "Cümle Oluşturucu",
    "adminLogin": "Yönetici Girişi",
    "adminDashboard": "Yönetici Paneli"
  },
  'ur.json': {
    "practice": "مشق",
    "sentenceBuilder": "جملہ تعمیر کار",
    "adminLogin": "ایڈمن لاگ ان",
    "adminDashboard": "ایڈمن ڈیش بورڈ"
  },
  'vi.json': {
    "practice": "Thực hành",
    "sentenceBuilder": "Trình tạo câu",
    "adminLogin": "Đăng nhập quản trị viên",
    "adminDashboard": "Bảng điều khiển quản trị viên"
  },
  'yue.json': {
    "practice": "練習",
    "sentenceBuilder": "句子建造工具",
    "adminLogin": "管理員登入",
    "adminDashboard": "管理員儀表板"
  },
  'zh.json': {
    "practice": "练习",
    "sentenceBuilder": "句子构建器",
    "adminLogin": "管理员登录",
    "adminDashboard": "管理员仪表板"
  }
};

// Update each language file
Object.entries(translations).forEach(([filename, newKeys]) => {
  const filePath = path.join(localesDir, filename);

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Update navigation section
    if (!data.navigation) {
      data.navigation = {};
    }

    // Add new keys
    Object.assign(data.navigation, newKeys);

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`✓ Updated ${filename}`);
  } catch (error) {
    console.error(`✗ Failed to update ${filename}:`, error.message);
  }
});

console.log('\n✓ Earthworm translations added to all language files');
