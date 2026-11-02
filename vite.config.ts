import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Project pages on GitHub Pages are served from /<repo>/. Override with SITE_BASE for a custom domain.
export default defineConfig({
  base: process.env.SITE_BASE ?? '/alpha-studios/',
  plugins: [react()],
});
