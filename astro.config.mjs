// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://roberto.design',
  vite: {
    server: {
      // il brano in onda della radio Purple Piper (cella radio): il server della radio non si lascia leggere da un
      // altro sito, quindi si passa dal nostro. Sul sito pubblicato lo fa Vercel (rewrites in vercel.json)
      proxy: {
        '/radio/stato': {
          target: 'https://s2.shoutitaly.com',
          changeOrigin: true,
          rewrite: () => '/radio/8030/stats?sid=1&json=1',
        },
      },
    },
  },
});
