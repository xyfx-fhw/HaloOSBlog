import { defineConfig } from 'astro/config';
import remarkRustCodeblock from './src/plugins/remark-rust-codeblock.mjs';
import remarkBoldClass from './src/plugins/remark-bold-class.mjs';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkRustCodeblock, remarkBoldClass],
  },
});
