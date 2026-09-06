import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {SPECS,WORDS} from '../challenges/pack.js';
import {enumerate,analyze,bankKey,measures,check,slots} from '../challenges/engine.js';
const out=new URL('../public/challenges/',import.meta.url);await mkdir(out,{recursive:true});
const engine=(await readFile(new URL('../challenges/engine.js',import.meta.url),'utf8')).replace(/export /g,'');
const runtime=await readFile(new URL('../challenges/player.js',import.meta.url),'utf8');
const css=await readFile(new URL('../challenges/style.css',import.meta.url),'utf8');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const data=s=>JSON.stringify(s).replaceAll('<','\\u003c');
const levels=[];
for(const spec of SPECS){
 const lengths=new Set(slots(spec.cells).map(s=>s.length)),bank=bankKey(spec.seed);
 const words=[...new Set(WORDS)].filter(w=>lengths.has(w.length)&&[...new Set(w)].every(l=>w.split(l).length<=bank.split(l).length)).sort();
 const solutions=enumerate(spec.cells,bank,words).solutions;assert.ok(solutions.includes(spec.seed),spec.id+' seed invalid');
 let start=spec.seed,locks=[],budget=bank.length;
 if(spec.lockCenter)locks=[spec.cells.findIndex(([x,y])=>x===1&&y===1)];
 if(spec.mode==='repair'){
  // Deterministic disjoint transpositions; select the corruption whose closest
  // valid repair uses most of the stated budget, rather than guessing difficulty.
  budget=2*spec.scramble;let chosen=null;
  function scramble(s,remaining,used){if(!remaining){if(solutions.includes(s))return;const possible=solutions.filter(v=>locks.every(i=>v[i]===s[i]));const distance=Math.min(...possible.map(v=>measures(spec.cells,v,s).changed));if(!chosen||distance>chosen.distance)chosen={s,distance};return;}
   for(let i=0;i<s.length;i++)for(let j=i+1;j<s.length;j++){if(used.has(i)||used.has(j)||locks.includes(i)||locks.includes(j)||s[i]===s[j])continue;const a=[...s];[a[i],a[j]]=[a[j],a[i]];scramble(a.join(''),remaining-1,new Set([...used,i,j]));if(chosen?.distance===budget)return;}
  }
  scramble(start,spec.scramble,new Set());assert.ok(chosen,spec.id+' needs corrupt start');start=chosen.s;
 }else{
  const scored=solutions.map(s=>({s,value:measures(spec.cells,s)[spec.metric]})).sort((a,b)=>a.value-b.value||a.s.localeCompare(b.s));
  assert.ok(scored[0].value<scored.at(-1).value,spec.id+' has no optimization');start=scored[0].s;
  if(spec.tight)budget=Math.min(...scored.filter(v=>v.value===scored.at(-1).value).map(v=>measures(spec.cells,v.s,start).changed));
 }
 const level={...spec,version:1,bank,words,start,locks,budget};delete level.seed;delete level.scramble;delete level.lockCenter;delete level.tight;
 const report=analyze(level);assert.ok(report.feasible);assert.ok(report.solutions.every(r=>check(level,r.letters).valid));
 const optimal=report.solutions.filter(s=>s[spec.metric]===report.best).sort((a,b)=>a.changed-b.changed||a.letters.localeCompare(b.letters));
 level.witness=optimal[0].letters;level.target=spec.mode==='repair'?null:report.best;
 // Store the complete state set and Pareto frontier in the separate spoiler report.
 level.summary={total:report.total,feasible:report.feasible,optimal:report.optimal,minChanges:report.minChanges,best:report.best};
 levels.push({level,report});
}
const shell=(title,body,script='')=>`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f4f3e9"><title>${escape(title)} · Peel Works</title><style>${css}</style></head><body>${body}${script?`<script>${script}</script>`:''}</body></html>`;
for(const [i,{level,report}] of levels.entries()){
 const next=levels[i+1]?.level.id;
 await writeFile(new URL(level.id+'.html',out),shell(level.title,`<main id="app"></main>`, `const LEVEL=${data(level)};const REPORT=${data(report)};const NEXT=${data(next||null)};\n${engine}\n${runtime}`));
}
await writeFile(new URL('analysis.json',out),JSON.stringify({version:1,scope:'Exhaustive letter assignments to labelled fixed sockets. Equal letters interchangeable; rotations and reflections counted separately when valid. Only the per-level printed allowlist is used. Edit cost is Hamming distance from starting letters. No claim about unrestricted Peel boards.',levels},null,2));
const cards=levels.map(({level:l},i)=>`<a class="level-card" href="${l.id}.html"><span class="eyebrow">${String(i+1).padStart(2,'0')} / ${l.mode==='repair'?'REPAIR':'OPTIMIZE'}</span><h2>${l.title}</h2><p>${l.description}</p><div class="mini" aria-hidden="true" style="--cols:${Math.max(...l.cells.map(c=>c[0]))+1}">${l.cells.map(([x,y],j)=>`<span style="grid-column:${x+1};grid-row:${y+1}">${l.start[j]}</span>`).join('')}</div><small>${l.bank.length} tiles · ${l.budget} changed sockets allowed · ${l.words.length} allowed words</small><strong class="card-play">Open work order →</strong></a>`).join('');
await writeFile(new URL('index.html',out),shell('The Junction Pack',`<main class="catalog"><nav><a href="../">← Peel</a><span>PEEL / WORKS 01</span></nav><div class="catalog-head"><div><p class="eyebrow">A SMALL WORD ENGINEERING CAMPAIGN</p><h1>The Junction Pack</h1><p class="lede">Sixteen little machines made of letters.<br>Repair the wiring. Route the expensive cargo. Make every crossing count.</p></div><div class="edition">16<br><small>WORK ORDERS<br>OFFLINE READY</small></div></div><section class="intro-rules"><p><b>One fixed footprint. One exact bank.</b> Swap tiles by clicking two sockets, or dragging between them. Every horizontal and vertical run must be on that level’s visible allowlist. Duplicated words are legal.</p><p><b>Experiment freely.</b> Your budget counts final sockets with a different letter, not clicks or swaps. Equal letters are interchangeable. Each puzzle saves separately in this browser; your main Peel board stays intact.</p><p><b>Repair or optimize.</b> Repairs need any legal board within budget. Optimizations begin valid: improve the stated objective to the proven target. Optional solution-space reports disclose every solution and the score/change frontier.</p></section><div class="cards">${cards}</div><footer><a href="analysis.json" download>Download complete enumeration (spoilers)</a><p>Each work order is a standalone HTML file: use its Download button to send it or play offline. This first pack holds geometry fixed and explores letter routing; it does not optimize hull or pond shape.</p></footer></main>`));
console.table(levels.map(({level:l,report:r})=>({level:l.id,mode:l.mode,solutions:r.total,withinBudget:r.feasible,minChanges:r.minChanges,target:l.target,optimal:r.optimal})));
