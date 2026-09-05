export const INITIAL = [
  ['STONE',0,0,'h'], ['STAR',0,0,'v'], ['RAIN',0,3,'h'],
  ['NOTE',3,3,'v'], ['EAST',3,6,'h'], ['TEA',6,6,'v'], ['ATE',6,8,'h']
];
export const PEELS = [
  {l:'S',x:5,y:0,word:'STONES',note:'A small addition. Turn STONE into STONES.'},
  {l:'T',x:0,y:4,word:'START',note:'Build down from STAR to make START.'},
  {l:'S',x:0,y:5,word:'STARTS',note:'One more S, one longer word: STARTS.'},
  {l:'S',x:4,y:3,word:'RAINS',note:'Let it rain. Extend RAIN into RAINS.'},
  {l:'S',x:3,y:7,word:'NOTES',note:'Keep the crossing intact. NOTE becomes NOTES.'},
  {l:'Y',x:2,y:6,word:'YEAST',note:'Think in both directions. Add Y before EAST.'},
  {l:'S',x:7,y:6,word:'YEASTS',note:'A final S makes YEASTS.'},
  {l:'R',x:6,y:9,word:'TEAR',note:'Grow TEA downward into TEAR.'},
  {l:'S',x:6,y:10,word:'TEARS',note:'The same crossing now holds TEARS.'},
  {l:'L',x:5,y:8,word:'LATE',note:'A prefix works too. Turn ATE into LATE.'},
  {l:'P',x:4,y:8,word:'PLATE',note:'Keep building left: LATE becomes PLATE.'},
  {l:'S',x:9,y:8,word:'PLATES',note:'PLATES completes the board. Every tile has a home.'}
];
export function initialTiles() {
  const cells=new Map();
  for(const [word,x,y,dir] of INITIAL) [...word].forEach((l,i)=>{const px=x+(dir==='h'?i:0),py=y+(dir==='v'?i:0);cells.set(`${px},${py}`,{id:`t${cells.size}`,l,x:px,y:py});});
  return [...cells.values()].map((t,i)=>({...t,id:`t${i}`}));
}
export function getWords(tiles) {
 const map=new Map(tiles.map(t=>[`${t.x},${t.y}`,t])); const words=[];
 for(const t of tiles) for(const [dx,dy] of [[1,0],[0,1]]) {
  if(map.has(`${t.x-dx},${t.y-dy}`))continue;
  const run=[];let x=t.x,y=t.y;
  while(map.has(`${x},${y}`)){run.push(map.get(`${x},${y}`));x+=dx;y+=dy;}
  if(run.length>1)words.push({word:run.map(t=>t.l).join(''),ids:run.map(t=>t.id)});
 }
 return words;
}
export function findBoardMatches(tiles,value){
 const query=value.trim().toUpperCase().replace(/[^A-Z]/g,'');if(!query)return [];
 if(query.length===1)return tiles.filter(tile=>tile.l===query).map(tile=>({query,word:tile.l,ids:[tile.id],direction:'letter',x:tile.x,y:tile.y}));
 const matches=[];
 for(const run of getWords(tiles)){
  const cells=run.ids.map(id=>tiles.find(tile=>tile.id===id));
  const direction=cells.every(tile=>tile.y===cells[0].y)?'horizontal':'vertical';
  let from=0;
  while((from=run.word.indexOf(query,from))>=0){matches.push({query,word:run.word,ids:run.ids.slice(from,from+query.length),direction,x:cells[from].x,y:cells[from].y});from++;}
 }
 return matches;
}
export function validate(tiles, dictionary) {
 if(!tiles.length)return {ok:false,words:[],bad:[],message:'Place a word on the board to get started.'};
 const seen=new Set([tiles[0].id]); const stack=[tiles[0]];
 const map=new Map(tiles.map(t=>[`${t.x},${t.y}`,t]));
 while(stack.length){const t=stack.pop();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=map.get(`${t.x+dx},${t.y+dy}`);if(n&&!seen.has(n.id)){seen.add(n.id);stack.push(n);}}}
 const words=getWords(tiles);const bad=words.filter(w=>!dictionary.has(w.word));
 if(seen.size!==tiles.length)return {ok:false,words,bad,message:'Bring your tiles together into one connected board.'};
 if(!words.length)return {ok:false,words,bad,message:'Make a word with at least two letters.'};
 if(bad.length)return {ok:false,words,bad,message:`Check ${bad.map(w=>w.word).join(', ')} — not in our word list.`};
 return {ok:true,words,bad,message:'Looking good. All words connect!'};
}

