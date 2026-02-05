import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://manueloelmaier.de',
  outDir: './dist',
  build: {
    // This will take that 2.2 KiB CSS and put it directly into the HTML
    inlineStylesheets: 'always',
  },
});
