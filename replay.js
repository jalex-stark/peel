import {scoreInspection} from './score-inspection.js';
import {scoreBoard,wordPower,validate,getWords} from './game.js';
import {parseBoardState} from './board-state.js';
export function replayStateKey(state){return JSON.stringify({board:[...state.board].sort((a,b)=>a.id.localeCompare(b.id)),rack:[...state.rack].sort((a,b)=>a.id.localeCompare(b.id)),bunch:state.bunch});}
export function cleanReplayEvents(events){
 if(!Array.isArray(events))throw Error('This file needs a replayEvents or events array.');
 return events.flatMap((event,index)=>{
  try{
   const candidate=event.state,count=candidate.board.length+candidate.rack.length;
   const state=count?parseBoardState({board:candidate.board,rack:candidate.rack,bag:[],total:count}):{board:[],rack:[]};
   return [{sequence:Number(event.sequence)||index+1,at:Number.isFinite(Date.parse(event.at))?event.at:null,action:String(event.action||'board.edit').slice(0,80),state:{board:state.board,rack:state.rack,bunch:Math.max(0,Math.min(500,Number(candidate.bunch)||0))}}];
  }catch{return [];}
 });
}
export function distinctReplayEvents(events){
 let previous=null;
 return cleanReplayEvents(events).sort((a,b)=>(Date.parse(a.at)||0)-(Date.parse(b.at)||0)).filter(event=>{const key=replayStateKey(event.state);if(key===previous)return false;previous=key;return true;});
}
export async function buildReplay(events,{frequencyRanks=new Map(),dictionary=null}={}){
 const distinct=distinctReplayEvents(events),frames=[];let session=0;
 for(const [index,event] of distinct.entries()){
  const previous=frames.at(-1);
  if(previous&&['game.new','position.import'].includes(event.action))session++;
  const score=scoreBoard(event.state.board,frequencyRanks),power=wordPower(event.state.board),words=getWords(event.state.board).map(w=>w.word);
  const checked=dictionary?validate(event.state.board,dictionary):null;
  const before=new Map((previous?.state.board||[]).map(t=>[t.id,t]));
  const changed=event.state.board.filter(t=>{const p=before.get(t.id);return !p||p.x!==t.x||p.y!==t.y||p.l!==t.l;}).map(t=>t.id);
  const removed=(previous?.state.board||[]).filter(t=>!event.state.board.some(n=>n.id===t.id));
  frames.push({...event,session,changed,removed,inspection:scoreInspection(event.state.board,score),addedWords:previous?words.filter(w=>!previous.words.includes(w)):[],removedWords:previous?previous.words.filter(w=>!words.includes(w)):[],words,
   metrics:{overall:score.overall,hull:score.hullDensity,coverage:score.hullCoverage,commonness:score.commonness,solid:score.solidCoreScore,ponds:score.pondRank,longest:power.longest,strongest:power.maxScrabble},
   valid:checked?checked.ok&&event.state.rack.length===0:null,validation:checked?(checked.ok?(event.state.rack.length?'Tiles still in rack':'Connected valid board'):checked.message):'Validity not checked'});
  if(index%20===19)await new Promise(resolve=>setTimeout(resolve,0));
 }
 return {version:1,createdAt:new Date().toISOString(),frames,sourceEvents:events.length,scoring:'All frames recalculated with the same current scoring rules and dictionary. This is retained history, which may start mid-session.'};
}
export function createReplayArtifact(replay){
 const data=JSON.stringify(replay).replaceAll('<','\\u003c');
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Peel · Replay</title><style>
*{box-sizing:border-box}body{font:15px system-ui;background:#f6f5ef;color:#2e453b;margin:0}header,footer{padding:16px 24px}h1{margin:0;font-size:25px}p{line-height:1.45}main{padding:0 24px;display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:18px}.board{background:#eef0e5;border:1px solid #cbd3bf;border-radius:12px;min-width:0}.board svg{width:100%;height:58vh;display:block}.tile{fill:#fffbed;stroke:#c7cbb6;stroke-width:1}.changed{fill:#fffbed;stroke:#a77826;stroke-width:3}.metric-inspection{pointer-events:none;fill:#359cbd40;stroke:#247f9e;stroke-width:2}.metric-inspection .hull-boundary{fill:none}.metric-inspection .caves{fill:#d88d3955;stroke:none}.metric-inspection circle{fill:#247f9e;stroke:white}.metric-inspection .heat{stroke:none}#inspection-note{font-size:12px;color:#506f78;padding:0 12px 8px}.removed{fill:none;stroke:#b46555;stroke-width:2;stroke-dasharray:4}.letter{font:bold 23px system-ui;fill:#354d40;text-anchor:middle;dominant-baseline:central}.controls{padding:12px;display:flex;align-items:center;gap:9px;flex-wrap:wrap}button,select{font:inherit;color:inherit;padding:7px;background:#fffef8;border:1px solid #c6ceb9;border-radius:6px;cursor:pointer}button:disabled{opacity:.4;cursor:default}input[type=range]{flex:1;min-width:100px}aside{background:#fffef8;border:1px solid #d7ddcc;padding:16px;border-radius:12px}#value{font-size:42px}#delta{margin-left:12px}#chart{width:100%;height:170px;cursor:crosshair;touch-action:none}.timeline{padding:14px 24px}.muted{color:#6c7866;font-size:12px}.legend{display:flex;gap:20px;font-size:12px}.legend span:first-child{color:#247f9e}.legend span:last-child{color:#ac8228}#words{overflow-wrap:anywhere;line-height:1.6}#stats{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;margin-top:18px}#stats span{background:#eef1e7;padding:6px}.valid{color:#398053}.invalid{color:#a26442}#empty{padding:30px}a{color:#366b51}@media(max-width:750px){main{display:block;padding:0 12px}.board svg{height:45vh}aside{margin-top:12px}.timeline{padding:12px}header,footer{padding:14px}}@media print{.controls{display:none}.board svg{height:60vh}}
</style><header><h1>Peel · Your board, over time</h1><p class="muted" id="summary"></p></header><div id="empty" hidden>No recorded board states yet. Make a move with QA recording enabled, then open Replay.</div><div id="viewer"><main><section class="board"><svg id="board" role="img" aria-label="Replay board"></svg><p id="inspection-note"></p><div class="controls"><button id="prev" aria-label="Previous edit">←</button><button id="play">Play</button><button id="next" aria-label="Next edit">→</button><input id="scrub" type="range" min="0" value="0" aria-label="Replay position"><select id="speed" aria-label="Playback speed"><option value="1000">1×</option><option value="500">2×</option><option value="250">4×</option></select></div></section><aside><label for="metric">Track metric</label><select id="metric"><option value="overall">Overall score</option><option value="coverage">Enclosed hull %</option><option value="hull">Occupied hull %</option><option value="commonness">Commonness</option><option value="solid">Solid core</option><option value="ponds">Pond count</option><option value="longest">Longest word</option><option value="strongest">Max Scrabble word</option></select><div><strong id="value"></strong><span id="delta"></span></div><p id="best"></p><button id="milestone">Next valid best</button><p id="event"></p><p id="validity"></p><p id="rack"></p><div id="words"></div><div id="stats"></div></aside></main><section class="timeline"><div class="controls"><label>Session <select id="session"></select></label><label>Spacing <select id="spacing"><option value="edits">Board edits · skip idle time</option><option value="time">Elapsed time</option></select></label></div><svg id="chart" viewBox="0 0 1000 170" role="img" aria-label="Score history; click or drag to scrub"></svg><div class="legend"><span>Blue: actual value · hollow dots: unfinished boards</span><span>Gold: running best on valid boards</span></div></section></div><footer><p class="muted">Highlights: blue shows the tracked metric (orange for caves); gold outlines mark tiles moved or arrived in this edit; dashed outlines show removed tiles. Keyboard: ← / → step, Space plays or pauses. Scores include temporary invalid arrangements; only connected valid boards with an empty rack count toward the gold best line.</p><p class="muted">All frames use the same current scoring rules and dictionary. Retained history may begin mid-session. Playback never changes your playable board.</p><button id="download">Download replay HTML</button></footer><script id="replay-data" type="application/json">${data}</script><script>
const data=JSON.parse(document.getElementById('replay-data').textContent),$=id=>document.getElementById(id);let frames=[],index=0,timer=null,pointer=false,bounds=[0,0,48,48];
const names={overall:'Overall',coverage:'Enclosed hull',hull:'Occupied hull',commonness:'Commonness',solid:'Solid core',ponds:'Ponds',longest:'Longest word',strongest:'Max Scrabble'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const sessions=[...new Set(data.frames.map(f=>f.session))];$('session').innerHTML=sessions.map(s=>'<option value="'+s+'">'+(s+1)+'</option>').join('');
function stop(){clearInterval(timer);timer=null;$('play').textContent='Play';}
function values(){const key=$('metric').value;let best=null;return frames.map(f=>{if(f.valid)best=best===null?f.metrics[key]:Math.max(best,f.metrics[key]);return {value:f.metrics[key],best};});}
function xs(){const first=Date.parse(frames[0].at),last=Date.parse(frames.at(-1).at);return frames.map((f,i)=>40+940*($('spacing').value==='time'&&last>first?(Date.parse(f.at)-first)/(last-first):i/Math.max(1,frames.length-1)));}
function inspectionSVG(f,key){
 const g=f.inspection;if(!g){$('inspection-note').textContent='Rebuild this older replay in the game to include metric highlights.';return '';}
 const hull='<path class="hull-boundary" d="'+g.hull.path+'"/>'+g.hull.contacts.map(p=>'<circle cx="'+(p.x*48-2)+'" cy="'+(p.y*48-2)+'" r="5"/>').join('');
 const solid=g.solid?'<rect class="solid-inspection" x="'+(g.solid.x*48-2)+'" y="'+(g.solid.y*48-2)+'" width="'+g.solid.width*48+'" height="'+g.solid.height*48+'"/>':'';
 const region=(kind,d)=>'<path class="'+kind+'" d="'+d+'"/>';
 const notes={hull:'Hull boundary and tile contacts.',coverage:'Caves: open empty space inside the hull; enclosed gaps excluded.',solid:'Largest completely filled rectangle.',ponds:'Enclosed ponds of at least four cells.',longest:'Longest word, including ties.',strongest:'Highest Scrabble word value, including ties.',commonness:'Darker blue = more common. Crossings average the words touching each tile.',overall:'Overall combines several metrics: showing hull, solid core, ponds, and longest words.'};
 $('inspection-note').textContent=notes[key];
 let svg='';
 if(key==='hull')svg=hull;
 if(key==='coverage')svg=hull+region('caves',g.hull.cavesPath).replace('<path','<path fill-rule="evenodd"');
 if(key==='solid')svg=solid;
 if(key==='ponds'||key==='longest'||key==='strongest')svg=region(key+'-inspection',g[key]);
 if(key==='commonness')svg=g.commonness.map(p=>'<rect class="heat" x="'+p.x*48+'" y="'+p.y*48+'" width="44" height="44" rx="5" fill="rgb(36 127 158 / '+(.07+.65*p.value/100)+')"/>').join('');
 if(key==='overall')svg=hull+solid+region('ponds-inspection',g.ponds)+region('longest-inspection',g.longest);
 return '<g class="metric-inspection" data-metric="'+key+'">'+svg+'</g>';
}
function render(){if(!frames.length)return;const f=frames[index],key=$('metric').value,series=values(),value=series[index].value,delta=index?value-series[index-1].value:0;
 $('value').textContent=value;$('delta').textContent=index?(delta>0?'+':'')+delta+' this edit':'Baseline';$('best').textContent=series[index].best===null?'No valid completed board yet':'Best valid so far: '+series[index].best;
 $('event').textContent='Edit '+(index+1)+' / '+frames.length+' · #'+f.sequence+' · '+f.action+' · '+(f.at?new Date(f.at).toLocaleTimeString():'time unknown');
 $('validity').textContent=f.validation;$('validity').className=f.valid?'valid':'invalid';$('rack').textContent='Rack: '+(f.state.rack.map(t=>t.l).join(' ')||'empty')+' · Bunch: '+f.state.bunch;
 $('words').innerHTML=(f.addedWords.length?'Gained: '+esc(f.addedWords.join(', '))+'<br>':'')+(f.removedWords.length?'Lost: '+esc(f.removedWords.join(', ')):'');
 $('stats').innerHTML=Object.entries(names).map(([k,n])=>'<span>'+n+': '+f.metrics[k]+'</span>').join('');
 $('board').setAttribute('viewBox',bounds.join(' '));
 $('board').innerHTML=f.removed.map(t=>'<rect class="removed" x="'+t.x*48+'" y="'+t.y*48+'" width="44" height="44" rx="5"/>').join('')+f.state.board.map(t=>'<g><rect class="tile '+(f.changed.includes(t.id)?'changed':'')+'" x="'+t.x*48+'" y="'+t.y*48+'" width="44" height="44" rx="5"/><text class="letter" x="'+(t.x*48+22)+'" y="'+(t.y*48+22)+'">'+t.l+'</text></g>').join('');
 $('board').insertAdjacentHTML('beforeend',inspectionSVG(f,key));
 $('board').querySelectorAll('.letter').forEach(letter=>$('board').append(letter));
 const low=Math.min(...series.map(v=>v.value)),high=Math.max(...series.map(v=>v.value)),padding=Math.max(1,(high-low)*.15),lo=Math.max(0,low-padding),hi=high+padding,y=v=>140-120*(v-lo)/(hi-lo),x=xs();
 const actual=series.map((v,i)=>x[i]+','+y(v.value)).join(' ');let bestPath='';series.forEach((v,i)=>{if(v.best!==null)bestPath+=(bestPath?'H'+x[i]+'V':'M'+x[i]+',')+y(v.best);});
 $('chart').innerHTML='<text x="2" y="22" fill="#66745e" font-size="11">'+hi.toFixed(0)+'</text><text x="2" y="143" fill="#66745e" font-size="11">'+lo.toFixed(0)+'</text><line x1="40" y1="140" x2="980" y2="140" stroke="#cbd1c0"/><polyline points="'+actual+'" fill="none" stroke="#247f9e" stroke-width="2"/><path d="'+bestPath+'" fill="none" stroke="#b88e32" stroke-width="3"/>'+series.map((v,i)=>'<circle cx="'+x[i]+'" cy="'+y(v.value)+'" r="3" fill="'+(frames[i].valid?'#247f9e':'#fffef8')+'" stroke="#247f9e"/>').join('')+'<line x1="'+x[index]+'" x2="'+x[index]+'" y1="10" y2="145" stroke="#485849" stroke-dasharray="4"/><circle cx="'+x[index]+'" cy="'+y(value)+'" r="6" fill="#334d3e"/><text x="40" y="165" font-size="11" fill="#66745e">'+($('spacing').value==='time'?'Elapsed time':'Board edits')+'</text>';
 $('scrub').value=index;$('prev').disabled=index===0;$('next').disabled=index===frames.length-1;$('milestone').disabled=!series.some((v,i)=>i>index&&frames[i].valid&&(i===0||series[i-1].best===null||v.value>series[i-1].best));
}
function seek(i){index=Math.max(0,Math.min(frames.length-1,i));render();}
function loadSession(){stop();frames=data.frames.filter(f=>f.session===Number($('session').value));const b=frames.reduce((b,f)=>f.state.board.reduce((b,t)=>[Math.min(b[0],t.x),Math.min(b[1],t.y),Math.max(b[2],t.x),Math.max(b[3],t.y)],b),[Infinity,Infinity,-Infinity,-Infinity]);bounds=Number.isFinite(b[0])?[(b[0]-1)*48,(b[1]-1)*48,(b[2]-b[0]+3)*48,(b[3]-b[1]+3)*48]:[0,0,48,48];index=0;$('scrub').max=Math.max(0,frames.length-1);render();}
$('metric').value=data.initialMetric||'overall';
$('summary').textContent=data.frames.length+' distinct board states from '+data.sourceEvents+' recorded events · '+data.scoring;
$('empty').hidden=data.frames.length>0;$('viewer').hidden=!data.frames.length;if(data.frames.length){$('session').value=sessions.at(-1);loadSession();}
$('session').onchange=loadSession;$('metric').onchange=$('spacing').onchange=render;$('prev').onclick=()=>{stop();seek(index-1);};$('next').onclick=()=>{stop();seek(index+1);};$('scrub').oninput=e=>{stop();seek(Number(e.target.value));};
function play(){if(timer){stop();return;}if(index===frames.length-1)seek(0);$('play').textContent='Pause';timer=setInterval(()=>{seek(index+1);if(index===frames.length-1)stop();},Number($('speed').value));}
$('play').onclick=play;$('speed').onchange=()=>{if(timer){stop();play();}};
$('milestone').onclick=()=>{stop();const series=values(),next=series.findIndex((v,i)=>i>index&&frames[i].valid&&(i===0||series[i-1].best===null||v.value>series[i-1].best));if(next>=0)seek(next);};
function chartSeek(e){const p=$('chart').createSVGPoint();p.x=e.clientX;p.y=e.clientY;const x=p.matrixTransform($('chart').getScreenCTM().inverse()).x,points=xs();seek(points.reduce((best,v,i)=>Math.abs(v-x)<Math.abs(points[best]-x)?i:best,0));}
$('chart').onpointerdown=e=>{stop();pointer=true;$('chart').setPointerCapture(e.pointerId);chartSeek(e);};$('chart').onpointermove=e=>{if(pointer)chartSeek(e);};$('chart').onpointerup=$('chart').onpointercancel=()=>pointer=false;
document.onkeydown=e=>{if(e.target.matches('input,select,textarea,button'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();stop();seek(index+(e.key==='ArrowRight'?1:-1));}if(e.code==='Space'){e.preventDefault();play();}};
$('download').onclick=()=>{const url=URL.createObjectURL(new Blob(['<!doctype html>'+document.documentElement.outerHTML],{type:'text/html'})),a=document.createElement('a');a.href=url;a.download='peel-replay.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
</script></html>`;
}