export function connectedComponents(tiles){
 const remaining=new Map(tiles.map(tile=>[`${tile.x},${tile.y}`,tile])),groups=[];
 for(const seed of [...tiles].sort((a,b)=>a.id.localeCompare(b.id))){
  if(!remaining.has(`${seed.x},${seed.y}`))continue;
  const group=[],stack=[seed];remaining.delete(`${seed.x},${seed.y}`);
  while(stack.length){const tile=stack.pop();group.push(tile);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const key=`${tile.x+dx},${tile.y+dy}`,next=remaining.get(key);if(next){remaining.delete(key);stack.push(next);}}
  }
  groups.push(group);
 }
 return groups;
}

// Boundary of the union of tile cells: shared internal edges are omitted.
export function componentBoundary(tiles){
 const cells=new Set(tiles.map(tile=>`${tile.x},${tile.y}`)),edges=[];
 for(const {x,y} of tiles){const left=x*48-2,top=y*48-2,right=left+48,bottom=top+48;
  if(!cells.has(`${x},${y-1}`))edges.push(`M${left},${top}H${right}`);
  if(!cells.has(`${x+1},${y}`))edges.push(`M${right},${top}V${bottom}`);
  if(!cells.has(`${x},${y+1}`))edges.push(`M${right},${bottom}H${left}`);
  if(!cells.has(`${x-1},${y}`))edges.push(`M${left},${bottom}V${top}`);
 }
 return edges.join(' ');
}
export function canMove(tiles, ids, dx,dy) {
 const occupied=new Set(tiles.filter(t=>!ids.has(t.id)).map(t=>`${t.x},${t.y}`));
 return tiles.filter(t=>ids.has(t.id)).every(t=>!occupied.has(`${t.x+dx},${t.y+dy}`));
}

/** Independently removable tiles; unrelated spelling errors do not block the helper. */
export function findFreeTiles(tiles,dictionary){
 if(!dictionary)return [];
 const componentCount=items=>{
  const cells=new Map(items.map(tile=>[`${tile.x},${tile.y}`,tile]));let count=0;
  while(cells.size){count++;const first=cells.values().next().value,stack=[first];cells.delete(`${first.x},${first.y}`);
   while(stack.length){const tile=stack.pop();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const key=`${tile.x+dx},${tile.y+dy}`,next=cells.get(key);if(next){cells.delete(key);stack.push(next);}}}
  }
  return count;
 };
 const components=componentCount(tiles);
 const runs=getWords(tiles);
 return tiles.filter(tile=>{
  const remaining=tiles.filter(other=>other.id!==tile.id);
  const unchanged=new Set(runs.filter(run=>!run.ids.includes(tile.id)).map(run=>JSON.stringify(run.ids)));
  const remainingWords=getWords(remaining);
  if(remainingWords.some(run=>!unchanged.has(JSON.stringify(run.ids))&&!dictionary.has(run.word)))return false;
  // A singleton is not an invalid word. Existing disconnected pieces are local
  // editing state; only a new split caused by this lift blocks the tile.
  return componentCount(remaining)<=components;
 }).map(tile=>tile.id);
}

function takeLetters(word, rack) {
 const remaining=[...rack],taken=[];
 for(const letter of word){
  const index=remaining.findIndex(tile=>tile.l===letter);
  if(index<0)return null;
  taken.push(remaining.splice(index,1)[0]);
 }
 return taken;
}

