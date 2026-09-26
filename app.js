const $=(s,e=document)=>e.querySelector(s),$$=(s,e=document)=>[...e.querySelectorAll(s)];
const KEY="trainerdex_mestre_v2";
const DEFAULT={campaign:{name:"Minha Campanha Pokémon"},master:{user:"mestre",pass:"king"},trainers:[],dex:{},encounter:{round:1,active:0,notes:"",combatants:[]},notes:[]};
const LOCAL_STATE=JSON.parse(localStorage.getItem(KEY)||"null");
const state=LOCAL_STATE||structuredClone(DEFAULT);
const SOURCE_DATA_VERSION=2;

// Persistência: localStorage continua como cache/offline, enquanto o Supabase
// guarda os dados em tabelas organizadas. O formato de estado do frontend é mantido
// para que as telas existentes continuem funcionando sem uma reescrita completa.
const DB_BUCKET="trainerdex-images";
let dbReady=false;
let dbSaveChain=Promise.resolve();
let dbSaveTimer=null;
function dbConfigured(){
  const configured=!!(window.trainerdexSupabase && window.TRAINERDEX_SUPABASE_CONFIG?.enabled);
  if(configured) console.info("TrainerDex: Supabase configurado.");
  else console.warn("TrainerDex: Supabase não está configurado ou não foi carregado.");
  return configured;
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
    Object.keys(state).forEach(k=>delete state[k]);
    Object.assign(state,data);
    localStorage.setItem(KEY,JSON.stringify(state));
    return true;
  }
  return false;
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
function queueDbSave(){
  if(!dbConfigured() || !dbReady) return;
  clearTimeout(dbSaveTimer);
  dbSaveTimer=setTimeout(()=>{
    dbSaveChain=dbSaveChain.then(async()=>{
      try{
        await uploadPendingPokemonImages();
        const snapshot=structuredClone(state);
        const {error}=await window.trainerdexSupabase.rpc("trainerdex_save_state",{payload:snapshot});
        if(error) throw error;
        localStorage.setItem(KEY,JSON.stringify(state));
        console.info("TrainerDex: dados sincronizados com Supabase.");
      }catch(error){
        console.error("Supabase: falha ao salvar dados:",error);
        toast("Não foi possível sincronizar com o Supabase. Os dados continuam salvos localmente.");
      }
    });
  },300);
}
const save=()=>{
  localStorage.setItem(KEY,JSON.stringify(state));
  queueDbSave();
};

state.masterPasswordVersion??=0;
state.moveDescriptions??={};
state.moveOverrides??={};
let pokemons=[], moves=[], session=null;
const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove("show"),2400)};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const typeClass=s=>{const k=norm(String(s||"")).trim().replace(/\s+/g,"-");const map={agua:"water",fogo:"fire",grama:"grass",planta:"grass",eletrico:"electric",eletricidade:"electric",gelo:"ice",lutador:"fighting",veneno:"poison",terrestre:"ground",voador:"flying",psiquico:"psychic",inseto:"bug",pedra:"rock",fantasma:"ghost",dragao:"dragon",noturno:"dark",aco:"steel",metal:"steel",fada:"fairy",normal:"normal"};return `type-${map[k]||k||"normal"}`};
const typeTags=types=>String(types||"").split(/\s*\/\s*|,\s*/).map(x=>x.trim()).filter(Boolean).map(x=>`<span class="tag type-tag ${typeClass(x)}">${esc(x)}</span>`).join("");
const uid=()=>crypto.randomUUID();
const POKEMON_TYPES=["Normal","Fogo","Água","Elétrico","Grama","Gelo","Lutador","Veneno","Terrestre","Voador","Psíquico","Inseto","Pedra","Fantasma","Dragão","Sombrio","Aço","Fada"];
const POKEMON_NATURES=[
 {id:"hardy",name:"Robusta",en:"Hardy"},{id:"lonely",name:"Solitária",en:"Lonely"},{id:"adamant",name:"Firme",en:"Adamant"},{id:"naughty",name:"Travessa",en:"Naughty"},{id:"brave",name:"Valente",en:"Brave"},
 {id:"bold",name:"Audaz",en:"Bold"},{id:"docile",name:"Dócil",en:"Docile"},{id:"impish",name:"Arteira",en:"Impish"},{id:"lax",name:"Despreocupada",en:"Lax"},{id:"relaxed",name:"Relaxada",en:"Relaxed"},
 {id:"modest",name:"Modesta",en:"Modest"},{id:"mild",name:"Amável",en:"Mild"},{id:"bashful",name:"Envergonhada",en:"Bashful"},{id:"rash",name:"Imprudente",en:"Rash"},{id:"quiet",name:"Calma",en:"Quiet"},
 {id:"calm",name:"Serena",en:"Calm"},{id:"gentle",name:"Gentil",en:"Gentle"},{id:"careful",name:"Cuidadosa",en:"Careful"},{id:"quirky",name:"Peculiar",en:"Quirky"},{id:"sassy",name:"Atrevida",en:"Sassy"},
 {id:"timid",name:"Tímida",en:"Timid"},{id:"hasty",name:"Apressada",en:"Hasty"},{id:"jolly",name:"Alegre",en:"Jolly"},{id:"naive",name:"Ingênua",en:"Naive"},{id:"serious",name:"Séria",en:"Serious"}
];
const DEFAULT_POKEMON_NATURE="serious";
function pokemonNature(id){return POKEMON_NATURES.find(n=>n.id===id)||POKEMON_NATURES.find(n=>n.id===DEFAULT_POKEMON_NATURE);}
function pokemonNatureOptions(selected=DEFAULT_POKEMON_NATURE){const value=pokemonNature(selected).id;return POKEMON_NATURES.map(n=>`<option value="${n.id}" ${n.id===value?"selected":""}>${esc(n.name)} (${esc(n.en)})</option>`).join("");}
const TYPE_EN={Normal:"normal",Fogo:"fire",Água:"water",Elétrico:"electric",Grama:"grass",Gelo:"ice",Lutador:"fighting",Veneno:"poison",Terrestre:"ground",Voador:"flying",Psíquico:"psychic",Inseto:"bug",Pedra:"rock",Fantasma:"ghost",Dragão:"dragon",Sombrio:"dark",Aço:"steel",Fada:"fairy"};
const TYPE_EFFECT={
 normal:{Pedra:.5,Fantasma:0,Aço:.5},Fogo:{Fogo:.5,Água:.5,Grama:2,Gelo:2,Inseto:2,Pedra:.5,Dragão:.5,Aço:2},Água:{Fogo:2,Água:.5,Grama:.5,Terrestre:2,Pedra:2,Dragão:.5},Elétrico:{Água:2,Elétrico:.5,Grama:.5,Terrestre:0,Voador:2,Dragão:.5},Grama:{Fogo:.5,Água:2,Grama:.5,Veneno:.5,Terrestre:2,Voador:.5,Inseto:.5,Pedra:2,Dragão:.5,Aço:.5},Gelo:{Fogo:.5,Água:.5,Grama:2,Gelo:.5,Lutador:2,Terrestre:2,Voador:2,Pedra:2,Dragão:2,Aço:.5},Lutador:{Normal:2,Gelo:2,Veneno:.5,Voador:.5,Psíquico:.5,Inseto:.5,Pedra:2,Fantasma:0,Fada:.5},Veneno:{Grama:2,Veneno:.5,Terrestre:.5,Pedra:.5,Fantasma:.5,Aço:0,Fada:2},Terrestre:{Fogo:2,Elétrico:2,Grama:.5,Veneno:2,Voador:0,Inseto:.5,Pedra:2,Aço:2},Voador:{Elétrico:.5,Grama:2,Lutador:2,Veneno:.5,Inseto:2,Pedra:.5,Aço:.5},Psíquico:{Lutador:2,Veneno:2,Psíquico:.5,Aço:.5,Sombrio:0},Inseto:{Fogo:.5,Grama:2,Lutador:.5,Veneno:.5,Voador:.5,Psíquico:2,Fantasma:.5,Sombrio:2,Aço:.5,Fada:.5},Pedra:{Fogo:2,Gelo:2,Lutador:.5,Terrestre:.5,Voador:2,Inseto:2,Aço:.5},Fantasma:{Normal:0,Psíquico:2,Fantasma:2,Sombrio:.5},Dragão:{Dragão:2,Aço:.5,Fada:0},Sombrio:{Lutador:.5,Psíquico:2,Fantasma:2,Sombrio:.5,Fada:.5},Aço:{Fogo:.5,Água:.5,Elétrico:.5,Grama:.5,Gelo:2,Lutador:2,Terrrestre:2,Voador:.5,Psíquico:.5,Inseto:.5,Pedra:2,Dragão:.5,Aço:.5,Fada:2},Fada:{Fogo:.5,Lutador:2,Veneno:.5,Dragão:2,Sombrio:2,Aço:.5}
};
TYPE_EFFECT.Aço.Terrestre=2;
function typeOptionsHtml(selected=[]){const set=new Set((selected||[]).map(x=>norm(x)));return POKEMON_TYPES.map(x=>`<label class="type-choice ${typeClass(x)}"><input type="checkbox" value="${esc(x)}" ${set.has(norm(x))?"checked":""}><span>${x}</span></label>`).join("")}
function calcTypeRelations(typeText){const defs=String(typeText||"").split(/\s*\/\s*|,\s*/).map(x=>x.trim()).filter(Boolean);const vuln=[],res=[];POKEMON_TYPES.forEach(atk=>{let mult=1;defs.forEach(def=>{const row=TYPE_EFFECT[atk]||{};mult*=row[def]??1});if(mult>1)vuln.push(atk);if(mult<1)res.push(atk)});return {vulnerabilidades:vuln,resistencia:res};}
function selectedTypes(selector){return $$(selector+" input:checked").map(i=>i.value)}
const DND_ATTRIBUTES=[["forca","FOR"],["destreza","DES"],["constituicao","CON"],["inteligencia","INT"],["sabedoria","SAB"],["carisma","CAR"]];
const DND_SKILLS=[
 ["acrobacia","Acrobacia","destreza"],["adestrar_animais","Adestrar Animais","sabedoria"],["arcanismo","Arcanismo","inteligencia"],
 ["atletismo","Atletismo","forca"],["atuacao","Atuação","carisma"],["enganacao","Enganação","carisma"],
 ["furtividade","Furtividade","destreza"],["historia","História","inteligencia"],["intuicao","Intuição","sabedoria"],
 ["intimidacao","Intimidação","carisma"],["investigacao","Investigação","inteligencia"],["medicina","Medicina","sabedoria"],
 ["natureza","Natureza","inteligencia"],["percepcao","Percepção","sabedoria"],["persuasao","Persuasão","carisma"],
 ["prestidigitacao","Prestidigitação","destreza"],["religiao","Religião","inteligencia"],["sobrevivencia","Sobrevivência","sabedoria"]
];
const DND_SKILL_MAP=Object.fromEntries(DND_SKILLS.map(([key,name,attr])=>[key,{key,name,attr}]));
function proficiencyBonus(level=1){return 2+Math.floor((Math.max(1,Number(level)||1)-1)/4)}
function normalizeSkills(s={}){return Object.fromEntries(DND_SKILLS.map(([k])=>[k,!!(s?.[k]?.proficiente ?? s?.[k])]))}
function skillModifier(skillKey,attrs,level=1){const sk=DND_SKILL_MAP[skillKey];if(!sk)return 0;const base=abilityModifier(attrs?.[sk.attr]);return base+(normalizeSkills(currentSkillSource||{})[skillKey]?proficiencyBonus(level):0)}
let currentSkillSource=null;
function skillsHtml(p,level=1){const attrs=normalizePokemonStats(p.status||{}),skills=normalizeSkills(p.pericias||{}),pb=Math.max(0,Number(p.bonusProficiencia ?? proficiencyBonus(level))||0);const proficient=DND_SKILLS.filter(([k])=>skills[k]);if(!proficient.length)return `<div class="attribute-section skills-section"><div class="section-kicker">Perícias</div><p class="muted">Nenhuma perícia com proficiência.</p></div>`;return `<div class="attribute-section skills-section"><div class="section-kicker">Perícias • Bônus de Proficiência +${pb}</div><div class="skills-grid">${proficient.map(([k,name,attr])=>{const mod=abilityModifier(attrs[attr])+pb;return `<div class="skill-card proficient"><span class="skill-dot">●</span><div><strong>${name}</strong><small>${statLabel(attr)} • Proficiência</small></div><b>${mod>=0?'+':''}${mod}</b></div>`}).join('')}</div></div>`}
function skillsEditorHtml(p){const skills=normalizeSkills(p.pericias||{});return `<div class="skills-editor"><p class="field-help">Marque as perícias em que este Pokémon possui proficiência. O bônus é calculado automaticamente conforme o nível e o atributo relacionado.</p><div class="skills-edit-grid">${DND_SKILLS.map(([k,name,attr])=>`<label class="skill-edit"><input type="checkbox" class="pokemon-skill" data-skill="${k}" ${skills[k]?'checked':''}><span><strong>${name}</strong><small>${statLabel(attr)}</small></span></label>`).join('')}</div></div>`}
function collectSkills(){return Object.fromEntries(DND_SKILLS.map(([k])=>[k,{proficiente:!!$(`.pokemon-skill[data-skill="${k}"]`)?.checked}]))}
function abilityModifier(score){const n=Math.max(1,Math.min(30,Number(score)||10));return Math.floor((n-10)/2)}
function modifierText(score){const m=abilityModifier(score);return m>=0?`+${m}`:String(m)}
function statLabel(k){const found=DND_ATTRIBUTES.find(([key])=>key===k);return found?.[1]||String(k).replace(/_/g," ").replace(/\\b\\w/g,c=>c.toUpperCase())}
function normalizePokemonStats(s={}){
 const old={ataque:s.ataque,defesa:s.defesa,velocidade:s.velocidade,ataque_especial:s.ataque_especial,defesa_especial:s.defesa_especial};
 const convert=v=>Math.max(3,Math.min(18,Math.round(10+(Number(v||50)-50)/10)));
 if(DND_ATTRIBUTES.every(([k])=>s?.[k]!==undefined)) return Object.fromEntries(DND_ATTRIBUTES.map(([k])=>[k,Math.max(1,Math.min(30,Number(s[k])||10))]));
 const vals=Object.values(old).filter(v=>Number.isFinite(Number(v))).map(Number);
 const avg=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):50;
 return {forca:convert(old.ataque),destreza:convert(old.velocidade),constituicao:convert(old.defesa),inteligencia:convert(old.ataque_especial),sabedoria:convert(old.defesa_especial),carisma:convert(avg)};
}
function statsHtml(s){const attrs=normalizePokemonStats(s);return `<div class="attribute-grid">${DND_ATTRIBUTES.map(([k,label])=>{const v=attrs[k];return `<div class="attribute-card"><span>${label}</span><strong>${v} <small>(${modifierText(v)})</small></strong><div class="attribute-track"><i style="width:${Math.min(100,Math.max(0,(Number(v)||0)/18*100))}%"></i></div></div>`}).join("")}</div>`}
function moveOptionsHtml(selectedId=""){
 return moves.map(m=>`<option value="${esc(m.id)}" ${String(m.id)===String(selectedId)?"selected":""}>${esc(m.nomeOriginal)} — ${esc(m.nome)} • ${esc(m.tipo)} • PP ${m.pp}</option>`).join("");
}
function moveById(id){const m=moves.find(m=>String(m.id)===String(id));if(!m)return null;const o=state.moveOverrides?.[String(m.id)]||{};if(o.nome!==undefined)m.nome=String(o.nome);if(o.nomeOriginal!==undefined)m.nomeOriginal=String(o.nomeOriginal);if(o.tipo!==undefined)m.tipo=String(o.tipo);if(o.pp!==undefined)m.pp=Math.max(0,Number(o.pp)||0);if(Object.prototype.hasOwnProperty.call(state.moveDescriptions||{},String(m.id)))m.descricao=String(state.moveDescriptions[String(m.id)]||"");return m;}
function moveDescription(m){return String(state.moveDescriptions?.[String(m?.id)] ?? m?.descricao ?? "");}
function ensureMoveForAttack(a){
 const key=norm(a?.nomeOriginal||a?.nome);
 if(!key)return null;
 let m=a?.moveId?moveById(a.moveId):null;
 if(!m)m=moves.find(x=>norm(x.nomeOriginal)===key||norm(x.nome)===key)||null;
 if(!m){
   const base="custom-"+key.replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
   let id=base||("custom-"+Date.now()); let n=2;
   while(moves.some(x=>String(x.id)===id))id=`${base}-${n++}`;
   m={id,nome:a.nomeOriginal||a.nome,nomeOriginal:a.nomeOriginal||a.nome,tipo:a.tipo||"Normal",pp:Math.max(0,Number(a.pp)||10),descricao:a.descricao||""};
   moves.push(m);
 }
 a.moveId=m.id; a.nome=m.nome; a.nomeOriginal=m.nomeOriginal; a.tipo=m.tipo; a.pp=Number(m.pp)||0; a.ppMax=Number(m.pp)||0; a.ppAtual=Math.min(Number(a.ppAtual??m.pp)||Number(m.pp)||0,Number(m.pp)||0); a.descricao=moveDescription(m)||a.descricao||"";
 return m;
}
function attacksEditorHtml(attacks=[]){return `<div class="attack-builder" id="attackBuilder">${(attacks||[]).map((a,i)=>attackRowHtml(a,i)).join("")}</div><button type="button" class="btn" id="addAttack">+ Adicionar ataque</button>`}
function attackRowHtml(a={},i=0){const move=moveById(a.moveId)||moves.find(m=>norm(m.nome)===norm(a.nome||""));const mid=move?.id||a.moveId||"";return `<div class="attack-card" data-attack-row="${i}"><div class="attack-card-head"><strong>Ataque ${i+1}</strong><button type="button" class="btn danger small" data-remove-attack="${i}">Remover</button></div><div class="attack-fields"><div class="field"><label>Nível</label><input class="input attack-level" type="number" min="1" max="100" value="${Number(a.nivel)||1}"></div><div class="field attack-name-field" style="grid-column:span 2"><label>Ataque cadastrado</label><select class="select attack-move">${moveOptionsHtml(mid)}</select></div><div class="field"><label>PP</label><input class="input attack-pp" type="number" value="${Number(move?.pp||a.pp)||0}" readonly></div></div><div class="attack-selected-info"><span class="tag type-tag ${typeClass(move?.tipo||a.tipo||"Normal")}">${esc(move?.tipo||a.tipo||"—")}</span><strong>${esc(move?.nomeOriginal||a.nome||"Nenhum Move selecionado")}</strong><span>PP: ${Number(move?.pp||a.pp)||0}</span></div></div>`}
function collectAttacks(){return $$("#attackBuilder [data-attack-row]").map(row=>{const move=moveById($(".attack-move",row).value);return {nivel:Math.max(1,Number($(".attack-level",row).value)||1),moveId:move?.id||"",nome:move?.nome||"",nomeOriginal:move?.nomeOriginal||"",tipo:move?.tipo||"",pp:Number(move?.pp)||0,ppMax:Number(move?.pp)||0,ppAtual:Number(move?.pp)||0,dano:0,descricao:moveDescription(move)}}).filter(a=>a.moveId)}
function normalizeAbilities(p){p.habilidades=Array.isArray(p?.habilidades)?p.habilidades.slice(0,2):[];while(p.habilidades.length<2)p.habilidades.push({nome:"",descricao:""});p.habilidades=p.habilidades.map(a=>({nome:String(a?.nome||""),descricao:String(a?.descricao||"")}));return p.habilidades}
function abilitiesEditorHtml(p){const abilities=normalizeAbilities(p);return `<div class="abilities-builder">${abilities.map((a,i)=>`<div class="ability-card"><div class="ability-card-head"><strong>Habilidade ${i+1}</strong></div><div class="field"><label>Nome</label><input class="input ability-name" data-ability-index="${i}" value="${esc(a.nome)}" placeholder="Ex.: Intimidar"></div><div class="field"><label>Descrição</label><textarea class="textarea ability-description" data-ability-index="${i}" placeholder="Descreva o efeito da habilidade...">${esc(a.descricao)}</textarea></div></div>`).join("")}</div>`}
function collectAbilities(){return [0,1].map(i=>({nome:$(`.ability-name[data-ability-index="${i}"]`)?.value.trim()||"",descricao:$(`.ability-description[data-ability-index="${i}"]`)?.value.trim()||""}))}
function selectedAbilityIndexes(a){return Array.isArray(a?.abilityIndexes)?a.abilityIndexes.map(Number).filter(x=>x===0||x===1).slice(0,2):[]}
function abilitiesHtml(p,a){const indexes=selectedAbilityIndexes(a);const abilities=normalizeAbilities(p);const chosen=indexes.map(i=>abilities[i]).filter(x=>x?.nome);return chosen.length?`<div class="abilities-section"><div class="section-kicker">Habilidades</div><div class="abilities-list">${chosen.map(x=>`<div class="ability-view"><strong>${esc(x.nome)}</strong><p>${esc(x.descricao||"Sem descrição.")}</p></div>`).join("")}</div>`:`<div class="abilities-section"><div class="section-kicker">Habilidades</div><span class="muted">Nenhuma habilidade atribuída.</span></div>`}
function bindAttackBuilder(){const builder=$("#attackBuilder");if(!builder)return;const refresh=()=>{$$('[data-attack-row]',builder).forEach(row=>{const move=moveById($(".attack-move",row)?.value);if(!move)return;$(".attack-pp",row).value=move.pp;const info=$(".attack-selected-info",row);if(info)info.innerHTML=`<span class="tag type-tag ${typeClass(move.tipo)}">${esc(move.tipo)}</span><strong>${esc(move.nomeOriginal)}</strong><span>PP: ${move.pp}</span>`})};$$('.attack-move',builder).forEach(x=>x.onchange=refresh);$("#addAttack").onclick=()=>{builder.insertAdjacentHTML("beforeend",attackRowHtml({},builder.children.length));bindAttackBuilder()};$$('[data-remove-attack]',builder).forEach(b=>b.onclick=()=>{b.closest('[data-attack-row]').remove();$$('[data-attack-row]',builder).forEach((r,i)=>{r.dataset.attackRow=i;$(".attack-card-head strong",r).textContent=`Ataque ${i+1}`})});refresh()}


