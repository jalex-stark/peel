// A puzzle state is a letter per socket. Equal letters are interchangeable.
export const VALUES={A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};
export function slots(cells){
 const map=new Map(cells.map(([x,y],i)=>[`${x},${y}`,i])),out=[];
 for(const [i,[x,y]] of cells.entries())for(const [dx,dy] of [[1,0],[0,1]]){
  if(map.has(`${x-dx},${y-dy}`))continue;
  const run=[];let a=x,b=y;
  while(map.has(`${a},${b}`)){run.push(map.get(`${a},${b}`));a+=dx;b+=dy;}
  if(run.length>1)out.push(run);
 }
 return out;
}
export const bankKey=letters=>[...letters].sort().join('');
export function measures(cells,letters,start=letters){
 const runs=slots(cells),words=runs.map(s=>s.map(i=>letters[i]).join(''));
 const values=words.map(w=>[...w].reduce((s,l)=>s+VALUES[l],0));
 const counts=cells.map((_,i)=>runs.filter(s=>s.includes(i)).length);
 return {words,changed:[...letters].filter((l,i)=>l!==start[i]).length,power:Math.max(0,...values),squares:values.reduce((s,v)=>s+v*v,0),crossings:counts.reduce((s,n,i)=>s+(n>1?VALUES[letters[i]]:0),0),variety:new Set(words).size};
}
export function check(level,letters){
 if(typeof letters!=='string'||bankKey(letters)!==bankKey(level.bank))return {valid:false,reason:'Use exactly the supplied letter bank.'};
 const m=measures(level.cells,letters,level.start);
 const locked=level.locks.some(i=>letters[i]!==level.start[i]);
 const bad=m.words.filter(w=>!level.words.includes(w));
 const valid=!locked&&!bad.length&&m.changed<=level.budget;
 return {...m,valid,reason:locked?'An anchored letter moved.':bad.length?`Check ${[...new Set(bad)].join(', ')}.`:m.changed>level.budget?`Return ${m.changed-level.budget} changed tiles to their original letters.`:'All runs are allowed.'};
}
// Complete word-slot CSP. At each node choose the remaining slot with fewest
// compatible words, consuming only newly assigned letters from the exact bank.
export function enumerate(cells,bank,words,{locks={}}={}){
 const runs=slots(cells),byLength=new Map(),answers=new Set();let nodes=0;
 for(const w of new Set(words)){if(!byLength.has(w.length))byLength.set(w.length,[]);byLength.get(w.length).push(w);}
 const board=Array(cells.length).fill(null),left={};for(const l of bank)left[l]=(left[l]||0)+1;
 for(const [k,l] of Object.entries(locks)){if(!left[l]||!board.hasOwnProperty(k))return {solutions:[],nodes:0};board[k]=l;left[l]--;}
 function candidates(run){return (byLength.get(run.length)||[]).filter(w=>{const need={};for(let j=0;j<run.length;j++){const l=w[j],old=board[run[j]];if(old&&old!==l)return false;if(!old){need[l]=(need[l]||0)+1;if(need[l]>(left[l]||0))return false;}}return true;});}
 function visit(todo){nodes++;if(!todo.length){if(board.every(Boolean))answers.add(board.join(''));return;}
  let chosen,options;
  for(const run of todo){const list=candidates(run);if(!list.length)return;if(!options||list.length<options.length){chosen=run;options=list;}}
  for(const w of options){const added=[];chosen.forEach((i,j)=>{if(!board[i]){board[i]=w[j];left[w[j]]--;added.push(i);}});visit(todo.filter(r=>r!==chosen));for(const i of added){left[board[i]]++;board[i]=null;}}
 }
 visit(runs);return {solutions:[...answers].sort(),nodes};
}
export function analyze(level){
 const all=enumerate(level.cells,level.bank,level.words),anchored=all.solutions.filter(s=>level.locks.every(i=>s[i]===level.start[i]));
 const rows=anchored.map(s=>({letters:s,...measures(level.cells,s,level.start)}));
 const legal=rows.filter(r=>r.changed<=level.budget);
 const best=legal.length?Math.max(...legal.map(r=>r[level.metric])):null;
 const frontier=rows.filter(a=>!rows.some(b=>b.changed<=a.changed&&b[level.metric]>=a[level.metric]&&(b.changed<a.changed||b[level.metric]>a[level.metric])));
 const distanceHistogram={};for(const r of rows)distanceHistogram[r.changed]=(distanceHistogram[r.changed]||0)+1;
 return {total:all.solutions.length,anchored:anchored.length,feasible:legal.length,nodes:all.nodes,best,optimal:legal.filter(r=>r[level.metric]===best).length,minChanges:rows.length?Math.min(...rows.map(r=>r.changed)):null,distanceHistogram,frontier:frontier.map(r=>({changed:r.changed,value:r[level.metric],letters:r.letters})),solutions:legal};
}
