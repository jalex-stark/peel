import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
/** Immutable, atomic JSONL batches. Retries of the same batch reuse its filename. */
export async function appendHistory(root,clientId,events){
 if(!/^[-a-zA-Z0-9]{1,64}$/.test(clientId))throw Error('Invalid client ID');
 if(!Array.isArray(events)||events.length>100)throw Error('Send at most 100 events per batch');
 for(const event of events){
  if(!event||typeof event.eventId!=='string'||event.eventId.length>256||typeof event.action!=='string'||!event.state||!Array.isArray(event.state.board))throw Error('Invalid history event');
 }
 const text=events.map(event=>JSON.stringify({version:1,clientId,event})).join('\n')+'\n',hash=createHash('sha256').update(text).digest('hex');
 const directory=path.join(root,'artifacts','history',clientId);await fs.mkdir(directory,{recursive:true});
 const target=path.join(directory,`${hash}.jsonl`);
 try{await fs.access(target);return {count:events.length,file:path.basename(target)};}catch{}
 const temporary=path.join(directory,`.${randomUUID()}.tmp`);
 const file=await fs.open(temporary,'wx');try{await file.writeFile(text);await file.sync();}finally{await file.close();}
 await fs.rename(temporary,target);
 return {count:events.length,file:path.basename(target)};
}
