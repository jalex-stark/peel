// Read the editor's existing saves so older submissions appear immediately.
function refreshProgress(){
 const names={hullDensity:'Hull fill',hullCoverage:'Enclosed hull',power:'Strongest word',squares:'Squared word values',variety:'Distinct words',crossings:'Crossing value'};
 for(const card of document.querySelectorAll('[data-progress-key]')){
  const box=card.querySelector('.card-progress');box.replaceChildren();card.classList.remove('completed');
  const line=(text,kind='')=>{const el=document.createElement('span');el.className=kind;el.textContent=text;box.append(el);};
  let saved;try{saved=JSON.parse(localStorage.getItem(card.dataset.progressKey));}catch{}
  const prototype=card.classList.contains('prototype');
  const entries=prototype?(Array.isArray(saved)?saved.filter(e=>e&&Number.isFinite(e.value)):[]):(Number.isFinite(saved?.best?.value)?[{...saved.best,passed:true}]:[]);
  if(!entries.length){line('No submissions yet','progress-empty');continue;}
  const completed=entries.some(e=>e.passed===true);card.classList.toggle('completed',completed);
  line(completed?'✓ Completed':'Target not yet met','progress-status');
  const groups=prototype?[['allowlist','Challenge allowlist'],['personal','Your word list']]:[[null,null]];
  for(const [mode,label] of groups){
   const group=entries.filter(e=>!mode||(e.wordRules==='personal'?'personal':'allowlist')===mode);if(!group.length)continue;
   const best=Math.max(...group.map(e=>e.value));
   line(`Best ${names[card.dataset.metric]||'score'}: ${best}${prototype?'%':''}${label?' · '+label:''}`,'progress-best');
  }
  if(prototype)line(`${entries.length} saved submission${entries.length===1?'':'s'}`,'progress-count');
 }
}
refreshProgress();
window.addEventListener('pageshow',refreshProgress);
window.addEventListener('storage',refreshProgress);
window.addEventListener('focus',refreshProgress);
