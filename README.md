# KURIO — NFT Marketplace (simulação)

Implementação do desafio Frontend em **React, TypeScript, TanStack Router, TanStack Query, Axios, Tailwind CSS, componentes baseados em shadcn/ui, MSW, Socket.IO e Playwright**. A aplicação inclui catálogo, filtros, detalhes e edições de NFTs, favoritos, carrinho, checkout, pedidos, sessão, perfil e carteiras. **Não utiliza blockchain, dinheiro real nem pagamentos reais**.

> **Publicação:** substitua os marcadores abaixo após a implantação. Não invente URLs.
>
> - **Aplicação pública:** PREENCHER_APOS_DEPLOY
> - **Repositório:** PREENCHER_APOS_PUBLICAR_NO_GITHUB

## Pré-requisitos, instalação e desenvolvimento

- Node.js 22 ou 24 e npm; Chrome/Chromium via Playwright para E2E/Lighthouse.
- Não é necessário banco de dados, backend privado, API key ou gateway externo.
- Instalação a partir de um checkout limpo:

```bash
npm ci
npm run dev
```

Abra `http://localhost:5173`. A instalação executa `msw init public --save`, preparando o Service Worker. Em produção, o worker deve ser servido em HTTPS (ou localhost durante o desenvolvimento).

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks MSW |
| `npm run worker:init` | Preparar `public/mockServiceWorker.js` |
| `npm run build` | TypeScript + Vite + otimização reprodutível de produção |
| `npm run preview` | Servir `dist` localmente (porta 4173) |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | ESLint |
| `npx playwright install chromium` | Instalar navegador de testes |
| `npx playwright test --workers=2` | Testes E2E, fluxos e snapshots |
| `npx playwright show-report` | Relatório HTML do Playwright |
| `npm run lighthouse` | Auditoria de Home e Detalhe (3 execuções/perfil) |

**Atenção à otimização aprovada:** o `package.json` entregue precisa manter o script `build` com `node scripts/otimizar-build.mjs`, além do próprio arquivo `scripts/otimizar-build.mjs`. O projeto não depende de um `dist` pré-compilado para reproduzir o resultado.

## Variáveis de ambiente

| Variável | Padrão / uso |
| --- | --- |
| `VITE_ENABLE_MOCKS` | Mocks habilitados por padrão. Não definir `false` no deploy demonstrativo; `false` exige backend externo, não fornecido. |
| `LIGHTHOUSE_BASE_URL` | URL do preview local para auditoria, por exemplo `http://127.0.0.1:4173` |
| `LIGHTHOUSE_RUNS` | `3` para auditoria completa |
| `LIGHTHOUSE_ONLY_MOBILE` | `1` apenas para diagnóstico mobile; omitir para auditoria completa |
| `CHROME_PATH` | Caminho para Chromium/Chrome no Windows quando necessário |

No Vercel, mantenha `VITE_ENABLE_MOCKS` **não definida**, ou use `true`. Variáveis `LIGHTHOUSE_*` e `CHROME_PATH` são usadas localmente pelo auditor, não pelo aplicativo em produção.

## Credenciais fictícias e cupons

| E-mail | Senha fictícia |
| --- | --- |
| `ana@kurio.demo` | `demo12345` |
| `leo@kurio.demo` | `demo12345` |

Cupom válido `KURIO10` (10%). `EXPIRADO` simula cupom vencido. Carteiras e pagamentos são somente simulações. Os dados ficam armazenados localmente no navegador, com isolamento lógico por usuário dentro da simulação.

## Cenários determinísticos MSW e reset

No console da aplicação, selecionar um cenário:

```js
await fetch('/api/__test/scenario', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'slow' })
})
```

Valores aceitos: `default`, `empty`, `slow`, `variable-latency`, `offline`, `client-error`, `server-error`, `out-of-order`, `expired-session`, `mutation-error`, `price-change`, `sold-out`, `declined-payment`, `timeout-after-create`, `duplicate-events`, `wallet-refusal`.

Reset integral do mock e do contexto local:

```js
await fetch('/api/__test/reset', { method: 'POST' })
localStorage.removeItem('kurio-session')
localStorage.removeItem('kurio-order-attempt')
location.reload()
```

**Cenários para avaliação:**

