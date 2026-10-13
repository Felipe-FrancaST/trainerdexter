/*
 * TrainerDex — camada de persistência
 * ------------------------------------
 * Toda a comunicação com o Supabase fica neste módulo. A interface e as
 * regras da campanha continuam no app.js, mantendo responsabilidades separadas.
 */

const DEFAULT={campaign:{name:"Minha Campanha Pokémon"},master:{user:"mestre",pass:"king"},trainers:[],dex:{},encounter:{round:1,active:0,notes:"",combatants:[]},notes:[]};
const state=structuredClone(DEFAULT);
const SOURCE_DATA_VERSION=4;

// O Supabase é a fonte única de dados. Não usamos localStorage para guardar campanha,
// Pokémon, ataques ou imagens. O cache offline também não deve conter dados do jogo.
const DB_BUCKET = "trainerdex-images";
let dbReady=false;
let dbSaveChain=Promise.resolve();
let dbSaveTimer=null;
let dbChangeVersion=0;
let dbSavedVersion=0;
let dbSyncStatus='loading';
const pendingImageRemovals=new Set();
const pendingTrainerPasswordEdits=new Map();
function setSyncStatus(status){
  dbSyncStatus=status;
  const labels={loading:'Carregando dados…',pending:'Alterações pendentes',saving:'Salvando…',saved:'Tudo salvo',error:'Não foi possível salvar',loaderror:'Não foi possível carregar os dados'};
  const bar=document.querySelector('#syncBar'),text=document.querySelector('#syncStatus'),retry=document.querySelector('#syncRetryBtn');
  if(bar)bar.dataset.status=status;
  if(text)text.textContent=labels[status]||status;
  if(retry){retry.classList.toggle('hidden',status!=='error');retry.disabled=!dbReady;}
}
let dbConfiguredCache=null;
let personalMovesReady=false;
const personalMovesRecords=new Map();

function personalMovesRecordKey(trainerId,pokemonId){return `${trainerId}:${Number(pokemonId)}`;}
function normalizePersonalMoves(data={}){
  return {
    learnedMoves:(Array.isArray(data.learnedMoves)?data.learnedMoves:[]).filter(a=>a&&a.moveId).map(a=>({moveId:String(a.moveId),nivel:Math.max(1,Math.min(100,Number(a.nivel)||1)),dano:Math.max(0,Number(a.dano)||0)})),
    excludedMoves:[...new Set((Array.isArray(data.excludedMoves)?data.excludedMoves:[]).map(String))]
  };
}
async function loadPersonalMovesFromSupabase(){
  personalMovesReady=false;personalMovesRecords.clear();
  try{
    const {data,error}=await window.trainerdexSupabase.from('trainerdex_personal_moves').select('trainer_id,pokemon_id,learned_moves,excluded_moves');
    if(error)throw error;
    for(const row of data||[]){
      const value=normalizePersonalMoves({learnedMoves:row.learned_moves,excludedMoves:row.excluded_moves});
      personalMovesRecords.set(personalMovesRecordKey(row.trainer_id,row.pokemon_id),value);
    }
    state.trainers.forEach(t=>[...(t.team||[]),...(t.pc||[])].forEach(a=>{
      a.personalMoves=structuredClone(personalMovesRecords.get(personalMovesRecordKey(t.id,a.pokemonId))||{learnedMoves:[],excludedMoves:[]});
    }));
    personalMovesReady=true;
  }catch(error){
    console.warn('TrainerDex: ataques individuais indisponíveis. Execute ENSINAR_ATAQUES_SETUP.sql no Supabase.',error);
  }
}
async function savePersonalMovesToSupabase(t,a,data){
  if(!personalMovesReady)throw new Error('Execute ENSINAR_ATAQUES_SETUP.sql no Supabase e recarregue o site.');
  const value=normalizePersonalMoves(data);
  const {error}=await window.trainerdexSupabase.from('trainerdex_personal_moves').upsert({trainer_id:String(t.id),pokemon_id:Number(a.pokemonId),learned_moves:value.learnedMoves,excluded_moves:value.excludedMoves,updated_at:new Date().toISOString()},{onConflict:'trainer_id,pokemon_id'});
  if(error)throw error;
  a.personalMoves=value;
  personalMovesRecords.set(personalMovesRecordKey(t.id,a.pokemonId),structuredClone(value));
  return value;
}
function dbConfigured(){
  if(dbConfiguredCache===true)return true;
  dbConfiguredCache=!!(window.trainerdexSupabase&&window.TRAINERDEX_SUPABASE_CONFIG?.enabled);
  if(dbConfiguredCache) console.info("TrainerDex: Supabase configurado.");
  else console.warn("TrainerDex: Supabase não está configurado ou não foi carregado.");
  return dbConfiguredCache;
}
async function migrateLegacyStateInSupabase(){
  if(!dbConfigured()) return false;
  try{
    const {data,error}=await window.trainerdexSupabase.rpc("trainerdex_migrate_legacy");
    if(error){console.error("Supabase: migração do estado antigo falhou:",error);return false;}
    return !!data;
  }catch(error){console.error("Supabase: erro ao migrar estado antigo:",error);return false;}
}
async function loadStateFromSupabase(){
  if(!dbConfigured()) return false;
  await migrateLegacyStateInSupabase();
  const {data,error}=await window.trainerdexSupabase.rpc("trainerdex_load_state");
  if(error){console.error("Supabase: erro ao carregar estado organizado:",error);return false;}
  if(data && typeof data==="object"){
    // O catálogo possui tabela própria. Nunca deixe um estado antigo/vazio
    // substituir o catálogo que acabou de ser carregado do Supabase.
    const preservedCatalog=Array.isArray(state.pokemonCatalog)&&state.pokemonCatalog.length?state.pokemonCatalog:null;
    Object.keys(state).forEach(k=>delete state[k]);
    Object.assign(state,data);
    if(preservedCatalog && (!Array.isArray(state.pokemonCatalog)||state.pokemonCatalog.length===0)){
      state.pokemonCatalog=preservedCatalog;
    }
    return true;
  }
  return false;
}

