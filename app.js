/*
 * TrainerDex — aplicação
 * ----------------------
 * Interface, regras da campanha, Pokédex e batalha.
 *
 * Persistência/Supabase: supabase-store.js
 */

const $=(s,e=document)=>e.querySelector(s),$$=(s,e=document)=>[...e.querySelectorAll(s)];
state.masterPasswordVersion??=0;
state.moveDescriptions??={};
state.moveOverrides??={};
let pokemons=[], moves=[], session=null,appReady=false;
const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove("show"),2400)};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const typeClass=s=>{const k=norm(String(s||"")).trim().replace(/\s+/g,"-");const map={agua:"water",fogo:"fire",grama:"grass",planta:"grass",eletrico:"electric",eletricidade:"electric",gelo:"ice",lutador:"fighting",veneno:"poison",terrestre:"ground",voador:"flying",psiquico:"psychic",inseto:"bug",pedra:"rock",fantasma:"ghost",dragao:"dragon",noturno:"dark",aco:"steel",metal:"steel",fada:"fairy",normal:"normal",sombrio:"dark"};return `type-${map[k]||k||"normal"}`};
const typeTags=types=>String(types||"").split(/\s*\/\s*|,\s*/).map(x=>x.trim()).filter(Boolean).map(x=>`<span class="tag type-tag ${typeClass(x)}">${esc(x)}</span>`).join("");
const uid=()=>crypto.randomUUID();
const POKEMON_TYPES=["Normal","Fogo","Água","Elétrico","Grama","Gelo","Lutador","Veneno","Terrestre","Voador","Psíquico","Inseto","Pedra","Fantasma","Dragão","Sombrio","Aço","Fada"];
const POKEMON_NATURES=[
 {id:"rebelde",number:1,name:"Rebelde",effects:{forca:2,destreza:-2}},
 {id:"impulsivo",number:2,name:"Impulsivo",effects:{forca:2,constituicao:-2}},
 {id:"corajoso",number:3,name:"Corajoso",effects:{forca:2,sabedoria:-2}},
 {id:"arrogante",number:4,name:"Arrogante",effects:{forca:2,carisma:-2}},
 {id:"arisco",number:5,name:"Arisco",effects:{destreza:2,forca:-2}},
 {id:"apressado",number:6,name:"Apressado",effects:{destreza:2,constituicao:-2}},
 {id:"energetico",number:7,name:"Energético",effects:{destreza:2,carisma:-2}},
 {id:"desajeitado",number:8,name:"Desajeitado",effects:{destreza:2,sabedoria:-2}},
 {id:"apatetico",number:9,name:"Apático",effects:{constituicao:2,destreza:-2}},
 {id:"teimoso",number:10,name:"Teimoso",effects:{constituicao:2,sabedoria:-2}},
 {id:"ranzinza",number:11,name:"Ranzinza",effects:{constituicao:2,carisma:-2}},
 {id:"relaxado",number:12,name:"Relaxado",effects:{constituicao:2,forca:-2}},
 {id:"cuidadoso",number:13,name:"Cuidadoso",effects:{sabedoria:2,forca:-2}},
 {id:"curioso",number:14,name:"Curioso",effects:{sabedoria:2,constituicao:-2}},
 {id:"travesso",number:15,name:"Travesso",effects:{sabedoria:2,carisma:-2}},
 {id:"alegre",number:16,name:"Alegre",effects:{carisma:2,forca:-2}},
 {id:"atrevido",number:17,name:"Atrevido",effects:{carisma:2,destreza:-2}},
 {id:"inocente",number:18,name:"Inocente",effects:{carisma:2,sabedoria:-2}},
 {id:"resistente",number:19,name:"Resistente",effects:{ca:1,destreza:-2}},
 {id:"esperto",number:20,name:"Esperto",effects:{ca:1,forca:-2}}
];
const DEFAULT_POKEMON_NATURE="rebelde";
function pokemonNature(id){return POKEMON_NATURES.find(n=>n.id===id)||POKEMON_NATURES[0];}
function pokemonNatureLabel(id){const n=pokemonNature(id);return `${n.number} - ${n.name}`;}
function activeProficiencyBonus(p,level=1){const cfg=state.globalProficiency||{};return cfg.enabled?Math.max(0,Math.min(20,Number(cfg.value)||0)):Math.max(0,Math.min(20,Number(p?.bonusProficiencia ?? proficiencyBonus(level))||0));}
function pokemonNatureOptions(selected=DEFAULT_POKEMON_NATURE){const value=pokemonNature(selected).id;return POKEMON_NATURES.map(n=>{const effects=Object.entries(n.effects).map(([k,v])=>`${k==='ca'?'CA':statLabel(k)} ${v>0?'+':''}${v}`).join(', ');return `<option value="${n.id}" ${n.id===value?"selected":""}>${n.number} - ${esc(n.name)} — ${esc(effects)}</option>`}).join("");}
function natureAdjustedStats(stats,natureId){const base=normalizePokemonStats(stats);const nature=pokemonNature(natureId);const adjusted={...base};Object.entries(nature.effects||{}).forEach(([key,value])=>{if(key!=="ca"&&key in adjusted)adjusted[key]=Math.max(1,Math.min(30,adjusted[key]+Number(value)||0));});return adjusted;}
function natureAdjustedCa(baseCa,natureId){const nature=pokemonNature(natureId);return Math.max(0,Number(baseCa)||0)+(Number(nature.effects?.ca)||0);}
function natureEffectsText(natureId){const nature=pokemonNature(natureId);return Object.entries(nature.effects||{}).map(([k,v])=>`${k==='ca'?'CA':statLabel(k)} ${v>0?'+':''}${v}`).join(', ');}
const TYPE_EFFECT={
 normal:{Pedra:.5,Fantasma:0,Aço:.5},Fogo:{Fogo:.5,Água:.5,Grama:2,Gelo:2,Inseto:2,Pedra:.5,Dragão:.5,Aço:2},Água:{Fogo:2,Água:.5,Grama:.5,Terrestre:2,Pedra:2,Dragão:.5},Elétrico:{Água:2,Elétrico:.5,Grama:.5,Terrestre:0,Voador:2,Dragão:.5},Grama:{Fogo:.5,Água:2,Grama:.5,Veneno:.5,Terrestre:2,Voador:.5,Inseto:.5,Pedra:2,Dragão:.5,Aço:.5},Gelo:{Fogo:.5,Água:.5,Grama:2,Gelo:.5,Lutador:2,Terrestre:2,Voador:2,Pedra:2,Dragão:2,Aço:.5},Lutador:{Normal:2,Gelo:2,Veneno:.5,Voador:.5,Psíquico:.5,Inseto:.5,Pedra:2,Fantasma:0,Fada:.5},Veneno:{Grama:2,Veneno:.5,Terrestre:.5,Pedra:.5,Fantasma:.5,Aço:0,Fada:2},Terrestre:{Fogo:2,Elétrico:2,Grama:.5,Veneno:2,Voador:0,Inseto:.5,Pedra:2,Aço:2},Voador:{Elétrico:.5,Grama:2,Lutador:2,Veneno:.5,Inseto:2,Pedra:.5,Aço:.5},Psíquico:{Lutador:2,Veneno:2,Psíquico:.5,Aço:.5,Sombrio:0},Inseto:{Fogo:.5,Grama:2,Lutador:.5,Veneno:.5,Voador:.5,Psíquico:2,Fantasma:.5,Sombrio:2,Aço:.5,Fada:.5},Pedra:{Fogo:2,Gelo:2,Lutador:.5,Terrestre:.5,Voador:2,Inseto:2,Aço:.5},Fantasma:{Normal:0,Psíquico:2,Fantasma:2,Sombrio:.5},Dragão:{Dragão:2,Aço:.5,Fada:0},Sombrio:{Lutador:.5,Psíquico:2,Fantasma:2,Sombrio:.5,Fada:.5},Aço:{Fogo:.5,Água:.5,Elétrico:.5,Grama:.5,Gelo:2,Lutador:2,Terrrestre:2,Voador:.5,Psíquico:.5,Inseto:.5,Pedra:2,Dragão:.5,Aço:.5,Fada:2},Fada:{Fogo:.5,Lutador:2,Veneno:.5,Dragão:2,Sombrio:2,Aço:.5}
};
TYPE_EFFECT.Aço.Terrestre=2;
TYPE_EFFECT.Normal=TYPE_EFFECT.normal;
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
let currentSkillSource=null;
function skillsHtml(p,level=1,natureId=null){const attrs=natureAdjustedStats(p.status||{},natureId),skills=normalizeSkills(p.pericias||{}),pb=activeProficiencyBonus(p,level);const proficient=DND_SKILLS.filter(([k])=>skills[k]);if(!proficient.length)return `<div class="attribute-section skills-section"><div class="section-kicker">Perícias</div><p class="muted">Nenhuma perícia com proficiência.</p></div>`;return `<div class="attribute-section skills-section"><div class="section-kicker">Perícias • Bônus de Proficiência +${pb}</div><div class="skills-grid">${proficient.map(([k,name,attr])=>{const mod=abilityModifier(attrs[attr])+pb;return `<div class="skill-card proficient"><span class="skill-dot">●</span><div><strong>${name}</strong><small>${statLabel(attr)} • Proficiência</small></div><b>${mod>=0?'+':''}${mod}</b></div>`}).join('')}</div></div>`}
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
function statsHtml(s,natureId=null){const attrs=natureAdjustedStats(s,natureId);return `<div class="attribute-grid">${DND_ATTRIBUTES.map(([k,label])=>{const v=attrs[k];return `<div class="attribute-card"><span>${label}</span><strong>${v} <small>(${modifierText(v)})</small></strong><div class="attribute-track"><i style="width:${Math.min(100,Math.max(0,(Number(v)||0)/18*100))}%"></i></div></div>`}).join("")}</div>`}
function moveOptionsHtml(selectedId=""){
 return moves.map(m=>`<option value="${esc(m.id)}" ${String(m.id)===String(selectedId)?"selected":""}>${esc(m.nomeOriginal)} — ${esc(m.nome)} • ${esc(m.tipo)} • PP ${m.pp}</option>`).join("");
}
function moveKey(value){
 return norm(value).replace(/[^a-z0-9]/g,"");
}
function moveById(id){
 const m=moves.find(m=>String(m.id)===String(id));
 if(!m)return null;
 const o=state.moveOverrides?.[String(m.id)]||{};
 if(o.nome!==undefined)m.nome=String(o.nome);
 if(o.nomeOriginal!==undefined)m.nomeOriginal=String(o.nomeOriginal);
 if(o.tipo!==undefined)m.tipo=String(o.tipo);
 if(o.pp!==undefined)m.pp=Math.max(0,Number(o.pp)||0);
 if(Object.prototype.hasOwnProperty.call(state.moveDescriptions||{},String(m.id)))m.descricao=String(state.moveDescriptions[String(m.id)]||"");
 return m;
}
function moveDescription(m){return String(state.moveDescriptions?.[String(m?.id)] ?? m?.descricao ?? "");}

/*
 * Fonte única dos ataques:
 * - moves[] é o catálogo mestre.
 * - cada Pokémon guarda apenas a referência moveId + nível/PP atual.
 * - ataques antigos que foram criados como "custom-..." são migrados para
 *   o ID oficial do mesmo ataque quando existir.
 */
function normalizeMoveLibrary(){
 state.moveOverrides??={};
 state.moveDescriptions??={};

 const groups=new Map();
 const aliases={};
 moves.forEach(m=>{
   const key=moveKey(m.nomeOriginal||m.nome);
   if(!key)return;
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(m);
 });

 const canonical=[];
 groups.forEach(list=>{
   const preferred=list.find(m=>!String(m.id).startsWith("custom-"))||list[0];
   const preferredId=String(preferred.id);
   canonical.push(preferred);
   list.forEach(m=>{aliases[String(m.id)]=preferredId;});

   // Se uma definição antiga tinha edição salva e a oficial não tinha,
   // transfere a edição para a definição única.
   const oldOverrides=list.map(m=>state.moveOverrides[String(m.id)]).find(Boolean);
   if(oldOverrides && !state.moveOverrides[preferredId])state.moveOverrides[preferredId]=oldOverrides;
   const oldDescription=list.map(m=>state.moveDescriptions[String(m.id)]).find(v=>v!==undefined&&String(v).trim());
   if(oldDescription!==undefined && !String(state.moveDescriptions[preferredId]||"").trim()){
     state.moveDescriptions[preferredId]=String(oldDescription);
   }
 });
 moves=canonical;

 // Limpa overrides/descrições dos IDs duplicados.
 Object.keys(state.moveOverrides).forEach(id=>{
   const target=aliases[id];
   if(target && target!==id)delete state.moveOverrides[id];
 });
 Object.keys(state.moveDescriptions).forEach(id=>{
   const target=aliases[id];
   if(target && target!==id)delete state.moveDescriptions[id];
 });

 // Corrige todos os vínculos existentes nos Pokémon.
 pokemons.forEach(p=>{
   p.ataques=Array.isArray(p.ataques)?p.ataques:[];
   p.ataques=p.ataques.map(a=>{
     const currentId=String(a?.moveId||"");
     let m=aliases[currentId] ? moveById(aliases[currentId]) : moveById(currentId);
     if(!m){
       const key=moveKey(a?.nomeOriginal||a?.nome);
       m=moves.find(x=>moveKey(x.nomeOriginal||x.nome)===key)||null;
     }
     if(!m){
       const key=moveKey(a?.nomeOriginal||a?.nome);
       if(key){
         let id="custom-"+key;
         let n=2;
         while(moves.some(x=>String(x.id)===id))id=`custom-${key}-${n++}`;
         m={id,nome:a.nomeOriginal||a.nome,nomeOriginal:a.nomeOriginal||a.nome,tipo:a.tipo||"Normal",pp:Math.max(0,Number(a.pp)||10),descricao:a.descricao||""};
         moves.push(m);
         aliases[currentId]=id;
       }
     }
     if(!m)return a;
     a.moveId=String(m.id);
     a.nome=m.nome;
     a.nomeOriginal=m.nomeOriginal;
     a.tipo=m.tipo;
     a.pp=Number(m.pp)||0;
     a.ppMax=Number(m.pp)||0;
     a.ppAtual=Math.max(0,Math.min(Number(m.pp)||0,Number(a.ppAtual??m.pp)||0));
     a.descricao=moveDescription(m);
     return a;
   });
 });
}

