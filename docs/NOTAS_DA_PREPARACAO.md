# Preparação para publicação

Base de código: `KURIO_REVISAO_FINAL.zip` recebido antes da otimização; correspondência conferida para a árvore `src` e `tests` do projeto analisado. `package.json`, lockfile e script `scripts/otimizar-build.mjs` obtidos da versão otimizada fornecida, que o usuário validou no Windows.

Arquivos descartados do repositório: versões `.bak`/`.backup`, relatórios Lighthouse antigos de execuções diferentes e imagem `emerald-backup.webp` não referenciada no código. **Nenhum arquivo original enviado foi apagado.**

Foram acrescentados `vercel.json`, `.gitignore`, `ARCHITECTURE.md`, esta documentação e o README de publicação. O runner do Lighthouse foi atualizado para reportar a meta oficial separadamente de 97 pontos opcionais; não foi alterado nenhum fluxo do aplicativo React ou dos mocks.

Requisitos ainda a confirmar fora desta cópia: `npm ci` e 108 Playwright após checkout limpo, auditoria online, fidelidade ao Figma e funcionamento do MSW/Socket.IO em HTTPS no Vercel.