/** Find one valid, low-disruption play using tiles already in the rack. */
export function findSuggestion(tiles, rack, dictionary, candidateWords=[]) {
 if(!rack.length||!dictionary)return null;
 const boardMap=new Map(tiles.map(tile=>[`${tile.x},${tile.y}`,tile]));

 // A fresh peel most often extends an existing word by one letter. Prefer that.
 for(const run of getWords(tiles)){
  const wordTiles=run.ids.map(id=>tiles.find(tile=>tile.id===id));
  const horizontal=wordTiles.every(tile=>tile.y===wordTiles[0].y);
  const sorted=[...wordTiles].sort((a,b)=>horizontal?a.x-b.x:a.y-b.y);
  const before={x:sorted[0].x-(horizontal?1:0),y:sorted[0].y-(horizontal?0:1)};
  const after={x:sorted.at(-1).x+(horizontal?1:0),y:sorted.at(-1).y+(horizontal?0:1)};
  for(const tile of rack){
   for(const [word,spot] of [[tile.l+run.word,before],[run.word+tile.l,after]]){
    if(!dictionary.has(word)||boardMap.has(`${spot.x},${spot.y}`))continue;
    const proposed=[...tiles,{...tile,...spot}];
    if(validate(proposed,dictionary).ok)return {word,placements:[{...tile,...spot}],anchors:run.ids};
   }
  }
 }

 const words=[...new Set(candidateWords.map(word=>word.toUpperCase()))]
  .filter(word=>word.length>=2&&word.length<=Math.min(8,rack.length+1)&&dictionary.has(word));
 if(!tiles.length){
  for(const word of words){
   const chosen=takeLetters(word,rack);
   if(chosen)return {word,placements:chosen.map((tile,index)=>({...tile,x:index-Math.floor(word.length/2),y:0})),anchors:[]};
  }
  return null;
 }

 // Cross a suggested word through one existing tile. Full validation catches
 // collisions and any accidental perpendicular words.
 for(const word of words){
  for(const anchor of tiles){
   for(let letterIndex=0;letterIndex<word.length;letterIndex++){
    if(word[letterIndex]!==anchor.l)continue;
    for(const [dx,dy] of [[1,0],[0,1]]){
     const start={x:anchor.x-letterIndex*dx,y:anchor.y-letterIndex*dy};
     if(boardMap.has(`${start.x-dx},${start.y-dy}`)||boardMap.has(`${start.x+word.length*dx},${start.y+word.length*dy}`))continue;
     const needed=[];let valid=true;
     for(let index=0;index<word.length;index++){
      const x=start.x+index*dx,y=start.y+index*dy,existing=boardMap.get(`${x},${y}`);
      if(existing&&existing.l!==word[index]){valid=false;break;}
      if(!existing)needed.push({l:word[index],x,y});
     }
     if(!valid||!needed.length)continue;
     const available=[...rack],placements=[];
     for(const need of needed){
      const index=available.findIndex(tile=>tile.l===need.l);
      if(index<0){valid=false;break;}
      placements.push({...available.splice(index,1)[0],x:need.x,y:need.y});
     }
     if(!valid)continue;
     const proposed=[...tiles,...placements];
     if(validate(proposed,dictionary).ok)return {word,placements,anchors:[anchor.id]};
    }
   }
  }
 }
 return null;
}

function smallestManhattanRadius(tiles){
 if(!tiles.length)return 0;
 const us=tiles.map(tile=>tile.x+tile.y),vs=tiles.map(tile=>tile.x-tile.y);
 const uMin=Math.min(...us),uMax=Math.max(...us),vMin=Math.min(...vs),vMax=Math.max(...vs);
 return Math.max(uMax-uMin,vMax-vMin)/2;
}

export function smallestManhattanBall(tiles){
 if(!tiles.length)return null;
 const radius=smallestManhattanRadius(tiles),us=tiles.map(t=>t.x+t.y),vs=tiles.map(t=>t.x-t.y);
 const uLow=Math.max(...us)-radius,uHigh=Math.min(...us)+radius,vLow=Math.max(...vs)-radius,vHigh=Math.min(...vs)+radius;
 // u and v can have different parity: the center may lie on an edge or corner.
 const u=uLow+Math.floor((uHigh-uLow)/2),v=vLow+Math.floor((vHigh-vLow)/2),x=(u+v)/2,y=(u-v)/2;
 const rows=[];let area=0;
 for(let row=Math.ceil(y-radius);row<=Math.floor(y+radius);row++){
  const extent=radius-Math.abs(row-y),left=Math.ceil(x-extent),right=Math.floor(x+extent);
  if(left>right)continue;rows.push({y:row,left,right});area+=right-left+1;
 }
 return {x,y,radius,area,rows};
}

