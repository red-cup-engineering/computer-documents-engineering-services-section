import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const npm=process.platform==='win32'?'npm.cmd':'npm';
const pkg='@red-cup-engineering/computer-documents-engineering-services-section';
function command(file,args,cwd){
 const r=spawnSync(file,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,
   npm_config_offline:'true',npm_config_audit:'false',npm_config_fund:'false',npm_config_ignore_scripts:'true'}});
 assert.equal(r.status,0,[file,...args,r.error?.message,r.stdout,r.stderr].filter(Boolean).join('\n'));
 return r.stdout;
}
test('npm-packed source installs offline and actual consumer drafts and reviews using exported APIs and CLI',()=>{
 const temporary=mkdtempSync(join(tmpdir(),'561-docs-packed-'));
 try {
  command(npm,['pack','--offline','--ignore-scripts','--pack-destination',temporary],root);
  const tarballs=readdirSync(temporary).filter(x=>x.endsWith('.tgz'));
  assert.equal(tarballs.length,1);
  const consumer=join(temporary,'consumer');mkdirSync(consumer);
  writeFileSync(join(consumer,'package.json'),JSON.stringify({name:'independent-consumer',type:'module',private:true}));
  command(npm,['install','--offline','--no-package-lock','--no-audit','--no-fund','--ignore-scripts',join(temporary,tarballs[0])],consumer);
  const source=JSON.parse(readFileSync(join(root,'examples/writing-industry-commission.json'),'utf8'));
  writeFileSync(join(consumer,'commission.json'),JSON.stringify(source));
  writeFileSync(join(consumer,'smoke.mjs'),`import assert from 'node:assert/strict';
    import {readFileSync} from 'node:fs';
    import {planEditorialCommission,runEditorialProduction} from '${pkg}/editorial-production';
    import {proposeOutlineAssignments} from '${pkg}/editorial-outline';
    const commission=JSON.parse(readFileSync('commission.json','utf8'));
    const plan=planEditorialCommission(commission);
    assert.ok(plan.sections.length>=3);
    const suggestions=proposeOutlineAssignments({claims:commission.claims,sectionTopics:commission.sections});
    assert.ok(Array.isArray(suggestions.proposals));
    const report=await runEditorialProduction({commission});
    assert.equal(report.publicationAuthority,'none');
    assert.equal(report.review.issues.length,0);
    assert.match(report.manuscript.text,/source:grammarly/);
    assert.ok(report.manuscript.text.includes('## Sources'));
  `);
  command(process.execPath,['smoke.mjs'],consumer);
  const installedRoot=join(consumer,'node_modules',...pkg.split('/'));
  const content=JSON.parse(readFileSync(join(installedRoot,'data/records/industry-writing-benchmarks.json'),'utf8'));
  assert.ok(content.comparators?.length>=5);
  const output=join(temporary,'draft-output');
  command(process.execPath,[join(installedRoot,'src/editorial-cli.mjs'),join(consumer,'commission.json'),output],consumer);
  const draft=readFileSync(join(output,'draft.md'),'utf8');
  const receipt=JSON.parse(readFileSync(join(output,'editorial-receipt.json'),'utf8'));
  assert.ok(draft.includes('Grammarly Docs'));
  assert.equal(receipt.review.factualAccuracyEstablished,false);
 } finally {rmSync(temporary,{recursive:true,force:true});}
});
