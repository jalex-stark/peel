import {defineConfig} from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import {parseBoardState} from './board-state.js';

export default defineConfig({plugins:[{
 name:'peel-local-board-sharing',
 configureServer(server){
  server.middlewares.use('/__peel/share',async(req,res)=>{
   res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
   const reject=(code,message)=>{res.statusCode=code;res.end(JSON.stringify({error:message}));};
   if(req.method!=='POST')return reject(405,'Use POST.');
   if(req.headers['x-peel-local']!=='1'||!req.headers['content-type']?.startsWith('application/json'))return reject(403,'Local JSON requests only.');
   if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return reject(403,'Same-origin requests only.');
   try{
    let body='';for await(const chunk of req){body+=chunk;if(body.length>10000000)return reject(413,'Snapshot too large.');}
    const data=JSON.parse(body);
    if(typeof data.clientId!=='string'||!/^[-a-zA-Z0-9]{1,64}$/.test(data.clientId))return reject(400,'Invalid client ID.');
    const state=parseBoardState(data.state),cleanWords=words=>Array.isArray(words)?words.filter(w=>typeof w==='string'&&/^[A-Z]{2,24}$/.test(w)).slice(0,5000):[];
    const snapshot={receivedAt:new Date().toISOString(),clientId:data.clientId,state,dictionaryOverrides:{added:cleanWords(data.dictionaryOverrides?.added),removed:cleanWords(data.dictionaryOverrides?.removed)},modifierIds:Array.isArray(data.modifierIds)?data.modifierIds.filter(id=>typeof id==='string'&&/^[a-z_]{1,40}$/.test(id)).slice(0,50):[]};
    snapshot.replayEvents=(Array.isArray(data.replayEvents)?data.replayEvents:[]).slice(-500).flatMap(event=>{
     try{const candidate=event.state,clean=parseBoardState({board:candidate.board,rack:candidate.rack,bag:[],total:candidate.board.length+candidate.rack.length});return [{sequence:Number(event.sequence)||0,at:String(event.at).slice(0,40),action:String(event.action).slice(0,80),state:{board:clean.board,rack:clean.rack,bunch:Math.max(0,Math.min(500,Number(candidate.bunch)||0))}}];}catch{return [];}
    });
    const directory=path.join(server.config.root,'artifacts','live-boards');await fs.mkdir(directory,{recursive:true});
    await fs.writeFile(path.join(directory,`${data.clientId}.json`),JSON.stringify(snapshot,null,2));
    res.end(JSON.stringify({ok:true,receivedAt:snapshot.receivedAt}));
   }catch(error){reject(400,error.message||'Invalid position.');}
  });
 }
}]});