export function solidRectangleGeometry(tiles){
 const occupied=new Set(tiles.map(tile=>`${tile.x},${tile.y}`));let best=null;
 for(const tile of [...tiles].sort((a,b)=>a.y-b.y||a.x-b.x)){
  let width=Infinity;
  for(let y=tile.y;occupied.has(`${tile.x},${y}`);y++){
   let rowWidth=0;while(occupied.has(`${tile.x+rowWidth},${y}`))rowWidth++;
   width=Math.min(width,rowWidth);const height=y-tile.y+1,area=width*height;
   if(!best||area>best.area)best={x:tile.x,y:tile.y,width,height,area};
  }
 }
 return best;
}
function largestSolidRectangle(tiles){return solidRectangleGeometry(tiles)?.area||0;}

/** Convex hull of whole unit tile squares, so a line or a single tile has nonzero area. */
export function convexHullGeometry(tiles){
 if(!tiles.length)return null;
 const unique=new Map();
 for(const {x,y} of tiles)for(const [dx,dy] of [[0,0],[1,0],[1,1],[0,1]])unique.set(`${x+dx},${y+dy}`,{x:x+dx,y:y+dy});
 const points=[...unique.values()].sort((a,b)=>a.x-b.x||a.y-b.y);
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const chain=points=>{const hull=[];for(const point of points){while(hull.length>=2&&cross(hull.at(-2),hull.at(-1),point)<=0)hull.pop();hull.push(point);}return hull;};
 const lower=chain(points),upper=chain([...points].reverse());
 const vertices=[...lower.slice(0,-1),...upper.slice(0,-1)];
 const origin=vertices[0];
 const area=Math.abs(vertices.reduce((sum,p,i)=>sum+cross(origin,p,vertices[(i+1)%vertices.length]),0))/2;
 return {vertices,area,density:tiles.length/area};
}

/** Mark boundary sides at their midpoint; omit their redundant endpoint markers. */
export function hullContactMarkers(tiles,hull=convexHullGeometry(tiles)){
 if(!hull)return [];
 const onEdge=(p,a,b)=>(b.x-a.x)*(p.y-a.y)===(b.y-a.y)*(p.x-a.x)&&p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x)&&p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y);
 const edges=hull.vertices.map((a,i)=>[a,hull.vertices[(i+1)%hull.vertices.length]]),markers=[];
 for(const tile of tiles){
  const corners=[[0,0],[1,0],[1,1],[0,1]].map(([dx,dy])=>({x:tile.x+dx,y:tile.y+dy})),covered=new Set();
  for(let i=0;i<4;i++){
   const j=(i+1)%4,a=corners[i],b=corners[j];
   if(edges.some(([u,v])=>onEdge(a,u,v)&&onEdge(b,u,v))){markers.push({id:tile.id,kind:'side',x:(a.x+b.x)/2,y:(a.y+b.y)/2});covered.add(i);covered.add(j);}
  }
  corners.forEach((p,i)=>{if(!covered.has(i)&&edges.some(([a,b])=>onEdge(p,a,b)))markers.push({id:tile.id,kind:'corner',...p});});
 }
 return markers;
}

export function boardScoreGeometry(tiles,score){
 if(!tiles.length)return {hull:null,diamond:null,box:null,solid:null};
 const xs=tiles.map(t=>t.x),ys=tiles.map(t=>t.y);
 const x=Math.min(...xs),y=Math.min(...ys),width=Math.max(...xs)-x+1,height=Math.max(...ys)-y+1;
 return {hull:{...convexHullGeometry(tiles),enclosedRegions:score?.enclosedRegions||[],enclosedArea:score?.enclosedArea||0},diamond:smallestManhattanBall(tiles),box:{x,y,width,height,area:width*height},solid:solidRectangleGeometry(tiles)};
}

/** Stair-stepped outline of the exact discrete L1 ball, including cell edges. */
export function diamondBoundary({rows}){
 const left=i=>rows[i].left*48-2,right=i=>(rows[i].right+1)*48-2,top=i=>rows[i].y*48-2,last=rows.length-1;
 const points=[[left(0),top(0)],[right(0),top(0)]];
 for(let row=0;row<=last;row++){points.push([right(row),top(row)+48]);if(row<last)points.push([right(row+1),top(row)+48]);}
 points.push([left(last),top(last)+48]);
 for(let row=last;row>=0;row--){points.push([left(row),top(row)]);if(row>0)points.push([left(row-1),top(row)]);}
 return `M${points.map(p=>p.join(',')).join('L')}Z`;
}