- Rede lenta: `slow`; rede indisponível: `offline`; HTTP 5xx: `server-error`.
- Busca fora de ordem: `out-of-order`; lista vazia: `empty`.
- Sessão expirada: `expired-session`; carteira recusada: `wallet-refusal`.
- Cupom inválido: `INVALIDO`; vencido: `EXPIRADO`.
- Preço alterado enquanto o carrinho está aberto: `price-change` ou `POST /api/__test/change-nft`.
- Edição esgotada: `sold-out`; pagamento recusado: `declined-payment`.
- Timeout após criar pedido: `timeout-after-create`; recuperar pelo botão da tela e pela chave idempotente, sem compra duplicada.
- Duplicatas ou eventos antigos: `duplicate-events` ou `POST /api/__test/old-event`.
- Desconectar socket: `POST /api/__test/disconnect` e verificar reconciliação por REST ao reconectar.

Essas rotas são **apenas da camada simulada**, não de um backend de produção.

## Hospedagem Vercel — deploy reproduzível

1. Publicar o projeto no GitHub com todos os arquivos de código, lockfile, mocks, fixtures, testes, assets, `vercel.json`, `ARCHITECTURE.md` e este README. Não enviar `node_modules`, `dist`, segredos ou backups.
2. Importar o repositório em https://vercel.com/new.
3. Framework Preset: **Vite**; Root Directory: raiz do projeto; Install Command: `npm ci`; Build Command: `npm run build`; Output Directory: `dist`.
4. Não desativar os mocks (`VITE_ENABLE_MOCKS=false` não é apropriado para esta demo).
5. Usar HTTPS da Vercel. O `vercel.json` faz o fallback das rotas da SPA para `/index.html`.
6. **Validar a URL pública de verdade**: abrir Home, abrir diretamente `/nft/emerald`, atualizar F5 nessa rota, fazer login, favoritar, adicionar NFT, simular compra e provocar atualização por Socket.IO; confirmar `/mockServiceWorker.js` como JavaScript e ausência de erro do Service Worker.
7. Colar acima os links reais de GitHub e Vercel e realizar novo commit/push para manter README e deploy correspondentes.

As integrações REST/WebSocket são interceptadas pelo MSW no navegador. A aplicação **não** mantém estado compartilhado entre navegadores ou usuários de dispositivos diferentes; cada instalação do browser tem seu armazenamento fictício. Essa é uma limitação documentada da demonstração, não deve ser anunciada como backend multiusuário real.

## Playwright e Lighthouse

```bash
npm ci
npx playwright install chromium
npm run lint
npm run typecheck
npm run build
npx playwright test --workers=2
```

Os snapshots versionados estão em `tests/visual.spec.ts-snapshots/`, cobrindo Home, NFT, carrinho e checkout em desktop, mobile e tablet. A atualização de snapshots exige revisão humana das imagens — não usá-la para esconder regressões.

Para Lighthouse (em outro terminal, com preview ativo):

```powershell
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
# Outro terminal:
$env:CHROME_PATH = (Get-ChildItem "$env:LOCALAPPDATA\ms-playwright" -Recurse -Filter chrome.exe | Select-Object -First 1).FullName
$env:LIGHTHOUSE_BASE_URL = 'http://127.0.0.1:4173'
$env:LIGHTHOUSE_RUNS = '3'
Remove-Item Env:LIGHTHOUSE_ONLY_MOBILE -ErrorAction SilentlyContinue
npm run lighthouse
```

**Última validação informada pelo autor, em Windows / preview de produção:** 108/108 testes, Home Mobile 92, NFT Mobile 91, Home/NFT Desktop 99; as demais categorias Lighthouse em 100. Foram 3 medições por página/perfil. Esses resultados são **locais**, não uma auditoria do site Vercel ainda não publicado.

O script da auditoria agora apresenta `metaOficial90` (Performance ≥90, Acessibilidade ≥95, Boas práticas ≥95 e SEO ≥90) e `metaExtra97` (objetivo opcional). Durante a execução, relatórios HTML/JSON e medianas são gerados em `lighthouse-report/`, que é ignorado pelo Git para evitar dezenas de relatórios antigos. Para comprovar a auditoria, copie apenas a rodada completa aprovada para `docs/evidence/lighthouse/` e faça o commit desses arquivos reais, sem fabricar resultados.

## Arquitetura, limites e fidelidade visual

Consulte [`ARCHITECTURE.md`](ARCHITECTURE.md) para contratos REST, eventos Socket.IO, sessão, cache, carrinho, política de idempotência, cenários e decisões técnicas. O Figma é a fonte de referência; os snapshots e os testes E2E **não comprovam sozinho** uma fidelidade visual pixel a pixel contra o Figma, que deve ser avaliada por comparação independente.
