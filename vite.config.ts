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
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: false,
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
