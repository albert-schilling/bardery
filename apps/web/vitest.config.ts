// Separate from vite.config.ts because the React Router plugin doesn't run under Vitest.
import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "web",
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
