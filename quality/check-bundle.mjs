import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import path from 'node:path';

const assets=path.resolve('frontend/dist/assets');
const totals={javascriptGzip:0,cssGzip:0,fontsRaw:0};
const limits={javascriptGzip:270*1024,cssGzip:16*1024,fontsRaw:400*1024};
for(const name of await readdir(assets)){
 const data=await readFile(path.join(assets,name));
 if(name.endsWith('.js'))totals.javascriptGzip+=gzipSync(data).length;
 if(name.endsWith('.css'))totals.cssGzip+=gzipSync(data).length;
 if(name.endsWith('.woff2'))totals.fontsRaw+=data.length;
}
if(Object.values(totals).some(value=>value===0))throw new Error('Expected JS, CSS and local font assets are missing');
await mkdir('artifacts',{recursive:true});
await writeFile('artifacts/bundle-budget.json',JSON.stringify({totals,limits},null,2));
for(const [name,total] of Object.entries(totals)){
 console.log(`${name}: ${total} / ${limits[name]} bytes`);
 if(total>limits[name])throw new Error(`${name} exceeds its reviewed budget`);
}
