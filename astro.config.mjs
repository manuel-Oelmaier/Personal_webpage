import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://manueloelmaier.de',
  outDir: './dist',
  build: {
    format: 'file'
  }
});