function ensureMoveForAttack(a){
 const key=moveKey(a?.nomeOriginal||a?.nome);
 if(!key)return null;
 let m=a?.moveId?moveById(a.moveId):null;
 if(!m)m=moves.find(x=>moveKey(x.nomeOriginal||x.nome)===key)||null;
 if(!m){
   const base="custom-"+key.replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
   let id=base||("custom-"+Date.now()); let n=2;
   while(moves.some(x=>String(x.id)===id))id=`${base}-${n++}`;
   m={id,nome:a.nomeOriginal||a.nome,nomeOriginal:a.nomeOriginal||a.nome,tipo:a.tipo||"Normal",pp:Math.max(0,Number(a.pp)||10),descricao:a.descricao||""};
   moves.push(m);
 }
 a.moveId=m.id; a.nome=m.nome; a.nomeOriginal=m.nomeOriginal; a.tipo=m.tipo; a.pp=Number(m.pp)||0; a.ppMax=Number(m.pp)||0; a.ppAtual=Math.min(Number(a.ppAtual??m.pp)||0,Number(m.pp)||0); a.descricao=moveDescription(m);
 return m;
}
function attacksEditorHtml(attacks=[]){return `<div class="attack-builder" id="attackBuilder">${(attacks||[]).map((a,i)=>attackRowHtml(a,i)).join("")}</div><button type="button" class="btn" id="addAttack">+ Adicionar ataque</button>`}
function attackRowHtml(a={},i=0){const move=moveById(a.moveId)||moves.find(m=>norm(m.nome)===norm(a.nome||""));const mid=move?.id||a.moveId||"";return `<div class="attack-card" data-attack-row="${i}" data-current-pp="${Math.max(0,Number(a.ppAtual??move?.pp??a.pp)||0)}" data-original-move="${esc(mid)}"><div class="attack-card-head"><strong>Ataque ${i+1}</strong><button type="button" class="btn danger small" data-remove-attack="${i}">Remover</button></div><div class="attack-fields"><div class="field"><label>Nível</label><input class="input attack-level" type="number" min="1" max="100" value="${Number(a.nivel)||1}"></div><div class="field"><label>Dano</label><input class="input attack-damage" type="number" min="0" value="${Math.max(0,Number(a.dano)||0)}"></div><div class="field attack-name-field" style="grid-column:span 2"><label>Ataque cadastrado</label><select class="select attack-move">${moveOptionsHtml(mid)}</select></div><div class="field"><label>PP</label><input class="input attack-pp" type="number" value="${Number(move?.pp||a.pp)||0}" readonly></div></div><div class="attack-selected-info"><span class="tag type-tag ${typeClass(move?.tipo||a.tipo||"Normal")}">${esc(move?.tipo||a.tipo||"—")}</span><strong>${esc(move?.nomeOriginal||a.nome||"Nenhum Move selecionado")}</strong><span>PP: ${Number(move?.pp||a.pp)||0}</span></div></div>`}
function collectAttacks(){return $$("#attackBuilder [data-attack-row]").map(row=>{const move=moveById($(".attack-move",row).value),max=Number(move?.pp)||0;return {nivel:Math.max(1,Math.min(100,Number($(".attack-level",row).value)||1)),moveId:move?.id||"",nome:move?.nome||"",nomeOriginal:move?.nomeOriginal||"",tipo:move?.tipo||"",pp:max,ppMax:max,ppAtual:String(move?.id)===row.dataset.originalMove?Math.min(max,Math.max(0,Number(row.dataset.currentPp)||0)):max,dano:Math.max(0,Number($(".attack-damage",row).value)||0),descricao:moveDescription(move)}})}
function normalizeAbilities(p){p.habilidades=Array.isArray(p?.habilidades)?p.habilidades.slice(0,2):[];while(p.habilidades.length<2)p.habilidades.push({nome:"",descricao:""});p.habilidades=p.habilidades.map(a=>({nome:String(a?.nome||""),descricao:String(a?.descricao||"")}));return p.habilidades}
function abilityDataKey(name){return norm(String(name||""));}
function hydratePokemonAbilitiesFromReference(){
 const source=window.TRAINERDEX_ABILITY_DATA||{};
 if(!Object.keys(source).length)return {updated:0,missing:0};
 const byName=new Map(Object.entries(source).map(([name,abilities])=>[abilityDataKey(name),abilities]));
 let updated=0,missing=0;
 pokemons.forEach(p=>{
   const ref=byName.get(abilityDataKey(p.nome));
   if(!ref){missing++;return;}
   p.habilidades=ref.map(a=>({nome:String(a?.nome||""),descricao:String(a?.descricao||"")})).slice(0,2);
   while(p.habilidades.length<2)p.habilidades.push({nome:"",descricao:""});
   updated++;
 });
 console.info(`TrainerDex: habilidades importadas para ${updated} Pokémon${missing?` (${missing} sem correspondência)`:""}.`);
 return {updated,missing};
}
function abilityUnavailable(a){return !a?.nome || norm(a.nome)==="nao possui"}
function abilitiesEditorHtml(p){const abilities=normalizeAbilities(p);return `<div class="abilities-builder">${abilities.map((a,i)=>`<div class="ability-card"><div class="ability-card-head"><strong>Habilidade ${i+1} — ${i===0?"Normal":"Oculta"}</strong></div><div class="field"><label>Nome</label><input class="input ability-name" data-ability-index="${i}" value="${esc(a.nome)}" placeholder="Ex.: Intimidar"></div><div class="field"><label>Descrição</label><textarea class="textarea ability-description" data-ability-index="${i}" placeholder="Descreva o efeito da habilidade...">${esc(a.descricao)}</textarea></div></div>`).join("")}</div>`}
function collectAbilities(){return [0,1].map(i=>({nome:$(`.ability-name[data-ability-index="${i}"]`)?.value.trim()||"",descricao:$(`.ability-description[data-ability-index="${i}"]`)?.value.trim()||""}))}
function selectedAbilityIndexes(a){return Array.isArray(a?.abilityIndexes)?a.abilityIndexes.map(Number).filter(x=>x===0||x===1).slice(0,2):[]}
function abilitiesHtml(p,a){const indexes=selectedAbilityIndexes(a);const abilities=normalizeAbilities(p);const chosen=indexes.map(i=>({ability:abilities[i],index:i})).filter(x=>x.ability?.nome&&!abilityUnavailable(x.ability));return chosen.length?`<div class="abilities-section"><div class="section-kicker">Habilidades</div><div class="abilities-list">${chosen.map(({ability,index})=>`<div class="ability-view"><strong>${esc(ability.nome)}${index===1?" <small>(Oculta)</small>":""}</strong><p>${esc(ability.descricao||"Sem descrição.")}</p></div>`).join("")}</div>`:`<div class="abilities-section"><div class="section-kicker">Habilidades</div><span class="muted">Nenhuma habilidade atribuída.</span></div>`}
function bindAttackBuilder(){const builder=$("#attackBuilder");if(!builder)return;const refresh=()=>{$$('[data-attack-row]',builder).forEach(row=>{const move=moveById($(".attack-move",row)?.value);if(!move)return;$(".attack-pp",row).value=move.pp;const info=$(".attack-selected-info",row);if(info)info.innerHTML=`<span class="tag type-tag ${typeClass(move.tipo)}">${esc(move.tipo)}</span><strong>${esc(move.nomeOriginal)}</strong><span>PP: ${move.pp}</span>`})};$$('.attack-move',builder).forEach(x=>x.onchange=refresh);$("#addAttack").onclick=()=>{builder.insertAdjacentHTML("beforeend",attackRowHtml({},builder.children.length));bindAttackBuilder()};$$('[data-remove-attack]',builder).forEach(b=>b.onclick=()=>{b.closest('[data-attack-row]').remove();$$('[data-attack-row]',builder).forEach((r,i)=>{r.dataset.attackRow=i;$(".attack-card-head strong",r).textContent=`Ataque ${i+1}`})});refresh()}


const pokemonById=id=>pokemons.find(p=>Number(p.id)===Number(id));
function evolutionPairs(){return {
1:2,2:3,4:5,5:6,7:8,8:9,10:11,11:12,13:14,14:15,16:17,17:18,19:20,21:22,23:24,25:26,27:28,29:30,30:31,32:33,33:34,35:36,37:38,39:40,41:42,43:44,44:45,46:47,48:49,50:51,52:53,54:55,56:57,58:59,60:61,61:62,63:64,64:65,66:67,67:68,69:70,70:71,72:73,74:75,75:76,77:78,79:80,81:82,83:null,84:85,86:87,88:89,90:91,92:93,93:94,95:null,96:97,98:99,100:101,102:103,104:105,109:110,111:112,116:117,117:null,118:119,120:121,123:null,125:null,126:null,129:130,133:null,137:null,138:139,140:141,147:148,148:149};}
const EVOLUTION_PARENT={2:1,3:2,5:4,6:5,8:7,9:8,11:10,12:11,14:13,15:14,17:16,18:17,20:19,22:21,24:23,26:25,28:27,30:29,31:30,33:32,34:33,36:35,38:37,40:39,42:41,45:44,47:46,49:48,51:50,53:52,55:54,57:56,59:58,61:60,62:61,64:63,65:64,67:66,68:67,70:69,71:70,73:72,75:74,76:75,78:77,80:79,82:81,85:84,87:86,89:88,91:90,93:92,94:93,97:96,99:98,101:100,103:102,105:104,110:109,112:111,117:116,119:118,121:120,130:129,139:138,141:140,148:147,149:148};
const BRANCH_PARENTS={134:133,135:133,136:133};
function nextEvolutions(pid){const id=Number(pid);return pokemons.filter(p=>Number(p.evolvesFromId)===id);}
function validEvolutionParent(id,parentId){
 const seen=new Set([Number(id)]);let current=pokemonById(parentId);
 while(current){if(seen.has(Number(current.id)))return false;seen.add(Number(current.id));current=current.evolvesFromId?pokemonById(current.evolvesFromId):null;}
 return true;
}
function applyKnownEvolutionStructure(){
 // Preenche somente dados antigos sem estrutura; escolhas já salvas prevalecem.
 const defaults={...EVOLUTION_PARENT,...BRANCH_PARENTS};
 pokemons.forEach(p=>{
  if(p.evolvesFromId===undefined)p.evolvesFromId=p.evolutionType==='basic'?null:defaults[Number(p.id)]||null;
  p.evolutionType=p.evolvesFromId?'evolution':'basic';
  let stage=1,current=p;const seen=new Set([Number(p.id)]);
  while(current?.evolvesFromId){const parent=pokemonById(current.evolvesFromId);if(!parent||seen.has(Number(parent.id)))break;seen.add(Number(parent.id));stage++;current=parent;}
  p.evolutionStage=stage;
 });
}
function normalizeCampaignState(){
 state.campaign??=structuredClone(DEFAULT.campaign);state.campaign.name=String(state.campaign.name||DEFAULT.campaign.name);
 state.master??=structuredClone(DEFAULT.master);state.master.user??=DEFAULT.master.user;state.master.pass??=DEFAULT.master.pass;
 state.trainers=Array.isArray(state.trainers)?state.trainers.filter(t=>t&&t.id):[];
 state.notes=Array.isArray(state.notes)?state.notes.filter(n=>n&&n.id):[];state.dex??={};state.moveOverrides??={};state.moveDescriptions??={};
 state.encounter={...structuredClone(DEFAULT.encounter),battleActive:false,battleId:null,battleLog:[],activeParticipantId:null,...state.encounter};
 state.encounter.combatants=Array.isArray(state.encounter.combatants)?state.encounter.combatants:[];state.encounter.battleLog=Array.isArray(state.encounter.battleLog)?state.encounter.battleLog:[];
 state.trainers.forEach(t=>{t.name=String(t.name||'Jogador');t.username??=norm(t.name).replace(/\s+/g,'');t.password??='1234';t.visible=[...new Set((Array.isArray(t.visible)?t.visible:[]).map(Number))];t.pokemonNotes??={};t.pendingEvolutionEvents=Array.isArray(t.pendingEvolutionEvents)?t.pendingEvolutionEvents:[];normalizeTrainerStorage(t);t.visible=[...new Set([...t.visible,...t.captured])];});
}
function migrate(){state.master??={...DEFAULT.master};state.master.user??="mestre";state.master.pass??="king";if(Number(state.masterPasswordVersion||0)<1 && state.master.pass==="1234"){state.master.pass="king";state.masterPasswordVersion=1;}else if(Number(state.masterPasswordVersion||0)<1){state.masterPasswordVersion=1;}state.trainers??=[];state.dex??={};state.notes??=[];state.encounter??=DEFAULT.encounter;state.pokemonCatalog??=null;
state.trainers.forEach(t=>{t.username??=norm(t.name).replace(/\s+/g,"")||("jogador"+String(t.id).slice(0,4));t.password??="1234";t.captured??=[];t.visible??=[];t.team??=[];t.pc??=[];normalizeTrainerStorage(t);t.pokemonNotes??={};t.pendingEvolutionEvents??=[];[...t.team,...t.pc].forEach(a=>{a.pokemonId=Number(a.pokemonId);a.level=Number(a.level)||1;a.natureza=pokemonNature(a.natureza).id;a.status="captured";const pp=pokemonById(a.pokemonId);a.currentHp=Number.isFinite(Number(a.currentHp))?Math.max(0,Number(a.currentHp)):Number(pp?.hp)||0;if(!t.visible.includes(a.pokemonId))t.visible.push(a.pokemonId)});t.captured=[...new Set([...t.team,...t.pc].map(a=>Number(a.pokemonId)))] ;t.visible=[...new Set(t.visible.map(Number))];[...t.team,...t.pc].forEach(a=>{a.abilityIndexes=Array.isArray(a.abilityIndexes)?a.abilityIndexes.map(Number).filter(x=>x===0||x===1).slice(0,2):[]});});save()}
migrate();

