const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {mount,fixture,login,fillPassword,submitPassword,until,IMAGE,ROOT}=require('./helpers.cjs');

async function useApp(fn,db,options){const app=await mount(db,options);try{await fn(app);assert.equal(app.messages.length,0,'Erros não tratados no DOM');}finally{app.close();}}

test('jogador acessa Minha conta no início, desktop e menu do celular; rotas do Mestre ficam bloqueadas',async()=>useApp(async app=>{
 login(app);assert.equal(app.eval('session.role'),'player');
 assert.ok(app.el('#desktopNav [data-page="account"]'));assert.ok(app.el('#mobileNav [data-page="account"]'));assert.ok(app.el('#dashboardShortcuts [data-page="account"]'));
 app.el('#desktopNav [data-page="account"]').click();assert.ok(app.el('#page-account').classList.contains('active'));assert.equal(app.el('#playerAccountName').textContent,'Ana');
 app.eval("nav('settings')");assert.ok(app.el('#page-dashboard').classList.contains('active'));
 app.el('#mobileMenuToggle').click();assert.equal(app.el('#mobileMenu').getAttribute('aria-hidden'),'false');assert.ok(app.el('#mainContent').hasAttribute('inert'));
 app.el('#mobileNav [data-page="account"]').click();assert.equal(app.el('#mobileMenu').getAttribute('aria-hidden'),'true');assert.ok(!app.el('#mainContent').hasAttribute('inert'));assert.equal(app.el('#mobilePageTitle').textContent,'Minha conta');
}));

test('troca de senha valida senha atual, tamanho, espaços, confirmação e repetição',async()=>useApp(async app=>{
 login(app);const writes=app.mock.calls.filter(c=>c.name==='trainerdex_save_state').length;
 for(const [current,next,confirmation,error] of [
  ['errada','novaSenha123','novaSenha123','atual'],['antiga123','curta','curta','8 a 128'],
  ['antiga123','        ','        ','8 a 128'],['antiga123','novaSenha123','diferente','confirmação'],
  ['antiga123','antiga123','antiga123','diferente'],['antiga123','a'.repeat(129),'a'.repeat(129),'8 a 128'],
 ]){fillPassword(app,'player',current,next,confirmation);await submitPassword(app,'player');assert.ok(app.el('#playerPasswordError').textContent.includes(error));}
 assert.equal(app.mock.calls.filter(c=>c.name==='trainerdex_save_state').length,writes);assert.equal(app.db.state.trainers[0].password,'antiga123');
 app.el('#playerShowPassword').click();assert.equal(app.el('#playerCurrentPassword').type,'text');app.el('#playerShowPassword').click();assert.equal(app.el('#playerCurrentPassword').type,'password');
}));

test('troca de senha confirma o banco; apenas a própria conta muda e a senha nova permite novo login',async()=>useApp(async app=>{
 login(app);fillPassword(app,'player','antiga123','novaSenha123');app.mock.delayState=50;
 const writes=app.mock.calls.filter(c=>c.name==='trainerdex_save_state').length;
 app.el('#playerPasswordForm').dispatchEvent(new app.w.Event('submit',{cancelable:true}));
 app.el('#playerPasswordForm').dispatchEvent(new app.w.Event('submit',{cancelable:true}));
 assert.ok(app.el('#playerSavePassword').disabled);assert.equal(app.eval('state.trainers[0].password'),'antiga123');
 await until(()=>!app.eval('accountPasswordBusy'));
 assert.equal(app.mock.calls.filter(c=>c.name==='trainerdex_save_state').length,writes+1);
 assert.equal(app.eval('state.trainers[0].password'),'novaSenha123');assert.equal(app.db.state.trainers[0].password,'novaSenha123');
 assert.equal(app.db.state.trainers[1].password,'outra123');assert.equal(app.db.state.master.pass,'king');assert.ok(app.el('#playerPasswordStatus').textContent.includes('sucesso'));assert.equal(app.el('#playerNewPassword').value,'');
 app.el('#logout').click();await until(()=>app.eval('session===null'));login(app,'player','antiga123');assert.equal(app.eval('session'),null);assert.ok(app.el('#loginError').textContent.includes('inválidos'));
 login(app,'player','novaSenha123');assert.equal(app.eval('session.role'),'player');assert.equal(app.el('#playerPass').value,'');
 const reloaded=await mount(app.db);try{login(reloaded,'player','novaSenha123');assert.equal(reloaded.eval('session.role'),'player');}finally{reloaded.close();}
}));

