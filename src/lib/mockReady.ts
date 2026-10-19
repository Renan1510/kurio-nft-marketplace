
/**
 * Inicializa a API simulada sem competir com
 * a primeira renderização visual da aplicação.
 */

function aguardarPrimeiraRenderizacao(): Promise<void> {
  return new Promise((resolve) => {
    if (document.visibilityState !== 'visible') {
      resolve()
      return
    }

    requestAnimationFrame(() => {
      setTimeout(resolve, 0)
    })
  })
}

export const mockReady: Promise<void> =
  import.meta.env.VITE_ENABLE_MOCKS === 'false'
    ? Promise.resolve()
    : aguardarPrimeiraRenderizacao()
        .then(() => import('../mocks/browser'))
        .then(async ({ worker }) => {
          await worker.start({
            onUnhandledRequest: 'bypass',
            serviceWorker: {
              url: '/mockServiceWorker.js',
            },
          })
        })