function findPonds(tiles,minX,maxX,minY,maxY){
 const left=minX-1,right=maxX+1,top=minY-1,bottom=maxY+1,width=right-left+1,height=bottom-top+1;
 if(width*height>100000)return {rank:0,areas:[],regions:[],enclosedRegions:[],enclosedArea:0};
 const occupied=new Set(tiles.map(tile=>`${tile.x},${tile.y}`));
 const floodOutside=directions=>{
  const outside=new Set(),queue=[];
  const add=(x,y)=>{const key=`${x},${y}`;if(x<left||x>right||y<top||y>bottom||occupied.has(key)||outside.has(key))return;outside.add(key);queue.push([x,y]);};
  for(let x=left;x<=right;x++){add(x,top);add(x,bottom);}
  for(let y=top;y<=bottom;y++){add(left,y);add(right,y);}
  for(let index=0;index<queue.length;index++){const [x,y]=queue[index];for(const [dx,dy] of directions)add(x+dx,y+dy);}
  return outside;
 };
 const cardinal=[[1,0],[-1,0],[0,1],[0,-1]],outside4=floodOutside(cardinal),seen=new Set(),ponds=[];
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
  const key=`${x},${y}`;if(occupied.has(key)||outside4.has(key)||seen.has(key))continue;
  const cells=[],queue=[[x,y]];seen.add(key);
  for(let index=0;index<queue.length;index++){const [cx,cy]=queue[index];cells.push([cx,cy]);for(const [dx,dy] of cardinal){const nx=cx+dx,ny=cy+dy,next=`${nx},${ny}`;if(nx<minX||nx>maxX||ny<minY||ny>maxY||occupied.has(next)||outside4.has(next)||seen.has(next))continue;seen.add(next);queue.push([nx,ny]);}}
  ponds.push({area:cells.length,cells:cells.map(([x,y])=>({x,y}))});
 }
 const qualifying=ponds.filter(pond=>pond.area>=4);
 return {rank:qualifying.length,areas:qualifying.map(pond=>pond.area),regions:qualifying,enclosedRegions:ponds,enclosedArea:ponds.reduce((sum,pond)=>sum+pond.area,0)};
}

const frequencyByLengthCache=new WeakMap();
export function frequencyByLength(frequencyRanks){
 if(frequencyByLengthCache.has(frequencyRanks))return frequencyByLengthCache.get(frequencyRanks);
 const groups=new Map(),index=new Map();
 for(const [word,rank] of frequencyRanks){if(!groups.has(word.length))groups.set(word.length,[]);groups.get(word.length).push({word,rank});}
 for(const group of groups.values()){group.sort((a,b)=>a.rank-b.rank||a.word.localeCompare(b.word));group.forEach(({word},i)=>index.set(word,{lengthRank:i+1,lengthCount:group.length}));}
 frequencyByLengthCache.set(frequencyRanks,index);return index;
}

