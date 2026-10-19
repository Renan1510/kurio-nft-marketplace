import {expect,type Page} from '@playwright/test'
export async function api(page:Page,path:string,method='GET',body?:unknown,headers:Record<string,string>={}){
 // A navegação depois do login faz reload: aguarde o MSW controlar a nova página.
 await page.locator('html[data-kurio-ready="true"]').waitFor()
 return page.evaluate(async({path,method,body,headers})=>{
  const token=localStorage.getItem('kurio-session')
  const response=await fetch('/api'+path,{method,headers:{'Content-Type':'application/json','X-Guest-Id':localStorage.getItem('kurio-guest')||'',...(token?{Authorization:`Bearer ${token}`} : {}),...headers},body:body===undefined?undefined:JSON.stringify(body)})
  const raw=await response.text()
  let parsed:unknown
  try{parsed=JSON.parse(raw)}catch{throw new Error(`API ${method} /api${path}: resposta não JSON, status ${response.status}, tipo ${response.headers.get('content-type')}, trecho ${raw.slice(0,130)}`)}
  return {status:response.status,body:parsed}
 },{path,method,body,headers})
}
export async function reset(page:Page){
 await page.goto('/')
 await page.locator('html[data-kurio-ready="true"]').waitFor()
 expect((await api(page,'/__test/reset','POST')).status).toBe(200)
 await page.reload()
 await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()
}
export async function scenario(page:Page,key:string){expect((await api(page,'/__test/scenario','POST',{key})).status).toBe(200)}
export async function login(page:Page,email='ana@kurio.demo'){
 await page.goto('/login')
 await page.getByLabel('E-mail',{exact:true}).fill(email)
 await page.getByLabel('Senha',{exact:true}).fill('demo12345')
 await page.locator('form').getByRole('button',{name:'Entrar',exact:true}).click()
 await expect(page).not.toHaveURL(/\/login/)
 // window.location.assign() navega para OUTRO documento depois do login.
 // O estado de autenticação/worker só está pronto ao surgir este atributo.
 await page.locator('html[data-kurio-ready="true"]').waitFor()
}
export async function add(page:Page){
 await page.goto('/nft/emerald')
 await page.getByRole('button',{name:'Comprar / adicionar ao carrinho'}).click()
 await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()
}
export async function checkout(page:Page){
 await add(page);await login(page);await page.goto('/checkout')
 await page.getByLabel('Escolha uma carteira cadastrada *').selectOption('wallet-1')
 await page.getByRole('button',{name:'Conectar carteira (simulado)'}).click()
 await expect(page.getByText('● Carteira conectada na simulação')).toBeVisible()
}
export async function socketReady(page:Page){await page.locator('html[data-kurio-socket-ready="true"]').waitFor()}