// Configuração global fica em tabela própria: o RPC trainerdex_save_state não
// persiste campos arbitrários adicionados ao objeto state.
async function loadGlobalProficiencyFromSupabase(){
  if(!dbConfigured()) return null;
  const {data,error}=await window.trainerdexSupabase
    .from("trainerdex_global_settings")
    .select("enabled,value")
    .eq("id",1)
    .maybeSingle();
  if(error){
    console.warn("Supabase: bônus global indisponível. Execute GLOBAL_PROFICIENCY_SETUP.sql:",error);
    return null;
  }
  return data ? {enabled:!!data.enabled,value:Math.max(0,Math.min(20,Number(data.value)||0))} : null;
}
async function saveGlobalProficiencyToSupabase(config){
  if(!dbConfigured()) throw new Error("Supabase não configurado.");
  const payload={id:1,enabled:!!config.enabled,value:Math.max(0,Math.min(20,Number(config.value)||0)),updated_at:new Date().toISOString()};
  const {error}=await window.trainerdexSupabase.from("trainerdex_global_settings").upsert(payload,{onConflict:"id"});
  if(error){
    console.error("Supabase: não foi possível salvar o bônus global de proficiência:",error);
    throw error;
  }
  console.info("TrainerDex: bônus global de proficiência salvo.");
  return true;
}

async function loadPokemonCatalogFromSupabase(){
  if(!dbConfigured()) return null;
  const {data,error}=await window.trainerdexSupabase.rpc("trainerdex_load_pokemon_catalog");
  if(error){
    console.error("Supabase: não foi possível carregar o catálogo de Pokémon:",error);
    return null;
  }
  return Array.isArray(data?.pokemon) ? data.pokemon : null;
}

async function savePokemonCatalogToSupabase(list){
  if(!Array.isArray(list) || list.length===0){
    console.warn("TrainerDex: bloqueado salvamento de catálogo vazio para evitar apagar os Pokémon do Supabase.");
    return false;
  }
  const {error}=await window.trainerdexSupabase.rpc("trainerdex_save_pokemon_catalog",{payload:list});
  if(error) throw error;
  console.info(`TrainerDex: catálogo de Pokémon salvo (${list.length} registros).`);
  return true;
}

async function loadMoveLibraryFromSupabase(){
  if(!dbConfigured()) return null;
  const {data,error}=await window.trainerdexSupabase.rpc("trainerdex_load_move_library");
  if(error){
    console.error("Supabase: não foi possível carregar a biblioteca de ataques:",error);
    return null;
  }
  return Array.isArray(data?.moves) ? data.moves : null;
}

async function saveMoveLibraryToSupabase(list){
  const {error}=await window.trainerdexSupabase.rpc("trainerdex_save_move_library",{payload:list});
  if(error) throw error;
}

