import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 await page.goto('http://127.0.0.1:5173/');
 await page.getByLabel('Match scenario').selectOption('tactics');
 await page.getByLabel('Favourite team',{exact:true}).selectOption('home');
 await page.getByLabel('Favourite player',{exact:true}).selectOption('Finn Roth');
 await page.getByRole('button',{name:'Fan',exact:true}).click();
 await page.getByLabel('Match time',{exact:true}).fill('18');
 await page.getByRole('button',{name:/62:16.*Local overload/}).click();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'artifacts/personalization-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Watch favourite player',exact:true}).click();
 await page.getByRole('button',{name:'Play replay',exact:true}).click();
 console.log(await page.evaluate(()=>new Promise(resolve=>{const values=[];let previous=0;function frame(now){if(previous)values.push(now-previous);previous=now;if(values.length===180){values.sort((a,b)=>a-b);resolve({frames:180,medianMs:values[90],p95Ms:values[171],over33Ms:values.filter(v=>v>33.4).length})}else requestAnimationFrame(frame)}requestAnimationFrame(frame)})));
}finally{await browser.close()}
