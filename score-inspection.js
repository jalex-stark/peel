import {wordQuality} from './word-quality.js';
import {boardScoreGeometry,hullContactMarkers,wordPower} from './game.js';
export const inspectionCellPath=cells=>cells.map(p=>`M${p.x*48-2},${p.y*48-2}h48v48h-48Z`).join('');
export function hullInspection(tiles,hull){
 if(!hull)return {path:'',cavesPath:'',contacts:[]};
 const path=`M${hull.vertices.map(p=>`${p.x*48-2},${p.y*48-2}`).join('L')}Z`;
 return {path,cavesPath:path+inspectionCellPath([...tiles,...hull.enclosedRegions.flatMap(r=>r.cells)]),contacts:hullContactMarkers(tiles,hull)};
}
/** Shared scored regions; renderers can draw these without recomputing rules. */
export function scoreInspection(tiles,score,{frequencyRanks=new Map(),wordTierPolicy={}}={}){
 const geometry=boardScoreGeometry(tiles,score),power=wordPower(tiles);
 const wordTiles=words=>tiles.filter(t=>score.words.some(w=>words.includes(w.word)&&w.ids.includes(t.id)));
 return {quality:wordQuality(tiles,frequencyRanks,wordTierPolicy).cells,hull:hullInspection(tiles,geometry.hull),solid:geometry.solid,ponds:inspectionCellPath(score.pondRegions.flatMap(r=>r.cells)),longest:inspectionCellPath(wordTiles(power.longestWords)),strongest:inspectionCellPath(wordTiles(power.maxScrabbleWords)),commonness:tiles.map(t=>{const words=score.words.filter(w=>w.ids.includes(t.id));return {x:t.x,y:t.y,value:words.length?words.reduce((sum,w)=>sum+w.commonness,0)/words.length:0};})};
}
