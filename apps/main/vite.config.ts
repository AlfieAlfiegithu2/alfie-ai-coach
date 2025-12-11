import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig(({ mode }) => {
  // Production environment variables
  const isProd = mode === 'production';
  // Check if local Supabase is available (default to false for safety)
  const useLocalSupabase = process.env.USE_LOCAL_SUPABASE === 'true' && !isProd;
  const supabaseUrl = useLocalSupabase
    ? 'http://localhost:54321/functions/v1'
    : 'https://cuumxmfzhwljylbdlflj.supabase.co/functions/v1';
  const earthwormTarget = isProd ? 'https://your-earthworm-app.vercel.app' : 'http://localhost:3000';
  const earthwormApiTarget = isProd ? 'https://your-earthworm-app.vercel.app/api' : 'http://localhost:3001/api';

  return {
    // Ensure consistent base path in dev and production
    base: '/',
    server: {
      host: "localhost",
      port: 3009,
      strictPort: false,
      proxy: {
        // Earthworm proxy temporarily disabled - using dedicated component instead
        // '/earthworm': {
        //   target: earthwormTarget,
        //   changeOrigin: true,
        //   rewrite: (path) => path.replace(/^\/earthworm/, ''),
        //   secure: isProd,
        //   ws: true,
        //   configure: (proxy, _options) => {
        //     proxy.on('error', (err, _req, _res) => {
        //       console.log('Earthworm proxy error (service may not be running):', err.message);
        //     });
        //     proxy.on('proxyReq', (proxyReq, req, _res) => {
        //       console.log('Making request to Earthworm:', req.method, req.url);
        //     });
        //   },
        // },
        // '/earthworm-api': {
        //   target: earthwormApiTarget,
        //   changeOrigin: true,
        //   rewrite: (path) => path.replace(/^\/earthworm-api/, '/api'),
        //   secure: isProd,
        //   configure: (proxy, _options) => {
        //     proxy.on('error', (err, _req, _res) => {
        //       console.log('Earthworm API proxy error (service may not be running):', err.message);
        //     });
        //     proxy.on('proxyReq', (proxyReq, req, _res) => {
        //       console.log('Making request to Earthworm API:', req.method, req.url);
        //     });
        //   },
        // },
        // Proxy Supabase functions - defaults to production for reliability
        '/functions/v1': {
          target: supabaseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/functions\/v1/, ''),
          secure: !useLocalSupabase,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, res) => {
              // If localhost isn't available, log warning but don't crash
              if (useLocalSupabase && err.message.includes('ECONNREFUSED')) {
                console.warn('⚠️ Local Supabase not running. Set USE_LOCAL_SUPABASE=true only when Supabase local is running.');
                console.warn('💡 Falling back to production Supabase. To use local, run: supabase start');
              } else {
                console.error('Proxy error:', err.message);
              }
            });
          },
        },
        // Proxy API requests to Supabase functions - defaults to production for reliability
        '/api': {
          target: supabaseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          secure: !useLocalSupabase,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, res) => {
              // If localhost isn't available, log warning but don't crash
              if (useLocalSupabase && err.message.includes('ECONNREFUSED')) {
                console.warn('⚠️ Local Supabase not running. Set USE_LOCAL_SUPABASE=true only when Supabase local is running.');
                console.warn('💡 Falling back to production Supabase. To use local, run: supabase start');
              } else {
                console.error('Proxy error:', err.message);
              }
            });
          },
        },
      },
    },
    build: {
      // Production build configuration
      outDir: 'dist',
      sourcemap: !isProd,
      minify: isProd ? 'terser' : false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Split node_modules into separate chunks for better caching
            if (id.includes('node_modules')) {
              // React core
              if (id.includes('react-dom')) {
                return 'vendor-react-dom';
              }
              if (id.includes('/react/') || id.includes('react-router') || id.includes('react-hook-form')) {
                return 'vendor-react';
              }
              // Supabase
              if (id.includes('supabase') || id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              // UI components (Radix, etc.)
              if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge')) {
                return 'vendor-ui';
              }
              // Charts and visualization
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              // Date utilities
              if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) {
                return 'vendor-date';
              }
              // Animation libraries - exclude dotlottie since it loads externally
              if (id.includes('framer-motion')) {
                return 'vendor-animation';
              }
              // Markdown/editor
              if (id.includes('marked') || id.includes('highlight') || id.includes('prism')) {
                return 'vendor-editor';
              }
              // i18n
              if (id.includes('i18next') || id.includes('react-i18next')) {
                return 'vendor-i18n';
              }
              // Other large dependencies
              if (id.includes('zod') || id.includes('tanstack') || id.includes('@tanstack')) {
                return 'vendor-utils';
              }
            }
          },
        },
      },
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },
  };
});
