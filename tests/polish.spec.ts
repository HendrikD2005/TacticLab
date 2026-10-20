import {test,expect} from '@playwright/test';

for(const viewport of [{width:1440,height:900},{width:1366,height:768}]){
 test(`tactical example puts pitch and grounded explanation in first screen ${viewport.width}`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/');
  await page.getByRole('button',{name:'Show tactical example',exact:true}).click();
  await expect(page.getByTestId('clock')).toHaveText('62:18');
  await expect(page.locator('canvas')).toHaveAttribute('data-insight','switch-e2');
  const report=page.getByTestId('short-report');
  await expect(report).toContainText('Switch of play');
  const canvas=await page.locator('canvas').boundingBox();
  const card=await report.boundingBox();
  expect(canvas!.y).toBeLessThan(400);expect(canvas!.y+canvas!.height).toBeLessThan(viewport.height);
  const scrubber=await page.getByLabel('Match time',{exact:true}).boundingBox();
  expect(scrubber!.y+scrubber!.height).toBeLessThan(viewport.height);
  expect(card!.y).toBeLessThan(400);expect(card!.y+card!.height).toBeLessThan(viewport.height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({animations:'disabled',path:`artifacts/first-screen-${viewport.width}.png`});
  await page.getByRole('button',{name:'Light theme',exact:true}).click();
  await page.screenshot({animations:'disabled',path:`artifacts/first-screen-light-${viewport.width}.png`});
 });
}

test('unsupported named-player goal questions do not become pass statistics',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Show tactical example',exact:true}).click();
 await page.getByLabel('Your analysis question').fill('Did Theo Wolf score a hat trick?');
 await page.getByRole('button',{name:'Ask question',exact:true}).click();
 await expect(page.locator('.explanation')).toContainText('Ask about one topic');
 await expect(page.locator('.assistant-evidence .evidence-scene')).toHaveCount(0);
 await page.getByLabel('Language',{exact:true}).selectOption('de');
 await page.getByLabel('Deine Analysefrage').fill('Hat Theo Wolf einen Hattrick erzielt?');
 await page.getByRole('button',{name:'Frage stellen',exact:true}).click();
 await expect(page.locator('.assistant-evidence .evidence-scene')).toHaveCount(0);
 await expect(page.locator('.explanation')).not.toContainText('wurden');
 await page.setViewportSize({width:360,height:900});
 await page.evaluate(()=>window.scrollTo(0,0));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({animations:'disabled',path:'artifacts/polish-mobile.png',fullPage:true});
});
