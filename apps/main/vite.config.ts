import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig(({ mode }) => {
  // Production environment variables
  const isProd = mode === 'production';
  const earthwormTarget = isProd ? 'https://your-earthworm-app.vercel.app' : 'http://localhost:3000';
  const earthwormApiTarget = isProd ? 'https://your-earthworm-app.vercel.app/api' : 'http://localhost:3001/api';

  return {
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: false,
      proxy: {
        // Proxy Earthworm (Sentence Mastery) requests to dev server
        '/earthworm': {
          target: earthwormTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/earthworm/, ''),
          secure: isProd,
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Earthworm proxy error (service may not be running):', err.message);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Making request to Earthworm:', req.method, req.url);
            });
          },
        },
        // Proxy Sentence Mastery API requests (with fallback handling)
        '/earthworm-api': {
          target: earthwormApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/earthworm-api/, '/api'),
          secure: isProd,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Earthworm API proxy error (service may not be running):', err.message);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Making request to Earthworm API:', req.method, req.url);
            });
          },
        },
        // Proxy Supabase functions for local development
        '/functions/v1': {
          target: 'http://localhost:54321/functions/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/functions\/v1/, ''),
          secure: false,
        },
        // Proxy API requests to Supabase functions
        '/api': {
          target: isProd ? 'https://cuumxmfzhwljylbdlflj.supabase.co/functions/v1' : 'http://localhost:54321/functions/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          secure: isProd,
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
