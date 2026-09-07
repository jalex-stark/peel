import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyze,check,enumerate,bankKey,measures} from './challenges/engine.js';
import {getWords,validate,wordPower,connectedComponents} from './game.js';
const pack=JSON.parse(readFileSync(new URL('./public/challenges/analysis.json',import.meta.url)));
const tiles=(level,s)=>level.cells.map(([x,y],i)=>({id:String(i),x,y,l:s[i]}));
function permutations(bank,visit){const counts={};for(const l of bank)counts[l]=(counts[l]||0)+1;const letters=Object.keys(counts);function walk(s){if(s.length===bank.length){visit(s);return;}for(const l of letters)if(counts[l]){counts[l]--;walk(s+l);counts[l]++;}}walk('');}
test('Every work order has a verified witness, truthful counts and a nontrivial starting problem',()=>{
 assert.equal(pack.levels.length,9);assert.equal(pack.levels.filter(({level:l})=>getWords(tiles(l,l.start)).length===2).length,1);
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
 const first=pack.levels[0].level;const locked={...first,start:first.witness,locks:[0]};const a=[...locked.witness],i=locked.locks[0],j=a.findIndex(l=>l!==a[i]);[a[i],a[j]]=[a[j],a[i]];assert.equal(check(locked,a.join('')).valid,false);
 const l=pack.levels[0].level;assert.equal(check(l,l.witness+'A').valid,false);assert.equal(check({...l,budget:0},l.witness).valid,false);assert.equal(measures(l.cells,l.start,l.start).changed,0);
});
test('All hinted swap paths preserve bank and anchors and terminate at an accepted target',()=>{
 for(const {level:l,report:r} of pack.levels)for(const start of [l.start,...r.solutions.map(s=>s.letters)]){
  let s=start,steps=0;while(s!==l.witness){const i=[...s].findIndex((c,i)=>c!==l.witness[i]),j=[...s].findIndex((c,j)=>j!==i&&c===l.witness[i]&&c!==l.witness[j]&&!l.locks.includes(j));assert.ok(j>=0);assert.ok(!l.locks.includes(i));const a=[...s];[a[i],a[j]]=[a[j],a[i]];s=a.join('');assert.equal(bankKey(s),l.bank);assert.ok(++steps<l.bank.length);}
  assert.ok(check(l,s).valid);
 }
});

import {assessPrototype} from './challenges/prototype-rules.js';
const prototypes=JSON.parse(readFileSync(new URL('./challenges/prototypes.json',import.meta.url)));
test('Larger free-board prototypes have nontrivial starts and independently verified feasible examples',()=>{
 assert.equal(prototypes.length,3);assert.ok(pack.levels.length+prototypes.length>10);
 for(const p of prototypes){assert.ok(p.state.board.length>=21);assert.ok(p.words.length>100);assert.equal(assessPrototype(p,p.state).ok,false,p.id);
  const a=assessPrototype(p,p.report.witness);assert.ok(a.ok,p.id+': '+a.reason);assert.ok(a.changed>=6,p.id);assert.ok(validate(p.report.witness.board,new Set(p.words)).ok);
  assert.ok(p.report.examined>1);assert.match(p.report.scope,/not exhaustive/);assert.ok(p.report.frontier.length>=2);
  const reordered={...p.report.witness,board:p.report.witness.board.map((t,i)=>({...t,id:'other'+i})).reverse()};assert.equal(assessPrototype(p,reordered).changed,a.changed,'cost ignores IDs and iteration order');
  const lost={...p.report.witness,board:p.report.witness.board.slice(1)};assert.equal(assessPrototype(p,lost).ok,false);
  const shifted={...p.report.witness,board:p.report.witness.board.map(t=>({...t,x:t.x+30}))};assert.equal(assessPrototype(p,shifted).ok,false);
 }
});
test('Pond anchors and delivery rack are real submission constraints',()=>{
 const pond=prototypes.find(p=>p.ponds),s=structuredClone(pond.report.witness),anchor=pond.locks[0];
 const i=s.board.findIndex(t=>t.x===anchor.x&&t.y===anchor.y),j=s.board.findIndex(t=>t.l!==s.board[i].l&&!pond.locks.some(a=>a.x===t.x&&a.y===t.y));
 [s.board[i].l,s.board[j].l]=[s.board[j].l,s.board[i].l];assert.equal(assessPrototype(pond,s).checks.find(c=>c.label.includes('marked courtyard')).ok,false);
 const delivery=prototypes[0],state=structuredClone(delivery.report.witness),tile=state.board.pop();state.rack=[{id:tile.id,l:tile.l}];assert.equal(assessPrototype(delivery,state).checks[0].ok,false);
});
