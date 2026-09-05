import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseBoardState,encodeBoardState} from './board-state.js';
import {findFreeTiles} from './game.js';
import {connectedComponents,componentBoundary} from './game.js';
import {wordPower} from './game.js';
import {bestDensityRectangle} from './game.js';
import {boardScoreGeometry,diamondBoundary,solidRectangleGeometry} from './game.js';
import {smallestManhattanBall} from './game.js';
import {convexHullGeometry,hullContactMarkers,wovenRegions} from './game.js';
import {initialTiles, PEELS, getWords, findBoardMatches, validate, canMove, findSuggestion, scoreBoard, SCORE_MODIFIERS, scoreWithModifiers} from './game.js';
const dictionary=new Set(JSON.parse(readFileSync('public/words.json','utf8')));
test('a smallest bounding diamond may be centered between tiles with a half-cell radius',()=>{
 for(const tiles of [[{x:0,y:0},{x:1,y:0}],[{x:0,y:0},{x:0,y:1}],[{x:-2,y:-3},{x:1,y:-3}]]){
  const ball=smallestManhattanBall(tiles);
  assert.equal(ball.radius,Math.abs(tiles[1].x-tiles[0].x+tiles[1].y-tiles[0].y)/2);
  assert.ok(tiles.every(t=>Math.abs(t.x-ball.x)+Math.abs(t.y-ball.y)<=ball.radius));
  assert.ok(ball.rows.every(r=>Number.isInteger(r.y)&&Number.isInteger(r.left)&&Number.isInteger(r.right)));
  const points=diamondBoundary(ball).slice(1,-1).split('L').map(p=>p.split(',').map(Number));
  const area=Math.abs(points.reduce((sum,[x,y],i)=>{const [nx,ny]=points[(i+1)%points.length];return sum+x*ny-y*nx;},0))/2/48**2;
  assert.equal(area,ball.area);
 }
 assert.equal(smallestManhattanBall([{x:0,y:0},{x:1,y:0}]).area,2);
});
test('inspectable scoring regions match their scored areas and contain the board',()=>{
 for(const board of [initialTiles(),[{id:'a',l:'A',x:-3,y:4}],Array.from({length:12},(_,i)=>({id:`b${i}`,l:'A',x:i%4-2,y:Math.floor(i/4)-1}))]){
  const score=scoreBoard(board),g=boardScoreGeometry(board,score);
  assert.ok(board.every(t=>Math.abs(t.x-g.diamond.x)+Math.abs(t.y-g.diamond.y)<=g.diamond.radius));
  const vertices=diamondBoundary(g.diamond).slice(1,-1).split('L').map(p=>p.split(',').map(Number));
  const twiceArea=vertices.reduce((sum,[x,y],i)=>{const [nx,ny]=vertices[(i+1)%vertices.length];return sum+x*ny-nx*y;},0);
  assert.equal(Math.abs(twiceArea)/2/48**2,score.l1Area);
  assert.equal(g.box.area,score.boundsArea);assert.equal(g.solid.area,score.solidRectangleArea);
  for(let y=g.solid.y;y<g.solid.y+g.solid.height;y++)for(let x=g.solid.x;x<g.solid.x+g.solid.width;x++)assert.ok(board.some(t=>t.x===x&&t.y===y));
 }
 assert.equal(solidRectangleGeometry([]),null);
});
test('density-squared rectangles reward occupied area and preserve sparse coordinate gaps',()=>{
 const full=Array.from({length:9},(_,i)=>({id:`f${i}`,l:'A',x:i%3,y:Math.floor(i/3)}));
 assert.equal(bestDensityRectangle(full).value,9);
 const ring=Array.from({length:16},(_,i)=>({id:`r${i}`,l:'A',x:i%4,y:Math.floor(i/4)})).filter(t=>t.x===0||t.x===3||t.y===0||t.y===3);
 const r=bestDensityRectangle(ring);assert.equal(r.occupied,12);assert.equal(r.area,16);assert.equal(r.value,9);
 assert.equal(bestDensityRectangle([{x:-100,y:0},{x:100,y:0}]).value,1);
 assert.equal(bestDensityRectangle([]),null);
});
test('component outlines follow groups, omit shared edges, and separate diagonal singletons',()=>{
 const tiles=[{id:'a',l:'A',x:0,y:0},{id:'b',l:'T',x:1,y:0},{id:'c',l:'I',x:2,y:1}];
 const groups=connectedComponents(tiles);assert.deepEqual(groups.map(group=>group.length),[2,1]);
 assert.equal(componentBoundary(groups[0]).split('M').length-1,6);
 assert.equal(componentBoundary(groups[1]).split('M').length-1,4);
 assert.deepEqual(connectedComponents([...tiles].reverse()),groups);
 assert.equal(connectedComponents([...tiles,{id:'d',l:'N',x:2,y:0}]).length,1);
});
test('free tiles leave valid nearby words and a connected board, one lift at a time',()=>{
 const tiles=[...'CATS'].map((l,x)=>({id:`f${x}`,l,x,y:0}));
 const words=new Set(['CATS','CAT','ATS']);
 assert.deepEqual(findFreeTiles(tiles,words),['f0','f3']);
 assert.deepEqual(findFreeTiles(tiles.slice(0,3),words),[]);
 assert.deepEqual(findFreeTiles(tiles,new Set(['CATS'])),[]);
 assert.deepEqual(findFreeTiles(tiles,null),[]);
 // An unchanged invalid word elsewhere should not hide a locally free suffix.
 const crossed=[...tiles,{id:'v1',l:'Z',x:0,y:1},{id:'v2',l:'Z',x:0,y:2}];
 assert.ok(findFreeTiles(crossed,words).includes('f3'));
 assert.ok(!findFreeTiles(crossed,words).includes('f0'));
});
test('free tiles allow IT endpoints, lone tiles, and unrelated disconnected pieces',()=>{
 const it=[{id:'i',l:'I',x:0,y:0},{id:'t',l:'T',x:1,y:0}],words=new Set(['IT','CAT']);
 assert.deepEqual(findFreeTiles(it,words),['i','t']);
 assert.deepEqual(findFreeTiles(it.slice(0,1),words),['i']);
 const cat=[...'CAT'].map((l,x)=>({id:`c${x}`,l,x:x+10,y:0}));
 assert.ok(findFreeTiles([...it,...cat],words).includes('i'));
 assert.ok(!findFreeTiles([...it,...cat],words).includes('c1'),'removing a bridge creates an extra component');
});
test('portable board codes preserve tiles and reject unsafe or overlapping positions',()=>{
 const state={board:initialTiles(),rack:[],bag:PEELS.map((p,i)=>({id:`p${i}`,l:p.l})),total:33};
 assert.deepEqual(parseBoardState(encodeBoardState(state)),state);
 assert.deepEqual(parseBoardState(JSON.stringify(state)),state);
 assert.throws(()=>parseBoardState({...state,total:34}),/total/);
 assert.throws(()=>parseBoardState({...state,board:state.board.map((t,i)=>i===1?{...t,x:0,y:0}:t)}),/same cell/);
 assert.throws(()=>parseBoardState('PEEL1.garbage'),/valid/);
});
test('demo starts with 21 tiles and completes a valid board through all 12 peels',()=>{
 const board=initialTiles();assert.equal(board.length,21);assert.equal(getWords(board).length,7);assert.equal(validate(board,dictionary).ok,true);
 PEELS.forEach((p,i)=>{assert.equal(board.some(t=>t.x===p.x&&t.y===p.y),false);board.push({...p,id:`p${i}`});const result=validate(board,dictionary);assert.equal(result.ok,true,`${i}: ${result.message}`);assert.ok(result.words.some(w=>w.word===p.word));});assert.equal(board.length,33);
});
test('disconnected words and invalid crosswords are rejected',()=>{
 const tiles=initialTiles();tiles.push({id:'far',l:'A',x:50,y:50});assert.equal(validate(tiles,dictionary).ok,false);
 const invalid=[{id:'1',l:'Z',x:0,y:0},{id:'2',l:'Z',x:1,y:0},{id:'3',l:'Q',x:2,y:0}];assert.equal(validate(invalid,dictionary).ok,false);
});
test('group movement allows internal overlap but rejects occupied destinations',()=>{
 const tiles=[{id:'1',x:0,y:0},{id:'2',x:1,y:0},{id:'3',x:3,y:0}];const group=new Set(['1','2']);assert.equal(canMove(tiles,group,1,0),true);assert.equal(canMove(tiles,group,2,0),false);assert.equal(canMove(tiles,group,-20,-20),true);
});
test('suggestions use rack tiles and produce a valid board',()=>{
 const rack=[...`STONE`].map((l,i)=>({id:`r${i}`,l}));
 const fresh=findSuggestion([],rack,dictionary,['STONE','NOTE','AT']);
 assert.equal(fresh.word,'STONE');assert.equal(fresh.placements.length,5);
 assert.equal(validate(fresh.placements,dictionary).ok,true);

 const board=[...`STONE`].map((l,x)=>({id:`b${x}`,l,x,y:0}));
 const extension=findSuggestion(board,[{id:'s',l:'S'}],dictionary,['PLATES']);
 assert.equal(extension.word,'STONES');assert.deepEqual(extension.placements,[{id:'s',l:'S',x:5,y:0}]);
 assert.equal(validate([...board,...extension.placements],dictionary).ok,true);
});
test('board score exposes compactness and word commonness components',()=>{
 const block=Array.from({length:9},(_,index)=>({id:`b${index}`,l:'A',x:index%3,y:Math.floor(index/3)}));
 const sparse=Array.from({length:9},(_,index)=>({id:`s${index}`,l:'A',x:index*2,y:0}));
 const blockScore=scoreBoard(block),sparseScore=scoreBoard(sparse);
 assert.equal(blockScore.solidRectangleArea,9);assert.equal(blockScore.rectangleDensity,100);
 assert.ok(blockScore.shape>sparseScore.shape);assert.ok(blockScore.l1Density>sparseScore.l1Density);

 const ranks=new Map([['STONE',100],['FJORD',20000],['THE',1],['KAE',40000]]);
 const stone=scoreBoard([...`STONE`].map((l,x)=>({id:`a${x}`,l,x,y:0})),ranks,50000);
 const kae=scoreBoard([...`KAE`].map((l,x)=>({id:`k${x}`,l,x,y:0})),ranks,50000);
 assert.ok(stone.commonness>kae.commonness);assert.equal(stone.words[0].rank,100);
});
test('frequency compares within word length and longer words get a separate reward',()=>{
 const common=JSON.parse(readFileSync('public/common-words.json','utf8')),ranks=new Map(common.map((w,i)=>[w,i+1]));
 const board=[...'VERACITY'].map((l,x)=>({id:`v${x}`,l,x,y:0})),score=scoreBoard(board,ranks,common.length);
 assert.equal(score.words[0].lengthRank,2913);assert.equal(score.words[0].lengthCount,6544);assert.equal(score.commonness,55);assert.equal(score.lengthScore,75);
 const short=scoreBoard([{id:'i',l:'I',x:0,y:0},{id:'t',l:'T',x:1,y:0}],ranks,common.length);assert.equal(short.lengthScore,0);
});
test('ponds require four cells and corner enclosures count equally',()=>{
 const ring=(width,height)=>Array.from({length:width*height},(_,i)=>({id:`r${i}`,l:'A',x:i%width,y:Math.floor(i/width)})).filter(t=>t.x===0||t.y===0||t.x===width-1||t.y===height-1);
 for(const area of [1,2,3]){const score=scoreBoard(ring(area+2,3));assert.equal(score.pondRank,0);assert.equal(score.pondScore,0);assert.deepEqual(score.pondRegions,[]);}
 const full=ring(4,4),cornersRemoved=full.filter(t=>!([0,3].includes(t.x)&&[0,3].includes(t.y)));
 for(const board of [full,cornersRemoved]){const score=scoreBoard(board);assert.equal(score.pondRank,1);assert.equal(score.effectivePonds,1);assert.equal(score.pondScore,50);assert.deepEqual(score.pondAreas,[4]);assert.equal(score.pondRegions[0].cells.length,4);}
 assert.equal(scoreBoard(full.filter(t=>t.id!=='r1')).pondRank,0);
});
test('word power squares plain Scrabble values of each full word',()=>{
 const tiles=[...'QUIZ'].map((l,x)=>({id:`p${x}`,l,x,y:0}));
 const power=wordPower(tiles);assert.equal(power.longest,4);assert.equal(power.scrabbleSquares,22*22);assert.deepEqual(power.longestWords,['QUIZ']);
 assert.equal(wordPower([]).scrabbleSquares,0);
 assert.equal(power.maxScrabble,22);assert.deepEqual(power.maxScrabbleWords,['QUIZ']);
});
test('woven regions require occupied tiles with 3+ letter runs in both directions',()=>{
 const full=Array.from({length:9},(_,i)=>({id:`w${i}`,l:'A',x:i%3,y:Math.floor(i/3)}));
 assert.equal(wovenRegions(full).largest,9);
 const ring=full.filter(t=>t.id!=='w4'),woven=wovenRegions(ring);
 assert.equal(woven.tiles.length,4);assert.equal(woven.largest,1);assert.ok(!woven.tiles.some(t=>t.x===1&&t.y===1));
 assert.equal(wovenRegions(full.slice(0,3)).largest,0);
});
test('board finder locates letters and overlapping n-grams in both directions',()=>{
 const tiles=[...`BANANA`].map((l,x)=>({id:`h${x}`,l,x,y:0}));
 tiles.push({id:'v1',l:'A',x:0,y:1},{id:'v2',l:'N',x:0,y:2});
 const letters=findBoardMatches(tiles,'a'),grams=findBoardMatches(tiles,'ana'),vertical=findBoardMatches(tiles,'ban');
 assert.equal(letters.length,4);assert.equal(grams.length,2);assert.deepEqual(grams.map(match=>match.ids),[['h1','h2','h3'],['h3','h4','h5']]);
 assert.ok(vertical.some(match=>match.direction==='vertical'&&match.ids.join(',')==='h0,v1,v2'));
 assert.deepEqual(findBoardMatches(tiles,' 1! '),[]);
});
test('scoring modifiers form a broad, additive rule vocabulary',()=>{
 const tiles=[...`LEVEL`].map((l,x)=>({id:`w${x}`,l,x,y:0}));
 const base=scoreBoard(tiles,new Map([['LEVEL',100]]),50000);
 const scored=scoreWithModifiers(tiles,base,['mirror_words','bookends','headline','horizon']);
 assert.ok(SCORE_MODIFIERS.length>=25);assert.equal(scored.modifiers.length,4);
 assert.deepEqual(scored.modifiers.map(item=>item.bonus),[20,8,10,5]);
 assert.equal(scored.total,scored.base+43);
});

