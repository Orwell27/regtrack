import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["observatorio.spec.ts", "observatorio-library.spec.ts", "mandato.spec.ts"],
  workers: 1,
  retries: 0,
  timeout: 45000,
  use: {
    baseURL: process.env.OBSERVATORIO_TEST_URL ?? "http://127.0.0.1:3127",
    trace: "retain-on-failure",
  },
});