const pokemonById=id=>pokemons.find(p=>Number(p.id)===Number(id));
function evolutionPairs(){return {
1:2,2:3,4:5,5:6,7:8,8:9,10:11,11:12,13:14,14:15,16:17,17:18,19:20,21:22,23:24,25:26,27:28,29:30,30:31,32:33,33:34,35:36,37:38,39:40,41:42,43:44,44:45,46:47,48:49,50:51,52:53,54:55,56:57,58:59,60:61,61:62,63:64,64:65,66:67,67:68,69:70,70:71,72:73,74:75,75:76,77:78,79:80,81:82,83:null,84:85,86:87,88:89,90:91,92:93,93:94,95:null,96:97,98:99,100:101,102:103,104:105,109:110,111:112,116:117,117:null,118:119,120:121,123:null,125:null,126:null,129:130,133:null,137:null,138:139,140:141,147:148,148:149};}
const EVOLUTION_PARENT={2:1,3:2,5:4,6:5,8:7,9:8,11:10,12:11,14:13,15:14,17:16,18:17,20:19,22:21,24:23,26:25,28:27,30:29,31:30,33:32,34:33,36:35,38:37,40:39,42:41,45:44,47:46,49:48,51:50,53:52,55:54,57:56,59:58,61:60,62:61,64:63,65:64,67:66,68:67,70:69,71:70,73:72,75:74,76:75,78:77,80:79,82:81,85:84,87:86,89:88,91:90,93:92,94:93,97:96,99:98,101:100,103:102,105:104,110:109,112:111,117:116,119:118,121:120,130:129,139:138,141:140,148:147,149:148};
const BRANCH_PARENTS={134:133,135:133,136:133};
function nextEvolutions(pid){const id=Number(pid);return pokemons.filter(p=>Number(p.evolvesFromId)===id);}
function applyKnownEvolutionStructure(){
 const pairs=evolutionPairs();
 pokemons.forEach(p=>{const id=Number(p.id);if(EVOLUTION_PARENT[id]||BRANCH_PARENTS[id])p.evolvesFromId=Number(EVOLUTION_PARENT[id]||BRANCH_PARENTS[id]);else if(p.evolvesFromId==null)p.evolvesFromId=null;p.evolutionType=p.evolvesFromId?'evolution':'basic';});
 Object.entries(pairs).forEach(([a,b])=>{if(b==null)return;const child=pokemonById(Number(b));if(child&&!child.evolvesFromId)child.evolvesFromId=Number(a);});
 // Corrige famílias especiais e ramificações conhecidas da 1ª geração.
 const special={26:25,28:27,31:29,34:32,36:35,38:37,40:39,45:44,53:52,55:54,57:56,59:58,62:61,65:64,68:67,71:70,73:72,76:75,78:77,80:79,82:81,85:84,87:86,89:88,91:90,97:96,99:98,101:100,103:102,105:104,110:109,112:111,119:118,121:120,130:129,139:138,141:140,149:148};
 Object.entries(special).forEach(([c,parent])=>{const x=pokemonById(c);if(x)x.evolvesFromId=Number(parent)});
 pokemons.forEach(p=>{p.evolutionType=p.evolvesFromId?'evolution':'basic';let stage=1,cur=p;const seen=new Set();while(cur?.evolvesFromId&& !seen.has(Number(cur.id))){seen.add(Number(cur.id));cur=pokemonById(cur.evolvesFromId);stage++;}p.evolutionStage=stage;});
}
function migrate(){state.master??={...DEFAULT.master};state.master.user??="mestre";state.master.pass??="king";if(Number(state.masterPasswordVersion||0)<1 && state.master.pass==="1234"){state.master.pass="king";state.masterPasswordVersion=1;}else if(Number(state.masterPasswordVersion||0)<1){state.masterPasswordVersion=1;}state.trainers??=[];state.dex??={};state.notes??=[];state.encounter??=DEFAULT.encounter;state.pokemonCatalog??=null;
state.trainers.forEach(t=>{t.username??=norm(t.name).replace(/\s+/g,"")||("jogador"+String(t.id).slice(0,4));t.password??="1234";t.captured??=[];t.visible??=[];t.team??=[];t.pc??=[];normalizeTrainerStorage(t);t.pokemonNotes??={};t.pendingEvolutionEvents??=[];[...t.team,...t.pc].forEach(a=>{a.pokemonId=Number(a.pokemonId);a.level=Number(a.level)||1;a.natureza=pokemonNature(a.natureza).id;a.status="captured";const pp=pokemonById(a.pokemonId);a.currentHp=Number.isFinite(Number(a.currentHp))?Math.max(0,Number(a.currentHp)):Number(pp?.hp)||0;if(!t.visible.includes(a.pokemonId))t.visible.push(a.pokemonId)});t.captured=[...new Set([...t.team,...t.pc].map(a=>Number(a.pokemonId)))] ;t.visible=[...new Set(t.visible.map(Number))];[...t.team,...t.pc].forEach(a=>{a.abilityIndexes=Array.isArray(a.abilityIndexes)?a.abilityIndexes.map(Number).filter(x=>x===0||x===1).slice(0,2):[]});});save()}
migrate();

