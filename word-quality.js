import {getWords} from './game.js';
import {TIERS,wordTier} from './word-tiers.js';
export const QUALITY_VALUES={S:100,A:80,B:60,C:40,D:20,F:0};
export const QUALITY_COLORS={S:'#edc65c',A:'#a9d66e',B:'#8ed2bf',C:'#bcb5e3',D:'#efa968',F:'#e98491',none:'#deded7'};
/** A crossing inherits its weaker word, never an average of its two words. */
export function wordQuality(tiles,ranks=new Map(),policy={}){
 const words=getWords(tiles).map(w=>({...w,...wordTier(w.word,ranks,policy)}));
 const byTile=new Map(tiles.map(t=>[t.id,[]]));for(const w of words)for(const id of w.ids)byTile.get(id)?.push(w);
 const cells=tiles.map(t=>{
  const runs=byTile.get(t.id),tier=runs.length?runs.reduce((weak,w)=>TIERS.indexOf(w.tier)>TIERS.indexOf(weak)?w.tier:weak,'S'):null;
  return {id:t.id,x:t.x,y:t.y,tier,value:tier?QUALITY_VALUES[tier]:0,color:QUALITY_COLORS[tier||'none'],words:runs.map(w=>w.word),provisional:runs.some(w=>w.tier===tier&&w.provisional)};
 });
 const sum=cells.reduce((s,c)=>s+c.value,0);
 return {version:'minimum-tier-average-v1',score:cells.length?Math.round(sum/cells.length):0,sum,count:cells.length,unworded:cells.filter(c=>c.tier===null).length,provisional:cells.filter(c=>c.provisional).length,cells,words};
}
