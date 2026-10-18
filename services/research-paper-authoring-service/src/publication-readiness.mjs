/** Read-only structural admission; a citation file cannot itself create a release or DOI. */
const isObj=x=>x!==null&&typeof x==="object"&&!Array.isArray(x),has=x=>typeof x==="string"&&x.trim().length>0;
const hash=/^[a-f0-9]{64}$/u,ver=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[\w.-]+)?$/u,doi=/^10\.\d{4,9}\/\S+$/iu;
const https=x=>{if(!has(x))return false;try{const u=new URL(x);return u.protocol==="https:"&&!u.username&&!u.password&&!!u.hostname}catch{return false}};
const outcome=(status,failures,flags,info={})=>Object.freeze({kind:"research-paper-release-readiness/v1",status,failures:Object.freeze([...failures]),flags:Object.freeze({...flags}),...info,limit:"Structural and receipt consistency only; not scientific truth, rights clearance, archiving, DOI registration, public availability, or newsroom delivery."});
/** The caller supplies independently byte-verified artifact and live-release receipts.
 * No filesystem, network, signing, DOI allocation, or publication effect occurs here. */
export function assessResearchPublicationReadiness({manifest,artifactReceipts=[],publicReceipt=null,doiReceipt=null}={}){
 const missing=[],required=(k,p)=>{if(!p)missing.push(k);return p};
 if(!isObj(manifest))return outcome("invalid-candidate",["manifest-required"],{sourceReady:false,artifactBytesVerified:false,releaseReceived:false,doiReceived:false});
 required("publication-kind",["lenticule.research-publication.v1","research-publication/v1"].includes(manifest.kind));
 required("title",has(manifest.title));required("version",has(manifest.version)&&ver.test(manifest.version));
 required("status",["draft","release-candidate","published"].includes(manifest.status));
 required("discipline",has(manifest.discipline));required("publisher",has(manifest.publishing_organization));
 const authors=Array.isArray(manifest.authors)?manifest.authors:[];
 required("authors",authors.length>0&&authors.every(x=>isObj(x)&&has(x.name)&&has(x.role))&&new Set(authors.map(x=>x.name)).size===authors.length);
 required("human-accountability",authors.some(x=>/human|accountable/iu.test(x.role??"")&&!/\bai\b|model/iu.test(x.role??"")));
 const ai=authors.some(x=>/\bai\b|model|codex|gpt/iu.test(x.role??""));
 required("ai-contribution-disclosure",!ai||(has(manifest.ai_disclosure)&&/ai|model|assistant/iu.test(manifest.ai_disclosure)));
 required("hypotheses-and-evidence-status",isObj(manifest.evidence)&&Object.keys(manifest.evidence).length>0&&Object.values(manifest.evidence).every(has));
 const files=isObj(manifest.files)?Object.entries(manifest.files):[];
 required("declared-artifacts",files.some(([p])=>/\.pdf$/iu.test(p))&&files.every(([p,v])=>has(p)&&!p.startsWith("/")&&!p.split("/").includes("..")&&isObj(v)&&hash.test(v.sha256??"")&&Number.isSafeInteger(v.bytes)&&v.bytes>0));
 required("source-locators",Array.isArray(manifest.source_manuscripts)&&manifest.source_manuscripts.length>0&&manifest.source_manuscripts.every(https));
 const valid=missing.length===0,byPath=new Map((Array.isArray(artifactReceipts)?artifactReceipts:[]).map(x=>[x?.path,x]));
 const artifactsVerified=valid&&files.every(([p,v])=>{const r=byPath.get(p);return r?.verified===true&&r.sha256===v.sha256&&r.bytes===v.bytes});
 const publicFields=manifest.status==="published"&&https(manifest.canonical_public_url)&&has(manifest.released_at)&&Number.isFinite(Date.parse(manifest.released_at));
 const releaseReceived=!!(artifactsVerified&&publicFields&&isObj(publicReceipt)&&publicReceipt.verified===true&&publicReceipt.publicUrl===manifest.canonical_public_url&&publicReceipt.version===manifest.version&&has(publicReceipt.observedAt)&&Number.isFinite(Date.parse(publicReceipt.observedAt))&&hash.test(publicReceipt.manifestSha256??""));
 const doiReceived=!!(releaseReceived&&has(manifest.doi)&&doi.test(manifest.doi)&&isObj(doiReceipt)&&doiReceipt.verified===true&&doiReceipt.doi===manifest.doi&&doiReceipt.version===manifest.version&&doiReceipt.publicUrl===manifest.canonical_public_url);
 const status=!valid?"invalid-candidate":!artifactsVerified?"metadata-ready-artifacts-unverified":manifest.status!=="published"?"reproducible-candidate-not-public":!releaseReceived?"public-claim-unreceived":doiReceived?"doi-received":"public-release-received";
 return outcome(status,missing,{sourceReady:valid,artifactBytesVerified:artifactsVerified,releaseReceived,doiReceived,publiclyCitable:releaseReceived},{version:manifest.version??null,publicUrl:releaseReceived?manifest.canonical_public_url:null,doi:doiReceived?manifest.doi:null});
}