# KURIO — NFT Marketplace (Simulação)

Marketplace de NFTs desenvolvido como solução para um desafio técnico de Frontend.

O projeto utiliza **React, TypeScript, TanStack Router, TanStack Query, Axios, Tailwind CSS, componentes baseados em shadcn/ui, Mock Service Worker (MSW), Socket.IO e Playwright**.

A aplicação permite explorar coleções de NFTs, pesquisar e filtrar obras, visualizar detalhes e edições, gerenciar favoritos, adicionar itens ao carrinho, simular compras, acompanhar pedidos e administrar perfil e carteiras.

**Importante:** o KURIO é uma demonstração técnica. Não utiliza blockchain, dinheiro real, NFTs reais ou pagamentos verdadeiros.

---

## 1. Links oficiais

**Aplicação publicada:**  
https://kurio-nft-marketplace-rho.vercel.app/

**Repositório GitHub:**  
https://github.com/Renan1510/kurio-nft-marketplace

**Plataforma de hospedagem:** Vercel  
**Branch principal:** `main`  
**Framework:** React + TypeScript + Vite

A aplicação foi publicada por meio da integração entre GitHub e Vercel, com build de produção a partir do código-fonte do repositório.

---

## 2. Tecnologias utilizadas

| Tecnologia | Aplicação |
|---|---|
| React | Construção da interface |
| TypeScript | Tipagem e organização do código |
| Vite | Desenvolvimento e build |
| TanStack Router | Rotas e navegação |
| TanStack Query | Cache, consultas e mutações |
| Axios | Requisições HTTP |
| Tailwind CSS | Estilização |
| shadcn/ui e Radix UI | Componentes e acessibilidade |
| MSW | Simulação de APIs REST e serviços |
| Socket.IO | Comunicação e eventos em tempo real simulados |
| Playwright | Testes funcionais, E2E e visuais |
| Lighthouse | Auditoria de performance e qualidade |
| Vercel | Hospedagem pública |

---

## 3. Funcionalidades

O KURIO disponibiliza:

- Catálogo de NFTs com pesquisa, filtros, ordenação e paginação.
- Navegação com filtros representados na URL.
- Página individual de NFT com imagens, preço, disponibilidade e seleção de edições.
- Sistema de favoritos.
- Carrinho com atualização de quantidades e persistência simulada.
- Cupons de desconto e validação de valores.
- Checkout com carteira e rede fictícias.
- Revisão de pedidos e confirmação simulada.
- Histórico de pedidos e recibos.
- Cadastro, autenticação e gerenciamento de sessão.
- Perfil de usuário e carteiras cadastradas.
- Atualizações simuladas de preço e estoque por Socket.IO.
- Tratamento de carregamento, estados vazios, erros HTTP e falhas de conexão.
- Interface responsiva para desktop, tablet e dispositivos móveis.

---

## 4. Pré-requisitos

Para executar o projeto localmente:

- Node.js 22 ou 24.
- npm.
- Navegador moderno.
- Chromium instalado pelo Playwright para execução dos testes.

Não é necessário configurar banco de dados, blockchain, servidor privado, gateway de pagamento ou chave de API externa.

---

## 5. Instalação e execução local

Clone o repositório:

```bash
git clone https://github.com/Renan1510/kurio-nft-marketplace.git
cd kurio-nft-marketplace
```

Instale as dependências conforme o lockfile:

