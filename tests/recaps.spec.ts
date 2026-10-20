import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('short report follows time, language and team; evidence seeks and text export is grounded',async({page})=>{
 const modelRequests:string[]=[];page.on('request',r=>{if(r.url().endsWith('/api/explain'))modelRequests.push(r.url())});
 await page.goto('/');await page.getByLabel('Match scenario').selectOption('tactics');
 await page.getByLabel('Match time',{exact:true}).fill('18');
 const report=page.getByTestId('short-report');
 await expect(report).toContainText('Switch of play');
 await expect(report).toContainText('Local overload');
 await expect(report).toContainText('Team Northbridge');
 const downloadPromise=page.waitForEvent('download');
 await report.getByRole('button',{name:'Download short report',exact:true}).click();
 const download=await downloadPromise;const text=await readFile((await download.path())!,'utf8');
 expect(text).toContain('Evidence:');expect(text).toContain('e2');expect(text).toContain('synthetic');
 await report.getByRole('button',{name:/62:11.*Switch of play/}).click();
 await expect(page.getByTestId('clock')).toHaveText('62:11');
 await expect(page.locator('canvas')).toHaveAttribute('data-insight','switch-e2');
 await page.getByLabel('Match time',{exact:true}).fill('10.9');
 await expect(report).not.toContainText('Switch of play');
 await page.getByLabel('Match time',{exact:true}).fill('18');
 await page.getByLabel('Select player').selectOption('12');
 await expect(report).toContainText('Riverside');
 await expect(report).not.toContainText('Switch of play');
 await page.getByLabel('Language',{exact:true}).selectOption('de');
 await expect(report).toContainText('Spiel-Kurzbericht');
 await expect(report).toContainText('kein taktisches Muster');
 expect(modelRequests).toEqual([]);
});

test('Foundry provenance is visible and exported only for the current replay context',async({page})=>{
 await page.route('**/api/health',r=>r.fulfill({json:{status:'ok',ai_enabled:true}}));
 await page.route('**/api/explain',async route=>{
  const req=route.request().postDataJSON();
  const response=await page.request.get(`/api/analysis?at=${req.at}&player_id=${req.player_id}&scenario=${req.scenario}&language=${req.language}&mode=${req.mode}`);
  const local=(await response.json()).recap;
  await route.fulfill({json:{...local,source:'foundry',agent:{status:'completed',model_calls:3,tools:[{name:'get_passing_statistics',status:'ok',claim_ids:['statistics:passing']}],prompt_tokens:120,completion_tokens:40,latency_ms:800,reason:null}}});
 });
 await page.goto('/');await page.getByLabel('Match time',{exact:true}).fill('18');
 const report=page.getByTestId('short-report');
 await report.getByRole('button',{name:'Select with Foundry'}).click();
 await expect(report).toContainText('Evidence selected by Foundry');
 await report.locator('summary').click();
 await expect(report.getByTestId('agent-trace')).toContainText('3 model calls · 160 tokens');
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Export report',exact:true}).click();
 const file=await downloaded;const json=JSON.parse(await readFile((await file.path())!,'utf8'));
 expect(json.schema_version).toBe(2);expect(json.short_report.source).toBe('foundry');
 await page.getByLabel('Match time',{exact:true}).fill('0');
 await expect(report).not.toContainText('Evidence selected by Foundry');
 await expect(report).toContainText('Calculated from observed data');
});
