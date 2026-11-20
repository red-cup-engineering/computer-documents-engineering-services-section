// Document-layer planning, source-grounded drafting, reviewing and draft receipt.
// Factual truth, author approval, and publication are owned by independent receivers.
import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(value, 'utf8').digest('hex');
const name = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(value);
const str = value => typeof value === 'string' && !!value.trim();
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const countWords = text => (text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length;
const matchCitations = text => [...text.matchAll(/\[source:([a-z][a-z0-9-]{0,79})\]/gu)].map(x => x[1]);
const unique = values => [...new Set(values)];
const assertPlain = (x, at) => { if (!x || typeof x !== 'object' || Array.isArray(x)) throw new TypeError(at + ' must be an object'); };
const assertId = (x, at) => { if (!name(x)) throw new TypeError(at + ' must be a lowercase slug'); };
const safeInt = (x, min, max) => Number.isSafeInteger(x) && x >= min && x <= max;
const safeText = (x, at, max = 120000) => {
  if (!str(x) || x.length > max || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(x)) {
    throw new TypeError(at + ' must contain bounded well-formed nonblank text');
  }
};
function exactIds(ids, found, at) {
  if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) throw new TypeError(at + ' must be nonempty and unique');
  for (const id of ids) if (!found.has(id)) throw new RangeError(at + ' references unknown ' + id);
}
function normalize(data) {
  assertPlain(data, 'commission');
  for (const key of ['id', 'revision', 'locale', 'genre', 'audience', 'purpose', 'title', 'profileId']) {
    if (key === 'id' || key === 'profileId') assertId(data[key], 'commission.' + key);
    else safeText(data[key], 'commission.' + key, 2000);
  }
  if (!Array.isArray(data.sources) || !data.sources.length || data.sources.length > 2000) throw new RangeError('sources length 1..2000 required');
  if (!Array.isArray(data.claims) || !data.claims.length || data.claims.length > 10000) throw new RangeError('claims length 1..10000 required');
  if (!Array.isArray(data.sections) || !data.sections.length || data.sections.length > 500) throw new RangeError('sections length 1..500 required');
  const sources = data.sources.map((source, i) => {
    assertPlain(source, 'source[' + i + ']');
    assertId(source.id, 'source.id');
    safeText(source.title, 'source.title', 500);
    safeText(source.revision, 'source.revision', 1000);
    safeText(source.locator, 'source.locator', 3000);
    return { id:source.id, title:source.title, locator:source.locator, revision:source.revision };
  });
  const sourceSet = new Set(sources.map(s => s.id));
  if (sourceSet.size !== sources.length) throw new RangeError('duplicate source id');
  const claims = data.claims.map((claim, i) => {
    assertPlain(claim, 'claim[' + i + ']');
    assertId(claim.id, 'claim.id');
    safeText(claim.text, 'claim.text', 20000);
    safeText(claim.status, 'claim.status', 100);
    exactIds(claim.sourceIds, sourceSet, 'claim.sourceIds');
    return { id:claim.id, text:claim.text, status:claim.status, sourceIds:[...claim.sourceIds] };
  });
  const claimSet = new Set(claims.map(c => c.id));
  if (claimSet.size !== claims.length) throw new RangeError('duplicate claim id');
  const sections = data.sections.map((section, i) => {
    assertPlain(section, 'section[' + i + ']');
    assertId(section.id, 'section.id');
    safeText(section.heading, 'section.heading', 200);
    safeText(section.aim, 'section.aim', 2000);
    exactIds(section.claimIds, claimSet, 'section.claimIds');
    const {minWords=1, maxWords=2000} = section;
    if (!safeInt(minWords, 0, 100000) || !safeInt(maxWords, Math.max(1,minWords), 100000)) throw new RangeError('section word budget invalid');
    return {id:section.id,heading:section.heading,aim:section.aim,claimIds:[...section.claimIds],minWords,maxWords};
  });
  if (new Set(sections.map(s => s.id)).size !== sections.length) throw new RangeError('duplicate section id');
  return {id:data.id,revision:data.revision,locale:data.locale,genre:data.genre,audience:data.audience,
    purpose:data.purpose,title:data.title,profileId:data.profileId,sources,claims,sections};
}

