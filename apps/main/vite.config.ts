import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig(({ mode }) => {
  // Production environment variables
  const isProd = mode === 'production';
  const earthwormTarget = isProd ? 'https://sentence-mastery.yourdomain.com' : 'http://localhost:3000';
  const earthwormApiTarget = isProd ? 'https://api.sentence-mastery.yourdomain.com' : 'http://localhost:3000';

  return {
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      proxy: {
        // Proxy Earthworm (Sentence Mastery) requests to dev server
        '/earthworm': {
          target: earthwormTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/earthworm/, ''),
          secure: isProd,
          ws: true,
        },
        // Proxy Sentence Mastery API requests
        '/earthworm-api': {
          target: earthwormApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/earthworm-api/, ''),
          secure: isProd,
        },
      },
    },
    build: {
      // Production build configuration
      outDir: 'dist',
      sourcemap: !isProd,
      minify: isProd ? 'terser' : false,
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
