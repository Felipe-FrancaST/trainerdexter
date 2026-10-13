/* TrainerDex — atributo do move conforme a referência da campanha. */
const MOVE_ATTRIBUTE_LABELS = Object.freeze({FOR:'For',DES:'Des',CON:'Con',INT:'Int',SAB:'Sab',CAR:'Car'});
const MOVE_ATTRIBUTE_NAMES = Object.freeze({FOR:'Força',DES:'Destreza',CON:'Constituição',INT:'Inteligência',SAB:'Sabedoria',CAR:'Carisma'});
const moveAttributeKey = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const MOVE_ATTRIBUTE_REFERENCE = new Map(Object.entries(window.TRAINERDEX_MOVE_ATTRIBUTE_DATA || {})
  .map(([name,value]) => [moveAttributeKey(name),value]));

function normalizeMoveAttribute(value) {
  if (typeof value !== 'string') return null;
  const special = {nenhum:'Nenhum',qualquer:'Qualquer',variavel:'Variável'},key = moveAttributeKey(value);
  if (Object.hasOwn(special,key)) return special[key];
  const attributes = value.split('/').map(part => part.trim().toUpperCase());
  if (!attributes.length || attributes.some(attribute => !Object.hasOwn(MOVE_ATTRIBUTE_LABELS,attribute))) return null;
  return [...new Set(attributes)].join('/');
}

function moveAttributeValue(move) {
  if (!move) return null;
  const linked = move.moveId && typeof moves !== 'undefined'
    ? moves.find(candidate => String(candidate.id) === String(move.moveId)) : null;
  const candidates = linked ? [linked,move] : [move];
  // O nome original reconhece o move mesmo quando seu nome exibido está traduzido.
  for (const candidate of candidates) {
    for (const name of [candidate.nomeOriginal,candidate.nome,candidate.id]) {
      const value = MOVE_ATTRIBUTE_REFERENCE.get(moveAttributeKey(name));
      if (value !== undefined) return normalizeMoveAttribute(value);
    }
  }
  // Preserva um atributo válido já cadastrado em ataques fora da referência.
  for (const candidate of candidates) {
    const value = normalizeMoveAttribute(candidate.atributo);
    if (value !== null) return value;
  }
  return null;
}

function moveAttributeLabel(move, value = moveAttributeValue(move)) {
  return value === null ? 'Não informado' : value.split('/').map(attribute => MOVE_ATTRIBUTE_LABELS[attribute] || attribute).join('/');
}

function moveAttributeBadge(move) {
  const value = moveAttributeValue(move),label = moveAttributeLabel(move,value);
  const special = {
    Nenhum:'Este move não usa atributo, conforme a referência da campanha.',
    Qualquer:'Qualquer atributo, conforme a regra deste move.',
    'Variável':'O atributo depende do efeito definido para este move.'
  };
  const title = value === null ? 'Este move não foi encontrado na lista de atributos.'
    : special[value] || value.split('/').map(attribute => MOVE_ATTRIBUTE_NAMES[attribute]).join(' / ');
  return `<span class="tag move-attribute${value === null || value === 'Nenhum' ? ' move-attribute-muted' : ''}" data-move-attribute="${esc(value || '')}" title="${esc(title)}">Atributo: ${esc(label)}</span>`;
}

function hydrateMoveAttributes() {
  moves.forEach(move => { const value = moveAttributeValue(move); if (value !== null) move.atributo = value; });
}
