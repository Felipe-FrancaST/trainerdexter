const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const {mount,fixture,login,until,ROOT}=require('./helpers.cjs');

function attributeFixture(personal=false){
 const db=fixture();
 db.moves[0].nomeOriginal='Absorb';db.moves[0].nome='Absorver';
 db.moves[1].nomeOriginal='Acupressure';db.moves[1].nome='Acupressão';
 db.moves[2].nomeOriginal='Psybeam';db.moves[2].nome='Raio psíquico';
 if(personal)db.personal=[{trainer_id:'player-1',pokemon_id:1,learned_moves:[{moveId:'move-c',nivel:1,dano:7}],excluded_moves:[]}];
 return db;
}
async function useApp(fn,db=attributeFixture()){const app=await mount(db);try{await fn(app);assert.equal(app.messages.length,0);}finally{app.close();}}

test('todos os 675 atributos correspondem exatamente à lista enviada, inclusive nomes traduzidos',async()=>useApp(async app=>{
 const entries=fs.readFileSync(path.join(ROOT,'tests/fixtures/move-attributes-reference.txt'),'utf8').replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>line.trim());
 assert.equal(entries.length,675);assert.equal(app.eval('MOVE_ATTRIBUTE_REFERENCE.size'),675);
 for(const line of entries){const index=line.lastIndexOf(' - '),name=line.slice(0,index),value=line.slice(index+3).trim();
  app.w.__testMove={nomeOriginal:name,nome:'Nome traduzido'};
  assert.equal(app.eval('moveAttributeValue(window.__testMove)'),value,name);
 }
}));

test('formatação preserva ordem, três atributos e valores especiais; nomes toleram espaços, pontuação e maiúsculas',async()=>useApp(async app=>{
 for(const [name,value,label] of [['Absorb','FOR/DES','For/Des'],['Counter','DES/FOR','Des/For'],['Double Slap','FOR/DES/CAR','For/Des/Car'],['Psybeam','DES/INT/SAB','Des/Int/Sab'],['Acupressure','Nenhum','Nenhum'],['Hidden Power','Qualquer','Qualquer'],['Nature Power','Variável','Variável']]){
  app.w.__testMove={nomeOriginal:name.toUpperCase().replaceAll(' ',' - ')};
  assert.equal(app.eval('moveAttributeValue(window.__testMove)'),value);
  assert.equal(app.eval('moveAttributeLabel(window.__testMove)'),label);
 }
 assert.equal(app.eval(`moveAttributeValue({nomeOriginal:"FOREST’S-CURSE"})`),'CON/SAB');
 assert.equal(app.eval(`moveAttributeValue({id:'will-o-wisp',nome:'Nome traduzido'})`),'DES/SAB');
 assert.equal(app.eval(`moveAttributeValue({moveId:'move-a',nome:'Outro nome traduzido'})`),'FOR/DES');
}));

test('fichas de Pokémon no Time e no PC mostram atributo junto ao ataque, incluindo ataques ensinados',async()=>useApp(async app=>{
 login(app);app.eval('openAssignedPokemon(1)');
 assert.deepEqual(app.all('.attack-detail-meta [data-move-attribute]').map(el=>el.textContent),['Atributo: For/Des','Atributo: Nenhum','Atributo: Des/Int/Sab']);
 assert.ok(app.all('.attack-detail-item').some(item=>item.textContent.includes('Ensinado')&&item.textContent.includes('Des/Int/Sab')));
 assert.equal(app.eval('assignmentAttacks(pokemonById(1),getAssignment(me(),1))[2].atributo'),'DES/INT/SAB');
 app.eval('closeModal();openAssignedPokemon(3)');assert.equal(app.el('.attack-detail-meta [data-move-attribute]').textContent,'Atributo: For/Des');
},attributeFixture(true)));

test('biblioteca, edição da espécie, ensino e previsão de NPC exibem o mesmo atributo',async()=>useApp(async app=>{
 login(app,'master');app.eval("nav('moves')");
 assert.equal(app.el('.move-original-input[data-move-id="move-a"]').closest('article').querySelector('[data-move-attribute]').textContent,'Atributo: For/Des');
 app.eval('openPokemonMaster(pokemonById(1))');assert.equal(app.el('.attack-selected-info [data-move-attribute]').textContent,'Atributo: For/Des');
 assert.ok(app.el('.attack-move').selectedOptions[0].textContent.includes('Atributo For/Des'));
 assert.equal(app.eval('collectAttacks()[0].atributo'),'FOR/DES');
 app.eval("closeModal();openPokemonTeaching('player-1:1')");assert.equal(app.el('#teachMovePreview [data-move-attribute]').textContent,'Atributo: Des/Int/Sab');
 assert.ok(app.eval('npcAttacksPreviewHtml(pokemonById(3),1)').includes('Atributo: For/Des'));
}));