/** Shape 45%, length-relative frequency 40%, and explicit word length 15%. */
export function scoreBoard(tiles,frequencyRanks=new Map(),rankCount=50000){
 if(!tiles.length)return {overall:0,shape:0,commonness:0,lengthScore:0,hullDensity:0,hullCoverage:0,caveArea:0,hullArea:0,hullCoveredArea:0,enclosedArea:0,enclosedRegions:[],l1Density:0,rectangleDensity:0,solidRectangleShare:0,solidCoreScore:0,pondScore:0,pondRank:0,effectivePonds:0,pondAreas:[],pondRegions:[],l1Radius:0,l1Area:0,boundsArea:0,solidRectangleArea:0,words:[]};
 const minX=Math.min(...tiles.map(tile=>tile.x)),maxX=Math.max(...tiles.map(tile=>tile.x));
 const minY=Math.min(...tiles.map(tile=>tile.y)),maxY=Math.max(...tiles.map(tile=>tile.y));
 const ball=smallestManhattanBall(tiles),radius=ball.radius,l1Area=ball.area,boundsArea=(maxX-minX+1)*(maxY-minY+1);
 const solidRectangleArea=largestSolidRectangle(tiles,minX,maxX,minY,maxY);
 const l1Density=Math.min(1,tiles.length/l1Area),rectangleDensity=tiles.length/boundsArea,solidRectangleShare=solidRectangleArea/tiles.length;
 const ponds=findPonds(tiles,minX,maxX,minY,maxY),effectivePonds=ponds.rank,pondScore=Math.min(100,effectivePonds*50);
 const solidCoreScore=Math.min(100,4*solidRectangleArea);
 const hull=convexHullGeometry(tiles),hullCoveredArea=tiles.length+ponds.enclosedArea,hullDensity=hull.density,hullCoverage=hullCoveredArea/hull.area,hullArea=hull.area,caveArea=hullArea-hullCoveredArea;
 const shape=60*hullDensity+.15*solidCoreScore+.25*pondScore;
 const lengthRanks=frequencyByLength(frequencyRanks);
 const words=getWords(tiles).map(({word,ids})=>{
  const rank=frequencyRanks.get(word)||null;
  const {lengthRank=null,lengthCount=0}=lengthRanks.get(word)||{};
  const commonness=lengthRank?100*(1-(lengthRank-1)/Math.max(1,lengthCount-1)):0;
  const lengthScore=Math.min(100,Math.max(0,word.length-2)*12.5);
  return {word,ids,rank,lengthRank,lengthCount,lengthScore,commonness:Math.round(commonness)};
 }).sort((a,b)=>b.commonness-a.commonness||a.word.localeCompare(b.word));
 const letters=words.reduce((sum,item)=>sum+item.word.length,0);
 const commonness=letters?words.reduce((sum,item)=>sum+item.commonness*item.word.length,0)/letters:0;
 const lengthScore=Math.max(0,...words.map(item=>item.lengthScore));
 return {overall:Math.round(.40*commonness+.45*shape+.15*lengthScore),shape:Math.round(shape),commonness:Math.round(commonness),lengthScore:Math.round(lengthScore),hullDensity:Math.round(hullDensity*100),hullCoverage:Math.round(hullCoverage*100),caveArea,hullArea,hullCoveredArea,enclosedArea:ponds.enclosedArea,enclosedRegions:ponds.enclosedRegions,l1Density:Math.round(l1Density*100),rectangleDensity:Math.round(rectangleDensity*100),solidRectangleShare:Math.round(solidRectangleShare*100),solidCoreScore,pondScore:Math.round(pondScore),pondRank:ponds.rank,effectivePonds:Number(effectivePonds.toFixed(2)),pondAreas:ponds.areas,pondRegions:ponds.regions,l1Radius:radius,l1Area,boundsArea,solidRectangleArea,words};
}

export function wordPower(tiles){
 const values={A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};
 const words=getWords(tiles).map(({word})=>{const value=[...word].reduce((sum,l)=>sum+values[l],0);return {word,value,squared:value*value};});
 const maxScrabble=Math.max(0,...words.map(w=>w.value));
 return {longest:Math.max(0,...words.map(w=>w.word.length)),longestWords:words.filter(w=>w.word.length===Math.max(0,...words.map(w=>w.word.length))).map(w=>w.word),maxScrabble,maxScrabbleWords:words.filter(w=>w.value===maxScrabble).map(w=>w.word),scrabbleSquares:words.reduce((sum,w)=>sum+w.squared,0),words};
}

export function wovenRegions(tiles,minRun=3){
 const map=new Map(tiles.map(t=>[t.id,t])),across=new Set(),down=new Set();
 for(const word of getWords(tiles)){
  if(word.ids.length<minRun)continue;
  const first=map.get(word.ids[0]),last=map.get(word.ids.at(-1)),ids=first.y===last.y?across:down;
  for(const id of word.ids)ids.add(id);
 }
 const qualifying=tiles.filter(tile=>across.has(tile.id)&&down.has(tile.id)),regions=connectedComponents(qualifying).sort((a,b)=>b.length-a.length||a[0].id.localeCompare(b[0].id));
 const largest=regions[0]?.length||0,highlightRegions=regions.filter(region=>region.length>=Math.min(largest*.8,regions[1]?.length??largest));
 return {minRun,tiles:qualifying,regions,largest,highlightRegions};
}

