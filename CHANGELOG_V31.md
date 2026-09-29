# TrainerDex Mobile v31

- A lista de Pokémon em **Jogadores → Avistar** é ordenada pela numeração da Pokédex, com ID como desempate.
- O catálogo em memória combina os registros remotos com os já salvos no estado da campanha; para IDs repetidos, os dados remotos prevalecem.
- Um número formatado é exibido como fallback quando o campo `numero` estiver vazio.
- Cache do service worker atualizado para `trainerdex-v38`.
