const fs = require('node:fs');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const {JSDOM, VirtualConsole} = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG9kAAAAASUVORK5CYII=';
const clone = value => structuredClone(value);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate) {
  for (let i=0;i<300;i++) { if (await predicate()) return; await wait(10); }
  throw new Error('Tempo limite aguardando o aplicativo.');
}
function fixture() {
  const moves = [
    {id:'move-a',nome:'Investida',nomeOriginal:'Tackle',tipo:'Normal',pp:2,descricao:'Ataque físico.'},
    {id:'move-b',nome:'Esgotado',nomeOriginal:'Empty',tipo:'Normal',pp:0,descricao:'Zero PP.'},
    {id:'move-c',nome:'Ataque ensinado',nomeOriginal:'Learned',tipo:'Fogo',pp:5,descricao:'Aprendido.'},
  ];
  const pokemon = (id,nome) => ({id,numero:`#00${id}`,nome,tipo:'Normal',hp:50,dadoVida:10,ca:12,
    imagem:IMAGE,descricao:'Descrição de teste.',status:{forca:10,destreza:10,constituicao:10,inteligencia:10,sabedoria:10,carisma:10},
    habilidades:[],pericias:{},ataques:moves.slice(0,2).map((m,i)=>({...m,moveId:m.id,nivel:1,ppMax:m.pp,ppAtual:m.pp,dano:i?7:5})),evolvesFromId:null});
  const catalog = [pokemon(1,'Bulbasaur'),pokemon(2,'Charmander'),pokemon(3,'Squirtle')];
  const assignment = id => ({pokemonId:id,level:1,status:'captured',currentHp:50,natureza:'rebelde',abilityIndexes:[]});
  return {
    moves,catalog,personal:[],global:{enabled:false,value:2},
    state:{campaign:{name:'Campanha de testes'},master:{user:'mestre',pass:'king'},masterPasswordVersion:1,
      trainers:[{id:'player-1',name:'Ana',username:'ana',password:'antiga123',team:[assignment(1),assignment(2)],pc:[assignment(3)],captured:[1,2,3],visible:[1,2,3],pokemonNotes:{}},
        {id:'player-2',name:'Bruno',username:'bruno',password:'outra123',team:[assignment(1)],pc:[],captured:[1],visible:[1],pokemonNotes:{}}],
      notes:[],dex:{},moveOverrides:{},moveDescriptions:{},abilityDataVersion:1,moveLibraryVersion:3,
      pokemonCatalog:[...catalog,pokemon(99,'Removido do catálogo')],
      encounter:{battleActive:true,battleName:'Batalha de testes',battleId:'test-battle',round:1,active:0,activeParticipantId:'c-player',notes:'',battleLog:[],
        combatants:[{id:'c-player',kind:'player',trainerId:'player-1',name:'Ana',pokemonId:1,level:1,initiative:20,attacks:[]},
          {id:'c-dead',kind:'npc',name:'Derrotado',pokemonId:3,level:1,initiative:15,maxHp:50,currentHp:0,attacks:clone(catalog[2].ataques)},
          {id:'c-npc',kind:'npc',name:'Inimigo',pokemonId:3,level:1,initiative:10,maxHp:50,currentHp:40,attacks:clone(catalog[2].ataques)},
          {id:'c-other',kind:'player',trainerId:'player-2',name:'Bruno',pokemonId:1,level:1,initiative:5,attacks:[]}]}}
  };
}
function mockClient(db) {
  const mock={db,calls:[],uploads:[],removals:[],failState:0,failMoves:0,delayState:0,holdMove:false,holdUpload:false};
  mock.rpc=async(name,args={})=>{
    const payload=args.payload;
    mock.calls.push({name,payload:payload===undefined?null:clone(payload)});
    if(name==='trainerdex_migrate_legacy')return {data:false,error:null};
    if(name==='trainerdex_load_state')return {data:clone(db.state),error:null};
    if(name==='trainerdex_load_pokemon_catalog')return {data:{pokemon:clone(db.catalog)},error:null};
    if(name==='trainerdex_load_move_library')return {data:mock.failMoves?null:{moves:clone(db.moves)},error:mock.failMoves?{message:'falha simulada'}:null};
    if(name==='trainerdex_save_move_library'){
      if(mock.holdMove){mock.moveWaiting=true;await new Promise(r=>{mock.releaseMove=()=>{mock.holdMove=false;r();};});}
      db.moves=clone(payload);return {data:true,error:null};
    }
    if(name==='trainerdex_save_pokemon_catalog'){db.catalog=clone(payload);return {data:true,error:null};}
    if(name==='trainerdex_save_state'){
      if(mock.delayState)await wait(mock.delayState);
      if(mock.failState){mock.failState--;return {data:null,error:{message:'falha simulada'}};}
      db.state=clone(payload);return {data:true,error:null};
    }
    throw new Error(`RPC inesperado: ${name}`);
  };
  mock.from=table=>({
    select(){const result={data:clone(table==='trainerdex_global_settings'?db.global:db.personal),error:null};
      return {eq(){return this;},maybeSingle:async()=>result,then(resolve,reject){return Promise.resolve(result).then(resolve,reject);}};},
    async upsert(payload){
      if(table==='trainerdex_global_settings')db.global=clone(payload);
      if(table==='trainerdex_personal_moves'){
        const i=db.personal.findIndex(x=>x.trainer_id===payload.trainer_id&&x.pokemon_id===payload.pokemon_id);
        if(i<0)db.personal.push(clone(payload));else db.personal[i]=clone(payload);
      }
      return {data:payload,error:null};
    }
  });
  mock.storage={from:bucket=>({
    getPublicUrl:p=>({data:{publicUrl:`https://kytbkjigsapdhxpdchqz.supabase.co/storage/v1/object/public/${bucket}/${p}`}}),
    async upload(p,blob){mock.uploads.push({path:p,size:blob.size});if(mock.holdUpload){mock.uploadWaiting=true;await new Promise(r=>{mock.releaseUpload=()=>{mock.holdUpload=false;r();};});}return {data:{path:p},error:null};},
    async remove(paths){mock.removals.push(...paths);return {data:[],error:null};}
  })};
  return mock;
}
async function mount(db=fixture(),options={}) {
  const messages=[];
  const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>messages.push(e));
  const root=options.root||ROOT;
  const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://trainerdex.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
  const w=dom.window,mock=mockClient(db);mock.failMoves=options.failMoves?1:0;
  w.structuredClone=clone;w.Blob=global.Blob;
  Object.defineProperty(w.crypto,'randomUUID',{value:randomUUID});
  w.CSS={escape:value=>String(value).replace(/[^a-zA-Z0-9_-]/g,c=>`\\${c}`)};
  w.confirm=()=>true;
  w.HTMLElement.prototype.getClientRects=function(){return this.closest('.hidden')?[]:[{width:100,height:40}];};
  w.supabase={createClient:()=>mock};w.__mock=mock;
  const sources=[];
  for(const script of w.document.querySelectorAll('script[src]')){
    const src=script.getAttribute('src');if(src.startsWith('http'))continue;
    sources.push(fs.readFileSync(path.join(root,src.split('?')[0]),'utf8'));
  }
  w.eval(sources.join('\n;\n')+'\nwindow.__eval=code=>eval(code);');
  const app={w,dom,mock,db,messages,eval:code=>w.__eval(code),el:selector=>w.document.querySelector(selector),all:selector=>[...w.document.querySelectorAll(selector)],close:()=>dom.window.close()};
  await until(()=>app.eval('appReady')||app.eval("dbSyncStatus==='loaderror'"));
  if(app.eval('appReady')){if(app.eval('typeof flushDbSave')==='function')await app.eval('flushDbSave()');else{await wait(350);await app.eval('dbSaveChain');}}
  return app;
}
function login(app,role='player',password=role==='master'?'king':app.db.state.trainers[0].password) {
  if(role==='master'){app.el('#masterUser').value='mestre';app.el('#masterPass').value=password;app.el('#masterLoginBtn').click();}
  else{app.el('[data-login-role="player"]').click();app.el('#playerSelect').value='player-1';app.el('#playerPass').value=password;app.el('#playerLoginBtn').click();}
}
function fillPassword(app,prefix,current,next,confirm=next){
  app.el(`#${prefix}CurrentPassword`).value=current;app.el(`#${prefix}NewPassword`).value=next;app.el(`#${prefix}ConfirmPassword`).value=confirm;
}
async function submitPassword(app,prefix){app.el(`#${prefix}PasswordForm`).dispatchEvent(new app.w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>!app.eval('accountPasswordBusy'));}
module.exports={mount,fixture,mockClient,login,fillPassword,submitPassword,until,wait,IMAGE,ROOT};