/** A bounded, original-input plan. Source custody and truth are not established. */
export function planEditorialCommission(data) {
  const commission = normalize(data);
  const claims = new Map(commission.claims.map(c=>[c.id,c]));
  const inputSha256 = hash(JSON.stringify(commission));
  const sectionPlans = commission.sections.map((section,i) => {
    const citedSources = unique(section.claimIds.flatMap(id=>claims.get(id).sourceIds));
    const sectionInputSha256 = hash(JSON.stringify([commission.locale, commission.genre,
      commission.audience, commission.purpose, commission.profileId, section,
      section.claimIds.map(id=>claims.get(id)),
      citedSources.map(id=>commission.sources.find(source=>source.id===id))]));
    return {...section, index:i,sourceIds:citedSources,inputSha256:sectionInputSha256};
  });
  return {kind:'documents.editorial-plan.v1', commission, inputSha256, sections:sectionPlans,
    sourceCustodyVerified:false, semanticTruthEstablished:false, publicationAuthority:'none'};
}

/** Offline first draft which never paraphrases or invents source assertions. */
export function draftFromAdmittedClaims({section, claims}) {
  const claimMap = new Map(claims.map(c=>[c.id,c]));
  const paragraphs = section.claimIds.map(id => {
    const c = claimMap.get(id);
    if (!c) throw new RangeError('missing original claim ' + id);
    return c.text.trim() + ' ' + c.sourceIds.map(s=>'[source:'+s+']').join(' ');
  });
  return {text:paragraphs.join('\n\n'),usedClaimIds:[...section.claimIds],
    citedSourceIds:unique(section.claimIds.flatMap(id=>claimMap.get(id).sourceIds)),
    provider:{id:'source-grounded-verbatim',edition:'1'},generation:'verbatim-source-claims'};
}

/** Review has deterministic structural tests; no fake grammar or semantic scores. */
export function reviewEditorialSection({section, sectionDraft, sources, claims}) {
  assertPlain(section, 'section'); assertPlain(sectionDraft, 'sectionDraft');
  safeText(sectionDraft.text, 'draft text', 120000);
  const knownSourceIds = new Set(sources.map(s=>s.id));
  const expectedClaimIds = new Set(section.claimIds);
  const expectedSources = new Set(section.claimIds.flatMap(id => claims.find(c=>c.id===id)?.sourceIds ?? []));
  const issues = [], text = sectionDraft.text;
  const words = countWords(text);
  const citeIds = matchCitations(text);
  for (const sourceId of expectedSources) if (!citeIds.includes(sourceId)) issues.push({code:'missing-visible-source',severity:'error',sourceId});
  for (const sourceId of unique(citeIds)) if (!knownSourceIds.has(sourceId)) issues.push({code:'unknown-visible-source',severity:'error',sourceId});
  if (words < section.minWords) issues.push({code:'below-word-budget',severity:'warning',actual:words,min:section.minWords});
  if (words > section.maxWords) issues.push({code:'above-word-budget',severity:'warning',actual:words,max:section.maxWords});
  if (!Array.isArray(sectionDraft.usedClaimIds) || new Set(sectionDraft.usedClaimIds).size!==sectionDraft.usedClaimIds.length) {
    issues.push({code:'invalid-declared-claims',severity:'error'});
  } else {
    for(const id of sectionDraft.usedClaimIds) if(!expectedClaimIds.has(id)) issues.push({code:'undeclared-claim',severity:'error',claimId:id});
    for(const id of expectedClaimIds) if(!sectionDraft.usedClaimIds.includes(id)) issues.push({code:'required-claim-omitted',severity:'error',claimId:id});
  }
  // This reveals exact repeated paragraphs, not semantic duplication.
  const paras=text.split(/\n\s*\n/u).map(p=>p.trim().replace(/\s+/gu,' ')).filter(Boolean);
  const seen=new Set();
  for(let i=0;i<paras.length;i++){if(seen.has(paras[i]))issues.push({code:'repeated-paragraph',severity:'warning',paragraph:i+1});seen.add(paras[i]);}
  return {kind:'documents.editorial-structural-review.v1',sectionId:section.id,words,visibleSourceIds:unique(citeIds),issues,
    factChecked:false,semanticPreservationProven:false,grammaticalConformanceCertified:false,
    releaseReady:issues.every(x=>x.severity!=='error')};
}

async function mapBounded(items, limit, fn) {
  const out = new Array(items.length);
  let next=0;
  async function worker(){while(next<items.length){const i=next++;out[i]=await fn(items[i],i);}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));
  return out;
}

