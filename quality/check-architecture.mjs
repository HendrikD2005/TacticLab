import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const result=spawnSync(process.execPath,[
 'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs',
 '--config','.dependency-cruiser.cjs','--output-type','json','frontend/src',
],{encoding:'utf8',maxBuffer:8*1024*1024});
assert.equal(result.status,0,`${result.stdout}\n${result.stderr}`);
const report=JSON.parse(result.stdout);
assert.equal(report.summary.violations.filter(item=>item.rule.severity==='error').length,0,
 JSON.stringify(report.summary.violations,null,2));
// A missing parser must never turn an empty scan into a passing architecture gate.
const scanned=new Set(report.modules.map(module=>module.source));
for(const file of readdirSync('frontend/src',{recursive:true})){
 if(/\.(ts|tsx)$/.test(file)&&!file.endsWith('.d.ts')){
  assert.ok(scanned.has(`frontend/src/${file.replaceAll('\\','/')}`),`Source was not scanned: ${file}`);
 }
}
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/frontend-architecture.json',JSON.stringify(report,null,2));
console.log(`Architecture verified: ${report.modules.length} modules, zero violations.`);
