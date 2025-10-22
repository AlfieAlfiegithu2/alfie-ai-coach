/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_CLOUDFLARE_ACCOUNT_ID: string
  readonly VITE_CLOUDFLARE_ACCESS_KEY_ID: string
  readonly VITE_CLOUDFLARE_SECRET_ACCESS_KEY: string
  readonly VITE_CLOUDFLARE_R2_BUCKET: string
  readonly VITE_CLOUDFLARE_R2_PUBLIC_URL: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  readonly VITE_PUBLIC_SITE_URL?: string
  readonly BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
