import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 await mkdir('artifacts',{recursive:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:5173/');
 await page.getByRole('button',{name:'Live simulation',exact:true}).click();
 await expect(page.getByRole('button',{name:/62:07.*Pressure escape/})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:/62:07.*Pressure escape/}).click();
 await page.getByRole('button',{name:'Pressure zones',exact:true}).click();
 await page.getByRole('button',{name:'Zoom in'}).click();
 await page.getByRole('button',{name:'Back to live',exact:true}).click();
 const timings=await page.evaluate(()=>new Promise(resolve=>{
  const values=[];let previous=0;
  function frame(now){
   if(previous)values.push(now-previous);previous=now;
   if(values.length===180){values.sort((a,b)=>a-b);resolve({frames:180,medianMs:values[90],p95Ms:values[171],over33Ms:values.filter(v=>v>33.4).length})}
   else requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
 }));
 await writeFile('artifacts/live-frame-sample.json',JSON.stringify(timings,null,2));console.log('Live frame sample:',timings);
 await page.getByRole('button',{name:'Full pitch',exact:true}).click();
 await page.getByRole('button',{name:/62:07.*Pressure escape/}).click();
 await page.screenshot({path:'artifacts/live-dark.png',fullPage:true});
 await page.getByRole('button',{name:'Light theme'}).click();
 await page.screenshot({path:'artifacts/live-light.png',fullPage:true});
 await page.getByLabel('Language',{exact:true}).selectOption('de');
 await page.setViewportSize({width:360,height:900});
 await page.screenshot({path:'artifacts/live-mobile.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBeFalsy();
 await expect(page.getByTestId('live-status')).toHaveAttribute('data-status','complete',{timeout:55000});
 await expect(page.getByTestId('clock')).toHaveText('62:09');
 await expect(page.getByLabel('Spielzeit',{exact:true})).toHaveAttribute('max','60');
 await expect(page.getByTestId('received-events')).toHaveText('17 Ereignisse');
 await expect(page.getByTestId('tactical-detail')).toBeVisible();
 expect(errors).toEqual([]);
 console.log('Full 60-second broadcast completed; paused replay, 17 events, evidence and mobile layout verified.');
}finally{await browser.close()}
