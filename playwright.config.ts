import { defineConfig, devices } from "@playwright/test";
import { config as dotenvConfig } from "dotenv";
import path from "path";

// Configuración local primero; las credenciales de prueba opcionales pueden
// sobreescribirse desde .env.test.local o, preferentemente, desde el entorno.
dotenvConfig({ path: path.resolve(__dirname, ".env.local") });
dotenvConfig({ path: path.resolve(__dirname, ".env.test.local"), override: true });

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseUrl ?? "http://localhost:3001";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/*.spec.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  ...(externalBaseUrl
    ? {}
    : {
        webServer: {
          command: "npm run dev -- --port 3001",
          url: `${baseURL}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}`,
          reuseExistingServer: false,
          timeout: 120_000,
        },
      }),
});
