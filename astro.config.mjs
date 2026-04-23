import { defineConfig } from 'astro/config';
import remarkRustCodeblock from './src/plugins/remark-rust-codeblock.mjs';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkRustCodeblock],
  },
});
