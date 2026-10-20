import {defineConfig,devices} from '@playwright/test';

const externalBaseURL=process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
 testDir:'./tests',
 outputDir:'artifacts/test-results',
 forbidOnly:!!process.env.CI,
 workers:process.env.CI?1:undefined,
 retries:0,
 globalTimeout:process.env.CI?6*60*1000:undefined,
 reporter:process.env.CI
  ?[['list'],['html',{outputFolder:'artifacts/playwright-report',open:'never'}],['junit',{outputFile:'artifacts/playwright.xml'}]]
  :'list',
 use:{
  baseURL:externalBaseURL||'http://127.0.0.1:5173',
  ...devices['Desktop Chrome'],
  channel:process.env.CI?undefined:'msedge',
  screenshot:'only-on-failure',
  trace:'retain-on-failure',
 },
 webServer:externalBaseURL?undefined:{
  command:'npm run dev',
  url:'http://127.0.0.1:5173',
  reuseExistingServer:!process.env.CI,
  timeout:60000,
 },
});
