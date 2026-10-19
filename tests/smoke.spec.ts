import {test,expect} from '@playwright/test'

test('inicialização do app e do MSW, API pública e rotas',async({page})=>{
 const runtimeErrors:string[]=[]
 page.on('pageerror',error=>runtimeErrors.push(error.message))
 await page.goto('/')
 await expect(page.locator('html[data-kurio-ready="true"]')).toHaveCount(1,{timeout:20000})
 const response=await page.evaluate(async()=>{
  const r=await fetch('/api/nfts?page=1')
  return {status:r.status,contentType:r.headers.get('content-type'),body:await r.text()}
 })
 expect(response.status,`API simulada indisponível: ${response.body.slice(0,300)}`).toBe(200)
 expect(response.contentType).toContain('application/json')
 const result=JSON.parse(response.body) as {items:unknown[]}
 expect(result.items.length).toBeGreaterThan(0)
 await expect(page.getByLabel('Buscar NFTs por nome')).toBeVisible()
 await page.goto('/login')
 await expect(page.getByLabel('E-mail')).toBeVisible()
 expect(runtimeErrors).toEqual([])
})
