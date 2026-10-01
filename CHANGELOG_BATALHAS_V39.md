# Correção da aba Batalha — v39

O botão “Iniciar batalha” chamava `openBattleStart()`, mas essa função não existia no arquivo enviado. Isso causava `ReferenceError: openBattleStart is not defined`.

## Alterações

- Criada a janela de início/reconfiguração com nome da batalha, seleção de jogadores e iniciativa.
- A nova batalha organiza os participantes por iniciativa; cada jogador escolhe seu Pokémon pelo fluxo existente.
- Permitido iniciar sem jogadores para adicionar Pokémon NPC.
- Reconfigurações preservam NPCs, HP, escolhas dos jogadores mantidos, rodada, turno válido, notas e histórico.
- Corrigidos os botões que permaneciam ocultos ao trocar o acesso de jogador para Mestre.
- Mantido o índice do turno consistente ao ordenar ou remover participantes.
- Corrigido o botão “Continuar batalha” da confirmação de encerramento.
- Atualizadas as versões dos arquivos e do cache para v39.

## Como aplicar

1. Extraia o ZIP e substitua `app.js`, `style.css`, `index.html` e `sw.js` da sua hospedagem pelos arquivos da pasta `app/`.
2. Abra novamente o site e recarregue com Ctrl+Shift+R para receber a versão nova.
3. Entre como Mestre, abra Batalha e clique em “Iniciar batalha”. Selecione jogadores, informe a iniciativa e confirme. Depois, adicione os NPCs.

Nenhuma alteração no esquema SQL ou na configuração do Supabase é necessária para esta correção.

## Validação

Verificação de sintaxe JavaScript e testes de integração com DOM e Supabase simulados: reprodução do erro original, abertura/cancelamento, validação de iniciativa, início da batalha, ordenação, NPCs, turnos/rodadas, dano/cura, escolha do Pokémon, troca de acesso, reconfiguração, remoção do jogador ativo, envio ao RPC de salvamento e encerramento.

Os testes passaram. A hospedagem, a renderização em navegador e o Supabase real não foram validados neste ambiente.