function dataUrlToBlob(dataUrl){
  const parts=String(dataUrl||"").split(",");
  if(parts.length!==2 || !parts[0].includes("base64")) throw new Error("Imagem inválida.");
  const mime=(parts[0].match(/data:([^;]+)/)||[])[1]||"image/png";
  const binary=atob(parts[1]);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:mime});
}
function publicImageUrl(path){
  return window.trainerdexSupabase.storage.from(DB_BUCKET).getPublicUrl(path).data.publicUrl;
}
async function removePokemonStorageImage(image){
  if(!dbConfigured() || !image) return;
  const marker=`/storage/v1/object/public/${DB_BUCKET}/`;
  let url;try{url=new URL(image);if(url.origin!==new URL(window.TRAINERDEX_SUPABASE_CONFIG.url).origin)return;}catch(error){return;}
  if(!url.pathname.startsWith(marker))return;
  const path=decodeURIComponent(url.pathname.slice(marker.length));
  if(!path.startsWith("pokemon/")) return;
  const {error}=await window.trainerdexSupabase.storage.from(DB_BUCKET).remove([path]);
  if(error) throw error;
}
async function uploadPendingPokemonImages(){
  // Revê a lista após cada upload: outra edição pode ocorrer enquanto a rede responde.
  while(true){
    const p=(state.pokemonCatalog||[]).find(item=>item?._newImage);
    if(!p)break;
    const image=p._newImage,blob=dataUrlToBlob(image);
    if(blob.size>8*1024*1024) throw new Error(`A imagem de ${p.nome||"Pokémon"} é maior que 8 MB.`);
    const extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}[blob.type];
    if(!extension)throw new Error('Use uma imagem PNG, JPEG, WebP ou GIF.');
    // Caminhos únicos impedem que o navegador continue exibindo a capa antiga.
    const path=`pokemon/${encodeURIComponent(String(p.id))}/cover-${crypto.randomUUID()}.${extension}`;
    const {error}=await window.trainerdexSupabase.storage.from(DB_BUCKET).upload(path,blob,{
      upsert:false,contentType:blob.type,cacheControl:"3600"
    });
    if(error) throw error;
    const url=publicImageUrl(path);
    if(p._newImage===image&&(state.pokemonCatalog||[]).includes(p)){
      p.imagem=url;delete p._newImage;
    }else pendingImageRemovals.add(url);
  }
}
function save(){
  // Compatibilidade com o restante da aplicação: o armazenamento agora é somente Supabase.
  // A sincronização é enfileirada para evitar gravações concorrentes.
  queueDbSave();
}
function queueDbSave(){
  if(!dbConfigured() || !dbReady) return;
  ++dbChangeVersion;
  setSyncStatus('pending');
  clearTimeout(dbSaveTimer);
  dbSaveTimer=setTimeout(()=>{dbSaveTimer=null;enqueuePendingDbSave();},300);
}

function enqueuePendingDbSave(){
  const write=async()=>{
    if(dbSavedVersion>=dbChangeVersion)return true;
    try{
      setSyncStatus('saving');
      await uploadPendingPokemonImages();
      const catalog=state.pokemonCatalog?.length?state.pokemonCatalog:pokemons;
      if(!Array.isArray(catalog)||!catalog.length)throw new Error('Catálogo não carregado.');
      // Os três RPCs recebem a mesma fotografia dos dados, mesmo com edições durante a rede.
      const snapshot=structuredClone(state),moveSnapshot=structuredClone(moves),catalogSnapshot=structuredClone(catalog);
      const originalPasswords=new Map(snapshot.trainers.map(t=>[t.id,t.password]));
      const originalMasterPassword=snapshot.master?.pass;
      const version=dbChangeVersion;
      await saveMoveLibraryToSupabase(moveSnapshot);
      await savePokemonCatalogToSupabase(catalogSnapshot);
      // Uma aba antiga não deve desfazer a troca de senha feita em outra conta/aba.
      // Apenas uma redefinição explícita pelo Mestre pode substituir a senha remota.
      const {data:remote,error:readError}=await window.trainerdexSupabase.rpc('trainerdex_load_state');
      if(readError)throw readError;
      if(!remote||typeof remote!=='object'||!Array.isArray(remote.trainers))throw new Error('Resposta de campanha inválida.');
      if(typeof remote.master?.pass==='string')snapshot.master.pass=remote.master.pass;
      for(const trainer of snapshot.trainers){
        const latest=remote.trainers.find(t=>t.id===trainer.id);
        if(typeof latest?.password==='string'&&pendingTrainerPasswordEdits.get(trainer.id)!==trainer.password)trainer.password=latest.password;
      }
      const {error}=await window.trainerdexSupabase.rpc('trainerdex_save_state',{payload:snapshot});
      if(error)throw error;
      if(state.master.pass===originalMasterPassword)state.master.pass=snapshot.master.pass;
      for(const trainer of snapshot.trainers){
        const live=state.trainers.find(t=>t.id===trainer.id);
        if(live?.password===originalPasswords.get(trainer.id))live.password=trainer.password;
        if(pendingTrainerPasswordEdits.get(trainer.id)===trainer.password)pendingTrainerPasswordEdits.delete(trainer.id);
      }
      dbSavedVersion=version;
      for(const image of [...pendingImageRemovals]){
        if(catalogSnapshot.some(p=>p.imagem===image)||pokemons.some(p=>p.imagem===image))continue;
        try{await removePokemonStorageImage(image);pendingImageRemovals.delete(image);}
        catch(error){console.warn('TrainerDex: limpeza de imagem pendente.',error);}
      }
      setSyncStatus(dbSavedVersion===dbChangeVersion?'saved':'pending');
      return true;
    }catch(error){
      setSyncStatus('error');
      console.error('Supabase: falha ao salvar dados:',error);
      toast('Não foi possível sincronizar com o Supabase. Tente novamente.');
      throw error;
    }
  };
  // A rejeição continua disponível para quem aguarda a gravação; a fila pode ser retomada.
  dbSaveChain=dbSaveChain.then(write,write);
  dbSaveChain.catch(()=>{});
  return dbSaveChain;
}

