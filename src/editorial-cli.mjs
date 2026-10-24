#!/usr/bin/env node
// Explicit on-disk corpus input; creates a NEW unpublished candidate and receipt.
import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {runEditorialProduction} from './editorial-production.mjs';
import {deriveOutlineFromClaims} from './editorial-outline.mjs';

const usage='usage: editorial-produce COMMISSION.json OUTPUT_DIRECTORY [--auto-outline]';
export function cliArguments(args){
  if(!Array.isArray(args)||args.length<2||args.length>3||args.some(x=>typeof x!=='string'||!x.trim()))throw Error(usage);
  const [input,output,flag]=args;
  if(flag!==undefined && flag!=='--auto-outline')throw Error(usage);
  if(input.startsWith('--')||output.startsWith('--'))throw Error(usage);
  return {input,output,autoOutline:flag==='--auto-outline'};
}
export async function runEditorialCli({input,output,autoOutline=false}={}){
  const raw=JSON.parse(readFileSync(resolve(input),'utf8'));
  if(autoOutline){
    const derived=deriveOutlineFromClaims(raw);
    if(!derived.plan)throw Error('automatic outline abstained: '+derived.unplacedClaimIds.join(', '));
    raw.sections=derived.plan.commission.sections;
  }
  const result=await runEditorialProduction({commission:raw});
  const outDir=resolve(output);
  // Refuse clobbering prior draft, report, input or filesystem artifacts.
  const targets=[join(outDir,'draft.md'),join(outDir,'editorial-receipt.json')];
  if(targets.some(p=>existsSync(p)||p===resolve(input)))throw Error('refusing to overwrite an existing draft or receipt');
  mkdirSync(outDir,{recursive:true});
  writeFileSync(targets[0],result.manuscript.text,{flag:'wx'});
  writeFileSync(targets[1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  return {manuscript:targets[0],receipt:targets[1],sha256:result.manuscript.sha256,
    issues:result.review.issues.length};
}
const isMain=!!process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url;
if(isMain){
  try{const receipt=await runEditorialCli(cliArguments(process.argv.slice(2)));
    process.stdout.write(JSON.stringify(receipt)+'\n');if(receipt.issues)process.exitCode=1;
  }catch(e){process.stderr.write((e?.message??String(e))+'\n');process.exitCode=2;}
}
