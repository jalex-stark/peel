import {validate,getWords,scoreBoard} from '../game.js';
export function assessPrototype(level,state){
 const {board=[],rack=[],bag=[]}=state,at=new Map(board.map(t=>[`${t.x},${t.y}`,t.l]));
 const bank=[...board,...rack,...bag].map(t=>t.l).sort().join('');
 const changed=level.state.board.filter(t=>at.get(`${t.x},${t.y}`)!==t.l).length;
 const b=level.bounds,inBounds=board.every(t=>Number.isInteger(t.x)&&Number.isInteger(t.y)&&t.x>=b.minX&&t.x<=b.maxX&&t.y>=b.minY&&t.y<=b.maxY);
 const score=scoreBoard(board),words=getWords(board),validity=validate(board,new Set(level.words));
 const checks=[
  {label:'Exact letter bank; no tiles left in rack or bunch',ok:bank===level.bank&&!rack.length&&!bag.length},
  {label:'One connected board; every run in the allowlist',ok:at.size===board.length&&validity.ok},
  {label:`Build inside x ${b.minX}…${b.maxX}, y ${b.minY}…${b.maxY}`,ok:inBounds},
  {label:`${changed} / ${level.budget} original letter positions changed`,ok:changed<=level.budget},
 ];
 if(level.locks.length)checks.push({label:'Keep the marked courtyard letters in place',ok:level.locks.every(t=>at.get(`${t.x},${t.y}`)===t.l)});
 for(const word of level.required)checks.push({label:`Keep the word ${word}`,ok:words.some(w=>w.word===word)});
 if(level.longWords)checks.push({label:`Keep ${level.longWords} runs of at least six letters`,ok:words.filter(w=>w.word.length>=6).length>=level.longWords});
 if(level.ponds)checks.push({label:`Preserve at least ${level.ponds} pond of four or more cells`,ok:score.pondRank>=level.ponds});
 if(level.target)checks.push({label:`${level.metric==='hullDensity'?'Hull fill':'Enclosed hull'} ${score[level.metric]}% / target ${level.target}%`,ok:score[level.metric]>=level.target});
 return {ok:checks.every(c=>c.ok),checks,changed,value:score[level.metric],score,words:words.map(w=>w.word),reason:checks.find(c=>!c.ok)?.label||'Every requirement met.'};
}
export function prototypePanel(level,state,entries=[]){
 const a=assessPrototype(level,state),m=level.metric==='hullDensity'?'Hull fill':'Enclosed hull';
 return `<section class="work-order-panel"><div class="eyebrow">FREE-BOARD PROTOTYPE</div><h2>${level.title}</h2><p>${level.description}</p><p class="work-order-live" data-score-inspect="${level.metric==='hullDensity'?'hull':'coverage'}" tabindex="0">${m}: <b>${a.value}%</b> · changed: <b>${a.changed}/${level.budget}</b> · hover to inspect</p><ul>${a.checks.map(c=>`<li class="${c.ok?'met':'unmet'}">${c.ok?'✓':'○'} ${c.label}</li>`).join('')}</ul><button class="demo-play" id="work-order-submit">Submit this arrangement</button><p id="work-order-notice" role="status"></p><div class="work-order-actions"><button id="work-order-reset">Restart (undoable)</button><a href="${import.meta.env.BASE_URL}challenges/">Work orders</a><a href="${import.meta.env.BASE_URL}">Return to my board</a></div><details><summary>Rules & allowed words (${level.words.length})</summary><p>Use the full board editor: groups, swaps, rack, keyboard moves and undo. All runs must be on this manifest; no two-letter words. Boundaries are marked with a dashed line. Anchors are constraints on the submitted arrangement; temporary violations are allowed.</p><p>Cost counts original board positions that no longer hold the same letter. Identical copies are interchangeable. New delivery letters add no cost unless they displace an original letter. Intermediate states do not spend moves.</p><p class="prototype-wordlist">${level.words.join(' · ')}</p></details><details><summary>Saved submissions (${entries.length})</summary><p>Legal arrangements are saved locally even before they reach the target. Compare score against changed positions.</p>${entries.map((r,i)=>`<div class="prototype-entry">${r.value}% · ${r.changed} changed · ${r.passed?'target met':'below target'} <button data-work-order-entry="${i}">Restore</button></div>`).join('')||'<p>No submissions yet.</p>'}</details><details><summary>Search findings (spoilers)</summary><p>${level.report.scope}</p><p>${level.report.examined} complete family layouts examined; ${level.report.feasibleInFamily} satisfy the budget and targets. Feasible example: ${level.report.bestKnown}%.</p><p>Observed score/change frontier: ${level.report.frontier.map(r=>`${r.value}% at ${r.changed} changed`).join('; ')}.</p><p>Example words: ${level.report.witnessWords.join(', ')}.</p><button id="work-order-witness">Load verified example (undoable)</button></details></section>`;
}