test('solid core rewards absolute area with four points per cell capped at 100',()=>{
 const rectangle=(w,h)=>Array.from({length:w*h},(_,i)=>({id:`s${i}`,l:'A',x:i%w,y:Math.floor(i/w)}));
 assert.equal(scoreBoard(rectangle(4,6)).solidCoreScore,96);
 assert.equal(scoreBoard(rectangle(5,5)).solidCoreScore,100);
 assert.equal(scoreBoard(rectangle(6,6)).solidCoreScore,100);
 const small=rectangle(3,3),extended=[...small,{id:'distant',l:'A',x:30,y:30}];
 assert.equal(scoreBoard(small).solidCoreScore,36);
 assert.equal(scoreBoard(extended).solidCoreScore,36);
 assert.equal(scoreBoard([]).solidCoreScore,0);
});
test('woven highlights include near-best regions and omit small regions',()=>{
 const rectangle=(w,h,offset)=>Array.from({length:w*h},(_,i)=>({id:`r${offset}-${i}`,l:'A',x:offset+i%w,y:Math.floor(i/w)}));
 const result=wovenRegions([...rectangle(4,5,0),...rectangle(4,4,10),...rectangle(3,3,20)]);
 assert.deepEqual(result.regions.map(r=>r.length),[20,16,9]);
 assert.deepEqual(result.highlightRegions.map(r=>r.length),[20,16]);
 const runnerUp=wovenRegions([...rectangle(5,5,0),...rectangle(3,3,10),...rectangle(3,3,20)]);
 assert.deepEqual(runnerUp.highlightRegions.map(r=>r.length),[25,9,9],'include runner-up and ties below the 80% threshold');
 assert.deepEqual(wovenRegions([]).highlightRegions,[]);
});

