import {test,expect} from '@playwright/test';
test('replay, real analytics, selection and free explanation',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await expect(page.getByRole('heading',{name:'Spielgeschehen einordnen'})).toBeVisible();
 await page.getByLabel('Spielzeit',{exact:true}).fill('14');
 const initial=await (await page.request.get('/api/analysis?at=14&player_id=7')).json(); await expect(page.getByTestId('progressive')).toHaveText(String(initial.player.progressive));
 await page.getByRole('button',{name:'Hineinzoomen'}).click();
 await page.getByLabel('Spieler auswählen').selectOption('10');
 await expect(page.getByText('Nils Beck',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Spieler folgen',exact:true}).click();
 await expect(page.getByRole('button',{name:'Folgemodus beenden'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Ganzes Feld'}).click();
 await page.getByLabel('Spielzeit',{exact:true}).fill('52');
 await expect(page.getByTestId('clock')).toHaveText('62:52');
 await expect(page.getByText('0 %',{exact:true}).first()).toBeVisible();
 await page.getByRole('button',{name:'Spieler einordnen'}).click();
 await expect(page.getByText(/wurden 0 von 1 Pässen/)).toBeVisible();
 await page.getByLabel('Spielzeit',{exact:true}).fill('0');
 await expect(page.getByTestId('progressive')).toHaveText('0');
 await expect(page.getByText(/wurden 0 von 1 Pässen/)).toHaveCount(0);
 await page.getByRole('button',{name:'Fan',exact:true}).click();
 await expect(page.getByText('Pässe mit Raumgewinn',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Wiedergabe starten'}).click();
 await expect(page.getByRole('button',{name:'Wiedergabe pausieren'})).toBeVisible();
 await page.getByRole('button',{name:'Wiedergabe pausieren'}).click();
 expect(errors).toEqual([]);
});
test('small screen and theme',async({page})=>{
 await page.setViewportSize({width:360,height:900});await page.goto('/');await expect(page.getByLabel('Spieler auswählen')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.getByRole('button',{name:'Helles Design'}).click();await expect(page.getByRole('button',{name:'Dunkles Design'})).toBeVisible();
});



test('detected escape, evidence, pitch overlay and no future disclosure',async({page})=>{
 await page.goto('/');
 await page.getByLabel('Spielzeit',{exact:true}).fill('8');
 await expect(page.getByRole('button',{name:/62:07.*Pressingdurchbruch/})).toHaveCount(0);
 await page.getByLabel('Spielzeit',{exact:true}).fill('9');
 const moment=page.getByRole('button',{name:/62:07.*Pressingdurchbruch/});
 await expect(moment).toBeVisible();await moment.click();
 await expect(page.getByTestId('tactical-detail')).toContainText('Finn Roth');
 await expect(page.locator('canvas')).toHaveAttribute('data-insight','escape-e2');
 await page.getByText('Belege und Erkennungsregel',{exact:true}).click();
 await expect(page.getByTestId('tactical-detail')).toContainText('Pass: e2');
 await page.getByRole('button',{name:'Fan',exact:true}).click();
 await expect(page.getByTestId('tactical-detail')).toContainText('hinter dem Druck');
 await expect(page.getByText('Belege und Erkennungsregel',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Nur ausgewählter Spieler',exact:true}).click();
 await page.getByLabel('Spieler auswählen').selectOption('0');
 await expect(page.getByTestId('tactical-detail')).toHaveCount(0);
 await expect(page.locator('canvas')).toHaveAttribute('data-insight','');
 await page.getByRole('button',{name:'Nur ausgewählter Spieler',exact:true}).click();
 await page.getByLabel('Spielzeit',{exact:true}).fill('26');
 await expect(page.getByTestId('possession')).toContainText('Riverside');
 await page.getByLabel('Spielzeit',{exact:true}).fill('8');
 await expect(page.getByTestId('tactical-detail')).toHaveCount(0);
 await expect(page.locator('canvas')).toHaveAttribute('data-insight','');
 await page.setViewportSize({width:360,height:900});
 await page.getByLabel('Spielzeit',{exact:true}).fill('9');
 await page.getByRole('button',{name:/62:07.*Aus dem Druck gespielt/}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('scenario changes reset replay and isolate findings',async({page})=>{
 await page.goto('/');await page.getByLabel('Spielszenario').selectOption('variation');
 await expect(page.getByTestId('clock')).toHaveText('62:00');
 await page.getByLabel('Spielzeit',{exact:true}).fill('60');
 await expect(page.getByRole('button',{name:/Pressingdurchbruch/})).toHaveCount(2);
 await page.getByLabel('Spielszenario').selectOption('control');
 await expect(page.getByTestId('clock')).toHaveText('62:00');
 await page.getByLabel('Spielzeit',{exact:true}).fill('60');
 await expect(page.getByText(/Bisher kein bestätigter Pressingdurchbruch/)).toBeVisible();
 await expect(page.getByRole('button',{name:/Pressingdurchbruch/})).toHaveCount(0);
});
