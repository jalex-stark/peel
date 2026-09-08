import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {CURATED_TIERS,TIERS} from '../word-tiers.js';
const dir=new URL('../artifacts/tier-batches/',import.meta.url);await mkdir(dir,{recursive:true});
const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const base=await read('../public/words.json'),bank=new Set(base),common=await read('../public/common-words.json'),levels=await read('../challenges/prototypes.json');
let candidates=[...new Set([...levels.flatMap(l=>l.words),...base.filter(w=>w.length<=3),...common.filter(w=>bank.has(w)).slice(0,4000)])].filter(w=>!CURATED_TIERS.has(w));
try{if(!process.argv.includes('--fresh'))candidates=JSON.parse(await readFile(new URL('candidates.json',dir),'utf8'));}catch{}
const prompt=`Rate EVERY supplied word for a word-building optimization game, using subjective quality rather than Scrabble point value or raw frequency. Return ONLY a JSON object mapping each uppercase word to S,A,B,C,D,F. No tools or explanations. Anchors: VERACITY and TURGID S; TWIXT COIF SUEDE A; BY BED RUN PARTY DONOR B; QI C; AVO SOU D; PUL F. S is exceptional satisfying expressive vocabulary; A is vivid, precise, satisfying standard vocabulary; B is ordinary useful English; C is legitimate specialist/technical vocabulary or mild word-game oddities; D is obscure scraps and unfamiliar short forms; F is extreme dictionary detritus. Standard long words can be A/S without being everyday. Do not punish ordinary plurals/conjugations, sexual words, or vocabulary just for length. Do not inflate plain long words automatically. Unknown obscure words should be D, not fabricated meanings. Rate each word independently; no quotas.\nWORDS: `;
await writeFile(new URL('candidates.json',dir),JSON.stringify(candidates));
const batches=Array.from({length:Math.ceil(candidates.length/150)},(_,i)=>candidates.slice(i*150,(i+1)*150));let cursor=0;
const results=[];
async function ask(words){return await new Promise((resolve,reject)=>{const child=spawn('claude',['-p','--model','claude-haiku-4-5','--safe-mode','--tools','','--strict-mcp-config','--no-session-persistence','--output-format','json','--max-budget-usd','0.20'],{stdio:['pipe','pipe','pipe']});let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);child.on('error',reject);child.on('close',code=>code?reject(Error(`Claude rating: ${err||out}`)):resolve(JSON.parse(out)));child.stdin.end(prompt+words.join(' '));});}
async function worker(){while(cursor<batches.length){const i=cursor++,words=batches[i],file=new URL(`batch-${i}.json`,dir);let raw;
 try{raw=JSON.parse(await readFile(file,'utf8'));if(raw.words.join()!==words.join())raw=null;}catch{}
 if(!raw){const output=await ask(words);raw={words,output};await writeFile(file,JSON.stringify(raw,null,2));}
 if(raw.output.is_error)throw Error(`Batch ${i} failed`);
 const ratings=JSON.parse(raw.output.result.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
 for(let retry=0;retry<2;retry++){const missing=words.filter(w=>!TIERS.includes(ratings[w]));if(!missing.length)break;const repair=await ask(missing);await writeFile(new URL(`batch-${i}-repair-${retry}.json`,dir),JSON.stringify(repair,null,2));Object.assign(ratings,JSON.parse(repair.result.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')));}
 raw.output.result=JSON.stringify(ratings);await writeFile(file,JSON.stringify(raw,null,2));
 for(const w of words){if(!TIERS.includes(ratings[w]))throw Error(`Missing/invalid rating ${w} in ${i}`);results.push([w,ratings[w]]);}
 console.log(`Batch ${i+1}/${batches.length}: ${words.length} words`);
}}
await Promise.all(Array.from({length:4},worker));
const ratings=Object.fromEntries(results.sort(([a],[b])=>a.localeCompare(b)));
await writeFile(new URL('../generated-word-tiers.json',import.meta.url),JSON.stringify({version:1,model:'claude-haiku-4-5',rubric:prompt.split('\nWORDS:')[0],ratings},null,2)+'\n');
console.log(`Wrote ${results.length} validated ratings; editorial anchors excluded.`);
