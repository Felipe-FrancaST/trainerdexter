# TrainerDex v44 — atributos dos moves

A lista fornecida de 675 movimentos foi incorporada ao site. O atributo acompanha o ataque na ficha do Pokémon do jogador, tanto no Time quanto no PC, e também aparece na batalha, no seletor de ataques, na biblioteca do Mestre, na edição da espécie e nas telas de ensino.

## Referência

Os nomes originais dos moves são usados para associar o atributo, mesmo quando o nome exibido está traduzido. A comparação desconsidera maiúsculas, acentos, espaços e pontuação. Ataques aprendidos por nível e ataques ensinados usam a mesma referência.

A ordem da lista é preservada. Exemplos:

| Move | Atributo exibido |
| --- | --- |
| Absorb | For/Des |
| Counter | Des/For |
| Psychic | Int/Sab |
| Psybeam | Des/Int/Sab |
| Double Slap | For/Des/Car |
| Acupressure | Nenhum |
| Hidden Power | Qualquer |
| Nature Power | Variável |

A ficha mostra **Atributo: For/Des**, por exemplo, junto ao tipo e ao PP do ataque. A dica do marcador também apresenta os nomes completos dos atributos.

Os valores **Nenhum**, **Qualquer** e **Variável**, assim como as combinações com três atributos, foram mantidos conforme o arquivo recebido. Não foi escolhido um único atributo quando a lista forneceu alternativas.

## Cadastro e compatibilidade

- Um novo ataque criado pelo Mestre com um nome original reconhecido recebe o atributo correspondente.
- Um ataque fora da lista preserva um campo `atributo` válido que já exista no seu cadastro. Se não houver referência nem campo válido, mostra **Não informado**, distinguindo-o de **Nenhum**. Para vincular um ataque existente à referência, informe o nome original da lista no editor da biblioteca.
- Não é necessário executar SQL novo para esta atualização. A referência faz parte dos arquivos do site e reaplica os valores ao carregar, inclusive quando os RPCs antigos não armazenam o campo adicional.
- O atributo é uma informação do move. A atualização não altera a fórmula de dano, a escolha de alvo, o PP, o avanço do turno ou os atributos da ficha do Pokémon.
- Todas as correções e a área **Minha conta** da v43 foram preservadas.

## Atualizar o site

Substitua os arquivos da hospedagem pelo conteúdo da pasta `app/`. Inclua os novos `move-attributes-data.js` e `move-attributes.js`, além de atualizar `index.html`, `app.js`, `battle-actions.js`, `style.css` e `sw.js`.

No computador, recarregue com **Ctrl+Shift+R**. No celular, feche e abra o site novamente; se necessário, limpe o cache do site. O cache estático e a identificação da versão foram atualizados para **v44**.

## Validação

- 26 testes locais passaram, usando DOM e Supabase simulados.
- Comparação dos 675 valores com uma cópia integral da lista original.
- Testes de nomes traduzidos, pontuação, ordem dos atributos, três atributos, valores especiais, campos inválidos, ataques no Time/PC, ensino e novo cadastro.
- Recarga simulada após remover o campo novo dos dados retornados pelos RPCs: os atributos continuam aparecendo pela referência.
- Regressões de senha, salvamento, PP, dano, turnos, imagens, cache e permissões da interface.
- Conferência em Chromium: ficha do jogador, ataques ensinados, controles e seletor da batalha em desktop e telas de 390 e 320 px, sem sobreposição de atributo/dano/PP e sem rolagem horizontal.
- HTML sem IDs repetidos, scripts locais presentes e verificação de sintaxe de todos os scripts de execução.

O Supabase da campanha não foi alterado pelos testes. Os limites de autenticação e concorrência da instalação original continuam documentados no `README.md`.