test('falha de senha não altera estado nem deixa uma senha nova na fila; permite tentar de novo',async()=>useApp(async app=>{
 login(app);fillPassword(app,'player','antiga123','novaSenha123');app.mock.failState=1;await submitPassword(app,'player');
 assert.equal(app.eval('state.trainers[0].password'),'antiga123');assert.equal(app.db.state.trainers[0].password,'antiga123');assert.equal(app.el('#playerNewPassword').value,'novaSenha123');assert.ok(app.el('#playerPasswordError').textContent.includes('Não foi possível'));
 await app.eval('flushDbSave()');assert.equal(app.db.state.trainers[0].password,'antiga123');
 await submitPassword(app,'player');assert.equal(app.db.state.trainers[0].password,'novaSenha123');
}));

test('senha do Mestre segue o mesmo fluxo e a conta de outro jogador não pode ser passada ao salvamento',async()=>useApp(async app=>{
 login(app);await assert.rejects(app.eval("changeAccountPassword('player','player-2','outra123','novaSenha123')"));
 app.el('#logout').click();await until(()=>app.eval('session===null'));login(app,'master');app.eval("nav('settings')");fillPassword(app,'master','king','novaMestre123');await submitPassword(app,'master');assert.equal(app.db.state.master.pass,'novaMestre123');assert.equal(app.db.state.trainers[0].password,'antiga123');
}));

test('senha lê a versão atual do banco e preserva mudanças remotas de outra conta',async()=>useApp(async app=>{
 login(app);app.db.state.trainers[1].password='mudouEmOutro123';app.db.state.campaign.name='Nova campanha remota';fillPassword(app,'player','antiga123','novaSenha123');await submitPassword(app,'player');
 assert.equal(app.db.state.trainers[1].password,'mudouEmOutro123');assert.equal(app.db.state.campaign.name,'Nova campanha remota');
 app.db.state.trainers[0].password='alteradaEmOutro123';fillPassword(app,'player','novaSenha123','maisNovaSenha123');await submitPassword(app,'player');assert.ok(app.el('#playerPasswordError').textContent.includes('Recarregue'));assert.equal(app.db.state.trainers[0].password,'alteradaEmOutro123');
}));

test('catálogo remoto prevalece e PP zero não é convertido em 10 na migração',async()=>useApp(async app=>{
 assert.equal(app.eval('!!pokemonById(99)'),false);
 app.eval("ensureMoveForAttack({nome:'Zero antigo',pp:0})");assert.equal(app.eval("moves.find(m=>m.nome==='Zero antigo').pp"),0);
}));

test('ataque selecionado aplica dano, desconta PP e pula NPC sem vida; ações repetidas e fora do turno são recusadas',async()=>useApp(async app=>{
 login(app);app.eval("nav('encounter')");app.el('[data-player-attack="move-a"]').click();
 assert.ok(app.el('[data-attack-id="move-a"]').classList.contains('selected'));assert.ok(!app.el('#battleTargetSection').classList.contains('hidden'));assert.ok(!app.el('[data-target-id="c-dead"]'));
 app.el('[data-target-id="c-npc"]').click();assert.equal(app.eval("battleHpInfo(battleParticipantById('c-npc')).current"),35);assert.equal(app.eval("battleAttacksForParticipant(battleParticipantById('c-player'))[0].ppAtual"),1);assert.equal(app.eval('state.encounter.activeParticipantId'),'c-npc');
 app.eval("applyBattleAttack('c-player','move-a','c-npc')");assert.equal(app.eval("battleHpInfo(battleParticipantById('c-npc')).current"),35);
 assert.equal(app.eval('pokemons[0].ataques[0].ppAtual'),2);assert.equal(app.eval("battleAttacksForParticipant(battleParticipantById('c-other'))[0].ppAtual"),2);
 app.eval("state.encounter.activeParticipantId='c-player';battleParticipantById('c-player').attacks[0].ppAtual=0;renderBattleAll()");assert.ok(app.el('[data-player-attack="move-a"]').disabled);app.eval("applyBattleAttack('c-player','move-a','c-npc')");assert.equal(app.eval("battleHpInfo(battleParticipantById('c-npc')).current"),35);
}));

