import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,readFileSync,unlinkSync} from 'node:fs';
import {homedir} from 'node:os';
const cached=`${homedir()}/Library/Caches/ms-playwright/chromium-1181/chrome-mac/Chromium.app/Contents/MacOS/Chromium`;
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||(existsSync(cached)?cached:undefined);
const browser=await chromium.launch({executablePath,headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
mkdirSync('artifacts',{recursive:true});
const boardState=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('peel-game')));
async function clickCell(x,y){const p=await page.evaluate(({x,y})=>{const r=document.querySelector('#board').getBoundingClientRect(),m=new DOMMatrix(getComputedStyle(document.querySelector('#plane')).transform);return {x:r.left+m.e+(x*48+22)*m.a,y:r.top+m.f+(y*48+22)*m.d};},{x,y});await page.mouse.click(p.x,p.y);}
if(process.argv[2]==='--catalog-progress'){
 try{
  await page.goto('http://localhost:5173/challenges/');
  assert.equal(await page.locator('.progress-empty').count(),12);
  await page.evaluate(()=>{
   const cards=[...document.querySelectorAll('.prototype')];
   localStorage.setItem(cards[0].dataset.progressKey,JSON.stringify([{value:42,passed:false},{value:61,passed:true},{value:70,passed:true,wordRules:'personal'},{value:50,passed:false}]));
   localStorage.setItem(cards[1].dataset.progressKey,JSON.stringify([{value:40,passed:false}]));
   localStorage.setItem(cards[2].dataset.progressKey,'broken json');
   localStorage.setItem(document.querySelector('.warmup').dataset.progressKey,JSON.stringify({best:{value:18}}));
   window.dispatchEvent(new Event('storage'));
  });
  assert.equal(await page.locator('.completed').count(),2);
  assert.match(await page.locator('.prototype').nth(0).innerText(),/Best Hull fill: 61% · Challenge allowlist/);
  assert.match(await page.locator('.prototype').nth(0).innerText(),/70% · Your word list/);
  assert.match(await page.locator('.prototype').nth(1).innerText(),/Target not yet met/);
  assert.match(await page.locator('.prototype').nth(2).innerText(),/No submissions yet/);
  await page.reload();assert.equal(await page.locator('.completed').count(),2);
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'artifacts/screenshot-catalog-progress.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('Passed: catalog completion, maximum scores by word rules, below-target submissions, legacy warm-ups, persistence, malformed storage and mobile layout.');
 }finally{await browser.close();}process.exit(0);
}
if(process.argv[2]==='--word-rules'){
 try{
  const key='peel-work-order-compact-without-sacrifice-v1';await page.goto('http://localhost:5173/?work-order=compact-without-sacrifice');await page.waitForSelector('#work-order-allowlist');
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({board:[...'AT'].map((l,x)=>({id:'rule'+x,l,x,y:0})),rack:[],bag:[],total:2})),key);await page.reload();await page.waitForSelector('#work-order-allowlist');
  assert.equal(await page.locator('#plane .bad').count(),2);assert.equal(await page.locator('.work-order-panel li').filter({hasText:'One connected board'}).getAttribute('class'),'met');assert.equal(await page.locator('.work-order-panel li').filter({hasText:'Every run'}).getAttribute('class'),'unmet');
  await page.locator('#work-order-allowlist').uncheck();assert.equal(await page.locator('#plane .bad').count(),0);assert.equal(await page.locator('.work-order-panel li').filter({hasText:'Every run'}).getAttribute('class'),'met');assert.equal(await page.locator('#dictionary-open').isDisabled(),false);
  await page.locator('#work-order-submit').click();assert.match(await page.locator('#work-order-notice').innerText(),/Still needed: Exact letter bank/);
  await page.reload();await page.waitForSelector('#work-order-allowlist');assert.equal(await page.locator('#work-order-allowlist').isChecked(),false);assert.equal(await page.locator('#plane .bad').count(),0);
  await page.locator('#work-order-allowlist').check();assert.equal(await page.locator('#plane .bad').count(),2);assert.equal(await page.locator('#dictionary-open').isDisabled(),true);
  assert.deepEqual(errors,[]);console.log('Passed: allowlist opt-out, separate connectivity/word checks, persisted choice and remaining bank constraints.');
 }finally{await browser.close();}process.exit(0);
}
if(process.argv[2]==='--quality'){
 try{
  await page.goto('http://localhost:5173/');await page.waitForFunction(()=>!document.querySelector('#dictionary-open').disabled);
  await page.evaluate(()=>{localStorage.setItem('peel-game',JSON.stringify({board:[...'COIF'].map((l,x)=>({id:'q'+x,l,x,y:0})).concat({id:'q4',l:'Q',x:2,y:-1}),rack:[],bag:[],total:5}));localStorage.setItem('peel-quality-highlight','false');});
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#dictionary-open').disabled);await page.locator('#score-open').click();
  await page.locator('[data-score-inspect="quality"]').hover();assert.equal(await page.locator('#inspect-quality>b').innerText(),'64');assert.equal(await page.locator('.quality-colored').count(),5);
  assert.equal(await page.locator('[data-id="q2"]').getAttribute('data-quality-tier'),'C');assert.equal(await page.locator('[data-id="q0"]').getAttribute('data-quality-tier'),'A');assert.notEqual(await page.locator('[data-id="q0"]').evaluate(e=>getComputedStyle(e).backgroundColor),await page.locator('[data-id="q2"]').evaluate(e=>getComputedStyle(e).backgroundColor));
  await page.locator('[data-score-inspect="tier:A"]').hover();assert.equal(await page.locator('.quality-colored').count(),4);assert.equal(await page.locator('[data-id="q2"]').getAttribute('data-quality-tier'),'A');assert.equal(await page.locator('.quality-muted').count(),1);
  await page.locator('[data-score-inspect="tier:C"]').focus();assert.equal(await page.locator('.quality-colored').count(),2);assert.match(await page.locator('#inspection-caption').innerText(),/QI/);
  await page.locator('[data-score-inspect="tier:S"]').hover();assert.equal(await page.locator('.quality-colored').count(),0);
  await page.locator('#quality-pin').click();await page.locator('#board').hover();assert.equal(await page.locator('.quality-colored').count(),5);
  await page.locator('[data-id="q4"]').click();await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');assert.equal(await page.locator('[data-id="q4"]').getAttribute('data-quality-tier'),'none');assert.equal(await page.locator('[data-id="q2"]').getAttribute('data-quality-tier'),'A');await page.keyboard.press('z');
  await page.locator('#score-close').click();assert.equal(await page.locator('.quality-colored').count(),5);
  await page.locator('#dictionary-open').click();await page.locator('#tier-query').fill('qi');await page.locator('[data-word-tier="QI"]').selectOption('B');await page.locator('#modal-root .modal-close').click();assert.equal(await page.locator('[data-id="q2"]').getAttribute('data-quality-tier'),'B');
  await page.locator('#score-open').click();assert.equal(await page.locator('#inspect-quality>b').innerText(),'72');await page.screenshot({path:'artifacts/screenshot-word-quality.png',fullPage:true});
  await page.locator('#score-close').click();await page.locator('#replay-open').click();const frame=page.frameLocator('.replay-frame');await frame.locator('#metric').selectOption('quality');await frame.locator('#scrub').fill(await frame.locator('#scrub').getAttribute('max'));assert.equal(await frame.locator('#value').innerText(),'72');assert.equal(await frame.locator('.quality-cell').count(),5);assert.equal(await frame.locator('.quality-cell[data-tier=B]').count(),2);await page.locator('#modal-root .modal-close').click();
  await page.locator('#board-share').click();const download=page.waitForEvent('download');await page.locator('#position-artifact').click();await (await download).saveAs('artifacts/quality-board.html');await page.goto(new URL('./artifacts/quality-board.html',import.meta.url).href);await page.locator('[data-inspect=quality]').hover();assert.equal(await page.locator('[data-overlay=quality].active .quality-cell').count(),5);assert.equal(await page.locator('[data-overlay=quality] [data-tier=B]').count(),2);
  assert.deepEqual(errors,[]);console.log('Passed: weakest-crossing tile colors, live updates, persistent pin, personal regrading, quality replay and standalone export.');
 }finally{await browser.close();}process.exit(0);
}
if(process.argv[2]==='--tiers'){
 try{
  const setWord=async word=>{await page.evaluate(word=>localStorage.setItem('peel-game',JSON.stringify({board:[...word].map((l,x)=>({id:'tier'+x,l,x,y:0})),rack:[],bag:[],total:word.length})),word);await page.reload();await page.waitForFunction(()=>!document.querySelector('#dictionary-open').disabled);};
  await page.goto('http://localhost:5173/');await page.waitForFunction(()=>!document.querySelector('#dictionary-open').disabled);
  await setWord('PUL');assert.equal(await page.locator('#plane .bad').count(),0);
  await page.locator('#dictionary-open').click();assert.equal(await page.locator('[data-word-tier="PUL"]').count(),1);
  await page.locator('[data-tier-minimum="D"]').click();await page.locator('.modal-close').click();assert.equal(await page.locator('#plane .bad').count(),3);assert.match(await page.locator('#status').innerText(),/Tier cutoff blocks PUL/);
  await setWord('AVO');assert.equal(await page.locator('#plane .bad').count(),0);
  await page.locator('#dictionary-open').click();await page.locator('[data-tier-minimum="C"]').click();await page.locator('.modal-close').click();assert.equal(await page.locator('#plane .bad').count(),3);
  await page.locator('#peel').click();assert.equal(await page.locator('#win-new').count(),0);
  await page.locator('#dictionary-open').click();await page.locator('#tier-query').fill('avo');await page.locator('[data-word-tier="AVO"]').selectOption('B');assert.match(await page.locator('#tier-results').innerText(),/Your rating/);
  await page.locator('.modal-close').click();assert.equal(await page.locator('#plane .bad').count(),0);
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#dictionary-open').disabled);assert.equal(await page.locator('#plane .bad').count(),0);
  await setWord('QI');assert.equal(await page.locator('#plane .bad').count(),0);
  await page.locator('#dictionary-open').click();await page.locator('#tier-query').fill('veracity');assert.equal(await page.locator('.tier-word .tier-letter').first().innerText(),'S');
  await page.locator('#tier-query').fill('');await page.locator('#tier-filter').selectOption('F');assert.ok((await page.locator('.tier-word').count())>0);assert.ok((await page.locator('.tier-word .tier-letter').allTextContents()).every(t=>t==='F'));
  await page.locator('#tier-filter').selectOption('A');assert.equal(await page.locator('.tier-word').count(),40);await page.locator('#tier-more').click();assert.equal(await page.locator('.tier-word').count(),80);await page.locator('#tier-filter').selectOption('');await page.screenshot({path:'artifacts/screenshot-word-tiers.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const policy=await page.evaluate(()=>JSON.parse(localStorage.getItem('peel-word-tier-policy-v1')));assert.equal(policy.minimum,'C');assert.equal(policy.overrides.AVO,'B');
  assert.deepEqual(errors,[]);console.log('Passed: tier presets, live validation, blocked peel, personal ratings, persistence, QI acceptance, browsing, search and mobile layout.');
 }finally{await browser.close();}process.exit(0);
}
if(process.argv[2]==='--prototypes'){
 try{
  const prototypes=JSON.parse(readFileSync('challenges/prototypes.json','utf8'));
  await page.goto('http://localhost:5173/');await page.waitForSelector('.challenge-link');
  const original=await page.evaluate(()=>localStorage.getItem('peel-game'));
  for(const p of prototypes){
   await page.goto('http://localhost:5173/?work-order='+p.id);await page.waitForSelector('#work-order-submit');
   assert.equal(await page.locator('#plane>.tile').count(),p.state.board.length);assert.equal(await page.locator('#rack>.tile').count(),p.state.rack.length);
   await page.locator('[data-score-inspect="original"]').hover();assert.equal(await page.locator('.original-shadow').count(),p.state.board.length);assert.equal(await page.locator('.original-shadow.changed').count(),0);await page.locator('#work-order-submit').hover();assert.equal(await page.locator('.original-shadow').count(),0);
   await page.locator('#work-order-submit').click();assert.match(await page.locator('#work-order-notice').innerText(),/Still needed/);
   if(p.state.rack.length){await page.keyboard.press('Space');await clickCell(5,2);assert.equal(await page.locator('#plane>.tile').count(),p.state.board.length+1);await page.keyboard.press('z');}
   await page.locator('#plane>.tile').first().dblclick();assert.ok(await page.locator('#plane>.tile.selected').count()>1);
   for(let i=0;i<10;i++)await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');const stateKey='peel-work-order-'+p.id+'-v'+p.version;
   assert.notDeepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).board,stateKey),p.state.board);
   await page.keyboard.press('z');assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).board,stateKey),p.state.board);
   await page.getByText('Search findings (spoilers)',{exact:true}).click();await page.locator('#work-order-witness').click();await page.locator('#work-order-submit').click();assert.match(await page.locator('#work-order-notice').innerText(),/Accepted/);
   await page.locator('[data-score-inspect="original"]').focus();
   const changed=p.state.board.filter(t=>!p.report.witness.board.some(c=>c.x===t.x&&c.y===t.y&&c.l===t.l)).length;
   assert.equal(await page.locator('.original-shadow.changed').count(),changed);assert.ok(changed>0);
   assert.match(await page.locator('#inspection-caption').innerText(),/any copy/);
   await page.locator('#work-order-submit').focus();assert.equal(await page.locator('.original-shadow').count(),0);
   assert.equal(await page.evaluate(()=>localStorage.getItem('peel-game')),original);
   await page.reload();await page.waitForSelector('#work-order-submit');await page.locator('#work-order-submit').click();assert.match(await page.locator('#work-order-notice').innerText(),/Accepted/);
   assert.equal(await page.locator('#dictionary-open').isDisabled(),true);
   await page.locator('#work-order-reset').click();assert.equal(await page.locator('#plane>.tile').count(),p.state.board.length);
   await page.locator('.work-order-panel summary').filter({hasText:'Saved submissions'}).click();await page.locator('[data-work-order-entry]').last().click();await page.locator('#work-order-submit').click();assert.match(await page.locator('#work-order-notice').innerText(),/Accepted/);await page.locator('#work-order-reset').click();
   if(p.id==='compact-without-sacrifice')await page.screenshot({path:'artifacts/screenshot-prototype.png',fullPage:true});
  }
  await page.goto('http://localhost:5173/');assert.equal(await page.evaluate(()=>localStorage.getItem('peel-game')),original);
  await page.goto('http://localhost:5173/challenges/');assert.equal(await page.locator('.prototype').count(),3);assert.equal(await page.locator('.warmup').count(),9);
  await page.locator('.prototype').first().click();await page.waitForSelector('#work-order-submit');
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('Passed: three larger prototypes, live acceptance constraints, delivery placement, group moves, undo, verified examples, submissions, progress isolation, catalog routes and mobile layout.');
 }finally{await browser.close();}process.exit(0);
}
if(process.argv[2]==='--challenge-routing'){
 try{
  await page.goto('http://localhost:5173/');await page.waitForSelector('.challenge-link');
  const saved=await page.evaluate(()=>localStorage.getItem('peel-game'));
  await page.locator('.challenge-link').click();assert.equal(await page.locator('.level-card').count(),12);
  await page.locator('.level-card.warmup').first().click();assert.equal(await page.locator('#grid .tile').count(),9);
  assert.equal(await page.evaluate(()=>localStorage.getItem('peel-game')),saved);
  for(const suffix of ['/challenges/','/challenges?test=1','/challenges/index.html']){
   await page.goto('http://localhost:5173'+suffix);assert.equal(await page.locator('.level-card').count(),12);
   assert.equal(await page.locator('#board').count(),0);
  }
  assert.deepEqual(errors,[]);console.log('Passed: local catalog routing, main-game link, playable level links and preserved main board.');
 }finally{await browser.close();}process.exit(0);
}
if(process.argv[2]==='--challenges'){
 try{
  const pack=JSON.parse(readFileSync('public/challenges/analysis.json','utf8'));
  const requests=[];page.on('request',r=>requests.push(r.url()));
  for(const {level:l} of pack.levels){
   await page.goto(new URL('./public/challenges/'+l.id+'.html',import.meta.url).href);
   assert.equal(await page.locator('.tile').count(),l.bank.length);
   await page.locator('#submit').click();assert.ok(!(await page.locator('#notice').innerText()).startsWith('Accepted'));
   // Exercise the actual player, never write its board state directly.
   let swaps=0;
   while(await page.locator('.tile > span').allTextContents().then(a=>a.join(''))!==l.witness){
    await page.locator('#hint').click();const hinted=page.locator('.tile.hinted');assert.equal(await hinted.count(),2);
    const ids=await hinted.evaluateAll(es=>es.map(e=>e.dataset.i));
    await page.locator('[data-i="'+ids[0]+'"]').click();await page.locator('[data-i="'+ids[1]+'"]').click();assert.ok(++swaps<l.bank.length);
   }
   await page.locator('#submit').click();assert.match(await page.locator('#notice').innerText(),/^Accepted/);
   assert.equal(await page.locator('#metric').innerText(),String(checkValue(l)));
   await page.reload();assert.equal((await page.locator('.tile > span').allTextContents()).join(''),l.witness);
   await page.locator('#analysis summary').click();await page.waitForFunction(()=>document.querySelector('#report').textContent.includes('Exhaustive search'));assert.match(await page.locator('#report').innerText(),/Exhaustive search/);
  }
  function checkValue(l){return pack.levels.find(p=>p.level.id===l.id).report.solutions.find(r=>r.letters===l.witness)[l.metric];}
  const l=pack.levels.find(p=>p.level.id==='14-shared-load').level;await page.goto(new URL('./public/challenges/'+l.id+'.html',import.meta.url).href);await page.locator('#reset').click();
  const initial=(await page.locator('.tile > span').allTextContents()).join('');
  await page.locator('.tile').nth(0).click();await page.locator('.tile').nth(0).click();assert.equal(await page.locator('.tile.selected').count(),0);
  const a=await page.locator('.tile').nth(0).boundingBox(),b=await page.locator('.tile').nth(1).boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:6});await page.mouse.up();
  const moved=(await page.locator('.tile > span').allTextContents()).join('');assert.notEqual(moved,initial);await page.keyboard.press('z');assert.equal((await page.locator('.tile > span').allTextContents()).join(''),initial);await page.keyboard.press('y');assert.equal((await page.locator('.tile > span').allTextContents()).join(''),moved);
  await page.locator('#reset').click();await page.screenshot({path:'artifacts/screenshot-challenge.png',fullPage:true});
  const downloadPromise=page.waitForEvent('download');await page.locator('#download').click();const dl=await downloadPromise;await dl.saveAs('artifacts/challenge-offline.html');
  await page.goto(new URL('./artifacts/challenge-offline.html',import.meta.url).href);assert.equal(await page.locator('.tile').count(),7);
  const code='PEELWORKS1.'+Buffer.from(JSON.stringify({level:l.id,version:l.version,letters:l.witness})).toString('base64');page.once('dialog',d=>d.accept(code));await page.locator('#import').click();await page.locator('#submit').click();assert.match(await page.locator('#notice').innerText(),/^Accepted/);
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto(new URL('./public/challenges/index.html',import.meta.url).href);assert.equal(await page.locator('.level-card').count(),12);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'artifacts/screenshot-challenge-pack.png',fullPage:true});
  assert.ok(!requests.some(u=>u.startsWith('http')),'Standalone artifacts must not require network');assert.deepEqual(errors,[]);
  console.log('Passed: all remaining offline warm-ups solved through real input, targets, persistence, drag, deselect, undo/redo, hints, reports, export/import and mobile layout.');
 }finally{await browser.close();}process.exit(0);
}
if(process.argv[2]==='--replay'){
 try{
  await page.goto(new URL('./artifacts/peel-replay.html',import.meta.url).href);await page.locator('#metric').selectOption('coverage');
  assert.equal(await page.locator('#value').innerText(),'79');await page.locator('#scrub').fill('85');assert.equal(await page.locator('#value').innerText(),'86');
  assert.equal(await page.locator('#board .tile').count(),144);assert.match(await page.locator('#validity').innerText(),/Connected valid/);
  const cavePath=await page.locator('.metric-inspection .caves').getAttribute('d');await page.locator('#scrub').fill('0');assert.notEqual(await page.locator('.metric-inspection .caves').getAttribute('d'),cavePath);await page.locator('#scrub').fill('85');
  for(const [metric,selector] of [['hull','.hull-boundary'],['solid','.solid-inspection'],['ponds','.ponds-inspection'],['longest','.longest-inspection'],['strongest','.strongest-inspection'],['commonness','.heat']]){await page.locator('#metric').selectOption(metric);assert.ok(await page.locator('.metric-inspection '+selector).count()>0);}
  await page.locator('#metric').selectOption('coverage');
  await page.screenshot({path:'artifacts/screenshot-replay.png',fullPage:true});
  await page.locator('#scrub').fill('0');await page.locator('#milestone').click();assert.ok(Number(await page.locator('#scrub').inputValue())>0);
  await page.locator('#play').click();await page.waitForTimeout(1100);await page.locator('#play').click();
  assert.deepEqual(errors,[]);console.log('Passed: recovered 86-frame replay, coverage 79 to 86, valid best navigation and playback.');
 }finally{await browser.close();}process.exit(0);
}
if(process.argv[2]==='--hosted'){
 const url=process.argv[3];const requests=[];page.on('request',r=>requests.push(r.url()));
 try{
  const wordData=Promise.all(['words.json','common-words.json'].map(file=>page.waitForResponse(r=>r.url()===new URL(file,url).href).then(r=>r.finished())));
  await page.goto(url);await wordData;await page.waitForFunction(()=>document.querySelector('#check').classList.contains('enabled'));
  await page.locator('#score-open').click();await page.waitForSelector('[data-score-inspect="hull"]');
  await page.locator('[data-score-inspect="hull"]').hover();assert.equal(await page.locator('.hull-outline').count(),1);
  await page.locator('#score-close').click();await page.locator('#board-share').click();assert.equal(await page.locator('.local-sharing').isVisible(),false);
  assert.ok(!requests.some(u=>u.includes('/__peel/share')));
  await page.goto(new URL('boards/first-board.html',url).href);
  assert.equal(await page.locator('.tile').count(),144);
  await page.locator('[data-inspect="coverage"]').hover();assert.equal(await page.locator('[data-overlay="coverage"]').getAttribute('class'),'overlay active');
  assert.deepEqual(errors,[]);console.log('Passed: hosted game loads dictionary and scoring; local sharing disabled; published 144-tile export and interactive cave highlights work.');
 }finally{await browser.close();}
 process.exit(0);
}
try{
 await page.goto('http://localhost:5173');
 await page.evaluate(async()=>{
  const {openHistoryStore}=await import('/history-store.js'),name='peel-history-test-'+crypto.randomUUID(),store=openHistoryStore(name);
  const events=Array.from({length:750},(_,i)=>({eventId:'test'+i,at:new Date(i*1000).toISOString(),action:'move',state:{board:[],rack:[],bunch:0}}));
  await store.append([...events,...events.slice(0,20)]);if(await store.count()!==750)throw Error('History was truncated or migration duplicate failed');
  const pending=await store.pending(40);await store.acknowledge(pending);if((await store.pending(1000)).length!==710)throw Error('Archive acknowledgement mismatch');
  await store.close();const reopened=openHistoryStore(name);if((await reopened.all()).length!==750)throw Error('History did not survive reopen');await reopened.close();indexedDB.deleteDatabase(name);
 });

 await page.waitForFunction(()=>document.querySelector('#check').classList.contains('enabled')&&document.querySelectorAll('#plane .tile[data-id]').length===21);
 await page.locator('#finder-open').click();await page.locator('#find-input').fill('st');
 assert.equal(await page.locator('.find-match').count(),5,'finder highlights every tile touched by matching n-grams');
 assert.equal(await page.locator('.find-current').count(),2,'finder distinguishes the current occurrence');
 assert.equal(await page.locator('#find-count').innerText(),'1 / 3');await page.keyboard.press('Enter');
 assert.equal(await page.locator('#find-count').innerText(),'2 / 3','Enter advances through board matches');
 await page.locator('#find-input').fill('s');assert.equal(await page.locator('.find-match').count(),2,'single-letter finder highlights letters independent of words');
 await page.locator('#find-close').click();assert.equal(await page.locator('.find-match').count(),0,'closing finder clears its highlights');assert.equal(await page.locator('#find-bar').isHidden(),true,'closing finder removes the search row');
 await page.keyboard.press(process.platform==='darwin'?'Meta+f':'Control+f');assert.equal(await page.locator('#find-input').evaluate(element=>element===document.activeElement),true,'standard find shortcut opens the board finder');await page.keyboard.press('Escape');
 await page.locator('#finder-open').click();await page.locator('#find-input').fill('st');await page.locator('#finder-open').focus();await page.keyboard.press('Escape');
 assert.equal(await page.locator('#find-bar').isHidden(),true,'Escape closes Find even when its input is not focused');assert.equal(await page.locator('.find-match').count(),0);
 await page.waitForTimeout(120);
 await page.keyboard.press('f');assert.equal(await page.locator('#find-input').evaluate(el=>el===document.activeElement),true,'plain F opens and focuses Find');await page.keyboard.press('Escape');await page.waitForTimeout(120);
 const initialView=await page.evaluate(()=>{const m=new DOMMatrix(getComputedStyle(document.querySelector('#plane')).transform);return {x:m.e,y:m.f};});
 await page.keyboard.press('ArrowLeft');
 const arrowView=await page.evaluate(()=>{const m=new DOMMatrix(getComputedStyle(document.querySelector('#plane')).transform);return {x:m.e,y:m.f};});
 assert.ok(arrowView.x>initialView.x,'an arrow pans when no tile is selected');
 await page.keyboard.press('d');
 const restoredView=await page.evaluate(()=>{const m=new DOMMatrix(getComputedStyle(document.querySelector('#plane')).transform);return {x:m.e,y:m.f};});
 assert.ok(Math.abs(restoredView.x-initialView.x)<1,'WASD pans in the opposite direction');
 await page.keyboard.press('w');await page.keyboard.press('s');
 const wasdView=await page.evaluate(()=>{const m=new DOMMatrix(getComputedStyle(document.querySelector('#plane')).transform);return {x:m.e,y:m.f};});
 assert.ok(Math.abs(wasdView.y-initialView.y)<1,'vertical WASD panning is reversible');
 await page.screenshot({path:'artifacts/screenshot-desktop.png',fullPage:true});
 const originalState=await boardState(),original=originalState.board;
 await page.locator('[data-tool="select"]').click();
 const firstTile=await page.locator('#plane [data-id="t0"]').boundingBox(),lastTile=await page.locator('#plane [data-id="t4"]').boundingBox();
 await page.mouse.move(firstTile.x+2,firstTile.y+2);await page.mouse.down();await page.mouse.move(lastTile.x+lastTile.width-2,lastTile.y+8,{steps:5});await page.mouse.up();
 assert.equal(await page.locator('#plane .selected').count(),5);assert.equal(await page.locator('[data-tool="move"]').getAttribute('class'),'tool active');
 const groupScale=await page.evaluate(()=>new DOMMatrix(getComputedStyle(document.querySelector('#plane')).transform).a);
 await page.mouse.move(firstTile.x+20,firstTile.y+20);await page.mouse.down();await page.mouse.move(firstTile.x+20,firstTile.y+20-48*groupScale,{steps:5});await page.mouse.up();
 assert.ok((await boardState()).board.filter(t=>['t0','t1','t2','t3','t4'].includes(t.id)).every(t=>t.y===-1),'fresh marquee group drags immediately without a menu click');
 await page.keyboard.press('z');assert.deepEqual((await boardState()).board,original);
 await page.locator('#free-tiles').click();assert.equal(await page.locator('#free-tiles').getAttribute('aria-pressed'),'true');
 const freeIds=await page.locator('#plane .free-tile').evaluateAll(tiles=>tiles.map(t=>t.dataset.id));assert.ok(freeIds.length>0);
 const candidate=freeIds[0];await page.locator(`#plane [data-id="${candidate}"]`).click();await page.keyboard.press('Delete');
 assert.equal(await page.locator(`#plane [data-id="${candidate}"]`).count(),0);assert.equal(await page.locator('#plane .bad').count(),0);assert.match(await page.locator('#status').innerText(),/All words connect/);
 await page.locator('#undo').click();assert.deepEqual((await boardState()).board,original);await page.locator('#free-tiles').click();assert.equal(await page.locator('#plane .free-tile').count(),0);
 const beforeReplay=await boardState();await page.locator('#replay-open').click();
 const replayFrame=page.frameLocator('.replay-frame');await replayFrame.locator('#chart').waitFor();
 await replayFrame.locator('#metric').selectOption('coverage');await replayFrame.locator('#next').click();
 assert.deepEqual(await boardState(),beforeReplay,'replay never changes the playable board');await page.locator('#modal-root .modal-close').click();
 await page.locator('#board-share').click();const portable=await page.locator('#position-code').inputValue();assert.ok(portable.startsWith('PEEL1.'));
 await page.locator('#local-share-now').click();await page.waitForFunction(()=>document.querySelector('#local-sharing-status').textContent.startsWith('Shared locally'));
 const sharingId=await page.evaluate(()=>localStorage.getItem('peel-client-id')),sharedFile=`artifacts/live-boards/${sharingId}.json`;
 assert.deepEqual(JSON.parse(readFileSync(sharedFile,'utf8')).state,originalState);unlinkSync(sharedFile);
 await page.screenshot({path:'artifacts/screenshot-export.png',fullPage:true});
 const downloaded=page.waitForEvent('download');await page.locator('#position-download').click();const download=await downloaded;await download.saveAs('artifacts/exported-board.json');
 const artifactDownload=page.waitForEvent('download');await page.locator('#position-artifact').click();await (await artifactDownload).saveAs('artifacts/test-board-and-metrics.html');
 const offline=await browser.newContext({offline:true}),artifactPage=await offline.newPage();const artifactErrors=[];artifactPage.on('pageerror',e=>artifactErrors.push(e.message));
 await artifactPage.goto(new URL('./artifacts/test-board-and-metrics.html',import.meta.url).href);
 assert.deepEqual(await artifactPage.evaluate(()=>JSON.parse(document.querySelector('#snapshot').textContent).state),originalState);
 await artifactPage.locator('[data-inspect="coverage"]').hover();assert.equal(await artifactPage.locator('[data-overlay="coverage"]').getAttribute('class'),'overlay active');
 await artifactPage.locator('[data-inspect="hull"]').click();await artifactPage.locator('h1').hover();assert.equal(await artifactPage.locator('[data-overlay="hull"]').getAttribute('class'),'overlay active');
 assert.deepEqual(artifactErrors,[]);await offline.close();
 await page.locator('#position-code').fill('bad code');await page.locator('#position-import').click();assert.match(await page.locator('#position-message').innerText(),/not a valid/);assert.deepEqual(await boardState(),originalState);
 await page.locator('#position-code').fill(portable);await page.locator('#position-import').click();assert.deepEqual(await boardState(),originalState);
 await page.locator('#board-share').click();await page.locator('#position-file').setInputFiles('artifacts/exported-board.json');await page.waitForFunction(()=>!document.querySelector('.modal'));assert.deepEqual(await boardState(),originalState);
 await page.locator('#input-demo').click();await page.locator('#input-demo').click();
 assert.equal(await page.locator('#plane .selected').innerText(),'E');
 await page.locator('#demo-next').click();assert.equal(await page.locator('.ghost-layer .ghost').count(),1);
 await page.locator('#demo-next').click();assert.ok((await boardState()).board.some(t=>t.l==='E'&&t.x===5&&t.y===-1));
 for(let i=0;i<4;i++)await page.locator('#demo-next').click();
 assert.equal((await boardState()).board.find(t=>t.x===1&&t.y===0).l,'O','tour performs the swap');
 await page.locator('#demo-next').click();await page.locator('#demo-next').click();assert.equal(await page.locator('#plane .selected').count(),5);
 await page.locator('#demo-next').click();assert.equal(await page.locator('.ghost-layer.blocked').count(),1,'tour floats the group over occupied cells');
 const cursorBox=await page.locator('.demo-pointer').boundingBox(),boardBox=await page.locator('#board').boundingBox();assert.ok(cursorBox.x>=boardBox.x&&cursorBox.x<boardBox.x+boardBox.width,'tour cursor stays on the demonstrated board cell');
 await page.screenshot({path:'artifacts/screenshot-input-tour.png',fullPage:true});
 for(let i=0;i<4;i++)await page.locator('#demo-next').click();assert.equal(await page.locator('#plane .selected').count(),5);assert.deepEqual((await boardState()).board,original);
 await page.keyboard.press('Escape');
 await page.locator('#plane .tile[data-id]').first().dblclick();
 assert.equal(await page.locator('#plane .selected').count(),5,'double-click selects a word');
 await page.keyboard.press('ArrowLeft');await page.keyboard.press('Enter');
 const moved=(await boardState()).board;
 assert.equal(moved[0].x,original[0].x-1);
 await page.locator('#undo').click();assert.deepEqual((await boardState()).board,original);
 await page.locator('#redo').click();assert.deepEqual((await boardState()).board,moved);
 await page.locator('#undo').click();
 await page.locator('#plane .tile[data-id]').first().click();await page.keyboard.press('ArrowRight');
 assert.equal(await page.locator('.ghost-layer.blocked').count(),1,'keyboard floats over occupied tile');
 await page.keyboard.press('Enter');assert.deepEqual((await boardState()).board,original,'occupied cell rejects placement');
 for(let i=0;i<5;i++)await page.keyboard.press('ArrowRight');
 assert.equal(await page.locator('.ghost-layer.blocked').count(),0,'can float beyond occupied run');
 await page.keyboard.press('Enter');assert.equal((await boardState()).board[0].x,6);
 await page.locator('#undo').click();
 await page.locator('#plane .tile[data-id]').first().click();
 await page.keyboard.press('Delete');assert.equal(await page.locator('#rack .tile').count(),1);
 await page.locator('#rack .tile').click();await clickCell(0,0);
 assert.equal(await page.locator('#plane .tile[data-id]').count(),21);
 assert.equal(await page.locator('#rack .tile').count(),0);
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('All words connect'));
 // Actual pointer drag, preserving the grabbed tile and exact cell offset.
 const dragTile=page.locator('#plane [data-id="t1"]');const box=await dragTile.boundingBox();
 const scale=await page.evaluate(()=>new DOMMatrix(getComputedStyle(document.querySelector('#plane')).transform).a);
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+48*scale,box.y+box.height/2-48*scale,{steps:5});await page.mouse.up();
 const afterDrag=(await boardState()).board.find(t=>t.id==='t1');assert.equal(afterDrag.x,2);assert.equal(afterDrag.y,-1);
 assert.equal(await page.locator('.component-outline').count(),1,'only the smaller disconnected group is outlined while editing');
 await page.locator('#peel').click();assert.equal(await page.locator('.component-flash .component-outline').count(),2,'a blocked peel briefly highlights all disconnected groups');
 await page.waitForFunction(()=>!document.querySelector('.component-flash'));assert.equal(await page.locator('.component-outline').count(),1,'largest group returns to unoutlined after the flash');
 const outlineColors=await page.locator('.component-outline').evaluateAll(paths=>paths.map(path=>path.getAttribute('stroke')));assert.equal(new Set(outlineColors).size,outlineColors.length);
 await page.screenshot({path:'artifacts/screenshot-components.png',fullPage:true});
 await page.locator('#undo').click();
 assert.equal(await page.locator('.component-outline').count(),0,'outlines disappear when the board reconnects');
 // Selection starts inside tiles and catches an edge without including the center.
 await page.keyboard.press('Escape');await page.locator('[data-tool="select"]').click();
 const corner=await page.locator('#plane [data-id="t0"]').boundingBox();
 const beforeSelection=(await boardState()).board;
 await page.mouse.move(corner.x+1,corner.y+1);await page.mouse.down();await page.mouse.move(corner.x+9,corner.y+9,{steps:4});await page.mouse.up();
 assert.equal(await page.locator('#plane .selected').count(),1,'marquee touching tile corner selects it');
 assert.deepEqual((await boardState()).board,beforeSelection,'starting selection within a tile never drags it');
 const marqueeEvent=await page.evaluate(()=>JSON.parse(localStorage.getItem('peel-qa-journal-v1')).events.findLast(event=>event.action==='selection.marquee'));
 assert.equal(marqueeEvent.details.startedOn.id,'t0');assert.equal(marqueeEvent.selection.length,1);
 assert.ok(marqueeEvent.details.pixelRect.width>0,'QA journal keeps the exact selection rectangle');
 await page.locator('#qa-open').click();await page.locator('#qa-note').fill('The group selection did something surprising here.');await page.locator('#qa-add-note').click();
 assert.match(await page.locator('.qa-events article').first().innerText(),/qa.note/);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('peel-qa-journal-v1')).events.at(-1).details.note),'The group selection did something surprising here.');
 await page.screenshot({path:'artifacts/screenshot-qa.png',fullPage:true});
 await page.locator('#qa-close').click();
 await page.locator('#plane [data-id="t0"]').click();assert.equal(await page.locator('#plane .selected').count(),0,'clicking selected tile deselects');
 await page.locator('[data-tool="move"]').click();
 await page.locator('#plane [data-id="t0"]').click();await page.waitForTimeout(400);await page.locator('#plane [data-id="t0"]').click();
 assert.equal(await page.locator('#plane .selected').count(),0,'move mode click-again deselects');
 // Swap is available after picking up a tile and hovering the destination.
 await page.waitForTimeout(400);await page.locator('#plane [data-id="t0"]').click();
 await page.locator('#plane [data-id="t1"]').hover();await page.keyboard.press('x');
 assert.equal(await page.locator('.swap-target').count(),1);
 assert.match(await page.locator('.placement-hint').innerText(),/swap S ↔ T/);
 await page.locator('#plane [data-id="t1"]').click();
 let swapped=(await boardState()).board;assert.equal(swapped.find(t=>t.id==='t0').x,1);assert.equal(swapped.find(t=>t.id==='t1').x,0);
 await page.locator('#undo').click();await page.keyboard.press('x');
 // Space peels directly into the hand; Alt swaps a rack letter and holds the displaced one.
 await page.keyboard.press('Space');
 assert.equal(await page.locator('#rack .selected').count(),1,'peeled letter is already in hand');
 assert.equal((await boardState()).bag.length,11);
 const afterPeel=await boardState();
 await page.keyboard.press('Escape');assert.equal(await page.locator('#rack .selected').count(),0);
 await page.keyboard.press('Space');assert.equal(await page.locator('#rack .selected').count(),1,'Space picks up the existing rack letter');
 assert.deepEqual(await boardState(),afterPeel,'picking up a rack tile does not draw or change the board');
 await page.keyboard.press('Space');assert.equal(await page.locator('#rack .selected').count(),1,'Space keeps an already-held rack letter');
 assert.deepEqual(await boardState(),afterPeel);

 await page.locator('#plane [data-id="t1"]').hover();await page.keyboard.down('Alt');
 assert.equal(await page.locator('.swap-target').count(),1);
 await page.locator('#plane [data-id="t1"]').click();await page.keyboard.up('Alt');
 assert.equal(await page.locator('#rack .selected').innerText(),'T');
 await page.locator('#undo').click();await page.locator('#rack .tile').click();
 const empty=await page.evaluate(()=>{const r=document.querySelector('#board').getBoundingClientRect(),m=new DOMMatrix(getComputedStyle(document.querySelector('#plane')).transform);return {x:r.left+m.e+262*m.a,y:r.top+m.f+22*m.a};});
 await page.mouse.move(empty.x,empty.y);assert.equal(await page.locator('.ghost-layer .ghost').count(),1);
 await page.mouse.click(empty.x,empty.y);assert.equal(await page.locator('#rack .tile').count(),0);
 assert.match(await page.locator('#status').innerText(),/All words connect/);
 // Auto-check is on by default; invalid words highlight without pressing Check.
 await page.locator('#demo-reset').click();
 const letterS=page.locator('#rack .tile').filter({hasText:/^T$/}).first();await letterS.click();await clickCell(0,0);
 const letterT=page.locator('#rack .tile').filter({hasText:/^T$/}).first();await letterT.click();await clickCell(1,0);
 await page.waitForFunction(()=>document.querySelectorAll('#plane .bad').length===2);
 assert.match(await page.locator('#status').innerText(),/Check TT/);
 await page.locator('#check').click();assert.equal(await page.locator('#plane .bad').count(),0);
 assert.equal(await page.locator('#check').getAttribute('aria-pressed'),'false');
 await page.reload();assert.equal(await page.locator('#check').getAttribute('aria-pressed'),'false');
 assert.equal(await page.locator('#plane .tile[data-id]').count(),2,'board persists across reload');
 await page.locator('#check').click();await page.waitForFunction(()=>document.querySelectorAll('#plane .bad').length===2);
 // Suggest has its own preview while automatic validation remains live.
 await page.evaluate(()=>localStorage.setItem('peel-game',JSON.stringify({board:[],rack:[...`STONE`].map((l,i)=>({id:`q${i}`,l})),bag:[{id:'q5',l:'S'}],total:6})));
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#rack .tile').length===5);
 await page.locator('#suggest').click();
 assert.equal(await page.locator('.suggestion-tile').count(),5);
 assert.equal(await page.locator('.suggestion-rack').count(),5);
 assert.match(await page.locator('#status').innerText(),/Idea: NOTES/);
 assert.equal(await page.locator('#suggest-label').innerText(),'Place idea');
 await page.locator('#suggest').click();
 assert.equal(await page.locator('#plane .tile[data-id]').count(),5);
 assert.equal(await page.locator('#rack .tile').count(),0);
 assert.match(await page.locator('#status').innerText(),/All words connect/);
 await page.locator('#score-open').click();assert.match(await page.locator('.modal').innerText(),/Hull fill/);assert.match(await page.locator('.score-table').innerText(),/NOTES/);assert.match(await page.locator('.score-run').innerText(),/30 modifiers/);await page.screenshot({path:'artifacts/screenshot-score.png',fullPage:true});
 await page.locator('#run-start').click();assert.equal(await page.locator('[data-run-modifier]').count(),3,'a run offers three scoring-rule choices');
 const chosenModifier=await page.locator('[data-run-modifier]').first().getAttribute('data-run-modifier');await page.locator('[data-run-modifier]').first().click();
 assert.equal(await page.locator('#rack .tile').count(),21,'optimization run starts a fresh little bunch');
 assert.match(await page.locator('#peel').innerText(),/Bank 1/,'the main peel control becomes the stage bank action');
 let runState=await page.evaluate(()=>JSON.parse(localStorage.getItem('peel-score-run-v1')));assert.equal(runState.status,'playing');assert.deepEqual(runState.modifierIds,[chosenModifier]);
 await page.evaluate(state=>localStorage.setItem('peel-game',JSON.stringify(state)),originalState);await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#plane .tile[data-id]').length===21);
 await page.locator('#score-open').click();assert.match(await page.locator('.run-equation').innerText(),/BASE/);assert.equal(await page.locator('#run-bank').isEnabled(),true,'a valid empty-rack board meeting the target can be banked');await page.locator('#run-bank').click();
 runState=await page.evaluate(()=>JSON.parse(localStorage.getItem('peel-score-run-v1')));assert.equal(runState.stage,2);assert.equal(runState.status,'choosing');assert.equal(runState.scores.length,1);
 await page.locator('[data-run-modifier]').first().click();assert.equal(await page.locator('#rack .tile').count(),1,'choosing the next rule peels one letter into the hand');assert.equal((await boardState()).bag.length,11);
 assert.match(await page.locator('#peel').innerText(),/Bank 2/);
 await page.locator('#score-open').click();await page.locator('#run-abandon').click();assert.match(await page.locator('.score-run').innerText(),/Start a five-stage run/);await page.locator('.modal-close').click();
 // Dictionary overrides add missing common words and hide obscure bundled words.
 await page.locator('#dictionary-open').click();await page.locator('#dictionary-advanced>summary').click();await page.locator('#dictionary-word').fill('sex');
 assert.match(await page.locator('#dictionary-state').innerText(),/not included/);await page.locator('#dictionary-action').click();
 assert.match(await page.locator('#dictionary-state').innerText(),/your addition/);
 await page.locator('#dictionary-word').fill('kae');assert.match(await page.locator('#dictionary-state').innerText(),/bundled word/);await page.locator('#dictionary-action').click();
 assert.match(await page.locator('#dictionary-state').innerText(),/hidden from bundled list/);await page.locator('.modal-close').click();
 let overrides=await page.evaluate(()=>JSON.parse(localStorage.getItem('peel-dictionary-overrides-v1')));
 assert.deepEqual(overrides,{added:['SEX'],removed:['KAE']});
 await page.evaluate(()=>localStorage.setItem('peel-game',JSON.stringify({board:[...`SEX`].map((l,x)=>({id:`u${x}`,l,x,y:0})),rack:[],bag:[],total:3})));
 await page.reload();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('All words connect'));
 assert.equal(await page.locator('#plane .bad').count(),0,'custom word participates in Auto-check');
 await page.locator('#dictionary-open').click();await page.locator('#dictionary-advanced>summary').click();await page.locator('#dictionary-word').fill('sex');await page.locator('#dictionary-action').click();await page.locator('.modal-close').click();
 await page.waitForFunction(()=>document.querySelectorAll('#plane .bad').length===3);
 await page.locator('#dictionary-open').click();await page.locator('#dictionary-advanced>summary').click();await page.locator('#dictionary-word').fill('sex');await page.locator('#dictionary-action').click();await page.locator('.modal-close').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('All words connect'));
 // A complete guided round, including every draw and placement.
 await page.locator('#demo-reset').click();
 for(let i=0;i<7;i++)await page.locator('#demo-next').click();
 assert.equal(await page.locator('#plane .tile[data-id]').count(),21);
 for(let i=0;i<12;i++){
  await page.locator('#demo-next').click();assert.equal(await page.locator('#rack .tile').count(),1);
  await page.locator('#demo-next').click();assert.equal(await page.locator('#rack .tile').count(),0);
  assert.equal(await page.locator('#plane .tile[data-id]').count(),22+i);
  assert.equal(await page.locator('#plane .bad').count(),0);
 }
 assert.equal(await page.locator('#bunch-stat').innerText(),'0');
 assert.match(await page.locator('#status').innerText(),/Bananas/);
 await page.screenshot({path:'artifacts/screenshot-demo.png',fullPage:true});
 await page.locator('#peel').click();assert.match(await page.locator('.modal h2').innerText(),/Bananas/);await page.keyboard.press('Escape');
 // Manual takeover resets the demo safely.
 await page.locator('#plane .tile[data-id]').first().click();await page.keyboard.press('ArrowLeft');await page.keyboard.press('Enter');
 assert.match(await page.locator('#demo-play').innerText(),/Watch the demo/);
 await page.locator('#demo-play').click();await page.locator('#demo-play').click();assert.ok((await boardState()).board.length<33);
 // Full bunch distribution and game rules.
 await page.locator('#new').click();await page.locator('#classic').click();
 let state=await boardState();assert.equal(state.total,144);assert.equal(state.rack.length,21);assert.equal(state.bag.length,123);
 await page.keyboard.press('Space');assert.equal(await page.locator('#rack .selected').getAttribute('data-id'),state.rack[0].id,'Space picks up the first tile from a full rack');
 assert.deepEqual(await boardState(),state);
 await page.keyboard.press('Escape');

 await page.locator('#peel').click();state=await boardState();assert.equal(state.bag.length,123,'cannot peel with rack tiles');
 await page.locator('#rack .tile').first().click();await page.locator('#dump').click();state=await boardState();assert.equal(state.rack.length,23);assert.equal(state.bag.length,121);
 await page.locator('#undo').click();state=await boardState();assert.equal(state.rack.length,21);assert.equal(state.bag.length,123);
 const boardDumpId=state.rack[0].id;
 await page.locator(`#rack [data-id="${boardDumpId}"]`).click();await clickCell(0,0);
 await page.locator(`#plane [data-id="${boardDumpId}"]`).click();await page.locator('#dump').click();state=await boardState();
 assert.equal(state.board.length,0,'Dump removes a selected board tile');assert.equal(state.rack.length,23);assert.equal(state.bag.length,121);
 await page.locator('#undo').click();state=await boardState();assert.equal(state.board.length,1);assert.equal(state.rack.length,20);assert.equal(state.bag.length,123);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile has no horizontal overflow');
 await page.screenshot({path:'artifacts/screenshot-mobile.png',fullPage:true});
 // Live score remains open through board edits, and exposes the exact pond geometry.
 await page.setViewportSize({width:1440,height:1000});
 const ringPosition={board:Array.from({length:16},(_,i)=>({id:`ring${i}`,l:'A',x:i%4,y:Math.floor(i/4)})).filter(t=>t.x===0||t.x===3||t.y===0||t.y===3),rack:[],bag:[],total:12};
 await page.locator('#board-share').click();await page.locator('#position-code').fill(JSON.stringify(ringPosition));await page.locator('#position-import').click();
 const boardSizeBefore=await page.locator('#board').boundingBox(),planeBefore=await page.locator('#plane').getAttribute('style');
 await page.locator('#score-open').click();assert.equal(await page.locator('.modal-backdrop').count(),0,'score is a nonmodal side panel');
 assert.deepEqual(await page.locator('#board').boundingBox(),boardSizeBefore,'opening score preserves board dimensions');assert.equal(await page.locator('#plane').getAttribute('style'),planeBefore,'opening score preserves board zoom and pan');
 await page.reload();await page.waitForSelector('.score-panel');
 await page.locator('[data-score-inspect="hull"]').hover();assert.equal(await page.locator('.hull-outline path').count(),1);assert.equal(await page.locator('.cave-area').count(),0);assert.equal(await page.locator('#plane .shape-label').count(),0);assert.equal(await page.locator('#inspection-caption').isVisible(),true);assert.equal(await page.locator('.hull-contact[data-contact="side"]').count(),16);assert.equal(await page.locator('.hull-contact[data-contact="corner"]').count(),0);
 await page.locator('[data-score-inspect="ponds"]').hover();assert.equal(await page.locator('.pond-cell').count(),4);
 await page.locator('[data-score-inspect="coverage"]').hover();assert.equal(await page.locator('.cave-area').getAttribute('fill-rule'),'evenodd');assert.match(await page.locator('#inspection-caption').innerText(),/Caves · 0/);
 await page.screenshot({path:'artifacts/screenshot-live-ponds.png',fullPage:true});
 await page.locator('#plane [data-id="ring1"]').click();await page.keyboard.press('Delete');assert.equal(await page.locator('.score-panel').count(),1);
 await page.locator('[data-score-inspect="ponds"]').hover();assert.equal(await page.locator('.pond-cell').count(),0,'pond score and overlay update after opening its boundary');
 await page.locator('[data-score-inspect="coverage"]').hover();assert.match(await page.locator('#inspection-caption').innerText(),/Caves · 5/);assert.equal(await page.locator('.cave-area').count(),1);
 await page.locator('#plane').hover({force:true});await page.keyboard.press('z');
 await page.locator('[data-score-inspect="ponds"]').hover();assert.equal(await page.locator('.pond-cell').count(),4,'undo restores inspected pond');
 await page.locator('.score-table [data-score-inspect]').first().hover();assert.ok(await page.locator('.score-inspected').count()>0);
 await page.locator('.alternative-metrics>summary').click();await page.locator('[data-score-inspect="rectangle"]').hover();assert.equal(await page.locator('.density-rectangle').count(),1);
 await page.locator('[data-score-inspect="diamond"]').hover();assert.equal(await page.locator('.inspection-shape path').count(),1);assert.match(await page.locator('.shape-label').innerText(),/radius 3 · 24 cells/);
 await page.screenshot({path:'artifacts/screenshot-live-diamond.png',fullPage:true});
 await page.locator('[data-score-inspect="box"]').hover();assert.equal(await page.locator('.box-rectangle').count(),1);
 await page.locator('[data-score-inspect="solid"]').focus();assert.equal(await page.locator('.solid-rectangle').count(),1);
 await page.locator('[data-score-inspect="longest"]').hover();assert.ok(await page.locator('.score-inspected').count()>0);
 await page.locator('[data-score-inspect="strongest"]').hover();assert.ok(await page.locator('.score-inspected').count()>0);
 await page.locator('[data-score-inspect="woven"]').hover();assert.equal(await page.locator('.score-inspected').count(),0,'weaves smaller than six are not highlighted');
 await page.locator('#score-close').click();assert.equal(await page.locator('.score-inspected').count(),0);
 await page.reload();await page.waitForSelector('#score-open');assert.equal(await page.locator('.score-panel').count(),0,'closed score preference survives reload');
 if(existsSync('artifacts/optimization/improved.json')){
  await page.locator('#board-share').click();await page.locator('#position-file').setInputFiles('artifacts/optimization/improved.json');
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('All words connect'));
  assert.equal(await page.locator('#plane .tile[data-id]').count(),144);
  await page.locator('#score-open').click();await page.locator('.alternative-metrics>summary').click();await page.locator('[data-score-inspect="diamond"]').hover();await page.screenshot({path:'artifacts/optimization/improved-live-score.png',fullPage:true});
  await page.locator('#score-close').click();
 }
 assert.deepEqual(errors,[],'no browser runtime errors');
 console.log('Passed: board letter/n-gram finder, five-stage scoring-run setup and modifier choice, local QA journaling and timestamped notes, custom dictionary add/hide/restore, transparent board scoring, commonness-ranked suggestions, arrow/WASD panning, board/rack dumping, edge-intersection marquee, click-again deselection, placement ghost, keyboard float over collisions, Space peel into hand, board and rack swaps, selection, collision prevention, undo/redo, rack return/placement, pointer drag, live validation and opt-out persistence, all 12 demo peels, completion, manual takeover, full-bunch rules, and mobile layout.');
}finally{await browser.close();}
