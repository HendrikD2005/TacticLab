import {test,expect} from '@playwright/test';

test('assistant binds named-player evidence to replay time and opens pitch markings',async({page})=>{
 await page.goto('/');await page.getByLabel('Match scenario').selectOption('tactics');
 await page.getByLabel('Match time',{exact:true}).fill('10.9');
 await page.getByRole('button',{name:'Analyse switches',exact:true}).click();
 await expect(page.locator('.explanation')).toContainText('No confirmed');
 await expect(page.locator('.evidence-scene')).toHaveCount(0);
 await page.getByLabel('Match time',{exact:true}).fill('18');
 await page.getByLabel('Your analysis question').fill('Which switches did Theo Wolf play?');
 await page.getByRole('button',{name:'Ask question',exact:true}).click();
 await expect(page.getByTestId('answer-context')).toContainText('Theo Wolf');
 await expect(page.getByTestId('answer-context')).toContainText('62:18');
 await expect(page.locator('.evidence-scene')).toHaveCount(1);
 await page.locator('.evidence-scene').click();
 await expect(page.getByTestId('clock')).toHaveText('62:11');
 await expect(page.locator('canvas')).toHaveAttribute('data-pattern','switch_of_play');
 await page.getByLabel('Match time',{exact:true}).fill('18');
 await page.getByRole('button',{name:'Analyse overloads',exact:true}).click();
 await page.locator('.evidence-scene').click();
 await expect(page.locator('canvas')).toHaveAttribute('data-pattern','local_overload');
 await page.getByLabel('Language',{exact:true}).selectOption('de');
 await page.getByLabel('Deine Analysefrage').fill('Welche Überzahl hatte Finn Roth?');
 await page.getByRole('button',{name:'Frage stellen',exact:true}).click();
 await expect(page.getByTestId('answer-context')).toContainText('Finn Roth');
 await expect(page.locator('.explanation')).toContainText('Überzahl');
 await page.setViewportSize({width:360,height:900});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'artifacts/assistant-mobile.png',fullPage:true});
});

test('seeking within the same second discards delayed assistant responses',async({page})=>{
 await page.goto('/');await page.getByLabel('Match time',{exact:true}).fill('18');
 let received!:()=>void;const started=new Promise<void>(resolve=>received=resolve);
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('**/api/explain',async route=>{const response=await route.fetch();received();await gate;await route.fulfill({response})});
 await page.getByRole('button',{name:'Analyse player',exact:true}).click();
 await started;
 await page.getByLabel('Match time',{exact:true}).fill('18.1');release();
 await expect(page.locator('.explanation')).toHaveCount(0);
 await page.getByRole('button',{name:'Analyse player',exact:true}).click();
 await expect(page.locator('.explanation')).toBeVisible();
 await page.getByLabel('Select player').selectOption('1');
 await expect(page.locator('.explanation')).toHaveCount(0);
});
