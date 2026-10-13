# TrainerDex v43 — revisão e conta do jogador

## Minha conta

O jogador altera sua própria senha em **Minha conta**. A área aparece no menu de desktop, no menu do celular e nos atalhos do início. O formulário não permite selecionar outro jogador.

A senha atual é conferida; a nova senha precisa ter de 8 a 128 caracteres, não pode ser formada apenas por espaços nem repetir a atual, e a confirmação deve coincidir. O botão e os campos são bloqueados durante o envio. Só após uma resposta bem-sucedida do banco a senha local é atualizada e os campos são limpos. Se houver erro, o formulário conserva os valores para a tentativa seguinte e não agenda uma nova senha para o salvamento automático.

O Mestre usa o mesmo fluxo em **Configurações**. O salvamento da senha lê a campanha atual no banco e muda a credencial correspondente nesse estado, preservando outras alterações já retornadas nessa leitura.

## Problemas corrigidos

| Problema no código enviado | Correção |
| --- | --- |
| Mestre recebia aviso de troca de senha antes da confirmação de gravação | Formulário aguarda o RPC e só então atualiza a credencial local |
| Jogador não tinha tela para trocar sua senha | Nova área de conta com senha atual, confirmação e opção de exibição |
| Ataques não descontavam PP | Desconto de um PP e bloqueio quando esgotado, por combatente/Pokémon na batalha |
| Clicar em um ataque abria o seletor sem selecionar o ataque escolhido | Ataque clicado fica selecionado e os alvos aparecem |
| NPC reutilizava referências dos ataques da espécie | Cópias independentes; o PP de um combatente não muda a espécie nem outro combatente |
| Ordem de turnos incluía NPC derrotado | Avança até um combatente capaz de agir; considera reservas vivas dos jogadores |
| Estado antigo da campanha podia trazer Pokémon excluído de volta | Catálogo remoto é a fonte atual dos Pokémon |
| PP zero em um ataque legado virava 10 | Normalização distingue zero de ausência de valor |
| Edição durante gravação misturava versões entre RPCs | Biblioteca, catálogo e campanha são clonados no mesmo momento |
| Uma falha podia impedir a confirmação de quem aguardava salvamento | A fila propaga a falha e pode ser retomada |
| Uma aba antiga podia restaurar a senha anterior no salvamento comum | Senhas atuais do banco são preservadas, salvo redefinição explícita pelo Mestre |
| Sair podia acontecer antes de enviar alterações pendentes | Saída aguarda a fila; erro mantém a sessão para nova tentativa |
| Uma imagem escolhida durante outro upload podia ser descartada | Upload compara o rascunho enviado com o atual e envia a edição mais recente |
| Mesma URL de capa mantinha imagem antiga em cache | Cada capa nova usa um caminho único; limpeza só após salvar e verificar referências |
| Algumas imagens/tipos eram interpolados sem proteção de atributos | Escape de atributos, validação de protocolos e tipos de imagem PNG/JPEG/WebP/GIF |
| Jogador podia ser excluído enquanto participava de uma batalha | Exclusão pede primeiro sua remoção da batalha |
| Janela permitia foco no conteúdo de fundo | Fundo inativo, navegação por Tab contida e retorno do foco ao fechar |
| Títulos criavam um espaço vertical de cerca de 280 px no celular | Base flexível automática no cabeçalho, compatível com a disposição em coluna |
| Service Worker guardava qualquer caminho de mesma origem | Lista explícita de estáticos e cache versionado v43 |

O PP desta versão é um recurso do encontro. Trocar de Pokémon e retornar conserva o consumo na mesma batalha. Uma nova batalha reinicia o controle; não é um sistema de descanso/PP permanente fora do encontro.

## Validação

- 18 testes de integração com DOM/Supabase simulados: acesso às rotas, menus, formulário, validações, sucesso/erro, submissão dupla, senha de outro jogador, login após alteração, consulta do estado atual, catálogo, PP zero, escolha de ataque, dano/PP, bloqueio por turno, troca de Pokémon, recarga do encontro, reservas vivas, fila consistente, recuperação após falha, upload concorrente, conteúdo malformado, fechamento da janela, erro de carregamento, exclusão e saída.
- Chromium: conferência visual em desktop e em 390, 360 e 320 px, sem rolagem horizontal na área da conta; menus, troca de senha, seleção de ataque, PP e foco da janela passaram com banco simulado.
- Verificação de sintaxe de todos os scripts de execução.
- HTML com IDs únicos e todos os scripts locais presentes.
- Reprodução no código original de PP não descontado, turno de NPC sem vida, catálogo excluído ressuscitado e ausência da área Minha conta.

As verificações não executam operações no Supabase da campanha. O esquema dos RPCs, suas permissões e a persistência no banco real precisam ser conferidos na instalação existente; o código-fonte de SQL desses RPCs não estava no arquivo enviado.

## Instalação

Substitua os arquivos da hospedagem pelos arquivos da pasta `app/`, incluindo os dois scripts novos. Recarregue com Ctrl+Shift+R no computador. As rotas e as configurações da campanha seguem o modelo existente.

O login ainda é implementado no frontend. A revisão não elimina a exposição das credenciais no estado nem torna o salvamento geral transacional entre vários clientes. Consulte os limites e os links oficiais no `README.md`.