function loginUI(){
 $("#playerSelect").innerHTML=state.trainers.map(t=>`<option value="${t.id}">${esc(t.name)} (@${esc(t.username)})</option>`).join("")||`<option value="">Nenhum jogador criado</option>`;
}
$$("[data-login-role]").forEach(b=>b.onclick=()=>{ $$("[data-login-role]").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#masterLogin").classList.toggle("hidden",b.dataset.loginRole!=="master");$("#playerLogin").classList.toggle("hidden",b.dataset.loginRole!=="player");$("#loginError").textContent=""});
function start(role,id=null){if(!appReady)return;if(role!=='master'&&(role!=='player'||!state.trainers.some(t=>t.id===id)))return;closeModal();$('#dexStatus').value='all';$('#dexSearch').value='';session={role,trainerId:id};$("#loginScreen").classList.add("hidden");$("#app").classList.remove("hidden");$("#roleLabel").textContent=role==="master"?"Painel do Mestre":`Jogador: ${state.trainers.find(t=>t.id===id)?.name||""}`;setupNav();renderAll();nav("dashboard")}
$("#masterLoginBtn").onclick=()=>{if($("#masterUser").value===state.master.user&&$("#masterPass").value===state.master.pass)start("master");else $("#loginError").textContent="Usuário ou senha do Mestre inválidos."};
$("#playerLoginBtn").onclick=()=>{const t=state.trainers.find(x=>x.id===$("#playerSelect").value);if(t&&$("#playerPass").value===t.password)start("player",t.id);else $("#loginError").textContent="Jogador ou senha inválidos."};
$("#logout").onclick=()=>{closeModal();cancelEvolutionAnimation();session=null;$("#app").classList.add("hidden");$("#loginScreen").classList.remove("hidden");$("#masterPass").value="";$("#playerPass").value="";loginUI()};
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
 const normalizeList=list=>(Array.isArray(list)?list:[]).filter(x=>x!=null).map(x=>typeof x==="object"?x:{pokemonId:Number(x),level:1,status:"captured"});
 const used=new Set();const unique=list=>normalizeList(list).filter(a=>{const id=Number(a.pokemonId);if(!Number.isFinite(id)||id<=0||a.status&&a.status!=='captured'||used.has(id))return false;used.add(id);a.pokemonId=id;a.status='captured';return true});
 t.team=unique(t.team);
 t.pc=unique(t.pc);
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
 if(!master&&!t)return;
 $("#campaignSubtitle").textContent=master?state.campaign.name:`Olá, ${t?.name||"Jogador"}!`;
 $("#statTrainers").textContent=master?state.trainers.length:1;
 $("#statPokemon").textContent=master?state.trainers.reduce((n,x)=>n+x.captured.length,0):(t?.captured.length||0);
 $("#statVisible").textContent=master?state.trainers.reduce((n,x)=>n+x.visible.length,0):(t?.visible.length||0);
 $("#statNotes").textContent=master?state.notes.length:0;
 $('#newEncounterBtn').classList.toggle('hidden',!master);$('#newEncounterBtn').textContent=state.encounter.battleActive?'Abrir batalha':'Nova batalha';
 $('#statTrainersLabel').textContent=master?'Treinadores':'Pokémon no time';if(!master)$('#statTrainers').textContent=t.team.length;$('#statNotesLabel').textContent=master?'Notas salvas':'Pokémon no PC';if(!master)$('#statNotes').textContent=t.pc.length;
 $('#dashboardRosterTitle').textContent=master?'Jogadores':'Meu time';$('#dashboardRosterIntro').textContent=master?'Resumo da campanha.':'Seus Pokémon prontos para a aventura.';
 $("#statPokemonLabel").textContent=master?"Capturas registradas":"Pokémon capturados";
 const box=$("#dashboardTrainers");
 box.innerHTML=master?(state.trainers.length?state.trainers.map(x=>`<div class="row"><div class="row-main"><strong>${esc(x.name)}</strong><small>@${esc(x.username)} • ${x.captured.length} capturados • ${x.visible.length} visíveis</small></div><span>👤</span></div>`).join(""):`<div class="empty">Nenhum jogador cadastrado.</div>`):(t.team.length?t.team.map(a=>{const p=pokemonById(a.pokemonId);if(!p)return '';const h=hpData(a,p);return `<button class="row dashboard-pokemon" data-home-pokemon="${p.id}"><img src="${esc(p.imagem)}" alt=""><div class="row-main"><strong>${esc(p.nome)}</strong><small>Nv. ${a.level||1} • HP ${h.current}/${h.max}</small></div><span>→</span></button>`}).join(''):'<div class="empty">Seu time está vazio. Confira os Pokémon no PC.</div>');
 $("#dashboardShortcuts").innerHTML=master?`<button class="row btn" data-page="pokedex"><span>📖 Gerenciar Pokédex e Pokémon</span><span>→</span></button><button class="row btn" data-page="trainers"><span>👥 Gerenciar jogadores e capturas</span><span>→</span></button><button class="row btn" data-page="encounter"><span>⚔️ Controlar batalha</span><span>→</span></button><button class="row btn" data-page="notes"><span>📝 Notas</span><span>→</span></button>`:`<button class="row btn" data-page="pokedex"><span>📖 Abrir minha Pokédex</span><span>→</span></button><button class="row btn" data-page="team"><span>🎒 Gerenciar meu time</span><span>→</span></button><button class="row btn" data-page="pc"><span>💻 Abrir meu PC</span><span>→</span></button>${battleIsPlayerIn()?'<button class="row btn" data-page="encounter"><span>⚔️ Entrar na batalha</span><span>→</span></button>':''}`;
 $$("[data-page]").forEach(b=>b.onclick=()=>nav(b.dataset.page));
 $$('[data-home-pokemon]').forEach(b=>b.onclick=()=>openAssignedPokemon(Number(b.dataset.homePokemon)));
 $('#newEncounterBtn').onclick=()=>{if(!isMaster())return;nav('encounter');if(!state.encounter.battleActive)openBattleStart()};
}
function renderDex(){
 const grid=$("#dexGrid");
 if(!grid)return;
 const searchEl=$("#dexSearch"), statusEl=$("#dexStatus"), typeEl=$("#dexTypeFilter");
 const t=me();
 state.globalProficiency??={enabled:false,value:2};
 const q=norm(searchEl?.value||"");
 const filter=isMaster()?"all":statusEl?.value||"all";
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
   return `<article class="pokemon ${hidden?"dex-hidden":""}" data-id="${p.id}"><img src="${p.imagem||""}" alt="${hidden?"Pokémon não descoberto":esc(p.nome||"")}"><div><small>${esc(p.numero||"")}</small><h3>${hidden?"???":esc(p.nome||"")}</h3>${hidden?`<div class="tags"><span class="tag">Não descoberto</span></div>`:`<div class="tags">${typeTags(p.tipo)}</div>`}${isMaster()?"":`<span class="status ${st}">${st==="caught"?`Capturado • Nv. ${level}`:st==="seen"?"Avistado":"Não descoberto"}</span>`}</div></article>`;
 }).join("")||`<div class="empty">Nenhum Pokémon encontrado.</div>`;
 $$(".pokemon",grid).forEach(c=>c.onclick=()=>{if(!c.classList.contains("dex-hidden"))openPokemon(Number(c.dataset.id))});
 const intro=$("#dexIntro");
 if(intro)intro.textContent=isMaster()?"Banco de dados da campanha. Use os filtros para localizar rapidamente os Pokémon.":"Todos os Pokémon aparecem na Pokédex. Os não descobertos ficam ocultos; avistados mostram informações básicas; capturados mostram a ficha completa e o nível definido pelo Mestre.";
 const newBtn=$("#newPokemonBtn");if(newBtn)newBtn.classList.toggle("hidden",!isMaster());
 const proficiencyPanel=$("#globalProficiencyPanel");
 if(proficiencyPanel){
   proficiencyPanel.classList.toggle("hidden",!isMaster());
   const cfg=state.globalProficiency;
   const toggle=$("#globalProficiencyEnabled"),value=$("#globalProficiencyValue"),status=$("#globalProficiencyStatus");
   if(toggle)toggle.checked=!!cfg.enabled;
   if(value){value.value=String(Number(cfg.value)||0);value.disabled=!cfg.enabled;}
   if(status)status.textContent=cfg.enabled?`Bônus global ativo: +${Number(cfg.value)||0}. O bônus individual de cada Pokémon será ignorado.`:"Bônus global desativado. Cada Pokémon usa seu próprio bônus de proficiência.";
   const persist=async candidate=>{
    if(!isMaster())return;toggle.disabled=true;value.disabled=true;
    try{await saveGlobalProficiencyToSupabase(candidate);state.globalProficiency=candidate;save();toast('Bônus global atualizado.');}
    catch(error){toast('Não foi possível salvar o bônus global. A configuração anterior foi mantida.');}
    finally{toggle.disabled=false;renderDex();}
   };
   if(toggle)toggle.onchange=()=>persist({...cfg,enabled:toggle.checked});
   if(value)value.onchange=()=>{if(!value.value.trim()||!value.checkValidity()){value.value=String(cfg.value);return toast('Informe um bônus de 0 a 20.');}return persist({...cfg,value:Number(value.value)});};
 }
 if(typeEl){
   const oldType=typeEl.value||"all";
   typeEl.innerHTML=`<option value="all">Todos os tipos</option>`+POKEMON_TYPES.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");
   typeEl.value=POKEMON_TYPES.some(x=>norm(x)===norm(oldType))?oldType:"all";
 }
 if($('#dexResults'))$('#dexResults').textContent=`${list.length} de ${source.length} Pokémon`;
 if(statusEl){statusEl.innerHTML=isMaster()?`<option value="all">Todos</option>`:`<option value="all">Todos</option><option value="seen">Avistados</option><option value="caught">Capturados</option><option value="hidden">Não descobertos</option>`;statusEl.value=filter;}
}
function openPokemon(id){
 const p=pokemonById(id); if(!p)return;
 if(isMaster())openPokemonMaster(p); else openPokemonPlayer(p);
}
function personalMoveKey(a){return String(a?.moveId||moveKey(a?.nomeOriginal||a?.nome));}
function assignmentAttacks(p,a){
 const level=Math.max(1,Number(a?.level)||1),data=normalizePersonalMoves(a?.personalMoves),excluded=new Set(data.excludedMoves),list=new Map();
 (p?.ataques||[]).filter(m=>Number(m.nivel)<=level).forEach(m=>list.set(personalMoveKey(m),{...m}));
 data.learnedMoves.filter(m=>m.nivel<=level).forEach(ref=>{const m=moveById(ref.moveId);if(m)list.set(String(m.id),{...ref,nome:m.nome,nomeOriginal:m.nomeOriginal,tipo:m.tipo,pp:Number(m.pp)||0,ppMax:Number(m.pp)||0,ppAtual:Number(m.pp)||0,descricao:moveDescription(m),personal:true})});
 return [...list.entries()].filter(([key])=>!excluded.has(key)).map(([,m])=>m).sort((x,y)=>Number(x.nivel)-Number(y.nivel));
}
function attacksHtml(p,level=null,assignment=null){const attacks=assignment?assignmentAttacks(p,assignment):(p.ataques||[]).filter(a=>level==null||Number(a.nivel)<=Number(level));return attacks.map(a=>`<li class="attack-detail-item"><details><summary><strong>Nv. ${Number(a.nivel)||1} — ${esc(a.nome||a.nomeOriginal)}</strong> ${a.personal?'<span class="tag">Ensinado</span>':''}${a.tipo?`<span class="tag type-tag ${typeClass(a.tipo)}">${esc(a.tipo)}</span>`:""}<span>PP ${Number(a.pp||a.ppMax)||0}</span><small>${esc(a.nomeOriginal||"")}</small></summary><div class="attack-description">${esc(a.descricao||"Sem descrição cadastrada.")}</div></details></li>`).join("")||"<li>Nenhum ataque aprendido até este nível.</li>"}
function npcAttacksForLevel(p,level){return (p?.ataques||[]).filter(a=>Number(a.nivel)<=Number(level)).sort((a,b)=>Number(a.nivel)-Number(b.nivel))}
function npcAttacksPreviewHtml(p,level){const attacks=npcAttacksForLevel(p,level);return attacks.length?`<div class="npc-attack-preview">${attacks.map(a=>`<div class="npc-attack-preview-row"><div><strong>${esc(a.nome)}</strong>${a.tipo?` <span class="tag type-tag ${typeClass(a.tipo)}">${esc(a.tipo)}</span>`:""}<small>Nv. ${Number(a.nivel)||1}</small></div><b>PP ${Number(a.ppAtual??a.pp??a.ppMax)||0}/${Number(a.ppMax||a.pp)||0}</b></div>`).join("")}</div>`:`<div class="npc-attack-empty">Nenhum ataque aprendido até o nível selecionado.</div>`}
function openPokemonPlayer(p){
 const t=me();if(!t||!p)return;normalizeTrainerStorage(t);const st=getStatusForPlayer(p,t);if(st==="hidden")return;const a=getAssignment(t,p.id);const level=a?.level||playerLevel(p,t);
 if(st==="seen"){$("#modalContent").innerHTML=`<div class="modal-head"><h2>${esc(p.nome)}</h2><button class="btn" data-close>Fechar</button></div><div class="pokemon-detail"><img src="${p.imagem}"><div><div class="muted">${esc(p.numero)}</div><div class="tags detail-types">${typeTags(p.tipo)}</div><p>${esc(p.descricao||"")}</p><p><strong>Tipo:</strong> ${esc(p.tipo||"—")}</p><span class="status seen">👁 Avistado</span></div></div>`;}
 else {const hp=hpData(a,p),note=getPokemonNote(t,p.id);$("#modalContent").innerHTML=`<div class="modal-head"><h2>${esc(p.nome)}</h2><button class="btn" data-close>Fechar</button></div><div class="pokemon-detail"><img src="${p.imagem}"><div><div class="muted">${esc(p.numero)} • Nível ${level} • HP ${hp.current}/${hp.max}</div><div class="tags detail-types"><span class="tag">Natureza: ${esc(pokemonNatureLabel(a?.natureza))}</span><span class="tag">${esc(natureEffectsText(a?.natureza))}</span><span class="tag">SR: ${esc(p.sr||"—")}</span><span class="tag">CA: ${natureAdjustedCa(p.ca,a?.natureza)}</span><span class="tag">Dado de Vida: d${normalizeLifeDice(p.dadoVida)}</span></div><div class="health-wrap detail-health"><div class="health-label"><span>Vida</span><strong>${hp.current}/${hp.max}</strong></div><div class="health-bar"><span style="width:${hp.pct}%"></span></div></div><div class="tags detail-types">${typeTags(p.tipo)}</div><p>${esc(p.descricao||"")}</p><div class="attribute-section"><div class="section-kicker">Atributos</div>${statsHtml(p.status,a?.natureza)}</div>${skillsHtml(p,level,a?.natureza)}<div class="relation-block"><strong>Vulnerabilidades:</strong><div class="tags relation-tags">${typeTags((p.vulnerabilidades||[]).join(" / "))||`<span class="muted">Nenhuma</span>`}</div></div><div class="relation-block"><strong>Resistências:</strong><div class="tags relation-tags">${typeTags((p.resistencia||[]).join(" / "))||`<span class="muted">Nenhuma</span>`}</div></div>${abilitiesHtml(p,a)}<h3>Ataques atuais no nível ${level}</h3><ul class="attack-list">${attacksHtml(p,level,a)}</ul><span class="status caught">🎒 Capturado • Nível ${level} • ${t.team.some(x=>Number(x.pokemonId)===Number(p.id))?"No time":"No PC"}</span><div class="top-actions" style="margin-top:12px"><button class="btn" id="swapLocationAction">🔄 Gerenciar Time/PC</button></div><div class="pokemon-notes"><h3>Anotações</h3><textarea class="textarea" id="pokemonNote" placeholder="Escreva uma anotação sobre este Pokémon...">${esc(note)}</textarea><small class="muted" id="noteSaved">As anotações são salvas automaticamente.</small></div></div></div>`;}
 showModal();$("[data-close]").onclick=closeModal;
 const swapBtn=$("#swapLocationAction");if(swapBtn){swapBtn.onclick=()=>{const inPc=t.pc?.some(x=>Number(x.pokemonId)===Number(p.id));openSwapPokemon(t,p.id,!!inPc);};}
 const noteEl=$("#pokemonNote");if(noteEl){noteEl.oninput=()=>{t.pokemonNotes??={};t.pokemonNotes[String(p.id)]=noteEl.value;save();$("#noteSaved").textContent="Anotação salva.";clearTimeout(window.__noteTimer);window.__noteTimer=setTimeout(()=>{const saved=$("#noteSaved");if(saved)saved.textContent="As anotações são salvas automaticamente."},1200);}}
}
function evolutionOptions(selected){return pokemons.filter(x=>Number(x.id)!==Number(selected.id)).sort((a,b)=>Number(a.id)-Number(b.id)).map(x=>`<option value="${x.id}" ${Number(selected.evolvesFromId)===Number(x.id)?"selected":""}>${esc(x.numero)} — ${esc(x.nome)}</option>`).join("")}
function openPokemonMaster(p,isNew=false){
 if(!isMaster())return;
 let pendingImage=p._newImage||null;
 const isEvolution=!!p.evolvesFromId;
 const parent=p.evolvesFromId?pokemonById(p.evolvesFromId):null;
 const vuln=p.vulnerabilidades||[],res=p.resistencia||[];
 $("#modalContent").innerHTML=`<div class="modal-head"><h2>Editar: ${esc(p.nome)}</h2><div><button class="btn" data-close>Fechar</button><button class="btn danger" id="deletePokemon">Excluir</button></div></div>
 <div class="pokemon-admin-grid"><div><img class="admin-image" id="previewImage" src="${esc(pendingImage||p.imagem)}"><label class="btn file-btn">Trocar imagem<input type="file" id="pokemonImage" accept="image/*" hidden></label></div>
 <div class="form-grid"><div class="field"><label>Número</label><input class="input" id="pkNumero" value="${esc(p.numero)}"></div><div class="field"><label>Nome</label><input class="input" id="pkNome" value="${esc(p.nome)}"></div><div class="field type-picker-field"><label>Tipo(s)</label><p class="field-help">Clique para selecionar um ou mais tipos.</p><button type="button" class="type-picker-toggle" data-picker-toggle="pkTypePicker">Selecionar tipos <span>⌄</span></button><div class="type-picker hidden" id="pkTypePicker">${typeOptionsHtml(String(p.tipo||"").split(/\s*\/\s*|,\s*/).filter(Boolean))}</div><input type="hidden" id="pkTipo" value="${esc(p.tipo)}"></div><div class="field"><label>Classificação evolutiva</label><select class="select" id="pkEvolutionType"><option value="basic" ${!isEvolution?"selected":""}>Básico</option><option value="evolution" ${isEvolution?"selected":""}>Evolução</option></select></div><div class="field hidden" id="pkParentField"><label>Evolui de</label><select class="select" id="pkParent"><option value="">Selecione o Pokémon anterior</option>${evolutionOptions(p)}</select><small class="muted">Pode ser um Pokémon básico ou uma evolução existente.</small></div><div class="field"><label>Descrição</label><textarea class="textarea" id="pkDescricao">${esc(p.descricao)}</textarea></div><div class="inline-fields"><div class="field"><label>SR (Raridade)</label><input class="input" id="pkSr" value="${esc(p.sr??"")}" placeholder="Ex.: SR"></div><div class="field"><label>CA</label><input class="input" id="pkCa" type="number" min="0" value="${Number(p.ca)||0}"></div></div><div class="field"><label>Habilidades</label><p class="field-help">Cada Pokémon possui 2 habilidades. Cadastre o nome e a descrição de cada uma.</p>${abilitiesEditorHtml(p)}</div><div class="inline-fields"><div class="field"><label>Vida padrão — Nível 1</label><input class="input" id="pkHp" type="number" min="1" value="${Math.max(1,Number(p.hp)||1)}"><small class="muted">É a vida base no nível 1.</small></div><div class="field"><label>Dado de Vida</label><select class="select" id="pkLifeDie">${LIFE_DICE.map(d=>`<option value="${d}" ${normalizeLifeDice(p.dadoVida)===d?"selected":""}>d${d}</option>`).join("")}</select><small class="muted">O valor máximo do dado é somado a cada nível.</small></div></div>
 <div class="field type-picker-field"><label>Vulnerabilidades</label><p class="field-help">Clique para selecionar os tipos aos quais este Pokémon é vulnerável.</p><button type="button" class="type-picker-toggle" data-picker-toggle="pkVulnPicker">Selecionar tipos <span>⌄</span></button><div class="type-picker hidden" id="pkVulnPicker">${typeOptionsHtml(vuln)}</div></div>
 <div class="field type-picker-field"><label>Resistências</label><p class="field-help">Clique para selecionar os tipos que este Pokémon resiste.</p><button type="button" class="type-picker-toggle" data-picker-toggle="pkResPicker">Selecionar tipos <span>⌄</span></button><div class="type-picker hidden" id="pkResPicker">${typeOptionsHtml(res)}</div></div>
 <div class="field"><label>Atributos</label><p class="field-help">Informe o valor de cada atributo. O modificador é calculado automaticamente no formato D&D: valor 13 = (+1), valor 6 = (-2).</p><div class="inline-fields attribute-editor">${DND_ATTRIBUTES.map(([k,label])=>`<div class="field"><label>${label}</label><input class="input pokemon-attr" data-attr="${k}" type="number" min="1" max="30" value="${Number(normalizePokemonStats(p.status)[k])||10}"></div>`).join("")}</div></div>
 <div class="field"><label>Perícias</label>${skillsEditorHtml(p)}</div>
 <div class="field"><label>Bônus de Proficiência</label><input class="input" id="pkBonusProf" type="number" min="0" max="20" value="${Math.max(0,Number(p.bonusProficiencia ?? proficiencyBonus(1))||0)}"><small class="muted">Defina manualmente o bônus usado nas perícias proficientes deste Pokémon.</small></div>
 <div class="field"><label>Ataques por nível</label><p class="field-help">Crie cada ataque visualmente. Defina o nível em que ele é aprendido, tipo e dano.</p>${attacksEditorHtml(p.ataques||[])}</div>
 <button class="btn primary" id="savePokemon">Salvar Pokémon</button></div></div>`;
 showModal();$('[data-close]').onclick=closeModal;bindAttackBuilder();$$("[data-picker-toggle]").forEach(b=>{const box=$("#"+b.dataset.pickerToggle);const refresh=()=>{const vals=selectedTypes("#"+box.id+" .type-choice");b.firstChild.textContent=vals.length?`${vals.length} tipo${vals.length>1?"s":""} selecionado${vals.length>1?"s":""}`:"Selecionar tipos"};refresh();box.addEventListener("change",refresh);b.onclick=()=>{box.classList.toggle("hidden");b.classList.toggle("open");b.querySelector("span").textContent=box.classList.contains("hidden")?"⌄":"⌃"}});
 const toggleParent=()=>$("#pkParentField").classList.toggle("hidden",$("#pkEvolutionType").value!=="evolution");$("#pkEvolutionType").onchange=toggleParent;toggleParent();
 $("#pokemonImage").onchange=e=>{const f=e.target.files[0];if(!f)return;if(!f.type.startsWith('image/')||f.size>8*1024*1024)return toast('Escolha uma imagem de até 8 MB.');const preview=$('#previewImage'),button=$('#savePokemon'),r=new FileReader();button.disabled=true;r.onload=()=>{preview.src=r.result;pendingImage=r.result;button.disabled=false};r.onerror=()=>{button.disabled=false;toast('Não foi possível ler a imagem.')};r.readAsDataURL(f)};
 $('#savePokemon').onclick=()=>{
  if(!isMaster())return;
  try{
   const name=$('#pkNome').value.trim(),number=$('#pkNumero').value.trim(),types=selectedTypes('#pkTypePicker .type-choice');
   if(!name||!number)return toast('Preencha o nome e o número do Pokémon.');
   if(!types.length)return toast('Selecione pelo menos um tipo.');
   const numeric=$$('#modalContent input[type="number"]');
   if(numeric.some(input=>!input.value.trim()||!input.checkValidity()))return toast('Confira os valores numéricos e seus limites.');
   const evolutionType=$('#pkEvolutionType').value,parentId=evolutionType==='evolution'?Number($('#pkParent').value):null;
   if(evolutionType==='evolution'&&(!pokemonById(parentId)||!validEvolutionParent(p.id,parentId)))return toast('Escolha uma evolução anterior válida, sem formar um ciclo.');
   const attacks=collectAttacks();if(attacks.some(a=>!a.moveId||!a.nome))return toast('Escolha um ataque válido em cada linha.');
   const draft={numero:number,nome:name,tipo:types.join(' / '),descricao:$('#pkDescricao').value,sr:$('#pkSr').value.trim(),ca:Number($('#pkCa').value),habilidades:collectAbilities(),hp:Number($('#pkHp').value),dadoVida:normalizeLifeDice($('#pkLifeDie').value),vulnerabilidades:selectedTypes('#pkVulnPicker .type-choice'),resistencia:selectedTypes('#pkResPicker .type-choice'),status:Object.fromEntries(DND_ATTRIBUTES.map(([k])=>[k,Number($(`.pokemon-attr[data-attr="${k}"]`).value)])),pericias:collectSkills(),bonusProficiencia:Number($('#pkBonusProf').value),ataques:attacks,evolutionType,evolvesFromId:parentId,evolutionStage:parentId?(pokemonById(parentId)?.evolutionStage||1)+1:1};
   Object.assign(p,draft);if(pendingImage){p._newImage=pendingImage;p.imagem=pendingImage;}
   if(isNew)pokemons.push(p);
   applyKnownEvolutionStructure();state.pokemonCatalog=pokemons;save();closeModal();renderAll();toast('Pokémon atualizado. Acompanhe o salvamento no rodapé.');
  }catch(error){console.error('TrainerDex: erro ao validar Pokémon.',error);toast('Não foi possível salvar. Confira os campos da ficha.');}
 };
 $("#deletePokemon").onclick=()=>{
   if(!isMaster())return;if(isNew){closeModal();return;}if(pokemons.length<=1)return toast('Mantenha pelo menos um Pokémon no catálogo.');if(state.trainers.some(t=>getAssignment(t,p.id))||state.encounter.combatants.some(c=>Number(c.pokemonId)===Number(p.id)))return toast('Este Pokémon está em uso por jogadores ou na batalha.');if(pokemons.some(x=>Number(x.evolvesFromId)===Number(p.id)))return toast('Este Pokémon é a origem de uma evolução cadastrada. Altere a evolução antes de excluir.');if(!confirm(`Excluir ${p.nome}?`))return;
   const imageToRemove=p.imagem;
   pokemons=pokemons.filter(x=>x.id!==p.id);
   state.trainers.forEach(t=>t.visible=t.visible.filter(id=>Number(id)!==Number(p.id)));
   state.pokemonCatalog=pokemons;
   save();
   pendingImageRemovals.add(imageToRemove);
   closeModal();renderDex();toast("Pokémon excluído da campanha.");
 };
}

