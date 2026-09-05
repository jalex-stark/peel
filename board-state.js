// Portable positions contain data only, never executable code or HTML.
export function parseBoardState(value){
 let data=value;
 if(typeof data==='string'){
  const text=data.trim();
  try{data=JSON.parse(text.startsWith('PEEL1.')?atob(text.slice(6).replace(/-/g,'+').replace(/_/g,'/')):text);}catch{throw Error('That is not a valid Peel code or JSON file.');}
 }
 if(!data||!Array.isArray(data.board)||!Array.isArray(data.rack)||!Array.isArray(data.bag))throw Error('The position needs board, rack, and bag tiles.');
 const ids=new Set(),cells=new Set();
 const clean=(tiles,onBoard)=>tiles.map(tile=>{
  if(!tile||typeof tile.id!=='string'||!/^[-a-zA-Z0-9_]{1,64}$/.test(tile.id)||ids.has(tile.id)||typeof tile.l!=='string'||! /^[A-Z]$/.test(tile.l))throw Error('Tiles need unique IDs and one letter A–Z.');
  ids.add(tile.id);const result={id:tile.id,l:tile.l};
  if(onBoard){if(!Number.isInteger(tile.x)||!Number.isInteger(tile.y)||Math.abs(tile.x)>1000||Math.abs(tile.y)>1000)throw Error('Board coordinates must be whole numbers between -1000 and 1000.');const cell=`${tile.x},${tile.y}`;if(cells.has(cell))throw Error('Two tiles cannot occupy the same cell.');cells.add(cell);Object.assign(result,{x:tile.x,y:tile.y});}
  return result;
 });
 const count=data.board.length+data.rack.length+data.bag.length;
 if(count<1||count>500||data.total!==count)throw Error('The total must match the tiles (1–500).');
 return {board:clean(data.board,true),rack:clean(data.rack,false),bag:clean(data.bag,false),total:count};
}
export function encodeBoardState(value){return 'PEEL1.'+btoa(JSON.stringify(parseBoardState(value))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
