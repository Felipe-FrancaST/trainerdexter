/* TrainerDex — ataques e PP isolados por combatente/Pokémon na batalha. */
function battleAttacksForParticipant(combatant) {
  const pokemon = battlePokemonForParticipant(combatant);
  if (!pokemon) return [];
  const trainer = state.trainers.find(t => t.id === combatant.trainerId);
  const assignment = trainer?.team?.find(a => Number(a.pokemonId) === Number(pokemon.id));
  const definitions = combatant.kind === 'player'
    ? (assignment ? assignmentAttacks(pokemon, assignment) : [])
    : npcAttacksForLevel(pokemon, combatant.level);
  return definitions.map(attack => {
    const previous = (combatant.attacks || []).find(saved =>
      Number(saved.pokemonId ?? combatant.pokemonId) === Number(pokemon.id) &&
      personalMoveKey(saved) === personalMoveKey(attack));
    const max = Math.max(0, Math.trunc(Number(attack.ppMax ?? attack.pp) || 0));
    return {...attack, atributo: moveAttributeValue(attack), pokemonId: pokemon.id, ppMax: max,
      ppAtual: Math.max(0, Math.min(max, Math.trunc(Number(previous?.ppAtual ?? max) || 0)))};
  });
}

function battleCanAttack(combatant) {
  if (!combatant || !state.encounter.battleActive ||
      state.encounter.activeParticipantId !== combatant.id || battleHpInfo(combatant).current <= 0) return false;
  return combatant.kind === 'npc' ? isMaster()
    : session?.role === 'player' && me()?.id === combatant.trainerId;
}

function applyBattleAttack(combatantId, moveId, targetId) {
  const combatant = battleParticipantById(combatantId);
  if (!battleCanAttack(combatant)) return toast('O ataque só pode ser usado no seu turno, com um Pokémon com vida.');
  const target = battleParticipantById(targetId);
  if (!target || target.id === combatant.id || battleHpInfo(target).current <= 0) {
    return toast('Escolha um alvo com vida na batalha atual.');
  }
  const attack = battleAttacksForParticipant(combatant).find(a => personalMoveKey(a) === moveId);
  if (!attack) return toast('Este ataque não está disponível.');
  if (attack.ppAtual <= 0) return toast('Este ataque está sem PP. Escolha outro ataque.');
  const hp = battleHpInfo(target), damage = Math.max(0, Number(attack.dano) || 0);
  const next = Math.max(0, hp.current - damage);
  if (target.kind === 'player') {
    const trainer = state.trainers.find(t => t.id === target.trainerId);
    const assignment = trainer?.team?.find(a => Number(a.pokemonId) === Number(target.pokemonId));
    if (!assignment) return toast('O Pokémon do alvo não está mais no time.');
    assignment.currentHp = next;
  } else target.currentHp = next;

  // JSON de ataques já existente no encontro: conserva PP ao trocar e voltar ao Pokémon.
  combatant.attacks = (combatant.attacks || []).filter(saved =>
    !(Number(saved.pokemonId ?? combatant.pokemonId) === Number(attack.pokemonId) &&
      personalMoveKey(saved) === moveId));
  combatant.attacks.push({...attack, ppAtual: attack.ppAtual - 1});
  const pokemon = battlePokemonForParticipant(combatant);
  battleLog(`${pokemon.nome} usou ${attack.nome} em ${battleName(target)}: ${hp.current} → ${next} HP. PP ${attack.ppAtual - 1}/${attack.ppMax}.`);
  closeModal();
  battleNextTurn();
  renderDashboard();
  renderTeam();
  renderPC();
}

function openParticipantAttackPicker(combatant, selectedMove = null) {
  if (!battleCanAttack(combatant)) return toast('O ataque só pode ser usado no seu turno.');
  const pokemon = battlePokemonForParticipant(combatant);
  const attacks = battleAttacksForParticipant(combatant);
  if (!attacks.length) return toast('Nenhum ataque disponível neste nível.');
  const targets = state.encounter.combatants.filter(c => c.id !== combatant.id && battleHpInfo(c).current > 0);
  if (!targets.length) return toast('Não há outro combatente com vida para selecionar como alvo.');
  $('#modalContent').innerHTML = `<div class="modal-head"><div><h2>Escolher ataque</h2><p class="muted">${esc(pokemon.nome)} • Nível ${combatant.level}</p></div><button class="btn" data-close>Fechar</button></div>
    <div class="battle-attack-grid">${attacks.map(attack => `<button class="battle-attack-card" data-attack-id="${esc(personalMoveKey(attack))}" ${attack.ppAtual <= 0 ? 'disabled' : ''}>
      <span class="battle-attack-top"><strong>${esc(attack.nome)}</strong>${typeTags(attack.tipo)}</span>
      <span class="battle-attack-attributes">${moveAttributeBadge(attack)}</span>
      <span class="battle-attack-damage">Dano ${Number(attack.dano) || 0} • PP ${attack.ppAtual}/${attack.ppMax}</span>
      <small>${esc(attack.ppAtual <= 0 ? 'Sem PP nesta batalha' : attack.descricao || '')}</small></button>`).join('')}</div>
    <div class="battle-target-section hidden" id="battleTargetSection"><h3>Escolha o alvo</h3><div class="battle-target-grid">${targets.map(target => {
      const hp = battleHpInfo(target);
      return `<button class="battle-target-card" data-target-id="${esc(target.id)}"><img src="${esc(imageUrl(battleAvatar(target)))}" alt=""><strong>${esc(battleName(target))}</strong><small>${hp.current}/${hp.max} HP</small></button>`;
    }).join('')}</div></div>`;
  showModal();
  $('[data-close]').onclick = closeModal;
  $$('[data-attack-id]').forEach(button => { button.onclick = () => {
    $('#battleTargetSection').classList.remove('hidden');
    $('#battleTargetSection').dataset.selectedMove = button.dataset.attackId;
    $$('[data-attack-id]').forEach(other => other.classList.toggle('selected', other === button));
  }; });
  $$('[data-target-id]').forEach(button => { button.onclick = () => {
    const moveId = $('#battleTargetSection').dataset.selectedMove;
    if (moveId) applyBattleAttack(combatant.id, moveId, button.dataset.targetId);
  }; });
  const selected = $$('[data-attack-id]').find(button => button.dataset.attackId === selectedMove && !button.disabled);
  if (selected) { selected.click(); $$('[data-target-id]')[0]?.focus(); }
}

function openNpcAttackPicker(npcId, selectedMove = null) {
  const combatant = battleParticipantById(npcId);
  if (!isMaster() || combatant?.kind !== 'npc') return;
  openParticipantAttackPicker(combatant, selectedMove);
}

function openBattleAttackPicker(selectedMove = null) {
  const trainer = me();
  const combatant = state.encounter.combatants.find(c => c.kind === 'player' && c.trainerId === trainer?.id);
  if (combatant) openParticipantAttackPicker(combatant, selectedMove);
}