function nav(page){$$(".page").forEach(x=>x.classList.toggle("active",x.id==="page-"+page));$$("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));history.replaceState(null,"","#"+page);if(page==="team"&&!isMaster())setTimeout(()=>playNextEvolution(),180)}
function setupNav(){
 const master=session?.role==="master";
 const items=master?[["dashboard","🏠 Visão geral"],["pokedex","📖 Pokédex"],["moves","⚔️ Ataques"],["encounter","⚔️ Batalha"],["trainers","👥 Jogadores"],["notes","📝 Notas"],["settings","⚙️ Configurações"]]: [["dashboard","🏠 Início"],["pokedex","📖 Minha Pokédex"],["team","🎒 Meu Time"],["pc","💻 Meu PC"]];
 $("#desktopNav").innerHTML=items.map(x=>`<button data-page="${x[0]}">${x[1]}</button>`).join("");
 $("#mobileNav").innerHTML=items.map(x=>`<button data-page="${x[0]}">${x[1].split(" ")[0]}<br>${x[1].split(" ").slice(1).join(" ")}</button>`).join("");
 $$("[data-page]").forEach(b=>b.onclick=()=>nav(b.dataset.page));
}
function loginUI(){
 $("#playerSelect").innerHTML=state.trainers.map(t=>`<option value="${t.id}">${esc(t.name)} (@${esc(t.username)})</option>`).join("")||`<option value="">Nenhum jogador criado</option>`;
}
$$("[data-login-role]").forEach(b=>b.onclick=()=>{ $$("[data-login-role]").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#masterLogin").classList.toggle("hidden",b.dataset.loginRole!=="master");$("#playerLogin").classList.toggle("hidden",b.dataset.loginRole!=="player");$("#loginError").textContent=""});
function start(role,id=null){session={role,trainerId:id};$("#loginScreen").classList.add("hidden");$("#app").classList.remove("hidden");$("#roleLabel").textContent=role==="master"?"Painel do Mestre":`Jogador: ${state.trainers.find(t=>t.id===id)?.name||""}`;setupNav();renderAll();nav("dashboard")}
$("#masterLoginBtn").onclick=()=>{if($("#masterUser").value===state.master.user&&$("#masterPass").value===state.master.pass)start("master");else $("#loginError").textContent="Usuário ou senha do Mestre inválidos."};
$("#playerLoginBtn").onclick=()=>{const t=state.trainers.find(x=>x.id===$("#playerSelect").value);if(t&&$("#playerPass").value===t.password)start("player",t.id);else $("#loginError").textContent="Jogador ou senha inválidos."};
$("#logout").onclick=()=>{session=null;$("#app").classList.add("hidden");$("#loginScreen").classList.remove("hidden");$("#masterPass").value="";$("#playerPass").value="";loginUI()};
function isMaster(){return session?.role==="master"} function me(){return state.trainers.find(t=>t.id===session?.trainerId)}
function getAssignment(t,pid){
 const id=Number(pid);
 if(!t||!Number.isFinite(id))return null;
 // O Pokémon pode estar em apenas um dos dois locais. Procuramos sempre no
 // estado atual, inclusive imediatamente depois de uma troca.
 const teamHit=Array.isArray(t.team)?t.team.find(a=>Number(a.pokemonId)===id):null;
 if(teamHit)return teamHit;
 const pcHit=Array.isArray(t.pc)?t.pc.find(a=>Number(a.pokemonId)===id):null;
 return pcHit||null;
}
function openAssignedPokemon(id){
 const t=me();
 const p=pokemonById(Number(id));
 if(!t||!p)return;
 // Reconstrói a lista capturada a partir da localização atual antes de abrir a ficha.
 normalizeTrainerStorage(t);
 const assignment=getAssignment(t,p.id);
 if(!assignment){
   console.warn("TrainerDex: Pokémon sem assignment ao tentar abrir a ficha",p.id);
   return toast("Não foi possível localizar este Pokémon. Atualize a página e tente novamente.");
 }
 openPokemonPlayer(p);
}
function normalizeTrainerStorage(t){
 t.pc??=[];
 t.team??=[];
 t.captured??=[];
 const normalizeList=list=>(Array.isArray(list)?list:[]).map(x=>typeof x==="object"?x:{pokemonId:Number(x),level:1,status:"captured"});
 t.team=normalizeList(t.team).filter(a=>a.status==="captured");
 t.pc=normalizeList(t.pc).filter(a=>a.status==="captured");
 const assigned=new Set([...t.team,...t.pc].map(a=>Number(a.pokemonId)));
 // Qualquer capturado antigo sem assignment vai para o PC, sem ultrapassar o limite do time.
 (Array.isArray(t.captured)?t.captured:[]).map(Number).filter(Boolean).forEach(id=>{
   if(!assigned.has(id)){t.pc.push({pokemonId:id,level:1,status:"captured"});assigned.add(id);}
 });
 while(t.team.length>6)t.pc.push(t.team.pop());
 t.captured=[...new Set([...t.team,...t.pc].map(a=>Number(a.pokemonId)).filter(Boolean))];
 t.team.forEach(a=>a.status="captured");
 t.pc.forEach(a=>a.status="captured");
}
function getPokemonNote(t,pid){return t?.pokemonNotes?.[String(pid)]||""}
const LIFE_DICE=[4,6,8,10,12,20];
function normalizeLifeDice(v){const n=Number(v);return LIFE_DICE.includes(n)?n:10}
function hpMaxForLevel(p,level=1){const base=Math.max(1,Number(p?.hp)||1),die=normalizeLifeDice(p?.dadoVida);return base+(Math.max(1,Number(level)||1)-1)*die}
function hpData(a,p){const max=hpMaxForLevel(p,a?.level||1);const current=Math.max(0,Math.min(max,Number(a?.currentHp??max)));return {max,current,pct:Math.round(current/max*100)}}
function getStatusForPlayer(p,t){const a=getAssignment(t,p.id);if(t?.captured?.includes(Number(p.id))||a?.status==="captured")return"caught";if(t?.visible?.includes(Number(p.id))||a?.status==="seen")return"seen";return"hidden"}
function playerLevel(p,t){return Number(getAssignment(t,p.id)?.level)||1}

function renderDashboard(){
 const t=me(), master=isMaster();
 $("#campaignSubtitle").textContent=master?state.campaign.name:`Olá, ${t?.name||"Jogador"}!`;
 $("#statTrainers").textContent=master?state.trainers.length:1;
 $("#statPokemon").textContent=master?state.trainers.reduce((n,x)=>n+x.captured.length,0):(t?.captured.length||0);
 $("#statVisible").textContent=master?state.trainers.reduce((n,x)=>n+x.visible.length,0):(t?.visible.length||0);
 $("#statNotes").textContent=master?state.notes.length:0;
 $("#statPokemonLabel").textContent=master?"Capturas registradas":"Pokémon capturados";
 const box=$("#dashboardTrainers");
 box.innerHTML=master?(state.trainers.length?state.trainers.map(x=>`<div class="row"><div class="row-main"><strong>${esc(x.name)}</strong><small>@${esc(x.username)} • ${x.captured.length} capturados • ${x.visible.length} visíveis</small></div><span>👤</span></div>`).join(""):`<div class="empty">Nenhum jogador cadastrado.</div>`):`<div class="row"><div class="row-main"><strong>${esc(t.name)}</strong><small>${t.captured.length} capturados • ${t.visible.length} visíveis na Pokédex</small></div><span>🎒</span></div>`;
 $("#dashboardShortcuts").innerHTML=master?`<button class="row btn" data-page="pokedex"><span>📖 Gerenciar Pokédex e Pokémon</span><span>→</span></button><button class="row btn" data-page="trainers"><span>👥 Gerenciar jogadores e capturas</span><span>→</span></button><button class="row btn" data-page="encounter"><span>⚔️ Controlar batalha</span><span>→</span></button><button class="row btn" data-page="notes"><span>📝 Notas</span><span>→</span></button>`:`<button class="row btn" data-page="pokedex"><span>📖 Abrir minha Pokédex</span><span>→</span></button>`;
 $$("[data-page]").forEach(b=>b.onclick=()=>nav(b.dataset.page));
}
function visiblePokemons(){return pokemons}
function renderDex(){
 const grid=$("#dexGrid");
 if(!grid)return;
 const searchEl=$("#dexSearch"), statusEl=$("#dexStatus"), typeEl=$("#dexTypeFilter");
 const t=me();
 const q=norm(searchEl?.value||"");
 const filter=statusEl?.value||"all";
 const typeFilter=typeEl?.value||"all";
 const source=Array.isArray(pokemons)?pokemons:[];
 const list=source.filter(p=>{
   const st=isMaster()?"all":getStatusForPlayer(p,t);
   const types=String(p?.tipo||"").split(/\s*\/\s*|,\s*/).map(norm).filter(Boolean);
   const matchesSearch=!q||norm(`${p?.nome||""} ${p?.numero||""} ${p?.tipo||""}`).includes(q);
   const matchesStatus=filter==="all"||st===filter;
   const matchesType=typeFilter==="all"||types.includes(norm(typeFilter));
   return matchesSearch&&matchesStatus&&matchesType;
 });
 grid.innerHTML=list.map(p=>{
   const st=isMaster()?"all":getStatusForPlayer(p,t);
   const hidden=!isMaster()&&st==="hidden";
   const level=!isMaster()?playerLevel(p,t):null;
   return `<article class="pokemon ${hidden?"dex-hidden":""}" data-id="${p.id}"><img src="${p.imagem||""}" alt="${esc(p.nome||"")}"><div><small>${esc(p.numero||"")}</small><h3>${hidden?"???":esc(p.nome||"")}</h3>${hidden?`<div class="tags"><span class="tag">Não descoberto</span></div>`:`<div class="tags">${typeTags(p.tipo)}</div>`}${isMaster()?"":`<span class="status ${st}">${st==="caught"?`Capturado • Nv. ${level}`:"Avistado"}</span>`}</div></article>`;
 }).join("")||`<div class="empty">Nenhum Pokémon encontrado.</div>`;
 $$(".pokemon",grid).forEach(c=>c.onclick=()=>{if(!c.classList.contains("dex-hidden"))openPokemon(Number(c.dataset.id))});
 const intro=$("#dexIntro");
 if(intro)intro.textContent=isMaster()?"Banco de dados da campanha. Use os filtros para localizar rapidamente os Pokémon.":"Todos os Pokémon aparecem na Pokédex. Os não descobertos ficam ocultos; avistados mostram informações básicas; capturados mostram a ficha completa e o nível definido pelo Mestre.";
 const newBtn=$("#newPokemonBtn");if(newBtn)newBtn.classList.toggle("hidden",!isMaster());
 if(typeEl){
   const oldType=typeEl.value||"all";
   typeEl.innerHTML=`<option value="all">Todos os tipos</option>`+POKEMON_TYPES.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");
   typeEl.value=POKEMON_TYPES.some(x=>norm(x)===norm(oldType))?oldType:"all";
 }
 if(statusEl)statusEl.innerHTML=isMaster()?`<option value="all">Todos</option>`:`<option value="all">Todos</option><option value="seen">Avistados</option><option value="caught">Capturados</option><option value="hidden">Não descobertos</option>`;
}
function openPokemon(id){
 const p=pokemonById(id); if(!p)return;
 if(isMaster())openPokemonMaster(p); else openPokemonPlayer(p);
}
function statText(s){return Object.entries(s||{}).map(([k,v])=>`${k}: ${v}`).join(" • ")}
function attacksHtml(p,level=null){const attacks=(p.ataques||[]).filter(a=>level==null||Number(a.nivel)<=Number(level));return attacks.map(a=>`<li class="attack-detail-item"><details><summary><strong>Nv. ${Number(a.nivel)||1} — ${esc(a.nome||a.nomeOriginal)}</strong> ${a.tipo?`<span class="tag type-tag ${typeClass(a.tipo)}">${esc(a.tipo)}</span>`:""}<span>PP ${Number(a.pp||a.ppMax)||0}</span><small>${esc(a.nomeOriginal||"")}</small></summary><div class="attack-description">${esc(a.descricao||"Sem descrição cadastrada.")}</div></details></li>`).join("")||"<li>Nenhum ataque aprendido até este nível.</li>"}
function npcAttacksForLevel(p,level){return (p?.ataques||[]).filter(a=>Number(a.nivel)<=Number(level)).sort((a,b)=>Number(a.nivel)-Number(b.nivel))}
function npcAttacksPreviewHtml(p,level){const attacks=npcAttacksForLevel(p,level);return attacks.length?`<div class="npc-attack-preview">${attacks.map(a=>`<div class="npc-attack-preview-row"><div><strong>${esc(a.nome)}</strong>${a.tipo?` <span class="tag type-tag ${typeClass(a.tipo)}">${esc(a.tipo)}</span>`:""}<small>Nv. ${Number(a.nivel)||1}</small></div><b>PP ${Number(a.ppAtual??a.pp??a.ppMax)||0}/${Number(a.ppMax||a.pp)||0}</b></div>`).join("")}</div>`:`<div class="npc-attack-empty">Nenhum ataque aprendido até o nível selecionado.</div>`}
function openPokemonPlayer(p){
 const t=me();if(!t||!p)return;normalizeTrainerStorage(t);const st=getStatusForPlayer(p,t);if(st==="hidden")return;const a=getAssignment(t,p.id);const level=a?.level||playerLevel(p,t);
 if(st==="seen"){$("#modalContent").innerHTML=`<div class="modal-head"><h2>${esc(p.nome)}</h2><button class="btn" data-close>Fechar</button></div><div class="pokemon-detail"><img src="${p.imagem}"><div><div class="muted">${esc(p.numero)}</div><div class="tags detail-types">${typeTags(p.tipo)}</div><p>${esc(p.descricao||"")}</p><p><strong>Tipo:</strong> ${esc(p.tipo||"—")}</p><span class="status seen">👁 Avistado</span></div></div>`;}
 else {const hp=hpData(a,p),note=getPokemonNote(t,p.id);$("#modalContent").innerHTML=`<div class="modal-head"><h2>${esc(p.nome)}</h2><button class="btn" data-close>Fechar</button></div><div class="pokemon-detail"><img src="${p.imagem}"><div><div class="muted">${esc(p.numero)} • Nível ${level} • HP ${hp.current}/${hp.max}</div><div class="tags detail-types"><span class="tag">Natureza: ${esc(pokemonNature(a?.natureza).name)}</span><span class="tag">SR: ${esc(p.sr||"—")}</span><span class="tag">CA: ${Number(p.ca)||0}</span><span class="tag">Dado de Vida: d${normalizeLifeDice(p.dadoVida)}</span></div><div class="health-wrap detail-health"><div class="health-label"><span>Vida</span><strong>${hp.current}/${hp.max}</strong></div><div class="health-bar"><span style="width:${hp.pct}%"></span></div></div><div class="tags detail-types">${typeTags(p.tipo)}</div><p>${esc(p.descricao||"")}</p><div class="attribute-section"><div class="section-kicker">Atributos</div>${statsHtml(p.status)}</div>${skillsHtml(p,level)}<div class="relation-block"><strong>Vulnerabilidades:</strong><div class="tags relation-tags">${typeTags((p.vulnerabilidades||[]).join(" / "))||`<span class="muted">Nenhuma</span>`}</div></div><div class="relation-block"><strong>Resistências:</strong><div class="tags relation-tags">${typeTags((p.resistencia||[]).join(" / "))||`<span class="muted">Nenhuma</span>`}</div></div>${abilitiesHtml(p,a)}<h3>Ataques atuais no nível ${level}</h3><ul class="attack-list">${attacksHtml(p,level)}</ul><span class="status caught">🎒 Capturado • Nível ${level} • ${t.team.some(x=>Number(x.pokemonId)===Number(p.id))?"No time":"No PC"}</span><div class="top-actions" style="margin-top:12px"><button class="btn" id="swapLocationAction">${t.team.some(x=>Number(x.pokemonId)===Number(p.id))?"🔄 Trocar com um Pokémon do PC":"🔄 Trocar com um Pokémon do time"}</button></div><div class="pokemon-notes"><h3>Anotações</h3><textarea class="textarea" id="pokemonNote" placeholder="Escreva uma anotação sobre este Pokémon...">${esc(note)}</textarea><small class="muted" id="noteSaved">As anotações são salvas automaticamente.</small></div></div></div>`;}
 $("#modal").classList.add("open");$("[data-close]").onclick=closeModal;
 const swapBtn=$("#swapLocationAction");if(swapBtn){swapBtn.onclick=()=>{const inPc=t.pc?.some(x=>Number(x.pokemonId)===Number(p.id));openSwapPokemon(t,p.id,!!inPc);};}
 const noteEl=$("#pokemonNote");if(noteEl){noteEl.oninput=()=>{t.pokemonNotes??={};t.pokemonNotes[String(p.id)]=noteEl.value;save();$("#noteSaved").textContent="Anotação salva.";clearTimeout(window.__noteTimer);window.__noteTimer=setTimeout(()=>{$("#noteSaved").textContent="As anotações são salvas automaticamente."},1200);}}
}
function evolutionOptions(selected){return pokemons.filter(x=>Number(x.id)!==Number(selected.id)).sort((a,b)=>Number(a.id)-Number(b.id)).map(x=>`<option value="${x.id}" ${Number(selected.evolvesFromId)===Number(x.id)?"selected":""}>${esc(x.numero)} — ${esc(x.nome)}</option>`).join("")}
function openPokemonMaster(p){
 const isEvolution=!!p.evolvesFromId;
 const parent=p.evolvesFromId?pokemonById(p.evolvesFromId):null;
 const vuln=p.vulnerabilidades||[],res=p.resistencia||[];
 $("#modalContent").innerHTML=`<div class="modal-head"><h2>Editar: ${esc(p.nome)}</h2><div><button class="btn" data-close>Fechar</button><button class="btn danger" id="deletePokemon">Excluir</button></div></div>
 <div class="pokemon-admin-grid"><div><img class="admin-image" id="previewImage" src="${p.imagem}"><label class="btn file-btn">Trocar imagem<input type="file" id="pokemonImage" accept="image/*" hidden></label></div>
 <div class="form-grid"><div class="field"><label>Número</label><input class="input" id="pkNumero" value="${esc(p.numero)}"></div><div class="field"><label>Nome</label><input class="input" id="pkNome" value="${esc(p.nome)}"></div><div class="field type-picker-field"><label>Tipo(s)</label><p class="field-help">Clique para selecionar um ou mais tipos.</p><button type="button" class="type-picker-toggle" data-picker-toggle="pkTypePicker">Selecionar tipos <span>⌄</span></button><div class="type-picker hidden" id="pkTypePicker">${typeOptionsHtml(String(p.tipo||"").split(/\s*\/\s*|,\s*/).filter(Boolean))}</div><input type="hidden" id="pkTipo" value="${esc(p.tipo)}"></div><div class="field"><label>Classificação evolutiva</label><select class="select" id="pkEvolutionType"><option value="basic" ${!isEvolution?"selected":""}>Básico</option><option value="evolution" ${isEvolution?"selected":""}>Evolução</option></select></div><div class="field hidden" id="pkParentField"><label>Evolui de</label><select class="select" id="pkParent"><option value="">Selecione o Pokémon anterior</option>${evolutionOptions(p)}</select><small class="muted">Pode ser um Pokémon básico ou uma evolução existente.</small></div><div class="field"><label>Descrição</label><textarea class="textarea" id="pkDescricao">${esc(p.descricao)}</textarea></div><div class="inline-fields"><div class="field"><label>SR (Raridade)</label><input class="input" id="pkSr" value="${esc(p.sr??"")}" placeholder="Ex.: SR"></div><div class="field"><label>CA</label><input class="input" id="pkCa" type="number" min="0" value="${Number(p.ca)||0}"></div></div><div class="field"><label>Habilidades</label><p class="field-help">Cada Pokémon possui 2 habilidades. Cadastre o nome e a descrição de cada uma.</p>${abilitiesEditorHtml(p)}</div><div class="inline-fields"><div class="field"><label>Vida padrão — Nível 1</label><input class="input" id="pkHp" type="number" min="1" value="${Math.max(1,Number(p.hp)||1)}"><small class="muted">É a vida base no nível 1.</small></div><div class="field"><label>Dado de Vida</label><select class="select" id="pkLifeDie">${LIFE_DICE.map(d=>`<option value="${d}" ${normalizeLifeDice(p.dadoVida)===d?"selected":""}>d${d}</option>`).join("")}</select><small class="muted">O valor máximo do dado é somado a cada nível.</small></div></div>
 <div class="field type-picker-field"><label>Vulnerabilidades</label><p class="field-help">Clique para selecionar os tipos aos quais este Pokémon é vulnerável.</p><button type="button" class="type-picker-toggle" data-picker-toggle="pkVulnPicker">Selecionar tipos <span>⌄</span></button><div class="type-picker hidden" id="pkVulnPicker">${typeOptionsHtml(vuln)}</div></div>
 <div class="field type-picker-field"><label>Resistências</label><p class="field-help">Clique para selecionar os tipos que este Pokémon resiste.</p><button type="button" class="type-picker-toggle" data-picker-toggle="pkResPicker">Selecionar tipos <span>⌄</span></button><div class="type-picker hidden" id="pkResPicker">${typeOptionsHtml(res)}</div></div>
 <div class="field"><label>Atributos</label><p class="field-help">Informe o valor de cada atributo. O modificador é calculado automaticamente no formato D&D: valor 13 = (+1), valor 6 = (-2).</p><div class="inline-fields attribute-editor">${DND_ATTRIBUTES.map(([k,label])=>`<div class="field"><label>${label}</label><input class="input pokemon-attr" data-attr="${k}" type="number" min="1" max="30" value="${Number(normalizePokemonStats(p.status)[k])||10}"></div>`).join("")}</div></div>
 <div class="field"><label>Perícias</label>${skillsEditorHtml(p)}</div>
 <div class="field"><label>Bônus de Proficiência</label><input class="input" id="pkBonusProf" type="number" min="0" max="20" value="${Math.max(0,Number(p.bonusProficiencia ?? proficiencyBonus(1))||0)}"><small class="muted">Defina manualmente o bônus usado nas perícias proficientes deste Pokémon.</small></div>
 <div class="field"><label>Ataques por nível</label><p class="field-help">Crie cada ataque visualmente. Defina o nível em que ele é aprendido, tipo e dano.</p>${attacksEditorHtml(p.ataques||[])}</div>
 <button class="btn primary" id="savePokemon">Salvar Pokémon</button></div></div>`;
 $("#modal").classList.add("open");$('[data-close]').onclick=closeModal;bindAttackBuilder();$$("[data-picker-toggle]").forEach(b=>{const box=$("#"+b.dataset.pickerToggle);const refresh=()=>{const vals=selectedTypes("#"+box.id+" .type-choice");b.firstChild.textContent=vals.length?`${vals.length} tipo${vals.length>1?"s":""} selecionado${vals.length>1?"s":""}`:"Selecionar tipos"};refresh();box.addEventListener("change",refresh);b.onclick=()=>{box.classList.toggle("hidden");b.classList.toggle("open");b.querySelector("span").textContent=box.classList.contains("hidden")?"⌄":"⌃"}});
 const toggleParent=()=>$("#pkParentField").classList.toggle("hidden",$("#pkEvolutionType").value!=="evolution");$("#pkEvolutionType").onchange=toggleParent;toggleParent();
 $("#pokemonImage").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$("#previewImage").src=r.result;p._newImage=r.result};r.readAsDataURL(f)};
 $("#savePokemon").onclick=()=>{try{p.numero=$("#pkNumero").value.trim();p.nome=$("#pkNome").value.trim();p.tipo=selectedTypes("#pkTypePicker .type-choice").join(" / ");if(!p.tipo)return toast("Selecione pelo menos um tipo.");p.descricao=$("#pkDescricao").value;p.sr=$("#pkSr").value.trim();p.ca=Math.max(0,Number($("#pkCa").value)||0);p.habilidades=collectAbilities();p.hp=Math.max(1,Number($("#pkHp").value)||1);p.dadoVida=normalizeLifeDice($("#pkLifeDie").value);p.vulnerabilidades=selectedTypes("#pkVulnPicker .type-choice");p.resistencia=selectedTypes("#pkResPicker .type-choice");p.status=Object.fromEntries(DND_ATTRIBUTES.map(([k])=>[k,Math.max(1,Math.min(30,Number($(`.pokemon-attr[data-attr="${k}"]`)?.value)||10))]));p.pericias=collectSkills();p.bonusProficiencia=Math.max(0,Math.min(20,Number($("#pkBonusProf").value)||0));p.ataques=collectAttacks();if((p.ataques||[]).some(a=>!a.nome))return toast("Preencha o nome dos ataques.");p.evolutionType=$("#pkEvolutionType").value;if(p.evolutionType==="evolution"){const parentId=Number($("#pkParent").value);if(!parentId)return toast("Selecione de qual Pokémon esta evolução vem.");if(parentId===Number(p.id))return toast("Um Pokémon não pode evoluir de si mesmo.");p.evolvesFromId=parentId;p.evolutionStage=(pokemonById(parentId)?.evolutionStage||1)+1}else{delete p.evolvesFromId;p.evolutionStage=1}if(p._newImage){p.imagem=p._newImage;delete p._newImage};state.pokemonCatalog=pokemons;save();closeModal();renderAll();toast("Pokémon salvo com sucesso.")}catch(e){toast("Verifique o JSON dos status.")}};
 $("#deletePokemon").onclick=()=>{
   if(!confirm(`Excluir ${p.nome}?`))return;
   const imageToRemove=p.imagem;
   pokemons=pokemons.filter(x=>x.id!==p.id);
   state.pokemonCatalog=pokemons;
   save();
   removePokemonStorageImage(imageToRemove);
   closeModal();renderDex();toast("Pokémon excluído da campanha.");
 };
}

function newPokemon(){const id=Math.max(0,...pokemons.map(x=>Number(x.id)))+1;const p={id,numero:"#"+String(id).padStart(3,"0"),nome:"Novo Pokémon",tipo:"Normal",descricao:"",imagem:"img/icons/trainerdex-home.png",hp:50,dadoVida:10,sr:"",ca:0,status:{forca:10,destreza:10,constituicao:10,inteligencia:10,sabedoria:10,carisma:10},pericias:{},bonusProficiencia:2,vulnerabilidades:[],resistencia:[],ataques:[],evolutionType:"basic",evolutionStage:1,habilidades:[{nome:"",descricao:""},{nome:"",descricao:""}]};pokemons.push(p);openPokemonMaster(p)}
$("#newPokemonBtn").onclick=newPokemon;

function renderMoves(){
 if(!isMaster())return;
 const q=norm($("#moveSearch")?.value||""); const type=$("#moveTypeFilter")?.value||"all";
 const typeEl=$("#moveTypeFilter"); if(typeEl){typeEl.innerHTML=`<option value="all">Todos os tipos</option>`+POKEMON_TYPES.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join(""); typeEl.value=POKEMON_TYPES.some(x=>norm(x)===norm(type))?type:"all";}
 const list=moves.map(m=>moveById(m.id)).filter(Boolean).filter(m=>(!q||norm(`${m.nomeOriginal} ${m.nome} ${m.tipo}`).includes(q))&&(type==="all"||norm(m.tipo)===norm(type)));
 $("#movesCount").textContent=`${list.length} de ${moves.length} Moves`;
 $("#movesGrid").innerHTML=list.map(m=>`<article class="card move-library-card">
  <div class="section-title"><div><h3>${esc(m.nomeOriginal)}</h3><p>${esc(m.nome)}</p></div><span class="tag type-tag ${typeClass(m.tipo)}">${esc(m.tipo)}</span></div>
  <div class="form-grid move-editor-grid">
   <div class="field"><label>Nome original</label><input class="input move-original-input" data-move-id="${esc(m.id)}" value="${esc(m.nomeOriginal)}"></div>
   <div class="field"><label>Nome do ataque</label><input class="input move-name-input" data-move-id="${esc(m.id)}" value="${esc(m.nome)}"></div>
   <div class="field"><label>Tipo</label><select class="select move-type-input" data-move-id="${esc(m.id)}">${POKEMON_TYPES.map(t=>`<option value="${esc(t)}" ${norm(t)===norm(m.tipo)?"selected":""}>${esc(t)}</option>`).join("")}</select></div>
   <div class="field"><label>PP máximo</label><input class="input move-pp-input" data-move-id="${esc(m.id)}" type="number" min="0" value="${Number(m.pp)||0}"></div>
   <div class="field" style="grid-column:1/-1"><label>Descrição do ataque</label><textarea class="textarea move-description-input" data-move-id="${esc(m.id)}" placeholder="Descreva o efeito, dano, condição ou regra deste ataque...">${esc(moveDescription(m))}</textarea></div>
  </div>
  <div class="move-library-meta"><span>ID interno: ${esc(m.id)}</span><span>Disponível para atribuição</span></div>
  <button class="btn primary small move-save" data-move-id="${esc(m.id)}">Salvar ataque</button>
 </article>`).join("")||`<div class="empty">Nenhum Move encontrado.</div>`;
 $$('[data-move-id].move-save').forEach(btn=>btn.onclick=()=>{
   const id=String(btn.dataset.moveId); const get=c=>document.querySelector(`.${c}[data-move-id="${CSS.escape(id)}"]`);
   const nomeOriginal=get('move-original-input')?.value.trim()||""; const nome=get('move-name-input')?.value.trim()||""; const tipo=get('move-type-input')?.value||"Normal"; const pp=Math.max(0,Number(get('move-pp-input')?.value)||0); const descricao=get('move-description-input')?.value.trim()||"";
   if(!nomeOriginal||!nome)return toast("Preencha o nome original e o nome do ataque.");
   state.moveOverrides[id]={nomeOriginal,nome,tipo,pp}; state.moveDescriptions[id]=descricao;
   const m=moves.find(x=>String(x.id)===id); if(m){m.nomeOriginal=nomeOriginal;m.nome=nome;m.tipo=tipo;m.pp=pp;m.descricao=descricao;}
   pokemons.forEach(p=>(p.ataques||[]).forEach(a=>{if(String(a.moveId)===id){a.nomeOriginal=nomeOriginal;a.nome=nome;a.tipo=tipo;a.pp=pp;a.ppMax=pp;a.ppAtual=Math.min(Number(a.ppAtual??pp)||pp,pp);a.descricao=descricao;}}));
   state.pokemonCatalog=pokemons; save(); renderMoves(); renderDex(); renderTeam(); toast("Ataque salvo com sucesso.");
 });
}

function renderTrainers(){
 if(!isMaster()){$("#trainerGrid").innerHTML=`<div class="empty">A área de jogadores é exclusiva do Mestre.</div>`;return}
 $("#trainerGrid").innerHTML=state.trainers.map(t=>`<article class="card"><div class="section-title"><div><h2>${esc(t.name)}</h2><p>@${esc(t.username)} • senha: ${esc(t.password)}</p></div><button class="btn danger small" data-del="${t.id}">Excluir</button></div><div class="permission-summary"><span>👁 ${t.visible.length} avistados</span><span>🎒 ${t.captured.length} capturados</span></div><div class="team">${[0,1,2,3,4,5].map(i=>{const a=t.team[i],p=a&&pokemonById(a.pokemonId);return p?`<button class="slot filled" data-pokemon-action="${t.id}:${p.id}"><img src="${p.imagem}"><small>${esc(p.nome)} • Nv. ${a.level||1}<br>${esc(pokemonNature(a.natureza).name)}</small></button>`:`<div class="slot"><span class="muted">Vazio</span></div>`}).join("")}</div>${(t.pc||[]).length?`<div class="field-help" style="margin-top:10px">PC: ${(t.pc||[]).map(a=>{const p=pokemonById(a.pokemonId);return p?`<button class="btn small" data-pokemon-action="${t.id}:${p.id}">${esc(p.nome)} • Nv. ${a.level||1} • ${esc(pokemonNature(a.natureza).name)}</button>`:""}).join(" ")}</div>`:""}<div class="toolbar"><button class="btn small" data-editplayer="${t.id}">Editar acesso</button><button class="btn small" data-addpoke="${t.id}">Adicionar Pokémon</button></div></article>`).join("")||`<div class="empty">Cadastre o primeiro jogador.</div>`;
 $$('[data-del]').forEach(b=>b.onclick=()=>{if(confirm("Excluir este jogador?")){state.trainers=state.trainers.filter(t=>t.id!==b.dataset.del);save();loginUI();renderTrainers();renderDashboard()}});
 $$('[data-editplayer]').forEach(b=>b.onclick=()=>editTrainer(b.dataset.editplayer));
 $$('[data-addpoke]').forEach(b=>b.onclick=()=>openTeamPicker(b.dataset.addpoke));
 $$('[data-pokemon-action]').forEach(b=>b.onclick=()=>openPokemonPlayerAdmin(b.dataset.pokemonAction));
}
function openPokemonPlayerAdmin(key){
 const [tid,pid]=key.split(":");const t=state.trainers.find(x=>x.id===tid),a=getAssignment(t,pid),p=pokemonById(pid);if(!t||!a||!p)return;
 const next=nextEvolutions(p.id);
 $("#modalContent").innerHTML=`<div class="modal-head"><h2>${esc(p.nome)}</h2><button class="btn" data-close>Fechar</button></div><p class="muted">${esc(t.name)} • Nível <strong>${a.level}</strong></p><div class="pokemon-detail compact-admin"><img src="${p.imagem}"><div><div class="tags detail-types">${typeTags(p.tipo)}</div><p>Estágio evolutivo: <strong>${p.evolutionStage||1}</strong></p>${next.length?`<div class="field"><label>Próxima evolução</label><select class="select" id="evolveTarget">${next.map(x=>`<option value="${x.id}">${esc(x.nome)} — estágio ${x.evolutionStage||((p.evolutionStage||1)+1)}</option>`).join("")}</select></div>`:`<p class="muted">Este Pokémon não possui evolução cadastrada.</p>`}<div class="field"><label>Natureza</label><select class="select" id="adminPokemonNature">${pokemonNatureOptions(a.natureza)}</select><small class="muted">Editável pelo Mestre e preservada entre Time e PC.</small></div><div class="top-actions"><button class="btn primary" id="savePokemonNature">Salvar natureza</button><button class="btn" id="levelUpAction">Subir nível</button>${next.length?`<button class="btn success" id="evolveAction">Evoluir</button>`:""}${getPokemonNote(t,p.id).trim()?`<button class="btn" id="viewPokemonNote">Ver anotações</button>`:`<button class="btn" id="viewPokemonNote">Ver anotações</button>`}</div></div></div>`;
 $("#modal").classList.add("open");$("[data-close]").onclick=closeModal;
 $("#savePokemonNature").onclick=()=>{a.natureza=pokemonNature($("#adminPokemonNature").value).id;save();closeModal();renderTrainers();renderDashboard();renderDex();renderTeam();renderPC();toast(`Natureza de ${p.nome} definida como ${pokemonNature(a.natureza).name}.`)};
 $("#levelUpAction").onclick=()=>{closeModal();openLevelUp(key)};
 if(next.length)$("#evolveAction").onclick=()=>evolvePlayerPokemon(t,a,p,Number($("#evolveTarget").value));
 $("#viewPokemonNote").onclick=()=>{const note=getPokemonNote(t,p.id);$("#modalContent").innerHTML=`<div class="modal-head"><h2>Anotações — ${esc(p.nome)}</h2><button class="btn" data-close>Fechar</button></div><p class="muted">Anotações feitas por ${esc(t.name)}.</p><div class="note-view">${note.trim()?esc(note).replace(/\n/g,"<br>"):`<span class="muted">Nenhuma anotação feita para este Pokémon.</span>`}</div>`;$("#modal").classList.add("open");$("[data-close]").onclick=closeModal};
}
function openLevelUp(key){
 const [tid,pid]=key.split(":");const t=state.trainers.find(x=>x.id===tid),a=getAssignment(t,pid),p=pokemonById(pid);if(!t||!a||!p)return;
 $("#modalContent").innerHTML=`<div class="modal-head"><h2>Subir nível — ${esc(p.nome)}</h2><button class="btn" data-close>Fechar</button></div><p class="muted">${esc(t.name)} está com este Pokémon no nível <strong>${a.level}</strong>. Escolha o novo nível.</p><div class="form-grid"><div class="field"><label>Novo nível</label><input class="input" id="levelUpValue" type="number" min="1" max="100" value="${a.level}"></div><button class="btn primary" id="confirmLevelUp">Salvar novo nível</button></div>`;
 $("#modal").classList.add("open");$("[data-close]").onclick=closeModal;
 $("#confirmLevelUp").onclick=()=>{const level=Math.max(1,Math.min(100,Number($("#levelUpValue").value)||a.level));if(level<a.level)return toast("O novo nível não pode ser menor que o atual.");const oldMax=hpMaxForLevel(p,a.level),oldCurrent=Math.max(0,Number(a.currentHp??oldMax));a.level=level;const newMax=hpMaxForLevel(p,level);const gained=Math.max(0,newMax-oldMax);a.currentHp=Math.min(newMax,oldCurrent+gained);save();closeModal();renderTrainers();renderDashboard();renderDex();renderTeam();toast(`${p.nome} agora está no nível ${level}. A vida máxima passou para ${newMax} HP.`)};
}
function evolvePlayerPokemon(t,a,current,targetId){
 const target=pokemonById(targetId);if(!target)return toast("Evolução não encontrada.");if(Number(target.evolvesFromId)!==Number(current.id))return toast("Essa evolução não pertence a este estágio.");
 const oldId=Number(current.id);const oldHp=hpData(a,current);const ratio=oldHp.max?oldHp.current/oldHp.max:1;a.pokemonId=Number(target.id);a.status="captured";a.natureza=pokemonNature(a.natureza).id;a.abilityIndexes=[];a.currentHp=Math.round(hpMaxForLevel(target,a.level)*ratio);
 if(!t.captured.includes(Number(target.id)))t.captured.push(Number(target.id));
 if(!t.visible.includes(Number(target.id)))t.visible.push(Number(target.id));
 t.pokemonNotes??={};
t.pendingEvolutionEvents??=[];
t.pendingEvolutionEvents.push({id:uid(),oldPokemonId:oldId,newPokemonId:Number(target.id),level:a.level,consumed:false});
 state.pokemonCatalog=pokemons;save();closeModal();renderTrainers();renderDashboard();renderDex();renderTeam();renderPC();toast(`${current.nome} evoluiu para ${target.nome}! O nível ${a.level} foi mantido.`);
}
function editTrainer(id){const t=state.trainers.find(x=>x.id===id);$("#modalContent").innerHTML=`<div class="modal-head"><h2>Editar acesso</h2><button class="btn" data-close>Fechar</button></div><div class="form-grid"><div class="field"><label>Nome</label><input class="input" id="trName" value="${esc(t.name)}"></div><div class="field"><label>Usuário</label><input class="input" id="trUser" value="${esc(t.username)}"></div><div class="field"><label>Senha</label><input class="input" id="trPass" value="${esc(t.password)}"></div><button class="btn primary" id="saveTrainer">Salvar</button></div>`;$("#modal").classList.add("open");$("[data-close]").onclick=closeModal;$("#saveTrainer").onclick=()=>{t.name=$("#trName").value.trim();t.username=$("#trUser").value.trim();t.password=$("#trPass").value;save();loginUI();closeModal();renderTrainers();renderDashboard();toast("Acesso atualizado.")}}
$("#addTrainer").onclick=()=>{$("#modalContent").innerHTML=`<div class="modal-head"><h2>Novo jogador</h2><button class="btn" data-close>Fechar</button></div><div class="form-grid"><div class="field"><label>Nome</label><input class="input" id="trName"></div><div class="field"><label>Usuário</label><input class="input" id="trUser"></div><div class="field"><label>Senha</label><input class="input" id="trPass" value="1234"></div><button class="btn primary" id="saveTrainer">Criar jogador</button></div>`;$("#modal").classList.add("open");$("[data-close]").onclick=closeModal;$("#saveTrainer").onclick=()=>{const name=$("#trName").value.trim(),username=$("#trUser").value.trim(),password=$("#trPass").value;if(!name||!username||!password)return toast("Preencha todos os campos.");if(state.trainers.some(t=>t.username===username))return toast("Este usuário já existe.");state.trainers.push({id:uid(),name,username,password,team:[],pc:[],captured:[],visible:[]});save();loginUI();closeModal();renderTrainers();renderDashboard();toast("Jogador criado.")}};

function openTeamPicker(tid){
 const t=state.trainers.find(x=>x.id===tid);
 $("#modalContent").innerHTML=`<div class="modal-head"><h2>Adicionar Pokémon para ${esc(t.name)}</h2><button class="btn" data-close>Fechar</button></div><p class="muted">Avistados são ilimitados e não ocupam o time. Capturados ocupam o time até completar 6; os demais vão automaticamente para o PC.</p><div class="toolbar"><input class="input" id="teamSearch" placeholder="Buscar Pokémon..."></div><div class="pokemon-grid" id="teamPicker"></div>`;
 $("#modal").classList.add("open");$("[data-close]").onclick=closeModal;
 const render=()=>$("#teamPicker").innerHTML=pokemons.filter(p=>norm(p.nome).includes(norm($("#teamSearch").value))).map(p=>{const id=Number(p.id),seen=t.visible.includes(id),caught=t.captured.includes(id);return `<button class="pokemon" data-pick="${p.id}"><img src="${p.imagem}"><div><small>${p.numero}</small><h3>${esc(p.nome)}</h3><span class="status ${caught?"caught":seen?"seen":""}">${caught?"Já capturado":seen?"Já avistado — clique para capturar":"Novo para o jogador"}</span></div></button>`}).join("")||`<div class="empty">Nenhum Pokémon encontrado.</div>`;
 $("#teamSearch").oninput=render;render();
 $$('[data-pick]').forEach(b=>b.onclick=()=>{
  const p=pokemonById(Number(b.dataset.pick)),id=Number(p.id),seen=t.visible.includes(id),caught=t.captured.includes(id);
  if(caught)return toast(`${p.nome} já está capturado por ${t.name}. Ele pode estar no time ou no PC.`);
  $("#modalContent").innerHTML=`<div class="modal-head"><h2>${seen?"Capturar":"Adicionar"} ${esc(p.nome)}</h2><button class="btn" data-close>Cancelar</button></div><p class="muted">${seen?"Este Pokémon já foi avistado. Ao capturá-lo, ele entrará no time se houver espaço; caso contrário, irá para o PC.":"Defina como o Pokémon foi descoberto pelo jogador. Avistados não ocupam o time e podem ser ilimitados. Capturados entram no time até o limite de 6; os excedentes ficam no PC."}</p><div class="form-grid"><div class="field"><label>Nível do Pokémon</label><input class="input" id="assignLevel" type="number" min="1" max="100" value="${getAssignment(t,id)?.level||1}"></div>${seen?`<input type="hidden" id="assignStatus" value="captured">`:`<div class="field"><label>Como o jogador recebeu?</label><select class="select" id="assignStatus"><option value="seen">Avistado — ilimitado e não ocupa o time</option><option value="captured">Capturado — vai para o time se houver espaço; excedentes vão para o PC</option></select></div>`}<div class="field"><label>Natureza</label><select class="select" id="assignNature">${pokemonNatureOptions(getAssignment(t,id)?.natureza)}</select><small class="muted">A natureza é individual deste Pokémon para este jogador.</small></div><div class="field ability-assignment-field"><label>Habilidades que o Pokémon terá</label><p class="field-help">Escolha nenhuma, uma ou as duas habilidades. Essa escolha fica exclusiva para este jogador.</p><div class="ability-assignment-list">${normalizeAbilities(p).map((ab,i)=>`<label class="ability-check"><input type="checkbox" class="assign-ability" value="${i}" ${selectedAbilityIndexes(getAssignment(t,id)).includes(i)?"checked":""} ${!ab.nome?"disabled":""}><span><strong>${esc(ab.nome||`Habilidade ${i+1} não cadastrada`)}</strong><small>${esc(ab.descricao||"")}</small></span></label>`).join("")}</div></div><button class="btn primary" id="confirmAssign">${seen?"Confirmar captura":"Adicionar"}</button></div>`;
  $("[data-close]").onclick=closeModal;
  $("#confirmAssign").onclick=()=>{
   const level=Math.max(1,Math.min(100,Number($("#assignLevel").value)||1)),status=$("#assignStatus").value;
   const natureza=pokemonNature($("#assignNature").value).id;
   const abilityIndexes=$$(".assign-ability:checked").map(x=>Number(x.value));
   if(abilityIndexes.length>2)return toast("Um Pokémon pode receber no máximo 2 habilidades.");
   if(!t.visible.includes(id))t.visible.push(id);
   if(status==="captured"){
    if(!t.captured.includes(id))t.captured.push(id);
    const existing=getAssignment(t,id);
    if(!existing){
      const assignment={pokemonId:id,level,status:"captured",currentHp:hpMaxForLevel(p,level),abilityIndexes,natureza};
      if(t.team.length<6)t.team.push(assignment);
      else {t.pc??=[];t.pc.push(assignment);}
    } else {
      existing.level=level;existing.status="captured";existing.abilityIndexes=abilityIndexes;existing.natureza=natureza;
    }
    normalizeTrainerStorage(t);
   }
   save();closeModal();renderTrainers();renderDashboard();renderDex();renderTeam();renderPC();
   toast(`${p.nome} ${status==="captured"?(t.team.some(a=>Number(a.pokemonId)===id)?"foi adicionado ao time.":"foi capturado e enviado para o PC."):"foi marcado como avistado. Ele não ocupa o time."}`);
  }
 })
}
function swapTeamAndPc(t,teamId,pcId){
 const ti=t.team.findIndex(a=>Number(a.pokemonId)===Number(teamId));
 const pi=t.pc.findIndex(a=>Number(a.pokemonId)===Number(pcId));
 if(ti<0||pi<0)return false;
 const tmp=t.team[ti];t.team[ti]=t.pc[pi];t.pc[pi]=tmp;
 normalizeTrainerStorage(t);save();
 return true;
}
function openSwapPokemon(t,sourceId,fromPc){
 const source=fromPc?(t.pc||[]).find(a=>Number(a.pokemonId)===Number(sourceId)):t.team.find(a=>Number(a.pokemonId)===Number(sourceId));
 if(!source)return;
 const options=fromPc?(t.team||[]):(t.pc||[]);
 if(!options.length){
   if(fromPc)return toast("Seu time está vazio. Esse Pokémon pode entrar no time.");
   return toast("Seu PC está vazio.");
 }
 $("#modalContent").innerHTML=`<div class="modal-head"><h2>${fromPc?"Enviar para o Time":"Enviar para o PC"}</h2><button class="btn" data-close>Fechar</button></div>
 <p class="muted">${fromPc?"Escolha qual Pokémon do time será trocado com este Pokémon do PC.":"Escolha qual Pokémon do PC será trocado com este Pokémon do time."}</p>
 <div class="pokemon-grid swap-grid">${options.map(a=>{const p=pokemonById(a.pokemonId);return p?`<button class="pokemon" data-swap-target="${p.id}"><img src="${p.imagem}" alt="${esc(p.nome)}"><div><h3>${esc(p.nome)}</h3><span class="team-level">Nível ${a.level}</span></div></button>`:""}).join("")}</div>`;
 $("#modal").classList.add("open");$("[data-close]").onclick=closeModal;
 $$("[data-swap-target]").forEach(b=>b.onclick=()=>{
   const targetId=Number(b.dataset.swapTarget);
   if(fromPc){
     if(swapTeamAndPc(t,targetId,sourceId)){closeModal();renderTeam();renderPC();renderDashboard();renderDex();toast(`${pokemonById(sourceId)?.nome||"Pokémon"} entrou no time.`);}
   }else{
     if(swapTeamAndPc(t,sourceId,targetId)){closeModal();renderTeam();renderPC();renderDashboard();renderDex();toast(`${pokemonById(sourceId)?.nome||"Pokémon"} foi enviado para o PC.`);}
   }
 });
}
function renderTeam(){
 if(isMaster())return;
 const t=me();if(!t)return;normalizeTrainerStorage(t);const team=t.team||[];
 const grid=$("#teamGrid");if(!grid)return;
 grid.innerHTML=team.map(a=>{const p=pokemonById(a.pokemonId);if(!p)return "";const hp=hpData(a,p);return `<article class="pokemon team-card" data-team-pokemon="${p.id}" role="button" tabindex="0"><img src="${p.imagem}" alt="${esc(p.nome)}"><div><h3>${esc(p.nome)}</h3><span class="team-level">Nível ${a.level}</span><div class="health-wrap"><div class="health-label"><span>HP</span><strong>${hp.current}/${hp.max}</strong></div><div class="health-bar"><span style="width:${hp.pct}%"></span></div></div></div></article>`}).join("")||`<div class="empty">Você ainda não possui Pokémon no seu time.</div>`;
 $("#teamIntro").textContent=`${team.length}/6 Pokémon no time. ${t.pc?.length||0} no PC.`;

}
function renderPC(){
 if(isMaster())return;
 const t=me();if(!t)return;normalizeTrainerStorage(t);const pc=t.pc||[];
 const grid=$("#pcGrid");if(!grid)return;
 grid.innerHTML=pc.map(a=>{const p=pokemonById(a.pokemonId);if(!p)return "";const hp=hpData(a,p);return `<article class="pokemon team-card pc-card" data-pc-pokemon="${p.id}" role="button" tabindex="0"><img src="${p.imagem}" alt="${esc(p.nome)}"><div><h3>${esc(p.nome)}</h3><span class="team-level">Nível ${a.level}</span><div class="health-wrap"><div class="health-label"><span>HP</span><strong>${hp.current}/${hp.max}</strong></div><div class="health-bar"><span style="width:${hp.pct}%"></span></div></div></div></article>`}).join("")||`<div class="empty">Seu PC está vazio. Pokémon capturados além dos 6 do time aparecerão aqui.</div>`;
 $("#pcIntro").textContent=`${pc.length} Pokémon armazenado${pc.length===1?"":"s"} no PC. O time pode ter no máximo 6.`;

}
function ensureEvolutionOverlay(){
 let overlay=$("#evolutionOverlay");
 if(overlay) return overlay;
 // Compatibilidade com versões antigas/cache do navegador: cria a camada caso o HTML antigo ainda esteja carregado.
 document.body.insertAdjacentHTML("beforeend",`<div class="evolution-overlay hidden" id="evolutionOverlay" aria-hidden="true"><div class="evolution-stage"><div class="evolution-glow"></div><div class="evolution-old"><img id="evolutionOldImage" src="" alt="Pokémon antes da evolução"><p id="evolutionOldName"></p></div><div class="evolution-flash"></div><div class="evolution-new"><img id="evolutionNewImage" src="" alt="Pokémon evoluído"><p>✨ Evolução concluída!</p><h2 id="evolutionNewName"></h2></div></div></div>`);
 return $("#evolutionOverlay");
}
function playNextEvolution(){
 if(window.__evolutionAnimating||isMaster())return;
 const t=me();const event=t?.pendingEvolutionEvents?.find(e=>!e.consumed);if(!event)return;
 const oldP=pokemonById(event.oldPokemonId),newP=pokemonById(event.newPokemonId);if(!oldP||!newP){event.consumed=true;save();return playNextEvolution()}
 const overlay=ensureEvolutionOverlay();
 const oldImg=$("#evolutionOldImage",overlay),oldName=$("#evolutionOldName",overlay),newImg=$("#evolutionNewImage",overlay),newName=$("#evolutionNewName",overlay);
 if(!oldImg||!oldName||!newImg||!newName){toast("Não foi possível carregar a animação de evolução.");return;}
 event.consumed=true;save();window.__evolutionAnimating=true;
 oldImg.src=oldP.imagem||"";oldName.textContent=oldP.nome;newImg.src=newP.imagem||"";newName.textContent=newP.nome;
 overlay.classList.remove("hidden","show-old","flash","show-new","fade-out");overlay.classList.add("show-old");overlay.setAttribute("aria-hidden","false");
 const finish=()=>{overlay.classList.add("fade-out");setTimeout(()=>{overlay.classList.add("hidden");overlay.classList.remove("show-old","flash","show-new","fade-out");overlay.setAttribute("aria-hidden","true");window.__evolutionAnimating=false;playNextEvolution()},550)};
 setTimeout(()=>{overlay.classList.remove("show-old");overlay.classList.add("flash")},1700);
 setTimeout(()=>{overlay.classList.remove("flash");overlay.classList.add("show-new")},2550);
 setTimeout(finish,5200);
}
/* Legacy encounter handlers removed: v14 battle module binds controls after the page is rendered. */
function renderNotes(){if(!isMaster()){return}const box=$("#notesList");box.innerHTML=state.notes.map(n=>`<article class="card"><div class="section-title"><div><h2>${esc(n.title)}</h2><p>${new Date(n.updated).toLocaleString("pt-BR")}</p></div><button class="btn danger small" data-note-del="${n.id}">Excluir</button></div><p style="white-space:pre-wrap">${esc(n.body)}</p><button class="btn small" data-note-edit="${n.id}">Editar</button></article>`).join("")||`<div class="empty">Nenhuma nota ainda.</div>`;$$("[data-note-del]").forEach(b=>b.onclick=()=>{state.notes=state.notes.filter(n=>n.id!==b.dataset.noteDel);save();renderNotes();renderDashboard()});$$("[data-note-edit]").forEach(b=>b.onclick=()=>{const n=state.notes.find(x=>x.id===b.dataset.noteEdit);openNote(n)})}
function openNote(n=null){$("#modalContent").innerHTML=`<div class="modal-head"><h2>${n?"Editar nota":"Nova nota"}</h2><button class="btn" data-close>Fechar</button></div><div class="form-grid"><div class="field"><label>Título</label><input class="input" id="noteTitle" value="${esc(n?.title||"")}"></div><div class="field"><label>Conteúdo</label><textarea class="textarea" id="noteBody">${esc(n?.body||"")}</textarea></div><button class="btn primary" id="saveNote">Salvar</button></div>`;$("#modal").classList.add("open");$("[data-close]").onclick=closeModal;$("#saveNote").onclick=()=>{const title=$("#noteTitle").value.trim();if(!title)return toast("Informe um título.");const item=n||{id:uid()};item.title=title;item.body=$("#noteBody").value;item.updated=new Date().toISOString();if(!n)state.notes.unshift(item);save();closeModal();renderNotes();renderDashboard();toast("Nota salva.")}}
$("#addNote").onclick=()=>openNote();
function openForm(title,labels,cb){$("#modalContent").innerHTML=`<div class="modal-head"><h2>${title}</h2><button class="btn" data-close>Fechar</button></div><div class="form-grid">${labels.map((l,i)=>`<div class="field"><label>${l}</label><input class="input" id="form${i}" ${i>0?'type="number"':''}></div>`).join("")}<button class="btn primary" id="formSave">Salvar</button></div>`;$("#modal").classList.add("open");$("[data-close]").onclick=closeModal;$("#formSave").onclick=()=>{cb(labels.map((_,i)=>$("#form"+i).value));if($("#modal").classList.contains("open"))closeModal()}}
function closeModal(){$("#modal").classList.remove("open")}$("#modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
// Controlador delegado para abrir Pokémon do Time e do PC.
// Os grids permanecem no DOM; apenas seus cards internos são reconstruídos.
function bindPokemonStorageCards(){
  const bindGrid=(grid)=>{
    if(!grid || grid.dataset.pokemonClickBound==='1') return;
    grid.dataset.pokemonClickBound='1';
    grid.addEventListener('click',(e)=>{
      const card=e.target?.closest?.('[data-team-pokemon],[data-pc-pokemon]');
      if(!card || !grid.contains(card)) return;
      if(e.target.closest('button,a,input,textarea,select')) return;
      const rawId=card.dataset.teamPokemon ?? card.dataset.pcPokemon;
      const id=Number(rawId);
      if(!Number.isFinite(id)) return;
      e.preventDefault();
      e.stopPropagation();
      openAssignedPokemon(id);
    });
    grid.addEventListener('keydown',(e)=>{
      if(e.key!=='Enter' && e.key!==' ') return;
      const card=e.target?.closest?.('[data-team-pokemon],[data-pc-pokemon]');
      if(!card || !grid.contains(card)) return;
      const rawId=card.dataset.teamPokemon ?? card.dataset.pcPokemon;
      const id=Number(rawId);
      if(!Number.isFinite(id)) return;
      e.preventDefault();
      e.stopPropagation();
      openAssignedPokemon(id);
    });
  };
  bindGrid(document.querySelector('#teamGrid'));
  bindGrid(document.querySelector('#pcGrid'));
}
bindPokemonStorageCards();

function renderMasterSettings(){
 if(!isMaster())return;
 const u=state.master?.user||"mestre";
 $("#masterSettingsUser").textContent=u;
 $("#masterCurrentPassword").value="";
 $("#masterNewPassword").value="";
 $("#masterConfirmPassword").value="";
 $("#masterPasswordError").textContent="";
}
function bindMasterSettings(){
 const form=$("#masterPasswordForm"); if(!form)return;
 form.onsubmit=e=>{
   e.preventDefault();
   if(!isMaster())return;
   const current=$("#masterCurrentPassword").value;
   const next=$("#masterNewPassword").value;
   const confirm=$("#masterConfirmPassword").value;
   const err=$("#masterPasswordError");
   err.textContent="";
   if(current!==state.master.pass){err.textContent="A senha atual está incorreta.";return;}
   if(next.length<4){err.textContent="A nova senha deve ter pelo menos 4 caracteres.";return;}
   if(next!==confirm){err.textContent="A confirmação da nova senha não confere.";return;}
   state.master.pass=next;
   state.masterPasswordVersion=1;
   save();
   form.reset();
   toast("Senha do Mestre alterada com sucesso.");
 };
}
function renderAll(){renderDashboard();renderDex();renderMoves();renderTrainers();renderTeam();renderPC();renderEncounter();renderNotes();renderMasterSettings();bindMasterSettings()}

/* =========================
   BATALHA v14
   ========================= */
state.encounter ??= {round:1,active:0,notes:"",combatants:[]};
state.encounter.battleActive ??= false;
state.encounter.battleId ??= null;
state.encounter.battleLog ??= [];
state.encounter.activeParticipantId ??= null;
state.encounter.combatants ??= [];

function battlePlayers(){return state.trainers.filter(t=>t)}
function battleParticipantById(id){return (state.encounter.combatants||[]).find(c=>c.id===id)}
function battlePokemonForParticipant(c){return c?.pokemonId?pokemonById(c.pokemonId):null}
function battlePlayerAssignment(c){const t=state.trainers.find(x=>x.id===c?.trainerId);return t?.team?.find(a=>Number(a.pokemonId)===Number(c?.pokemonId))||null}
function battleIsPlayerIn(){const t=me();return !!(t&&state.encounter.battleActive&&state.encounter.combatants.some(c=>c.kind==='player'&&c.trainerId===t.id))}
function battleLog(msg){state.encounter.battleLog??=[];state.encounter.battleLog.unshift({id:uid(),at:new Date().toISOString(),msg});state.encounter.battleLog=state.encounter.battleLog.slice(0,80)}
function battleSort(){
 const activeId=state.encounter.activeParticipantId;
 state.encounter.combatants.sort((a,b)=>Number(b.initiative||0)-Number(a.initiative||0));
 if(activeId&&state.encounter.combatants.some(c=>c.id===activeId))state.encounter.activeParticipantId=activeId;
 else if(state.encounter.combatants.length)state.encounter.activeParticipantId=state.encounter.combatants[0].id;
}
function battleCurrent(){return battleParticipantById(state.encounter.activeParticipantId)}
function battleNextTurn(){
 if(!state.encounter.battleActive||!state.encounter.combatants.length)return;
 const list=state.encounter.combatants;let i=list.findIndex(c=>c.id===state.encounter.activeParticipantId);if(i<0)i=0;
 i++;
 if(i>=list.length){i=0;state.encounter.round=Math.max(1,Number(state.encounter.round)||1)+1}
 state.encounter.activeParticipantId=list[i].id;
 state.encounter.active=i;
 const c=list[i];battleLog(`Turno de ${c.name}. Rodada ${state.encounter.round}.`);save();renderBattleAll();
}
function battleParticipantReady(c){return c?.kind==='npc'||!!c?.pokemonId}
function battleHpInfo(c){
 if(c?.kind==='player'){
  const t=state.trainers.find(x=>x.id===c.trainerId),a=t?.team?.find(x=>Number(x.pokemonId)===Number(c.pokemonId)),p=battlePokemonForParticipant(c);
  if(!a||!p)return {current:0,max:1,pct:0};
  const h=hpData(a,p);return h;
 }
 const max=Math.max(1,Number(c?.maxHp)||Number(battlePokemonForParticipant(c)?.hp)||1),current=Math.max(0,Math.min(max,Number(c?.currentHp??max)));return {current,max,pct:Math.round(current/max*100)};
}
function battleName(c){return c?.name||battlePokemonForParticipant(c)?.nome||"Combatente"}
function battleAvatar(c){return battlePokemonForParticipant(c)?.imagem||"img/icons/trainerdex-home.png"}
function battlePlayerAvailableTeam(t,currentId){return (t?.team||[]).filter(a=>{const p=pokemonById(a.pokemonId);return p&&Number(a.pokemonId)!==Number(currentId)&&Number(a.currentHp??p.hp)>0})}

function renderDex(){
 const t=me(),q=norm($("#dexSearch")?.value),filter=$("#dexStatus")?.value||"all",typeFilter=$("#dexTypeFilter")?.value||"all";
 const list=pokemons.filter(p=>{const st=isMaster()?"all":getStatusForPlayer(p,t);const types=String(p.tipo||"").split(/\s*\/\s*|,\s*/).map(norm);return(!q||norm(`${p.nome} ${p.numero} ${p.tipo}`).includes(q))&&(filter==="all"||st===filter)&&(typeFilter==="all"||types.includes(norm(typeFilter)))});
 $("#dexGrid").innerHTML=list.map(p=>{const st=isMaster()?"all":getStatusForPlayer(p,t),hidden=!isMaster()&&st==="hidden",level=!isMaster()?playerLevel(p,t):null;return `<article class="pokemon ${hidden?"dex-hidden":""}" data-id="${p.id}"><img src="${p.imagem}" alt="${esc(p.nome)}"><div><small>${esc(p.numero)}</small><h3>${hidden?"???":esc(p.nome)}</h3>${hidden?`<div class="tags"><span class="tag">Não descoberto</span></div>`:`<div class="tags">${typeTags(p.tipo)}</div>`}${isMaster()?"":`<span class="status ${st}">${st==="caught"?`Capturado • Nv. ${level}`:"Avistado"}</span>`}</div></article>`}).join("")||`<div class="empty">Nenhum Pokémon encontrado.</div>`;
 $$(".pokemon",grid).forEach(c=>c.onclick=()=>{if(!c.classList.contains("dex-hidden"))openPokemon(Number(c.dataset.id))});
 $("#dexIntro").textContent=isMaster()?"Banco de dados da campanha. Filtre por tipo para localizar rapidamente os Pokémon.":"Todos os Pokémon aparecem na Pokédex. Os não descobertos ficam ocultos; avistados mostram informações básicas; capturados mostram a ficha completa e o nível definido pelo Mestre.";
 $("#newPokemonBtn").classList.toggle("hidden",!isMaster());
 const oldType=$("#dexTypeFilter").value||"all";$("#dexTypeFilter").innerHTML=`<option value="all">Todos os tipos</option>`+POKEMON_TYPES.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");$("#dexTypeFilter").value=POKEMON_TYPES.some(x=>norm(x)===norm(oldType))?oldType:"all";
 $("#dexStatus").innerHTML=isMaster()?`<option value="all">Todos</option>`:`<option value="all">Todos</option><option value="seen">Avistados</option><option value="caught">Capturados</option><option value="hidden">Não descobertos</option>`;
}
$("#dexSearch").oninput=renderDex;$("#dexStatus").onchange=renderDex;$("#dexTypeFilter").onchange=renderDex;
$("#moveSearch").oninput=renderMoves;$("#moveTypeFilter").onchange=renderMoves;

function setupNav(){
 const master=session?.role==="master";const playerBattle=battleIsPlayerIn();
 const items=master?[["dashboard","🏠 Visão geral"],["pokedex","📖 Pokédex"],["moves","⚔️ Ataques"],["encounter","⚔️ Batalha"],["trainers","👥 Jogadores"],["notes","📝 Notas"],["settings","⚙️ Configurações"]]:[["dashboard","🏠 Início"],["pokedex","📖 Minha Pokédex"],["team","🎒 Meu Time"],["pc","💻 Meu PC"]].concat(playerBattle?[["encounter","⚔️ Batalha"]]:[]);
 $("#desktopNav").innerHTML=items.map(x=>`<button data-page="${x[0]}">${x[1]}</button>`).join("");$("#mobileNav").innerHTML=items.map(x=>`<button data-page="${x[0]}">${x[1].split(" ")[0]}<br>${x[1].split(" ").slice(1).join(" ")}</button>`).join("")+`<button class="mobile-logout" data-mobile-logout>🚪<br>Sair</button>`;$$('[data-page]').forEach(b=>b.onclick=()=>nav(b.dataset.page));$('[data-mobile-logout]').onclick=()=>$("#logout").click();
}
function nav(page){$$('.page').forEach(x=>x.classList.toggle('active',x.id==='page-'+page));$$('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===page));history.replaceState(null,'','#'+page);if(page==='team'&&!isMaster())setTimeout(()=>playNextEvolution(),180);if(page==='encounter')setTimeout(()=>renderBattleAll(),0)}

function openBattleStart(){
 if(!isMaster())return;
 const rows=state.trainers.map(t=>{const c=state.encounter.combatants.find(x=>x.kind==='player'&&x.trainerId===t.id);return `<label class="player-permission battle-player-pick"><input type="checkbox" class="battle-player-check" value="${t.id}" ${c?'checked':''}><span><strong>${esc(t.name)}</strong><small>${t.team.length} Pokémon no time</small></span><input class="input battle-init" data-trainer="${t.id}" type="number" min="0" value="${c?.initiative??0}" placeholder="Iniciativa"></label>`}).join("");
 $("#modalContent").innerHTML=`<div class="modal-head"><h2>Iniciar batalha</h2><button class="btn" data-close>Fechar</button></div><p class="muted">Selecione os jogadores que participarão e defina a iniciativa de cada um. O Pokémon será escolhido pelo jogador ao entrar na Batalha.</p><div class="permission-box">${rows||`<div class="empty">Nenhum jogador cadastrado.</div>`}</div><div class="field" style="margin-top:14px"><label>Nome da batalha</label><input class="input" id="battleNameInput" value="${esc(state.encounter.battleName||"Batalha Pokémon")}"></div><button class="btn primary full" id="confirmBattleStart">Iniciar batalha</button>`;
 $("#modal").classList.add("open");$('[data-close]').onclick=closeModal;
 $("#confirmBattleStart").onclick=()=>{
  const chosen=$$('.battle-player-check:checked').map(ch=>{const t=state.trainers.find(x=>String(x.id)===String(ch.value));const init=Number($(".battle-init[data-trainer='"+ch.value+"']")?.value)||0;return {id:uid(),kind:'player',trainerId:t.id,name:t.name,initiative:init,pokemonId:null,level:0,currentHp:0,maxHp:1,attrs:{}}});
  if(!chosen.length)return toast("Selecione pelo menos um jogador.");
  state.encounter={...state.encounter,battleActive:true,battleId:uid(),battleName:$("#battleNameInput").value.trim()||"Batalha Pokémon",round:1,active:0,activeParticipantId:null,combatants:chosen,notes:"",battleLog:[]};battleSort();battleLog(`Batalha "${state.encounter.battleName}" iniciada.`);save();closeModal();setupNav();renderBattleAll();nav(isMaster()?"encounter":"dashboard");toast("Batalha iniciada.");
  state.trainers.forEach(t=>{t._battleChoiceFor=state.encounter.battleId});save();
 };
}
function addNpcBattle(){
 const opts=pokemons.map(p=>`<option value="${p.id}">${esc(p.numero)} — ${esc(p.nome)}</option>`).join("");
 const base=pokemons[0];
 $("#modalContent").innerHTML=`<div class="modal-head"><h2>Adicionar Pokémon NPC</h2><button class="btn" data-close>Fechar</button></div><div class="form-grid"><div class="field"><label>Pokémon da Pokédex</label><select class="select" id="npcPokemon">${opts}</select></div><div class="inline-fields"><div class="field"><label>Nível</label><input class="input" id="npcLevel" type="number" min="1" max="100" value="${base?.nivel||1}"></div><div class="field"><label>Iniciativa</label><input class="input" id="npcInit" type="number" value="10"></div></div><div class="inline-fields"><div class="field"><label>HP máximo</label><input class="input" id="npcHp" type="number" min="1" value="${hpMaxForLevel(base,Number(base?.nivel)||1)}"></div><div class="field"><label>Nome do NPC</label><input class="input" id="npcName" value="${esc(base?.nome||"NPC")}"></div></div><div class="field"><label>Atributos</label><div class="inline-fields">${DND_ATTRIBUTES.map(([k,label])=>`<input class="input npc-attr" data-attr="${k}" type="number" min="1" max="30" placeholder="${label}" value="${Number(normalizePokemonStats(base?.status||{})[k])||10}">`).join("")}</div></div><div class="field"><div class="section-title"><div><label>Ataques do NPC</label><p class="muted">Os ataques são carregados da Pokédex conforme o nível escolhido.</p></div></div><div id="npcAttackPreview">${npcAttacksPreviewHtml(base,Number(base?.nivel)||1)}</div></div><button class="btn primary" id="saveNpcBattle">Adicionar NPC</button></div>`;
 $("#modal").classList.add("open");$('[data-close]').onclick=closeModal;
 const sync=()=>{const p=pokemonById(Number($("#npcPokemon").value));if(!p)return;const level=Math.max(1,Math.min(100,Number($("#npcLevel").value)||1));$("#npcName").value=p.nome;$("#npcHp").value=hpMaxForLevel(p,level);const npcStats=normalizePokemonStats(p.status||{});$$(".npc-attr").forEach(i=>{i.value=npcStats[i.dataset.attr]??10});$("#npcAttackPreview").innerHTML=npcAttacksPreviewHtml(p,level)};
 $("#npcPokemon").onchange=sync;$("#npcLevel").oninput=()=>{const p=pokemonById(Number($("#npcPokemon").value));if(p)$("#npcAttackPreview").innerHTML=npcAttacksPreviewHtml(p,Math.max(1,Math.min(100,Number($("#npcLevel").value)||1)))};
 $("#saveNpcBattle").onclick=()=>{const p=pokemonById(Number($("#npcPokemon").value)),level=Math.max(1,Math.min(100,Number($("#npcLevel").value)||1)),max=Math.max(1,Number($("#npcHp").value)||hpMaxForLevel(p,level));state.encounter.combatants.push({id:uid(),kind:'npc',name:$("#npcName").value.trim()||p.nome,initiative:Number($("#npcInit").value)||0,pokemonId:p.id,level,maxHp:max,currentHp:max,attrs:Object.fromEntries(DND_ATTRIBUTES.map(([k])=>[k,Math.max(1,Math.min(30,Number($(`.npc-attr[data-attr="${k}"]`)?.value)||10))])),attacks:npcAttacksForLevel(p,level)});battleSort();save();closeModal();renderBattleAll();toast(`${p.nome} entrou na batalha.`)};
}
function chooseBattlePokemon(t,c,costTurn=false){
 const available=(t.team||[]).filter(a=>{const p=pokemonById(a.pokemonId);return p&&Number(a.currentHp??p.hp)>0});
 if(!available.length)return toast("Você não possui outro Pokémon com HP para enviar à batalha.");
 const cards=available.map(a=>{const p=pokemonById(a.pokemonId),h=hpData(a,p);return `<button class="battle-choice ${Number(c.pokemonId)===Number(p.id)?"selected":""}" data-battle-pick="${p.id}"><img src="${p.imagem}"><strong>${esc(p.nome)}</strong><div class="muted">Nv. ${a.level} • HP ${h.current}/${h.max}</div></button>`}).join("");
 $("#modalContent").innerHTML=`<div class="modal-head"><h2>${costTurn?"Trocar Pokémon":"Escolher Pokémon"}</h2><button class="btn" data-close>Fechar</button></div><p class="muted">${costTurn?"A troca consome o seu turno.":"Escolha o Pokémon que participará desta batalha."}</p><div class="battle-choice-grid">${cards}</div>`;
 $("#modal").classList.add("open");$('[data-close]').onclick=closeModal;
 $$('[data-battle-pick]').forEach(b=>b.onclick=()=>{const p=pokemonById(Number(b.dataset.battlePick)),a=t.team.find(x=>Number(x.pokemonId)===Number(p.id));c.pokemonId=p.id;c.level=a.level;c.currentHp=Number(a.currentHp??hpMaxForLevel(p,a.level))||0;c.maxHp=hpMaxForLevel(p,a.level);c.name=t.name; c.attrs=p.status||{};battleLog(`${t.name} enviou ${p.nome}.`);save();closeModal();renderBattleAll();if(costTurn)battleNextTurn()});
}
function openBattleHpModal(id,mode){
 const c=battleParticipantById(id);if(!c)return;const h=battleHpInfo(c);
 const title=mode==='damage'?'Aplicar dano':'Curar Pokémon';
 const accent=mode==='damage'?'damage':'heal';
 $("#modalContent").innerHTML=`<div class="modal-head"><div><h2>${title}</h2><p class="muted">${esc(battleName(c))}</p></div><button class="btn" data-close>Fechar</button></div><div class="battle-hp-modal ${accent}"><div class="battle-hp-current"><span>HP atual</span><strong>${h.current}/${h.max}</strong></div><div class="health-bar"><span style="width:${h.pct}%"></span></div><div class="field"><label>${mode==='damage'?'Quantidade de dano':'Quantidade de cura'}</label><input class="input battle-hp-input" id="battleHpValue" type="number" min="1" value="${mode==='damage'?10:10}" autofocus></div><button class="btn ${mode==='damage'?'danger':'success'} full" id="confirmBattleHp">${mode==='damage'?'⚔️ Aplicar dano':'💚 Aplicar cura'}</button></div>`;
 $("#modal").classList.add("open");$('[data-close]').onclick=closeModal;setTimeout(()=>$("#battleHpValue")?.focus(),0);
 $("#confirmBattleHp").onclick=()=>{const val=Number($("#battleHpValue").value);if(!Number.isFinite(val)||val<=0)return toast("Informe um valor válido.");const next=Math.max(0,Math.min(h.max,mode==='damage'?h.current-val:h.current+val));if(c.kind==='player'){const t=state.trainers.find(x=>x.id===c.trainerId),a=t?.team?.find(x=>Number(x.pokemonId)===Number(c.pokemonId));if(a)a.currentHp=next}else c.currentHp=next;battleLog(`${mode==='damage'?'Dano':'Cura'} em ${battleName(c)}: ${h.current} → ${next} HP.`);save();closeModal();renderBattleAll()};
}
function adjustBattleHp(id,mode){openBattleHpModal(id,mode)}
function openNpcAttackPicker(npcId){
 const c=battleParticipantById(npcId);if(!c||c.kind!=='npc'||!isMaster())return;
 if(state.encounter.activeParticipantId!==c.id)return toast('O ataque só pode ser usado no turno deste Pokémon NPC.');
 const p=battlePokemonForParticipant(c);if(!p)return;
 const attacks=npcAttacksForLevel(p,c.level);
 if(!attacks.length)return toast('Este Pokémon NPC não possui ataques disponíveis neste nível.');
 const targets=state.encounter.combatants.filter(x=>x.id!==c.id&&battleHpInfo(x).current>0);
 if(!targets.length)return toast('Não há alvos disponíveis.');
 const cards=attacks.map((a,i)=>`<button class=\"battle-attack-card\" data-npc-attack-index=\"${i}\"><span class=\"battle-attack-top\"><strong>${esc(a.nome)}</strong>${a.tipo?`<span class=\"tag type-tag ${typeClass(a.tipo)}\">${esc(a.tipo)}</span>`:''}</span><span class=\"battle-attack-damage\">PP ${Number(a.ppAtual??a.pp??a.ppMax)||0}/${Number(a.ppMax||a.pp)||0}</span>${a.descricao?`<small>${esc(a.descricao)}</small>`:''}</button>`).join('');
 $("#modalContent").innerHTML=`<div class=\"modal-head\"><div><h2>Ataque do NPC</h2><p class=\"muted\">${esc(p.nome)} • Nível ${c.level}</p></div><button class=\"btn\" data-close>Fechar</button></div><div class=\"battle-attack-grid\">${cards}</div><div class=\"battle-target-section hidden\" id=\"battleTargetSection\"><h3>Escolha o alvo</h3><div class=\"battle-target-grid\">${targets.map(x=>{const hp=battleHpInfo(x);return `<button class=\"battle-target-card\" data-target-id=\"${x.id}\"><img src=\"${battleAvatar(x)}\"><strong>${esc(battleName(x))}</strong><small>${hp.current}/${hp.max} HP</small></button>`}).join('')}</div></div>`;
 $("#modal").classList.add('open');$('[data-close]').onclick=closeModal;
 $$('[data-npc-attack-index]').forEach(btn=>btn.onclick=()=>{const sec=$("#battleTargetSection");sec.classList.remove('hidden');sec.dataset.attackIndex=btn.dataset.npcAttackIndex;$$('[data-npc-attack-index]').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected')});
 $$('[data-target-id]').forEach(btn=>btn.onclick=()=>{const a=attacks[Number($("#battleTargetSection").dataset.attackIndex)],target=battleParticipantById(btn.dataset.targetId);if(!a||!target)return;const h=battleHpInfo(target),dmg=Math.max(0,Number(a.dano)||0),next=Math.max(0,h.current-dmg);if(target.kind==='player'){const tt=state.trainers.find(x=>x.id===target.trainerId),aa=tt?.team?.find(x=>Number(x.pokemonId)===Number(target.pokemonId));if(aa)aa.currentHp=next}else target.currentHp=next;battleLog(`${p.nome} usou ${a.nome} em ${battleName(target)}: ${h.current} → ${next} HP.`);save();closeModal();renderBattleAll();if(state.encounter.activeParticipantId===c.id)battleNextTurn()});
}
function openBattleAttackPicker(){
 const t=me(),c=state.encounter.combatants.find(x=>x.kind==='player'&&x.trainerId===t?.id);if(!c)return;const p=battlePokemonForParticipant(c);if(!p)return;
 const attacks=(p.ataques||[]).filter(a=>Number(a.nivel)<=Number(c.level));
 if(!attacks.length)return toast("Este Pokémon ainda não possui ataques disponíveis neste nível.");
 const targets=state.encounter.combatants.filter(x=>x.id!==c.id&&battleHpInfo(x).current>0);
 if(!targets.length)return toast("Não há alvos disponíveis.");
 const cards=attacks.map((a,i)=>`<button class="battle-attack-card" data-attack-index="${i}"><span class="battle-attack-top"><strong>${esc(a.nome)}</strong>${a.tipo?`<span class="tag type-tag ${typeClass(a.tipo)}">${esc(a.tipo)}</span>`:''}</span><span class="battle-attack-damage">PP ${Number(a.ppAtual??a.pp??a.ppMax)||0}/${Number(a.ppMax||a.pp)||0}</span>${a.descricao?`<small>${esc(a.descricao)}</small>`:''}</button>`).join('');
 $("#modalContent").innerHTML=`<div class="modal-head"><div><h2>Escolher ataque</h2><p class="muted">${esc(p.nome)} • Nível ${c.level}</p></div><button class="btn" data-close>Fechar</button></div><div class="battle-attack-grid">${cards}</div><div class="battle-target-section hidden" id="battleTargetSection"><h3>Escolha o alvo</h3><div class="battle-target-grid">${targets.map(x=>{const hp=battleHpInfo(x);return `<button class="battle-target-card" data-target-id="${x.id}"><img src="${battleAvatar(x)}"><strong>${esc(battleName(x))}</strong><small>${hp.current}/${hp.max} HP</small></button>`}).join('')}</div></div>`;
 $("#modal").classList.add('open');$('[data-close]').onclick=closeModal;
 $$('[data-attack-index]').forEach(btn=>btn.onclick=()=>{const a=attacks[Number(btn.dataset.attackIndex)];const sec=$("#battleTargetSection");sec.classList.remove('hidden');sec.dataset.attackIndex=btn.dataset.attackIndex;$$('[data-attack-index]').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');});
 $$('[data-target-id]').forEach(btn=>btn.onclick=()=>{const a=attacks[Number($("#battleTargetSection").dataset.attackIndex)],target=battleParticipantById(btn.dataset.targetId);if(!a||!target)return;const h=battleHpInfo(target),dmg=Math.max(0,Number(a.dano)||0),next=Math.max(0,h.current-dmg);if(target.kind==='player'){const tt=state.trainers.find(x=>x.id===target.trainerId),aa=tt?.team?.find(x=>Number(x.pokemonId)===Number(target.pokemonId));if(aa)aa.currentHp=next}else target.currentHp=next;battleLog(`${p.nome} usou ${a.nome} em ${battleName(target)}: ${h.current} → ${next} HP.`);save();closeModal();renderBattleAll();if(state.encounter.activeParticipantId===c.id)battleNextTurn();});
}

function renderBattleMaster(){
 $("#encounterNotes").closest(".card")?.classList.remove("hidden");
 const e=state.encounter;if(!isMaster())return;$("#battleStatus").textContent=e.battleActive?e.battleName||"Batalha ativa":"Nenhuma batalha ativa";$("#battleRound").textContent=e.battleActive?e.round:1;const cur=battleCurrent();$("#battleTurn").textContent=cur?battleName(cur):"—";$("#turnInfo").textContent=e.battleActive&&cur?`Rodada ${e.round} • vez de ${battleName(cur)} • iniciativa ${cur.initiative}`:"Inicie uma batalha para montar a ordem de iniciativa.";$("#encounterNotes").value=e.notes||"";
 $("#initiativeList").innerHTML=e.battleActive?(e.combatants.map(c=>{const h=battleHpInfo(c),p=battlePokemonForParticipant(c),f=h.current<=0;return `<article class="battle-combatant ${c.id===e.activeParticipantId?'active':''} ${f?'fainted':''} ${c.kind==='player'?'battle-player':'battle-npc'}"><div class="battle-head"><img class="battle-avatar" src="${battleAvatar(c)}"><div class="battle-main"><h3>${c.id===e.activeParticipantId?'▶ ':''}${esc(battleName(c))}</h3><div class="battle-meta">${c.kind==='player'?`Jogador: ${esc(state.trainers.find(t=>t.id===c.trainerId)?.name||'')} • Pokémon: <strong>${esc(p?.nome||'Aguardando escolha')}</strong>`:`NPC • Pokémon: <strong>${esc(p?.nome||'')}</strong> • Nv. ${c.level}`}${p?` • ${typeTags(p.tipo)}`:''}</div>${c.kind==='npc'&&npcAttacksForLevel(p,c.level).length?`<div class="battle-npc-attacks"><strong>⚔️ Ataques:</strong>${c.id===e.activeParticipantId&&h.current>0?npcAttacksForLevel(p,c.level).map((a,i)=>`<button class="battle-npc-attack battle-npc-attack-btn" data-npc-attack="${c.id}" data-npc-attack-index="${i}">${esc(a.nome)} · ${Number(a.dano)||0}</button>`).join(''):npcAttacksForLevel(p,c.level).map(a=>`<span class="tag battle-npc-attack">${esc(a.nome)} · ${Number(a.dano)||0}</span>`).join('')}</div>`:''}<div class="battle-hp"><div class="health-label"><span>HP</span><strong>${h.current}/${h.max}</strong></div><div class="health-bar"><span style="width:${h.pct}%"></span></div></div></div></div><div class="battle-actions"><button class="btn small" data-battle-dmg="${c.id}">Dar dano</button><button class="btn small" data-battle-heal="${c.id}">Curar</button>${c.kind==='npc'?`<button class="btn small" data-battle-editnpc="${c.id}">Editar NPC</button>`:''}${f?`<span class="status" style="color:#c33;font-weight:900">💀 0 HP</span>`:''}</div></article>`}).join('')):`<div class="battle-empty">Nenhuma batalha ativa. Clique em <strong>Iniciar batalha</strong> para selecionar os jogadores e a iniciativa.</div>`;
 const log=e.battleLog||[];const notesHtml=log.map(x=>`<p><small>${new Date(x.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small> — ${esc(x.msg)}</p>`).join('');
 const oldLog=$("#battleLog");if(oldLog)oldLog.innerHTML=notesHtml||'<p class="muted">Sem eventos ainda.</p>';else {const sec=$("#encounterNotes").closest('.card');if(sec){sec.insertAdjacentHTML('beforeend',`<div class="battle-log" id="battleLog">${notesHtml||'<p class="muted">Sem eventos ainda.</p>'}</div>`)}}
 $$("[data-battle-dmg]").forEach(b=>b.onclick=()=>adjustBattleHp(b.dataset.battleDmg,'damage'));$$("[data-battle-heal]").forEach(b=>b.onclick=()=>adjustBattleHp(b.dataset.battleHeal,'heal'));$$("[data-battle-editnpc]").forEach(b=>b.onclick=()=>editNpcBattle(b.dataset.battleEditnpc));$$("[data-npc-attack]").forEach(b=>b.onclick=()=>openNpcAttackPicker(b.dataset.npcAttack));
 $("#startBattleBtn").textContent=e.battleActive?"Reconfigurar batalha":"Iniciar batalha";$("#nextTurn").disabled=!e.battleActive||!e.combatants.length;$("#addNpcBtn").disabled=!e.battleActive;
}
function editNpcBattle(id){const c=battleParticipantById(id),p=battlePokemonForParticipant(c);if(!c)return;$("#modalContent").innerHTML=`<div class="modal-head"><h2>Editar NPC</h2><button class="btn" data-close>Fechar</button></div><div class="form-grid"><div class="field"><label>Nome</label><input class="input" id="editNpcName" value="${esc(c.name)}"></div><div class="inline-fields"><div class="field"><label>Nível</label><input class="input" id="editNpcLevel" type="number" value="${c.level}"></div><div class="field"><label>Iniciativa</label><input class="input" id="editNpcInit" type="number" value="${c.initiative}"></div></div><div class="inline-fields"><div class="field"><label>HP máximo</label><input class="input" id="editNpcHp" type="number" value="${c.maxHp}"></div><div class="field"><label>HP atual</label><input class="input" id="editNpcCurrentHp" type="number" value="${c.currentHp}"></div></div><button class="btn primary" id="saveNpcEdit">Salvar</button></div>`;$("#modal").classList.add('open');$('[data-close]').onclick=closeModal;$("#saveNpcEdit").onclick=()=>{c.name=$("#editNpcName").value.trim()||p?.nome||c.name;c.level=Number($("#editNpcLevel").value)||c.level;c.initiative=Number($("#editNpcInit").value)||0;c.maxHp=Math.max(1,Number($("#editNpcHp").value)||c.maxHp);c.currentHp=Math.max(0,Math.min(c.maxHp,Number($("#editNpcCurrentHp").value)||0));battleSort();save();closeModal();renderBattleAll()}}
function renderBattlePlayer(){
 if(isMaster())return;$("#encounterNotes").closest(".card")?.classList.add("hidden");const t=me(),c=state.encounter.combatants.find(x=>x.kind==='player'&&x.trainerId===t?.id);if(!c||!state.encounter.battleActive){$("#battleStatus").textContent="Você não está em uma batalha.";$("#turnInfo").textContent="Aguardando o Mestre iniciar uma batalha.";$("#initiativeList").innerHTML=`<div class="battle-empty">Quando o Mestre selecionar você, a Batalha aparecerá aqui.</div>`;$("#startBattleBtn").classList.add('hidden');$("#nextTurn").classList.add('hidden');$("#addNpcBtn").classList.add('hidden');$("#clearEncounter").classList.add('hidden');return}
 $("#startBattleBtn").classList.add('hidden');$("#nextTurn").classList.add('hidden');$("#addNpcBtn").classList.add('hidden');$("#clearEncounter").classList.add('hidden');const cur=battleCurrent();$("#battleStatus").textContent=state.encounter.battleName||"Batalha";$("#battleRound").textContent=state.encounter.round;$("#battleTurn").textContent=cur?battleName(cur):"—";$("#turnInfo").textContent=cur?.id===c.id?"É o seu turno.":`Vez de ${battleName(cur)}.`;
 const all=state.encounter.combatants.map(x=>{const h=battleHpInfo(x),p=battlePokemonForParticipant(x);return `<article class="battle-combatant ${x.id===state.encounter.activeParticipantId?'active':''} ${h.current<=0?'fainted':''}"><div class="battle-head"><img class="battle-avatar" src="${battleAvatar(x)}"><div class="battle-main"><h3>${esc(battleName(x))}</h3><div class="battle-meta">${x.kind==='player'?`Jogador: ${esc(state.trainers.find(t=>t.id===x.trainerId)?.name||'')} • Pokémon: ${esc(p?.nome||'Aguardando escolha')}`:`NPC • Pokémon: ${esc(p?.nome||'')} • Nv. ${x.level}`}${p?` • ${typeTags(p.tipo)}`:''}</div>${x.kind==='npc'&&npcAttacksForLevel(p,x.level).length?`<div class="battle-npc-attacks"><strong>⚔️ Ataques:</strong>${npcAttacksForLevel(p,x.level).map(a=>`<span class="tag battle-npc-attack">${esc(a.nome)} · ${Number(a.dano)||0}</span>`).join('')}</div>`:''}<div class="battle-hp"><div class="health-label"><span>HP</span><strong>${h.current}/${h.max}</strong></div><div class="health-bar"><span style="width:${h.pct}%"></span></div></div></div></div></article>`}).join('');
 const myp=battlePokemonForParticipant(c), myhp=battleHpInfo(c), forced=!myp||myhp.current<=0;const usableAttacks=(myp?.ataques||[]).filter(a=>Number(a.nivel)<=Number(c.level));const controls=forced?`<div class="permission-box"><h3>Escolha um Pokémon</h3><p class="muted">${myp?`${myp.nome} chegou a 0 HP.`:'Escolha qual Pokémon do seu time participará da batalha.'}</p><button class="btn primary" id="playerChooseBattle">Escolher Pokémon</button></div>`:`<div class="battle-player-layout"><div class="permission-box battle-active-card"><div class="section-title"><div><h3>Seu Pokémon</h3><p>${esc(myp.nome)} • Nível ${c.level}</p></div><button class="btn" id="playerSwitchBattle">Trocar Pokémon <small>(custa o turno)</small></button></div><div class="battle-hp"><div class="health-label"><span>HP</span><strong>${myhp.current}/${myhp.max}</strong></div><div class="health-bar"><span style="width:${myhp.pct}%"></span></div></div></div><div class="battle-attacks-panel"><div class="section-title"><div><h3>Ataques</h3><p>Escolha um ataque para usar no seu turno.</p></div></div><div class="battle-attack-list">${usableAttacks.map((a,i)=>`<button class="battle-attack-mini" data-player-attack="${i}"><span><strong>${esc(a.nome)}</strong>${a.tipo?`<span class="tag type-tag ${typeClass(a.tipo)}">${esc(a.tipo)}</span>`:''}</span><b>${Number(a.dano)||0}</b></button>`).join('')||`<span class="muted">Nenhum ataque disponível neste nível.</span>`}</div></div></div>`;
 $("#initiativeList").innerHTML=controls+all;$("#encounterNotes").value='';if(forced)$("#playerChooseBattle").onclick=()=>chooseBattlePokemon(t,c,false);else {$("#playerSwitchBattle").onclick=()=>{if(state.encounter.activeParticipantId!==c.id)return toast('A troca só pode ser feita no seu turno.');chooseBattlePokemon(t,c,true)};$$('[data-player-attack]').forEach(btn=>btn.onclick=()=>{if(state.encounter.activeParticipantId!==c.id)return toast('O ataque só pode ser usado no seu turno.');openBattleAttackPicker()})}
}
function renderBattleAll(){if(!$("#page-encounter"))return;if(isMaster())renderBattleMaster();else renderBattlePlayer()}
function renderEncounter(){renderBattleAll()}

// Campos da batalha para salvar notas.
$("#encounterNotes").oninput=e=>{state.encounter.notes=e.target.value;save()};
$("#startBattleBtn").onclick=()=>openBattleStart();
$("#addNpcBtn").onclick=()=>{if(!state.encounter.battleActive)return toast("Inicie uma batalha primeiro.");addNpcBattle()};
$("#nextTurn").onclick=()=>battleNextTurn();
function openEndBattleConfirm(){
 if(!isMaster()||!state.encounter.battleActive)return;
 const e=state.encounter;
 const count=(e.combatants||[]).length;
 $("#modalContent").innerHTML=`<div class="end-battle-modal">
   <div class="end-battle-icon" aria-hidden="true">🏁</div>
   <div class="modal-head"><h2>Encerrar batalha?</h2><button class="btn" data-close>Voltar</button></div>
   <p class="muted">A batalha <strong>${esc(e.battleName||"Batalha")}</strong> será encerrada para todos os participantes.</p>
   <div class="end-battle-summary"><span>⚔️ ${count} combatente${count===1?'':'s'}</span><span>🔄 Rodada ${e.round||1}</span></div>
   <div class="end-battle-warning">O registro atual de turnos e iniciativa será finalizado. Os dados dos Pokémon, jogadores e Pokédex permanecem intactos.</div>
   <div class="end-battle-actions"><button class="btn" data-close>Continuar batalha</button><button class="btn end-battle-confirm" id="confirmEndBattle"><span aria-hidden="true">🏁</span> Encerrar batalha</button></div>
 </div>`;
 $("#modal").classList.add("open");
 $("[data-close]").onclick=closeModal;
 $("#confirmEndBattle").onclick=()=>{
   state.encounter={round:1,active:0,notes:'',combatants:[],battleActive:false,battleId:null,battleLog:[],activeParticipantId:null};
   state.trainers.forEach(t=>{delete t._battleChoiceFor});
   save();closeModal();setupNav();renderAll();nav('dashboard');toast('Batalha encerrada.');
 };
}
$("#clearEncounter").onclick=openEndBattleConfirm;

// Atualização em tempo real entre abas do mesmo navegador/dispositivo.
window.addEventListener('storage',e=>{if(e.key!==KEY||!e.newValue)return;try{const incoming=JSON.parse(e.newValue);Object.keys(incoming).forEach(k=>state[k]=incoming[k]);setupNav();renderAll();}catch(err){console.warn('Falha ao sincronizar estado',err)}});

async function init(){
 try{
  const loadedFromDb=await loadStateFromSupabase();
  if(dbConfigured()) dbReady=true;
  const [r,mr]=await Promise.all([fetch("data/pokemon.json"),fetch("data/moves.json")]);const base=await r.json();moves=await mr.json();pokemons=(Array.isArray(state.pokemonCatalog)&&state.pokemonCatalog.length>=1&&state.pokemonCatalog.some(p=>p&&p.id&&p.nome))?state.pokemonCatalog:base;
 const baseById=Object.fromEntries(base.map(p=>[Number(p.id),p]));
 pokemons.forEach(p=>{const source=baseById[Number(p.id)];if(source&&Number(p._dadosFichaVersion||0)<SOURCE_DATA_VERSION){p.ca=source.ca;p.sr=source.sr;p.hp=source.hp;p.dadoVida=source.dadoVida;p.status=source.status;p.pericias=source.pericias;p.ataques=source.ataques;p._dadosFichaVersion=SOURCE_DATA_VERSION;}normalizeAbilities(p);p.hp=Math.max(1,Number(p.hp)||50);p.dadoVida=normalizeLifeDice(p.dadoVida);p.sr??="";p.ca=Math.max(0,Number(p.ca)||0);delete p.nivel;p.status=normalizePokemonStats(p.status||{});p.pericias=normalizeSkills(p.pericias||{});p.bonusProficiencia=Math.max(0,Math.min(20,Number(p.bonusProficiencia ?? proficiencyBonus(1))||0));p.vulnerabilidades??=[];p.resistencia??=[];p.ataques??=[];if((!p.vulnerabilidades||p.vulnerabilidades.length===0)&&(!p.resistencia||p.resistencia.length===0)){const rel=calcTypeRelations(p.tipo);p.vulnerabilidades=rel.vulnerabilidades;p.resistencia=rel.resistencia}});state.trainers.forEach(t=>{normalizeTrainerStorage(t);[...t.team,...t.pc].forEach(a=>{const p=pokemonById(a.pokemonId);if(!p)return;a.level=Math.max(1,Number(a.level)||1);const max=hpMaxForLevel(p,a.level);const legacyBase=Math.max(1,Number(p.hp)||1);if(!Number.isFinite(Number(a.currentHp))|| (a.level>1&&Number(a.currentHp)===legacyBase))a.currentHp=max;else a.currentHp=Math.max(0,Math.min(max,Number(a.currentHp)));a.abilityIndexes=Array.isArray(a.abilityIndexes)?a.abilityIndexes.map(Number).filter(x=>x===0||x===1).slice(0,2):[];a.natureza=pokemonNature(a.natureza).id})});applyKnownEvolutionStructure();
 if(Number(state.moveLibraryVersion||0)<1){state.moveLibraryVersion=1;}
 pokemons.forEach(p=>(p.ataques||[]).forEach(a=>ensureMoveForAttack(a)));
 state.pokemonCatalog=pokemons;
 save();
 if(dbConfigured() && !dbReady){
   dbReady=true;
   queueDbSave();
 }
 loginUI();
 }catch(e){console.error(e);toast("Não foi possível carregar a Pokédex.")}
}
init().catch(e=>{console.error(e);toast("Não foi possível carregar a Pokédex.")});
