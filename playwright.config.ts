import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node e2e/supabase-fixture.mjs',
      url: 'http://127.0.0.1:54329/health',
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: `node node_modules/next/dist/bin/next ${process.env.COMMUNITY_E2E_PRODUCTION === 'true' ? 'start' : 'dev'} --hostname 127.0.0.1 -p 3100`,
      url: 'http://127.0.0.1:3100/comunidad',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        COMMUNITY_SITE_URL: 'http://127.0.0.1:3100',
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'community-test-anon-key',
        SUPABASE_SERVICE_KEY: 'community-test-service-key',
        COMMUNITY_ENABLED: 'true',
        COMMUNITY_PRIVACY_CONTROLLER: 'Responsable de prueba local',
        COMMUNITY_CONTACT_EMAIL: 'comunidad@example.test',
      },
    },
  ],
})
