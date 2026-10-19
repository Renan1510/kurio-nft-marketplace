import {test,expect} from '@playwright/test'
import {api,reset,scenario,login,add,checkout,socketReady} from './helpers'
test.beforeEach(async({page})=>reset(page))

test('paginação, ordenação e histórico restauram resultados reais',async({page})=>{
 await page.getByRole('button',{name:'Próxima página'}).click()
 await expect(page).toHaveURL(/page=2/)
 await expect(page.locator('.card-grid')).toContainText('Golden Frequency')
 await page.reload();await expect(page.locator('.card-grid')).toContainText('Golden Frequency')
 await page.getByRole('combobox',{name:'Ordenar por:'}).selectOption('cheap')
 await expect(page.locator('.card-grid article').first()).toContainText('Golden Signal')
 await page.goBack();await expect(page.locator('.card-grid')).toContainText('Golden Frequency')
})

test('edição assinada mantém SKU, preço e quantidade no carrinho',async({page})=>{
 await page.goto('/nft/emerald')
 await page.getByLabel('Selecione a edição').selectOption('emerald--signed')
 await expect(page).toHaveURL(/emerald--signed/)
 await expect(page.getByRole('heading',{name:'Emerald Ape #042 · Assinada'})).toBeVisible()
 await page.getByLabel('Quantidade',{exact:true}).fill('2')
 await page.getByRole('button',{name:'Comprar / adicionar ao carrinho'}).click()
 await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()
 await page.goto('/cart')
 await expect(page.getByRole('region',{name:'Itens do carrinho'})).toContainText('Assinada')
 const cart=await api(page,'/cart');expect(cart.body.items).toEqual([{nftId:'emerald--signed',quantity:2}])
 expect((await api(page,'/quote','POST',{coupon:'',network:'Ethereum'})).body.subtotal).toBe('2.58')
})

test('preço via Socket.IO atualiza carrinho e exige nova confirmação',async({page})=>{
 await checkout(page)
 await page.getByRole('button',{name:'Revisar pedido'}).click();await socketReady(page)
 await api(page,'/__test/change-nft','POST')
 await page.getByRole('button',{name:'Confirmar pedido simulado'}).click()
 await expect(page.getByRole('alert')).toContainText('Os valores ou itens mudaram')
 await expect(page.getByRole('dialog')).toHaveCount(0)
 await page.getByRole('button',{name:'Revisar pedido'}).click()
 await expect(page.getByRole('dialog')).toContainText('1,356 ETH')
 await page.getByRole('button',{name:'Confirmar pedido simulado'}).click()
 await expect(page.getByRole('heading',{name:'Pedido confirmado!'})).toBeVisible()
})

test('duplicados e antigos não revertem o total do carrinho',async({page})=>{
 await add(page);await page.goto('/cart');await socketReady(page)
 await scenario(page,'duplicate-events');await api(page,'/__test/change-nft','POST')
 await expect(page.getByRole('complementary',{name:'Resumo do carrinho'})).toContainText('1,356 ETH')
 await api(page,'/__test/old-event','POST')
 await expect(page.getByRole('complementary',{name:'Resumo do carrinho'})).toContainText('1,356 ETH')
})

test('reconexão real reconcilia detalhe por REST',async({page})=>{
 await page.goto('/nft/emerald');await socketReady(page)
 await api(page,'/__test/disconnect','POST')
 await expect(page.locator('html')).toHaveAttribute('data-kurio-socket-ready','false')
 await api(page,'/__test/change-nft','POST')
 await socketReady(page)
 await expect(page.getByText('1,34 ETH',{exact:true})).toBeVisible()
})

test('pedido pendente após desconexão conserva recibo e não duplica',async({page})=>{
 await checkout(page);await socketReady(page)
 await page.getByRole('button',{name:'Revisar pedido'}).click()
 await page.getByRole('button',{name:'Confirmar pedido simulado'}).click()
 await expect(page).toHaveURL(/\/order\//)
 const id=page.url().split('/').pop()!
 await api(page,'/__test/disconnect','POST');await page.reload()
 await expect(page.getByRole('heading',{name:'Pedido confirmado!'})).toBeVisible()
 const before=(await api(page,'/orders/'+id)).body
 await api(page,'/__test/change-nft','POST')
 const after=(await api(page,'/orders/'+id)).body
 expect(after.quote).toEqual(before.quote)
 expect(after.collector.name).toBe('Ana Colecionadora')
 expect((await api(page,'/cart')).body.items).toEqual([])
})

test('idempotência da API e estoque não permitem compras concorrentes excedentes',async({page})=>{
 await add(page);await login(page)
 const quote=(await api(page,'/quote','POST',{coupon:'KURIO10',network:'Ethereum'})).body
 expect(quote.subtotal).toBe('1.19');expect(quote.discount).toBe('0.119');expect(quote.total).toBe('1.087')
 const body={quoteFingerprint:quote.fingerprint,coupon:quote.coupon,network:quote.network,walletId:'wallet-1'}
 const first=await api(page,'/orders','POST',body,{'Idempotency-Key':'fixed-test-key'})
 const second=await api(page,'/orders','POST',body,{'Idempotency-Key':'fixed-test-key'})
 expect(first.status).toBe(201);expect(second.body.id).toBe(first.body.id)
 expect((await api(page,'/orders','POST',body,{'Idempotency-Key':'different-key'})).status).toBe(409)
 expect((await api(page,'/orders','POST',{...body,coupon:''},{'Idempotency-Key':'fixed-test-key'})).status).toBe(409)
})

test('404 de recuperação permite tentar novamente sem bloquear checkout',async({page})=>{
 await checkout(page)
 await page.evaluate(()=>localStorage.setItem('kurio-order-attempt',JSON.stringify({key:'never-created',body:'x',userId:'user-1'})))
 await page.reload()
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('kurio-order-attempt'))).toBeNull()
 await expect(page.getByRole('button',{name:'Revisar pedido'})).toBeEnabled()
})

