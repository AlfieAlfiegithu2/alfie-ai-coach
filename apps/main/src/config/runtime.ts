// Runtime configuration for the application
// This avoids using VITE_ environment variables which don't work in Lovable

// Helper function to get site URL with proper fallbacks for development
const getSiteUrl = (): string => {
  // First check for VITE_PUBLIC_SITE_URL environment variable (for development)
  const viteSiteUrl = (import.meta as any)?.env?.VITE_PUBLIC_SITE_URL;
  if (viteSiteUrl) {
    return viteSiteUrl;
  }

  // Fallback to current origin (for development servers)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Production fallback
  return 'https://englishaidol.com';
};

const siteUrl = getSiteUrl();

export const config = {
  // Site configuration - dynamically determined based on environment
  siteUrl,

  // Supabase configuration
  supabase: {
    url: 'https://cuumxmfzhwljylbdlflj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI'
  },

  // OAuth redirect URLs for different environments - built dynamically
  oauth: {
    google: {
      redirectTo: `${siteUrl}/auth/callback`
    }
  }
} as const;

export default config;