function flushDbSave(){
  if(!dbConfigured()||!dbReady)return Promise.reject(new Error('Banco não disponível.'));
  clearTimeout(dbSaveTimer);dbSaveTimer=null;
  return enqueuePendingDbSave();
}

async function changeAccountPassword(role,trainerId,current,next){
  const fail=message=>Object.assign(new Error(message),{userMessage:message});
  if(session?.role!==role||(role==='player'&&session.trainerId!==trainerId)||!['master','player'].includes(role)){
    throw fail('Entre na sua conta para alterar a senha.');
  }
  if(typeof next!=='string'||next.length<8||next.length>128||!next.trim()||next===current){
    throw fail('Escolha uma nova senha de 8 a 128 caracteres, diferente da atual.');
  }
  await flushDbSave();
  const write=async()=>{
    if(session?.role!==role||(role==='player'&&session.trainerId!==trainerId))throw fail('Entre novamente para alterar a senha.');
    const local=role==='master'?state.master:state.trainers.find(t=>t.id===trainerId);
    const field=role==='master'?'pass':'password';
    if(!local||local[field]!==current)throw fail('A senha atual está incorreta.');
    setSyncStatus('saving');
    try{
      // Atualiza somente a credencial no estado mais recente que o banco retornou.
      const {data,error:loadError}=await window.trainerdexSupabase.rpc('trainerdex_load_state');
      if(loadError)throw loadError;
      if(!data||typeof data!=='object')throw new Error('Resposta de campanha inválida.');
      const snapshot=structuredClone(data);
      const target=role==='master'?snapshot.master:snapshot.trainers?.find(t=>t.id===trainerId);
      if(!target||target[field]!==current)throw fail('A senha atual no banco é diferente. Recarregue a página e entre novamente.');
      target[field]=next;
      if(role==='master')snapshot.masterPasswordVersion=1;
      const {error}=await window.trainerdexSupabase.rpc('trainerdex_save_state',{payload:snapshot});
      if(error)throw error;
      // Uma falha não muda a senha local nem deixa uma nova senha pendente na fila.
      local[field]=next;
      if(role==='master')state.masterPasswordVersion=1;
      setSyncStatus(dbSavedVersion===dbChangeVersion?'saved':'pending');
      return true;
    }catch(error){setSyncStatus('error');throw error;}
  };
  dbSaveChain=dbSaveChain.then(write,write);
  dbSaveChain.catch(()=>{});
  return dbSaveChain;
}

window.addEventListener('beforeunload',event=>{
  if(dbReady&&(dbChangeVersion>dbSavedVersion||dbSyncStatus==='saving')){
    event.preventDefault();event.returnValue='';
  }
});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'&&dbReady&&dbChangeVersion>dbSavedVersion)flushDbSave().catch(()=>{});
});
window.addEventListener('online',()=>{if(dbReady&&dbSyncStatus==='error')flushDbSave().catch(()=>{});});
