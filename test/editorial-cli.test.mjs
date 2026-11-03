import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runEditorialCli,cliArguments} from '../src/editorial-cli.mjs';
const fixture={id:'test',revision:'r1',title:'Writing Test',purpose:'Describe evidence',audience:'reader',genre:'analysis',locale:'en-US',profileId:'basic',
 sources:[{id:'observed',title:'Observed source',revision:'2026-10',locator:'https://example.org/observed'}],
 claims:[{id:'claim',text:'An original sourced claim describes how revision requires careful source preservation.',status:'source-reported',sourceIds:['observed']}],
 sections:[{id:'intro',heading:'Introduction',aim:'Introduce source preservation',claimIds:['claim'],minWords:2,maxWords:400}]};

test('CLI produces real draft and verified full receipt without changing input',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'editorial-cli-'));
 try{const input=join(dir,'original.json');const text=JSON.stringify(fixture);writeFileSync(input,text);const out=join(dir,'new');
  const r=await runEditorialCli({input,output:out});
  assert.match(readFileSync(r.manuscript,'utf8'),/original sourced claim/u);
  const receipt=JSON.parse(readFileSync(r.receipt,'utf8'));
  assert.equal(receipt.manuscript.sha256,r.sha256);
  assert.equal(receipt.publicationAuthority,'none');
  assert.equal(readFileSync(input,'utf8'),text);
  await assert.rejects(runEditorialCli({input,output:out}),/overwrite/u);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('CLI refuses malformed arguments and unused extra controls',()=>{
 assert.throws(()=>cliArguments(['one.json']),/usage/u);
 assert.throws(()=>cliArguments(['a','b','--publish']),/usage/u);
});
