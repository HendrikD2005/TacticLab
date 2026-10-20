import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:5173/');

 await page.getByLabel('Match time',{exact:true}).fill('40');
 await page.getByRole('navigation').getByRole('button',{name:'Events',exact:true}).click();
 await expect(page.getByTestId('event-row')).not.toHaveCount(0);
 await page.screenshot({path:'artifacts/swiss-events.png'});
 await page.getByRole('button',{name:'Save moment',exact:true}).click();
 await page.getByLabel('Your observation').fill('Progression on the right: check the receiving player’s options after the pass.');
 await page.getByRole('button',{name:'Save scene',exact:true}).click();
 await page.screenshot({path:'artifacts/swiss-notebook.png'});
 await page.setViewportSize({width:360,height:900});
 await page.getByLabel('Language',{exact:true}).selectOption('de');
 await page.getByRole('navigation').getByRole('button',{name:'Notizbuch',exact:true}).click();
 await page.screenshot({path:'artifacts/swiss-notebook-mobile.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 console.log('Event and notebook screenshots captured; mobile width verified.');
}finally{await browser.close()}