```bash
npm ci
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra:

http://localhost:5173/

O projeto utiliza MSW para interceptar e simular chamadas de API. O Service Worker é preparado pelos scripts de instalação e inicialização.

O Service Worker requer `localhost` ou um ambiente HTTPS.

---

## 6. Comandos disponíveis

| Comando | Descrição |
|---|---|
| `npm ci` | Instala as dependências conforme `package-lock.json` |
| `npm run dev` | Executa o ambiente de desenvolvimento |
| `npm run worker:init` | Prepara o Service Worker do MSW |
| `npm run build` | Verifica o TypeScript, compila com Vite e otimiza o build |
| `npm run preview` | Executa uma prévia do build de produção |
| `npm run typecheck` | Verifica os tipos TypeScript |
| `npm run lint` | Executa o ESLint |
| `npx playwright install chromium` | Instala o Chromium para os testes |
| `npx playwright test --workers=2` | Executa os testes automatizados |
| `npx playwright show-report` | Abre o relatório HTML do Playwright |
| `npm run lighthouse` | Executa as auditorias de qualidade |

### Build de produção

```bash
npm run build
```

O processo de build utiliza o comando configurado no `package.json`:

```bash
tsc -b && vite build && node scripts/otimizar-build.mjs
```

O script `scripts/otimizar-build.mjs` realiza otimizações de carregamento utilizadas nas medições finais.

Essa otimização faz parte do processo reproduzível de build. Não é necessário enviar a pasta `dist` pré-compilada para reconstruir a aplicação.

---

## 7. Variáveis de ambiente

| Variável | Finalidade |
|---|---|
| `VITE_ENABLE_MOCKS` | Controla a utilização dos mocks; habilitados por padrão |
| `LIGHTHOUSE_BASE_URL` | Define a URL utilizada pela auditoria Lighthouse |
| `LIGHTHOUSE_RUNS` | Define a quantidade de execuções |
| `LIGHTHOUSE_ONLY_MOBILE` | Permite auditoria apenas mobile para diagnóstico |
| `CHROME_PATH` | Caminho do executável Chromium/Chrome, quando necessário |

Na implantação de demonstração da Vercel, **não configurar `VITE_ENABLE_MOCKS=false`**.

Desabilitar os mocks exige um backend compatível, que não faz parte desta solução.

As variáveis de auditoria Lighthouse são utilizadas localmente e não precisam ser configuradas na Vercel.

---

## 8. Credenciais fictícias

Contas disponíveis para testar a aplicação:

| E-mail | Senha |
|---|---|
| `ana@kurio.demo` | `demo12345` |
| `leo@kurio.demo` | `demo12345` |

As credenciais são exclusivamente demonstrativas.

### Cupons

| Código | Comportamento |
|---|---|
| `KURIO10` | Aplica desconto fictício de 10% |
| `EXPIRADO` | Simula cupom vencido |
| Outros códigos | Sujeitos à validação da API simulada |

Nenhuma compra efetua cobrança ou transferência real de ativos.

---

## 9. API REST simulada e MSW

A aplicação utiliza **Mock Service Worker (MSW)** para simular requisições HTTP e respostas de serviços.

As interações de catálogo, autenticação, carrinho, pedidos e perfil são tratadas pela camada simulada, permitindo a execução sem backend privado.

Os mocks suportam condições normais de uso e cenários de falha reproduzíveis.

### Selecionar um cenário

Abra o Console do navegador na aplicação e execute:

```javascript
await fetch('/api/__test/scenario', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    key: 'slow'
  })
})
```

### Cenários disponíveis

| Cenário | Comportamento |
|---|---|
| `default` | Operação padrão |
| `empty` | Lista sem resultados |
| `slow` | Respostas lentas |
| `variable-latency` | Latência variável |
| `offline` | Falha de conectividade simulada |
| `client-error` | Erro HTTP do cliente |
| `server-error` | Erro HTTP do servidor |
| `out-of-order` | Respostas fora de ordem |
| `expired-session` | Sessão expirada |
| `mutation-error` | Falha em operações de escrita |
| `price-change` | Alteração de preço |
| `sold-out` | Item esgotado |
| `declined-payment` | Pagamento simulado recusado |
| `timeout-after-create` | Timeout após criação de pedido |
| `duplicate-events` | Eventos repetidos |
| `wallet-refusal` | Recusa de conexão de carteira |

### Restaurar os dados de demonstração

```javascript
await fetch('/api/__test/reset', {
  method: 'POST'
})

localStorage.removeItem('kurio-session')
localStorage.removeItem('kurio-order-attempt')