/** Max occupied² / area over axis-aligned cell rectangles, using occupied edges. */
export function bestDensityRectangle(tiles){
 if(!tiles.length)return null;
 const xs=[...new Set(tiles.map(t=>t.x))].sort((a,b)=>a-b),ys=[...new Set(tiles.map(t=>t.y))].sort((a,b)=>a-b);
 const yIndex=new Map(ys.map((y,i)=>[y,i])),columns=new Map(xs.map(x=>[x,[]]));
 for(const tile of tiles)columns.get(tile.x).push(yIndex.get(tile.y));
 let best=null;
 for(let left=0;left<xs.length;left++){
  const counts=Array(ys.length).fill(0);
  for(let right=left;right<xs.length;right++){
   for(const row of columns.get(xs[right]))counts[row]++;
   for(let top=0;top<ys.length;top++){
    if(!counts[top])continue;let occupied=0;
    for(let bottom=top;bottom<ys.length;bottom++){
     occupied+=counts[bottom];if(!counts[bottom])continue;
     const width=xs[right]-xs[left]+1,height=ys[bottom]-ys[top]+1,area=width*height,value=occupied*occupied/area;
     if(!best||value>best.value+1e-10||Math.abs(value-best.value)<1e-10&&area<best.area)best={x:xs[left],y:ys[top],width,height,area,occupied,density:occupied/area,value};
    }
   }
  }
 }
 return best;
}

export const SCORE_MODIFIERS=[
 {id:'heavyweight',name:'Heavyweight',description:'Your highest plain Scrabble word value pays that many bonus points.'},
 {id:'word_power',name:'Word Power',description:'Sum of squared Scrabble word values ÷ 100 bonus points. No board premiums.'},
 {id:'diamond_mind',name:'Diamond Mind',description:'Diamond fill pays 30% as bonus points.'},
 {id:'tight_quarters',name:'Tight Quarters',description:'Box fill pays 25% as bonus points.'},
 {id:'solid_ground',name:'Solid Ground',description:'Solid-core score pays 25% as bonus points.'},
 {id:'pond_keeper',name:'Pond Keeper',description:'Each pond of at least four cells is worth 18 points.'},
 {id:'stone_walls',name:'Pond Area',description:'Each enclosed cell in a qualifying pond is worth 5 points.'},
 {id:'soft_corners',name:'Great Lake',description:'Each cell in the largest qualifying pond is worth 9 points.'},
 {id:'plain_speech',name:'Plain Speech',description:'Word commonness pays 30% as bonus points.'},
 {id:'deep_cuts',name:'Deep Cuts',description:'Less-common valid words earn more.'},
 {id:'long_game',name:'The Long Game',description:'Words of six or more letters earn 10 points.'},
 {id:'small_talk',name:'Small Talk',description:'Two- and three-letter words earn 4 points.'},
 {id:'crossroads',name:'Crossroads',description:'Each tile shared by horizontal and vertical words earns 6 points.'},
 {id:'many_paths',name:'Many Paths',description:'Each word after the third earns 4 points.'},
 {id:'headline',name:'Headline',description:'Your longest word earns 2 points per letter.'},
 {id:'mixed_lengths',name:'Mixed Lengths',description:'Each distinct word length earns 5 points.'},
 {id:'vowel_garden',name:'Vowel Garden',description:'A board near 40% vowels earns up to 20 points.'},
 {id:'consonant_engine',name:'Consonant Engine',description:'Every three consonant tiles earn 1 point.'},
 {id:'alphabet_soup',name:'Alphabet Soup',description:'Each distinct letter earns 2 points.'},
 {id:'mirror_words',name:'Mirror Words',description:'Palindromes of three or more letters earn 20 points.'},
 {id:'bookends',name:'Bookends',description:'Words beginning and ending with the same letter earn 8 points.'},
 {id:'horizon',name:'Horizon',description:'Horizontal words earn 5 points each.'},
 {id:'northbound',name:'Northbound',description:'Vertical words earn 5 points each.'},
 {id:'even_keel',name:'Even Keel',description:'Even-length words earn 4 points each.'},
 {id:'odd_jobs',name:'Odd Jobs',description:'Odd-length words earn 4 points each.'},
 {id:'clean_letters',name:'Clean Letters',description:'Words without repeated letters earn 6 points.'},
 {id:'golden_five',name:'Golden Five',description:'Five-letter words earn 6 points each.'},
 {id:'no_small_words',name:'No Small Words',description:'Earn 15 points when every word has at least four letters.'},
 {id:'shared_roots',name:'Shared Roots',description:'Each crossing earns another 5 points.'},
 {id:'quartet',name:'Quartet',description:'Four-letter words earn 5 points each.'}
];

