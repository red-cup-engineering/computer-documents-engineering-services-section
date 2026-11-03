// Deterministic lexical claim-to-outline planner for source-owned documents.
// This is ranking of already authored evidence, not a claim of English grammar.
import { planEditorialCommission } from './editorial-production.mjs';

const name=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,79}$/.test(x);
function basicTokens(text){
  const lex=new Intl.Segmenter('en',{granularity:'word'});
  return [...lex.segment(text.normalize('NFKC').toLocaleLowerCase('en-US'))]
    .filter(s=>s.isWordLike).map(s=>s.segment).filter(t=>t.length>1);
}
function vector(tokens,idf){
  const tf=new Map();for(const x of tokens)tf.set(x,(tf.get(x)??0)+1);
  const v=new Map();let norm=0;
  for(const [key,count] of tf){const n=(1+Math.log(count))*(idf.get(key)??1);v.set(key,n);norm+=n*n;}
  return {v,norm:Math.sqrt(norm)};
}
function similarity(x,y){if(!x.norm||!y.norm)return 0;let dot=0;for(const[k,v]of x.v)dot+=v*(y.v.get(k)??0);return dot/(x.norm*y.norm);}

/** Rank real claim surfaces against section goals with a source-neutral lexical kernel.
 * Ranking cannot upgrade the evidentiary status of claims or authorize placement.
 */
export function proposeOutlineAssignments({claims,sectionTopics,minSimilarity=0.12,minMargin=0.07,tokenize=basicTokens}={}){
  if(!Array.isArray(claims)||!claims.length||!Array.isArray(sectionTopics)||!sectionTopics.length)throw new TypeError('claims and sectionTopics required');
  if(typeof tokenize!=='function'||!(minSimilarity>=0&&minSimilarity<=1)||!(minMargin>=0&&minMargin<=1))throw new TypeError('invalid ranking parameters');
  const ids=new Set(),sids=new Set();
  for(const c of claims){if(!name(c?.id)||typeof c.text!=='string'||ids.has(c.id))throw new TypeError('invalid claim identity');ids.add(c.id);}
  for(const s of sectionTopics){if(!name(s?.id)||typeof s.heading!=='string'||typeof s.aim!=='string'||sids.has(s.id))throw new TypeError('invalid section identity');sids.add(s.id);}
  const tokens=[...claims.map(c=>tokenize(c.text)),...sectionTopics.map(s=>tokenize(s.heading+' '+s.aim))];
  if(tokens.some(arr=>!Array.isArray(arr)||arr.some(t=>typeof t!=='string'||!t.length)))throw new TypeError('tokenizer returned invalid tokens');
  const df=new Map(),N=tokens.length;
  for(const row of tokens)for(const t of new Set(row))df.set(t,(df.get(t)??0)+1);
  const idf=new Map([...df].map(([t,n])=>[t,Math.log(1+(N-n+0.5)/(n+0.5))]));
  const vectors=tokens.map(row=>vector(row,idf));
  const result=[];
  for(let i=0;i<claims.length;i++){
    const ranked=sectionTopics.map((s,j)=>({sectionId:s.id,score:Number(similarity(vectors[i],vectors[claims.length+j]).toFixed(6))}))
      .sort((a,b)=>b.score-a.score||a.sectionId.localeCompare(b.sectionId));
    const winner=ranked[0],runner=ranked[1];
    const accepted=winner.score>=minSimilarity&&(!runner||winner.score-runner.score>=minMargin);
    result.push({claimId:claims[i].id,suggestedSectionId:accepted?winner.sectionId:null,
      disposition:accepted?'candidate-placement':'abstain',scores:ranked,
      reason:accepted?'lexical-support':'weak-or-ambiguous-similarity'});
  }
  return {kind:'documents.lexical-outline-suggestions.v1',algorithm:'tf-idf-cosine/uax29-v1',
    proposals:result,sourceMeaningVerified:false,editorialAuthority:'none'};
}

/** Return a plan only where every placement has a strong distinction.
 * Does not overwrite an author-provided section assignment.
 */
export function deriveOutlineFromClaims(commission,options={}){
  if(!commission||!Array.isArray(commission.sections)||commission.sections.some(s=>s.claimIds?.length)){
    throw new TypeError('automatic outline requires sections without authored assignments');
  }
  const ranking=proposeOutlineAssignments({claims:commission.claims,sectionTopics:commission.sections,...options});
  const abstentions=ranking.proposals.filter(p=>p.disposition!=='candidate-placement');
  if(abstentions.length)return {kind:'documents.outline-placement-refusal.v1',ranking,unplacedClaimIds:abstentions.map(x=>x.claimId),plan:null};
  const sections=commission.sections.map(s=>({...s,claimIds:ranking.proposals.filter(x=>x.suggestedSectionId===s.id).map(x=>x.claimId)}));
  // No empty section is silently inserted; it needs additional source material.
  if(sections.some(s=>!s.claimIds.length))return {kind:'documents.outline-placement-refusal.v1',ranking,
    unplacedClaimIds:[],plan:null,reason:'empty-section'};
  return {kind:'documents.outline-candidate.v1',ranking,plan:planEditorialCommission({...commission,sections}),
    authorAccepted:false};
}
