import { defineConfig } from "@playwright/test";
export default defineConfig({
  use: { trace: "on", screenshot: "on", video: "on" },
  timeout: 60000,
});
