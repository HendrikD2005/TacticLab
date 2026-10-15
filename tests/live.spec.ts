import {test,expect} from '@playwright/test';

test('real stream supports rewind, reconnect and return to live without future events',async({page,context})=>{
 test.setTimeout(45000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 const bootstrap=page.waitForResponse(r=>r.url().endsWith('/api/live')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Live simulation',exact:true}).click();
 const initial=await (await bootstrap).json();
 expect(initial.match.times).toEqual([0]);expect(initial.match.events).toEqual([]);
 const status=page.getByTestId('live-status');
 await expect(status).toHaveAttribute('data-status','receiving');
 await expect(page.getByTestId('view-mode')).toHaveText('LIVE');
 await expect(page.getByRole('button',{name:/Pressure escape/})).toHaveCount(0);
 await expect.poll(async()=>Number(await page.getByLabel('Match time',{exact:true}).getAttribute('max'))).toBeGreaterThan(2);
 await page.getByLabel('Match time',{exact:true}).fill('0');
 await expect(page.getByTestId('clock')).toHaveText('62:00');
 const before=Number(await page.getByLabel('Match time',{exact:true}).getAttribute('max'));
 await expect.poll(async()=>Number(await page.getByLabel('Match time',{exact:true}).getAttribute('max'))).toBeGreaterThan(before+1);
 await expect(page.getByTestId('clock')).toHaveText('62:00');
 await expect(page.getByTestId('view-mode')).toContainText('Replay');
 await context.setOffline(true);
 await expect(status).toHaveAttribute('data-status','reconnecting',{timeout:10000});
 await context.setOffline(false);
 await expect(status).toHaveAttribute('data-status','receiving',{timeout:10000});
 await expect(page.getByTestId('clock')).toHaveText('62:00');
 await page.getByRole('button',{name:'Back to live',exact:true}).click();
 await expect(page.getByTestId('view-mode')).toHaveText('LIVE');
 await expect(page.getByRole('button',{name:/62:07.*Pressure escape/})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:/62:07.*Pressure escape/}).click();
 await expect(page.getByTestId('clock')).toHaveText('62:09');
 await expect(page.locator('canvas')).toHaveAttribute('data-insight','escape-e2');
 await page.getByLabel('Language',{exact:true}).selectOption('de');
 await expect(page.getByTestId('view-mode')).toContainText('Replay');
 await expect(page.getByTestId('clock')).toHaveText('62:09');
 await expect(page.getByTestId('tactical-detail')).toContainText('Gegnerabstand');
 await page.setViewportSize({width:360,height:900});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBeFalsy();
 await page.getByLabel('Spielszenario').selectOption('control');
 await expect(page.getByTestId('clock')).toHaveText('62:00');
 await expect(page.getByTestId('received-events')).toHaveText('0 Ereignisse');
 await expect(page.getByTestId('tactical-detail')).toHaveCount(0);
 await page.getByRole('button',{name:'Aufgezeichneter Replay',exact:true}).click();
 await expect(page.getByTestId('live-status')).toHaveCount(0);
 await expect(page.getByLabel('Spielzeit',{exact:true})).toHaveAttribute('max','60');
 expect(errors).toEqual([]);
});

for(const terminal of ['complete','expired'] as const){
 test(`stream ${terminal} retains buffered replay and analysis`,async({page,request})=>{
  const match=await (await request.get('/api/match')).json();
  const last=terminal==='complete'?match.times.length-1:90;
  const packets=match.times.slice(1,last+1).map((time:number,i:number)=>{
   const index=i+1;
   return `id: ${index}\nevent: frame\ndata: ${JSON.stringify({index,time,positions:match.positions[index],ball:match.ball[index],events:match.events.filter((e:{time:number})=>e.time>match.times[index-1]&&e.time<=time)})}\n\n`;
  }).join('');
  await page.route('**/api/live/*/events?*',route=>route.fulfill({contentType:'text/event-stream',body:packets+`event: ${terminal}\ndata: {}\n\n`}));
  await page.goto('/');
  await page.getByRole('button',{name:'Live simulation',exact:true}).click();
  await expect(page.getByTestId('live-status')).toHaveAttribute('data-status',terminal);
  await expect(page.getByLabel('Match time',{exact:true})).toHaveAttribute('max',terminal==='complete'?'60':'9');
  await expect(page.getByRole('button',{name:'Back to live',exact:true})).toHaveCount(0);
  await page.getByLabel('Match time',{exact:true}).fill('9');
  await expect(page.getByRole('button',{name:/62:07.*Pressure escape/})).toBeVisible();
  await page.getByRole('button',{name:/62:07.*Pressure escape/}).click();
  await expect(page.getByTestId('clock')).toHaveText('62:09');
  await expect(page.locator('canvas')).toHaveAttribute('data-insight','escape-e2');
  await page.getByLabel('Match time',{exact:true}).fill('0');
  await expect(page.getByRole('button',{name:/Pressure escape/})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'New simulation',exact:true})).toBeEnabled();
 });
}
