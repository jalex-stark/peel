import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {SPECS,WORDS,RETIRED_IDS} from '../challenges/pack.js';
import {enumerate,analyze,bankKey,measures,check,slots} from '../challenges/engine.js';
const out=new URL('../public/challenges/',import.meta.url);await mkdir(out,{recursive:true});
for(const id of RETIRED_IDS)await rm(new URL(id+'.html',out),{force:true});
const engine=(await readFile(new URL('../challenges/engine.js',import.meta.url),'utf8')).replace(/export /g,'');
const runtime=await readFile(new URL('../challenges/player.js',import.meta.url),'utf8');
const css=await readFile(new URL('../challenges/style.css',import.meta.url),'utf8');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const data=s=>JSON.stringify(s).replaceAll('<','\\u003c');
const prototypes=JSON.parse(await readFile(new URL('../challenges/prototypes.json',import.meta.url),'utf8'));
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
const cards=levels.map(({level:l},i)=>`<a class="level-card warmup" href="${l.id}.html"><span class="eyebrow">WARM-UP ${l.id.slice(0,2)} / ${l.mode==='repair'?'REPAIR':'OPTIMIZE'}</span><h2>${l.title}</h2><p>${l.description}</p><div class="mini" aria-hidden="true" style="--cols:${Math.max(...l.cells.map(c=>c[0]))+1}">${l.cells.map(([x,y],j)=>`<span style="grid-column:${x+1};grid-row:${y+1}">${l.start[j]}</span>`).join('')}</div><small>${l.bank.length} tiles · ${l.budget} changed sockets allowed · ${l.words.length} allowed words</small><strong class="card-play">Open work order →</strong></a>`).join('');
const prototypeCards=prototypes.map(p=>`<a class="level-card prototype" href="../?work-order=${p.id}"><span class="eyebrow">FREE-BOARD PROTOTYPE · ${p.bank.length} TILES</span><h2>${p.title}</h2><p>${p.description}</p><small>${p.state.rack.length?`${p.state.rack.length} delivery letters · `:''}${p.budget} changed positions · ${p.words.length} allowed words</small><strong class="card-play">Open in the board editor →</strong></a>`).join('');
await writeFile(new URL('prototypes.json',out),JSON.stringify(prototypes,null,2));
await writeFile(new URL('index.html',out),shell('Peel Works',`<main class="catalog"><nav><a href="../">← Peel</a><span>PEEL / WORKS</span></nav><div class="catalog-head"><div><p class="eyebrow">REARRANGE. PRESERVE. IMPROVE.</p><h1>Room to experiment.</h1><p class="lede">Three larger work orders in the full board editor.<br>Free placement, difficult deliveries, and geometry worth negotiating.</p></div><div class="edition">3<small>NEW PROTOTYPES</small></div></div><section class="intro-rules"><p><b>Start with a working board.</b> The new work orders have 21–33 starting tiles. Move groups, use the rack, swap, inspect scores, and try a different shape. There are no fixed sockets.</p><p><b>Keep something valuable.</b> Preserve long words or an anchored pond while improving a geometry score. Budgets count original positions that no longer hold the same letter. Experiments and undo are free.</p><p><b>Find your own answer.</b> Targets have verified examples, not proven global optima. Save and compare submissions. Each work order has separate progress; returning to Peel restores your main board.</p></section><div class="cards">${prototypeCards}</div><h2 class="warmup-heading">Smaller warm-ups</h2><p>One two-word example remains: Shared load. The other two-word levels have been removed. These ${levels.length} fixed-footprint puzzles are optional warm-ups; each can still be downloaded for offline play.</p><div class="cards">${cards}</div><footer><a href="prototypes.json" download>Prototype definitions and search findings (spoilers)</a> · <a href="analysis.json" download>Warm-up enumeration (spoilers)</a><p>The prototypes use the full Peel editor. Warm-ups are standalone offline HTML files. All word allowlists are explicit; no hidden vocabulary.</p></footer></main>`));
console.table(levels.map(({level:l,report:r})=>({level:l.id,mode:l.mode,solutions:r.total,withinBudget:r.feasible,minChanges:r.minChanges,target:l.target,optimal:r.optimal})));
