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
