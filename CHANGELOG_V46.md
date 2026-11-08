# TrainerDex v46 — sincronização de campanha

- Atualização automática da campanha entre abas/dispositivos a cada 12 segundos e ao retornar à aba, sem recarregar a página.
- Bloqueio de atualização remota durante salvamentos pendentes, falhas de rede e edição em formulários/modais.
- Proteção contra substituir o catálogo local ao atualizar apenas o estado da campanha.
- Revisão dos limites de nível na edição de NPCs e acessibilidade das tipagens.
- Atualização das versões de arquivos e cache do service worker.

## Limitações
A atualização da campanha é por consulta periódica (até ~12 s), não push instantâneo. Edições simultâneas do mesmo registro ainda podem entrar em conflito: para resolvê-las de forma transacional seria necessário alterar funções e tabelas no Supabase.
Não foi alterado o sistema de senhas/autenticação, conforme solicitado.