test('convex hull uses whole tile squares and fractional area without axis bias',()=>{
 const tiles=coords=>coords.map(([x,y],i)=>({id:`h${i}`,l:'A',x,y}));
 assert.equal(convexHullGeometry([]),null);
 assert.equal(convexHullGeometry(tiles([[0,0]])).area,1);
 assert.equal(convexHullGeometry(tiles([[0,0],[1,0],[2,0]])).density,1);
 const board=tiles([[0,0],[1,0],[0,1]]),hull=convexHullGeometry(board);
 assert.equal(hull.area,3.5);assert.equal(scoreBoard(board).hullDensity,86);
 assert.equal(convexHullGeometry(board.map(t=>({...t,x:-t.y+100,y:t.x-40}))).area,hull.area);
 assert.equal(convexHullGeometry([...board,{id:'fill',l:'A',x:1,y:1}]).density,1);
 assert.equal(boardScoreGeometry(board).hull.area,scoreBoard(board).hullArea);
 assert.equal(scoreBoard([]).hullDensity,0);
});

test('length reward uses only the longest word without dilution from short crossings',()=>{
 const board=[...'VERACITY'].map((l,x)=>({id:`long${x}`,l,x,y:0}));
 const withShort=[...board,{id:'short',l:'A',x:0,y:1}];
 assert.equal(scoreBoard(board).lengthScore,75);
 assert.equal(scoreBoard(withShort).lengthScore,75);
 assert.equal(scoreBoard(withShort).words.find(w=>w.word==='VA').lengthScore,0);
});

