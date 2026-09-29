# TrainerDex v28 — Proficiência global e numeração das naturezas

- Adicionado à Pokédex do Mestre um controle para ativar/desativar um bônus de proficiência global e definir seu valor (0–20).
- Quando ativo, o bônus global substitui o bônus individual configurado em cada Pokémon nas perícias proficientes.
- Quando desativado, cada Pokémon volta a usar seu próprio bônus individual.
- A configuração global é salva no estado da campanha via Supabase, usando o mecanismo de persistência existente.
- As 20 naturezas agora são numeradas de `1 - Rebelde` a `20 - Esperto` nas opções e nos locais em que a natureza é exibida.
- Atualizada a versão do cache do Service Worker para `trainerdex-v36`.
