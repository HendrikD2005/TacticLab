import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 await mkdir('artifacts',{recursive:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/');
 await page.getByRole('button',{name:'Show tactical example',exact:true}).click();
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('.recharts-surface').waitFor();
 await page.screenshot({path:'artifacts/swiss-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Dark theme',exact:true}).click();
 await page.screenshot({path:'artifacts/swiss-dark.png',fullPage:true});
 await page.getByRole('button',{name:'Pressure zones',exact:true}).click();
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();
 await page.getByRole('button',{name:'Play replay',exact:true}).click();
 const timings=await page.evaluate(()=>new Promise(resolve=>{
  const values=[];let previous=0;
  function frame(now){
   if(previous)values.push(now-previous);previous=now;
   if(values.length===180){
    values.sort((a,b)=>a-b);
    resolve({frames:180,medianMs:values[90],p95Ms:values[171],over33Ms:values.filter(value=>value>33.4).length});
   }else requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
 }));
 await page.getByRole('button',{name:'Pause replay',exact:true}).click();
 await page.getByRole('button',{name:'Light theme',exact:true}).click();
 await page.getByLabel('Language',{exact:true}).selectOption('de');
 await page.setViewportSize({width:360,height:900});
 await page.evaluate(()=>window.scrollTo(0,0));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'artifacts/swiss-mobile.png',fullPage:true});
 expect(errors).toEqual([]);
 await writeFile('artifacts/swiss-verification.json',JSON.stringify({timings,errors},null,2));
 console.log({timings,errors});
}finally{await browser.close()}
