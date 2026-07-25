/// <reference types="node" />
import { defineConfig, devices } from "@playwright/test";

const PORT = 4300;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    // --host 127.0.0.1 pins the bind address: on some hosts vite's default
    // "localhost" binding doesn't cover 127.0.0.1, which the health check below
    // (and CI) hit explicitly.
    command: `pnpm exec vite --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Headless Chromium on CI needs a software GL renderer for the PixiJS
        // WebGL context the game canvas depends on.
        launchOptions: { args: ["--use-gl=swiftshader", "--ignore-gpu-blocklist"] },
      },
    },
  ],
});
