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
      host: "0.0.0.0",
      port: 3003,
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
      chunkSizeWarningLimit: 1000, // Increase chunk size limit to avoid warnings
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Put Supabase client in its own chunk to avoid conflicts
            if (id.includes('supabase') || id.includes('@supabase')) {
              return 'supabase';
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
