import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test.use({locale:'de-DE'}); // The requested default is English, even with a German browser.

test('catalogues have matching keys, plural forms and interpolation arguments',()=>{
 const en=JSON.parse(readFileSync('frontend/src/i18n/en.json','utf8'));
 const de=JSON.parse(readFileSync('frontend/src/i18n/de.json','utf8'));
 expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
 const args=(value:string)=>[...value.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
 for(const key of Object.keys(en)){
  expect(typeof de[key]).toBe(typeof en[key]);
  if(typeof en[key]==='string')expect(args(de[key])).toEqual(args(en[key]));
  else {expect(Object.keys(de[key]).sort()).toEqual(Object.keys(en[key]).sort());for(const form of Object.keys(en[key]))expect(args(de[key][form])).toEqual(args(en[key][form]));}
 }
});

test('English default, translated evidence, locale formatting and persistent preference',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page).toHaveTitle('TacticLab · Match analysis');
 await expect(page.getByRole('heading',{name:'Understand the match'})).toBeVisible();
 await expect(page.getByText('Midfielder · NTH',{exact:true})).toBeVisible();
 await page.getByLabel('Match time',{exact:true}).fill('9');
 await page.getByRole('button',{name:/62:07.*Pressure escape/}).click();
 await expect(page.getByTestId('tactical-detail')).toContainText('8.1');
 await expect(page.getByTestId('tactical-detail')).toContainText('1 opponent');
 await page.getByLabel('Select player').selectOption('5');
 await expect(page.getByText('1 pass attempt in the replay so far',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();
 const canvas=await page.locator('canvas').elementHandle();
 const zoom=await page.locator('canvas').evaluate(el=>(el as HTMLCanvasElement & {__zoom:{k:number}}).__zoom.k);
 await page.getByLabel('Language',{exact:true}).selectOption('de');
 await expect(page.locator('html')).toHaveAttribute('lang','de');
 await expect(page).toHaveTitle('TacticLab · Spielanalyse');
 await expect(page.getByTestId('clock')).toHaveText('62:09');
 await expect(page.getByLabel('Spieler auswählen')).toHaveValue('5');
 await expect(page.getByTestId('tactical-detail')).toContainText('8,1');
 await expect(page.getByText('1 Passversuch im bisherigen Replay',{exact:true})).toBeVisible();
 expect(await canvas!.evaluate(el=>el.isConnected)).toBeTruthy();
 expect(await page.locator('canvas').evaluate(el=>(el as HTMLCanvasElement & {__zoom:{k:number}}).__zoom.k)).toBe(zoom);
 await page.getByRole('button',{name:'Pressing untersuchen',exact:true}).click();
 await expect(page.locator('.explanation')).toContainText('Gegnerabstand');
 await page.getByLabel('Sprache',{exact:true}).selectOption('en');
 await expect(page.locator('.explanation')).toHaveCount(0);
 await page.getByRole('button',{name:'Analyse pressing',exact:true}).click();
 await expect(page.locator('.explanation')).toContainText('Nearest opponent');
 await page.getByRole('button',{name:'Fan',exact:true}).click();
 await expect(page.getByTestId('tactical-detail')).toContainText('beyond the pressure');
 await page.getByLabel('Language',{exact:true}).selectOption('de');
 await page.getByLabel('Spielszenario').selectOption('variation');
 await expect(page.getByLabel('Sprache',{exact:true})).toHaveValue('de');
 await page.reload();
 await expect(page.getByRole('heading',{name:'Spielgeschehen einordnen'})).toBeVisible();
 await expect(page.getByLabel('Sprache',{exact:true})).toHaveValue('de');
 expect(errors).toEqual([]);
});

test('loading errors translate in place and retry works',async({page})=>{
 await page.route('**/api/match?*',route=>route.abort());await page.goto('/');
 await expect(page.getByRole('alert')).toHaveText('Could not load the match. Please check that the backend is running.');
 await page.getByLabel('Language',{exact:true}).selectOption('de');
 await expect(page.getByRole('alert')).toContainText('Spieldaten konnten nicht geladen werden');
 await page.unroute('**/api/match?*');await page.getByRole('button',{name:'Erneut versuchen'}).click();
 await expect(page.getByLabel('Spieler auswählen')).toBeVisible();
});

test('invalid stored locale falls back to English and mobile controls fit both languages',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('tl-language','fr'));
 await page.setViewportSize({width:360,height:900});await page.goto('/');
 await expect(page.getByLabel('Select player')).toBeVisible();
 await page.getByLabel('Match time',{exact:true}).fill('9');
 await page.getByRole('button',{name:/62:07.*Pressure escape/}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.getByLabel('Language',{exact:true}).selectOption('de');
 await expect(page.getByTestId('tactical-detail')).toContainText('Gegnerabstand');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('unavailable storage does not prevent switching language',async({page})=>{
 await page.addInitScript(()=>{
  Storage.prototype.getItem=()=>{throw new Error('Storage disabled')};
  Storage.prototype.setItem=()=>{throw new Error('Storage disabled')};
 });
 await page.goto('/');await expect(page.getByLabel('Select player')).toBeVisible();
 await page.getByLabel('Language',{exact:true}).selectOption('de');
 await expect(page.getByLabel('Spieler auswählen')).toBeVisible();
});