function newPokemon(){if(!isMaster())return;const id=Math.max(0,...pokemons.map(x=>Number(x.id)),...[...personalMovesRecords.keys()].map(key=>Number(key.split(":").pop())||0))+1;const p={id,numero:"#"+String(id).padStart(3,"0"),nome:"Novo Pokémon",tipo:"Normal",descricao:"",imagem:publicImageUrl("assets/trainerdex-home.png"),hp:50,dadoVida:10,sr:"",ca:0,status:{forca:10,destreza:10,constituicao:10,inteligencia:10,sabedoria:10,carisma:10},pericias:{},bonusProficiencia:2,vulnerabilidades:[],resistencia:[],ataques:[],evolutionType:"basic",evolutionStage:1,habilidades:[{nome:"",descricao:""},{nome:"",descricao:""}]};openPokemonMaster(p,true)}
$("#newPokemonBtn").onclick=newPokemon;

function renderMoves(){
 if(!isMaster())return;
 const q=norm($("#moveSearch")?.value||""); const type=$("#moveTypeFilter")?.value||"all";
 const typeEl=$("#moveTypeFilter"); if(typeEl){typeEl.innerHTML=`<option value="all">Todos os tipos</option>`+POKEMON_TYPES.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join(""); typeEl.value=POKEMON_TYPES.some(x=>norm(x)===norm(type))?type:"all";}
 const list=moves.map(m=>moveById(m.id)).filter(Boolean).filter(m=>(!q||norm(`${m.nomeOriginal} ${m.nome} ${m.tipo}`).includes(q))&&(type==="all"||norm(m.tipo)===norm(type)));
 $("#movesCount").textContent=`${list.length} de ${moves.length} ataques`;
 $("#movesGrid").innerHTML=list.map(m=>`<article class="card move-library-card">
  <div class="section-title"><div><h3>${esc(m.nomeOriginal)}</h3><p>${esc(m.nome)}</p></div><span class="tag type-tag ${typeClass(m.tipo)}">${esc(m.tipo)}</span></div>
  <p class="move-card-description">${esc(moveDescription(m)||"Sem descrição cadastrada.")}</p><details class="move-edit-details"><summary>Editar ataque</summary><div class="form-grid move-editor-grid">
   <div class="field"><label>Nome original</label><input class="input move-original-input" data-move-id="${esc(m.id)}" value="${esc(m.nomeOriginal)}"></div>
   <div class="field"><label>Nome do ataque</label><input class="input move-name-input" data-move-id="${esc(m.id)}" value="${esc(m.nome)}"></div>
   <div class="field"><label>Tipo</label><select class="select move-type-input" data-move-id="${esc(m.id)}">${POKEMON_TYPES.map(t=>`<option value="${esc(t)}" ${norm(t)===norm(m.tipo)?"selected":""}>${esc(t)}</option>`).join("")}</select></div>
   <div class="field"><label>PP máximo</label><input class="input move-pp-input" data-move-id="${esc(m.id)}" type="number" min="0" value="${Number(m.pp)||0}"></div>
   <div class="field" style="grid-column:1/-1"><label>Descrição do ataque</label><textarea class="textarea move-description-input" data-move-id="${esc(m.id)}" placeholder="Descreva o efeito, dano, condição ou regra deste ataque...">${esc(moveDescription(m))}</textarea></div>
  </div>
  <div class="move-library-meta"><span>PP ${Number(m.pp)||0}</span><span>Biblioteca da campanha</span></div>
  <button class="btn primary small move-save" data-move-id="${esc(m.id)}">Salvar ataque</button></details>
 </article>`).join("")||`<div class="empty">Nenhum ataque encontrado.</div>`;
 $$('[data-move-id].move-save').forEach(btn=>btn.onclick=()=>{
   const id=String(btn.dataset.moveId); const get=c=>document.querySelector(`.${c}[data-move-id="${CSS.escape(id)}"]`);
   const nomeOriginal=get('move-original-input')?.value.trim()||""; const nome=get('move-name-input')?.value.trim()||""; const tipo=get('move-type-input')?.value||"Normal"; const pp=Math.max(0,Number(get('move-pp-input')?.value)||0); const descricao=get('move-description-input')?.value.trim()||"";
   if(!nomeOriginal||!nome)return toast("Preencha o nome original e o nome do ataque.");
   const ppInput=get("move-pp-input");if(!ppInput.value.trim()||!ppInput.checkValidity())return toast("Informe um PP máximo válido.");
   state.moveOverrides[id]={nomeOriginal,nome,tipo,pp}; state.moveDescriptions[id]=descricao;
   const m=moves.find(x=>String(x.id)===id); if(m){m.nomeOriginal=nomeOriginal;m.nome=nome;m.tipo=tipo;m.pp=pp;m.descricao=descricao;}
   pokemons.forEach(p=>(p.ataques||[]).forEach(a=>{if(String(a.moveId)===id){a.nomeOriginal=nomeOriginal;a.nome=nome;a.tipo=tipo;a.pp=pp;a.ppMax=pp;a.ppAtual=Math.max(0,Math.min(Number(a.ppAtual??pp)||0,pp));a.descricao=descricao;}}));
   state.pokemonCatalog=pokemons; save(); renderMoves(); renderDex(); renderTeam(); renderPC();renderBattleAll();toast("Ataque salvo com sucesso.");
 });
}

let activeTrainerSubtab="players";
function renderTrainerSubtab(){
 $$("[data-trainer-tab]").forEach(b=>b.classList.toggle("active",b.dataset.trainerTab===activeTrainerSubtab));
 $("#trainerPlayersPanel")?.classList.toggle("hidden",activeTrainerSubtab!=="players");
 $("#trainerHealPanel")?.classList.toggle("hidden",activeTrainerSubtab!=="heal");
 $("#trainerSightPanel")?.classList.toggle("hidden",activeTrainerSubtab!=="sight");
}
function renderTrainerTools(){
 if(!isMaster())return;
 const healItems=[];
 state.trainers.forEach(t=>{normalizeTrainerStorage(t);[...(t.team||[]),...(t.pc||[])].forEach(a=>{const p=pokemonById(a.pokemonId);if(!p)return;const hp=hpData(a,p);healItems.push({t,a,p,hp,loc:(t.team||[]).includes(a)?"Time":"PC"})})});
 $("#trainerHealList").innerHTML=healItems.map(({t,a,p,hp,loc})=>`<label class="trainer-tool-row"><input type="checkbox" class="heal-pokemon-check" value="${esc(t.id)}:${Number(p.id)}"><img src="${p.imagem}" alt="${esc(p.nome)}"><div><strong>${esc(p.nome)} — ${esc(t.name)}</strong><small>${loc} • Nv. ${a.level||1} • HP ${hp.current}/${hp.max}</small></div>${hp.current>=hp.max?`<span class="status caught">Vida cheia</span>`:`<span class="status seen">Ferido</span>`}</label>`).join("")||`<div class="empty">Nenhum Pokémon capturado para curar.</div>`;
 const current=$("#sightPokemon")?.value;
 const dexNumber=p=>{const m=String(p?.numero??"").match(/\d+/);return m?Number(m[0]):Number(p?.id)||Number.MAX_SAFE_INTEGER};
 $("#sightPokemon").innerHTML=[...pokemons].sort((a,b)=>dexNumber(a)-dexNumber(b)||(Number(a.id)||0)-(Number(b.id)||0)).map(p=>`<option value="${p.id}">${esc(p.numero||("#"+String(p.id).padStart(3,"0")))} — ${esc(p.nome)}</option>`).join("");
 if(current&&$("#sightPokemon").querySelector(`option[value="${CSS.escape(current)}"]`))$("#sightPokemon").value=current;
 const pid=Number($("#sightPokemon").value);
 $("#trainerSightList").innerHTML=state.trainers.map(t=>`<label class="trainer-tool-row"><input type="checkbox" class="sight-trainer-check" value="${esc(t.id)}"><div><strong>${esc(t.name)}</strong><small>@${esc(t.username)} • ${(t.visible||[]).includes(pid)?"Já avistou este Pokémon":"Ainda não avistou este Pokémon"}</small></div></label>`).join("")||`<div class="empty">Cadastre jogadores antes de usar esta ferramenta.</div>`;
}
function bindTrainerTools(){
 $$('[data-trainer-tab]').forEach(b=>b.onclick=()=>{activeTrainerSubtab=b.dataset.trainerTab;renderTrainerSubtab();renderTrainerTools()});
 $("#selectAllHeal").onclick=()=>{$$(".heal-pokemon-check").forEach(c=>c.checked=true)};
 $("#healSelectedPokemon").onclick=()=>{const checks=$$(".heal-pokemon-check:checked");if(!checks.length)return toast("Selecione pelo menos um Pokémon para curar.");let count=0;checks.forEach(c=>{const [tid,pid]=c.value.split(":");const t=state.trainers.find(x=>x.id===tid),a=getAssignment(t,pid),p=pokemonById(pid);if(!t||!a||!p)return;a.currentHp=hpMaxForLevel(p,a.level||1);count++});if(!count)return toast("Não foi possível localizar os Pokémon selecionados.");save();renderTrainerTools();renderTrainers();renderTeam();renderPC();renderDex();toast(`${count} Pokémon ${count===1?"curado":"curados"} com vida completa.`)};
 $("#selectAllSight").onclick=()=>{$$(".sight-trainer-check").forEach(c=>c.checked=true)};
 $("#clearAllSight").onclick=()=>{$$(".sight-trainer-check").forEach(c=>c.checked=false)};
 $("#sightPokemon").onchange=()=>renderTrainerTools();
 $("#applySightPokemon").onclick=()=>{const pid=Number($("#sightPokemon").value),p=pokemonById(pid),checks=$$(".sight-trainer-check:checked");if(!p)return toast("Selecione um Pokémon.");if(!checks.length)return toast("Selecione pelo menos um jogador.");let count=0;checks.forEach(c=>{const t=state.trainers.find(x=>x.id===c.value);if(!t)return;t.visible??=[];if(!t.visible.includes(pid))t.visible.push(pid);count++});if(!count)return toast("Não foi possível localizar os jogadores selecionados.");save();renderTrainerTools();renderTrainers();renderDashboard();renderDex();toast(`${p.nome} foi avistado por ${count} ${count===1?"jogador":"jogadores"}.`)};
}
function trainerPokemonCard(t,a){
 const p=pokemonById(a.pokemonId);if(!p)return '';
 const h=hpData(a,p);
 return `<button class="trainer-pokemon-card ${h.current<=0?'fainted':''}" data-pokemon-action="${esc(t.id)}:${p.id}" aria-label="Gerenciar ${esc(p.nome)} de ${esc(t.name)}"><img src="${esc(p.imagem)}" alt=""><strong>${esc(p.nome)}</strong><small>Nv. ${a.level||1} • ${esc(pokemonNature(a.natureza).name)}</small><span class="trainer-pokemon-hp">HP ${h.current}/${h.max}</span><span class="health-bar"><span style="width:${h.pct}%"></span></span></button>`;
}
function renderTrainerCards(){
 if(!isMaster())return;
 state.trainers.forEach(normalizeTrainerStorage);
 const assignments=state.trainers.flatMap(t=>[...t.team,...t.pc]);
 const injured=assignments.filter(a=>{const p=pokemonById(a.pokemonId);return p&&hpData(a,p).current<hpData(a,p).max});
 $('#trainerOverview').innerHTML=`<div><strong>${state.trainers.length}</strong><span>Jogadores</span></div><div><strong>${assignments.length}</strong><span>Pokémon capturados</span></div><div><strong>${injured.length}</strong><span>Pokémon feridos</span></div>`;
 const query=norm($('#trainerSearch').value).trim(),filter=$('#trainerFilter').value||'all';
 const trainers=state.trainers.filter(t=>{
  const all=[...t.team,...t.pc];
  const matches=norm([t.name,t.username,...all.map(a=>pokemonById(a.pokemonId)?.nome||'')].join(' ')).includes(query);
  return matches&&(filter==='all'||filter==='empty'&&!all.length||filter==='injured'&&all.some(a=>{const p=pokemonById(a.pokemonId);return p&&hpData(a,p).current<hpData(a,p).max}));
 });
 $('#trainerResults').textContent=`${trainers.length} de ${state.trainers.length} ${state.trainers.length===1?'jogador':'jogadores'}`;
 const grid=$('#trainerGrid');
 grid.innerHTML=trainers.map(t=>`<article class="card trainer-card"><div class="trainer-card-heading"><div class="trainer-avatar" aria-hidden="true">${esc((t.name||'?').trim().slice(0,1).toUpperCase())}</div><div><h2>${esc(t.name)}</h2><p>@${esc(t.username)}</p></div><button class="btn small" data-editplayer="${esc(t.id)}">Editar acesso</button></div><div class="trainer-counts"><span>👁 ${(t.visible||[]).length} avistados</span><span>🎒 ${t.team.length}/6 no time</span><span>💻 ${t.pc.length} no PC</span></div><div class="trainer-roster-label"><strong>Time</strong><small>Toque em um Pokémon para gerenciar</small></div><div class="trainer-roster">${[0,1,2,3,4,5].map(i=>t.team[i]?trainerPokemonCard(t,t.team[i]):'<div class="trainer-empty-slot"><span>＋</span><small>Espaço livre</small></div>').join('')}</div>${t.pc.length?`<details class="trainer-pc" ${query&&t.pc.some(a=>norm(pokemonById(a.pokemonId)?.nome).includes(query))?'open':''}><summary>💻 Pokémon no PC <span>${t.pc.length}</span></summary><div class="trainer-roster">${t.pc.map(a=>trainerPokemonCard(t,a)).join('')}</div></details>`:''}<div class="trainer-card-footer"><button class="btn primary small" data-addpoke="${esc(t.id)}">+ Adicionar Pokémon</button><button class="btn danger small" data-del="${esc(t.id)}">Excluir jogador</button></div></article>`).join('')||`<div class="empty">${state.trainers.length?'Nenhum jogador encontrado. Tente outro nome ou filtro.':'Cadastre o primeiro jogador para montar o time.'}</div>`;
 $$('[data-del]',grid).forEach(b=>b.onclick=()=>{if(confirm('Excluir este jogador?')){state.trainers=state.trainers.filter(t=>t.id!==b.dataset.del);save();loginUI();renderTrainers();renderDashboard()}});
 $$('[data-editplayer]',grid).forEach(b=>b.onclick=()=>editTrainer(b.dataset.editplayer));
 $$('[data-addpoke]',grid).forEach(b=>b.onclick=()=>openTeamPicker(b.dataset.addpoke));
 $$('[data-pokemon-action]',grid).forEach(b=>b.onclick=()=>openPokemonPlayerAdmin(b.dataset.pokemonAction));
}
function renderTrainers(){
 if(!isMaster()){$('#trainerGrid').innerHTML='<div class="empty">A área de jogadores é exclusiva do Mestre.</div>';$('.trainer-subtabs')?.classList.add('hidden');$('#trainerPlayersPanel')?.classList.remove('hidden');$('#trainerHealPanel')?.classList.add('hidden');$('#trainerSightPanel')?.classList.add('hidden');return}
 renderTrainerCards();$('.trainer-subtabs')?.classList.remove('hidden');renderTrainerTools();renderTrainerSubtab();
}
$('#trainerSearch').oninput=renderTrainerCards;
$('#trainerFilter').onchange=renderTrainerCards;