/**
 * Produce reviewable manuscript sections concurrently and deterministically.
 * A draft provider is authorized only to return candidate prose, never actions.
 * No network/LLM call is made except inside an explicitly supplied provider.
 */
export async function runEditorialProduction({commission, draftSection=draftFromAdmittedClaims,
  reviewSection=reviewEditorialSection, concurrency=4, previousSections=[], writerEdition='source-grounded-verbatim/1'}={}) {
  if(!safeInt(concurrency,1,16))throw new RangeError('concurrency must be 1..16');
  safeText(writerEdition,'writerEdition',200);
  const plan=planEditorialCommission(commission);
  if(typeof draftSection!=='function'||typeof reviewSection!=='function')throw new TypeError('draft and review functions required');
  if(!Array.isArray(previousSections))throw new TypeError('previousSections must be array');
  const previous=new Map();
  for(const r of previousSections){if(r?.sectionId && !previous.has(r.sectionId))previous.set(r.sectionId,r);}
  const sections=await mapBounded(plan.sections,concurrency,async section => {
    const inputSha256=hash(JSON.stringify([section.inputSha256,writerEdition]));
    const cached=previous.get(section.id);
    let candidate;
    let reused=false;
    if(cached?.inputSha256===inputSha256 && cached?.textSha256 === hash(cached.text??'') &&
       Array.isArray(cached.usedClaimIds) && str(cached.text)) {
      candidate={text:cached.text,usedClaimIds:cached.usedClaimIds,citedSourceIds:cached.citedSourceIds,
        provider:cached.provider};reused=true;
    }else{
      candidate=await draftSection({section,claims:plan.commission.claims,sources:plan.commission.sources,
        commission:{id:plan.commission.id,revision:plan.commission.revision,title:plan.commission.title,
          purpose:plan.commission.purpose,audience:plan.commission.audience,genre:plan.commission.genre,
          profileId:plan.commission.profileId,locale:plan.commission.locale},inputSha256});
    }
    assertPlain(candidate,'draft candidate');safeText(candidate.text,'draft candidate text');
    if(!Array.isArray(candidate.usedClaimIds)||!Array.isArray(candidate.citedSourceIds))throw new TypeError('candidate needs declared claim and source IDs');
    const review=await reviewSection({section,sectionDraft:candidate,sources:plan.commission.sources,claims:plan.commission.claims});
    if(!review || !Array.isArray(review.issues))throw new TypeError('reviewer returned an invalid report');
    return {sectionId:section.id,heading:section.heading,inputSha256,textSha256:hash(candidate.text),
      text:candidate.text,usedClaimIds:candidate.usedClaimIds,citedSourceIds:candidate.citedSourceIds,
      provider:candidate.provider??{id:'caller-owned',edition:writerEdition},review,reused,
      editorialAuthority:'none',publicationAuthority:'none'};
  });
  const cited=unique(sections.flatMap(s=>matchCitations(s.text)));
  const unexpected=cited.filter(id=>!plan.commission.sources.some(s=>s.id===id));
  const bibliography=plan.commission.sources.filter(s=>cited.includes(s.id));
  const manuscript=['# '+plan.commission.title,...sections.flatMap(s=>['## '+s.heading,s.text]),
    '## Sources',...bibliography.map(s=>'- **'+s.id+'** — '+s.title+' ('+s.revision+'): '+s.locator)].join('\n\n')+'\n';
  const defects=sections.flatMap(s=>s.review.issues.map(i=>({sectionId:s.sectionId,...i})));
  for(const id of unexpected)defects.push({sectionId:null,code:'unknown-bibliography-source',severity:'error',sourceId:id});
  return {kind:'documents.editorial-production-receipt.v1',commissionId:plan.commission.id,
    commissionRevision:plan.commission.revision,inputSha256:plan.inputSha256,writerEdition,sections,
    manuscript:{text:manuscript,sha256:hash(manuscript),contentType:'text/markdown'},bibliography,
    review:{issues:defects,structurallyReviewable:defects.every(x=>x.severity!=='error'),
      factualAccuracyEstablished:false,grammarCorrectnessEstablished:false,authorApproved:false},
    sourceCustodyVerified:false,publicationAuthority:'none',executableEffects:[]};
}
