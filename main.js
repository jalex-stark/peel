import {buildReplay,createReplayArtifact,distinctReplayEvents,replayStateKey} from './replay.js';
import {createBoardArtifact} from './board-artifact.js';
import {INITIAL,PEELS,initialTiles,getWords,findBoardMatches,validate,canMove,findSuggestion,scoreBoard,SCORE_MODIFIERS,scoreWithModifiers} from './game.js';
import {parseBoardState,encodeBoardState} from './board-state.js';
import {findFreeTiles} from './game.js';
import {connectedComponents,componentBoundary} from './game.js';
import {wordPower} from './game.js';
import {bestDensityRectangle} from './game.js';
import {boardScoreGeometry,diamondBoundary,hullContactMarkers} from './game.js';
import {wovenRegions} from './game.js';
const icons={cursor:'M4 3l5 13 2-5 5-2L4 3z',swap:'M2 5h13m-3-3l3 3-3 3M16 13H3m3-3l-3 3 3 3',select:'M6 3H3v3m7-3h4v3M3 10v4h3m8-4v4h-4',hand:'M6 8V4a1 1 0 012 0v4-5a1 1 0 012 0v5-4a1 1 0 012 0v5-3a1 1 0 012 0v6c0 4-8 5-10 1L2 9c-1-2 1-3 2-1l2 2',idea:'M6 13h6m-5 3h4M9 1a5 5 0 00-3 9c1 1 1 2 1 3h4c0-1 0-2 1-3A5 5 0 009 1z',book:'M2 3h5c1 0 2 1 2 2v11c0-1-1-2-2-2H2V3zm14 0h-5c-1 0-2 1-2 2v11c0-1 1-2 2-2h5V3z',search:'M12 12l4 4m-2-8a6 6 0 11-12 0 6 6 0 0112 0z',undo:'M6 4L2 8l4 4M2 8h8c6 0 6 8 0 8',redo:'M12 4l4 4-4 4m4-4H8c-6 0-6 8 0 8',check:'M3 9l4 4 8-9',plus:'M9 3v12M3 9h12',minus:'M3 9h12',fit:'M6 2H2v4m10-4h4v4M2 12v4h4m10-4v4h-4',play:'M5 3l10 6-10 6V3z',pause:'M6 3v12m6-12v12',next:'M3 3l9 6-9 6V3zm11 0v12',reset:'M3 7a6 6 0 111 7M3 2v5h5',help:'M6 6a3 3 0 116 1c0 2-3 2-3 4m0 3v.1',shuffle:'M2 4h2c4 0 6 10 10 10h2m-3-3l3 3-3 3M2 14h2c1 0 2-1 3-3m4-5c1-1 2-2 3-2h2m-3-3l3 3-3 3',leaf:'M15 2C2 1 0 11 6 14c5 3 10-3 9-12zM4 16L12 6',return:'M6 3L2 7l4 4M2 7h12v7H8',keyboard:'M2 4h14v11H2V4zm3 3h0m3 0h0m3 0h0m3 0h0m-9 3h0m3 0h0m3 0h0m-6 3h8',arrow:'M3 9h12m-5-5l5 5-5 5',spark:'M9 1l2 5 5 2-5 2-2 6-2-6-5-2 5-2 2-5z',x:'M4 4l10 10M14 4L4 14'};
const icon=n=>`<svg viewBox="0 0 18 18" aria-hidden="true"><path d="${icons[n]||icons.spark}"/></svg>`;
let board=initialTiles(),rack=[],bag=PEELS.map((p,i)=>({id:`p${i}`,l:p.l})),total=33;
let selected=new Set(),tool='move',zoom=.85,pan={x:0,y:0},history=[],future=[],dictionary=null,baseDictionary=null,commonRanks=null,commonWords=[],suggestionWords=[],badIds=new Set(),status='Looking good. All words connect!',fresh=new Set(),demoStep=-1,playing=false,timer=null,drag=null,toastTimer,startTime=Date.now(),elapsed=0,suggestion=null,findQuery='',findMatches=[],findIndex=0,findLogTimer=null;
const SUGGESTION_WORDS=`PLANET FRIEND GARDEN BRIDGE STREAM HOUSE PLANT STONE WATER LIGHT GREEN HEART CLOUD DREAM MUSIC WORLD STORY SHAPE PLACE PLATE SHARE POINT SOUND ROUND SMALL GREAT HAPPY QUICK BROWN BLACK WHITE QUIET SWEET SMART BRAVE FRESH CLEAR WARM COLD RAIN STAR NOTE EAST LATE TEAR START RIVER ROAD TREE BIRD FISH MOON SUN BOOK GAME PLAY WORD TILE PEEL TEAM TIME IDEA MOVE ROOM HOME HOPE LOVE LIFE DAY NIGHT BLUE RED GOLD PINK ORANGE PEAR GRAPE APPLE LEMON LIME MELON BEAR WOLF LION TIGER MOUSE HORSE SHEEP TRAIN TRUCK BOAT SHIP PLANE CHAIR TABLE FLOOR DOOR WALL WINDOW PAPER PENCIL PAINT BRUSH PHONE RADIO CLOCK SHIRT SHOE SOCK HAT COAT BREAD CAKE RICE SOUP MILK TEA EGG CHEESE SALT SUGAR PARK BEACH FIELD FARM TOWN CITY SCHOOL STORE WORK REST WALK RUN JUMP SWIM READ WRITE MAKE BUILD FIND LOOK THINK KNOW GROW HELP GIVE TAKE TURN OPEN CLOSE BEGIN END NORTH SOUTH WEST SONG SING DANCE SMILE LAUGH AT AN AS BE BY DO GO HE IF IN IS IT ME MY NO OF OH ON OR OX SO TO UP US WE`.split(' ');
const app=document.querySelector('#app');
app.innerHTML=`<header><div class="brand-wrap"><div class="brand"><div class="brand-icon"><i></i><i></i></div>peel<span>.</span></div><div class="header-note">A little word play.</div></div><div class="header-actions"><button class="text-btn qa-button" id="qa-open" title="Open the local QA journal"><span class="record-dot"></span> QA <span id="qa-count">0</span></button><button class="text-btn" id="help">${icon('help')} How to play</button><button class="new-btn" id="new">${icon('plus')} New game</button></div></header>
<main><section class="intro"><div><div class="eyebrow"><span class="dot"></span> YOUR OWN PACE. YOUR OWN PUZZLE.</div><h1>Make room for a new word.</h1><p>A solo word game. Build, rearrange, and see what connects.</p></div><div class="stats"><div class="stat"><strong id="words-stat">7</strong><span>words</span></div><div class="stat"><strong id="bunch-stat">12</strong><span>in bunch</span></div><button class="stat score-stat" id="score-open" title="Open board score details"><strong id="score-stat">—</strong><span>score</span></button><div class="stat"><strong id="time-stat">0:00</strong><span>time</span></div></div></section>
<div class="workspace"><div class="board-shell"><div class="toolbar"><div class="toolgroup"><button class="tool active" data-tool="move" title="Move tiles (V)">${icon('cursor')}<span>Move</span></button><button class="tool" data-tool="swap" title="Swap a held tile with another (X, or hold Alt)">${icon('swap')}<span class="tool-label">Swap</span></button><button class="tool" data-tool="select" title="Drag a box to select tiles">${icon('select')}<span>Select</span></button><button class="tool" data-tool="pan" title="Pan the board (H, arrows, or WASD with no selection)">${icon('hand')}<span class="tool-label">Pan</span></button><div class="divider"></div><button class="tool icon-only" id="undo" title="Undo (⌘/Ctrl Z)" aria-label="Undo">${icon('undo')}</button><button class="tool icon-only" id="redo" title="Redo (⌘/Ctrl Shift Z)" aria-label="Redo">${icon('redo')}</button></div><div class="toolbar-actions"><button class="tool finder-btn" id="finder-open" title="Find letters or n-grams on the board">${icon('search')} <span>Find</span></button><button class="tool dictionary-btn" id="dictionary-open" title="Add or hide words in your dictionary">${icon('book')} <span>Words</span></button><button class="tool suggest-btn" id="suggest" title="Find a word idea from your rack">${icon('idea')} <span id="suggest-label">Suggest</span></button><button class="tool auto-check" id="check" aria-pressed="true" title="Automatically check words as you build. Click to turn off."><span class="toggle-track"><i></i></span> Auto-check</button></div></div><div class="find-bar" id="find-bar" hidden>${icon('search')}<input id="find-input" maxlength="12" autocomplete="off" spellcheck="false" placeholder="Find letter or n-gram" aria-label="Find letter or n-gram"><span id="find-count">0 matches</span><button id="find-prev" aria-label="Previous match">‹</button><button id="find-next" aria-label="Next match">›</button><button id="find-close" aria-label="Close finder">${icon('x')}</button></div><div class="board" id="board" aria-label="Word board. Drag tiles or select a tile and click an empty cell."><div class="plane" id="plane"></div><div class="board-caption">${icon('leaf')} A little space to think.</div><div class="zoom"><button id="zoom-out" title="Zoom out" aria-label="Zoom out">${icon('minus')}</button><span id="zoom-label">85%</span><button id="zoom-in" title="Zoom in" aria-label="Zoom in">${icon('plus')}</button><button id="fit" title="Fit board" aria-label="Fit board">${icon('fit')}</button></div></div><div class="board-status"><span class="status-left" id="status"></span><span id="inspection-caption" hidden></span><span class="selection-info" id="selection-info">Arrows or WASD pan · double-click selects a word</span></div></div>
<aside class="rail"><section class="demo-card"><div class="demo-label"><span class="dot"></span> THE ONE-PEEL CHALLENGE</div><h2>Small moves.<br> Big possibilities.</h2><p>Watch a whole board come together,<br>one new letter at a time.</p><button class="demo-play" id="demo-play">${icon('play')} Watch the demo</button><div class="demo-controls"><button id="demo-reset" title="Restart demo">${icon('reset')} Restart</button><span id="demo-count">21 tiles. 12 peels.</span><button id="demo-next" title="Next demo step">Next ${icon('next')}</button></div><div class="progress"><i id="demo-progress" style="width:0%"></i></div><p class="demo-note" id="demo-note">Same board. A new possibility with every peel.</p></section><section class="tips-card"><h3 class="section-label">LESS FUSS. MORE FLOW.</h3><div class="tip">${icon('select')}<div><strong>Move words, not just letters</strong><p>Double-click a word, or drag a selection.<br>Move the whole group together.</p></div></div><div class="tip">${icon('cursor')}<div><strong>A little nudge goes a long way</strong><p>Arrow keys float tiles over the board.<br>Enter places. Escape cancels.<br>Or click a tile, then its new home.</p></div></div><div class="tip">${icon('undo')}<div><strong>Try it. You can always undo.</strong><p>Every move is reversible.<br>Follow the idea. See where it goes.</p></div></div></section><div class="keyboard-note">${icon('keyboard')} <kbd>Shift</kbd> add to selection <span>·</span> <kbd>Space</kbd> pick up / peel</div></aside></div>
<section class="rack-section"><div class="rack-label"><strong>YOUR TILES</strong><span id="rack-count">All tucked in.</span></div><div class="rack" id="rack" aria-label="Your unplaced tiles"></div><div class="rack-actions"><button class="shuffle" id="shuffle" title="Shuffle your tiles" aria-label="Shuffle your tiles">${icon('shuffle')}</button><button class="text-btn" id="dump" title="Dump one selected tile from the rack or board and draw three">Dump</button><button class="peel-btn" id="peel" title="Peel a tile into your hand (Space)">Peel ${icon('plus')}</button></div></section><div class="bottom-note">${icon('leaf')} No opponents. No rush. Just you and the next word.</div><footer><span class="footer-brand">Made for the love of <span>word play.</span></span><span>Bananagrams-inspired · Unofficial · Solo edition</span></footer></main><div id="modal-root"></div><div id="qa-root"></div><div id="toast-root" role="status" aria-live="polite"></div>`;
const $=id=>document.getElementById(id);
let inputTour=null;
let localSharing=import.meta.env.DEV&&!navigator.webdriver,localShareTimer=null,localShareKey='',localShareState='Waiting to share',localClientId='';
try{localSharing=import.meta.env.DEV&&!navigator.webdriver&&localStorage.getItem('peel-local-sharing')!=='false';localClientId=localStorage.getItem('peel-client-id')||crypto.randomUUID();localStorage.setItem('peel-client-id',localClientId);}catch{localClientId=crypto.randomUUID();}
function updateSharingStatus(){const label=$('local-sharing-status');if(label)label.textContent=localSharing||localShareState.startsWith('Shared locally')?localShareState:'Local sharing is off.';}
function scheduleLocalShare(force=false){
 if(!import.meta.env.DEV)return;
 if(!localSharing&&!force)return;
 const key=snapshot()+JSON.stringify(dictionaryOverrides)+JSON.stringify(scoreRun.modifierIds)+(replayHistory.at(-1)?.at||'');if(key===localShareKey&&!force)return;
 clearTimeout(localShareTimer);
 localShareTimer=setTimeout(async()=>{
  try{const response=await fetch('/__peel/share',{method:'POST',headers:{'Content-Type':'application/json','X-Peel-Local':'1'},body:JSON.stringify({clientId:localClientId,state:JSON.parse(snapshot()),dictionaryOverrides,modifierIds:scoreRun.modifierIds,replayEvents:replayHistory})});
   if(!response.ok)throw Error('Unavailable');const result=await response.json();localShareKey=key;localShareState=`Shared locally at ${new Date(result.receivedAt).toLocaleTimeString()}`;
  }catch{localShareState='Local sharing requires the development server.';}
  updateSharingStatus();
 },force?0:500);
}
let scorePanelOpen=false;
try{scorePanelOpen=localStorage.getItem('peel-score-open')==='true';}catch{}
let scorePanelKey='';
let scoreInspection=null;
let densityRectangle=null;
let inspectedGeometry=null;
let inspectedWoven=null,inspectedPower=null;
function showScoreInspection(){
 $('plane').querySelector('.score-inspection-layer')?.remove();
 $('inspection-caption').hidden=true;
 $('inspection-caption').textContent='';
 for(const tile of $('plane').querySelectorAll('.score-inspected'))tile.classList.remove('score-inspected');
 if(!scorePanelOpen||!scoreInspection)return;
 if(scoreInspection==='woven'){
  if(!inspectedWoven)return;const layer=document.createElement('div');layer.className='score-inspection-layer';
  for(const [index,region] of inspectedWoven.highlightRegions.entries()){
   for(const tile of region)$('plane').querySelector(`[data-id="${tile.id}"]`)?.classList.add('score-inspected');
   layer.insertAdjacentHTML('beforeend',`<svg class="inspection-shape woven-outline"><path d="${componentBoundary(region)}" vector-effect="non-scaling-stroke"/></svg><span class="shape-label" style="left:${region[0].x*48}px;top:${region[0].y*48-27}px">${index+1}: ${region.length} tiles</span>`);
  }
  $('plane').append(layer);return;
 }
 if(['hull','coverage','diamond','box','solid'].includes(scoreInspection)){
  const geometry=inspectedGeometry?.[scoreInspection==='coverage'?'hull':scoreInspection];if(!geometry)return;
  const layer=document.createElement('div');layer.className='score-inspection-layer';
  if(scoreInspection==='hull'||scoreInspection==='coverage'){
   const caves=scoreInspection==='coverage';
   $('inspection-caption').textContent=caves?`Caves · ${geometry.area-board.length-geometry.enclosedArea} square units open inside hull`:`Convex hull · ${board.length} tiles / ${geometry.area}`;
   $('inspection-caption').hidden=false;
   layer.innerHTML=`<svg class="inspection-shape hull-outline ${caves?'caves-outline':''}" aria-hidden="true"><path d="M${geometry.vertices.map(p=>`${p.x*48-2},${p.y*48-2}`).join('L')}Z" vector-effect="non-scaling-stroke"/>${hullContactMarkers(board,geometry).map(p=>`<circle class="hull-contact" data-contact="${p.kind}" cx="${p.x*48-2}" cy="${p.y*48-2}" r="5" vector-effect="non-scaling-stroke"/>`).join('')}</svg>`;
   if(caves){
    const hullPath=`M${geometry.vertices.map(p=>`${p.x*48-2},${p.y*48-2}`).join('L')}Z`;
    const filled=[...board,...geometry.enclosedRegions.flatMap(region=>region.cells)];
    const holes=filled.map(p=>`M${p.x*48-2},${p.y*48-2}h48v48h-48Z`).join('');
    layer.insertAdjacentHTML('beforeend',`<svg class="inspection-shape cave-shading" aria-hidden="true"><path class="cave-area" d="${hullPath}${holes}" fill-rule="evenodd"/></svg>`);
   }
  }else if(scoreInspection==='diamond'){
   layer.innerHTML=`<svg class="inspection-shape" aria-hidden="true"><path d="${diamondBoundary(geometry)}" vector-effect="non-scaling-stroke"/><circle cx="${geometry.x*48+22}" cy="${geometry.y*48+22}" r="5"/></svg><span class="shape-label" style="left:${geometry.x*48}px;top:${(geometry.y-geometry.radius)*48-27}px">L1 radius ${geometry.radius} · ${geometry.area} cells</span>`;
  }else{
   layer.innerHTML=`<div class="density-rectangle ${scoreInspection}-rectangle" style="left:${geometry.x*48-2}px;top:${geometry.y*48-2}px;width:${geometry.width*48}px;height:${geometry.height*48}px"><span>${scoreInspection==='solid'?'Solid core':'Bounding box'} · ${geometry.width} × ${geometry.height} = ${geometry.area}</span></div>`;
  }
  $('plane').append(layer);return;
 }
 if(scoreInspection==='rectangle'){
  if(!densityRectangle)return;const r=densityRectangle,layer=document.createElement('div');layer.className='score-inspection-layer';
  layer.innerHTML=`<div class="density-rectangle" style="left:${r.x*48-2}px;top:${r.y*48-2}px;width:${r.width*48}px;height:${r.height*48}px"><span>${r.occupied}/${r.area} · ${r.value.toFixed(2)}</span></div>`;
  $('plane').append(layer);return;
 }
 if(scoreInspection!=='ponds'){
  const words=getWords(board),longest=Math.max(0,...words.map(word=>word.word.length));
  for(const word of words.filter(word=>scoreInspection==='longest'?word.word.length===longest:scoreInspection==='strongest'?inspectedPower?.maxScrabbleWords.includes(word.word):scoreInspection==='length'?word.word.length>2:word.word===scoreInspection))for(const id of word.ids)$('plane').querySelector(`[data-id="${id}"]`)?.classList.add('score-inspected');return;
 }
 const regions=scoreBoard(board,commonRanks||new Map(),commonWords.length||50000).pondRegions;
 const layer=document.createElement('div');layer.className='score-inspection-layer';layer.setAttribute('aria-hidden','true');
 regions.forEach((region,index)=>{
  for(const cell of region.cells)layer.insertAdjacentHTML('beforeend',`<div class="pond-cell" style="left:${cell.x*48-2}px;top:${cell.y*48-2}px"></div>`);
  const cell=region.cells[0];layer.insertAdjacentHTML('beforeend',`<span class="pond-label" style="left:${cell.x*48}px;top:${cell.y*48+10}px">${index+1} · ${region.area} cells</span>`);
 });
 $('plane').append(layer);
}
function bindScoreInspection(){
 for(const target of $('score-panel-root').querySelectorAll('[data-score-inspect]')){
  const show=()=>{scoreInspection=target.dataset.scoreInspect;showScoreInspection();};
  const hide=()=>{scoreInspection=null;showScoreInspection();};
  target.onpointerenter=show;target.onpointerleave=hide;target.onfocus=show;target.onblur=hide;
 }
}
document.querySelector('.rail').insertAdjacentHTML('afterbegin','<div id="score-panel-root"></div>');
function presentScore(html){
 const root=$('score-panel-root'),previous=root.firstElementChild,scroll=previous?.scrollTop||0;
 const focused=previous?.contains(document.activeElement)?document.activeElement.id:null;
 scorePanelOpen=true;try{localStorage.setItem('peel-score-open','true');}catch{}document.body.classList.add('score-is-open');
 root.innerHTML=`<aside class="modal score-modal score-panel" aria-label="Live board score"><button class="modal-close" id="score-close" aria-label="Close score panel">${icon('x')}</button><div class="live-score-label">LIVE SCORE · UPDATES AS YOU EDIT</div>${html}</aside>`;
 root.firstElementChild.scrollTop=scroll;
 $('score-close').onclick=()=>{scorePanelOpen=false;try{localStorage.setItem('peel-score-open','false');}catch{}scoreInspection=null;showScoreInspection();root.innerHTML='';document.body.classList.remove('score-is-open');qaRecord('score.close');};
 if(focused)$(focused)?.focus({preventScroll:true});
}
let componentFlashUntil=0,componentFlashTimer=null;
function flashDisconnectedGroups(){
 if(connectedComponents(board).length<2)return;
 componentFlashUntil=Date.now()+1800;clearTimeout(componentFlashTimer);showComponentBoundaries();
 componentFlashTimer=setTimeout(()=>{componentFlashUntil=0;showComponentBoundaries();},1800);
}
$('undo').title='Undo (Z or ⌘/Ctrl Z)';
 $('redo').title='Redo (Y or ⌘/Ctrl Shift Z)';
