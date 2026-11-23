import test from 'node:test';
import assert from 'node:assert/strict';
import { sectionStops, sectionStep, interiorRange } from '../src/lib/home-snap.mjs';
const sections = [{top:0,height:700},{top:700,height:700},{top:1400,height:1800},{top:3200,height:700},{top:3900,height:180}];
test('hero moves directly to featured and reverse returns to hero',()=>{
 assert.equal(sectionStep(sections,0,700,3380,1),700);
 assert.equal(sectionStep(sections,700,700,3380,-1),0);
});
test('tall sections expose their full bottom before moving on',()=>{
 assert.deepEqual(interiorRange(sections,1500,700,1),{start:1400,end:2500});
 assert.equal(sectionStep(sections,1500,700,3380,1),2500);
 assert.equal(sectionStep(sections,2500,700,3380,1),3200);
 assert.equal(sectionStep(sections,3200,700,3380,-1),2500);
 assert.equal(sectionStep(sections,2500,700,3380,-1),1400);
});
test('no snap is forced inside tall content; the boundary allows the next section',()=>{
 assert.ok(interiorRange(sections,2000,700,1));
 assert.ok(interiorRange(sections,2000,700,-1));
 assert.equal(interiorRange(sections,2500,700,1),null);
 assert.equal(interiorRange(sections,1400,700,-1),null);
});
test('footer and short-document targets are clamped to the scrollable range',()=>{
 assert.deepEqual(sectionStops([{top:0,height:400},{top:400,height:100}],700,0),[0]);
 assert.equal(sectionStep(sections,3200,700,3380,1),3380);
 assert.equal(sectionStep(sections,3380,700,3380,1),3380);
});
test('a shorter viewport changes oversized-section edges',()=>{
 assert.equal(sectionStep(sections,700,400,3680,1),1000);
 assert.deepEqual(interiorRange(sections,700,400,1),{start:700,end:1000});
});