test('PP do NPC é independente da espécie e permanece no JSON da batalha depois da recarga',async()=>useApp(async app=>{
 login(app,'master');app.eval("state.encounter.activeParticipantId='c-npc';nav('encounter');renderBattleAll()");app.el('[data-npc-attack="c-npc"][data-npc-attack-key="move-a"]').click();app.el('[data-target-id="c-player"]').click();
 assert.equal(app.eval('state.trainers[0].team[0].currentHp'),45);assert.equal(app.eval("battleAttacksForParticipant(battleParticipantById('c-npc'))[0].ppAtual"),1);assert.equal(app.eval('pokemons[2].ataques[0].ppAtual'),2);
 await app.eval('flushDbSave()');const reloaded=await mount(app.db);try{assert.equal(reloaded.eval("battleAttacksForParticipant(battleParticipantById('c-npc'))[0].ppAtual"),1);}finally{reloaded.close();}
}));

test('trocar Pokémon e voltar preserva PP; escolher o mesmo Pokémon não consome o turno',async()=>useApp(async app=>{
 login(app);app.eval("applyBattleAttack('c-player','move-a','c-npc');state.encounter.activeParticipantId='c-player';chooseBattlePokemon(me(),battleParticipantById('c-player'),true)");app.el('[data-battle-pick="1"]').click();assert.equal(app.eval('state.encounter.activeParticipantId'),'c-player');
 app.el('[data-battle-pick="2"]').click();assert.equal(app.eval("battleParticipantById('c-player').pokemonId"),2);
 app.eval("state.encounter.activeParticipantId='c-player';chooseBattlePokemon(me(),battleParticipantById('c-player'),true)");app.el('[data-battle-pick="1"]').click();assert.equal(app.eval("battleAttacksForParticipant(battleParticipantById('c-player'))[0].ppAtual"),1);
}));

test('jogador com Pokémon nocauteado e reserva viva mantém seu turno; grupo inteiro sem vida encerra a ordem',async()=>useApp(async app=>{
 app.eval("state.trainers[0].team[0].currentHp=0;state.encounter.activeParticipantId='c-other';battleNextTurn()");assert.equal(app.eval('state.encounter.activeParticipantId'),'c-player');
 app.eval("state.trainers.forEach(t=>t.team.forEach(a=>a.currentHp=0));state.encounter.combatants.filter(c=>c.kind==='npc').forEach(c=>c.currentHp=0);battleNextTurn()");assert.equal(app.eval('state.encounter.activeParticipantId'),null);
}));

test('salvamento usa uma fotografia consistente dos três RPCs e recupera a fila após falha',async()=>useApp(async app=>{
 const first=app.mock.calls.length;app.mock.holdMove=true;app.eval("moves[0].nome='Primeiro';pokemons[0].nome='Primeiro';state.campaign.name='Primeiro';save()");await until(()=>app.mock.moveWaiting);
 app.eval("moves[0].nome='Segundo';pokemons[0].nome='Segundo';state.campaign.name='Segundo';save()");app.mock.releaseMove();await app.eval('flushDbSave()');
 const writes=app.mock.calls.slice(first).filter(c=>c.name.startsWith('trainerdex_save_'));assert.equal(writes[0].payload[0].nome,'Primeiro');assert.equal(writes[1].payload[0].nome,'Primeiro');assert.equal(writes[2].payload.campaign.name,'Primeiro');assert.equal(app.db.state.campaign.name,'Segundo');assert.equal(app.db.catalog[0].nome,'Segundo');
 app.mock.failState=1;app.eval("state.campaign.name='Retry';save()");await assert.rejects(app.eval('flushDbSave()'));assert.equal(app.eval('dbSyncStatus'),'error');await app.eval('flushDbSave()');assert.equal(app.db.state.campaign.name,'Retry');assert.equal(app.eval('dbSyncStatus'),'saved');
}));

test('novo upload durante um upload não é perdido; URL nova evita imagem antiga no cache',async()=>useApp(async app=>{
 app.mock.holdUpload=true;app.w.__image=IMAGE;app.eval("pokemons[0]._newImage=window.__image;pokemons[0].imagem=window.__image;save()");await until(()=>app.mock.uploadWaiting);
 app.eval("pokemons[0]._newImage=window.__image+'\\n';pokemons[0].imagem=pokemons[0]._newImage;save()");app.mock.releaseUpload();await app.eval('flushDbSave()');assert.equal(app.mock.uploads.length,2);assert.notEqual(app.mock.uploads[0].path,app.mock.uploads[1].path);assert.equal(app.eval('pokemons[0]._newImage'),undefined);assert.ok(app.db.catalog[0].imagem.endsWith(app.mock.uploads[1].path));assert.ok(app.mock.removals.includes(app.mock.uploads[0].path));assert.ok(!app.mock.removals.includes(app.mock.uploads[1].path));
}));

