import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {planEditorialCommission,runEditorialProduction} from '../src/editorial-production.mjs';
import {stageReviewedManuscript} from '../src/editorial-revision.mjs';
const hash=t=>createHash('sha256').update(t).digest('hex');
const commission=JSON.parse(readFileSync(new URL('../examples/writing-industry-commission.json',import.meta.url),'utf8'));

test('independently accepted one-section editing reassembles full source-cited manuscript',async()=>{
 const original=await runEditorialProduction({commission});
 const sourceId=original.sections[0].sectionId;
 const before=original.sections[0].text;
 const after=before.replace('Grammarly Docs','Grammarly Docs editor');
 const revised=await stageReviewedManuscript({commission,original,
  receiveReviewedSection:async s=>s.sectionId===sourceId?{sectionId:sourceId,sourceSha256:s.sourceSha256,
    candidateText:after,candidateSha256:hash(after),acceptedEditIds:['editor:fix-1']}:null,
  verifyStage:(stage,context)=>stage.sourceSha256===hash(before)&&context.sourceText===before});
 assert.equal(revised.kind,'documents.reviewed-manuscript-receipt.v1');
 assert.ok(revised.manuscript.text.includes('Grammarly Docs editor'));
 assert.ok(revised.manuscript.text.includes('## Sources'));
 assert.equal(revised.review.issues.length,0);
 assert.equal(revised.editorialStages.filter(x=>x.changed).length,1);
 assert.equal(revised.precedingManuscriptSha256,original.manuscript.sha256);
 assert.equal(revised.publicationAuthority,'none');
 assert.deepEqual(revised.executableEffects,[]);
 assert.equal(original.sections[0].text,before);
});
test('a forged writer acceptance without independent authorization refuses',async()=>{
 const original=await runEditorialProduction({commission});
 await assert.rejects(stageReviewedManuscript({commission,original,
   receiveReviewedSection:async s=>({sectionId:s.sectionId,sourceSha256:s.sourceSha256,
    candidateText:s.sourceText+' Invented.',candidateSha256:hash(s.sourceText+' Invented.'),
    acceptedEditIds:['a']}),verifyStage:()=>false}),/not independently authorized/);
});
test('a different commission revision, altered receipt, or injected citation fails closed',async()=>{
 const original=await runEditorialProduction({commission});
 await assert.rejects(stageReviewedManuscript({commission:{...commission,revision:'changed'},original,
   receiveReviewedSection:async()=>null,verifyStage:()=>true}),/stale or malformed/);
 await assert.rejects(stageReviewedManuscript({commission,original:{...original,
   manuscript:{...original.manuscript,sha256:'0'.repeat(64)}},
   receiveReviewedSection:async()=>null,verifyStage:()=>true}),/stale or malformed/);
 await assert.rejects(stageReviewedManuscript({commission,original,
   receiveReviewedSection:async s=>({sectionId:s.sectionId,sourceSha256:s.sourceSha256,
    candidateText:'Synthetic citation [source:imagined]',candidateSha256:hash('Synthetic citation [source:imagined]'),
    acceptedEditIds:['a']}),verifyStage:()=>true}),/removed cited original evidence/);
});
test('no edits still yields independently reviewed exact manuscript, never publishes',async()=>{
 const original=await runEditorialProduction({commission});
 const reviewed=await stageReviewedManuscript({commission,original,
  receiveReviewedSection:async()=>null,verifyStage:()=>true});
 assert.equal(reviewed.manuscript.text,original.manuscript.text);
 assert.ok(reviewed.editorialStages.every(x=>x.changed===false));
 assert.equal(reviewed.fileWritesPerformed,false);
});
