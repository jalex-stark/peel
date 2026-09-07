import {readFileSync,writeFileSync} from 'node:fs';
import {WORDS} from '../challenges/pack.js';
import {getWords} from '../game.js';
const exploration=JSON.parse(readFileSync('artifacts/prototype-exploration.json','utf8'));
const configs=[
 {id:'q-delivery',source:'incoming',title:'Q delivery',description:'Fit Q, U and Z into a working 21-tile board. Every tile must join the crossword, QUIZ must appear, and at most 14 original letter positions may change.',budget:14,required:['QUIZ'],metric:'hullDensity',target:0,longWords:0},
 {id:'compact-without-sacrifice',source:'density',title:'Compact without sacrifice',description:'Raise hull fill from 43% to at least 51%. Keep STONES and four words of six or more letters, while changing at most 14 original letter positions.',budget:14,required:['STONES'],metric:'hullDensity',target:51,longWords:4},
 {id:'keep-the-pond',source:'pond',title:'Keep the pond',description:'Turn open space into useful enclosure: reach 60% enclosed hull while preserving the anchored courtyard and a six-letter word. At most eight original letter positions may change.',budget:8,required:[],metric:'hullCoverage',target:60,longWords:1,ponds:1},
];
const counts=b=>{const c={};for(const t of b)c[t.l]=(c[t.l]||0)+1;return c;};
const result=configs.map(c=>{
 const source=exploration.find(e=>e.id===c.source),start=source.start.map((t,i)=>({...t,id:`w${i}`}));
 const rack=c.source==='incoming'?[...'QUZ'].map((l,i)=>({l,id:'delivery'+i})):[];
 const bank=[...start,...rack].map(t=>t.l).sort().join(''),inventory=counts([...start,...rack]);
 const words=[...new Set([...WORDS,'STONES','STARTS','RAINS','YEASTS','TEARS','PLATES','STAPLE','PLEATS','PASTEL','PETALS','BALLS','GARDEN','DANGER','GANDER','RANGED'])].filter(w=>!['TED','TARES','RENAL'].includes(w)&&[...new Set(w)].every(l=>w.split(l).length-1<=(inventory[l]||0))).sort();
 const locks=c.ponds?start.filter(t=>t.x>=0&&t.x<=3&&t.y>=0&&t.y<=3).map(({x,y,l})=>({x,y,l})):[];
 const eligible=source.rows.filter(r=>r.moved<=c.budget&&r.score[c.metric]>=c.target&&c.required.every(w=>getWords(r.board.map((t,i)=>({...t,id:String(i)}))).some(run=>run.word===w))&&getWords(r.board.map((t,i)=>({...t,id:String(i)}))).filter(w=>w.word.length>=6).length>=c.longWords);
 if(!eligible.length)throw Error(c.id+' has no witness');
 const witness=eligible[0],pool=[...start,...rack];
 // Preserve IDs at unchanged letters, then match the remaining identical copies.
 const assigned=witness.board.map(t=>{const i=pool.findIndex(p=>p.l===t.l&&p.x===t.x&&p.y===t.y);if(i>=0)return {...t,id:pool.splice(i,1)[0].id};return {...t};});
 for(const t of assigned)if(!t.id){const i=pool.findIndex(p=>p.l===t.l);t.id=pool.splice(i,1)[0].id;}
 const report={scope:'Constructive search over a restricted family of word-crossing layouts, not exhaustive over the playable board. Reported bests are witnesses, not proven global optima.',stages:source.stats,examined:source.rows.length,feasibleInFamily:eligible.length,frontier:[...new Set(source.frontier.map(r=>JSON.stringify({changed:r.moved,value:r.score[c.metric]})))].map(JSON.parse),bestKnown:witness.score[c.metric],witness:{board:assigned,rack:[],bag:[],total:bank.length},witnessWords:getWords(assigned).map(w=>w.word)};
 return {...c,version:1,bank,words,locks,bounds:{minX:-9,maxX:14,minY:-9,maxY:14},state:{board:start,rack,bag:[],total:bank.length},report};
});
writeFileSync('challenges/prototypes.json',JSON.stringify(result,null,2)+'\n');
console.log(result.map(p=>({id:p.id,tiles:p.bank.length,allowlist:p.words.length,examined:p.report.examined,feasible:p.report.feasibleInFamily,best:p.report.bestKnown})));
