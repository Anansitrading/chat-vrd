import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { execSync } from 'child_process';

// Get build version from git commit hash or use timestamp
function getBuildVersion(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return Date.now().toString();
  }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const buildVersion = process.env.BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || getBuildVersion();
    const buildDate = new Date().toISOString();
    
    return {
      define: {
        // Support both local development and Vercel deployment
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY_BACKUP_1': JSON.stringify(env.GEMINI_API_KEY_BACKUP_1 || process.env.GEMINI_API_KEY_BACKUP_1),
        'process.env.GEMINI_API_KEY_BACKUP_2': JSON.stringify(env.GEMINI_API_KEY_BACKUP_2 || process.env.GEMINI_API_KEY_BACKUP_2),
        'process.env.PERPLEXITY_API_KEY': JSON.stringify(env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY),
        'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || process.env.SUPABASE_URL),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY),
        // Build versioning for cache-busting and version tracking
        'process.env.BUILD_VERSION': JSON.stringify(buildVersion),
        'process.env.BUILD_DATE': JSON.stringify(buildDate)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Enable content-based hashing for cache-busting
        rollupOptions: {
          output: {
            // Generate unique filenames with content hashes
            entryFileNames: `assets/[name].[hash].js`,
            chunkFileNames: `assets/[name].[hash].js`,
            assetFileNames: `assets/[name].[hash].[ext]`
          }
        },
        // Generate source maps for debugging
        sourcemap: true,
        // Set a clear output directory
        outDir: 'dist'
      }
    };
});