location.reload()
```

O reset restaura os dados simulados e limpa as informações locais de sessão indicadas acima.

Esses endpoints existem apenas para testes e demonstração.

---

## 10. Comunicação em tempo real — Socket.IO

O KURIO utiliza Socket.IO com a integração simulada pelo MSW para representar atualizações em tempo real.

Entre os comportamentos implementados estão:

- Atualização de preços dos NFTs.
- Alterações na disponibilidade e no estoque.
- Atualização do estado do carrinho.
- Tratamento de eventos duplicados ou antigos.
- Reconciliação de informações após reconexão.

### Reproduzir uma alteração de preço

Na página de detalhes do Emerald Ape, abra o Console e execute:

```javascript
await fetch('/api/__test/change-nft', {
  method: 'POST'
})
```

O cenário altera dados fictícios do NFT e emite o evento correspondente para os clientes simulados.

A interface deve refletir a alteração sem exigir uma atualização manual da página, desde que a comunicação esteja estabelecida.

### Testar desconexão

```javascript
await fetch('/api/__test/disconnect', {
  method: 'POST'
})
```

Esse cenário permite avaliar o tratamento de desconexões e a recuperação do estado por REST.

**Limitação:** o MSW e o Socket.IO da demonstração executam no contexto simulado do navegador. A aplicação não oferece um backend compartilhado entre dispositivos ou usuários reais.

---

## 11. Testes automatizados com Playwright

O projeto utiliza Playwright para verificar fluxos funcionais, regressões, acessibilidade e comportamento visual.

Instale o navegador de testes:

```bash
npx playwright install chromium
```

Execute:

```bash
npx playwright test --workers=2
```

Abra o relatório:

```bash
npx playwright show-report
```

Os testes abrangem, entre outros:

- Pesquisa, filtros e paginação.
- Autenticação e isolamento de usuários.
- Favoritos e carrinho.
- Validação de cupons.
- Compra simulada e emissão de recibos.
- Idempotência e recuperação de pedidos.
- Alterações de preço e eventos Socket.IO.
- Reconexão e reconciliação por REST.
- Estados vazios e respostas de erro.
- Navegação por teclado e comportamento responsivo.
- Regressão visual.

### Testes visuais

As referências encontram-se em:

`tests/visual.spec.ts-snapshots/`

Os cenários incluem Home, detalhes de NFT, carrinho e checkout, considerando desktop, tablet e mobile.

Alterações nas imagens de referência devem ser revisadas visualmente. Os snapshots não devem ser atualizados apenas para ocultar regressões.

### Resultado da validação local

**108 testes Playwright aprovados**, conforme execução realizada no Windows após o build otimizado.

Os comandos `lint`, `typecheck` e `build` também foram executados com sucesso nessa validação.

---

## 12. Auditoria Lighthouse

O projeto inclui um script para executar auditorias Lighthouse nas páginas Home e detalhes do NFT, em dispositivos mobile e desktop.

### Iniciar a versão de produção local

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Mantenha esse terminal aberto.

Em outro terminal PowerShell:

```powershell
$chrome = Get-ChildItem "$env:LOCALAPPDATA\ms-playwright" -Recurse -Filter chrome.exe -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $chrome) {
    throw "Chromium não encontrado."
}

$env:CHROME_PATH = $chrome.FullName
$env:LIGHTHOUSE_BASE_URL = "http://127.0.0.1:4173"
$env:LIGHTHOUSE_RUNS = "3"

Remove-Item Env:LIGHTHOUSE_ONLY_MOBILE -ErrorAction SilentlyContinue

