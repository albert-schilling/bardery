import type { Config } from "@react-router/dev/config";

export default {
  // SPA mode: the build is static files for Static Web Apps, with no server rendering (Q80).
  ssr: false,
  // `src/`, the source folder of every project in this workspace, instead of the default `app/`.
  appDirectory: "src",
} satisfies Config;
