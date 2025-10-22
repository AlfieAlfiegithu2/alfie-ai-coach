// Structured Data (JSON-LD) utilities for SEO
// Based on Schema.org specifications

export const createOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "English AIdol",
  "alternateName": "English AI dol",
  "description": "AI-powered English learning platform for IELTS and General English mastery",
  "url": "https://englishaidol.com",
  "logo": "https://storage.googleapis.com/gpt-engineer-file-uploads/oufTM9t5lFf51A21C2I86dAQL9J3/uploads/1758811060051-Create_an_icon_featuring_a_cartoon-style_white_rab-1758811037411.png",
  "image": "https://storage.googleapis.com/gpt-engineer-file-uploads/oufTM9t5lFf51A21C2I86dAQL9J3/social-images/social-1758811085448-Upscale_this_adorable_bunny_character_wearing_glas-1758810348175.png",
  "foundingDate": "2024",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "availableLanguage": ["English"],
    "contactOption": "TollFree"
  },
  "sameAs": [
    "https://www.instagram.com/englishaidol",
    "https://www.facebook.com/englishaidol",
    "https://twitter.com/englishaidol"
  ],
  "hasEducationalCredential": {
    "@type": "EducationalCredential",
    "name": "IELTS Preparation",
    "description": "Comprehensive IELTS preparation with AI-powered feedback"
  },
  "offers": {
    "@type": "Service",
    "name": "English Language Learning",
    "description": "AI-powered English learning platform offering personalized feedback and practice tests"
  },
  "areaServed": {
    "@type": "Country",
    "name": "Worldwide"
  },
  "serviceType": [
    "IELTS Preparation",
    "TOEFL Preparation",
    "General English Learning",
    "Vocabulary Building",
    "Grammar Practice",
    "Speaking Practice",
    "Writing Feedback"
  ]
});

export const createCourseSchema = (courseType: string, level?: string) => ({
  "@context": "https://schema.org",
  "@type": "Course",
  "name": `${courseType} Preparation Course`,
  "description": `Comprehensive ${courseType} preparation with AI-powered feedback and practice tests`,
  "provider": {
    "@type": "EducationalOrganization",
    "name": "English AIdol"
  },
  "courseMode": "online",
  "timeRequired": "P4M", // 4 months
  "educationalLevel": level || "Intermediate to Advanced",
  "teaches": getCourseSkills(courseType),
  "isAccessibleForFree": true,
  "hasCourseInstance": {
    "@type": "CourseInstance",
    "courseMode": "online",
    "instructor": {
      "@type": "EducationalOrganization",
      "name": "English AIdol AI System"
    }
  }
});

export const createServiceSchema = (serviceName: string, description: string) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  "name": serviceName,
  "description": description,
  "provider": {
    "@type": "EducationalOrganization",
    "name": "English AIdol"
  },
  "serviceType": "Online Education",
  "areaServed": {
    "@type": "Country",
    "name": "Worldwide"
  },
  "offers": {
    "@type": "Offer",
    "priceSpecification": {
      "@type": "PriceSpecification",
      "price": "0",
      "priceCurrency": "USD",
      "referenceQuantity": {
        "@type": "QuantitativeValue",
        "value": "1",
        "unitText": "month"
      }
    },
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "EducationalOrganization",
      "name": "English AIdol"
    }
  }
});

export const createWebSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "English AIdol",
  "alternateName": "English AI dol",
  "description": "AI-powered English learning platform for IELTS and General English mastery",
  "url": "https://englishaidol.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://englishaidol.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  },
  "publisher": {
    "@type": "EducationalOrganization",
    "name": "English AIdol"
  }
});

export const createBreadcrumbSchema = (breadcrumbs: Array<{ name: string; url: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": breadcrumbs.map((crumb, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": crumb.name,
    "item": crumb.url
  }))
});

export const createFAQSchema = (faqs: Array<{ question: string; answer: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});

export const createLocalBusinessSchema = () => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://englishaidol.com/#organization",
  "name": "English AIdol",
  "image": "https://storage.googleapis.com/gpt-engineer-file-uploads/oufTM9t5lFf51A21C2I86dAQL9J3/uploads/1758811060051-Create_an_icon_featuring_a_cartoon-style_white_rab-1758811037411.png",
  "url": "https://englishaidol.com",
  "telephone": "+1-555-0123",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Online Platform",
    "addressLocality": "Global",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday"
    ],
    "opens": "00:00",
    "closes": "23:59"
  },
  "sameAs": [
    "https://www.instagram.com/englishaidol",
    "https://www.facebook.com/englishaidol",
    "https://twitter.com/englishaidol"
  ]
});

// Helper function to get course skills based on course type
const getCourseSkills = (courseType: string): string[] => {
  const skillMap: Record<string, string[]> = {
    'IELTS': ['IELTS Reading', 'IELTS Listening', 'IELTS Writing', 'IELTS Speaking', 'Academic English', 'Test Strategies'],
    'TOEFL': ['TOEFL Reading', 'TOEFL Listening', 'TOEFL Speaking', 'TOEFL Writing', 'Academic English'],
    'PTE': ['PTE Reading', 'PTE Listening', 'PTE Speaking', 'PTE Writing', 'Academic English'],
    'General English': ['Grammar', 'Vocabulary', 'Speaking', 'Listening', 'Writing', 'Reading', 'Pronunciation'],
    'Business English': ['Business Communication', 'Professional Writing', 'Presentation Skills', 'Meeting Skills'],
    'Academic English': ['Academic Writing', 'Research Skills', 'Citation', 'Academic Reading']
  };

  return skillMap[courseType] || ['English Language Skills'];
};