test('hull contact dots mark full sides and otherwise isolated boundary corners',()=>{
 const square=Array.from({length:9},(_,i)=>({id:`m${i}`,x:i%3,y:Math.floor(i/3)}));
 const markers=hullContactMarkers(square);
 assert.equal(markers.length,12);assert.ok(markers.every(p=>p.kind==='side'));assert.ok(!markers.some(p=>p.id==='m4'));
 assert.deepEqual(markers.filter(p=>p.id==='m1'),[{id:'m1',kind:'side',x:1.5,y:0}]);
 const diagonal=hullContactMarkers([{id:'a',x:0,y:0},{id:'b',x:1,y:1},{id:'c',x:2,y:2}]);
 assert.deepEqual(diagonal.filter(p=>p.id==='b'),[{id:'b',kind:'corner',x:2,y:1},{id:'b',kind:'corner',x:1,y:2}]);
 assert.deepEqual(hullContactMarkers([]),[]);
});

test('enclosed hull coverage counts every gap separately from occupied hull fill',()=>{
 const ring=Array.from({length:9},(_,i)=>({id:`e${i}`,l:'A',x:i%3,y:Math.floor(i/3)})).filter(t=>t.id!=='e4');
 const score=scoreBoard(ring);assert.equal(score.hullDensity,89);assert.equal(score.hullCoverage,100);assert.equal(score.caveArea,0);assert.equal(score.enclosedArea,1);assert.equal(score.hullCoveredArea,9);assert.equal(score.pondRank,0);
 assert.deepEqual(score.enclosedRegions,[{area:1,cells:[{x:1,y:1}]}]);
 const opened=scoreBoard(ring.filter(t=>t.id!=='e1'));assert.equal(opened.enclosedArea,0);assert.ok(opened.hullCoverage<100);assert.equal(opened.caveArea,2);
 const corner=scoreBoard(ring.filter(t=>!['e0','e2','e6','e8'].includes(t.id)));assert.equal(corner.enclosedArea,1);assert.equal(corner.pondRank,0);assert.ok(corner.hullDensity<=100);
 assert.equal(boardScoreGeometry(ring,score).hull.enclosedArea,1);
});
