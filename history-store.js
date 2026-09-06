// IndexedDB stores every action. The QA and replay UI buffers do not control retention.
export function openHistoryStore(name='peel-history-v1'){
 const database=new Promise((resolve,reject)=>{
  const request=indexedDB.open(name,1);
  request.onupgradeneeded=()=>{const store=request.result.createObjectStore('events',{keyPath:'key',autoIncrement:true});store.createIndex('id','id',{unique:true});store.createIndex('pending','pending');};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
 const complete=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||Error('History transaction aborted'));});
 return {
  async append(events){
   const db=await database,tx=db.transaction('events','readwrite'),store=tx.objectStore('events'),done=complete(tx);
   const unique=new Map(events.map(event=>[event.eventId||`${event.at}:${event.sequence}:${event.action}`,event]));
   for(const original of unique.values()){const event=structuredClone(original),id=event.eventId||`${event.at}:${event.sequence}:${event.action}`;event.eventId=id;
    const request=store.index('id').getKey(id);request.onsuccess=()=>{if(request.result===undefined)store.add({id,event,pending:1});};
   }
   await done;
  },
  async pending(limit=40){const db=await database;return new Promise((resolve,reject)=>{const request=db.transaction('events').objectStore('events').index('pending').getAll(1,limit);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});},
  async acknowledge(records){const db=await database,tx=db.transaction('events','readwrite'),store=tx.objectStore('events'),done=complete(tx);for(const record of records)store.put({...record,pending:0});await done;},
  async all(){const db=await database;return new Promise((resolve,reject)=>{const request=db.transaction('events').objectStore('events').getAll();request.onsuccess=()=>resolve(request.result.map(r=>r.event));request.onerror=()=>reject(request.error);});},
  async close(){(await database).close();},
  async count(){const db=await database;return new Promise((resolve,reject)=>{const request=db.transaction('events').objectStore('events').count();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
 };
}
