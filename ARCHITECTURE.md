# KURIO — Arquitetura e decisões técnicas

## 1. Escopo e componentes

- **React 19 e TypeScript:** telas Home, Details, Cart, Checkout, Order, Auth e Account; Shell compartilhado.
- **TanStack Router:** rotas e filtros/ordenação/paginação no estado de URL; guardas de sessão em checkout, carteira, perfil e pedidos; acesso direto via fallback da SPA.
- **TanStack Query:** cache separado por usuário, identificador de NFT e parâmetros de consulta. O `QueryClient` padrão utiliza `staleTime: 15000`, `retry: 1` e `refetchOnWindowFocus: false`. Sessão utiliza stale time próprio de 60 s e não refaz automaticamente em falha.
- **Axios:** cliente `baseURL: '/api'` com timeout 10 s, token Bearer e `X-Guest-Id`; aguarda `mockReady`. Expiração HTTP 401 dispara a limpeza do contexto privado.
- **Tailwind 3 / componentes shadcn/ui (base Radix):** classes utilitárias e abstrações locais em `src/components/ui`.
- **MSW v2:** interceptação na camada de rede, handlers em `src/mocks/handlers.ts`, fixtures/estado em `src/mocks/db.ts`, Service Worker em `public/mockServiceWorker.js`. Sem respostas fictícias implementadas diretamente nos componentes.
- **Socket.IO:** `socket.io-client` com transporte WebSocket `/socket.io/`, emulado pelo `@mswjs/socket.io-binding` em `src/mocks/socket.ts`. O módulo do client só é importado depois de `mockReady` para garantir a interceptação.
- **Dinheiro fictício:** valores de ETH são strings decimais nos contratos e convertidos para unidades inteiras por `src/lib/money.ts` para evitar imprecisão.

## 2. Contratos REST (prefixo `/api`)

| Operação | Endpoint | Comportamento resumido |
| --- | --- | --- |
| Sessão | `GET /auth/session` | Recupera usuário autenticado ou 401 |
| Login | `POST /auth/login` | Credenciais fictícias, token e usuário |
| Cadastro | `POST /auth/register` | Cria usuário; validação e 409 em e-mail duplicado |
| Logout | `POST /auth/logout` | Invalida token simulado |
| Catálogo | `GET /nfts?q=&category=&network=&sort=&page=` | Filtros combinados, ordenação, paginação |
| Detalhe | `GET /nfts/:id` | NFT, edições e disponibilidade; 404 se inexistente |
| Favoritos | `GET /favorites`, `POST /favorites/:id`, `DELETE /favorites/:id` | Operações por usuário com autenticação |
| Carrinho | `GET /cart`, `POST /cart/items`, `PUT /cart/items/:id`, `DELETE /cart/items/:id` | Persistência e validação de estoque |
| Cotação | `POST /quote` | Corpo `{ coupon, network }`, retorno com subtotal, desconto, taxas, total, validade e fingerprint |
| Criar pedido | `POST /orders` | Corpo `{quoteFingerprint,coupon,network,walletId,collector}`, cabeçalho obrigatório `Idempotency-Key` |
| Consultar pedido | `GET /orders/:id` | Estado/recibo do usuário |
| Recuperar tentativa | `GET /orders/by-key/:key` | Reconciliação por chave após timeout |
| Perfil | `GET /profile`, `PUT /profile`, `PATCH /profile/password` | Nome, e-mail, avatar, validação/senha |
| Carteiras | `GET /wallets`, `POST /wallets`, `PATCH /wallets/:id` | Cadastro, edição e carteira principal |
| Conexão simulada | `POST /wallets/connect` | Aceite, recusa e rede |

Erros suportados pelos mocks incluem 400, 401, 404, 409, 422 e falhas HTTP 5xx/rede. Há atraso, latência variável, timeouts e respostas fora de ordem. Os contratos TypeScript e mapeamento Axios estão em `src/types.ts` e `src/lib/api.ts`.

## 3. Sessão, autorização e isolamento

O token fictício fica em `localStorage` (`kurio-session`), e o mock persiste sessões com expiração. Páginas privadas dependem de `beforeLoad` do TanStack Router. Um 401 limpa token e cache e redireciona ao login quando necessário, mantendo a rota de retorno. Logout e troca de usuário limpam dados do cache de consultas e encerram subscriptions do Socket.IO; eventos com usuário diferente não atualizam pedidos privados. Senhas fictícias persistidas no mock não são guardadas em texto simples.

O banco simulado é armazenado **no navegador**, não num servidor remoto. Portanto, diferentes dispositivos não compartilham alterações; o sistema não é uma solução de autenticação real nem um backend seguro para dados reais.

## 4. Carrinho, checkout e pedidos

O carrinho pertence ao visitante (`X-Guest-Id`) ou à conta autenticada e é mantido ao atualizar a página. Depois do login, preserva-se o contexto dos itens do visitante. Edição/quantidade e disponibilidade são verificadas pelo mock. A API `POST /quote` calcula os valores em ETH e emite um fingerprint de preço/estoque/cupom/rede.

