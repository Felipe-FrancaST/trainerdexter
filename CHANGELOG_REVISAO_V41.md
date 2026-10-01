# Revisão geral do TrainerDex — v41

## Correções encontradas e aplicadas

- **Pokédex:** o filtro de situação voltava para “Todos” após renderizar. Agora mantém a seleção durante buscas e atualizações.
- **Capturas:** pesquisar no seletor de Pokémon recriava os botões sem seus eventos. Os resultados continuam clicáveis depois da busca; ela também aceita número e tipo.
- **HP:** a inicialização restaurava a vida de um Pokémon de nível superior a 1 quando seu HP atual coincidia com o HP base da espécie. Agora preserva esse dano ao recarregar.
- **Ataques:** salvar uma ficha substituía o dano por zero e algumas normalizações restauravam PP esgotado. Agora preserva dano e PP, com campo de dano no editor.
- **Edição de Pokémon:** uma validação recusada podia deixar alterações parciais no catálogo. A ficha é validada antes de aplicar as mudanças. Ciclos de evolução são recusados.
- **Cadastro de Pokémon:** cancelar um novo Pokémon deixava o rascunho no catálogo. O cadastro só entra no catálogo ao salvar.
- **Imagens:** a imagem selecionada deixava de ser marcada para upload antes de ser enviada. Agora fica em rascunho até salvar, é enviada ao Storage e a marca temporária só sai depois do upload. A limpeza de uma imagem excluída só ocorre após confirmação de salvamento no banco.
- **Evolução:** o ID antigo podia permanecer na lista de capturados e reaparecer no PC. Agora é substituído corretamente. Anotações acompanham a evolução; cliques repetidos são protegidos e uma evolução já capturada é recusada.
- **Evoluções cadastradas:** a inicialização sobrescrevia relações editadas com a estrutura padrão. Agora preenche apenas relações antigas sem definição explícita.
- **Anotações:** fechar a ficha antes do temporizador de feedback terminar podia gerar erro. O temporizador é cancelado/validado.
- **Jogadores:** editar um acesso agora valida campos obrigatórios e nomes de usuário duplicados, inclusive diferenças de maiúsculas.
- **Navegação:** o botão “Nova batalha” aparecia para jogadores. Agora os controles e rotas seguem o papel do acesso. A animação de evolução é cancelada ao sair da conta.
- **Carregamento:** falhar ao carregar a biblioteca de ataques podia iniciar gravações com uma lista vazia. Agora bloqueia login/gravações nessa situação e oferece nova tentativa.
- **Bônus global:** falhar ao salvar deixava a configuração alterada apenas na tela. Agora mantém a configuração anterior.
- **Cache:** o Service Worker limpa apenas caches do TrainerDex, preservando outros caches da mesma hospedagem.

## Melhorias por aba

| Área | Melhoria |
| --- | --- |
| Início do jogador | Resumo real do Time/PC, atalhos e fichas acessíveis pelo painel |
| Pokédex | Contador dos resultados, botão de limpar filtros e identificação correta dos não descobertos |
| Ataques | Cartões compactos, descrição visível e editor recolhível |
| Time e PC | Busca por nome/número/tipo/natureza, filtros de vida, resumos, natureza e tipos nos cartões |
| Time e PC | Envio direto ao Time quando há vaga e armazenamento direto no PC; trocas continuam disponíveis |
| Notas | Pesquisa em título/conteúdo, ordenação e cartões organizados |
| Configurações | Orientação de salvamento e identificação da versão |
| Login | Estado de carregamento, nova tentativa e entrada pelo Enter |
| Geral | Indicador de alterações pendentes/salvando/salvo/erro, nova tentativa de salvar e fechamento de janelas com Escape |

A movimentação de um Pokémon que está participando da batalha deve aguardar sua substituição na batalha, evitando que o combatente aponte para um Pokémon fora do Time.

## Atualização

1. Publique os arquivos da pasta `app/` na hospedagem. Os arquivos de execução alterados são `app.js`, `supabase-store.js`, `index.html`, `style.css` e `sw.js`.
2. Recarregue o site com **Ctrl+Shift+R** e aguarde o carregamento da campanha.
3. As escolhas de ensino da v40 continuam usando **ENSINAR_ATAQUES_SETUP.sql**. Se você já o executou, não precisa repetir.
4. O ZIP agora também inclui **GLOBAL_PROFICIENCY_SETUP.sql**, que já era citado pela aplicação mas não acompanhava o projeto. Execute somente se o bônus global ainda não estiver configurado no Supabase. Ele preserva a configuração existente.
5. Aguarde o indicador **Tudo salvo** antes de encerrar o navegador após alterações.

O modelo atual de login frontend e as RPCs existentes foram mantidos. Os SQLs seguem esse modelo; não constituem autenticação de servidor.

## Validação

Passaram as três suítes de integração com DOM/Supabase simulados: revisão geral das abas, ensino de ataques individuais e regressão de batalhas. Incluem erros de carregamento/salvamento, preservação de HP/PP/dano/imagens, edição/cadastro, capturas, filtros, Time/PC, evolução, notas e senha. Foram reproduzidos os defeitos anteriores de HP, filtro e clique após pesquisa antes de validar a correção. Todos os arquivos JavaScript passaram na verificação de sintaxe; o HTML não tem IDs repetidos.

A renderização em navegador, a hospedagem, a execução dos SQLs e o banco real não foram validados neste ambiente. A revisão não migra o projeto para um novo sistema de login.
