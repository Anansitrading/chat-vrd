import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        // Support both local development and Vercel deployment
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY_BACKUP_1': JSON.stringify(env.GEMINI_API_KEY_BACKUP_1 || process.env.GEMINI_API_KEY_BACKUP_1),
        'process.env.GEMINI_API_KEY_BACKUP_2': JSON.stringify(env.GEMINI_API_KEY_BACKUP_2 || process.env.GEMINI_API_KEY_BACKUP_2)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
