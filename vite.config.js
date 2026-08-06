import { defineConfig } from 'vite';

export default defineConfig({
  // Relative assets work at a custom domain, Netlify, and a GitHub Pages subpath.
  base: './',
  // GitHub Pages can publish this directory directly from the main branch.
  build: {
    outDir: 'docs',
  },
});
