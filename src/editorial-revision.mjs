// Document receiving for an independently reviewed edit provider (e.g. the
// original PTGAE signed editor). The source producer and document review remain
// authoritative for document assembly; this module never verifies signatures.
import {createHash} from 'node:crypto';
import {planEditorialCommission,runEditorialProduction} from './editorial-production.mjs';
const sha256 = text => createHash('sha256').update(text,'utf8').digest('hex');
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const good=x=>typeof x==='string'&&!!x.trim();
const citations=text=>[...text.matchAll(/\[source:([a-z][a-z0-9-]{0,79})\]/gu)].map(x=>x[1]);
/**
 * Receive one original source-versioned manuscript, obtain independently
 * authorized per-section edits, and rerun the *original* document reviewer.
 *
 * receiveReviewedSection returns null to preserve its section, or a candidate
 * {sectionId,sourceSha256,candidateText,candidateSha256,acceptedEditIds};
 * verifyStage must independently authenticate the original provider's exact
 * receipt/authority and its protected literal claims. Names and "accepted"
 * booleans in proposed JSON do not confer authority.
 */
export async function stageReviewedManuscript({commission,original,
  receiveReviewedSection,verifyStage,concurrency=4}={}) {
  if(typeof receiveReviewedSection!=='function'||typeof verifyStage!=='function')
    throw new TypeError('qualified source reviewer and independent verifier required');
  const plan=planEditorialCommission(commission);
  if(!original||original.kind!=='documents.editorial-production-receipt.v1'
    || original.inputSha256!==plan.inputSha256
    || !original.manuscript||!good(original.manuscript.text)
    ||original.manuscript.sha256!==sha256(original.manuscript.text)
    ||!Array.isArray(original.sections)||original.sections.length!==plan.sections.length)
    throw new RangeError('original document receipt is stale or malformed');
  if(!good(original.writerEdition))throw new RangeError('missing original writer edition');
  const old=new Map();
  for(const prior of original.sections){
    if(!good(prior?.sectionId)||old.has(prior.sectionId)||typeof prior.text!=='string'
      ||prior.textSha256!==sha256(prior.text)||!Array.isArray(prior.usedClaimIds)
      ||!Array.isArray(prior.citedSourceIds))throw new RangeError('invalid prior section source');
    old.set(prior.sectionId,prior);
  }
  const observations=[];
  const revised=await runEditorialProduction({commission,concurrency,
    writerEdition:'document-revision/1:'+original.writerEdition,
    async draftSection({section,inputSha256}){
      const prior=old.get(section.id);
      const previousInput=sha256(JSON.stringify([section.inputSha256,original.writerEdition]));
      if(!prior||prior.inputSha256!==previousInput||prior.heading!==section.heading)
        throw new RangeError('section source revision conflicts with original plan');
      const source={sectionId:section.id,sourceSha256:prior.textSha256,
        sourceText:prior.text,sourceInputSha256:previousInput,
        commissionId:plan.commission.id,commissionRevision:plan.commission.revision,
        receiptSha256:original.manuscript.sha256,originalReview:prior.review};
      const stage=await receiveReviewedSection({...source});
      if(stage===null){
        observations.push({sectionId:section.id,changed:false});
        return {text:prior.text,usedClaimIds:prior.usedClaimIds,
          citedSourceIds:prior.citedSourceIds,provider:prior.provider};
      }
      if(!stage||stage.sectionId!==section.id||stage.sourceSha256!==prior.textSha256
        ||typeof stage.candidateText!=='string'||!stage.candidateText.trim()
        ||stage.candidateSha256!==sha256(stage.candidateText)
        ||stage.candidateText===prior.text||!Array.isArray(stage.acceptedEditIds)
        ||stage.acceptedEditIds.length===0||new Set(stage.acceptedEditIds).size!==stage.acceptedEditIds.length
        ||stage.acceptedEditIds.some(id=>!good(id)))
        throw new RangeError('unwitnessed or source-conflicting revision');
      if(verifyStage(stage,{...source,candidateText:stage.candidateText,
        candidateSha256:stage.candidateSha256})!==true)
        throw new RangeError('editorial adoption is not independently authorized');
      const before=new Set(citations(prior.text)),after=new Set(citations(stage.candidateText));
      for(const cite of before)if(!after.has(cite))throw new RangeError('revision removed cited original evidence: '+cite);
      // New citations are permitted only if the original document reviewer
      // re-admits the source under this commission; no invented sources.
      observations.push({sectionId:section.id,changed:true,
        sourceSha256:prior.textSha256,candidateSha256:stage.candidateSha256,
        acceptedEditIds:[...stage.acceptedEditIds].sort()});
      return {text:stage.candidateText,usedClaimIds:prior.usedClaimIds,
        citedSourceIds:[...new Set([...prior.citedSourceIds,...after])],
        provider:{id:'independently-reviewed-editor',edition:'editorial-adoption/1'}};
    }
  });
  return {...revised,kind:'documents.reviewed-manuscript-receipt.v1',
    precedingManuscriptSha256:original.manuscript.sha256,
    editorialStages:observations.sort((a,b)=>a.sectionId.localeCompare(b.sectionId)),
    sourceCustodyVerified:false,semanticPreservationEstablished:false,
    editorAuthorityCheckedBy:'caller-supplied-independent-verifier',
    fileWritesPerformed:false,publicationAuthority:'none',executableEffects:[]};
}
