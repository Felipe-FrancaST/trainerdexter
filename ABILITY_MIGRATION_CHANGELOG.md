# TrainerDex — Migração de habilidades

A versão 26 preenche os campos `habilidades[0]` e `habilidades[1]` já existentes no catálogo com os dados fornecidos pelo Mestre para os 151 Pokémon.

- Não foi criada uma tabela nova.
- O catálogo continua sendo salvo pelo RPC `trainerdex_save_pokemon_catalog`.
- A migração roda uma única vez por campanha (`abilityDataVersion = 1`).
- Depois da migração, alterações manuais feitas pelo Mestre são preservadas.
- Quando a fonte informa que não existe habilidade oculta, o segundo campo recebe `Não possui` e não pode ser atribuído ao Pokémon do jogador.

A lista foi incorporada ao arquivo `abilities-data.js`, carregado antes da aplicação.
