import test from 'node:test';
import assert from 'node:assert/strict';
import { planEditorialCommission, runEditorialProduction, reviewEditorialSection, draftFromAdmittedClaims } from '../src/editorial-production.mjs';

const commission={id:'industry-review',revision:'commit:123',title:'Comparing enterprise writing services',
  purpose:'Give readers source-grounded accounts of product boundaries',audience:'research editors',
  profileId:'technical-editorial',locale:'en-US',genre:'industry-analysis',
  sources:[
    {id:'grammarly',title:'Grammarly Docs',revision:'observed:2026-10-22',locator:'https://support.grammarly.com/hc/en-us/articles/38552281546765-Docs-Grammarly-s-new-AI-writing-surface'},
    {id:'prowritingaid',title:'ProWritingAid Features',revision:'observed:2026-10-22',locator:'https://prowritingaid.com/features'},
  ],
  claims:[
    {id:'grammarly-drafting',text:'Grammarly Docs includes assistance with brainstorming, composition, editing, and revision.',status:'source-reported',sourceIds:['grammarly']},
    {id:'story-planning',text:'ProWritingAid provides Story Canvas, plot analysis, and manuscript critique.',status:'source-reported',sourceIds:['prowritingaid']},
  ],
  sections:[
    {id:'scope',heading:'Current scope',aim:'Describe Grammarly drafting tools',claimIds:['grammarly-drafting'],minWords:6,maxWords:100},
    {id:'stories',heading:'Narrative planning',aim:'Describe author planning tools',claimIds:['story-planning'],minWords:6,maxWords:100},
  ]
};
const clone=x=>JSON.parse(JSON.stringify(x));

test('plans with a source-qualified deterministic commission and idempotent identity',()=>{
  const p=planEditorialCommission(commission);
  assert.equal(p.kind,'documents.editorial-plan.v1');
  assert.equal(p.sections.length,2);
  assert.deepEqual(p.sections[0].sourceIds,['grammarly']);
  assert.equal(p.inputSha256,planEditorialCommission(clone(commission)).inputSha256);
});

test('produces a complete real Markdown draft, bibliography, and a structural review',async()=>{
  const r=await runEditorialProduction({commission});
  assert.equal(r.sections.length,2);
  assert.match(r.manuscript.text,/^# Comparing enterprise writing services/u);
  assert.match(r.manuscript.text,/Grammarly Docs includes assistance/u);
  assert.match(r.manuscript.text,/\[source:grammarly\]/u);
  assert.match(r.manuscript.text,/## Sources/u);
  assert.equal(r.review.issues.length,0);
  assert.equal(r.review.structurallyReviewable,true);
  assert.equal(r.review.factualAccuracyEstablished,false);
  assert.equal(r.publicationAuthority,'none');
  assert.equal(r.manuscript.sha256.length,64);
});

test('unchanged source and author edition reuse exact draft but recompute review',async()=>{
  let calls=0;
  const draft=(x)=>{calls++; return draftFromAdmittedClaims(x);};
  const first=await runEditorialProduction({commission,draftSection:draft});
  const second=await runEditorialProduction({commission,draftSection:draft,previousSections:first.sections});
  assert.equal(calls,2);
  assert.ok(second.sections.every(s=>s.reused));
  assert.equal(second.manuscript.sha256,first.manuscript.sha256);
  const revised=clone(commission);revised.claims[1].text+=' It separately offers writing sprints.';
  const third=await runEditorialProduction({commission:revised,draftSection:draft,previousSections:first.sections});
  assert.equal(calls,3); // only the evidence-changed section is regenerated
  assert.notEqual(third.manuscript.sha256,first.manuscript.sha256);
});

test('preserves output order under concurrent out-of-order section generation',async()=>{
  const draft=async x=>{await new Promise(r=>setTimeout(r,x.section.index===0?10:1));return draftFromAdmittedClaims(x);};
  const r=await runEditorialProduction({commission,draftSection:draft,concurrency:2});
  assert.deepEqual(r.sections.map(x=>x.sectionId),['scope','stories']);
  assert.ok(r.manuscript.text.indexOf('## Current scope')<r.manuscript.text.indexOf('## Narrative planning'));
});

test('refuses missing source links and duplicate/missing claim coordinates before drafting',async()=>{
  const a=clone(commission);a.claims[0].sourceIds=['invented'];
  await assert.rejects(runEditorialProduction({commission:a}),/unknown invented/u);
  const b=clone(commission);b.sections[0].claimIds=['invented'];
  await assert.rejects(runEditorialProduction({commission:b}),/unknown invented/u);
  const c=clone(commission);c.sources.push(c.sources[0]);
  await assert.rejects(runEditorialProduction({commission:c}),/duplicate source/u);
});

test('does not treat provider-declared references as proof of visible source support',async()=>{
  const bad = x=>({text:'This headline makes an unsupported claim.',usedClaimIds:x.section.claimIds,citedSourceIds:x.section.sourceIds});
  const r=await runEditorialProduction({commission,draftSection:bad});
  assert.equal(r.review.structurallyReviewable,false);
  assert.equal(r.review.issues.filter(x=>x.code==='missing-visible-source').length,2);
});

test('rejects citation to an unknown external source and omitted claim',async()=>{
  const bad=x=>({text:'A possible consequence. [source:invented]',usedClaimIds:[],citedSourceIds:['invented']});
  const r=await runEditorialProduction({commission,draftSection:bad});
  assert.ok(r.review.issues.some(x=>x.code==='unknown-visible-source'));
  assert.ok(r.review.issues.some(x=>x.code==='required-claim-omitted'));
});

test('detects repeated paragraphs, word budget and refuses unconstrained concurrency',async()=>{
  const bad=x=>({text:'Repeated text. [source:'+x.section.sourceIds[0]+']\n\nRepeated text. [source:'+x.section.sourceIds[0]+']',
    usedClaimIds:x.section.claimIds,citedSourceIds:x.section.sourceIds});
  const r=await runEditorialProduction({commission,draftSection:bad});
  assert.ok(r.review.issues.some(x=>x.code==='repeated-paragraph'));
  await assert.rejects(runEditorialProduction({commission,concurrency:17}),/concurrency/u);
});

test('safely limits a large commission to 500 sections',()=>{
  const a=clone(commission);a.sections=Array.from({length:501},(_,i)=>({...a.sections[0],id:'s-'+i}));
  assert.throws(()=>planEditorialCommission(a),/sections length/u);
});

test('rejects empty, unauthenticated, or lossy Unicode source assertions',()=>{
  const a=clone(commission);a.claims[0].text='';
  assert.throws(()=>planEditorialCommission(a),/nonblank/u);
  const b=clone(commission);b.title='Broken \uD800 title';
  assert.throws(()=>planEditorialCommission(b),/well-formed/u);
});

test('concurrent source-qualified article production remains bounded at 240 sections',async()=>{
  const bulk=clone(commission);
  bulk.sections=Array.from({length:240},(_,i)=>({...commission.sections[i%2],id:'section-'+i}));
  let inFlight=0,peak=0;
  const draft=async x=>{inFlight++;peak=Math.max(peak,inFlight);
    await Promise.resolve(); const result=draftFromAdmittedClaims(x);inFlight--;return result;};
  const a=await runEditorialProduction({commission:bulk,draftSection:draft,concurrency:8});
  const b=await runEditorialProduction({commission:bulk,draftSection:draft,concurrency:8,previousSections:a.sections});
  assert.ok(peak<=8);assert.equal(a.sections.length,240);
  assert.equal(a.manuscript.sha256,b.manuscript.sha256);
  assert.ok(b.sections.every(x=>x.reused));
});
