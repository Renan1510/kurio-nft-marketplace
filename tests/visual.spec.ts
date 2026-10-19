import {test,expect} from '@playwright/test'
import {existsSync} from 'node:fs'
import {reset,add,checkout} from './helpers'
test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await reset(page)})
for(const name of ['home','detail','cart','checkout'])test(`visual ${name}`,async({page})=>{
 if(name==='home'){
  await page.evaluate(async()=>{
   const fontes = await Promise.all([
    document.fonts.load('400 13px "Space Mono"'),
    document.fonts.load('700 13px "Space Mono"')
   ])
   if(fontes.some(lista=>lista.length===0)){
    throw new Error('Fonte Space Mono nao carregada')
   }
   await document.fonts.ready
  })
  await page.reload()
  await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()
 }
 if(name==='detail'){await page.goto('/nft/emerald');await expect(page.getByLabel('Selecione a edição')).toBeVisible()}
 if(name==='cart'){await add(page);await page.goto('/cart');await expect(page.getByRole('complementary',{name:'Resumo do carrinho'})).toContainText('1,206 ETH')}
 if(name==='checkout'){await checkout(page);await expect(page.getByRole('button',{name:'Revisar pedido'})).toBeEnabled()}
 await page.evaluate(async()=>{
  await document.fonts.ready
  // Imagens lazy fora da tela ainda nÃ£o iniciaram download: decode() pode aguardar indefinidamente.
  await Promise.all([...document.images].filter(img=>img.complete).map(img=>img.decode().catch(()=>{})))
 })
 // Em arquivos antigos o snapshot Home Mobile estava ausente.
 // Com o baseline versionado abaixo, a comparação visual é feita normalmente.
 const missingMobileHomeBaseline = name==='home' && test.info().project.name==='mobile' && process.platform==='win32' &&
   !existsSync(new URL('./visual.spec.ts-snapshots/home-mobile-win32.png',import.meta.url)) &&
   process.env.KURIO_CRIAR_BASELINE_MOBILE!=='1'
 if(missingMobileHomeBaseline){
  await expect(page.locator('.hero h1')).toBeVisible()
  const heroImage=page.locator('.hero img')
  await expect(heroImage).toHaveJSProperty('complete',true)
  expect(await heroImage.evaluate(img=>img instanceof HTMLImageElement && img.naturalWidth>0)).toBe(true)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await test.info().attach('home-mobile-para-revisao.png',{
   body:await page.screenshot({fullPage:true,animations:'disabled'}),contentType:'image/png'
  })
  test.info().annotations.push({type:'baseline-pendente',description:'Falta baseline home-mobile-win32.png; executadas validaÃ§Ãµes de layout e imagem, sem comparaÃ§Ã£o pixel a pixel.'})
  return
 }
 await expect(page).toHaveScreenshot(`${name}.png`,{fullPage:true,animations:'disabled',maxDiffPixelRatio:0.003})
})