test('nomes, URLs e tipos não injetam atributos ou HTML nas fichas',async()=>useApp(async app=>{
 login(app);app.eval(`pokemons[0].nome='<img src=x onerror=alert(1)>';pokemons[0].imagem='x" onerror="alert(1)';pokemons[0].tipo='X" onclick="alert(1)';renderDex();openAssignedPokemon(1)`);
 assert.equal(app.all('[onerror],[onclick]').length,0);assert.ok(app.el('#modalContent h2').textContent.includes('<img'));assert.equal(app.all('#modalContent h2 img').length,0);assert.ok(app.el('#app').hasAttribute('inert'));
 app.w.document.dispatchEvent(new app.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(app.el('#modal').getAttribute('aria-hidden'),'true');assert.ok(!app.el('#app').hasAttribute('inert'));assert.equal(app.el('#modalContent').textContent,'');
}));

test('falha ao carregar ataques bloqueia login e qualquer gravação',async()=>useApp(async app=>{
 assert.equal(app.eval('appReady'),false);assert.equal(app.eval('dbReady'),false);assert.ok(app.el('#masterLoginBtn').disabled);assert.equal(app.mock.calls.filter(c=>c.name.startsWith('trainerdex_save_')).length,0);
},fixture(),{failMoves:true}));

test('jogador em batalha não pode ser excluído; sair aguarda alterações e mantém sessão se falhar',async()=>useApp(async app=>{
 login(app,'master');app.eval("nav('trainers')");app.el('[data-del="player-1"]').click();assert.equal(app.eval('state.trainers.length'),2);
 app.mock.failState=1;app.eval("state.campaign.name='Pendente';save()");app.el('#logout').click();await until(()=>!app.el('#logout').disabled);assert.equal(app.eval('session.role'),'master');app.el('#logout').click();await until(()=>app.eval('session===null'));assert.equal(app.db.state.campaign.name,'Pendente');
}));

test('Service Worker guarda somente estáticos versionados e preserva caches alheios',async()=>{
 const events={},deleted=[],cacheMap=new Map(),fetches=[],pending=[];
 const cache={async addAll(paths){for(const file of paths)cacheMap.set(new URL(file,'https://trainerdex.test/app/').href,new Response('asset'));},async match(req){return cacheMap.get(req.url);},async put(req,response){cacheMap.set(req.url,response);}};
 const sandbox={URL,Response,Promise,Set,self:{registration:{scope:'https://trainerdex.test/app/'},addEventListener:(key,fn)=>events[key]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},caches:{open:async()=>cache,keys:async()=>['trainerdex-v42','trainerdex-v43','outro-app'],delete:async key=>{deleted.push(key);}},fetch:async req=>{fetches.push(req.url);return new Response('network');}};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'sw.js'),'utf8'),sandbox);
 events.install({waitUntil:p=>pending.push(p)});await Promise.all(pending);events.activate({waitUntil:p=>pending.push(p)});await Promise.all(pending);assert.deepEqual(deleted,['trainerdex-v42']);
 for(const url of ['https://trainerdex.test/app/api/private','https://trainerdex.test/app/dados.json','https://outro.test/app.js','https://trainerdex.test/app/style.css?v=42']){
  let intercepted=false;events.fetch({request:new Request(url),respondWith(){intercepted=true;}});assert.equal(intercepted,false,url);
 }
 let response;events.fetch({request:new Request('https://trainerdex.test/app/account.js?v=43'),respondWith:p=>response=p,waitUntil:p=>pending.push(p)});assert.equal(await (await response).text(),'asset');assert.equal(fetches.length,0);
});


test('salvamento comum conserva senhas remotas e permite redefinição explícita pelo Mestre',async()=>useApp(async app=>{
 login(app,'master');app.db.state.trainers[0].password='novaRemota123';app.db.state.master.pass='mestreRemoto123';app.eval("state.campaign.name='Edição local';save()");await app.eval('flushDbSave()');
 assert.equal(app.db.state.trainers[0].password,'novaRemota123');assert.equal(app.db.state.master.pass,'mestreRemoto123');assert.equal(app.eval('state.trainers[0].password'),'novaRemota123');
 app.eval("editTrainer('player-1')");app.el('#trName').value='Ana editada';app.el('#saveTrainer').click();await app.eval('flushDbSave()');assert.equal(app.db.state.trainers[0].password,'novaRemota123');
 app.eval("editTrainer('player-1')");app.el('#trPass').value='redefinida123';app.el('#saveTrainer').click();await app.eval('flushDbSave()');assert.equal(app.db.state.trainers[0].password,'redefinida123');assert.equal(app.eval('pendingTrainerPasswordEdits.size'),0);
}));
