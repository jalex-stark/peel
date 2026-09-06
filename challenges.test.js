import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyze,check,enumerate,bankKey,measures} from './challenges/engine.js';
import {getWords,validate,wordPower,connectedComponents} from './game.js';
const pack=JSON.parse(readFileSync(new URL('./public/challenges/analysis.json',import.meta.url)));
const tiles=(level,s)=>level.cells.map(([x,y],i)=>({id:String(i),x,y,l:s[i]}));
function permutations(bank,visit){const counts={};for(const l of bank)counts[l]=(counts[l]||0)+1;const letters=Object.keys(counts);function walk(s){if(s.length===bank.length){visit(s);return;}for(const l of letters)if(counts[l]){counts[l]--;walk(s+l);counts[l]++;}}walk('');}
test('Every work order has a verified witness, truthful counts and a nontrivial starting problem',()=>{
 assert.ok(pack.levels.length>10);
 for(const {level:l,report:r} of pack.levels){assert.equal(bankKey(l.start),l.bank);assert.equal(connectedComponents(tiles(l,l.start)).length,1);assert.deepEqual(analyze(l),r);assert.ok(check(l,l.witness).valid,l.id);assert.ok(validate(tiles(l,l.witness),new Set(l.words)).ok,l.id);
  assert.equal(l.witness.length,l.cells.length);assert.ok(l.locks.every(i=>l.start[i]===l.witness[i]));
  const initial=check(l,l.start);if(l.mode==='repair'){assert.equal(initial.valid,false,l.id);assert.ok(r.minChanges>0);}
  else {assert.ok(initial.valid,l.id);assert.ok(initial[l.metric]<l.target,l.id);assert.equal(check(l,l.witness)[l.metric],l.target);}
  for(const s of r.solutions){const actual=wordPower(tiles(l,s.letters)),m=measures(l.cells,s.letters,l.start);assert.equal(m.power,actual.maxScrabble);assert.equal(m.squares,actual.scrabbleSquares);assert.deepEqual(m.words.sort(),getWords(tiles(l,s.letters)).map(w=>w.word).sort());}
 }
});
test('Independent brute-force permutations agree with the slot CSP for every board of at most nine tiles',()=>{
 for(const {level:l,report:r} of pack.levels.filter(p=>p.level.bank.length<=9)){
  const all=[],legal=[];permutations(l.bank,s=>{if(validate(tiles(l,s),new Set(l.words)).ok){all.push(s);if(l.locks.every(i=>s[i]===l.start[i])&&[...s].filter((c,i)=>c!==l.start[i]).length<=l.budget)legal.push(s);}});
  assert.deepEqual(enumerate(l.cells,l.bank,l.words).solutions,all.sort(),l.id);assert.deepEqual(r.solutions.map(s=>s.letters).sort(),legal.sort(),l.id);
 }
});
test('Constraints reject changed banks, anchors and over-budget completions; identical copies cost nothing',()=>{
 const locked=pack.levels.find(p=>p.level.locks.length).level;const a=[...locked.witness],i=locked.locks[0],j=a.findIndex(l=>l!==a[i]);[a[i],a[j]]=[a[j],a[i]];assert.equal(check(locked,a.join('')).valid,false);
 const l=pack.levels[0].level;assert.equal(check(l,l.witness+'A').valid,false);assert.equal(check({...l,budget:0},l.witness).valid,false);assert.equal(measures(l.cells,l.start,l.start).changed,0);
});
test('All hinted swap paths preserve bank and anchors and terminate at an accepted target',()=>{
 for(const {level:l,report:r} of pack.levels)for(const start of [l.start,...r.solutions.map(s=>s.letters)]){
  let s=start,steps=0;while(s!==l.witness){const i=[...s].findIndex((c,i)=>c!==l.witness[i]),j=[...s].findIndex((c,j)=>j!==i&&c===l.witness[i]&&c!==l.witness[j]&&!l.locks.includes(j));assert.ok(j>=0);assert.ok(!l.locks.includes(i));const a=[...s];[a[i],a[j]]=[a[j],a[i]];s=a.join('');assert.equal(bankKey(s),l.bank);assert.ok(++steps<l.bank.length);}
  assert.ok(check(l,s).valid);
 }
});
