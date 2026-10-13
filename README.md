# TrainerDex v43

Site estático para administrar uma campanha Pokémon, jogadores, Time/PC, Pokédex, ataques, notas e batalhas. Os dados e imagens continuam usando o Supabase já configurado em `supabase-config.js`.

## Atualizar um site existente

1. Extraia o ZIP e substitua os arquivos da hospedagem pelos arquivos da pasta `app/`. Inclua os novos `account.js` e `battle-actions.js`.
2. Mantenha a configuração do seu projeto Supabase em `supabase-config.js`.
3. No computador, recarregue com **Ctrl+Shift+R**. No celular, feche e abra novamente o site; se necessário, limpe o cache do site.
4. Entre como jogador e abra **Minha conta → Alterar minha senha**. Informe a senha atual, uma nova senha de 8 a 128 caracteres e a confirmação. Aguarde **Senha alterada com sucesso**.

A v43 usa os RPCs e campos de campanha/encontro que o site já utiliza. Não exige uma nova tabela para a troca de senha. As configurações opcionais de ensino de ataques e bônus global continuam dependendo das tabelas instaladas anteriormente.

**Esta entrega é uma atualização do site existente.** O ZIP enviado não continha os SQLs antigos citados nos changelogs. Esses arquivos históricos não foram inventados ou substituídos; para instalar um banco novo, será necessário obter o esquema e os RPCs da instalação original.

## Mudanças principais

- Cabeçalhos no celular sem o grande espaço vazio causado pela base flexível fixa; imagens da Pokédex carregam sob demanda.
- Área **Minha conta**, com acesso pelo painel inicial e menus de desktop/celular.
- Senha do jogador e do Mestre confirmada após a resposta do banco; formulário bloqueado durante a operação e confirmação duplicada evitada.
- Validação de senha atual, confirmação, tamanho, senha repetida e senha formada apenas por espaços. As senhas antigas continuam sendo aceitas no login.
- Salvamento com uma fotografia consistente dos dados, tentativa após erro, envio das alterações ao sair e indicação de pendências.
- Ataque clicado fica selecionado; PP é descontado e ataques sem PP são bloqueados. PP fica separado por combatente/Pokémon **durante a batalha** e é armazenado no JSON de ataques do encontro já existente. Uma batalha nova inicia um novo controle de PP.
- Turnos pulam NPCs sem vida e jogadores sem nenhum Pokémon vivo; jogadores com uma reserva viva podem substituir o Pokémon nocauteado.
- Pokémon excluído não reaparece por causa de um catálogo antigo no estado da campanha.
- Uploads de imagem não perdem uma edição feita durante o envio; novas URLs evitam mostrar a capa antiga do cache.
- Escape de conteúdo em fichas, validação de URLs de imagem, janela com foco contido e cache restrito aos arquivos estáticos conhecidos.

Consulte `CHANGELOG_V43.md` para detalhes e limites da revisão.

## Arquivos de execução

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Telas e campos da interface |
| `style.css` | Aparência e adaptação às telas menores |
| `app.js` | Navegação, catálogo, campanha, Time/PC e batalha |
| `account.js` | Formulários de senha do Mestre e jogador |
| `battle-actions.js` | Seleção de ataque, validação do turno e PP |
| `supabase-store.js` | Leitura, fila de salvamento e imagens |
| `supabase-config.js` | URL e chave pública do projeto |
| `abilities-data.js` | Referência de habilidades |
| `sw.js` / `manifest.json` | Cache estático e instalação do aplicativo |

Não é necessário instalar dependências para hospedar o site. `package.json`, `package-lock.json` e `tests/` servem somente para as verificações locais e não precisam ser publicados.

## Verificação local

Com Node.js 20 ou mais recente, execute na pasta `app/`:

```sh
npm ci
npm run check
npm test
```

Os testes usam DOM e Supabase simulados e não acessam o banco da campanha.

## Limites de segurança e concorrência

O projeto recebido valida o login no navegador e retorna senhas dentro do estado da campanha. Esta atualização mantém esse modelo por compatibilidade e **não o transforma em autenticação de servidor**. Ocultar abas, mascarar campos e pedir a senha atual são controles da interface; não impedem uma pessoa com acesso às APIs de contornar o frontend.

A proteção de produção exige migrar as contas para [Supabase Auth](https://supabase.com/docs/guides/auth/passwords), retirar senhas do estado público e revisar as permissões dos RPCs, tabelas e Storage com [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). A troca de senha de usuários desse modelo usa [Auth updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser). A chave pública do frontend não substitui essas permissões.

A fila corrigida evita inconsistências dentro de uma aba. O RPC geral ainda salva a campanha inteira, em chamadas separadas para biblioteca, catálogo e estado. Portanto, gravações simultâneas de abas/pessoas diferentes ainda podem sobrescrever dados; resolver isso exige transações/revisões e autorização no servidor. A troca de senha consulta o estado atual antes de gravar, mas a leitura e a gravação ainda são chamadas separadas.

O banco real, seu esquema, as políticas e a hospedagem não foram alterados ou validados nesta revisão. Uma resposta perdida após uma gravação de senha pode deixar a troca sem confirmação no navegador; nesse caso, recarregue e confira o acesso.
