import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    // Resolves the `~/` alias from tsconfig.json.
    tsconfigPaths: true,
  },
  css: {
    preprocessorOptions: {
      // Lets components write `@use "styles"` instead of a relative path.
      scss: { loadPaths: [decodeURIComponent(new URL("app", import.meta.url).pathname)] },
    },
  },
});
