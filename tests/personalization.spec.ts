import {test,expect} from '@playwright/test';
import {readPreferences} from '../frontend/src/lib/preferences';

test('invalid preferences are safe',()=>{
 expect(readPreferences('{')).toEqual({team:null,player:null,mode:'analyst',personal:true});
 expect(readPreferences('{"team":"other","player":42,"mode":"other"}')).toEqual({team:null,player:null,mode:'analyst',personal:true});
});

test('favourites persist and fan explanations keep replay evidence',async({page})=>{
 await page.goto('/');await page.getByLabel('Match scenario').selectOption('tactics');
 await page.getByLabel('Favourite team',{exact:true}).selectOption('away');
 await page.getByLabel('Favourite player',{exact:true}).selectOption('Theo Wolf');
 await page.getByRole('button',{name:'Fan',exact:true}).click();
 await page.getByLabel('Match time',{exact:true}).fill('18');
 await expect(page.getByRole('button',{name:/62:09.*Switch of play/})).toBeVisible();
 await expect(page.getByRole('button',{name:/62:16.*Local overload/})).toHaveCount(0);
 await page.getByRole('button',{name:/62:09.*Switch of play/}).click();
 await expect(page.getByTestId('tactical-detail')).toContainText('Why it matters');
 await expect(page.getByTestId('tactical-detail')).toContainText('more room');
 await page.getByRole('button',{name:'Analyse switches',exact:true}).click();
 await expect(page.getByTestId('answer-context')).toContainText('Riverside');
 await expect(page.locator('.explanation')).toContainText('No confirmed');
 await page.getByRole('button',{name:'Watch favourite player',exact:true}).click();
 await expect(page.getByLabel('Select player')).toHaveValue('1');
 await expect(page.getByTestId('clock')).toHaveText('62:11');
 await page.reload();
 await expect(page.getByLabel('Favourite player',{exact:true})).toHaveValue('Theo Wolf');
 await expect(page.getByLabel('Favourite team',{exact:true})).toHaveValue('away');
 await expect(page.getByRole('button',{name:'Fan',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('Match scenario').selectOption('tactics');
 await page.getByLabel('Match time',{exact:true}).fill('18');
 await page.getByRole('button',{name:'Favourite moments only',exact:true}).click();
 await page.getByRole('button',{name:/62:16.*Local overload/}).click();
 await expect(page.getByTestId('tactical-detail')).toContainText('more passing options');
 await page.getByLabel('Your analysis question').fill('Overloads for Finn Roth');
 await page.getByRole('button',{name:'Ask question',exact:true}).click();
 await expect(page.locator('.explanation')).toContainText('more passing options');
 await page.getByRole('button',{name:'Analyst',exact:true}).click();
 await expect(page.locator('.explanation')).toHaveCount(0);
 await expect(page.getByTestId('tactical-detail')).toContainText('15 m');
 await page.getByRole('button',{name:'Fan',exact:true}).click();
 await page.getByLabel('Language',{exact:true}).selectOption('de');
 await expect(page.getByTestId('tactical-detail')).toContainText('Warum das wichtig ist');
 await page.setViewportSize({width:360,height:900});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'artifacts/personalization-mobile.png',fullPage:true});
});

test('preferences survive workspace changes without browser storage',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error('blocked')};Storage.prototype.getItem=()=>{throw new Error('blocked')}});
 await page.goto('/');await page.getByLabel('Favourite player',{exact:true}).selectOption('Finn Roth');
 await page.getByLabel('Favourite team',{exact:true}).selectOption('home');
 await page.getByRole('button',{name:'Fan',exact:true}).click();
 await expect(page.getByRole('region',{name:'Your match preferences'})).toContainText('only for this visit');
 await page.getByLabel('Match scenario').selectOption('tactics');
 await expect(page.getByLabel('Favourite player',{exact:true})).toHaveValue('Finn Roth');
 await page.getByRole('button',{name:'Live simulation',exact:true}).click();
 await expect(page.getByLabel('Favourite player',{exact:true})).toHaveValue('Finn Roth');
 await expect(page.getByRole('button',{name:'Fan',exact:true})).toHaveAttribute('aria-pressed','true');
});
