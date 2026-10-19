# Validações reportadas pelo autor — 18/10/2026

O autor executou a aplicação no Windows, em preview do build com `scripts/otimizar-build.mjs`, e compartilhou as saídas dos comandos no terminal. Os resultados a seguir foram **informados pelo autor** e não representam uma medição desta cópia no ambiente de elaboração do pacote.

| Página | Perfil | Rodadas | Performance | Acessibilidade | Boas práticas | SEO |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Home | Mobile | 3 | 92 | 100 | 100 | 100 |
| Home | Desktop | 3 | 99 | 100 | 100 | 100 |
| `/nft/emerald` | Mobile | 3 | 91 | 100 | 100 | 100 |
| `/nft/emerald` | Desktop | 3 | 99 | 100 | 100 | 100 |

Também foram informados **108/108 testes Playwright passando**, além de ESLint, typecheck e build. Os snapshots Windows para Home, detalhes, carrinho e checkout, nos perfis desktop/mobile/tablet, estão incluídos em `tests/visual.spec.ts-snapshots/`.

## Evidências e conferências finais

- Os relatórios HTML/JSON da auditoria aprovada não constavam entre os artefatos integrais enviados para esta revisão. Por isso **não foram recriados nem substituídos por relatórios antigos com pontuação inferior**.
- Execute `npm ci`, `npm run build` e `npx playwright test --workers=2` depois de extrair esta cópia. Os comandos Lighthouse estão no README; copie a rodada completa real com `summary.json` e HTML/JSON para `docs/evidence/lighthouse/` se quiser versioná-la.
- O deploy público e seu funcionamento após F5 em rota direta ainda precisam ser testados **na URL fornecida pela hospedagem**, e não podem ser certificados antes da publicação.
- Não foi feita comparação direta pixel a pixel com os frames do Figma; verificar antes da submissão.
- Esta é uma demonstração com mocks em navegador; não há backend, carteiras ou pagamentos reais.
