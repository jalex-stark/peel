import test from 'node:test';
import assert from 'node:assert/strict';
import {wordTier,normalizeTierPolicy,filteredDictionary,tierAllowed} from './word-tiers.js';
test('User vocabulary anchors override frequency, including unranked expressive words',()=>{
 const expected={TWIXT:'A',TURGID:'S',COIF:'A',SUEDE:'A',VERACITY:'S',BY:'B',BED:'B',RUN:'B',PARTY:'B',DONOR:'B',BALLS:'B',QI:'C',AVO:'D',PUL:'F',SOU:'D'};
 for(const [word,tier] of Object.entries(expected)){assert.equal(wordTier(word).tier,tier);assert.equal(wordTier(word,new Map([[word,1]])).tier,tier);}
 assert.equal(wordTier('UNREVIEWED').tier,'C');assert.equal(wordTier('UNREVIEWED').provisional,true);assert.equal(wordTier('OTHER',new Map([['OTHER',100]])).tier,'B');
});
test('Tier cutoffs apply to bundled and added words, while explicit hides still win',()=>{
 const base=new Set(['TURGID','BY','QI','AVO','PUL']);
 assert.deepEqual([...filteredDictionary(base,new Map(),normalizeTierPolicy({minimum:'D'}))],['TURGID','BY','QI','AVO']);
 const policy=normalizeTierPolicy({minimum:'C',overrides:{AVO:'A'}});
 assert.deepEqual([...filteredDictionary(base,new Map(),policy,{added:['SOU'],removed:['BY']})],['TURGID','QI','AVO']);
 assert.equal(tierAllowed('F','C'),false);assert.equal(tierAllowed('C','C'),true);assert.equal(tierAllowed('bogus','C'),false);
});
test('Policy normalization retains valid personal ratings and discards malformed preferences',()=>{
 assert.deepEqual(normalizeTierPolicy({minimum:'Z',overrides:{VERACITY:'S',AVO:'B',PUL:'G','<script>':'S'}}),{version:'editorial-v1',minimum:'F',overrides:{VERACITY:'S',AVO:'B'}});
 assert.equal(wordTier('PUL',new Map(),{overrides:{PUL:'A'}}).tier,'A');
});

import {wordQuality,QUALITY_COLORS} from './word-quality.js';
import {scoreInspection} from './score-inspection.js';
import {scoreBoard} from './game.js';
import {buildReplay,createReplayArtifact} from './replay.js';
import {createBoardArtifact} from './board-artifact.js';
const crossing=[...'COIF'].map((l,x)=>({id:'q'+x,l,x,y:0})).concat({id:'q4',l:'Q',x:2,y:-1});
test('Word quality assigns every crossing its worse tier and averages over tiles',()=>{
 const q=wordQuality(crossing);assert.equal(q.score,64);assert.equal(q.cells.find(c=>c.id==='q2').tier,'C');assert.equal(q.cells.find(c=>c.id==='q0').tier,'A');assert.equal(q.cells.find(c=>c.id==='q2').value,40);assert.deepEqual(q.cells.find(c=>c.id==='q2').words.sort(),['COIF','QI']);
 const lone=wordQuality([...crossing,{id:'lone',l:'X',x:20,y:20}]);assert.equal(lone.score,53);assert.equal(lone.unworded,1);assert.equal(lone.cells.at(-1).color,QUALITY_COLORS.none);
 assert.equal(wordQuality(crossing,new Map(),{overrides:{QI:'S'}}).score,84);assert.equal(wordQuality([]).score,0);
});
test('Quality grades and custom ratings are shared by live inspections, replay and board artifacts',async()=>{
 const wordTierPolicy=normalizeTierPolicy({overrides:{QI:'B'}}),quality=wordQuality(crossing,new Map(),wordTierPolicy);
 assert.equal(quality.score,72);const inspection=scoreInspection(crossing,scoreBoard(crossing),{wordTierPolicy});assert.deepEqual(inspection.quality,quality.cells);
 const state={board:crossing,rack:[],bag:[],total:5},replay=await buildReplay([{action:'test',state}],{wordTierPolicy});assert.equal(replay.frames[0].metrics.quality,72);assert.deepEqual(replay.frames[0].inspection.quality,quality.cells);
 const artifact=createBoardArtifact(state,{wordTierPolicy});assert.ok(artifact.includes('data-overlay="quality"'));assert.ok(artifact.includes('"score":72'));assert.ok(createReplayArtifact(replay).includes('value="quality"'));
});

 test('Every prototype word is present in the normal bundled dictionary',async()=>{
 const {readFile}=await import('node:fs/promises');const base=new Set(JSON.parse(await readFile('public/words.json','utf8')));const levels=JSON.parse(await readFile('challenges/prototypes.json','utf8'));
 for(const level of levels)for(const word of level.words)assert.ok(base.has(word),word);
});
