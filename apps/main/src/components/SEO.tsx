import React from 'react';
import { Helmet } from 'react-helmet-async';
import {
  createOrganizationSchema,
  createCourseSchema,
  createServiceSchema,
  createWebSiteSchema,
  createLocalBusinessSchema,
  createFAQSchema,
  createBreadcrumbSchema,
  createArticleSchema,
  createArticleWithFAQSchema,
  createHowToSchema,
  createQAPageSchema
} from '@/lib/structured-data';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  published?: string;
  modified?: string;
  section?: string;
  tags?: string[];
  structuredData?: object;
  schemaType?: 'organization' | 'course' | 'service' | 'website' | 'localBusiness' | 'faq' | 'breadcrumb' | 'article' | 'articleWithFaq' | 'howTo' | 'qaPage' | 'home';
  courseType?: string;
  courseLevel?: string;
  serviceName?: string;
  serviceDescription?: string;
  faqs?: Array<{ question: string; answer: string }>;
  breadcrumbs?: Array<{ name: string; url: string }>;
  hreflang?: Array<{ lang: string; url: string }>;
  lang?: string;
  // HowTo schema props
  howToSteps?: Array<{ name: string; text: string; image?: string }>;
  totalTime?: string;
  // QA schema props
  questionText?: string;
  answerText?: string;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  author = 'English AIdol',
  published,
  modified,
  section,
  tags,
  structuredData,
  schemaType,
  courseType,
  courseLevel,
  serviceName,
  serviceDescription,
  faqs,
  breadcrumbs,
  hreflang,
  lang = 'en',
  howToSteps,
  totalTime,
  questionText,
  answerText,
}) => {
  const siteName = 'English AIdol';
  const defaultTitle = 'English AIdol - AI-Powered English Learning Platform | IELTS & General English';
  const defaultDescription = 'Master English with AI-powered learning. Join 50,000+ students achieving their English goals with personalized AI feedback, comprehensive practice tests, and expert guidance for IELTS and General English. Created by TESOL-certified experts and former IELTS examiners.';
  const defaultImage = 'https://storage.googleapis.com/gpt-engineer-file-uploads/oufTM9t5lFf51A21C2I86dAQL9J3/social-images/social-1758811085448-Upscale_this_adorable_bunny_character_wearing_glas-1758810348175.png';
  const defaultUrl = 'https://englishaidol.com';

  const metaTitle = title || defaultTitle;
  const metaDescription = description || defaultDescription;
  const metaImage = image || defaultImage;
  const metaUrl = url || defaultUrl;
  const metaKeywords = keywords || 'English learning, IELTS preparation, AI tutor, language learning, speaking practice, writing feedback, vocabulary builder, grammar practice, TOEFL, PTE, TOEIC, English AIdol, AI English tutor, IELTS practice tests, English exam preparation';

  // Generate structured data based on schema type
  let schemas: any[] = [];

  if (schemaType) {
    let primarySchema: any = null;
    switch (schemaType) {
      case 'organization':
        primarySchema = createOrganizationSchema();
        break;
      case 'course':
        if (courseType) {
          primarySchema = createCourseSchema(courseType, courseLevel);
        }
        break;
      case 'service':
        if (serviceName && serviceDescription) {
          primarySchema = createServiceSchema(serviceName, serviceDescription);
        }
        break;
      case 'website':
        primarySchema = createWebSiteSchema();
        break;
      case 'localBusiness':
        primarySchema = createLocalBusinessSchema();
        break;
      case 'faq':
        if (faqs && faqs.length > 0) {
          primarySchema = createFAQSchema(faqs);
        }
        break;
      case 'breadcrumb':
        if (breadcrumbs && breadcrumbs.length > 0) {
          primarySchema = createBreadcrumbSchema(breadcrumbs);
        }
        break;
      case 'article':
        if (title && description) {
          primarySchema = createArticleSchema(
            title,
            description,
            metaUrl,
            published,
            modified,
            author,
            metaImage
          );
        }
        break;
      case 'articleWithFaq':
        if (title && description && faqs && faqs.length > 0) {
          primarySchema = createArticleWithFAQSchema(
            title,
            description,
            metaUrl,
            faqs,
            published,
            modified,
            metaImage
          );
        }
        break;
      case 'howTo':
        if (title && description && howToSteps && howToSteps.length > 0) {
          primarySchema = createHowToSchema(
            title,
            description,
            howToSteps,
            totalTime,
            metaImage
          );
        }
        break;
      case 'qaPage':
        if (questionText && answerText) {
          primarySchema = createQAPageSchema(
            questionText,
            answerText,
            metaUrl
          );
        }
        break;
      case 'home':
        schemas.push(createWebSiteSchema());
        schemas.push(createOrganizationSchema());
        if (faqs && faqs.length > 0) {
          schemas.push(createFAQSchema(faqs));
        }
        break;
    }
    if (primarySchema) {
      if (primarySchema['@graph']) {
        schemas.push(...primarySchema['@graph']);
      } else {
        schemas.push(primarySchema);
      }
    }
  }

  // Always add breadcrumbs if provided and not already the primary schema
  if (schemaType !== 'breadcrumb' && breadcrumbs && breadcrumbs.length > 0) {
    schemas.push(createBreadcrumbSchema(breadcrumbs));
  }

  // Add search action to website if on home page
  if (schemaType === 'website') {
    // Already handled by createWebSiteSchema
  }

  const finalStructuredData = schemas.length > 1
    ? {
      "@context": "https://schema.org", "@graph": schemas.map(s => {
        const { "@context": ctx, ...rest } = s;
        return rest;
      })
    }
    : schemas[0] || structuredData;

  return (
    <Helmet>
      {/* Language */}
      <html lang={lang} />

      {/* Basic meta tags */}
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      <meta name="author" content={author} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="application-name" content={siteName} />
      <meta name="apple-mobile-web-app-title" content={siteName} />
      {published && <meta name="article:published_time" content={published} />}
      {modified && <meta name="article:modified_time" content={modified} />}
      {section && <meta name="article:section" content={section} />}
      {tags && tags.map(tag => (
        <meta key={tag} name="article:tag" content={tag} />
      ))}

      {/* Open Graph tags */}
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={lang} />
      {hreflang && hreflang.map((alt) => (
        <meta key={alt.lang} property="og:locale:alternate" content={alt.lang} />
      ))}

      {/* Twitter Card tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@englishaidol" />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />

      {/* Canonical URL */}
      <link rel="canonical" href={metaUrl} />

      {/* Hreflang tags for multilingual SEO */}
      {hreflang && hreflang.map((alt) => (
        <link key={alt.lang} rel="alternate" hrefLang={alt.lang} href={alt.url} />
      ))}
      {hreflang && (
        <link rel="alternate" hrefLang="x-default" href={metaUrl} />
      )}

      {/* Structured Data */}
      {finalStructuredData && (
        <script type="application/ld+json">
          {JSON.stringify(finalStructuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
