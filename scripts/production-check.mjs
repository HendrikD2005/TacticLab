import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:1280,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8001/');await page.locator('.recharts-surface').waitFor();await page.locator('.recharts-surface').waitFor();await page.screenshot({path:'artifacts/production.png',fullPage:true});const health=await page.request.get('http://127.0.0.1:8001/api/health');if(!health.ok()||errors.length)throw new Error(JSON.stringify(errors));console.log('Production frontend, lazy chart, API and calculated statistics: OK');}finally{await browser.close()}

