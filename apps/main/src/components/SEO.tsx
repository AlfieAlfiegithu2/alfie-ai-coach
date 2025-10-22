import React from 'react';
import { Helmet } from 'react-helmet-async';
import {
  createOrganizationSchema,
  createCourseSchema,
  createServiceSchema,
  createWebSiteSchema,
  createLocalBusinessSchema,
  createFAQSchema,
  createBreadcrumbSchema
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
  schemaType?: 'organization' | 'course' | 'service' | 'website' | 'localBusiness' | 'faq' | 'breadcrumb';
  courseType?: string;
  courseLevel?: string;
  serviceName?: string;
  serviceDescription?: string;
  faqs?: Array<{ question: string; answer: string }>;
  breadcrumbs?: Array<{ name: string; url: string }>;
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
}) => {
  const siteName = 'English AIdol';
  const defaultTitle = 'Study English with AI tutor';
  const defaultDescription = 'Master English with AI-powered learning. Join 50,000+ students achieving their English goals with personalized AI feedback, comprehensive practice tests, and expert guidance for IELTS and General English.';
  const defaultImage = 'https://storage.googleapis.com/gpt-engineer-file-uploads/oufTM9t5lFf51A21C2I86dAQL9J3/social-images/social-1758811085448-Upscale_this_adorable_bunny_character_wearing_glas-1758810348175.png';
  const defaultUrl = 'https://englishaidol.com';

  const metaTitle = title ? `${title} | ${siteName}` : `${defaultTitle} | ${siteName}`;
  const metaDescription = description || defaultDescription;
  const metaImage = image || defaultImage;
  const metaUrl = url || defaultUrl;
  const metaKeywords = keywords || 'English learning, IELTS preparation, AI tutor, language learning, speaking practice, writing feedback, vocabulary builder, grammar practice';

  // Generate structured data based on schema type
  let finalStructuredData = structuredData;

  if (schemaType) {
    switch (schemaType) {
      case 'organization':
        finalStructuredData = createOrganizationSchema();
        break;
      case 'course':
        if (courseType) {
          finalStructuredData = createCourseSchema(courseType, courseLevel);
        }
        break;
      case 'service':
        if (serviceName && serviceDescription) {
          finalStructuredData = createServiceSchema(serviceName, serviceDescription);
        }
        break;
      case 'website':
        finalStructuredData = createWebSiteSchema();
        break;
      case 'localBusiness':
        finalStructuredData = createLocalBusinessSchema();
        break;
      case 'faq':
        if (faqs && faqs.length > 0) {
          finalStructuredData = createFAQSchema(faqs);
        }
        break;
      case 'breadcrumb':
        if (breadcrumbs && breadcrumbs.length > 0) {
          finalStructuredData = createBreadcrumbSchema(breadcrumbs);
        }
        break;
    }
  }

  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      <meta name="author" content={author} />
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

      {/* Twitter Card tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@englishaidol" />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />

      {/* Canonical URL */}
      <link rel="canonical" href={metaUrl} />

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