const personalMovesBusy=new Set();
async function updatePokemonMoves(key,change,message){
 if(!isMaster()||personalMovesBusy.has(key))return;
 const [tid,pid]=key.split(':'),t=state.trainers.find(x=>x.id===tid),a=getAssignment(t,pid),p=pokemonById(pid);if(!t||!a||!p)return;
 personalMovesBusy.add(key);
 const controls=$$('#teachMoveConfirm, [data-forget-move], [data-restore-move]');controls.forEach(b=>b.disabled=true);
 try{
  const data=normalizePersonalMoves(a.personalMoves);change(data,p,a);
  await savePersonalMovesToSupabase(t,a,data);
  save();renderTrainerCards();renderDex();renderTeam();renderPC();renderBattleAll();
  if($('#modal').classList.contains('open')&&$('#personalMovesPanel')?.dataset.pokemonKey===key)openPokemonTeaching(key);
  toast(message);
 }catch(error){console.error('TrainerDex: não foi possível salvar os ataques individuais.',error);toast(personalMovesReady?'Não foi possível salvar os ataques. Tente novamente.':'Execute ENSINAR_ATAQUES_SETUP.sql no Supabase e recarregue o site.');}
 finally{personalMovesBusy.delete(key);controls.forEach(b=>b.disabled=false);}
}
function openPokemonTeaching(key){
 if(!isMaster())return;
 const [tid,pid]=key.split(':'),t=state.trainers.find(x=>x.id===tid),a=getAssignment(t,pid),p=pokemonById(pid);if(!t||!a||!p)return;
 const attacks=assignmentAttacks(p,a),data=normalizePersonalMoves(a.personalMoves);
 const excluded=data.excludedMoves.map(id=>{const m=moveById(id)||(p.ataques||[]).find(x=>personalMoveKey(x)===id);return m?{...m,key:id}:null}).filter(Boolean);
 $('#modalContent').innerHTML=`<div class="modal-head"><div><h2>Ensinar ataques</h2><p class="muted">${esc(p.nome)} • ${esc(t.name)} • Nível ${a.level||1}</p></div><button class="btn" data-close>Fechar</button></div><div id="personalMovesPanel" data-pokemon-key="${esc(key)}"><div class="teach-context"><img src="${esc(p.imagem)}" alt=""><p>As alterações valem para este Pokémon de <strong>${esc(t.name)}</strong>. Os ataques ensinados ficam disponíveis no nível atual.</p></div>${!personalMovesReady?'<div class="permission-box teach-setup">Para salvar os ataques, execute o arquivo <strong>ENSINAR_ATAQUES_SETUP.sql</strong> no Supabase e recarregue o site.</div>':''}<section class="teach-form"><h3>Ensinar um ataque</h3><div class="field"><label for="teachMoveSearch">Buscar na biblioteca</label><input class="input" id="teachMoveSearch" type="search" placeholder="Nome ou tipo do ataque"></div><div class="field"><label for="teachMoveSelect">Ataque</label><select class="select" id="teachMoveSelect"></select></div><div id="teachMovePreview" class="teach-move-preview"></div><button class="btn primary full" id="teachMoveConfirm" ${personalMovesReady?'':'disabled'}>Ensinar</button></section><section><div class="section-title"><div><h3>Ataques disponíveis</h3><p>${attacks.length} ${attacks.length===1?'ataque':'ataques'} no nível ${a.level||1}</p></div></div><div class="personal-attack-list">${attacks.map((m,i)=>`<article class="personal-attack-row"><div><strong>${esc(m.nome||m.nomeOriginal)}</strong><div class="tags">${m.tipo?typeTags(m.tipo):''}<span class="tag">PP ${Number(m.pp)||0}</span><span class="tag">${m.personal?'Ensinado':'Por nível'} • Nv. ${m.nivel||1}</span></div><p>${esc(m.descricao||'Sem descrição cadastrada.')}</p></div><button class="btn danger small" data-forget-move="${i}" ${personalMovesReady?'':'disabled'}>Excluir</button></article>`).join('')||'<div class="empty">Nenhum ataque disponível. Ensine um usando a biblioteca acima.</div>'}</div></section>${excluded.length?`<details class="forgotten-moves"><summary>Ataques removidos (${excluded.length})</summary><p class="muted">Você pode restaurá-los. Os ataques por nível voltam a aparecer quando o Pokémon atingir o nível necessário.</p>${excluded.map((m,i)=>`<div class="personal-attack-row"><strong>${esc(m.nome||m.nomeOriginal)}</strong><button class="btn small" data-restore-move="${i}" ${personalMovesReady?'':'disabled'}>Restaurar</button></div>`).join('')}</details>`:''}<button class="btn full" id="backToPokemonAdmin">← Voltar ao Pokémon</button></div>`;
 showModal();$('[data-close]').onclick=closeModal;$('#backToPokemonAdmin').onclick=()=>openPokemonPlayerAdmin(key);
 const available=moves.filter(m=>!attacks.some(x=>personalMoveKey(x)===String(m.id))).sort((x,y)=>String(x.nome).localeCompare(String(y.nome),'pt-BR'));
 const preview=()=>{const m=moveById($('#teachMoveSelect').value);$('#teachMovePreview').innerHTML=m?`<strong>${esc(m.nome)}</strong><div class="tags">${typeTags(m.tipo)}<span class="tag">PP ${Number(m.pp)||0}</span><span class="tag">Aprende no nível ${a.level||1}</span></div><p>${esc(moveDescription(m)||'Sem descrição cadastrada.')}</p>`:'<p class="muted">Nenhum ataque encontrado ou todos já estão disponíveis.</p>';$('#teachMoveConfirm').disabled=!personalMovesReady||!m;};
 const search=()=>{const query=norm($('#teachMoveSearch').value),current=$('#teachMoveSelect').value;const found=available.filter(m=>norm(`${m.nome} ${m.nomeOriginal} ${m.tipo}`).includes(query));$('#teachMoveSelect').innerHTML=found.map(m=>`<option value="${esc(m.id)}" ${String(m.id)===current?'selected':''}>${esc(m.nome)} — ${esc(m.tipo)} • PP ${Number(m.pp)||0}</option>`).join('');preview();};
 $('#teachMoveSearch').oninput=search;$('#teachMoveSelect').onchange=preview;search();
 $('#teachMoveConfirm').onclick=()=>{const m=moveById($('#teachMoveSelect').value);if(!m||!personalMovesReady)return;return updatePokemonMoves(key,(next,pokemon,assignment)=>{const id=String(m.id);next.excludedMoves=next.excludedMoves.filter(x=>x!==id);const inherited=(pokemon.ataques||[]).find(x=>personalMoveKey(x)===id&&Number(x.nivel)<=Number(assignment.level));if(!inherited&&!next.learnedMoves.some(x=>x.moveId===id&&x.nivel<=Number(assignment.level)))next.learnedMoves=[...next.learnedMoves.filter(x=>x.moveId!==id),{moveId:id,nivel:Number(assignment.level)||1,dano:Math.max(0,Number((pokemon.ataques||[]).find(x=>personalMoveKey(x)===id)?.dano??m.dano)||0)}];},`${m.nome} foi ensinado a ${p.nome}.`);};
 $$('[data-forget-move]').forEach(b=>b.onclick=()=>{const m=attacks[Number(b.dataset.forgetMove)];if(!m)return;return updatePokemonMoves(key,next=>{next.excludedMoves=[...new Set([...next.excludedMoves,personalMoveKey(m)])]},`${m.nome} foi removido deste Pokémon.`)});
 $$('[data-restore-move]').forEach(b=>b.onclick=()=>{const m=excluded[Number(b.dataset.restoreMove)];if(!m)return;return updatePokemonMoves(key,next=>{next.excludedMoves=next.excludedMoves.filter(x=>x!==m.key)},`${m.nome} foi restaurado.`)});
}

function openPokemonPlayerAdmin(key){
 if(!isMaster())return;
 const [tid,pid]=key.split(":");const t=state.trainers.find(x=>x.id===tid),a=getAssignment(t,pid),p=pokemonById(pid);if(!t||!a||!p)return;
 const next=nextEvolutions(p.id),hp=hpData(a,p);
 $("#modalContent").innerHTML=`<div class="modal-head"><h2>${esc(p.nome)}</h2><button class="btn" data-close>Fechar</button></div><p class="muted">${esc(t.name)} • Nível <strong>${a.level}</strong> • ${t.team.includes(a)?"No time":"No PC"}</p><div class="pokemon-detail compact-admin"><img src="${esc(p.imagem)}" alt="${esc(p.nome)}"><div><div class="tags detail-types">${typeTags(p.tipo)}</div><div class="health-wrap detail-health"><div class="health-label"><span>HP atual</span><strong>${hp.current}/${hp.max}</strong></div><div class="health-bar"><span style="width:${hp.pct}%"></span></div></div><p class="muted">${assignmentAttacks(p,a).length} ataques disponíveis neste nível</p><p>Estágio evolutivo: <strong>${p.evolutionStage||1}</strong></p>${next.length?`<div class="field"><label>Próxima evolução</label><select class="select" id="evolveTarget">${next.map(x=>`<option value="${x.id}">${esc(x.nome)} — estágio ${x.evolutionStage||((p.evolutionStage||1)+1)}</option>`).join("")}</select></div>`:`<p class="muted">Este Pokémon não possui evolução cadastrada.</p>`}<div class="field"><label>Natureza</label><select class="select" id="adminPokemonNature">${pokemonNatureOptions(a.natureza)}</select><small class="muted">Editável pelo Mestre e preservada entre Time e PC. Efeito: ${esc(natureEffectsText(a.natureza))}.</small></div><div class="top-actions"><button class="btn primary" id="savePokemonNature">Salvar natureza</button><button class="btn" id="levelUpAction">Subir nível</button><button class="btn primary" id="teachPokemonAction">Ensinar</button>${next.length?`<button class="btn success" id="evolveAction">Evoluir</button>`:""}${getPokemonNote(t,p.id).trim()?`<button class="btn" id="viewPokemonNote">Ver anotações</button>`:`<button class="btn" id="viewPokemonNote">Ver anotações</button>`}</div></div></div>`;
 showModal();$("[data-close]").onclick=closeModal;
 $("#savePokemonNature").onclick=()=>{a.natureza=pokemonNature($("#adminPokemonNature").value).id;save();closeModal();renderTrainers();renderDashboard();renderDex();renderTeam();renderPC();toast(`Natureza de ${p.nome} definida como ${pokemonNatureLabel(a.natureza)}.`)};
 $("#levelUpAction").onclick=()=>{closeModal();openLevelUp(key)};
 $("#teachPokemonAction").onclick=()=>openPokemonTeaching(key);
 if(next.length)$("#evolveAction").onclick=()=>evolvePlayerPokemon(t,a,p,Number($("#evolveTarget").value));
 $("#viewPokemonNote").onclick=()=>{const note=getPokemonNote(t,p.id);$("#modalContent").innerHTML=`<div class="modal-head"><h2>Anotações — ${esc(p.nome)}</h2><button class="btn" data-close>Fechar</button></div><p class="muted">Anotações feitas por ${esc(t.name)}.</p><div class="note-view">${note.trim()?esc(note).replace(/\n/g,"<br>"):`<span class="muted">Nenhuma anotação feita para este Pokémon.</span>`}</div>`;showModal();$("[data-close]").onclick=closeModal};
}
function openLevelUp(key){
 if(!isMaster())return;
 const [tid,pid]=key.split(":");const t=state.trainers.find(x=>x.id===tid),a=getAssignment(t,pid),p=pokemonById(pid);if(!t||!a||!p)return;
 $("#modalContent").innerHTML=`<div class="modal-head"><h2>Subir nível — ${esc(p.nome)}</h2><button class="btn" data-close>Fechar</button></div><p class="muted">${esc(t.name)} está com este Pokémon no nível <strong>${a.level}</strong>. Escolha o novo nível.</p><div class="form-grid"><div class="field"><label>Novo nível</label><input class="input" id="levelUpValue" type="number" min="1" max="100" value="${a.level}"></div><button class="btn primary" id="confirmLevelUp">Salvar novo nível</button></div>`;
 showModal();$("[data-close]").onclick=closeModal;
 $("#confirmLevelUp").onclick=()=>{const level=Math.max(1,Math.min(100,Number($("#levelUpValue").value)||a.level));if(level<a.level)return toast("O novo nível não pode ser menor que o atual.");const oldMax=hpMaxForLevel(p,a.level),oldCurrent=Math.max(0,Number(a.currentHp??oldMax));a.level=level;(state.encounter.combatants||[]).filter(c=>c.kind==='player'&&c.trainerId===t.id&&Number(c.pokemonId)===Number(p.id)).forEach(c=>c.level=level);const newMax=hpMaxForLevel(p,level);const gained=Math.max(0,newMax-oldMax);a.currentHp=Math.min(newMax,oldCurrent+gained);save();closeModal();renderTrainers();renderDashboard();renderDex();renderTeam();toast(`${p.nome} agora está no nível ${level}. A vida máxima passou para ${newMax} HP.`)};
}
const evolutionsInProgress=new Set();
async function evolvePlayerPokemon(t,a,current,targetId){
 if(!isMaster())return;const key=`${t.id}:${current.id}`;if(evolutionsInProgress.has(key))return;evolutionsInProgress.add(key);try{
 if(getAssignment(t,targetId))return toast("O jogador já possui esta evolução. A operação foi cancelada para evitar duplicar o Pokémon.");
 const target=pokemonById(targetId);if(!target)return toast("Evolução não encontrada.");if(Number(target.evolvesFromId)!==Number(current.id))return toast("Essa evolução não pertence a este estágio.");
 if(a.personalMoves?.learnedMoves?.length||a.personalMoves?.excludedMoves?.length){try{await savePersonalMovesToSupabase(t,{...a,pokemonId:target.id},a.personalMoves)}catch(error){console.error(error);return toast('Não foi possível preservar os ataques na evolução. Tente novamente.')}}
 const oldId=Number(current.id);const oldHp=hpData(a,current);const ratio=oldHp.max?oldHp.current/oldHp.max:1;a.pokemonId=Number(target.id);a.status="captured";a.natureza=pokemonNature(a.natureza).id;a.abilityIndexes=[];a.currentHp=Math.round(hpMaxForLevel(target,a.level)*ratio);
 t.captured=[...new Set(t.captured.map(id=>Number(id)===oldId?Number(target.id):Number(id)))];
 if(!t.visible.includes(Number(target.id)))t.visible.push(Number(target.id));
 t.pokemonNotes??={};if(t.pokemonNotes[String(oldId)]){t.pokemonNotes[String(target.id)]=[t.pokemonNotes[String(target.id)],t.pokemonNotes[String(oldId)]].filter(Boolean).join('\n\n');delete t.pokemonNotes[String(oldId)];}
 (state.encounter.combatants||[]).filter(c=>c.kind==='player'&&c.trainerId===t.id&&Number(c.pokemonId)===oldId).forEach(c=>{c.pokemonId=target.id;c.level=a.level;});
t.pendingEvolutionEvents??=[];
t.pendingEvolutionEvents.push({id:uid(),oldPokemonId:oldId,newPokemonId:Number(target.id),level:a.level,consumed:false});
 state.pokemonCatalog=pokemons;save();closeModal();renderTrainers();renderDashboard();renderDex();renderTeam();renderPC();toast(`${current.nome} evoluiu para ${target.nome}! O nível ${a.level} foi mantido.`);
 }finally{evolutionsInProgress.delete(key)}
}
function editTrainer(id){if(!isMaster())return;const t=state.trainers.find(x=>x.id===id);$("#modalContent").innerHTML=`<div class="modal-head"><h2>Editar acesso</h2><button class="btn" data-close>Fechar</button></div><div class="form-grid"><div class="field"><label>Nome</label><input class="input" id="trName" value="${esc(t.name)}"></div><div class="field"><label>Usuário</label><input class="input" id="trUser" value="${esc(t.username)}"></div><div class="field"><label>Senha</label><input class="input" id="trPass" value="${esc(t.password)}"></div><button class="btn primary" id="saveTrainer">Salvar</button></div>`;showModal();$("[data-close]").onclick=closeModal;$("#saveTrainer").onclick=()=>{const name=$("#trName").value.trim(),username=$("#trUser").value.trim(),password=$("#trPass").value;if(!name||!username||!password)return toast("Preencha todos os campos.");if(state.trainers.some(x=>x.id!==t.id&&norm(x.username)===norm(username)))return toast("Este usuário já existe.");t.name=name;t.username=username;t.password=password;save();loginUI();closeModal();renderTrainers();renderDashboard();toast("Acesso atualizado.")}}
$("#addTrainer").onclick=()=>{if(!isMaster())return;$("#modalContent").innerHTML=`<div class="modal-head"><h2>Novo jogador</h2><button class="btn" data-close>Fechar</button></div><div class="form-grid"><div class="field"><label>Nome</label><input class="input" id="trName"></div><div class="field"><label>Usuário</label><input class="input" id="trUser"></div><div class="field"><label>Senha</label><input class="input" id="trPass" value="1234"></div><button class="btn primary" id="saveTrainer">Criar jogador</button></div>`;showModal();$("[data-close]").onclick=closeModal;$("#saveTrainer").onclick=()=>{const name=$("#trName").value.trim(),username=$("#trUser").value.trim(),password=$("#trPass").value;if(!name||!username||!password)return toast("Preencha todos os campos.");if(state.trainers.some(t=>norm(t.username)===norm(username)))return toast("Este usuário já existe.");state.trainers.push({id:uid(),name,username,password,team:[],pc:[],captured:[],visible:[]});save();loginUI();closeModal();renderTrainers();renderDashboard();toast("Jogador criado.")}};

