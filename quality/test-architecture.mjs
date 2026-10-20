import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const result=spawnSync(process.execPath,[
 'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs',
 '--config','.dependency-cruiser.cjs','--output-type','json','quality/fixtures/architecture',
],{encoding:'utf8'});
assert.equal(result.status,0,`Architecture scanner did not complete: ${result.stderr}`);
const report=JSON.parse(result.stdout);
const rejected=new Set(report.summary.violations.map(violation=>violation.rule.name));
for(const rule of ['core-has-no-ui-dependency','primitives-have-no-product-dependency','no-circular-dependencies','browser-has-no-node-runtime','no-unresolved-imports']){
 assert.ok(rejected.has(rule),`Architecture gate did not reject ${rule}`);
}
console.log('Architecture negative fixtures rejected by all five expected rules.');
