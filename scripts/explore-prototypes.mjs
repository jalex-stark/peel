import {getWords,validate,scoreBoard,initialTiles,PEELS} from '../game.js';
import {writeFileSync,mkdirSync} from 'node:fs';
const key=b=>b.map(t=>`${t.x},${t.y}:${t.l}`).sort().join(';');
const counts=b=>{const c={};for(const t of b)c[t.l]=(c[t.l]||0)+1;return c;};
const bankKey=b=>b.map(t=>t.l).sort().join('');
const tiles=(word,x,y,dx,dy)=>[...word].map((l,i)=>({l,x:x+i*dx,y:y+i*dy}));
const withIds=b=>b.map((t,i)=>({...t,id:String(i)}));
function grow(base,words,bank,limit=10000){let states=[base];const inventory=counts(bank),dict=new Set([...words.flat(),...getWords(withIds(base)).map(w=>w.word)]),stats=[];
 for(const options of words){const next=new Map();for(const word of [options].flat())for(const b of states){const occupied=new Map(b.map(t=>[`${t.x},${t.y}`,t]));for(const t of b)for(let j=0;j<word.length;j++){if(t.l!==word[j])continue;for(const [dx,dy] of [[1,0],[0,1]]){
 const add=tiles(word,t.x-j*dx,t.y-j*dy,dx,dy);if(add.some(c=>occupied.has(`${c.x},${c.y}`)&&occupied.get(`${c.x},${c.y}`).l!==c.l))continue;
 const fresh=add.filter(c=>!occupied.has(`${c.x},${c.y}`));if(!fresh.length)continue;const candidate=[...b,...fresh],used=counts(candidate);if(Object.keys(used).some(l=>used[l]>(inventory[l]||0)))continue;
 if(!validate(withIds(candidate),dict).ok)continue;next.set(key(candidate),candidate);
 }}}
 // Spread over a deterministic sample instead of keeping only the most compact.
 const all=[...next.values()];states=all.length<=limit?all:all.filter((_,i)=>i%Math.ceil(all.length/limit)===0).slice(0,limit);stats.push({words:options,generated:all.length,retained:states.length});
 }return {states:states.filter(s=>bankKey(s)===bankKey(bank)),stats};
}
const demo=[...initialTiles(),...PEELS.map((p,i)=>({id:'p'+i,l:p.l,x:p.x,y:p.y}))];
const incoming=[...initialTiles(),...tiles('QUZ',0,0,1,0)];
const r1=grow(tiles('QUIZ',0,0,1,0),['RAIN','STAR',['STONE','NOTES','TONES','ONSET'],'NOTE','EAST','TEA','ATE'],incoming);
const r2=grow(tiles('STONES',0,0,1,0),['STARTS','RAINS',['NOTES','STONE','TONES','ONSET'],'YEASTS',['TEARS','STARE','RATES'],['PLATES','STAPLE','PLEATS','PASTEL','PETALS']],demo);
const ring=[...tiles('BALLS',0,0,1,0),...tiles('BALLS',0,0,0,1),...tiles('LADY',0,3,1,0),...tiles('LADY',3,0,0,1)];
const unique=b=>[...new Map(b.map(t=>[`${t.x},${t.y}`,t])).values()];
const ringBase=unique(ring),pondStart=unique([...ringBase,...tiles('GAS',-2,4,1,0),...tiles('GARDEN',-2,4,0,1),...tiles('NOTES',-2,9,1,0)]);
console.log('pondStart',pondStart.length,validate(withIds(pondStart),new Set(['BALLS','LADY','GAS','GARDEN','NOTES'])));
const r3=grow(ringBase,[['GAS','SAG'],['GARDEN','DANGER','GANDER','RANGED'],['NOTES','STONE','TONES','ONSET']],pondStart);
const align=(s,start,fixed=false)=>{let best=null;for(let dx=fixed?0:-12;dx<=(fixed?0:12);dx++)for(let dy=fixed?0:-12;dy<=(fixed?0:12);dy++){const b=s.map(t=>({...t,x:t.x+dx,y:t.y+dy}));if(b.some(t=>t.x< -9||t.x>14||t.y< -9||t.y>14))continue;const map=new Map(b.map(t=>[`${t.x},${t.y}`,t.l]));const moved=start.filter(t=>map.get(`${t.x},${t.y}`)!==t.l).length;if(!best||moved<best.moved)best={board:b,moved};}return best;};
const output=[];
for(const [id,r,start,metric,fixed] of [['incoming',r1,initialTiles(),'hullDensity',false],['density',r2,demo,'hullDensity',false],['pond',r3,pondStart,'hullCoverage',true]]){
 const rows=r.states.map(s=>align(s,start,fixed)).filter(Boolean).map(r=>({...r,score:scoreBoard(withIds(r.board))}));rows.sort((a,b)=>b.score[metric]-a.score[metric]||a.moved-b.moved);
 console.log(id,'start',scoreBoard(withIds(start))[metric],r.stats,'final',rows.length,'best',rows.slice(0,5).map(r=>({score:r.score[metric],moved:r.moved})));
 const frontier=rows.filter(a=>!rows.some(b=>b.moved<=a.moved&&b.score[metric]>=a.score[metric]&&(b.moved<a.moved||b.score[metric]>a.score[metric])));
 console.log('frontier',frontier.slice(0,30).map(r=>[r.moved,r.score[metric]]));output.push({id,start:withIds(start),metric,stats:r.stats,rows,frontier});
}
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/prototype-exploration.json',JSON.stringify(output));