test('batalha mostra atributo no botão e no seletor sem alterar dano, PP ou regras do turno',async()=>useApp(async app=>{
 login(app);app.eval("nav('encounter');renderBattleAll()");
 assert.equal(app.el('[data-player-attack="move-a"] [data-move-attribute]').textContent,'Atributo: For/Des');
 app.el('[data-player-attack="move-a"]').click();assert.equal(app.el('[data-attack-id="move-a"] [data-move-attribute]').textContent,'Atributo: For/Des');
 app.el('[data-target-id="c-npc"]').click();assert.equal(app.eval("battleParticipantById('c-npc').currentHp"),35);
 assert.equal(app.eval("battleAttacksForParticipant(battleParticipantById('c-player'))[0].ppAtual"),1);
 assert.equal(app.eval('state.encounter.activeParticipantId'),'c-npc');
}));

test('referência reaplica atributos após recarga mesmo quando os RPCs antigos não guardam o campo novo',async()=>useApp(async app=>{
 for(const m of app.db.moves)delete m.atributo;
 for(const p of app.db.catalog)for(const a of p.ataques)delete a.atributo;
 for(const p of app.db.state.pokemonCatalog||[])for(const a of p.ataques)delete a.atributo;
 const next=await mount(app.db);try{
  login(next);next.eval('openAssignedPokemon(1)');assert.equal(next.el('.attack-detail-meta [data-move-attribute]').textContent,'Atributo: For/Des');
  assert.equal(next.eval("moveById('move-a').atributo"),'FOR/DES');
 }finally{next.close();}
}));

test('novo ataque com nome original da referência recebe atributo e o jogador o vê após o ensino',async()=>useApp(async app=>{
 login(app,'master');app.eval('openNewMove()');app.el('#newMoveName').value='Tapas duplos';app.el('#newMoveOriginal').value='Double Slap';
 app.el('#newMoveForm').dispatchEvent(new app.w.Event('submit',{cancelable:true}));
 assert.equal(app.eval("moves.find(m=>m.nomeOriginal==='Double Slap').atributo"),'FOR/DES/CAR');
 const id=app.eval("moves.find(m=>m.nomeOriginal==='Double Slap').id");app.eval("openPokemonTeaching('player-1:1')");
 app.el('#teachMoveSelect').value=id;app.el('#teachMoveSelect').dispatchEvent(new app.w.Event('change'));assert.equal(app.el('#teachMovePreview [data-move-attribute]').textContent,'Atributo: For/Des/Car');
 app.el('#teachMoveConfirm').click();await until(()=>app.eval('personalMovesBusy.size===0'));
 await app.eval('flushDbSave()');app.el('#logout').click();await until(()=>app.eval('session===null'));login(app);app.eval('openAssignedPokemon(1)');assert.ok(app.all('.attack-detail-item').some(item=>item.textContent.includes('Tapas duplos')&&item.textContent.includes('For/Des/Car')));
}));

test('moves fora da lista distinguem Não informado de Nenhum, preservam atributos válidos e recusam valores malformados',async()=>useApp(async app=>{
 assert.equal(app.eval(`moveAttributeLabel({nome:'Ataque caseiro'})`),'Não informado');
 assert.equal(app.eval(`moveAttributeLabel({nome:'Ataque caseiro',atributo:' sab / des '})`),'Sab/Des');
 for(const value of ['constructor','__proto__','FOR/XYZ','FOR" onclick="alert(1)',null,12,{}]){
  app.w.__testMove={nome:'Ataque caseiro',atributo:value};assert.equal(app.eval('moveAttributeValue(window.__testMove)'),null);
  app.el('#modalContent').innerHTML=app.eval('moveAttributeBadge(window.__testMove)');assert.equal(app.all('[onclick],[onerror]').length,0);assert.equal(app.el('[data-move-attribute]').textContent,'Atributo: Não informado');
 }
}));