npm run lighthouse
```

### Resultados da última auditoria local aprovada

Foram realizadas três medições por página e perfil.

| Página | Performance | Acessibilidade | Boas práticas | SEO |
|---|---:|---:|---:|---:|
| Home Mobile | **92** | 100 | 100 | 100 |
| NFT Mobile | **91** | 100 | 100 | 100 |
| Home Desktop | **99** | 100 | 100 | 100 |
| NFT Desktop | **99** | 100 | 100 | 100 |

### Metas do desafio

- Performance: mínimo de 90.
- Acessibilidade: mínimo de 95.
- Boas práticas: mínimo de 95.
- SEO: mínimo de 90.

**Todas essas metas foram atingidas na auditoria local informada acima.**

O script também pode apresentar uma meta adicional de 97 pontos. Essa meta extra não deve ser confundida com os limites oficiais do desafio.

**Observação:** as pontuações registradas foram obtidas no ambiente local de preview de produção. Não representam uma medição Lighthouse independente da URL pública da Vercel.

Os relatórios HTML/JSON são gerados em `lighthouse-report/`. As evidências da rodada aprovada devem ser preservadas e disponibilizadas junto à entrega, sem substituir medições reais por dados estimados.

---

## 13. Publicação na Vercel

O KURIO está publicado em:

https://kurio-nft-marketplace-rho.vercel.app/

O deploy utiliza o repositório GitHub:

https://github.com/Renan1510/kurio-nft-marketplace

### Configurações utilizadas

| Configuração | Valor |
|---|---|
| Plataforma | Vercel |
| Framework Preset | Vite |
| Root Directory | `./` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Branch de produção | `main` |

A configuração `vercel.json` permite o fallback das rotas da aplicação SPA, preservando a navegação direta e o refresh em páginas internas.

A versão demonstrativa utiliza HTTPS e mantém o MSW habilitado.

### Validações realizadas na aplicação publicada

- Carregamento da página inicial.
- Acesso direto à página `/nft/emerald`.
- Atualização da página interna sem perda da rota.
- Carregamento do arquivo `mockServiceWorker.js`.
- Autenticação com conta fictícia.
- Inclusão de NFT no carrinho.
- Persistência do carrinho após atualização.
- Checkout e confirmação simulados.
- Consulta de pedido e recibo.
- Conexão simulada Socket.IO e resposta da API MSW.

A comunicação de eventos e as alterações de preço podem ser reproduzidas usando os endpoints demonstrativos descritos neste README.

---

## 14. Arquitetura e decisões técnicas

Consulte o arquivo [ARCHITECTURE.md](ARCHITECTURE.md) para detalhes sobre:

- Estrutura do projeto.
- Contratos REST.
- Eventos Socket.IO.
- Gerenciamento de sessão.
- Estado e persistência do carrinho.
- Estratégia de cache com TanStack Query.
- Invalidação e atualização de dados.
- Reconciliação REST e Socket.IO.
- Tratamento de erros e condições de corrida.
- Idempotência no checkout.
- Decisões de UX e acessibilidade.
- Limitações da simulação.
- Desvios documentados em relação ao Figma.

A referência visual original é o Figma do desafio. Os testes visuais automatizados ajudam a detectar regressões, mas não substituem uma comparação visual independente com o design fornecido.

---

## 15. Limitações conhecidas

Este projeto é uma demonstração técnica e possui as seguintes limitações:

- Não utiliza blockchain real.
- Não realiza operações financeiras.
- Não envia NFTs nem transações para redes públicas.
- Não depende de backend de produção.
- O armazenamento simulado não é um banco de dados multiusuário real.
- Os eventos e dados simulados não são compartilhados globalmente entre diferentes navegadores.
- As medições Lighthouse podem variar conforme navegador, hardware, rede e ambiente de execução.
- A fidelidade visual ao Figma exige avaliação independente das referências.

Essas limitações fazem parte do escopo demonstrativo e estão documentadas para permitir uma avaliação transparente da solução.

---

## 16. Estrutura principal

```text
kurio-nft-marketplace/
├── src/
├── public/
├── tests/
├── scripts/
├── docs/
├── README.md
├── ARCHITECTURE.md
├── package.json
├── package-lock.json
├── index.html
├── vercel.json
├── vite.config.ts
├── playwright.config.ts
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── tsconfig.json
└── .gitignore
```

O repositório mantém o código-fonte e os recursos necessários para reconstruir a aplicação, sem depender de uma pasta `node_modules` previamente instalada.

---

## 17. Considerações finais

O KURIO demonstra a implementação de uma experiência de marketplace de NFTs com arquitetura frontend tipada, APIs simuladas, eventos em tempo real, cenários de erro, testes automatizados e build otimizado.

O projeto foi disponibilizado publicamente para avaliação técnica, com código-fonte no GitHub e aplicação hospedada na Vercel.

**Aplicação:** https://kurio-nft-marketplace-rho.vercel.app/

**GitHub:** https://github.com/Renan1510/kurio-nft-marketplace

---

**KURIO — Protótipo acadêmico e demonstração técnica. Sem transações financeiras ou blockchain reais.**