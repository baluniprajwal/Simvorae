import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {loadEnv} from 'vite';
import {defineConfig} from 'vitest/config';

export default defineConfig(({command, mode}) => {
  // Without this the deployed site silently calls http://localhost:5000 and every request fails.
  if (command === 'build' && mode === 'production') {
    const apiBaseUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL;
    if (!apiBaseUrl || /localhost|127\.0\.0\.1/.test(apiBaseUrl)) {
      throw new Error('VITE_API_BASE_URL must be set to the deployed backend URL for production builds.');
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      clearMocks: true,
      restoreMocks: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
