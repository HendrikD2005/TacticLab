import {test,expect} from '@playwright/test';

test('local typography loads and the chosen theme survives a reload',async({page})=>{
 const fonts:string[]=[];
 page.on('request',request=>{if(request.resourceType()==='font')fonts.push(request.url())});
 await page.goto('/');
 await expect(page.getByRole('button',{name:'Dark theme',exact:true})).toBeVisible();
 const loaded=await page.evaluate(async()=>{
  const faces=await document.fonts.load('550 14px Inter');
  return faces.length>0&&faces.every(face=>face.status==='loaded');
 });
 expect(loaded).toBeTruthy();
 expect(fonts.length).toBeGreaterThan(0);
 expect(fonts.every(url=>new URL(url).origin===new URL(page.url()).origin)).toBeTruthy();
 await page.getByRole('button',{name:'Dark theme',exact:true}).click();
 await page.reload();
 await expect(page.getByRole('button',{name:'Light theme',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Light theme',exact:true}).click();
 await page.reload();
 await expect(page.getByRole('button',{name:'Dark theme',exact:true})).toBeVisible();
});

test('native controls retain keyboard operation and visible focus',async({page})=>{
 await page.goto('/');
 const fan=page.getByRole('button',{name:'Fan',exact:true});
 await fan.focus();
 await page.keyboard.press('Space');
 await expect(fan).toHaveAttribute('aria-pressed','true');
 expect(await fan.evaluate(element=>getComputedStyle(element).outlineStyle)).toBe('solid');
 const scenario=page.getByLabel('Match scenario');
 await scenario.focus();
 await page.keyboard.press('End');
 await page.keyboard.press('Enter');
 await expect(scenario).toHaveValue('tactics');
 const timeline=page.getByLabel('Match time',{exact:true});
 await timeline.focus();
 await page.keyboard.press('ArrowRight');
 await expect(timeline).toHaveValue('0.1');
 await expect(page.getByRole('button',{name:'Play replay',exact:true})).toBeVisible();
});

test.describe('narrow touch interface',()=>{
 test.use({viewport:{width:360,height:900},isMobile:true,hasTouch:true});
 test('German preferences and workspace controls fit without horizontal scrolling',async({page})=>{
  await page.goto('/');
  await page.getByLabel('Language',{exact:true}).selectOption('de');
  await page.getByRole('button',{name:'Taktikbeispiel zeigen',exact:true}).click();
  await page.locator('.personalization summary').click();
  await page.getByLabel('Lieblingsteam',{exact:true}).selectOption('home');
  await page.getByLabel('Lieblingsspieler',{exact:true}).selectOption('Theo Wolf');
  await page.getByRole('button',{name:'Fan',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  for(const name of ['Wiedergabe starten','Hineinzoomen','Herauszoomen']){
   const action=page.getByRole('button',{name,exact:true});
   const box=await action.boundingBox();
   expect(box!.width).toBeGreaterThanOrEqual(44);
   expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button',{name:'Ereignisse',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.getByRole('button',{name:'Szene merken',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:'artifacts/swiss-touch-notebook.png',fullPage:true});
 });
});
