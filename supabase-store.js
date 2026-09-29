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
let dbConfiguredCache=null;
function dbConfigured(){
  if(dbConfiguredCache!==null)return dbConfiguredCache;
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
  dbReady=true;
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
    console.error("Supabase: não foi possível carregar o bônus global de proficiência. Execute GLOBAL_PROFICIENCY_SETUP.sql:",error);
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
  const index=String(image).indexOf(marker);
  if(index<0) return;
  const path=decodeURIComponent(String(image).slice(index+marker.length));
  if(!path.startsWith("pokemon/")) return;
  const {error}=await window.trainerdexSupabase.storage.from(DB_BUCKET).remove([path]);
  if(error) console.warn("TrainerDex: não foi possível remover a imagem antiga:",error);
}
async function uploadPendingPokemonImages(){
  const list=Array.isArray(state.pokemonCatalog)?state.pokemonCatalog:[];
  for(const p of list){
    if(!p?._newImage) continue;
    const blob=dataUrlToBlob(p._newImage);
    if(blob.size>8*1024*1024) throw new Error(`A imagem de ${p.nome||"Pokémon"} é maior que 8 MB.`);
    const path=`pokemon/${encodeURIComponent(String(p.id))}/cover`;
    const {error}=await window.trainerdexSupabase.storage.from(DB_BUCKET).upload(path,blob,{
      upsert:true,contentType:blob.type||"image/png",cacheControl:"3600"
    });
    if(error) throw error;
    p.imagem=publicImageUrl(path);
    delete p._newImage;
  }
}
function save(){
  // Compatibilidade com o restante da aplicação: o armazenamento agora é somente Supabase.
  // A sincronização é enfileirada para evitar gravações concorrentes.
  queueDbSave();
}
function queueDbSave(){
  if(!dbConfigured() || !dbReady) return;
  clearTimeout(dbSaveTimer);
  dbSaveTimer=setTimeout(()=>{
    dbSaveChain=dbSaveChain.then(async()=>{
      try{
        await uploadPendingPokemonImages();
        await saveMoveLibraryToSupabase(moves);
        const catalog=Array.isArray(state.pokemonCatalog)&&state.pokemonCatalog.length
          ? state.pokemonCatalog
          : (Array.isArray(pokemons)&&pokemons.length ? pokemons : null);
        if(!catalog){
          console.warn("TrainerDex: sincronização geral ignorada porque o catálogo ainda não foi carregado.");
          return;
        }
        await savePokemonCatalogToSupabase(catalog);
        const snapshot=structuredClone(state);
        const {error}=await window.trainerdexSupabase.rpc("trainerdex_save_state",{payload:snapshot});
        if(error) throw error;
        console.info("TrainerDex: dados sincronizados com Supabase.");
      }catch(error){
        console.error("Supabase: falha ao salvar dados:",error);
        toast("Não foi possível sincronizar com o Supabase. Tente novamente.");
      }
    });
  },300);
}

