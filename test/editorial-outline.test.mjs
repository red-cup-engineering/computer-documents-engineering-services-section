import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeOutlineAssignments,deriveOutlineFromClaims} from '../src/editorial-outline.mjs';
const claims=[
 {id:'spelling',text:'Grammar and spelling correction for English prose checks sentence punctuation and word choice.'},
 {id:'plot',text:'Novel character development and plot structure can be improved through chapter pacing analysis.'}];
const sections=[
 {id:'language',heading:'Grammar and spelling',aim:'English sentence correctness and punctuation'},
 {id:'narrative',heading:'Plot and character',aim:'Novel character development and pacing structure'}];

test('places source claims under the relevant section using lexical similarity',()=>{
 const r=proposeOutlineAssignments({claims,sectionTopics:sections});
 assert.deepEqual(r.proposals.map(x=>x.suggestedSectionId),['language','narrative']);
 assert.ok(r.proposals.every(x=>x.scores[0].score>x.scores[1].score));
});
test('refuses weak or ambiguous placements rather than inventing a topic',()=>{
 const r=proposeOutlineAssignments({claims:[{id:'outside',text:'Oceanic climate observations and tides.'}],sectionTopics:sections});
 assert.equal(r.proposals[0].disposition,'abstain');
 assert.equal(r.proposals[0].suggestedSectionId,null);
});
test('does not force a weak provisional outline into an accepted plan',()=>{
 const c={id:'demo',revision:'source@1',title:'News writing',purpose:'Report grounded claims',audience:'editors',genre:'industry',locale:'en-US',profileId:'newsroom',
 sources:[{id:'journal',title:'Journal',revision:'r1',locator:'https://example.org'}],
 claims:claims.map(x=>({...x,status:'source-reported',sourceIds:['journal']})),
 sections:sections.map(x=>({...x,minWords:0,maxWords:1000,claimIds:[]}))};
 const result=deriveOutlineFromClaims(c);
 assert.equal(result.kind,'documents.outline-candidate.v1');
 assert.equal(result.authorAccepted,false);
 assert.deepEqual(result.plan.sections.map(x=>x.claimIds),[['spelling'],['plot']]);
});
test('rejects an attempt to overwrite an authored plan',()=>{
 assert.throws(()=>deriveOutlineFromClaims({sections:[{claimIds:['human-choice']}]}),/without authored/u);
});
