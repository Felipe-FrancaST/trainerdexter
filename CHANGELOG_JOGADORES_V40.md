# Jogadores e ensino de ataques — v40

## Novidades

- Ao tocar em um Pokémon do Time ou PC na aba Jogadores, o Mestre encontra a opção **Ensinar**.
- A tela permite buscar ataques por nome ou tipo na biblioteca, ver descrição/PP e ensinar no nível atual.
- Ataques já disponíveis não aparecem novamente na lista de ensino.
- É possível excluir ataques disponíveis naquele nível e restaurá-los depois.
- As escolhas são individuais por jogador/Pokémon. O catálogo da espécie, os NPCs e os Pokémon de outros jogadores permanecem independentes.
- A ficha do jogador e os ataques da batalha usam a lista individual.
- Os ataques futuros da espécie continuam sendo liberados ao subir de nível, salvo aqueles que o Mestre removeu. A exclusão permanece até restaurar ou ensinar novamente.
- Ataques ensinados e exclusões são preservados entre Time/PC e na evolução.

## Aba Jogadores

- Resumo com jogadores, Pokémon capturados e Pokémon feridos.
- Busca por nome do jogador, usuário ou Pokémon do Time/PC.
- Filtros para jogadores com Pokémon feridos ou sem capturas.
- Cartões de time com nível, natureza, HP atual/máximo e barra de vida.
- PC em seção recolhível; a busca por Pokémon do PC abre essa seção.
- Acesso e ações organizados no cabeçalho/rodapé dos cartões. A senha continua disponível em **Editar acesso**.
- Ficha de gestão do Pokémon mostra localização, HP e quantidade de ataques atuais.
- Mantidas as ferramentas de cura e avistamento e a correção de batalhas v39.

## Instalação obrigatória para salvar ataques individuais

1. No projeto Supabase já usado pelo site, abra **SQL Editor → New query**.
2. Cole e execute todo o conteúdo de **ENSINAR_ATAQUES_SETUP.sql**, incluído nesta pasta. O script é reaplicável e cria somente a tabela/políticas necessárias para os ataques individuais; não substitui as RPCs existentes.
3. Publique os arquivos da pasta `app/` na hospedagem. Os arquivos de código alterados são `app.js`, `supabase-store.js`, `style.css`, `index.html` e `sw.js`.
4. Reabra o site e recarregue com **Ctrl+Shift+R** para receber a versão v40.
5. Entre como Mestre, abra **Jogadores → Pokémon → Ensinar**.

Sem a tabela nova, a aplicação continua carregando. A tela de ensino informa o arquivo SQL necessário e desabilita o salvamento. Falhas de rede não exibem uma alteração como salva nem substituem as escolhas anteriores.

A tabela usa o modelo de acesso atual do projeto, com login Mestre/Jogador no frontend. A permissão de Mestre é aplicada na interface; não é autenticação de servidor.

## Validação

Passaram as verificações de sintaxe JavaScript e os testes de integração com DOM/Supabase simulados:

- Busca/filtros/contadores e HP dos cartões.
- Ensino no nível atual, exclusão, restauração, prevenção de duplicatas e isolamento entre jogadores/espécie/NPCs.
- Ficha do jogador e escolha de ataques na batalha.
- Recuperação após nova inicialização, Time/PC, subida de nível e evolução.
- Falha de salvamento e ausência da tabela.
- Regressão do fluxo de batalhas v39.

O banco real, a execução do SQL e a renderização na hospedagem não foram validados neste ambiente.
