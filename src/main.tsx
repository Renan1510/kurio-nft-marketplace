import React from 'react'
import {createRoot} from 'react-dom/client'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {RouterProvider} from '@tanstack/react-router'
import {router} from './router'
import './styles.css'
import {mockReady} from './lib/mockReady'
const client=new QueryClient({defaultOptions:{queries:{retry:1,staleTime:15000,refetchOnWindowFocus:false}}})
// A UI estática (incluindo o destaque) pode ser exibida enquanto o MSW inicia.
// O interceptor do Axios e a conexão Socket.IO aguardam mockReady.
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <RouterProvider router={router}/>
    </QueryClientProvider>
  </React.StrictMode>
)
mockReady.then(()=>{
  document.documentElement.dataset.kurioReady='true'
}).catch(error=>{
  const message=error instanceof Error?error.message:String(error)
  document.documentElement.dataset.kurioError=message
  console.error('KURIO: falha durante a inicialização:',error)
  const root=document.getElementById('root')
  if(root){
   const diagnostic=document.createElement('div')
   diagnostic.setAttribute('role','alert')
   diagnostic.style.cssText='color:#f4eae3;background:#341b17;padding:2rem;font:16px system-ui;line-height:1.7;max-width:780px;margin:4rem auto'
   const title=document.createElement('h1')
   title.textContent='Não foi possível iniciar o KURIO'
   const instructions=document.createElement('p')
   instructions.textContent='Confira se o arquivo public/mockServiceWorker.js existe. Na pasta do projeto execute npm install, npm run worker:init e reinicie o servidor.'
   const details=document.createElement('pre')
   details.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere'
   details.textContent=message
   diagnostic.append(title,instructions,details)
   root.replaceChildren(diagnostic)
  }
})
