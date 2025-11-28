import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "apps/main");

// Root vite config for Lovable - points to apps/main as the application root
// This prevents Lovable from trying to build from /src which doesn't exist
export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  
  return {
    root: appRoot,
    // Ensure consistent base path in dev and production
    base: '/',
    server: {
      host: "0.0.0.0",
      port: 3006,
      strictPort: false,
      proxy: {
        '/rest/v1': {
          target: 'https://cuumxmfzhwljylbdlflj.supabase.co',
          changeOrigin: true,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Sending Request to Supabase:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received Response from Supabase:', proxyRes.statusCode, req.url);
            });
          },
        },
        '/auth/v1': {
          target: 'https://cuumxmfzhwljylbdlflj.supabase.co',
          changeOrigin: true,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Sending Auth Request to Supabase:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received Auth Response from Supabase:', proxyRes.statusCode, req.url);
            });
          },
        },
        '/storage/v1': {
          target: 'https://cuumxmfzhwljylbdlflj.supabase.co',
          changeOrigin: true,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Sending Storage Request to Supabase:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received Storage Response from Supabase:', proxyRes.statusCode, req.url);
            });
          },
        },
      },
    },
    build: {
      outDir: path.resolve(appRoot, "dist"),
      sourcemap: !isDev,
      minify: isDev ? false : "terser",
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("supabase") || id.includes("@supabase")) {
              return "supabase";
            }
          },
        },
      },
    },
    plugins: [
      react(),
      isDev && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(appRoot, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
  };
});