bindTrainerTools();
function openTeamPicker(tid){
 if(!isMaster())return;const t=state.trainers.find(x=>x.id===tid);if(!t)return;
 $("#modalContent").innerHTML=`<div class="modal-head"><h2>Adicionar Pokémon para ${esc(t.name)}</h2><button class="btn" data-close>Fechar</button></div><p class="muted">Avistados são ilimitados e não ocupam o time. Capturados ocupam o time até completar 6; os demais vão automaticamente para o PC.</p><div class="toolbar"><input class="input" id="teamSearch" placeholder="Buscar Pokémon..."></div><div class="pokemon-grid" id="teamPicker"></div>`;
 showModal();$("[data-close]").onclick=closeModal;
 const render=()=>$("#teamPicker").innerHTML=pokemons.filter(p=>norm(`${p.nome} ${p.numero} ${p.tipo}`).includes(norm($("#teamSearch").value).trim())).map(p=>{const id=Number(p.id),seen=t.visible.includes(id),caught=t.captured.includes(id);return `<button class="pokemon" data-pick="${p.id}"><img src="${p.imagem}"><div><small>${p.numero}</small><h3>${esc(p.nome)}</h3><span class="status ${caught?"caught":seen?"seen":""}">${caught?"Já capturado":seen?"Já avistado — clique para capturar":"Novo para o jogador"}</span></div></button>`}).join("")||`<div class="empty">Nenhum Pokémon encontrado.</div>`;
 $("#teamSearch").oninput=render;render();
 $('#teamPicker').onclick=event=>{const b=event.target.closest('[data-pick]');if(!b||!$('#teamPicker')?.contains(b))return;
  const p=pokemonById(Number(b.dataset.pick)),id=Number(p.id),seen=t.visible.includes(id),caught=t.captured.includes(id);
  if(caught)return toast(`${p.nome} já está capturado por ${t.name}. Ele pode estar no time ou no PC.`);
  $("#modalContent").innerHTML=`<div class="modal-head"><h2>${seen?"Capturar":"Adicionar"} ${esc(p.nome)}</h2><button class="btn" data-close>Cancelar</button></div><p class="muted">${seen?"Este Pokémon já foi avistado. Ao capturá-lo, ele entrará no time se houver espaço; caso contrário, irá para o PC.":"Defina como o Pokémon foi descoberto pelo jogador. Avistados não ocupam o time e podem ser ilimitados. Capturados entram no time até o limite de 6; os excedentes ficam no PC."}</p><div class="form-grid"><div class="field"><label>Nível do Pokémon</label><input class="input" id="assignLevel" type="number" min="1" max="100" value="${getAssignment(t,id)?.level||1}"></div>${seen?`<input type="hidden" id="assignStatus" value="captured">`:`<div class="field"><label>Como o jogador recebeu?</label><select class="select" id="assignStatus"><option value="seen">Avistado — ilimitado e não ocupa o time</option><option value="captured">Capturado — vai para o time se houver espaço; excedentes vão para o PC</option></select></div>`}<div class="field"><label>Natureza</label><select class="select" id="assignNature">${pokemonNatureOptions(getAssignment(t,id)?.natureza)}</select><small class="muted">A natureza é individual deste Pokémon para este jogador.</small></div><div class="field ability-assignment-field"><label>Habilidades que o Pokémon terá</label><p class="field-help">Escolha nenhuma, uma ou as duas habilidades. Essa escolha fica exclusiva para este jogador.</p><div class="ability-assignment-list">${normalizeAbilities(p).map((ab,i)=>`<label class="ability-check"><input type="checkbox" class="assign-ability" value="${i}" ${selectedAbilityIndexes(getAssignment(t,id)).includes(i)?"checked":""} ${abilityUnavailable(ab)?"disabled":""}><span><strong>${esc(ab.nome||`Habilidade ${i+1} não cadastrada`)}${i===1&&!abilityUnavailable(ab)?" (Oculta)":""}</strong><small>${esc(ab.descricao||"")}</small></span></label>`).join("")}</div></div><button class="btn primary" id="confirmAssign">${seen?"Confirmar captura":"Adicionar"}</button></div>`;
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
      const assignment={pokemonId:id,level,status:"captured",currentHp:hpMaxForLevel(p,level),abilityIndexes,natureza,personalMoves:structuredClone(personalMovesRecords.get(personalMovesRecordKey(t.id,id))||{learnedMoves:[],excludedMoves:[]})};
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
 };
}
function swapTeamAndPc(t,teamId,pcId){
 if(!t||(!isMaster()&&me()?.id!==t.id))return false;
 if(pokemonIsInBattle(t,teamId)||pokemonIsInBattle(t,pcId)){toast('Troque o Pokémon na batalha antes de movê-lo entre Time e PC.');return false;}
 const ti=t.team.findIndex(a=>Number(a.pokemonId)===Number(teamId));
 const pi=t.pc.findIndex(a=>Number(a.pokemonId)===Number(pcId));
 if(ti<0||pi<0)return false;
 const tmp=t.team[ti];t.team[ti]=t.pc[pi];t.pc[pi]=tmp;
 normalizeTrainerStorage(t);save();
 return true;
}
function pokemonIsInBattle(t,pid){return !!(state.encounter.battleActive&&state.encounter.combatants.some(c=>c.kind==='player'&&c.trainerId===t.id&&Number(c.pokemonId)===Number(pid)));}
function moveStoredPokemon(t,pid,fromPc){
 if(!t||(!isMaster()&&me()?.id!==t.id))return false;
 normalizeTrainerStorage(t);if(pokemonIsInBattle(t,pid)){toast('Troque o Pokémon na batalha antes de movê-lo entre Time e PC.');return false;}
 const origin=fromPc?t.pc:t.team,destination=fromPc?t.team:t.pc,index=origin.findIndex(a=>Number(a.pokemonId)===Number(pid));
 if(index<0||fromPc&&destination.length>=6)return false;
 destination.push(origin.splice(index,1)[0]);save();return true;
}
function refreshStorage(){closeModal();renderTeam();renderPC();renderDashboard();renderDex();if(isMaster())renderTrainers();}
function openSwapPokemon(t,sourceId,fromPc){
 if(!t||(!isMaster()&&me()?.id!==t.id))return;
 const source=(fromPc?t.pc:t.team).find(a=>Number(a.pokemonId)===Number(sourceId));if(!source)return;
 if(pokemonIsInBattle(t,sourceId))return toast('Troque o Pokémon na batalha antes de movê-lo entre Time e PC.');
 const options=fromPc?t.team:t.pc,canTransfer=!fromPc||t.team.length<6;
 $('#modalContent').innerHTML=`<div class="modal-head"><h2>Gerenciar Time e PC</h2><button class="btn" data-close>Fechar</button></div><p class="muted">${esc(pokemonById(sourceId)?.nome)} está ${fromPc?'no PC':'no time'}. ${fromPc?'O time pode ter até 6 Pokémon.':'Você pode guardar este Pokémon no PC ou trocar com outro.'}</p>${canTransfer?`<button class="btn primary full" id="directStorageTransfer">${fromPc?'🎒 Colocar no time':'💻 Guardar no PC'}</button>`:'<div class="permission-box">Seu time está completo. Escolha um Pokémon abaixo para trocar.</div>'}${options.length?`<h3>Trocar com um Pokémon ${fromPc?'do time':'do PC'}</h3><div class="pokemon-grid swap-grid">${options.map(a=>{const p=pokemonById(a.pokemonId);if(!p)return '';const hp=hpData(a,p);return `<button class="pokemon" data-swap-target="${p.id}" ${pokemonIsInBattle(t,p.id)?'disabled':''}><img src="${esc(p.imagem)}" alt=""><div><h3>${esc(p.nome)}</h3><small>Nv. ${a.level||1} • HP ${hp.current}/${hp.max}${pokemonIsInBattle(t,p.id)?' • Em batalha':''}</small></div></button>`}).join('')}</div>`:''}`;
 showModal();$('[data-close]').onclick=closeModal;
 const direct=$('#directStorageTransfer');if(direct)direct.onclick=()=>{if(moveStoredPokemon(t,sourceId,fromPc)){refreshStorage();toast(fromPc?'Pokémon colocado no time.':'Pokémon guardado no PC.')}};
 $$('[data-swap-target]').forEach(b=>b.onclick=()=>{const target=Number(b.dataset.swapTarget);if(swapTeamAndPc(t,fromPc?target:sourceId,fromPc?sourceId:target)){refreshStorage();toast('Troca concluída.')}});
}
function renderStorage(location){
 const master=isMaster(),t=me(),grid=$(`#${location}Grid`);if(!grid)return;if(master||!t){grid.innerHTML='';return;}
 normalizeTrainerStorage(t);const source=location==='team'?t.team:t.pc,search=$(`#${location}CollectionSearch`),filter=$(`#${location}CollectionFilter`),q=norm(search?.value||'').trim(),status=filter?.value||'all';
 const entries=source.map(a=>({a,p:pokemonById(a.pokemonId)})).filter(x=>x.p).map(x=>({...x,hp:hpData(x.a,x.p)}));
 const list=entries.filter(({p,a,hp})=>norm(`${p.nome} ${p.numero} ${p.tipo} ${pokemonNature(a.natureza).name}`).includes(q)&&(status==='all'||status==='injured'&&hp.current<hp.max||status==='fainted'&&hp.current===0||status==='healthy'&&hp.current===hp.max));
 const summary=$(`#${location}Summary`);if(summary)summary.innerHTML=`<span><strong>${entries.length}${location==='team'?'/6':''}</strong> Pokémon</span><span><strong>${entries.filter(x=>x.hp.current<x.hp.max).length}</strong> Feridos</span><span><strong>${entries.filter(x=>x.hp.current===0).length}</strong> Sem HP</span>`;
 grid.innerHTML=list.map(({a,p,hp})=>`<article class="pokemon team-card ${location==='pc'?'pc-card':''} ${hp.current===0?'fainted':''}" data-${location==='team'?'team':'pc'}-pokemon="${p.id}" role="button" tabindex="0" aria-label="Abrir ficha de ${esc(p.nome)}"><img src="${esc(p.imagem)}" alt=""><div><h3>${esc(p.nome)}</h3><span class="team-level">Nível ${a.level||1}</span><div class="tags">${typeTags(p.tipo)}<span class="tag">${esc(pokemonNature(a.natureza).name)}</span></div><div class="health-wrap"><div class="health-label"><span>HP</span><strong>${hp.current}/${hp.max}</strong></div><div class="health-bar"><span style="width:${hp.pct}%"></span></div></div></div></article>`).join('')||`<div class="empty">${source.length?'Nenhum Pokémon encontrado com estes filtros.':location==='team'?'Seu time está vazio. Abra o PC para colocar um Pokémon no time.':'Seu PC está vazio. Você pode guardar Pokémon do time aqui.'}</div>`;
 $(`#${location}Intro`).textContent=location==='team'?`${source.length}/6 no time • ${t.pc.length} no PC. Toque em um Pokémon para abrir sua ficha.`:`${source.length} Pokémon no PC. Toque em um Pokémon para gerenciar o envio ao time.`;
 const count=$(`#${location}CollectionCount`);if(count)count.textContent=`${list.length} de ${entries.length} Pokémon`;
}
function renderTeam(){renderStorage('team')}
function renderPC(){renderStorage('pc')}
['team','pc'].forEach(location=>{$(`#${location}CollectionSearch`).oninput=()=>renderStorage(location);$(`#${location}CollectionFilter`).onchange=()=>renderStorage(location)});
function ensureEvolutionOverlay(){
 let overlay=$("#evolutionOverlay");
 if(overlay) return overlay;
 // Compatibilidade com versões antigas/cache do navegador: cria a camada caso o HTML antigo ainda esteja carregado.
 document.body.insertAdjacentHTML("beforeend",`<div class="evolution-overlay hidden" id="evolutionOverlay" aria-hidden="true"><div class="evolution-stage"><div class="evolution-glow"></div><div class="evolution-old"><img id="evolutionOldImage" src="" alt="Pokémon antes da evolução"><p id="evolutionOldName"></p></div><div class="evolution-flash"></div><div class="evolution-new"><img id="evolutionNewImage" src="" alt="Pokémon evoluído"><p>✨ Evolução concluída!</p><h2 id="evolutionNewName"></h2></div></div></div>`);
 return $("#evolutionOverlay");
}
function cancelEvolutionAnimation(){(window.__evolutionTimers||[]).forEach(clearTimeout);window.__evolutionTimers=[];window.__evolutionAnimating=false;const overlay=$('#evolutionOverlay');if(overlay){overlay.classList.add('hidden');overlay.classList.remove('show-old','flash','show-new','fade-out');overlay.setAttribute('aria-hidden','true')}}
function evolutionTimeout(callback,delay){window.__evolutionTimers??=[];window.__evolutionTimers.push(setTimeout(callback,delay));}
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
 const finish=()=>{overlay.classList.add("fade-out");evolutionTimeout(()=>{overlay.classList.add("hidden");overlay.classList.remove("show-old","flash","show-new","fade-out");overlay.setAttribute("aria-hidden","true");window.__evolutionAnimating=false;playNextEvolution()},550)};
 evolutionTimeout(()=>{overlay.classList.remove("show-old");overlay.classList.add("flash")},1700);
 evolutionTimeout(()=>{overlay.classList.remove("flash");overlay.classList.add("show-new")},2550);
 evolutionTimeout(finish,5200);
}
/* Legacy encounter handlers removed: v14 battle module binds controls after the page is rendered. */
function renderNotes(){
 const box=$('#notesList');if(!isMaster()){box.innerHTML='';return;}
 const q=norm($('#notesSearch').value).trim(),order=$('#notesSort').value||'recent';
 const notes=state.notes.filter(n=>norm(`${n.title} ${n.body}`).includes(q)).sort((a,b)=>order==='title'?String(a.title).localeCompare(String(b.title),'pt-BR'):(Date.parse(b.updated)||0)-(Date.parse(a.updated)||0));
 $('#notesCount').textContent=`${notes.length} de ${state.notes.length} notas`;
 box.innerHTML=notes.map(n=>`<article class="card campaign-note"><div class="section-title"><div><h2>${esc(n.title)}</h2><p>${Number.isFinite(Date.parse(n.updated))?new Date(n.updated).toLocaleString('pt-BR'):'Sem data registrada'}</p></div><button class="btn small" data-note-edit="${esc(n.id)}">Editar</button></div><p class="note-body">${esc(n.body)}</p><div class="note-footer"><button class="btn danger small" data-note-del="${esc(n.id)}">Excluir nota</button></div></article>`).join('')||`<div class="empty">${state.notes.length?'Nenhuma nota encontrada. Tente outro termo.':'Registre locais, personagens e acontecimentos da campanha.'}</div>`;
 $$('[data-note-del]',box).forEach(b=>b.onclick=()=>{if(!isMaster()||!confirm('Excluir esta nota?'))return;state.notes=state.notes.filter(n=>n.id!==b.dataset.noteDel);save();renderNotes();renderDashboard()});
 $$('[data-note-edit]',box).forEach(b=>b.onclick=()=>openNote(state.notes.find(n=>n.id===b.dataset.noteEdit)));
}
function openNote(n=null){
 if(!isMaster())return;
 $('#modalContent').innerHTML=`<div class="modal-head"><h2>${n?'Editar nota':'Nova nota'}</h2><button class="btn" data-close>Fechar</button></div><div class="form-grid"><div class="field"><label for="noteTitle">Título</label><input class="input" id="noteTitle" maxlength="160" value="${esc(n?.title||'')}" placeholder="Ex.: Vila de Pallet — primeira missão"></div><div class="field"><label for="noteBody">Conteúdo</label><textarea class="textarea note-editor" id="noteBody" placeholder="Descreva personagens, pistas e acontecimentos…">${esc(n?.body||'')}</textarea></div><button class="btn primary" id="saveNote">Salvar nota</button></div>`;
 showModal();$('[data-close]').onclick=closeModal;
 $('#saveNote').onclick=()=>{if(!isMaster())return;const title=$('#noteTitle').value.trim();if(!title)return toast('Informe um título.');const item=n||{id:uid()};item.title=title;item.body=$('#noteBody').value;item.updated=new Date().toISOString();if(!n)state.notes.unshift(item);save();closeModal();renderNotes();renderDashboard();toast('Nota atualizada.');};
}
$('#notesSearch').oninput=renderNotes;$('#notesSort').onchange=renderNotes;
$("#addNote").onclick=()=>openNote();
let modalReturnFocus=null;
function showModal(){const modal=$('#modal');if(!modal.classList.contains('open'))modalReturnFocus=document.activeElement;modal.classList.add('open');document.body.classList.add('modal-open');$('#modalContent input:not([type="hidden"]):not([type="checkbox"]), #modalContent select, #modalContent textarea, #modalContent [data-close]')?.focus?.();}
function closeModal(){clearTimeout(window.__noteTimer);$("#modal").classList.remove("open");document.body.classList.remove("modal-open");if(modalReturnFocus?.isConnected)modalReturnFocus.focus?.();modalReturnFocus=null}
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&$("#modal").classList.contains("open"))closeModal()});$("#modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
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
   $("#masterCurrentPassword").value="";$("#masterNewPassword").value="";$("#masterConfirmPassword").value="";
   toast("Senha alterada. Aguarde o indicador de salvamento confirmar.");
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

function battleParticipantById(id){return (state.encounter.combatants||[]).find(c=>c.id===id)}
function battlePokemonForParticipant(c){return c?.pokemonId?pokemonById(c.pokemonId):null}
function battleIsPlayerIn(){const t=me();return !!(t&&state.encounter.battleActive&&state.encounter.combatants.some(c=>c.kind==='player'&&c.trainerId===t.id))}
function battleLog(msg){state.encounter.battleLog??=[];state.encounter.battleLog.unshift({id:uid(),at:new Date().toISOString(),msg});state.encounter.battleLog=state.encounter.battleLog.slice(0,80)}
function battleSort(){
 const activeId=state.encounter.activeParticipantId;
 state.encounter.combatants.sort((a,b)=>Number(b.initiative||0)-Number(a.initiative||0));
 if(activeId&&state.encounter.combatants.some(c=>c.id===activeId))state.encounter.activeParticipantId=activeId;
 else if(state.encounter.combatants.length)state.encounter.activeParticipantId=state.encounter.combatants[0].id;
 else state.encounter.activeParticipantId=null;
 state.encounter.active=Math.max(0,state.encounter.combatants.findIndex(c=>c.id===state.encounter.activeParticipantId));
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
function battleHpInfo(c){
 if(c?.kind==='player'){
  const t=state.trainers.find(x=>x.id===c.trainerId),a=t?.team?.find(x=>Number(x.pokemonId)===Number(c.pokemonId)),p=battlePokemonForParticipant(c);
  if(!a||!p)return {current:0,max:1,pct:0};
  const h=hpData(a,p);return h;
 }
 const max=Math.max(1,Number(c?.maxHp)||Number(battlePokemonForParticipant(c)?.hp)||1),current=Math.max(0,Math.min(max,Number(c?.currentHp??max)));return {current,max,pct:Math.round(current/max*100)};
}
function battleName(c){return c?.name||battlePokemonForParticipant(c)?.nome||"Combatente"}
function battleAvatar(c){return battlePokemonForParticipant(c)?.imagem||publicImageUrl("assets/trainerdex-home.png")}

$('#clearDexFilters').onclick=()=>{$('#dexSearch').value='';$('#dexStatus').value='all';$('#dexTypeFilter').value='all';renderDex()};
$('#clearMoveFilters').onclick=()=>{$('#moveSearch').value='';$('#moveTypeFilter').value='all';renderMoves()};
$("#dexSearch").oninput=renderDex;$("#dexStatus").onchange=renderDex;$("#dexTypeFilter").onchange=renderDex;
$("#moveSearch").oninput=renderMoves;$("#moveTypeFilter").onchange=renderMoves;

function setupNav(){
 const master=session?.role==="master";
 const playerBattle=!master&&battleIsPlayerIn();
 const items=master
   ?[["dashboard","🏠 Visão geral"],["pokedex","📖 Pokédex"],["moves","⚔️ Ataques"],["encounter","⚔️ Batalha"],["trainers","👥 Jogadores"],["notes","📝 Notas"],["settings","⚙️ Configurações"]]
   :[["dashboard","🏠 Início"],["pokedex","📖 Minha Pokédex"],["team","🎒 Meu Time"],["pc","💻 Meu PC"]].concat(playerBattle?[["encounter","⚔️ Batalha"]]:[]);
 const desktop=$("#desktopNav"),mobile=$("#mobileNav");
 if(desktop)desktop.innerHTML=items.map(x=>`<button data-page="${x[0]}">${x[1]}</button>`).join("");
 if(mobile)mobile.innerHTML=items.map(x=>`<button data-page="${x[0]}">${x[1].split(" ")[0]}<br>${x[1].split(" ").slice(1).join(" ")}</button>`).join("")+`<button class="mobile-logout" data-mobile-logout>🚪<br>Sair</button>`;
 $$("[data-page]").forEach(b=>b.onclick=()=>nav(b.dataset.page));
 const logout=$("[data-mobile-logout]");
 if(logout)logout.onclick=()=>$("#logout")?.click();
}
function allowedPages(){return isMaster()?['dashboard','pokedex','moves','encounter','trainers','notes','settings']:session?['dashboard','pokedex','team','pc',...(battleIsPlayerIn()?['encounter']:[])]:[];}
function nav(page){
 if(!allowedPages().includes(page))page='dashboard';
 closeModal();
 $$(".page").forEach(x=>x.classList.toggle("active",x.id==="page-"+page));
 $$("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
 history.replaceState(null,"","#"+page);
 if(page==="team"&&!isMaster())setTimeout(playNextEvolution,180);
 if(page==="encounter")setTimeout(renderBattleAll,0);
}
function openBattleStart(){
 if(!isMaster())return;
 const e=state.encounter,reconfigure=!!e.battleActive;
 const rows=state.trainers.map((t,i)=>{
  const c=(e.combatants||[]).find(x=>x.kind==='player'&&x.trainerId===t.id);
  return `<div class="battle-start-row" data-battle-trainer="${i}"><label class="battle-start-player"><input type="checkbox" data-battle-include ${c?'checked':''}><span>${esc(t.name)}</span></label><div class="field"><label for="battleInit${i}">Iniciativa</label><input class="input battle-init" id="battleInit${i}" type="number" step="1" value="${Number(c?.initiative)||0}"></div></div>`;
 }).join('');
 $("#modalContent").innerHTML=`<div class="modal-head"><h2>${reconfigure?'Reconfigurar batalha':'Iniciar batalha'}</h2><button class="btn" data-close>Fechar</button></div><div class="form-grid"><div class="field"><label for="battleNameInput">Nome da batalha</label><input class="input" id="battleNameInput" maxlength="120" value="${esc(reconfigure?e.battleName||'Batalha':'Batalha')}"></div><p class="muted">Selecione os jogadores e informe a iniciativa. Cada jogador escolherá um Pokémon do seu time. Você também pode iniciar sem jogadores e adicionar Pokémon NPC.</p><div>${rows||'<p class="muted">Nenhum jogador cadastrado. Você pode adicionar NPCs depois de iniciar.</p>'}</div>${reconfigure?'<p class="muted">Os NPCs, as escolhas dos jogadores mantidos, a rodada e as notas serão preservados.</p>':''}<button class="btn primary" id="confirmStartBattle">${reconfigure?'Salvar batalha':'Iniciar batalha'}</button></div>`;
 showModal();$('[data-close]').onclick=closeModal;
 $("#confirmStartBattle").onclick=()=>{
  if(!isMaster())return;
  const selected=$$('[data-battle-trainer]').filter(row=>$('[data-battle-include]',row).checked);
  if(selected.some(row=>{const input=$('.battle-init',row);return !input.value.trim()||!input.checkValidity()||!Number.isFinite(Number(input.value))}))return toast('Informe uma iniciativa válida para cada jogador selecionado.');
  const players=selected.map(row=>{
   const t=state.trainers[Number(row.dataset.battleTrainer)];
   const existing=reconfigure?(e.combatants||[]).find(c=>c.kind==='player'&&c.trainerId===t.id):null;
   return {...(existing||{id:uid(),kind:'player',trainerId:t.id,pokemonId:null}),name:t.name,initiative:Number($('.battle-init',row).value)};
  });
  const npcs=reconfigure?(e.combatants||[]).filter(c=>c.kind==='npc'):[];
  state.encounter={...e,battleActive:true,battleId:reconfigure?(e.battleId||uid()):uid(),battleName:$('#battleNameInput').value.trim()||'Batalha',round:reconfigure?Math.max(1,Number(e.round)||1):1,active:0,activeParticipantId:reconfigure?e.activeParticipantId:null,combatants:[...players,...npcs],notes:e.notes||'',battleLog:reconfigure?(e.battleLog||[]):[]};
  battleSort();battleLog(`${reconfigure?'Batalha reconfigurada':'Batalha iniciada'}: ${state.encounter.battleName}.`);
  save();closeModal();setupNav();renderBattleAll();nav('encounter');toast(reconfigure?'Batalha atualizada.':'Batalha iniciada.');
 };
}
function addNpcBattle(){
 if(!isMaster()||!state.encounter.battleActive)return;
 if(!pokemons.length)return toast('Aguarde o carregamento da Pokédex para adicionar um NPC.');
 const opts=pokemons.map(p=>`<option value="${p.id}">${esc(p.numero)} — ${esc(p.nome)}</option>`).join("");
 const base=pokemons[0];
 $("#modalContent").innerHTML=`<div class="modal-head"><h2>Adicionar Pokémon NPC</h2><button class="btn" data-close>Fechar</button></div><div class="form-grid"><div class="field"><label>Pokémon da Pokédex</label><select class="select" id="npcPokemon">${opts}</select></div><div class="inline-fields"><div class="field"><label>Nível</label><input class="input" id="npcLevel" type="number" min="1" max="100" value="${base?.nivel||1}"></div><div class="field"><label>Iniciativa</label><input class="input" id="npcInit" type="number" value="10"></div></div><div class="inline-fields"><div class="field"><label>HP máximo</label><input class="input" id="npcHp" type="number" min="1" value="${hpMaxForLevel(base,Number(base?.nivel)||1)}"></div><div class="field"><label>Nome do NPC</label><input class="input" id="npcName" value="${esc(base?.nome||"NPC")}"></div></div><div class="field"><label>Atributos</label><div class="inline-fields">${DND_ATTRIBUTES.map(([k,label])=>`<input class="input npc-attr" data-attr="${k}" type="number" min="1" max="30" placeholder="${label}" value="${Number(normalizePokemonStats(base?.status||{})[k])||10}">`).join("")}</div></div><div class="field"><div class="section-title"><div><label>Ataques do NPC</label><p class="muted">Os ataques são carregados da Pokédex conforme o nível escolhido.</p></div></div><div id="npcAttackPreview">${npcAttacksPreviewHtml(base,Number(base?.nivel)||1)}</div></div><button class="btn primary" id="saveNpcBattle">Adicionar NPC</button></div>`;
 showModal();$('[data-close]').onclick=closeModal;
 const sync=()=>{const p=pokemonById(Number($("#npcPokemon").value));if(!p)return;const level=Math.max(1,Math.min(100,Number($("#npcLevel").value)||1));$("#npcName").value=p.nome;$("#npcHp").value=hpMaxForLevel(p,level);const npcStats=normalizePokemonStats(p.status||{});$$(".npc-attr").forEach(i=>{i.value=npcStats[i.dataset.attr]??10});$("#npcAttackPreview").innerHTML=npcAttacksPreviewHtml(p,level)};
 $("#npcPokemon").onchange=sync;$("#npcLevel").oninput=()=>{const p=pokemonById(Number($("#npcPokemon").value));if(p)$("#npcAttackPreview").innerHTML=npcAttacksPreviewHtml(p,Math.max(1,Math.min(100,Number($("#npcLevel").value)||1)))};
 $("#saveNpcBattle").onclick=()=>{const p=pokemonById(Number($("#npcPokemon").value)),level=Math.max(1,Math.min(100,Number($("#npcLevel").value)||1)),max=Math.max(1,Number($("#npcHp").value)||hpMaxForLevel(p,level));state.encounter.combatants.push({id:uid(),kind:'npc',name:$("#npcName").value.trim()||p.nome,initiative:Number($("#npcInit").value)||0,pokemonId:p.id,level,maxHp:max,currentHp:max,attrs:Object.fromEntries(DND_ATTRIBUTES.map(([k])=>[k,Math.max(1,Math.min(30,Number($(`.npc-attr[data-attr="${k}"]`)?.value)||10))])),attacks:npcAttacksForLevel(p,level)});battleSort();save();closeModal();renderBattleAll();toast(`${p.nome} entrou na batalha.`)};
}
function chooseBattlePokemon(t,c,costTurn=false){
 const available=(t.team||[]).filter(a=>{const p=pokemonById(a.pokemonId);return p&&Number(a.currentHp??p.hp)>0});
 if(!available.length)return toast("Você não possui outro Pokémon com HP para enviar à batalha.");
 const cards=available.map(a=>{const p=pokemonById(a.pokemonId),h=hpData(a,p);return `<button class="battle-choice ${Number(c.pokemonId)===Number(p.id)?"selected":""}" data-battle-pick="${p.id}"><img src="${p.imagem}"><strong>${esc(p.nome)}</strong><div class="muted">Nv. ${a.level} • HP ${h.current}/${h.max}</div></button>`}).join("");
 $("#modalContent").innerHTML=`<div class="modal-head"><h2>${costTurn?"Trocar Pokémon":"Escolher Pokémon"}</h2><button class="btn" data-close>Fechar</button></div><p class="muted">${costTurn?"A troca consome o seu turno.":"Escolha o Pokémon que participará desta batalha."}</p><div class="battle-choice-grid">${cards}</div>`;
 showModal();$('[data-close]').onclick=closeModal;
 $$('[data-battle-pick]').forEach(b=>b.onclick=()=>{const p=pokemonById(Number(b.dataset.battlePick)),a=t.team.find(x=>Number(x.pokemonId)===Number(p.id));c.pokemonId=p.id;c.level=a.level;c.currentHp=Number(a.currentHp??hpMaxForLevel(p,a.level))||0;c.maxHp=hpMaxForLevel(p,a.level);c.name=t.name; c.attrs=p.status||{};battleLog(`${t.name} enviou ${p.nome}.`);save();closeModal();renderBattleAll();if(costTurn)battleNextTurn()});
}
function openBattleHpModal(id,mode){
 const c=battleParticipantById(id);if(!c)return;const h=battleHpInfo(c);
 const title=mode==='damage'?'Aplicar dano':'Curar Pokémon';
 const accent=mode==='damage'?'damage':'heal';
 $("#modalContent").innerHTML=`<div class="modal-head"><div><h2>${title}</h2><p class="muted">${esc(battleName(c))}</p></div><button class="btn" data-close>Fechar</button></div><div class="battle-hp-modal ${accent}"><div class="battle-hp-current"><span>HP atual</span><strong>${h.current}/${h.max}</strong></div><div class="health-bar"><span style="width:${h.pct}%"></span></div><div class="field"><label>${mode==='damage'?'Quantidade de dano':'Quantidade de cura'}</label><input class="input battle-hp-input" id="battleHpValue" type="number" min="1" value="${mode==='damage'?10:10}" autofocus></div><button class="btn ${mode==='damage'?'danger':'success'} full" id="confirmBattleHp">${mode==='damage'?'⚔️ Aplicar dano':'💚 Aplicar cura'}</button></div>`;
 showModal();$('[data-close]').onclick=closeModal;setTimeout(()=>$("#battleHpValue")?.focus(),0);
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
 showModal();$('[data-close]').onclick=closeModal;
 $$('[data-npc-attack-index]').forEach(btn=>btn.onclick=()=>{const sec=$("#battleTargetSection");sec.classList.remove('hidden');sec.dataset.attackIndex=btn.dataset.npcAttackIndex;$$('[data-npc-attack-index]').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected')});
 $$('[data-target-id]').forEach(btn=>btn.onclick=()=>{const a=attacks[Number($("#battleTargetSection").dataset.attackIndex)],target=battleParticipantById(btn.dataset.targetId);if(!a||!target)return;const h=battleHpInfo(target),dmg=Math.max(0,Number(a.dano)||0),next=Math.max(0,h.current-dmg);if(target.kind==='player'){const tt=state.trainers.find(x=>x.id===target.trainerId),aa=tt?.team?.find(x=>Number(x.pokemonId)===Number(target.pokemonId));if(aa)aa.currentHp=next}else target.currentHp=next;battleLog(`${p.nome} usou ${a.nome} em ${battleName(target)}: ${h.current} → ${next} HP.`);save();closeModal();renderBattleAll();if(state.encounter.activeParticipantId===c.id)battleNextTurn()});
}
function openBattleAttackPicker(){
 const t=me(),c=state.encounter.combatants.find(x=>x.kind==='player'&&x.trainerId===t?.id);if(!c)return;const p=battlePokemonForParticipant(c);if(!p)return;
 const attacks=assignmentAttacks(p,getAssignment(t,p.id));
 if(!attacks.length)return toast("Este Pokémon ainda não possui ataques disponíveis neste nível.");
 const targets=state.encounter.combatants.filter(x=>x.id!==c.id&&battleHpInfo(x).current>0);
 if(!targets.length)return toast("Não há alvos disponíveis.");
 const cards=attacks.map((a,i)=>`<button class="battle-attack-card" data-attack-index="${i}"><span class="battle-attack-top"><strong>${esc(a.nome)}</strong>${a.tipo?`<span class="tag type-tag ${typeClass(a.tipo)}">${esc(a.tipo)}</span>`:''}</span><span class="battle-attack-damage">PP ${Number(a.ppAtual??a.pp??a.ppMax)||0}/${Number(a.ppMax||a.pp)||0}</span>${a.descricao?`<small>${esc(a.descricao)}</small>`:''}</button>`).join('');
 $("#modalContent").innerHTML=`<div class="modal-head"><div><h2>Escolher ataque</h2><p class="muted">${esc(p.nome)} • Nível ${c.level}</p></div><button class="btn" data-close>Fechar</button></div><div class="battle-attack-grid">${cards}</div><div class="battle-target-section hidden" id="battleTargetSection"><h3>Escolha o alvo</h3><div class="battle-target-grid">${targets.map(x=>{const hp=battleHpInfo(x);return `<button class="battle-target-card" data-target-id="${x.id}"><img src="${battleAvatar(x)}"><strong>${esc(battleName(x))}</strong><small>${hp.current}/${hp.max} HP</small></button>`}).join('')}</div></div>`;
 showModal();$('[data-close]').onclick=closeModal;
 $$('[data-attack-index]').forEach(btn=>btn.onclick=()=>{const a=attacks[Number(btn.dataset.attackIndex)];const sec=$("#battleTargetSection");sec.classList.remove('hidden');sec.dataset.attackIndex=btn.dataset.attackIndex;$$('[data-attack-index]').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');});
 $$('[data-target-id]').forEach(btn=>btn.onclick=()=>{const a=attacks[Number($("#battleTargetSection").dataset.attackIndex)],target=battleParticipantById(btn.dataset.targetId);if(!a||!target)return;const h=battleHpInfo(target),dmg=Math.max(0,Number(a.dano)||0),next=Math.max(0,h.current-dmg);if(target.kind==='player'){const tt=state.trainers.find(x=>x.id===target.trainerId),aa=tt?.team?.find(x=>Number(x.pokemonId)===Number(target.pokemonId));if(aa)aa.currentHp=next}else target.currentHp=next;battleLog(`${p.nome} usou ${a.nome} em ${battleName(target)}: ${h.current} → ${next} HP.`);save();closeModal();renderBattleAll();if(state.encounter.activeParticipantId===c.id)battleNextTurn();});
}

function renderBattleMaster(){
 if(!isMaster())return;
 $$('#startBattleBtn, #nextTurn, #addNpcBtn, #clearEncounter').forEach(b=>b.classList.remove('hidden'));
 $("#encounterNotes").closest(".card")?.classList.remove("hidden");
 const e=state.encounter;$("#battleStatus").textContent=e.battleActive?e.battleName||"Batalha ativa":"Nenhuma batalha ativa";$("#battleRound").textContent=e.battleActive?e.round:1;const cur=battleCurrent();$("#battleTurn").textContent=cur?battleName(cur):"—";$("#turnInfo").textContent=e.battleActive&&cur?`Rodada ${e.round} • vez de ${battleName(cur)} • iniciativa ${cur.initiative}`:e.battleActive?"Adicione jogadores ou Pokémon NPC para montar a ordem de iniciativa.":"Inicie uma batalha para montar a ordem de iniciativa.";$("#encounterNotes").value=e.notes||"";
 $("#initiativeList").innerHTML=e.battleActive?(e.combatants.map(c=>{const h=battleHpInfo(c),p=battlePokemonForParticipant(c),f=h.current<=0;return `<article class="battle-combatant ${c.id===e.activeParticipantId?'active':''} ${f?'fainted':''} ${c.kind==='player'?'battle-player':'battle-npc'}"><div class="battle-head"><img class="battle-avatar" src="${battleAvatar(c)}"><div class="battle-main"><h3>${c.id===e.activeParticipantId?'▶ ':''}${esc(battleName(c))}</h3><div class="battle-meta">${c.kind==='player'?`Jogador: ${esc(state.trainers.find(t=>t.id===c.trainerId)?.name||'')} • Pokémon: <strong>${esc(p?.nome||'Aguardando escolha')}</strong>`:`NPC • Pokémon: <strong>${esc(p?.nome||'')}</strong> • Nv. ${c.level}`}${p?` • ${typeTags(p.tipo)}`:''}</div>${c.kind==='npc'&&npcAttacksForLevel(p,c.level).length?`<div class="battle-npc-attacks"><strong>⚔️ Ataques:</strong>${c.id===e.activeParticipantId&&h.current>0?npcAttacksForLevel(p,c.level).map((a,i)=>`<button class="battle-npc-attack battle-npc-attack-btn" data-npc-attack="${c.id}" data-npc-attack-index="${i}">${esc(a.nome)} · ${Number(a.dano)||0}</button>`).join(''):npcAttacksForLevel(p,c.level).map(a=>`<span class="tag battle-npc-attack">${esc(a.nome)} · ${Number(a.dano)||0}</span>`).join('')}</div>`:''}<div class="battle-hp"><div class="health-label"><span>HP</span><strong>${h.current}/${h.max}</strong></div><div class="health-bar"><span style="width:${h.pct}%"></span></div></div></div></div><div class="battle-actions"><button class="btn small" data-battle-dmg="${c.id}">Dar dano</button><button class="btn small" data-battle-heal="${c.id}">Curar</button>${c.kind==='npc'?`<button class="btn small" data-battle-editnpc="${c.id}">Editar NPC</button>`:''}${f?`<span class="status" style="color:#c33;font-weight:900">💀 0 HP</span>`:''}</div></article>`}).join('')||'<div class="battle-empty">Adicione um Pokémon NPC ou reconfigure a batalha para selecionar jogadores.</div>'):`<div class="battle-empty">Nenhuma batalha ativa. Clique em <strong>Iniciar batalha</strong> para selecionar os jogadores e a iniciativa.</div>`;
 const log=e.battleLog||[];const notesHtml=log.map(x=>`<p><small>${new Date(x.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small> — ${esc(x.msg)}</p>`).join('');
 const oldLog=$("#battleLog");if(oldLog)oldLog.innerHTML=notesHtml||'<p class="muted">Sem eventos ainda.</p>';else {const sec=$("#encounterNotes").closest('.card');if(sec){sec.insertAdjacentHTML('beforeend',`<div class="battle-log" id="battleLog">${notesHtml||'<p class="muted">Sem eventos ainda.</p>'}</div>`)}}
 $$("[data-battle-dmg]").forEach(b=>b.onclick=()=>adjustBattleHp(b.dataset.battleDmg,'damage'));$$("[data-battle-heal]").forEach(b=>b.onclick=()=>adjustBattleHp(b.dataset.battleHeal,'heal'));$$("[data-battle-editnpc]").forEach(b=>b.onclick=()=>editNpcBattle(b.dataset.battleEditnpc));$$("[data-npc-attack]").forEach(b=>b.onclick=()=>openNpcAttackPicker(b.dataset.npcAttack));
 $("#startBattleBtn").textContent=e.battleActive?"Reconfigurar batalha":"Iniciar batalha";$("#nextTurn").disabled=!e.battleActive||!e.combatants.length;$("#addNpcBtn").disabled=!e.battleActive;$("#clearEncounter").disabled=!e.battleActive;
}
function editNpcBattle(id){const c=battleParticipantById(id),p=battlePokemonForParticipant(c);if(!c)return;$("#modalContent").innerHTML=`<div class="modal-head"><h2>Editar NPC</h2><button class="btn" data-close>Fechar</button></div><div class="form-grid"><div class="field"><label>Nome</label><input class="input" id="editNpcName" value="${esc(c.name)}"></div><div class="inline-fields"><div class="field"><label>Nível</label><input class="input" id="editNpcLevel" type="number" value="${c.level}"></div><div class="field"><label>Iniciativa</label><input class="input" id="editNpcInit" type="number" value="${c.initiative}"></div></div><div class="inline-fields"><div class="field"><label>HP máximo</label><input class="input" id="editNpcHp" type="number" value="${c.maxHp}"></div><div class="field"><label>HP atual</label><input class="input" id="editNpcCurrentHp" type="number" value="${c.currentHp}"></div></div><button class="btn primary" id="saveNpcEdit">Salvar</button></div>`;showModal();$('[data-close]').onclick=closeModal;$("#saveNpcEdit").onclick=()=>{c.name=$("#editNpcName").value.trim()||p?.nome||c.name;c.level=Number($("#editNpcLevel").value)||c.level;c.initiative=Number($("#editNpcInit").value)||0;c.maxHp=Math.max(1,Number($("#editNpcHp").value)||c.maxHp);c.currentHp=Math.max(0,Math.min(c.maxHp,Number($("#editNpcCurrentHp").value)||0));battleSort();save();closeModal();renderBattleAll()}}
function renderBattlePlayer(){
 if(isMaster())return;$("#encounterNotes").closest(".card")?.classList.add("hidden");const t=me(),c=state.encounter.combatants.find(x=>x.kind==='player'&&x.trainerId===t?.id);if(!c||!state.encounter.battleActive){$("#battleStatus").textContent="Você não está em uma batalha.";$("#turnInfo").textContent="Aguardando o Mestre iniciar uma batalha.";$("#initiativeList").innerHTML=`<div class="battle-empty">Quando o Mestre selecionar você, a Batalha aparecerá aqui.</div>`;$("#startBattleBtn").classList.add('hidden');$("#nextTurn").classList.add('hidden');$("#addNpcBtn").classList.add('hidden');$("#clearEncounter").classList.add('hidden');return}
 $("#startBattleBtn").classList.add('hidden');$("#nextTurn").classList.add('hidden');$("#addNpcBtn").classList.add('hidden');$("#clearEncounter").classList.add('hidden');const cur=battleCurrent();$("#battleStatus").textContent=state.encounter.battleName||"Batalha";$("#battleRound").textContent=state.encounter.round;$("#battleTurn").textContent=cur?battleName(cur):"—";$("#turnInfo").textContent=cur?.id===c.id?"É o seu turno.":`Vez de ${battleName(cur)}.`;
 const all=state.encounter.combatants.map(x=>{const h=battleHpInfo(x),p=battlePokemonForParticipant(x);return `<article class="battle-combatant ${x.id===state.encounter.activeParticipantId?'active':''} ${h.current<=0?'fainted':''}"><div class="battle-head"><img class="battle-avatar" src="${battleAvatar(x)}"><div class="battle-main"><h3>${esc(battleName(x))}</h3><div class="battle-meta">${x.kind==='player'?`Jogador: ${esc(state.trainers.find(t=>t.id===x.trainerId)?.name||'')} • Pokémon: ${esc(p?.nome||'Aguardando escolha')}`:`NPC • Pokémon: ${esc(p?.nome||'')} • Nv. ${x.level}`}${p?` • ${typeTags(p.tipo)}`:''}</div>${x.kind==='npc'&&npcAttacksForLevel(p,x.level).length?`<div class="battle-npc-attacks"><strong>⚔️ Ataques:</strong>${npcAttacksForLevel(p,x.level).map(a=>`<span class="tag battle-npc-attack">${esc(a.nome)} · ${Number(a.dano)||0}</span>`).join('')}</div>`:''}<div class="battle-hp"><div class="health-label"><span>HP</span><strong>${h.current}/${h.max}</strong></div><div class="health-bar"><span style="width:${h.pct}%"></span></div></div></div></div></article>`}).join('');
 const myp=battlePokemonForParticipant(c), myhp=battleHpInfo(c), forced=!myp||myhp.current<=0;const usableAttacks=myp?assignmentAttacks(myp,getAssignment(t,myp.id)):[];const controls=forced?`<div class="permission-box"><h3>Escolha um Pokémon</h3><p class="muted">${myp?`${myp.nome} chegou a 0 HP.`:'Escolha qual Pokémon do seu time participará da batalha.'}</p><button class="btn primary" id="playerChooseBattle">Escolher Pokémon</button></div>`:`<div class="battle-player-layout"><div class="permission-box battle-active-card"><div class="section-title"><div><h3>Seu Pokémon</h3><p>${esc(myp.nome)} • Nível ${c.level}</p></div><button class="btn" id="playerSwitchBattle">Trocar Pokémon <small>(custa o turno)</small></button></div><div class="battle-hp"><div class="health-label"><span>HP</span><strong>${myhp.current}/${myhp.max}</strong></div><div class="health-bar"><span style="width:${myhp.pct}%"></span></div></div></div><div class="battle-attacks-panel"><div class="section-title"><div><h3>Ataques</h3><p>Escolha um ataque para usar no seu turno.</p></div></div><div class="battle-attack-list">${usableAttacks.map((a,i)=>`<button class="battle-attack-mini" data-player-attack="${i}"><span><strong>${esc(a.nome)}</strong>${a.tipo?`<span class="tag type-tag ${typeClass(a.tipo)}">${esc(a.tipo)}</span>`:''}</span><b>${Number(a.dano)||0}</b></button>`).join('')||`<span class="muted">Nenhum ataque disponível neste nível.</span>`}</div></div></div>`;
 $("#initiativeList").innerHTML=controls+all;$("#encounterNotes").value='';if(forced)$("#playerChooseBattle").onclick=()=>chooseBattlePokemon(t,c,false);else {$("#playerSwitchBattle").onclick=()=>{if(state.encounter.activeParticipantId!==c.id)return toast('A troca só pode ser feita no seu turno.');chooseBattlePokemon(t,c,true)};$$('[data-player-attack]').forEach(btn=>btn.onclick=()=>{if(state.encounter.activeParticipantId!==c.id)return toast('O ataque só pode ser usado no seu turno.');openBattleAttackPicker()})}
}
function renderBattleAll(){if(!$("#page-encounter"))return;if(isMaster())renderBattleMaster();else renderBattlePlayer()}
function renderEncounter(){renderBattleAll()}

// Campos da batalha para salvar notas.
$("#encounterNotes").oninput=e=>{if(!isMaster())return;state.encounter.notes=e.target.value;save()};
$("#startBattleBtn").onclick=()=>openBattleStart();
$("#addNpcBtn").onclick=()=>{if(!state.encounter.battleActive)return toast("Inicie uma batalha primeiro.");addNpcBattle()};
$("#nextTurn").onclick=()=>{if(isMaster())battleNextTurn()};
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
 showModal();
 $$("[data-close]").forEach(b=>b.onclick=closeModal);
 $("#confirmEndBattle").onclick=()=>{
   state.encounter={round:1,active:0,notes:'',combatants:[],battleActive:false,battleId:null,battleLog:[],activeParticipantId:null};
   state.trainers.forEach(t=>{delete t._battleChoiceFor});
   save();closeModal();setupNav();renderAll();nav('dashboard');toast('Batalha encerrada.');
 };
}
$("#clearEncounter").onclick=openEndBattleConfirm;


function setLoginAvailability(ready){
 appReady=ready;$('#masterLoginBtn').disabled=!ready;$('#playerLoginBtn').disabled=!ready;
 const message=$('#loginLoadStatus');if(message)message.textContent=ready?'Dados carregados. Escolha seu acesso.':'Carregando a campanha…';
 $('#retryLoadBtn')?.classList.add('hidden');
}
$('#retryLoadBtn').onclick=()=>init();
$('#syncRetryBtn').onclick=()=>queueDbSave();
['#masterUser','#masterPass','#playerPass'].forEach(selector=>$(selector).addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$(selector==='#playerPass'?'#playerLoginBtn':'#masterLoginBtn').click()}}));
setLoginAvailability(false);
async function init(){
 dbReady=false;setLoginAvailability(false);setSyncStatus('loading');
 try{
  if(!dbConfigured()) throw new Error("Supabase não configurado.");

  // A partir desta versão, o Supabase é a única fonte de dados.
  // Não existe fallback para JSON, imagens ou qualquer outro arquivo local.
  const loadedFromDb=await loadStateFromSupabase();
  if(!loadedFromDb) throw new Error("Não foi possível carregar os dados do Supabase.");
  normalizeCampaignState();
  state.globalProficiency??={enabled:false,value:2};
  const savedGlobalProficiency=await loadGlobalProficiencyFromSupabase();
  if(savedGlobalProficiency) state.globalProficiency=savedGlobalProficiency;

  const remoteCatalog=await loadPokemonCatalogFromSupabase();
  const currentMoves=await loadMoveLibraryFromSupabase();

  if(!Array.isArray(remoteCatalog) || remoteCatalog.length===0){
    throw new Error("O catálogo de Pokémon do Supabase está vazio ou não pôde ser carregado.");
  }

  // Mescla catálogo remoto e catálogo já salvo na campanha para evitar omissões.
  // Quando o mesmo ID existe nos dois, os dados remotos prevalecem.
  const catalogById=new Map();
  [...(Array.isArray(state.pokemonCatalog)?state.pokemonCatalog:[]),...remoteCatalog].forEach(p=>{
    if(!p || p.id===undefined || p.id===null)return;
    catalogById.set(String(p.id),p);
  });
  pokemons=structuredClone([...catalogById.values()]);
  const dexNumber=p=>{const m=String(p?.numero??'').match(/\d+/);return m?Number(m[0]):Number(p?.id)||Number.MAX_SAFE_INTEGER};
  pokemons.sort((a,b)=>dexNumber(a)-dexNumber(b)||(Number(a.id)||0)-(Number(b.id)||0));
  // Primeira carga: preenche os campos de habilidades existentes com a lista fornecida pelo Mestre.
  // Depois disso, as edições feitas no painel são preservadas no Supabase.
  if(Number(state.abilityDataVersion||0)<1){
    hydratePokemonAbilitiesFromReference();
    state.abilityDataVersion=1;
  }
  state.pokemonCatalog=pokemons;
  if(!Array.isArray(currentMoves))throw new Error("Não foi possível carregar a biblioteca de ataques. O salvamento foi bloqueado para proteger os dados.");
  moves=structuredClone(currentMoves);

  console.info(`TrainerDex: catálogo carregado do Supabase (${pokemons.length} Pokémon).`);
  console.info(`TrainerDex: biblioteca de ataques carregada do Supabase (${moves.length} ataques).`);

  pokemons.forEach(p=>{
    normalizeAbilities(p);
    p.hp=Math.max(1,Number(p.hp)||50);
    p.dadoVida=normalizeLifeDice(p.dadoVida);
    p.sr??="";
    p.ca=Math.max(0,Number(p.ca)||0);
    delete p.nivel;
    p.status=normalizePokemonStats(p.status||{});
    p.pericias=normalizeSkills(p.pericias||{});
    p.bonusProficiencia=Math.max(0,Math.min(20,Number(p.bonusProficiencia ?? proficiencyBonus(1))||0));
    p.vulnerabilidades??=[];
    p.resistencia??=[];
    p.ataques??=[];
    if((!p.vulnerabilidades||p.vulnerabilidades.length===0)&&(!p.resistencia||p.resistencia.length===0)){
      const rel=calcTypeRelations(p.tipo);
      p.vulnerabilidades=rel.vulnerabilidades;
      p.resistencia=rel.resistencia;
    }
  });

  state.trainers.forEach(t=>{
    normalizeTrainerStorage(t);
    [...t.team,...t.pc].forEach(a=>{
      const p=pokemonById(a.pokemonId);
      if(!p)return;
      a.level=Math.max(1,Math.min(100,Math.trunc(Number(a.level)||1)));
      const max=hpMaxForLevel(p,a.level);
      if(a.currentHp==null||!Number.isFinite(Number(a.currentHp)))a.currentHp=max;
      else a.currentHp=Math.max(0,Math.min(max,Number(a.currentHp)));
      a.abilityIndexes=Array.isArray(a.abilityIndexes)?a.abilityIndexes.map(Number).filter(x=>x===0||x===1).slice(0,2):[];
      a.natureza=pokemonNature(a.natureza).id;
    });
  });

  applyKnownEvolutionStructure();
  if(Number(state.moveLibraryVersion||0)<3) state.moveLibraryVersion=3;
  normalizeMoveLibrary();
  pokemons.forEach(p=>(p.ataques||[]).forEach(a=>ensureMoveForAttack(a)));
  state.pokemonCatalog=pokemons;
  await loadPersonalMovesFromSupabase();

  dbReady=true;setLoginAvailability(true);setSyncStatus('saved');
  // Persiste apenas a normalização do que já veio do Supabase.
  // Nunca cria/substitui catálogo vazio.
  save();
  loginUI();
 }catch(e){
  dbReady=false;setSyncStatus('loaderror');$('#loginLoadStatus').textContent='Não foi possível carregar a campanha. Verifique a conexão e tente novamente.';$('#retryLoadBtn').classList.remove('hidden');
  console.error("TrainerDex: falha na inicialização",e);
  toast("Não foi possível carregar a Pokédex. Verifique a conexão com o Supabase.");
 }
}
init().catch(e=>{console.error(e);toast("Não foi possível carregar a Pokédex.")});