Ao revisar o pagamento, uma nova cotação é obtida. Se o fingerprint ou os valores mudarem, uma nova confirmação é exigida. Um pedido usa `Idempotency-Key`, vinculada ao usuário e ao corpo enviado: requisições repetidas recuperam a mesma compra fictícia; reutilização para outro conteúdo resulta em conflito. Pedidos podem estar pendentes, confirmados ou recusados; após timeout, o cliente consulta `/orders/by-key/:key` antes de tentar nova compra. O recibo mantém o snapshot do pedido, sem atualizar seus preços em mudanças posteriores do catálogo.

## 5. Cache, atualização otimista e REST × Socket.IO

As consultas do catálogo incluem filtros/ordenação/paginação em suas chaves; detalhe usa ID do NFT; dados privados usam usuário. Favoritos são atualizados de maneira otimista e revertidos se a mutation falhar. Alterações de carrinho, sessão, perfil e pedidos invalidam consultas relacionadas.

Eventos:

| Evento | Payload | Regra |
| --- | --- | --- |
| `nft.updated` | `{eventId,resourceId,version,data}` | Atualiza preço/estoque; ignora duplicatas e versões antigas; invalida catálogo e cotação |
| `order.updated` | `{eventId,resourceId,version,userId,data}` | Atualiza apenas o pedido do usuário correto; eventos terminais não devem regredir |
| `kurio.hello` / `kurio.ready` | Handshake demonstrativo | Confirmar transporte real pelo cliente Socket.IO |

Na reconexão, o evento `connect` invalida caches relevantes para reconciliar via REST; ao desmontar o contexto ou trocar sessão, o client remove listeners e desconecta. Para simular falhas do transporte, `POST /api/__test/disconnect`; para atualização real, `POST /api/__test/change-nft`.

## 6. Cenários, fixtures e reset

O MSW possui dois usuários fictícios, NFTs em categorias/redes/edições variadas e estados reproduzíveis. `POST /api/__test/scenario` aceita `default`, `empty`, `slow`, `variable-latency`, `offline`, `client-error`, `server-error`, `out-of-order`, `expired-session`, `mutation-error`, `price-change`, `sold-out`, `declined-payment`, `timeout-after-create`, `duplicate-events`, `wallet-refusal`.

`POST /api/__test/reset` reconstrói o estado inicial conhecido. `POST /api/__test/old-event` emite versão antiga; `POST /api/__test/expire-session` expira sessão; `POST /api/__test/disconnect` interrompe socket. Veja exemplos executáveis no README.

## 7. Deployment e limitações

Deploy de frontend estático Vite na Vercel: `npm ci` → `npm run build` → `dist`, com `vercel.json` fazendo fallback de rotas SPA para `/index.html`. O MSW Service Worker fica na raiz pública como `/mockServiceWorker.js` e precisa ser servido com conteúdo JavaScript (não HTML de fallback). Assets `/assets/*`, `/art/*` e `/fonts/*` devem funcionar sem rewrite incorreto. O browser deve operar sob HTTPS.

Os mocks e o Socket.IO são simulações **em memória/armazenamento local do navegador**, não um backend dedicado ou WebSocket num servidor Vercel. Por isso, sessões não são compartilhadas entre browsers diferentes; não há transações reais nem proteção para produção financeira. `VITE_ENABLE_MOCKS=false` só deve ser usado quando houver um backend real compatível (fora do escopo).

## 8. Performance, testes e fidelidade visual

Build reprodutível: Vite + script `scripts/otimizar-build.mjs`, que insere CSS da aplicação no HTML e antecipa carregamento do módulo MSW. **Não remover esse script do build de entrega**, pois as medianas mobile aprovadas foram medidas com ele.

Resultados **reportados pelo autor no Windows, em preview local da build otimizada** (3 medições/página/perfil): Performance Home Mobile **92**, NFT Mobile **91**, Home Desktop **99** e NFT Desktop **99**; Accessibility, Best Practices e SEO **100** nos quatro cenários; Playwright **108/108**. São evidências locais; não se afirma aprovação de um deploy público até verificação posterior.

Foram feitas capturas Playwright em 390, 768 e 1440 px com baselines para Home, detalhes, carrinho e checkout. O Figma rege cores, hierarquia, tipografia e composição; a comparação direta ao Figma ainda deve ser comprovada visualmente em avaliação. Acessibilidade inclui foco, semântica, mensagens associadas a campos, feedback e suporte a movimento reduzido.

**Decisões de UX / desvios conhecidos:** páginas adicionais fora do escopo (suporte, downloads, ofertas, atividade) não são simuladas como fluxos concluídos; autenticação, carteiras e pagamentos são rotulados como simulações; as telas não desenhadas no Figma seguem os padrões de composição existentes. Nenhuma diferença específica ao Figma é afirmada sem confronto dos frames originais.