let freeTilesEnabled=false;
$('finder-open').insertAdjacentHTML('beforebegin',`<button class="tool free-tiles-button" id="free-tiles" aria-pressed="false" title="Highlight tiles that can be lifted individually without breaking nearby words or splitting their group">${icon('leaf')}<span>Free</span><b id="free-count"></b></button>`);
$('free-tiles').onclick=()=>{freeTilesEnabled=!freeTilesEnabled;render();qaRecord('free_tiles.toggle',{enabled:freeTilesEnabled});};
function showFreeTiles(){
 const button=$('free-tiles');button.disabled=!dictionary;button.classList.toggle('active',freeTilesEnabled);button.setAttribute('aria-pressed',String(freeTilesEnabled));
 const ids=freeTilesEnabled?findFreeTiles(board,dictionary):[];
 $('free-count').textContent=freeTilesEnabled?ids.length:'';
 button.title=freeTilesEnabled?`${ids.length} free tiles. Lift one at a time; nearby words remain valid and their group does not split.`:'Highlight individually removable tiles';
 for(const id of ids){const tile=$('plane').querySelector(`[data-id="${id}"]`);tile?.classList.add('free-tile');if(tile)tile.title='Free: can be lifted individually. Highlights update after every move.';}
}
$('qa-open').insertAdjacentHTML('beforebegin',`<button class="text-btn" id="board-share" title="Export or import a board position">${icon('return')} Save / load</button>`);
$('board-share').onclick=openBoardShare;
function openBoardShare(){
 pause();const position={board,rack,bag,total},code=encodeBoardState(position);
 modal(`<h2>Keep this position.</h2><section class="local-sharing" ${import.meta.env.DEV?'':'hidden'}><label><input id="local-sharing-toggle" type="checkbox" ${localSharing?'checked':''}> Live local sharing</label><p>Keep a copy of this browser’s board, dictionary changes, and active modifiers in the project so the assistant can inspect it. No external service.</p><div id="local-sharing-status" role="status"></div><button id="local-share-now">Share current position now</button></section><p>Export every tile on the board, in your rack, and in the bunch. Paste a code or load a JSON file to restore a position. Dictionary preferences stay local.</p><div class="board-share-actions"><button id="position-copy">Copy board code</button><button id="position-download">Download JSON</button><button id="position-artifact">Download board & metrics HTML</button></div><label for="position-code">Board code or JSON</label><textarea id="position-code" rows="5" spellcheck="false" aria-label="Board code or JSON"></textarea><div id="position-message" role="status"></div><div class="board-share-actions"><button id="position-import">Load this position</button><label class="file-label">Open JSON file<input id="position-file" type="file" accept=".json,application/json"></label></div><p>Loading replaces this board. Undo restores your previous position.</p>`);
 $('position-code').value=code;
 updateSharingStatus();
 $('local-sharing-toggle').onchange=e=>{localSharing=e.target.checked;try{localStorage.setItem('peel-local-sharing',String(localSharing));}catch{}if(localSharing)scheduleLocalShare(true);else clearTimeout(localShareTimer);updateSharingStatus();};
 $('local-share-now').onclick=()=>scheduleLocalShare(true);
 $('position-copy').onclick=async()=>{try{await navigator.clipboard.writeText(code);$('position-message').textContent='Board code copied.';qaRecord('position.copy');}catch{$('position-code').value=code;$('position-code').focus();$('position-code').select();$('position-message').textContent='Code selected. Press Cmd/Ctrl+C to copy.';}};
 $('position-artifact').onclick=()=>{
  if(!commonRanks){$('position-message').textContent='Wait for word frequency data to load, then export again.';return;}
  const html=createBoardArtifact(position,{frequencyRanks:commonRanks,modifierIds:scoreRun.modifierIds,dictionaryOverrides});
  const url=URL.createObjectURL(new Blob([html],{type:'text/html'})),link=document.createElement('a');link.href=url;link.download='peel-board-and-metrics.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('position-message').textContent='Standalone HTML exported. Send the file; it opens offline with interactive metric highlights.';qaRecord('position.artifact.export');
 };
 $('position-download').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(position,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='peel-board.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);qaRecord('position.export');};
 const load=value=>{try{const restored=parseBoardState(value);save();pause();inputTour=null;keyboardPlacement=null;suggestion=null;selected.clear();lastPointer=null;tool='move';demoStep=-1;({board,rack,bag,total}=restored);scoreRun=emptyScoreRun();scoreRunSave();closeModal();$('board').querySelector('.demo-pointer')?.remove();fit();qaRecord('position.import');toast('Position loaded. Undo returns to your previous board.');}catch(error){$('position-message').textContent=error.message;}};
 $('position-import').onclick=()=>load($('position-code').value);
 $('position-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>200000){$('position-message').textContent='Choose a board file smaller than 200 KB.';return;}try{load(await file.text());}catch{$('position-message').textContent='Could not read this file.';}};
}
$('demo-play').insertAdjacentHTML('afterend',`<button class="input-demo-button" id="input-demo">${icon('cursor')} Watch moves, swaps & selections</button>`);
$('input-demo').onclick=()=>{if(inputTour&&playing){pause();return;}if(!inputTour)beginInputTour();runInputTour();};
function beginInputTour(){
 pause();save();board=initialTiles();rack=[];bag=PEELS.map((p,i)=>({id:`p${i}`,l:p.l}));total=33;
 selected.clear();keyboardPlacement=null;suggestion=null;tool='move';demoStep=-1;lastPointer=null;
 scoreRun=emptyScoreRun();scoreRunSave();inputTour={step:0};fit();
}
function tourPoint(x,y){return {x:pan.x+(x*48+22)*zoom,y:pan.y+(y*48+22)*zoom};}
function nextInputTour(){
 const tour=inputTour;if(!tour)return;const pick=(x,y)=>{selected=new Set([board.find(t=>t.x===x&&t.y===y).id]);anchorId=[...selected][0];};
 const captions=[
  'Click E to pick it up. The tile stays selected while you look for a home.',
  'Move to an empty cell. The ghost previews exactly where a click will place E.',
  'Click the destination: E moves. Auto-check immediately shows the unfinished word.',
  'Bring E home. Every move can also be undone.',
  'Pick T, then look at O. You can decide to swap after picking up a tile.',
  'Press X: the preview changes to a swap. Click O to exchange the letters.',
  'T and O trade places. The board is editable even while words are invalid.',
  'Swap them back to restore STONE.',
  'Double-click S to select the whole word STONE.',
  'Arrow keys carry the group over occupied cells. Nothing underneath is overwritten.',
  'Move the floating word to open space, then press Enter.',
  'The whole word moves together. Undo brings every letter back.',
  'Select mode: drag a box from inside S across the word. Touching tile edges counts.',
  'Five tiles selected. Drag the group, use arrows, or click its new home.'
 ];
 switch(tour.step){
  case 0:pick(4,0);break;
  case 1:lastPointer=tourPoint(5,-1);break;
  case 2:move(selected,1,-1,'demo.click_destination');selected.clear();break;
  case 3:pick(5,-1);move(selected,-1,1,'demo.click_destination');selected.clear();break;
  case 4:pick(1,0);lastPointer=tourPoint(2,0);break;
  case 5:tool='swap';break;
  case 6:swapAt(2,0);break;
  case 7:pick(2,0);swapAt(1,0);tool='move';break;
  case 8:lastWordSelection=null;selectWord(board.find(t=>t.x===0&&t.y===0).id);lastPointer=null;break;
  case 9:keyboardPlacement={x:0,y:1};break;
  case 10:keyboardPlacement={x:0,y:-1};break;
  case 11:commitFloating();break;
  case 12:undo();tool='select';selected.clear();break;
  case 13:break;
 }
 const targets=[[4,0],[5,-1],[5,-1],[4,0],[2,0],[2,0],[2,0],[1,0],[0,0],[0,1],[0,-1],[0,-1],[0,0],[4,0]];
 lastPointer=tourPoint(...targets[tour.step]);
 inputTour=tour;status=captions[tour.step];$('demo-note').textContent=status;
 render();
 if(tour.step===12||tour.step===13){
  const start={x:pan.x+1*zoom,y:pan.y+1*zoom},end={x:pan.x+(4*48+43)*zoom,y:pan.y+10*zoom};
  updateMarquee(end,{start,base:[]});
  if(tour.step===13)$('board').querySelector('.marquee')?.remove();
 }
 const target=tour.step===12?tourPoint(0,0):lastPointer||tourPoint(tour.step<4?4:0,0);
 $('board').querySelector('.demo-pointer')?.remove();
 $('board').insertAdjacentHTML('beforeend',`<div class="demo-pointer" style="left:${target.x}px;top:${target.y}px">${icon('cursor')}<span>${tour.step===8?'Double-click':tour.step===5?'X · Swap':tour.step===9?'↓':tour.step===10?'↑ ↑ · Enter':tour.step===12?'Drag to select':'Click'}</span></div>`);
 qaRecord('demo.input_step',{step:tour.step,caption:status});tour.step++;
 if(tour.step===captions.length){inputTour=null;tool='move';lastWordSelection=null;lastClick=null;pause();render();$('board').querySelector('.demo-pointer')?.remove();$('demo-note').textContent='Your turn. STONE is selected—try moving it. Restart the tour any time.';}
}
function runInputTour(){playing=true;function tick(){if(!playing||!inputTour)return;nextInputTour();if(inputTour){playing=true;timer=setTimeout(tick,2400);}updateDemo();}tick();}
let autoCheck=true;
try{autoCheck=localStorage.getItem('peel-auto-check')!=='false';}catch{}
const DICTIONARY_STORAGE='peel-dictionary-overrides-v1';
let dictionaryOverrides={added:[],removed:[]};
try{const saved=JSON.parse(localStorage.getItem(DICTIONARY_STORAGE));if(saved&&Array.isArray(saved.added)&&Array.isArray(saved.removed))dictionaryOverrides=saved;}catch{}
const SCORE_RUN_STORAGE='peel-score-run-v1',SCORE_RUN_TARGETS=[20,30,40,50,60];
const emptyScoreRun=()=>({status:'inactive',stage:0,cumulative:0,modifierIds:[],choices:[],scores:[]});
let scoreRun=emptyScoreRun();
try{const saved=JSON.parse(localStorage.getItem(SCORE_RUN_STORAGE));if(saved&&['inactive','choosing','playing','complete'].includes(saved.status))scoreRun={...emptyScoreRun(),...saved};}catch{}
function scoreRunSave(){try{localStorage.setItem(SCORE_RUN_STORAGE,JSON.stringify(scoreRun));}catch{}}
function scoreRunChoices(){
 const available=SCORE_MODIFIERS.filter(item=>!scoreRun.modifierIds.includes(item.id));
 shuffleArray(available);return available.slice(0,3).map(item=>item.id);
}
function dictionarySave(){try{localStorage.setItem(DICTIONARY_STORAGE,JSON.stringify(dictionaryOverrides));}catch{}}
function dictionaryWord(value){return value.trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,24);}
function dictionaryWordState(word){if(dictionaryOverrides.added.includes(word))return 'custom';if(dictionaryOverrides.removed.includes(word))return 'hidden';if(baseDictionary?.has(word))return 'bundled';return 'missing';}
function dictionaryChange(word,action){
 word=dictionaryWord(word);if(word.length<2)return;
 const added=new Set(dictionaryOverrides.added),removed=new Set(dictionaryOverrides.removed);
 if(action==='add'){removed.delete(word);if(!baseDictionary?.has(word))added.add(word);dictionary?.add(word);}
 if(action==='remove'){added.delete(word);if(baseDictionary?.has(word))removed.add(word);dictionary?.delete(word);}
 dictionaryOverrides={added:[...added].sort(),removed:[...removed].sort()};dictionarySave();
 suggestion=null;render();qaRecord(`dictionary.${action}`,{word,state:dictionaryWordState(word)});openDictionary(word);
}
function openDictionary(initial=''){
 const word=dictionaryWord(initial),state=word?dictionaryWordState(word):'';
 modal(`<h2>Your word list.</h2><p>Add a missing word or hide one you do not want accepted. Changes apply to Auto-check immediately and stay in this browser.</p><div class="dictionary-entry"><input id="dictionary-word" value="${word}" maxlength="24" autocomplete="off" spellcheck="false" placeholder="Type a word" aria-label="Dictionary word"><button id="dictionary-action" ${word.length<2?'disabled':''}>${state==='bundled'||state==='custom'?'Hide word':state==='hidden'?'Restore word':'Add word'}</button></div><div class="dictionary-state" id="dictionary-state">${word?`${word} · ${state==='custom'?'your addition':state==='hidden'?'hidden from bundled list':state==='bundled'?'bundled word':'not included'}`:'Letters A–Z, at least two characters.'}</div><div class="dictionary-lists"><section><h3>Your additions</h3>${dictionaryOverrides.added.length?dictionaryOverrides.added.map(item=>`<button data-dictionary-remove="${item}">${item} ${icon('x')}</button>`).join(''):'<p>None yet.</p>'}</section><section><h3>Hidden bundled words</h3>${dictionaryOverrides.removed.length?dictionaryOverrides.removed.map(item=>`<button data-dictionary-restore="${item}">${item} ${icon('return')}</button>`).join(''):'<p>None yet.</p>'}</section></div>`);
 const input=$('dictionary-word'),action=$('dictionary-action');
 const refresh=()=>{const value=dictionaryWord(input.value),nextState=dictionaryWordState(value);input.value=value;action.disabled=value.length<2;action.textContent=nextState==='bundled'||nextState==='custom'?'Hide word':nextState==='hidden'?'Restore word':'Add word';$('dictionary-state').textContent=value?`${value} · ${nextState==='custom'?'your addition':nextState==='hidden'?'hidden from bundled list':nextState==='bundled'?'bundled word':'not included'}`:'Letters A–Z, at least two characters.';};
 input.oninput=refresh;input.onkeydown=e=>{if(e.key==='Enter'&&!action.disabled)action.click();};
 action.onclick=()=>{const value=dictionaryWord(input.value),nextState=dictionaryWordState(value);dictionaryChange(value,nextState==='bundled'||nextState==='custom'?'remove':'add');};
 for(const button of document.querySelectorAll('[data-dictionary-remove]'))button.onclick=()=>dictionaryChange(button.dataset.dictionaryRemove,'remove');
 for(const button of document.querySelectorAll('[data-dictionary-restore]'))button.onclick=()=>dictionaryChange(button.dataset.dictionaryRestore,'add');
 input.focus();input.setSelectionRange(input.value.length,input.value.length);
}
const QA_STORAGE='peel-qa-journal-v1';
let qaJournal={active:true,startedAt:new Date().toISOString(),events:[]};
try{const saved=JSON.parse(localStorage.getItem(QA_STORAGE));if(saved&&Array.isArray(saved.events))qaJournal=saved;}catch{}
const REPLAY_STORAGE='peel-replay-history-v1';
let replayHistory=[];
try{replayHistory=JSON.parse(localStorage.getItem(REPLAY_STORAGE))||[];}catch{}
replayHistory=distinctReplayEvents([...new Map([...replayHistory,...qaJournal.events].map(e=>[`${e.at}:${e.sequence}`,e])).values()].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))).slice(-500);
function retainReplay(event){
 const clean=distinctReplayEvents([event])[0];if(!clean)return;
 if(!replayHistory.length||replayStateKey(clean.state)!==replayStateKey(replayHistory.at(-1).state))replayHistory.push(clean);
 replayHistory=replayHistory.slice(-500);
 while(replayHistory.length){try{localStorage.setItem(REPLAY_STORAGE,JSON.stringify(replayHistory));break;}catch{if(replayHistory.length===1)break;replayHistory.splice(0,Math.max(1,Math.floor(replayHistory.length*.1)));}}
 scheduleLocalShare();
}
let replayURL=null;
async function openReplay(events=replayHistory){
 if(!commonRanks||!dictionary){toast('Word data is still loading. Try Replay again in a moment.');return;}
 pause();modal('<h2>Building replay…</h2><p>Scoring each recorded board with the same rules.</p>');
 const pending=$('modal-root').firstElementChild;
 try{
  const result=await buildReplay(events,{frequencyRanks:commonRanks,dictionary});
  if($('modal-root').firstElementChild!==pending)return;
  if(replayURL)URL.revokeObjectURL(replayURL);replayURL=URL.createObjectURL(new Blob([createReplayArtifact(result)],{type:'text/html'}));
  modal(`<div class="replay-actions"><button id="replay-download">Download replay HTML</button><label>Load QA / replay JSON <input id="replay-import" type="file" accept=".json,application/json"></label><span id="replay-error" role="status"></span></div><iframe class="replay-frame" title="Board replay viewer" src="${replayURL}"></iframe>`);
  $('modal-root').querySelector('.modal').classList.add('replay-modal');
  $('replay-download').onclick=()=>{const a=document.createElement('a');a.href=replayURL;a.download='peel-replay.html';a.click();};
  $('replay-import').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());await openReplay(data.replayEvents||data.events||data.frames);}catch{$('replay-error').textContent='Could not read replay events from that file.';}};
 }catch(error){if($('modal-root').firstElementChild===pending)modal('<h2>Replay unavailable</h2><p>The recording could not be read.</p>');}
}
$('board-share').insertAdjacentHTML('afterend','<button class="text-btn" id="replay-open">Replay</button>');
$('replay-open').onclick=()=>openReplay();
function qaTile(id){const tile=board.find(item=>item.id===id)||rack.find(item=>item.id===id);return tile?{id:tile.id,letter:tile.l,location:board.some(item=>item.id===id)?'board':'rack',...(Number.isFinite(tile.x)?{x:tile.x,y:tile.y}:{})}:{id};}
function qaSelection(){return [...selected].map(qaTile);}
function qaRecord(action,details={}){
 if(!qaJournal.active)return;
 qaJournal.events.push({sequence:(replayHistory.at(-1)?.at||'')+1,at:new Date().toISOString(),action,tool,details,selection:qaSelection(),state:{board:board.map(({id,l,x,y})=>({id,l,x,y})),rack:rack.map(({id,l})=>({id,l})),bunch:bag.length,view:{x:Math.round(pan.x),y:Math.round(pan.y),zoom}}});
 if(qaJournal.events.length>200)qaJournal.events.splice(0,qaJournal.events.length-200);
 retainReplay(qaJournal.events.at(-1));
 qaSave();
}
function qaSave(){try{localStorage.setItem(QA_STORAGE,JSON.stringify(qaJournal));}catch{}const count=$('qa-count');if(count)count.textContent=qaJournal.events.length;$('qa-open')?.querySelector('.record-dot')?.classList.toggle('paused',!qaJournal.active);}
function qaDescribe(event){
 const picked=event.selection.map(tile=>`${tile.letter}(${tile.id}${tile.location==='board'?` @ ${tile.x},${tile.y}`:' · rack'})`).join(', ')||'none';
 const details=Object.entries(event.details||{}).map(([key,value])=>`${key}=${typeof value==='object'?JSON.stringify(value):value}`).join(' · ');
 return `${details}${details?' · ':''}selected: ${picked}`;
}
function qaReport(){
 const lines=[`# Peel QA report`,`Started: ${qaJournal.startedAt}`,`Exported: ${new Date().toISOString()}`,`Browser: ${navigator.userAgent}`,`Events retained: ${qaJournal.events.length}`,'','## Timeline'];
 for(const event of qaJournal.events){const boardLine=event.state.board.map(tile=>`${tile.l}(${tile.id})@${tile.x},${tile.y}`).join(' '),rackLine=event.state.rack.map(tile=>`${tile.l}(${tile.id})`).join(' ');lines.push(`${event.sequence}. [${event.at}] **${event.action}** — ${qaDescribe(event)}\n   Board: ${boardLine||'empty'}\n   Rack: ${rackLine||'empty'} · Bunch: ${event.state.bunch} · View: ${JSON.stringify(event.state.view)}`);}
 lines.push('','## Current state','```json',JSON.stringify({board,rack,bunch:bag.length,selection:qaSelection(),view:{pan,zoom},autoCheck},null,2),'```');
 return lines.join('\n');
}
function renderQaPanel(){
 const root=$('qa-root');
 root.innerHTML=`<aside class="qa-panel" aria-label="QA journal"><div class="qa-panel-head"><div><div class="qa-kicker"><span class="record-dot ${qaJournal.active?'':'paused'}"></span> LOCAL QA JOURNAL</div><h2>${qaJournal.events.length} actions</h2></div><button class="modal-close" id="qa-close" aria-label="Close QA journal">${icon('x')}</button></div><p class="qa-privacy">Actions stay in this browser. When Live local sharing is enabled on the development server, board-changing replay frames also sync to the local project.</p><label class="qa-note-label" for="qa-note">Capture what felt unintuitive</label><textarea id="qa-note" rows="3" placeholder="For example: I expected the crossing word to stay selected…"></textarea><button class="qa-primary" id="qa-add-note">Add note at this moment</button><div class="qa-actions"><button id="qa-toggle">${qaJournal.active?'Pause recording':'Resume recording'}</button><button id="qa-copy">Copy report</button><button id="qa-download">Download JSON</button><button id="qa-clear">Clear</button></div><div class="qa-events">${qaJournal.events.length?qaJournal.events.slice(-50).reverse().map(event=>`<article><time>#${event.sequence} · ${new Date(event.at).toLocaleTimeString()}</time><strong>${event.action}</strong><p>${qaDescribe(event).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</p></article>`).join(''):'<div class="qa-empty">Actions will appear here as you play.</div>'}</div></aside>`;
 $('qa-close').onclick=()=>root.innerHTML='';
 $('qa-toggle').onclick=()=>{qaJournal.active=!qaJournal.active;qaSave();renderQaPanel();};
 $('qa-add-note').onclick=()=>{const note=$('qa-note').value.trim();if(!note)return;const wasActive=qaJournal.active;qaJournal.active=true;qaRecord('qa.note',{note});qaJournal.active=wasActive;qaSave();renderQaPanel();};
 $('qa-copy').onclick=async()=>{const report=qaReport();try{await navigator.clipboard.writeText(report);}catch{const area=document.createElement('textarea');area.value=report;document.body.append(area);area.select();document.execCommand('copy');area.remove();}toast('QA report copied. Paste it into your feedback.');};
 $('qa-download').onclick=()=>{const blob=new Blob([JSON.stringify({...qaJournal,currentState:{board,rack,bag,selection:qaSelection(),pan,zoom,autoCheck}},null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`peel-qa-${new Date().toISOString().replaceAll(':','-')}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),0);};
 $('qa-clear').onclick=()=>{replayHistory=[];try{localStorage.removeItem(REPLAY_STORAGE);}catch{}qaJournal={active:qaJournal.active,startedAt:new Date().toISOString(),events:[]};qaSave();renderQaPanel();};
 $('qa-note').focus();
}
qaSave();
function snapshot(){return JSON.stringify({board,rack,bag,total});}
function save(){history.push(snapshot());if(history.length>150)history.shift();future=[];}
function restore(s){keyboardPlacement=null;suggestion=null;({board,rack,bag,total}=JSON.parse(s));selected.clear();badIds.clear();demoStep=-1;status='Restored. Keep exploring.';render();}
function undo(){pause();if(keyboardPlacement){keyboardPlacement=null;selected.clear();render();qaRecord('floating.cancel',{method:'undo'});return;}if(!history.length)return;future.push(snapshot());restore(history.pop());qaRecord('history.undo');}
function redo(){pause();if(!future.length)return;history.push(snapshot());restore(future.pop());qaRecord('history.redo');}
function toast(msg){clearTimeout(toastTimer);$('toast-root').innerHTML=`<div class="toast"></div>`;$('toast-root').firstChild.textContent=msg;toastTimer=setTimeout(()=>$('toast-root').innerHTML='',3500);}
function tileHTML(t,onBoard){return `<div class="tile ${selected.has(t.id)?'selected':''} ${keyboardPlacement&&selected.has(t.id)&&onBoard?'lifted':''} ${badIds.has(t.id)?'bad':''} ${fresh.has(t.id)?'fresh':''}" data-id="${t.id}" role="button" tabindex="0" aria-label="${t.l}${onBoard?', on board':', in rack'}" aria-pressed="${selected.has(t.id)}" ${onBoard?`style="left:${t.x*48}px;top:${t.y*48}px"`:''}>${t.l}</div>`;}
function showFinderMatches(){
 findMatches=findBoardMatches(board,findQuery);if(findIndex>=findMatches.length)findIndex=0;
 for(const tile of $('plane').querySelectorAll('[data-id]'))tile.classList.remove('find-match','find-current');
 if($('find-bar').hidden)return;
 for(const match of findMatches)for(const id of match.ids)$('plane').querySelector(`[data-id="${id}"]`)?.classList.add('find-match');
 const current=findMatches[findIndex];if(current)for(const id of current.ids)$('plane').querySelector(`[data-id="${id}"]`)?.classList.add('find-current');
 $('find-count').textContent=findMatches.length?`${findIndex+1} / ${findMatches.length}`:'0 matches';$('find-prev').disabled=!findMatches.length;$('find-next').disabled=!findMatches.length;
}
function openFinder(){
 $('find-bar').hidden=false;$('finder-open').classList.add('active');$('find-input').value=findQuery;showFinderMatches();$('find-input').focus();$('find-input').select();qaRecord('finder.open',{query:findQuery});
}
function closeFinder(){
 $('find-bar').hidden=true;$('finder-open').classList.remove('active');for(const tile of $('plane').querySelectorAll('[data-id]'))tile.classList.remove('find-match','find-current');qaRecord('finder.close',{query:findQuery,matches:findMatches.length});
}
function navigateFinder(step){
 if(!findMatches.length)return;findIndex=(findIndex+step+findMatches.length)%findMatches.length;const match=findMatches[findIndex],tiles=match.ids.map(id=>board.find(tile=>tile.id===id));
 const x=tiles.reduce((sum,tile)=>sum+tile.x,0)/tiles.length,y=tiles.reduce((sum,tile)=>sum+tile.y,0)/tiles.length,el=$('board');pan={x:el.clientWidth/2-(x*48+22)*zoom,y:el.clientHeight/2-(y*48+22)*zoom};render();$('find-input').focus();qaRecord('finder.navigate',{query:findQuery,index:findIndex+1,matches:findMatches.length,direction:match.direction,word:match.word});
}
function render(){
 if(autoCheck&&dictionary){const result=validate(board,dictionary);badIds=new Set(result.bad.flatMap(w=>w.ids));if(demoStep<0&&!suggestion&&!keyboardPlacement)status=result.ok&&rack.length?`${result.message} ${rack.length} ${rack.length===1?'tile':'tiles'} to place.`:result.message;}
 if(keyboardPlacement)status='Tiles in hand · arrows to move, Enter to place, Esc to cancel.';
 $('check').classList.toggle('enabled',autoCheck);$('check').setAttribute('aria-pressed',String(autoCheck));$('check').title=autoCheck?'Automatically checking words. Click to turn off.':'Automatic checks are off. Click to turn on.';
 $('plane').innerHTML=board.map(t=>tileHTML(t,true)).join('');$('plane').style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
 $('rack').innerHTML=rack.length?rack.map(t=>tileHTML(t,false)).join(''):`<span class="rack-empty">${icon('check')} Every tile has a place. ${bag.length?'Ready for a fresh one?':'Beautifully done.'}</span>`;
 $('rack-count').textContent=rack.length?`${rack.length} to find a home`:'All tucked in.';
 $('words-stat').textContent=getWords(board).length;$('bunch-stat').textContent=bag.length;
 const score=commonRanks?scoreBoard(board,commonRanks,commonWords.length):null,modified=score&&scoreRun.modifierIds.length?scoreWithModifiers(board,score,scoreRun.modifierIds):null;$('score-stat').textContent=modified?modified.total:score?score.overall:'—';$('score-open').title=score?`${modified?'Run':'Board'} score ${modified?modified.total:score.overall}: shape ${score.shape}, commonness ${score.commonness}${modified?`, rule bonus ${modified.bonus}`:''}`:'Commonness data is loading';
 $('status').innerHTML=icon(badIds.size?'help':'check')+`<span></span>`;$('status').lastChild.textContent=status;
 $('selection-info').textContent=selected.size?`${selected.size} selected · click a space to place · click tile again to deselect`:'Arrows or WASD pan · double-click selects a word';
 $('undo').disabled=!history.length;$('redo').disabled=!future.length;$('zoom-label').textContent=`${Math.round(zoom*100)}%`;
 $('peel').disabled=playing;$('peel').innerHTML=scoreRun.status==='choosing'?`Choose rule ${icon('spark')}`:scoreRun.status==='playing'?`Bank ${scoreRun.stage} ${icon('arrow')}`:bag.length?`Peel ${icon('plus')}`:`Finish ${icon('check')}`;
 $('suggest').disabled=playing||!rack.length;$('suggest-label').textContent=suggestion?'Place idea':'Suggest';$('suggest').classList.toggle('ready',Boolean(suggestion));
 $('dictionary-open').disabled=!baseDictionary;
 $('board').classList.toggle('pan',tool==='pan');
 document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));
 $('board').querySelector('.empty-message')?.remove();if(!board.length)$('board').insertAdjacentHTML('beforeend','<div class="empty-message"><strong>Every word starts somewhere.</strong>Drag a tile here, or click a tile and then a spot.</div>');
 updateDemo();showGhost(lastPointer);showSuggestion();showFinderMatches();showFreeTiles();showComponentBoundaries();if(scorePanelOpen)openScore(true);try{localStorage.setItem('peel-game',snapshot());}catch{}scheduleLocalShare();
}
function showComponentBoundaries(){
 $('plane').querySelector('.component-boundaries')?.remove();
 const flashing=Date.now()<componentFlashUntil;
 if(!autoCheck&&!flashing)return;
 const groups=connectedComponents(board);if(groups.length<2)return;
 const largest=groups.reduce((best,group,index)=>group.length>groups[best].length?index:best,0);
 const colors=['#267bb0','#b15b20','#8c57ad','#288578'];
 const layer=document.createElementNS('http://www.w3.org/2000/svg','svg');layer.classList.add('component-boundaries');layer.setAttribute('aria-label',`${groups.length} disconnected groups`);
 groups.forEach((group,index)=>{
  if(index===largest&&!flashing)return;
  const color=colors[index]||`hsl(${(index*137.508)%360} 55% 40%)`,top=[...group].sort((a,b)=>a.y-b.y||a.x-b.x)[0];
  const path=document.createElementNS(layer.namespaceURI,'path');path.setAttribute('d',componentBoundary(group));path.setAttribute('stroke',color);path.setAttribute('class','component-outline');path.setAttribute('vector-effect','non-scaling-stroke');
  const title=document.createElementNS(layer.namespaceURI,'title');title.textContent=`Group ${index+1}: ${group.length} ${group.length===1?'tile':'tiles'}`;path.append(title);layer.append(path);
  const label=document.createElementNS(layer.namespaceURI,'text');label.setAttribute('x',top.x*48+3);label.setAttribute('y',top.y*48-8);label.setAttribute('fill',color);label.textContent=`${index+1}`;layer.append(label);
 });
 $('plane').append(layer);
 if(flashing)layer.classList.add('component-flash');
 if(status.includes('Bring your tiles together'))$('status').lastChild.textContent=`Bring your tiles together: ${groups.length} groups to connect.`;
}
function fit(){const el=$('board');if(!board.length){zoom=.85;pan={x:el.clientWidth/2-140,y:el.clientHeight/2-140};render();return;}const xs=board.map(t=>t.x),ys=board.map(t=>t.y);const minX=Math.min(...xs),minY=Math.min(...ys),w=(Math.max(...xs)-minX+1)*48,h=(Math.max(...ys)-minY+1)*48;zoom=Math.min(1,(el.clientWidth-90)/w,(el.clientHeight-72)/h);pan={x:(el.clientWidth-w*zoom)/2-minX*48*zoom,y:(el.clientHeight-h*zoom)/2-minY*48*zoom-6};render();}
function changeZoom(delta){const old=zoom;zoom=Math.max(.35,Math.min(1.6,zoom+delta));const el=$('board');pan={x:el.clientWidth/2-(el.clientWidth/2-pan.x)*zoom/old,y:el.clientHeight/2-(el.clientHeight/2-pan.y)*zoom/old};render();}
function check(announce=true){if(!dictionary){if(announce)toast('The word list is loading. Try again in a moment.');return false;}const result=validate(board,dictionary);badIds=new Set(result.bad.flatMap(w=>w.ids));status=result.message;render();if(announce)toast(result.message);return result.ok;}
function showSuggestion(){
 if(!suggestion)return;
 const layer=document.createElement('div');layer.className='suggestion-layer';layer.setAttribute('aria-hidden','true');
 layer.innerHTML=suggestion.placements.map(tile=>`<div class="tile suggestion-tile" style="left:${tile.x*48}px;top:${tile.y*48}px">${tile.l}</div>`).join('');
 $('plane').append(layer);
 for(const id of suggestion.anchors)$('plane').querySelector(`[data-id="${id}"]`)?.classList.add('suggestion-anchor');
 for(const tile of suggestion.placements)$('rack').querySelector(`[data-id="${tile.id}"]`)?.classList.add('suggestion-rack');
}
function suggestIdea(){
 pause();keyboardPlacement=null;selected.clear();lastClick=null;clearGhost();
 if(suggestion){
  const word=suggestion.word,ids=new Set(suggestion.placements.map(tile=>tile.id));
  save();board.push(...suggestion.placements);rack=rack.filter(tile=>!ids.has(tile.id));
  suggestion=null;demoStep=-1;badIds.clear();fresh.clear();status=`Placed ${word}. You can undo if another idea feels better.`;render();qaRecord('suggestion.place',{word,tiles:[...ids]});return;
 }
 if(!dictionary){toast('The word list is still loading.');return;}
 suggestion=findSuggestion(board,rack,dictionary,suggestionWords.length?suggestionWords:SUGGESTION_WORDS);
 if(!suggestion){status='No simple word idea found here. Rearrange a crossing or dump a tile and try again.';render();qaRecord('suggestion.none');return;}
 status=`Idea: ${suggestion.word}. The gold tiles show the play; choose Place idea to use it.`;render();qaRecord('suggestion.preview',{word:suggestion.word,placements:suggestion.placements.map(({id,l,x,y})=>({id,l,x,y}))});
}
function scoreMetric(label,value,detail){const type={'Enclosed hull':'coverage','Hull fill':'hull','Ponds':'ponds','Diamond fill':'diamond','Box fill':'box','Solid core':'solid','Longest word':'longest','Strongest word':'strongest','Woven region':'woven'}[label];return `<div class="score-metric" ${type?`id="inspect-${type}" tabindex="0" data-score-inspect="${type}" title="Hover or focus to show the scored region on the board"`:''}><div><strong>${label}${type?' · inspect':''}</strong><span>${detail}</span></div><b>${value}</b><i><span style="width:${value}%"></span></i></div>`;}
function currentModifiedScore(){const base=scoreBoard(board,commonRanks||new Map(),commonWords.length||50000);return {base,modified:scoreWithModifiers(board,base,scoreRun.modifierIds)};}
function runEligibility(modified){
 if(rack.length)return {ok:false,message:`Place ${rack.length} remaining ${rack.length===1?'tile':'tiles'} before banking.`};
 const validation=dictionary?validate(board,dictionary):{ok:false,message:'The word list is still loading.'};
 if(!validation.ok)return {ok:false,message:validation.message};
 const target=SCORE_RUN_TARGETS[scoreRun.stage-1];
 if(modified.total<target)return {ok:false,message:`Find ${target-modified.total} more points to reach ${target}.`};
 return {ok:true,message:`Target met. Bank ${modified.total} points.`};
}
function modifierCards(ids){return ids.map(id=>{const item=SCORE_MODIFIERS.find(modifier=>modifier.id===id);return `<button class="modifier-card" data-run-modifier="${item.id}"><strong>${item.name}</strong><span>${item.description}</span></button>`;}).join('');}
function scoreRunHTML(score,modified){
 if(scoreRun.status==='inactive')return `<section class="score-run"><div class="score-run-head"><div><span>OPTIMIZATION RUN</span><h3>Build for strange little rules.</h3></div><b>${SCORE_MODIFIERS.length} modifiers</b></div><p>Play five stages. Before each stage, choose a scoring rule, reshape your crossword, and reach the next target. Rules stack; every banked board adds to your run total.</p><button class="run-primary" id="run-start">Start a five-stage run ${icon('arrow')}</button></section>`;
 if(scoreRun.status==='complete')return `<section class="score-run complete"><div class="score-run-head"><div><span>RUN COMPLETE</span><h3>${scoreRun.cumulative} points banked.</h3></div><b>5 / 5</b></div><div class="run-history">${scoreRun.scores.map(item=>`<span>Stage ${item.stage}<strong>${item.total}</strong></span>`).join('')}</div><button class="run-primary" id="run-start">Play another run ${icon('arrow')}</button></section>`;
 if(scoreRun.status==='choosing')return `<section class="score-run"><div class="score-run-head"><div><span>STAGE ${scoreRun.stage} OF 5 · TARGET ${SCORE_RUN_TARGETS[scoreRun.stage-1]}</span><h3>Choose your next rule.</h3></div><b>${scoreRun.cumulative} banked</b></div><div class="modifier-grid">${modifierCards(scoreRun.choices)}</div><button class="run-link" id="run-abandon">End run</button></section>`;
 const eligibility=runEligibility(modified);
 return `<section class="score-run"><div class="score-run-head"><div><span>STAGE ${scoreRun.stage} OF 5 · TARGET ${SCORE_RUN_TARGETS[scoreRun.stage-1]}</span><h3>${modified.total} points on this board.</h3></div><b>${scoreRun.cumulative} banked</b></div><div class="run-equation"><span>Base<strong>${modified.base}</strong></span><i>+</i><span>Rules<strong>${modified.bonus}</strong></span><i>=</i><span>Total<strong>${modified.total}</strong></span></div><div class="active-modifiers">${modified.modifiers.map(item=>`<div><strong>${item.name}</strong><span>+${item.bonus}</span><small>${item.description}</small></div>`).join('')}</div><p class="run-readiness ${eligibility.ok?'ready':''}">${eligibility.message}</p><button class="run-primary" id="run-bank" ${eligibility.ok?'':'disabled'}>Bank stage ${scoreRun.stage} ${icon('arrow')}</button><button class="run-link" id="run-abandon">End run</button></section>`;
}
function startScoreRun(){
 scoreRun={status:'choosing',stage:1,cumulative:0,modifierIds:[],choices:[],scores:[]};scoreRun.choices=scoreRunChoices();
 newGame(false,true);scoreRunSave();render();openScore();qaRecord('score_run.start',{choices:scoreRun.choices});
}
function chooseScoreModifier(id){
 if(scoreRun.status!=='choosing'||!scoreRun.choices.includes(id))return;
 scoreRun.modifierIds.push(id);scoreRun.status='playing';scoreRun.choices=[];
 let peeled=null;if(scoreRun.stage>1&&bag.length){save();peeled=bag.shift();rack.push(peeled);selected=new Set([peeled.id]);anchorId=peeled.id;fresh=new Set([peeled.id]);tool='move';}
 status=peeled?`Stage ${scoreRun.stage}: ${peeled.l} is in your hand. Build for ${SCORE_RUN_TARGETS[scoreRun.stage-1]} points.`:`Stage 1: place every tile and build for ${SCORE_RUN_TARGETS[0]} points.`;
 scoreRunSave();closeModal();render();qaRecord('score_run.modifier',{stage:scoreRun.stage,id,peeled:peeled&&{id:peeled.id,letter:peeled.l}});toast(`Rule added: ${SCORE_MODIFIERS.find(item=>item.id===id).name}`);
}
function bankScoreStage(){
 if(scoreRun.status!=='playing')return;const {base,modified}=currentModifiedScore(),eligibility=runEligibility(modified);if(!eligibility.ok){toast(eligibility.message);return;}
 const banked={stage:scoreRun.stage,base:base.overall,bonus:modified.bonus,total:modified.total,modifiers:[...scoreRun.modifierIds]};scoreRun.scores.push(banked);scoreRun.cumulative+=modified.total;
 if(scoreRun.stage===5)scoreRun.status='complete';else{scoreRun.stage++;scoreRun.status='choosing';scoreRun.choices=scoreRunChoices();}
 scoreRunSave();render();openScore();qaRecord('score_run.bank',banked);
}
function abandonScoreRun(){const stage=scoreRun.stage,cumulative=scoreRun.cumulative;scoreRun=emptyScoreRun();scoreRunSave();render();openScore();qaRecord('score_run.abandon',{stage,cumulative});}
function openScore(refresh=false){
 if(!commonRanks){if(!refresh)toast('Commonness data is still loading.');return;}
 const key=snapshot()+JSON.stringify(scoreRun)+JSON.stringify(dictionaryOverrides);
 if(refresh===true&&scorePanelKey===key){showScoreInspection();return;}
 scorePanelKey=key;
 const score=scoreBoard(board,commonRanks,commonWords.length);
 const modified=scoreWithModifiers(board,score,scoreRun.modifierIds);
 const power=wordPower(board);
 inspectedPower=power;inspectedWoven=wovenRegions(board);
 densityRectangle=bestDensityRectangle(board);
 inspectedGeometry=boardScoreGeometry(board,score);
 const words=score.words.length?score.words.map(item=>`<tr tabindex="0" data-score-inspect="${item.word}"><td>${item.word}</td><td><span class="word-commonness"><i style="width:${item.commonness}%"></i></span></td><td>${item.commonness}</td><td title="Global frequency rank: ${item.rank||'unranked'}">${item.lengthRank?`#${item.lengthRank.toLocaleString()} / ${item.lengthCount.toLocaleString()}<br><small>${item.word.length}-letter words</small>`:'unranked'}</td></tr>`).join(''):'<tr><td colspan="4">Build a word to score its familiarity.</td></tr>';
 presentScore(`<div class="score-heading"><div><div class="eyebrow">BOARD SCORE</div><h2>${score.overall}<small>/ 100</small></h2></div><div><strong>${score.shape}</strong><span>shape</span></div><div><strong>${score.commonness}</strong><span>commonness</span></div><div><strong>${score.pondRank}</strong><span>pond rank</span></div></div><p>Shape contributes 45%, frequency among words of the same length 40%, and longest word 15%. Only the maximum word length earns the length reward.</p>${scoreMetric('Hull fill',score.hullDensity,`${board.length} occupied tiles ÷ ${score.hullArea} hull area. 60% of shape; solid core 15%, ponds 25%.`)}${scoreMetric('Enclosed hull',score.hullCoverage,`(${board.length} tiles + ${score.enclosedArea} enclosed empty cells) ÷ ${score.hullArea} hull area. All enclosure sizes count. Inspect highlights the remaining ${score.caveArea} square units of open caves. Separate from the base score.`)}${scoreMetric('Solid core',score.solidCoreScore,`4 × ${score.solidRectangleArea} cells in the largest filled rectangle, capped at 100`)}${scoreMetric('Ponds',score.pondScore,`rank ${score.pondRank} · minimum 4 cells per pond${score.pondAreas.length?` · areas ${score.pondAreas.join(', ')}`:''}`)}${scoreMetric('Longest word',score.lengthScore,`${power.longestWords.join(', ')||'No words yet'} · ${power.longest} letters. Only the longest word counts: 12.5 per letter after the second, capped at 100. Contributes up to 15 points.`)}<h3 class="score-subhead">Commonness within each word length</h3><div class="score-table-wrap"><table class="score-table"><thead><tr><th>Word</th><th></th><th>Score</th><th>Within length</th></tr></thead><tbody>${words}</tbody></table></div><p class="score-footnote">Pond rank counts enclosed empty regions of at least four cells. Corner-sealed regions count equally. Commonness is the frequency percentile among same-length words in our ${commonWords.length.toLocaleString()}-word Wikipedia list. Higher means more frequent within that length. This is a corpus comparison; unranked words score 0 because frequency data is missing.</p>${scoreMetric('Strongest word',power.maxScrabble,`${power.maxScrabbleWords.join(', ')||'No words yet'} · maximum plain Scrabble value; no premiums. Heavyweight awards this as bonus points when active.`)}${scoreMetric('Woven region',inspectedWoven.largest,`Largest connected group of occupied tiles in runs of 3+ across AND down. ${inspectedWoven.tiles.length} qualifying tiles in ${inspectedWoven.regions.length} regions; gaps excluded. Highlights show the two largest (including ties), plus others at least 80% of the largest.`)}<details class="alternative-metrics"><summary>Other shape and word metrics</summary>${scoreMetric('Diamond fill',score.l1Density,`${board.length} tiles ÷ ${score.l1Area} cells in the smallest L1 ball · radius ${score.l1Radius}`)}${scoreMetric('Box fill',score.rectangleDensity,`${board.length} tiles ÷ ${score.boundsArea} cells in the enclosing rectangle`)}<section class="word-power-metrics" tabindex="0" data-score-inspect="rectangle"><h3 class="score-subhead">Best density² rectangle · hover to inspect</h3><p><strong>${densityRectangle?densityRectangle.value.toFixed(2):0}</strong> = occupied² ÷ area<br>${densityRectangle?`${densityRectangle.occupied} tiles / ${densityRectangle.area} cells · ${(densityRectangle.density*100).toFixed(1)}% full · ${densityRectangle.width} × ${densityRectangle.height}`:'Place tiles to find a rectangle.'}</p><p>Experimental metric; separate from the base score.</p></section><section class="word-power-metrics"><h3 class="score-subhead">Word power · experimental</h3><p><strong>Scrabble²: ${power.scrabbleSquares}</strong><br>Each word’s plain letter value, squared and summed. Shared letters count in each word. No premiums; separate from the base score.</p><details><summary>Word values</summary>${power.words.sort((a,b)=>b.squared-a.squared).map(w=>`<div tabindex="0" data-score-inspect="${w.word}">${w.word}: ${w.value}² = ${w.squared}</div>`).join('')}</details></section></details>${scoreRunHTML(score,modified)}`);

 $('run-start')?.addEventListener('click',startScoreRun);$('run-bank')?.addEventListener('click',bankScoreStage);$('run-abandon')?.addEventListener('click',abandonScoreRun);
 for(const button of document.querySelectorAll('[data-run-modifier]'))button.onclick=()=>chooseScoreModifier(button.dataset.runModifier);
 bindScoreInspection();showScoreInspection();
 if(refresh!==true)qaRecord('score.open',{overall:score.overall,shape:score.shape,commonness:score.commonness,pondRank:score.pondRank});
}
function changed(){inputTour=null;$('board').querySelector('.demo-pointer')?.remove();keyboardPlacement=null;suggestion=null;demoStep=-1;badIds.clear();fresh.clear();status=autoCheck?'Checking your board…':'Auto-check is off. Words will be checked when you peel.';render();}
function move(ids,dx,dy,method='move'){const moved=[...ids];if(!dx&&!dy)return true;if(!canMove(board,ids,dx,dy)){toast('That space is taken. Your tiles stayed in place.');qaRecord('group.move.blocked',{method,tiles:moved,dx,dy});return false;}save();board=board.map(t=>ids.has(t.id)?{...t,x:t.x+dx,y:t.y+dy}:t);changed();qaRecord('group.move',{method,tiles:moved,dx,dy});return true;}
function placeRack(id,x,y,method='click_destination'){if(board.some(t=>t.x===x&&t.y===y)){toast('That spot already has a tile.');qaRecord('rack.place.blocked',{method,tile:id,x,y});return;}const t=rack.find(t=>t.id===id);if(!t)return;save();rack=rack.filter(t=>t.id!==id);board.push({...t,x,y});selected.clear();changed();qaRecord('rack.place',{method,tile:id,letter:t.l,x,y});}
function returnTiles(method='delete'){const found=board.filter(t=>selected.has(t.id));if(!found.length)return;save();rack.push(...found.map(({id,l})=>({id,l})));board=board.filter(t=>!selected.has(t.id));selected.clear();changed();qaRecord('group.return_to_rack',{method,tiles:found.map(({id,l,x,y})=>({id,l,x,y}))});}
function pickupOrPeel(){
 if(!rack.length){peel();return;}
 pause();suggestion=null;
 const held=rack.find(t=>selected.has(t.id)),tile=held||rack[0];
 if(!held)keyboardPlacement=null;
 selected=new Set([tile.id]);anchorId=tile.id;lastClick=null;tool='move';
 render();qaRecord('rack.pick_up',{method:'space',tile:tile.id,letter:tile.l,alreadyHeld:Boolean(held)});
}
function peel(){if(scoreRun.status==='choosing'){openScore();return;}if(scoreRun.status==='playing'){bankScoreStage();return;}pause();suggestion=null;if(keyboardPlacement){toast('Place your held tiles with Enter or a click before peeling.');qaRecord('peel.blocked',{reason:'floating_selection'});return;}if(rack.length){toast('Place all your tiles before you peel.');qaRecord('peel.blocked',{reason:'rack_not_empty',rack:rack.length});return;}if(!check(false)){flashDisconnectedGroups();toast(status);qaRecord('peel.blocked',{reason:'invalid_board',status});return;}if(!bag.length){modal(`<h2>Bananas! You did it.</h2><p>${board.length} tiles. ${getWords(board).length} connected words. A whole board of little possibilities.</p><button class="demo-play" id="win-new">Make another board ${icon('arrow')}</button>`);$('win-new').onclick=newGameDialog;qaRecord('game.finish');return;}save();demoStep=-1;const t=bag.shift();rack.push(t);selected=new Set([t.id]);anchorId=t.id;tool='move';fresh=new Set([t.id]);status=`You peeled ${t.l}. Find it a home.`;render();qaRecord('peel',{tile:t.id,letter:t.l});}
function updateDemo(){const finished=demoStep>=19;$('demo-play').innerHTML=icon(playing?'pause':'play')+(playing?'Pause demo':finished?'Play it again':demoStep<0?'Watch the demo':'Continue demo');$('demo-count').textContent=demoStep<0?'21 tiles. 12 peels.':demoStep<7?`Building · ${Math.max(0,demoStep)} / 7 words`:`Peel ${Math.min(12,demoStep-7)} of 12`;$('demo-progress').style.width=`${Math.max(0,demoStep)/19*100}%`;$('demo-next').disabled=finished;$('input-demo').innerHTML=icon('cursor')+(inputTour?(playing?'Pause input tour':'Continue input tour'):'Watch moves, swaps & selections');}
function pause(){playing=false;clearTimeout(timer);timer=null;updateDemo();}
function beginDemo(){inputTour=null;$('board').querySelector('.demo-pointer')?.remove();tool='move';keyboardPlacement=null;suggestion=null;save();board=[];rack=initialTiles().map(({id,l})=>({id,l}));bag=PEELS.map((p,i)=>({id:`p${i}`,l:p.l}));total=33;selected.clear();fresh.clear();badIds.clear();demoStep=0;startTime=Date.now();status='The first 21 tiles. Let’s make some connections.';scoreRun=emptyScoreRun();scoreRunSave();fit();}
function nextDemo(){if(inputTour){nextInputTour();return;}if(demoStep<0){beginDemo();}if(demoStep>=19){pause();return;}
 save();fresh.clear();
 if(demoStep<7){const [word,x,y,dir]=INITIAL[demoStep];[...word].forEach((l,i)=>{const px=x+(dir==='h'?i:0),py=y+(dir==='v'?i:0);if(board.some(t=>t.x===px&&t.y===py))return;const index=rack.findIndex(t=>t.l===l);const [t]=rack.splice(index,1);board.push({...t,x:px,y:py});fresh.add(t.id);});$('demo-note').textContent=demoStep===0?'Start with STONE. A simple word opens the board.':`Connect ${word} through a shared letter. Leave yourself room to grow.`;demoStep++;status=demoStep===7?'21 tiles connected. Time for the first peel.':`Building the starting board · ${demoStep} of 7 words.`;fit();
 }else{const p=PEELS[demoStep-7];if(!rack.length){const t=bag.shift();rack=[t];fresh.add(t.id);status=`Peel ${demoStep-6}: a new ${p.l}. Where could it go?`;$('demo-note').textContent=`A fresh ${p.l}. Look for a word you can extend…`;render();return;}const t=rack.shift();board.push({...t,x:p.x,y:p.y});fresh.add(t.id);demoStep++;$('demo-note').textContent=p.note;status=demoStep===19?'Bananas! All 33 tiles in one connected board.':`${p.word}. Same board, one new possibility.`;fit();if(demoStep===19)pause();}
}
function runDemo(){if(inputTour){pause();runInputTour();return;}if(demoStep<0||demoStep>=19)beginDemo();playing=true;updateDemo();function tick(){if(!playing)return;nextDemo();if(playing)timer=setTimeout(tick,rack.length&&demoStep>=7?1100:1500);}tick();}
function modal(html){$('modal-root').innerHTML=`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><button class="modal-close" aria-label="Close">${icon('x')}</button>${html}</div></div>`;$('modal-root').querySelector('.modal-close').onclick=closeModal;$('modal-root').querySelector('.modal-backdrop').onclick=e=>{if(e.target.classList.contains('modal-backdrop'))closeModal();};$('modal-root').querySelector('button').focus();}
function closeModal(){$('modal-root').innerHTML='';}
function newGameDialog(){pause();modal('<h2>A fresh bunch.</h2><p>Start with 21 tiles. Make one connected crossword, then peel a tile at a time. Empty the bunch to finish.</p><div class="game-choice"><button id="quick">Little bunch<small>33 tiles · a gentle puzzle</small></button><button id="classic">Full bunch<small>144 tiles · settle in</small></button></div><p>Your current board stays available with Undo.</p>');$('quick').onclick=()=>newGame(false);$('classic').onclick=()=>newGame(true);}
function shuffleArray(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function newGame(classic,preserveRun=false){pause();inputTour=null;$('board').querySelector('.demo-pointer')?.remove();tool='move';keyboardPlacement=null;suggestion=null;save();closeModal();if(!preserveRun){scoreRun=emptyScoreRun();scoreRunSave();}let tiles;if(classic){const distribution={A:13,B:3,C:3,D:6,E:18,F:3,G:4,H:3,I:12,J:2,K:2,L:5,M:3,N:8,O:11,P:3,Q:2,R:9,S:6,T:9,U:6,V:3,W:3,X:2,Y:3,Z:2};tiles=shuffleArray(Object.entries(distribution).flatMap(([l,n])=>Array(n).fill(l))).map((l,i)=>({id:`n${i}`,l}));}else tiles=shuffleArray([...initialTiles().map(({l})=>l),...PEELS.map(p=>p.l)]).map((l,i)=>({id:`n${i}`,l}));total=tiles.length;rack=tiles.slice(0,21);bag=tiles.slice(21);board=[];selected.clear();badIds.clear();demoStep=-1;fresh.clear();startTime=Date.now();status='Your fresh bunch is ready. Make your first word.';$('demo-note').textContent='Same board. A new possibility with every peel.';fit();qaRecord('game.new',{size:classic?'full':'little',tiles:total,scoreRun:preserveRun});}
$('qa-open').onclick=renderQaPanel;$('dictionary-open').onclick=()=>openDictionary();$('score-open').onclick=openScore;$('finder-open').onclick=()=>$('find-bar').hidden?openFinder():closeFinder();$('find-close').onclick=closeFinder;$('find-prev').onclick=()=>navigateFinder(-1);$('find-next').onclick=()=>navigateFinder(1);$('find-input').oninput=e=>{findQuery=e.target.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,12);e.target.value=findQuery;findIndex=0;showFinderMatches();clearTimeout(findLogTimer);findLogTimer=setTimeout(()=>qaRecord('finder.query',{query:findQuery,matches:findMatches.length}),300);};$('find-input').onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();closeFinder();$('finder-open').focus();}else if(e.key==='Enter'){e.preventDefault();navigateFinder(e.shiftKey?-1:1);}};$('help').onclick=()=>modal(`<h2>A little word play.</h2><p>A relaxed, single-player take on Bananagrams.</p><ol><li>Arrange all 21 starting tiles into one connected crossword. Words read left to right or top to bottom.</li><li>When every tile is placed and all words are valid, hit <strong>Peel</strong> to draw one more.</li><li>Rearrange as much as you like. Empty the bunch and hit <strong>Finish</strong> to win.</li></ol><p><strong>Make space:</strong> drag tiles, double-click a word, or draw a selection box. Arrow keys float selected tiles; Enter places and Escape cancels. With nothing selected, arrows or WASD pan the board. Spacebar picks up a rack tile, or peels when the rack is empty. Press X or hold Alt to swap.</p><p><strong>Find something:</strong> Find highlights a letter everywhere or an n-gram inside horizontal and vertical words. Enter and Shift+Enter cycle through matches. Cmd/Ctrl+F opens it.</p><p><strong>Stuck?</strong> Suggest previews a valid play using your rack; choose Place idea to accept it. Dump exchanges one selected tile from the rack or board for three from the bunch. Use Fit to see everything.</p><p><strong>Your words:</strong> use Words to add a missing word, hide an unwanted bundled word, or restore an earlier choice. Overrides stay in this browser.</p><p><strong>Scoring runs:</strong> open Score to start a five-stage optimization run. Pick one of ${SCORE_MODIFIERS.length} scoring modifiers at each stage; the rules stack as you reshape and extend the board.</p><p><strong>QA journal:</strong> the QA button opens a local action timeline. Add a note when something feels wrong, then copy the report into your feedback. It stays in this browser; Live local sharing also saves replay board states to the local project when enabled.</p><p>Words are checked automatically as you build. Switch off Auto-check to experiment without highlights. Peeling always checks your board. Checks use a bundled English word list. Proper names are excluded; some modern words may be missing. The guided demo completes a 33-tile round.</p><button class="demo-play" id="got-it">Let’s play ${icon('arrow')}</button>`);$('help').addEventListener('click',()=>{$('got-it').onclick=closeModal;});$('new').onclick=newGameDialog;$('undo').onclick=undo;$('redo').onclick=redo;$('suggest').onclick=suggestIdea;$('check').onclick=()=>{autoCheck=!autoCheck;badIds.clear();status=autoCheck?'Checking your board…':'Auto-check is off. Words will be checked when you peel.';try{localStorage.setItem('peel-auto-check',String(autoCheck));}catch{}render();qaRecord('auto_check.toggle',{enabled:autoCheck});};$('peel').onclick=peel;$('zoom-in').onclick=()=>{changeZoom(.1);qaRecord('view.zoom',{method:'button',zoom});};$('zoom-out').onclick=()=>{changeZoom(-.1);qaRecord('view.zoom',{method:'button',zoom});};$('fit').onclick=()=>{fit();qaRecord('view.fit');};
$('demo-play').onclick=()=>{const action=playing?'pause':'play';playing?pause():runDemo();qaRecord('demo.control',{action});};$('demo-next').onclick=()=>{pause();nextDemo();qaRecord('demo.control',{action:'next',step:demoStep});};$('demo-reset').onclick=()=>{pause();beginDemo();$('demo-note').textContent='21 letters, a blank board, and a little possibility.';qaRecord('demo.control',{action:'restart'});};
$('shuffle').onclick=()=>{if(rack.length<2)return;pause();suggestion=null;save();shuffleArray(rack);render();qaRecord('rack.shuffle');};
$('dump').onclick=()=>{pause();const chosen=[...rack,...board].filter(t=>selected.has(t.id));if(chosen.length!==1){toast('Select one tile in your rack or on the board to dump.');qaRecord('dump.blocked',{reason:'selection_count',count:chosen.length});return;}if(bag.length<3){toast('A dump needs at least three tiles in the bunch.');qaRecord('dump.blocked',{reason:'small_bunch',bunch:bag.length});return;}const dumped=qaTile(chosen[0].id);save();rack=rack.filter(t=>t.id!==chosen[0].id);board=board.filter(t=>t.id!==chosen[0].id);const drawn=bag.splice(0,3);rack.push(...drawn);bag.push({id:chosen[0].id,l:chosen[0].l});shuffleArray(bag);selected.clear();changed();qaRecord('dump',{dumped,drawn:drawn.map(({id,l})=>({id,l}))});};
for(const b of document.querySelectorAll('[data-tool]'))b.onclick=()=>{tool=b.dataset.tool;render();qaRecord('tool.change',{tool});};
function point(e){const r=$('board').getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
function cell(p){return {x:Math.floor((p.x-pan.x)/(48*zoom)),y:Math.floor((p.y-pan.y)/(48*zoom))};}
let anchorId=null,lastPointer=null,lastClick=null,lastWordSelection=null,keyboardPlacement=null,altSwap=false;
function clearGhost(){
 $('plane').querySelector('.ghost-layer')?.remove();
 document.querySelector('.carry-tile')?.remove();
 $('board').querySelector('.placement-hint')?.remove();
 $('board').classList.remove('placing','swapping');
 $('plane').querySelectorAll('.swap-target').forEach(el=>el.classList.remove('swap-target'));
}
function showGhost(p){
 clearGhost();
 if(drag||(!['move','swap'].includes(tool)&&!altSwap)||!selected.size)return;
 const rackTile=rack.find(t=>selected.has(t.id));
 const moving=board.filter(t=>selected.has(t.id));
 if(!rackTile&&!moving.length)return;
 if(!keyboardPlacement&&(!p||p.x<0||p.y<0||p.x>=$('board').clientWidth||p.y>=$('board').clientHeight)){
  if(p&&rackTile){const r=$('board').getBoundingClientRect(),carry=document.createElement('div');carry.className='carry-tile';carry.textContent=rackTile.l;carry.setAttribute('aria-hidden','true');carry.style.left=Math.min(innerWidth-46,r.left+p.x+15)+'px';carry.style.top=Math.min(innerHeight-48,r.top+p.y+15)+'px';document.body.append(carry);}return;
 }
 const target=keyboardPlacement||cell(p),anchor=moving.find(t=>t.id===anchorId)||moving[0];
 if(keyboardPlacement)p={x:pan.x+(target.x*48+22)*zoom,y:pan.y+(target.y*48+22)*zoom};
 const dx=anchor?target.x-anchor.x:0,dy=anchor?target.y-anchor.y:0;
 const swapMode=tool==='swap'||altSwap;
 const destination=board.find(t=>t.x===target.x&&t.y===target.y&&!selected.has(t.id));
 const swapping=swapMode&&selected.size===1&&destination;
 const valid=swapping||(rackTile?!board.some(t=>t.x===target.x&&t.y===target.y):canMove(board,selected,dx,dy));
 if(!keyboardPlacement&&!rackTile&&dx===0&&dy===0)return;
 const previews=rackTile?[{...rackTile,x:target.x,y:target.y}]:moving.map(t=>({...t,x:t.x+dx,y:t.y+dy}));
 if(swapping&&anchor)previews.push({...destination,x:anchor.x,y:anchor.y});
 if(swapping){$('plane').querySelector(`[data-id="${destination.id}"]`)?.classList.add('swap-target');$('board').classList.add('swapping');}
 const layer=document.createElement('div');layer.className=`ghost-layer ${keyboardPlacement?'floating':''} ${valid?'':'blocked'}`;layer.setAttribute('aria-hidden','true');
 layer.innerHTML=previews.map(t=>`<div class="tile ghost" style="left:${t.x*48}px;top:${t.y*48}px">${t.l}</div>`).join('');
 $('plane').append(layer);$('board').classList.add('placing');
 const hint=document.createElement('div');hint.className=`placement-hint ${valid?'':'blocked'}`;
 hint.textContent=swapping?`${keyboardPlacement?'Enter':'Click'} to swap ${rackTile?.l||anchor.l} ↔ ${destination.l}`:valid?(keyboardPlacement?'Enter to place · Esc to cancel':'Click to place · Esc to cancel'):(keyboardPlacement?'Keep moving · this spot is occupied':'Occupied · press X or hold Alt to swap');
 hint.style.left=Math.max(8,Math.min(p.x+14,$('board').clientWidth-185))+'px';
 hint.style.top=Math.max(8,Math.min(p.y+34,$('board').clientHeight-75))+'px';
 $('board').append(hint);
}
function selectWord(id){
 const words=getWords(board).filter(w=>w.ids.includes(id));if(!words.length)return;
 const index=lastWordSelection?.id===id?(lastWordSelection.index+1)%words.length:0;
 selected=new Set(words[index].ids);anchorId=id;lastWordSelection={id,index};
 qaRecord('selection.word',{anchor:id,word:words[index].word,crossingIndex:index});
}
function clickTile(id,wasSelected){
 const now=performance.now();
 if(lastClick?.id===id&&now-lastClick.time<350&&board.some(t=>t.id===id)){
  selectWord(id);lastClick=null;
 }else{
  if(wasSelected)selected.delete(id);else selected.add(id);
  anchorId=selected.has(id)?id:null;lastClick={id,time:now};
  qaRecord(wasSelected?'selection.tile.remove':'selection.tile.add',{tile:qaTile(id)});
 }
}
function updateMarquee(p,d){
 const x1=Math.min(p.x,d.start.x),x2=Math.max(p.x,d.start.x),y1=Math.min(p.y,d.start.y),y2=Math.max(p.y,d.start.y);
 selected=new Set(d.base);
 for(const t of board){
  const left=pan.x+t.x*48*zoom,top=pan.y+t.y*48*zoom;
  if(x2>=left&&x1<=left+44*zoom&&y2>=top&&y1<=top+44*zoom)selected.add(t.id);
 }
 let box=$('board').querySelector('.marquee');
 if(!box){box=document.createElement('div');box.className='marquee';$('board').append(box);}
 Object.assign(box.style,{left:x1+'px',top:y1+'px',width:(x2-x1)+'px',height:(y2-y1)+'px'});
 for(const el of $('plane').querySelectorAll('[data-id]'))el.classList.toggle('selected',selected.has(el.dataset.id));
 $('selection-info').textContent=`${selected.size} selected · release to keep selection`;
}
document.addEventListener('pointerdown',e=>{
 if(e.button!==0||e.target.closest('.zoom'))return;
 const tile=e.target.closest('.tile[data-id]'),onBoard=e.target.closest('#board');
 if(!tile&&!onBoard){lastClick=null;return;}
 pause();inputTour=null;$('board').querySelector('.demo-pointer')?.remove();keyboardPlacement=null;suggestion=null;clearGhost();const p=point(e);lastPointer=p;
 if(onBoard&&tool==='pan'){
  drag={kind:'pan',start:p,pan:{...pan}};return;
 }
 if(onBoard&&tool==='select'){
  drag={kind:'select',start:p,startCell:cell(p),startedOn:tile?qaTile(tile.dataset.id):null,base:e.shiftKey?[...selected]:[],previous:[...selected],id:tile?.dataset.id,wasSelected:tile&&selected.has(tile.dataset.id),moved:false};return;
 }
 if(tile){
  const id=tile.dataset.id,wasSelected=selected.has(id);
  if((tool==='swap'||altSwap||e.altKey)&&!wasSelected&&selected.size){const destination=board.find(t=>t.id===id);if(destination){swapAt(destination.x,destination.y);return;}}
  anchorId=id;
  if(e.shiftKey){if(wasSelected)selected.delete(id);else selected.add(id);lastClick=null;render();qaRecord(wasSelected?'selection.shift_remove':'selection.shift_add',{tile:qaTile(id)});return;}
  if(!wasSelected){selected=new Set([id]);render();}
  drag={kind:board.some(t=>t.id===id)?'tile':'rack',id,start:p,cx:e.clientX,cy:e.clientY,moved:false,wasSelected,original:board.filter(t=>selected.has(t.id)).map(t=>({...t}))};
 }else{
  lastClick=null;
  const c=cell(p),r=rack.find(t=>selected.has(t.id));
  if(r){placeRack(r.id,c.x,c.y);}
  else if(selected.size){
   const anchor=board.find(t=>t.id===anchorId&&selected.has(t.id))||board.find(t=>selected.has(t.id));
   if(anchor&&move(selected,c.x-anchor.x,c.y-anchor.y,'click_destination')){selected.clear();anchorId=null;}
   render();
  }else{const previous=qaSelection();selected.clear();render();if(previous.length)qaRecord('selection.clear',{method:'board_click',previous});}
 }
});
document.addEventListener('pointermove',e=>{
 const p=point(e);lastPointer=e.target.closest('.zoom')?null:p;
 if(!drag){if(keyboardPlacement&&e.target.closest('#board')&&!e.target.closest('.zoom')){keyboardPlacement=null;render();}showGhost(lastPointer);return;}
 const dx=p.x-drag.start.x,dy=p.y-drag.start.y;
 if(Math.hypot(dx,dy)>4)drag.moved=true;
 if(drag.kind==='pan'){
  pan={x:drag.pan.x+dx,y:drag.pan.y+dy};$('plane').style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
 }else if(drag.kind==='select'&&drag.moved){updateMarquee(p,drag);}
 else if(drag.moved&&drag.kind==='tile'){
  for(const t of drag.original){const el=$('plane').querySelector(`[data-id="${t.id}"]`);if(el){el.style.transform=`translate(${dx/zoom}px,${dy/zoom}px)`;el.classList.add('dragging');}}
 }else if(drag.moved&&drag.kind==='rack'){
  const el=$('rack').querySelector(`[data-id="${drag.id}"]`);if(el){el.style.transform=`translate(${e.clientX-drag.cx}px,${e.clientY-drag.cy}px)`;el.classList.add('dragging');}
 }
});
document.addEventListener('pointerup',e=>{
 if(!drag)return;
 const d=drag;drag=null;const p=point(e);
 if(d.kind==='select'){
  if(d.moved){updateMarquee(p,d);lastClick=null;anchorId=null;qaRecord('selection.marquee',{startedOn:d.startedOn,startCell:d.startCell,endCell:cell(p),pixelRect:{left:Math.round(Math.min(p.x,d.start.x)),top:Math.round(Math.min(p.y,d.start.y)),width:Math.round(Math.abs(p.x-d.start.x)),height:Math.round(Math.abs(p.y-d.start.y))},additive:Boolean(d.base.length)});}
  else if(d.id){selected=new Set(d.wasSelected?d.previous:d.base);clickTile(d.id,d.wasSelected);}
  else selected=new Set(d.base);
  if(selected.size){tool='move';qaRecord('tool.change',{tool,method:'selection_complete'});}
  $('board').querySelector('.marquee')?.remove();render();
 }else if(d.moved&&d.kind==='tile'){
  lastClick=null;const r=$('rack').getBoundingClientRect();
  if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)returnTiles('drag_to_rack');
  else move(selected,Math.round((p.x-d.start.x)/(48*zoom)),Math.round((p.y-d.start.y)/(48*zoom)),'pointer_drag');
  render();
 }else if(d.moved&&d.kind==='rack'){
  lastClick=null;
  if(p.x>=0&&p.y>=0&&p.x<$('board').clientWidth&&p.y<$('board').clientHeight){const c=cell(p);placeRack(d.id,c.x,c.y,'pointer_drag');}render();
 }else if(d.kind==='tile'||d.kind==='rack'){clickTile(d.id,d.wasSelected);render();}
 else if(d.kind==='pan'){render();qaRecord('view.pan',{method:'pointer_drag',dx:Math.round(p.x-d.start.x),dy:Math.round(p.y-d.start.y)});}
});
document.addEventListener('pointercancel',()=>{const kind=drag?.kind;drag=null;lastClick=null;$('board').querySelector('.marquee')?.remove();render();if(kind)qaRecord('pointer.cancel',{kind});});
$('board').addEventListener('pointerleave',()=>{if(!keyboardPlacement)clearGhost();});
function swapAt(x,y){
 if(selected.size!==1){toast('Select one tile to swap. Your selection is still in hand.');qaRecord('swap.blocked',{reason:'selection_count',count:selected.size});return false;}
 const destination=board.find(t=>t.x===x&&t.y===y&&!selected.has(t.id));
 const source=board.find(t=>selected.has(t.id)),rackTile=rack.find(t=>selected.has(t.id));
 if(!destination||(!source&&!rackTile))return false;
 const details={source:qaTile((source||rackTile).id),destination:qaTile(destination.id)};
 save();keyboardPlacement=null;lastClick=null;
 if(source){
  const old={x:source.x,y:source.y};
  board=board.map(t=>t.id===source.id?{...t,x,y}:t.id===destination.id?{...t,...old}:t);
  selected.clear();anchorId=null;
 }else{
  board=board.map(t=>t.id===destination.id?{...rackTile,x,y}:t);
  rack=rack.map(t=>t.id===rackTile.id?{id:destination.id,l:destination.l}:t);
  selected=new Set([destination.id]);anchorId=destination.id;
 }
 changed();qaRecord('tiles.swap',details);return true;
}
function panView(dx,dy){
 pause();keyboardPlacement=null;lastClick=null;
 pan={x:pan.x+dx*48*zoom,y:pan.y+dy*48*zoom};
 $('plane').style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
 status='Board view moved · arrows or WASD keep panning; Fit recenters.';
 render();qaRecord('view.pan',{method:'keyboard',dx,dy});
}
function floatBy(dx,dy){
 if(!selected.size)return;
 pause();if(tool!=='swap')tool='move';lastClick=null;
 const rackTile=rack.find(t=>selected.has(t.id));
 const anchor=board.find(t=>t.id===anchorId&&selected.has(t.id))||board.find(t=>selected.has(t.id));
 if(!rackTile&&!anchor)return;
 if(!keyboardPlacement){
  if(anchor){keyboardPlacement={x:anchor.x,y:anchor.y};anchorId=anchor.id;}
  else if(lastPointer&&lastPointer.x>0&&lastPointer.y>0&&lastPointer.x<$('board').clientWidth&&lastPointer.y<$('board').clientHeight)keyboardPlacement=cell(lastPointer);
  else keyboardPlacement={x:0,y:0};
 }
 keyboardPlacement={x:keyboardPlacement.x+dx,y:keyboardPlacement.y+dy};
 const px=pan.x+keyboardPlacement.x*48*zoom,py=pan.y+keyboardPlacement.y*48*zoom;
 if(px<30)pan.x+=30-px;else if(px>$('board').clientWidth-70)pan.x-=(px-($('board').clientWidth-70));
 if(py<30)pan.y+=30-py;else if(py>$('board').clientHeight-90)pan.y-=(py-($('board').clientHeight-90));
 render();qaRecord('group.float',{dx,dy,target:{...keyboardPlacement}});
}
function commitFloating(){
 if(!keyboardPlacement)return;
 const target={...keyboardPlacement},rackTile=rack.find(t=>selected.has(t.id));
 if((tool==='swap'||altSwap)&&board.some(t=>t.x===target.x&&t.y===target.y&&!selected.has(t.id))){swapAt(target.x,target.y);return;}
 if(rackTile){
  if(board.some(t=>t.x===target.x&&t.y===target.y)){toast('That spot is occupied. Keep moving to an open space.');qaRecord('floating.place.blocked',{target});return;}
  keyboardPlacement=null;placeRack(rackTile.id,target.x,target.y,'keyboard_enter');
 }else{
  const anchor=board.find(t=>t.id===anchorId&&selected.has(t.id))||board.find(t=>selected.has(t.id));if(!anchor)return;
  const dx=target.x-anchor.x,dy=target.y-anchor.y;
  if(!canMove(board,selected,dx,dy)){toast('That spot is occupied. Keep moving to an open space.');qaRecord('floating.place.blocked',{target});return;}
  const ids=new Set(selected);keyboardPlacement=null;selected.clear();anchorId=null;move(ids,dx,dy,'keyboard_enter');render();
 }
}
document.addEventListener('keydown',e=>{
 if($('modal-root').children.length){
  if(e.key==='Escape')closeModal();
  if(e.key==='Tab'){const controls=[...$('modal-root').querySelectorAll('button,input,textarea,select')].filter(control=>!control.disabled);const index=controls.indexOf(document.activeElement);e.preventDefault();controls[(index+(e.shiftKey?-1:1)+controls.length)%controls.length].focus();}return;
 }
 if(e.key==='Escape'&&!$('find-bar').hidden){e.preventDefault();closeFinder();$('finder-open').focus();return;}
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='f'){e.preventDefault();openFinder();return;}
 if(e.target instanceof HTMLElement&&e.target.matches('input,textarea,select'))return;
 if(e.key.toLowerCase()==='f'&&!e.metaKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();openFinder();return;}
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
 if(e.key.toLowerCase()==='z'&&!e.metaKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();undo();return;}
 if(e.key.toLowerCase()==='y'&&!e.metaKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();redo();return;}
 if(e.key==='Alt'){altSwap=true;showGhost(lastPointer);return;}
 if(e.key.toLowerCase()==='x'&&!e.metaKey&&!e.ctrlKey){tool=tool==='swap'?'move':'swap';render();qaRecord('tool.change',{method:'keyboard',tool});return;}
 if(e.key===' '){e.preventDefault();if(!e.repeat)pickupOrPeel();return;}
 if(e.key==='Escape'){const previous=qaSelection(),wasFloating=Boolean(keyboardPlacement);keyboardPlacement=null;selected.clear();render();qaRecord('selection.clear',{method:'escape',wasFloating,previous});return;}
 if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();pause();keyboardPlacement=null;returnTiles('keyboard_delete');return;}
 const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
 if(dirs[e.key]&&selected.size){e.preventDefault();floatBy(...dirs[e.key]);return;}
 const panDirs={ArrowLeft:[1,0],ArrowRight:[-1,0],ArrowUp:[0,1],ArrowDown:[0,-1],a:[1,0],d:[-1,0],w:[0,1],s:[0,-1]};
 const panDirection=panDirs[e.key.length===1?e.key.toLowerCase():e.key];
 if(panDirection&&!selected.size&&!e.metaKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();panView(...panDirection);return;}
 if(e.key==='Enter'&&keyboardPlacement){e.preventDefault();commitFloating();return;}
 if(e.key==='v'||e.key==='h'){tool={v:'move',h:'pan'}[e.key];render();qaRecord('tool.change',{method:'keyboard',tool});}
 if(e.key==='Enter'&&document.activeElement?.classList.contains('tile')){e.preventDefault();const id=document.activeElement.dataset.id,wasSelected=selected.has(id);if(wasSelected)selected.delete(id);else selected=new Set([id]);render();qaRecord(wasSelected?'selection.tile.remove':'selection.tile.add',{method:'keyboard',tile:qaTile(id)});}
});
document.addEventListener('keyup',e=>{if(e.key==='Alt'){altSwap=false;showGhost(lastPointer);}});
window.addEventListener('blur',()=>{altSwap=false;clearGhost();});
$('board').addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();changeZoom(e.deltaY>0?-.05:.05);qaRecord('view.zoom',{method:'wheel',zoom});}}, {passive:false});
try{const stored=JSON.parse(localStorage.getItem('peel-game'));if(stored&&Array.isArray(stored.board)&&Array.isArray(stored.rack)&&Array.isArray(stored.bag)){({board,rack,bag,total}=stored);status='Welcome back. Your words are right where you left them.';}}catch{}
fit();new ResizeObserver(()=>{if(!drag)fit();}).observe($('board'));
if(qaJournal.active)retainReplay({sequence:qaJournal.events.at(-1)?.sequence||0,at:new Date().toISOString(),action:'session.resume',state:{board,rack,bunch:bag.length}});
Promise.all([fetch(`${import.meta.env.BASE_URL}words.json`).then(response=>{if(!response.ok)throw Error();return response.json();}),fetch(`${import.meta.env.BASE_URL}common-words.json`).then(response=>{if(!response.ok)throw Error();return response.json();})]).then(([words,frequent])=>{baseDictionary=new Set(words);dictionary=new Set(baseDictionary);for(const word of dictionaryOverrides.removed)dictionary.delete(word);for(const word of dictionaryOverrides.added)dictionary.add(word);commonWords=frequent;commonRanks=new Map(frequent.map((word,index)=>[word,index+1]));suggestionWords=frequent.slice(0,10000).filter(word=>word.length<=8).sort((a,b)=>b.length-a.length||commonRanks.get(a)-commonRanks.get(b));render();}).catch(()=>{status='Word data unavailable. Reload to enable checks and scoring.';render();});
setInterval(()=>{elapsed=Math.floor((Date.now()-startTime)/1000);$('time-stat').textContent=`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`;},1000);