test('contas isolam carrinho, favoritos, pedidos e preferências',async({page})=>{
 await add(page);await login(page)
 const aliceCart=(await api(page,'/cart')).body
 expect(aliceCart.items).toHaveLength(1)
 await page.goto('/cart');await page.getByLabel('Código promocional').fill('KURIO10');await page.getByRole('button',{name:'Aplicar',exact:true}).click()
 await expect(page.getByRole('button',{name:'Remover cupom KURIO10'})).toBeVisible()
 await api(page,'/auth/logout','POST');await page.evaluate(()=>localStorage.removeItem('kurio-session'))
 await login(page,'leo@kurio.demo');await page.goto('/cart')
 expect((await api(page,'/cart')).body.items).toEqual([])
 expect((await api(page,'/favorites')).body).toEqual(['golden'])
 await expect(page.getByText('Sua carteira está vazia')).toBeVisible()
 const result=await api(page,'/orders/not-owned');expect(result.status).toBe(404)
})

test('cadastro, avatar e troca de senha persistem sem senha clara',async({page})=>{
 await page.goto('/register');await page.getByLabel('Nome completo').fill('Nova Colecionadora')
 await page.getByLabel('E-mail').fill('nova@kurio.demo');await page.getByLabel('Senha (mínimo 8 caracteres)').fill('nova12345');await page.getByLabel('Confirme a senha').fill('nova12345')
 await page.getByRole('button',{name:'Cadastrar',exact:true}).click();await expect(page).not.toHaveURL(/register/)
 await page.goto('/profile');await page.getByRole('button',{name:'Selecionar avatar gold'}).click();await page.getByRole('button',{name:'Salvar perfil'}).click()
 await expect(page.getByText('Perfil salvo.')).toBeVisible()
 await page.getByLabel('Senha atual').fill('nova12345');await page.getByLabel('Nova senha').fill('nova67890');await page.getByRole('button',{name:'Alterar senha'}).click()
 await expect(page.getByText('Senha alterada.')).toBeVisible();await page.reload()
 await expect(page.getByRole('img',{name:'Avatar escolhido'})).toHaveAttribute('src','/art/gold.webp')
 const storage=await page.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('kurio_mock')).map(([,v])=>v).join(''))
 expect(storage).not.toContain('nova12345');expect(storage).not.toContain('nova67890')
 expect((await api(page,'/auth/login','POST',{email:'nova@kurio.demo',password:'nova67890'})).status).toBe(200)
})

test('carteira valida PATCH e preserva ID; e-mail ignora caixa no conflito',async({page})=>{
 await login(page)
 expect((await api(page,'/wallets/wallet-1','PATCH',{label:''})).status).toBe(422)
 expect((await api(page,'/wallets/wallet-1','PATCH',{id:'injected',label:'Renomeada'})).body.id).toBe('wallet-1')
 expect((await api(page,'/profile','PUT',{name:'Ana',email:'LEO@kurio.demo'})).status).toBe(409)
 await page.goto('/wallets');await expect(page.getByText('Renomeada')).toBeVisible()
})

test('cenários vazio, 4xx, esgotado e erro de detalhe têm estados reais',async({page})=>{
 await scenario(page,'empty');await page.reload();await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
 await scenario(page,'client-error');await page.goto('/nft/emerald');await expect(page.getByRole('alert')).toContainText('Solicitação recusada')
 await scenario(page,'sold-out');await page.reload();await expect(page.getByRole('button',{name:'Edição esgotada'})).toBeDisabled()
 await scenario(page,'default');await page.reload()
 await expect(page.getByRole('button',{name:'Edição esgotada'})).toBeDisabled()
})

test('respostas fora de ordem não substituem a busca mais recente',async({page})=>{
 await scenario(page,'out-of-order')
 await page.getByLabel('Buscar NFTs por nome').fill('Emerald');await page.getByRole('button',{name:'Buscar',exact:true}).click()
 await page.getByLabel('Buscar NFTs por nome').fill('Golden');await page.getByRole('button',{name:'Buscar',exact:true}).click()
 await expect(page.locator('.card-grid')).toContainText('Golden')
 await page.waitForTimeout(1500)
 await expect(page.locator('.card-grid')).not.toContainText('Emerald')
})

test('layouts não transbordam em telas e zoom; foco preso no diálogo',async({page})=>{
 for(const path of ['/','/nft/emerald','/login','/register']){
  await page.goto(path);await expect(page.locator('main')).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
 await checkout(page);await page.getByRole('button',{name:'Revisar pedido'}).click()
 for(let i=0;i<5;i++)await page.keyboard.press('Tab')
 expect(await page.evaluate(()=>!!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Revisar pedido'})).toBeFocused()
 await page.evaluate(()=>{document.documentElement.style.fontSize='26px'})
 const measured=await page.evaluate(()=>({
  viewport:innerWidth,
  documentWidth:document.documentElement.scrollWidth,
  offenders:[...document.querySelectorAll('body *')].filter(el=>{
   const rect=el.getBoundingClientRect()
   return rect.width>0&&(rect.right>innerWidth+1||rect.left < -1)
  }).slice(0,12).map(el=>({tag:el.tagName,classes:el.className?.toString().slice(0,100),right:Math.round(el.getBoundingClientRect().right)}))
 }))
 expect(measured.documentWidth,JSON.stringify(measured,null,2)).toBeLessThanOrEqual(measured.viewport)
})
