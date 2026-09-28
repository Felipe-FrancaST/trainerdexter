# TrainerDex — Auditoria e melhoria mobile

## Objetivo
Melhorar a experiência em smartphones sem alterar as regras de negócio, dados ou fluxo da aplicação.

## Principais ajustes
- Cabeçalhos e ações passam a empilhar corretamente em telas pequenas.
- Controles principais receberam áreas de toque mais confortáveis.
- Campos de formulário usam tamanho de fonte adequado para evitar zoom automático em iOS.
- Cards de Pokémon e cards do time foram adaptados para larguras pequenas.
- Listas e linhas com ações podem quebrar linha sem causar overflow horizontal.
- Tabelas mantêm rolagem horizontal apenas dentro do próprio contêiner.
- Barra de navegação inferior recebeu suporte a safe-area/notch e rolagem horizontal.
- Conteúdo ganhou espaço inferior compatível com a barra de navegação fixa.
- Modais em celulares foram convertidos em bottom sheets com rolagem interna.
- Modais e formulários receberam tratamento para teclado virtual e telas em landscape.
- Batalhas foram ajustadas para leitura e toque em telas pequenas.
- Toasts foram reposicionados para não ficarem escondidos pela navegação inferior.
- Tela de login foi adaptada para telas baixas e teclado virtual.
- Animação de evolução foi limitada à viewport.
- Adicionado suporte a `prefers-reduced-motion`.
- Hover foi neutralizado em dispositivos touch para evitar estados estranhos após toque.
- Metadados de instalação mobile/PWA foram reforçados.
- Cache do Service Worker atualizado para `trainerdex-v34`.

## Validações
- JavaScript: `app.js`, `supabase-store.js` e `supabase-config.js` sem erros de sintaxe.
- CSS: parsing completo sem erros.
- Nenhuma regra de negócio foi modificada.
- Nenhuma estrutura do Supabase foi alterada.
