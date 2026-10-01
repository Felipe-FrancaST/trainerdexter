# TrainerDex v42 — novos ataques e navegação no celular

## Cadastro de ataques

- Botão **+ Novo ataque**, exclusivo do Mestre, na aba Ataques.
- Nome, nome original opcional, tipo, PP máximo e descrição/regras.
- Cancelar descarta o rascunho; o ataque entra na biblioteca somente ao criar.
- Validação de nome vazio, nomes repetidos (inclusive acentos/pontuação) e PP inteiro não negativo.
- O mesmo ataque pode ser selecionado na ficha da espécie ou ensinado a um Pokémon individual.
- Edição também impede renomear um ataque para o nome de outro, evitando fusões ao recarregar.
- Gravação pela biblioteca existente do Supabase. Não exige SQL adicional para criar ataques.

## Celular

- Menu inferior substituído por menu lateral em telas de até 900 px.
- Cabeçalho com botão de menu e nome da tela atual; abas com ícones e texto, aba ativa destacada e saída da campanha.
- Menu específico do Mestre ou do jogador; Batalha aparece para o jogador quando ele participa.
- Fechamento por navegação, botão, fundo ou Escape; saída remove o menu e libera a rolagem.
- Navegação por teclado mantém o foco no menu aberto; conteúdo de fundo fica inativo até fechar.
- Cartões de ataques em uma coluna no celular e duas em telas intermediárias.
- Campos com fonte de 16 px, ações com área de toque maior, melhor quebra de títulos e botões, janelas roláveis e espaço para áreas seguras da tela.
- Configuração de viewport para redimensionamento do conteúdo com teclado virtual nos navegadores compatíveis.
- Cache atualizado para `trainerdex-v42`.

## Instalação

Substitua todos os arquivos do site pelos conteúdos da pasta `app`. No computador, recarregue com Ctrl+Shift+R; no celular, feche e abra o site novamente. A versão exibida em Configurações é **v42**.

O ensino individual continua exigindo `ENSINAR_ATAQUES_SETUP.sql` se a tabela ainda não foi instalada na atualização v40. Nenhuma configuração nova é necessária para o menu ou para o cadastro de ataques.

## Verificação

Testes locais de integração com DOM e banco simulados: criação, cancelamento, validação, PP zero, gravação e recarga da biblioteca, ensino do novo ataque, ficha do jogador, bloqueio por papel, menu lateral, teclado/Escape, navegação, saída e repetição do salvamento após erro. Os testes anteriores de todas as abas, ensino individual e batalhas também passaram.

O Supabase da campanha não foi alterado pelos testes. A aparência e o teclado virtual devem ser conferidos no navegador e no celular de uso.