export function scoreWithModifiers(tiles,baseScore,modifierIds=[]){
 const tileMap=new Map(tiles.map(tile=>[tile.id,tile])),words=baseScore.words.map(item=>{
  const cells=item.ids.map(id=>tileMap.get(id));
  return {...item,horizontal:cells.length>1&&cells.every(tile=>tile.y===cells[0].y)};
 });
 const horizontalIds=new Set(),verticalIds=new Set();
 for(const word of words)for(const id of word.ids)(word.horizontal?horizontalIds:verticalIds).add(id);
 const crossings=[...horizontalIds].filter(id=>verticalIds.has(id)).length,vowels=tiles.filter(tile=>'AEIOU'.includes(tile.l)).length;
 const longest=Math.max(0,...words.map(word=>word.word.length)),distinctLengths=new Set(words.map(word=>word.word.length)).size,uniqueLetters=new Set(tiles.map(tile=>tile.l)).size;
 const power=wordPower(tiles);
 const metric={crossings,longest,distinctLengths,uniqueLetters,maxScrabble:power.maxScrabble,scrabbleSquares:power.scrabbleSquares,vowelShare:tiles.length?vowels/tiles.length:0,horizontal:words.filter(word=>word.horizontal).length,vertical:words.filter(word=>!word.horizontal).length};
 const value=id=>{
  switch(id){
   case 'heavyweight':return metric.maxScrabble;
   case 'word_power':return metric.scrabbleSquares/100;
   case 'diamond_mind':return baseScore.l1Density*.30;
   case 'tight_quarters':return baseScore.rectangleDensity*.25;
   case 'solid_ground':return baseScore.solidCoreScore*.25;
   case 'pond_keeper':return baseScore.effectivePonds*18;
   case 'stone_walls':return baseScore.pondAreas.reduce((sum,area)=>sum+area,0)*5;
   case 'soft_corners':return Math.max(0,...baseScore.pondAreas)*9;
   case 'plain_speech':return baseScore.commonness*.30;
   case 'deep_cuts':return words.reduce((sum,word)=>sum+(100-word.commonness)/10,0);
   case 'long_game':return words.filter(word=>word.word.length>=6).length*10;
   case 'small_talk':return words.filter(word=>word.word.length<=3).length*4;
   case 'crossroads':return crossings*6;
   case 'many_paths':return Math.max(0,words.length-3)*4;
   case 'headline':return longest*2;
   case 'mixed_lengths':return distinctLengths*5;
   case 'vowel_garden':return Math.max(0,20-Math.abs(metric.vowelShare-.4)*50);
   case 'consonant_engine':return Math.floor((tiles.length-vowels)/3);
   case 'alphabet_soup':return uniqueLetters*2;
   case 'mirror_words':return words.filter(word=>word.word.length>=3&&word.word===[...word.word].reverse().join('')).length*20;
   case 'bookends':return words.filter(word=>word.word[0]===word.word.at(-1)).length*8;
   case 'horizon':return metric.horizontal*5;
   case 'northbound':return metric.vertical*5;
   case 'even_keel':return words.filter(word=>word.word.length%2===0).length*4;
   case 'odd_jobs':return words.filter(word=>word.word.length%2===1).length*4;
   case 'clean_letters':return words.filter(word=>new Set(word.word).size===word.word.length).length*6;
   case 'golden_five':return words.filter(word=>word.word.length===5).length*6;
   case 'no_small_words':return words.length&&words.every(word=>word.word.length>=4)?15:0;
   case 'shared_roots':return crossings*5;
   case 'quartet':return words.filter(word=>word.word.length===4).length*5;
   default:return 0;
  }
 };
 const modifiers=modifierIds.map(id=>{const definition=SCORE_MODIFIERS.find(item=>item.id===id),bonus=Math.round(value(id));return definition?{...definition,bonus}:null;}).filter(Boolean);
 return {base:baseScore.overall,bonus:modifiers.reduce((sum,item)=>sum+item.bonus,0),total:baseScore.overall+modifiers.reduce((sum,item)=>sum+item.bonus,0),modifiers,metrics:metric};
}
