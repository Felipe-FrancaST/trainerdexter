# TrainerDex + Supabase

A persistência do TrainerDex foi organizada para o Supabase sem precisar reescrever as telas do aplicativo.

## O que fica no Supabase

- `trainerdex_campaigns` — campanha e configurações do Mestre.
- `trainerdex_trainers` — jogadores e acessos.
- `trainerdex_pokemon` — cadastro dos Pokémon, atributos, habilidades, perícias e ataques.
- `trainerdex_trainer_pokemon` — Pokémon avistados/capturados, nível, HP e habilidades escolhidas por jogador.
- `trainerdex_trainer_pokemon_notes` — anotações privadas de cada jogador sobre seus Pokémon.
- `trainerdex_campaign_notes` — notas do Mestre.
- `trainerdex_move_overrides` — alterações feitas pelo Mestre na biblioteca de ataques.
- `trainerdex_encounters`, `trainerdex_encounter_participants` e `trainerdex_encounter_logs` — estado e histórico da batalha atual.
- `trainerdex_state` — mantida como backup/migração do formato antigo, não é mais usada como fonte principal.

## Imagens

As imagens enviadas pelo Mestre vão para o Storage bucket `trainerdex-images`, na pasta `pokemon/`. O banco guarda somente o caminho/URL da imagem; o arquivo binário não fica dentro de JSON ou coluna `jsonb`.

O site aceita imagens de até 8 MB por arquivo.

## Configuração

1. Abra o **SQL Editor** do Supabase.
2. Execute todo o conteúdo de `supabase.sql`.
3. Publique os arquivos atualizados do projeto.
4. Mantenha `supabase-config.js` com a URL e a Publishable Key (ou antiga anon key) do projeto.
5. Abra o site uma vez. Se existir o antigo registro `trainerdex_state`, ele será migrado automaticamente para as novas tabelas.

## Observação de segurança

O projeto atual ainda usa o login Mestre/Jogador implementado no frontend, porque essa mudança preserva a aplicação existente. Portanto, as credenciais não devem ser consideradas uma autenticação forte de produção. O próximo passo, se quiser, é migrar o login para **Supabase Auth + RLS por campanha/jogador**.


## Correção Time + PC
Se a coluna `in_team` já foi criada, rode `SUPABASE_PC_CORRECAO.sql` no SQL Editor do Supabase para atualizar as RPCs de carregamento e salvamento do Time/PC.


## Migração dos arquivos locais para o Supabase

A versão atual do aplicativo faz uma migração inicial automática dos arquivos que antes eram locais:

- `data/pokemon.json` → catálogo de Pokémon persistido no Supabase.
- `data/moves.json` → `trainerdex_move_library`.
- `img/pokemon/*.png` → bucket `trainerdex-images`, pasta `pokemon/`.
- `img/icons/trainerdex-home.png` → bucket `trainerdex-images`, pasta `assets/`.
- `localStorage` → não é mais usado como armazenamento da campanha.

### Ordem correta

1. Execute `SUPABASE_MIGRATION_LOCAL_ASSETS.sql` no SQL Editor. **Essa versão também cria as políticas do Storage necessárias para o frontend enviar as imagens.**
2. Publique a versão **com os arquivos locais**.
3. Abra o site e entre normalmente.
4. Aguarde a migração terminar e recarregue a página. A partir daí, o catálogo e as imagens devem continuar aparecendo mesmo que os arquivos locais sejam removidos.
5. Se tudo estiver correto, publique a versão **sem os arquivos locais**. Nessa versão `data/` e `img/pokemon/` já não existem.
6. Não apague os arquivos locais antes do primeiro carregamento bem-sucedido da migração.

A migração usa `upsert` no Storage, então recarregar durante uma tentativa incompleta não duplica as imagens. Se aparecer erro HTTP 400 no upload, as políticas do Storage não foram aplicadas: execute novamente o SQL completo.
