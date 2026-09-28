# TrainerDex v24 — limpeza técnica

## Alterações
- Separada a camada de persistência do Supabase em `supabase-store.js`.
- Mantido `app.js` focado na interface, regras da campanha, Pokédex e batalha.
- Melhorada a organização do cliente Supabase em `supabase-config.js`.
- Service Worker atualizado para `v33`, incluindo o novo arquivo de persistência no cache.
- Registro do Service Worker agora trata falhas sem gerar erro não tratado.
- Adicionado `id="mainContent"` ao conteúdo principal para facilitar acessibilidade e futuras melhorias.
- Atualizado o README com a arquitetura dos arquivos.

## Preservado
- Estrutura de dados existente.
- RPCs e nomes usados pelo Supabase.
- Login atual Mestre/Jogador.
- Pokédex, Time/PC, ataques, habilidades, evolução e batalhas.
- Regras de HP, CA, SR, dado de vida e demais campos existentes.

## Observação
O ZIP recebido não contém `supabase.sql`, embora o README faça referência a ele. Nenhuma estrutura SQL foi inventada ou alterada nesta limpeza.
