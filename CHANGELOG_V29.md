# TrainerDex v29 — Correção do bônus global de proficiência

- O bônus global agora é salvo e carregado de uma tabela Supabase dedicada (`trainerdex_global_settings`), em vez de depender do RPC de estado geral que não persiste campos arbitrários.
- A ativação/desativação e o valor do bônus exibem feedback em caso de erro.
- Incluído `GLOBAL_PROFICIENCY_SETUP.sql`, que deve ser executado uma vez no SQL Editor do Supabase antes da publicação.
- Atualizado o cache do service worker.

## Instalação
1. No Supabase, abra SQL Editor e execute todo o arquivo `GLOBAL_PROFICIENCY_SETUP.sql`.
2. Publique os arquivos desta versão.
3. Recarregue o site (se necessário, feche e abra novamente para atualizar o cache).
