# TrainerDex v24 — SR, CA e Vida por Dado

Alterações desta versão:
- Cada Pokémon possui **SR (raridade)** e **CA** editáveis pelo Mestre.
- Cada Pokémon possui **Dado de Vida** editável (d4, d6, d8, d10, d12 ou d20).
- A **Vida padrão** é definida para o nível 1.
- Vida máxima: `Vida do nível 1 + (nível - 1) × valor máximo do Dado de Vida`.
- Exemplo: Vida 40 + d10 → nível 1 = 40 HP, nível 2 = 50 HP, nível 3 = 60 HP.
- Ao subir de nível, o HP máximo aumenta automaticamente e o HP atual recebe o mesmo aumento, mantendo o dano já sofrido.
- NPCs também usam automaticamente a vida calculada pelo nível e dado de vida.
- Mantidos os sistemas anteriores de habilidades, ataques, capturas, evolução e batalha.


## Organização do código

- `index.html` — estrutura das telas e pontos de montagem da interface.
- `style.css` — estilos responsivos da aplicação.
- `app.js` — interface, regras da campanha, Pokédex e batalha.
- `supabase-store.js` — persistência, fila de salvamento e Storage do Supabase.
- `supabase-config.js` — configuração do cliente Supabase.
- `sw.js` — cache dos arquivos estáticos do aplicativo.

A separação da camada de persistência evita que a lógica de banco fique misturada com a interface e facilita futuras alterações no armazenamento.

## Armazenamento
Esta versão usa exclusivamente o Supabase para catálogo, ataques, campanha e imagens. Não depende de data/ ou img/.

## Atualização v40 — Jogadores e ensino de ataques

O Mestre pode ensinar, excluir e restaurar ataques individuais em **Jogadores → Pokémon → Ensinar**. A ficha do jogador e a batalha respeitam essas escolhas. A aba Jogadores também ganhou pesquisa, filtros, HP nos cartões e PC recolhível.

**Antes de usar o ensino**, execute `ENSINAR_ATAQUES_SETUP.sql` no SQL Editor do seu Supabase. Consulte `CHANGELOG_JOGADORES_V40.md` para instalação e detalhes.

## Atualização v41 — revisão geral

Veja `CHANGELOG_REVISAO_V41.md` para as correções em Pokédex, Ataques, captura, evolução, HP/PP, imagens, Time/PC, Notas, login e salvamento. O indicador no rodapé confirma quando as alterações chegaram ao banco. A v41 mantém o ensino individual da v40.

O arquivo `GLOBAL_PROFICIENCY_SETUP.sql` agora acompanha o projeto; ele só é necessário se o bônus global ainda não estiver configurado.
