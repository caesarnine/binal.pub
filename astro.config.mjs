import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://binal.pub',
  trailingSlash: 'always',
  output: 'static',
  markdown: {
    shikiConfig: { theme: 'github-dark', langs: ['python', 'json', 'dockerfile', 'yaml', 'bash'] },
  },
  devToolbar: { enabled: false },
});
