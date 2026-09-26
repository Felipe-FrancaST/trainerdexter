# TrainerDex + Supabase

## O que foi alterado

- `app.js` agora mantém o `localStorage` como cache/offline e sincroniza o estado persistente com o Supabase.
- A primeira execução com Supabase configurado migra automaticamente o estado que já estiver no `localStorage`.
- O formato interno do estado foi mantido, então as telas existentes não precisam ser reescritas nesta etapa.
- `supabase-config.js` concentra a URL e a publishable key do projeto.
- `supabase.sql` cria a tabela `trainerdex_state` e as policies necessárias para esta primeira etapa.
- `index.html` carrega `supabase-js` via CDN.

## Configuração

1. No Supabase, abra o SQL Editor.
2. Execute todo o conteúdo de `supabase.sql`.
3. Abra `supabase-config.js`.
4. Troque:
   - `enabled: false` por `enabled: true`
   - `url` pela URL do seu projeto
   - `publishableKey` pela Publishable Key do projeto
5. Publique o site normalmente no GitHub Pages/servidor atual.

A chave usada no navegador deve ser a Publishable Key (ou a antiga anon key), nunca a `service_role`.

## Migração dos dados atuais

O navegador que já possui os dados do TrainerDex em `localStorage` fará a migração automaticamente quando abrir a versão nova pela primeira vez com o Supabase configurado:

- se já existir um registro no Supabase, ele será carregado;
- se ainda não existir, o estado local existente será enviado para o Supabase;
- depois disso, cada `save()` continua atualizando o cache local e agenda uma gravação no banco.

## Importante sobre segurança

Esta primeira etapa é uma migração de persistência, não uma migração do sistema de autenticação.

O projeto atual guarda os logins do Mestre/Jogadores dentro do próprio estado. Por isso, as policies iniciais permitem que o cliente web acesse o estado da campanha. Isso não deve ser considerado segurança de produção.

A próxima etapa recomendada é migrar os usuários do TrainerDex para Supabase Auth e separar os dados em tabelas com RLS por usuário/campanha. O Supabase recomenda combinar Auth + RLS para controlar acesso aos dados no banco.

## Estrutura futura recomendada

Depois de confirmar que a persistência está funcionando, podemos normalizar o banco em:

- `campaigns`
- `trainers`
- `trainer_pokemon`
- `pokemon_catalog`
- `moves`
- `notes`
- `battles`
- `battle_participants`

Isso permitirá permissões por Mestre/Jogador, consultas menores e sincronização em tempo real sem precisar salvar o estado inteiro como JSON.
