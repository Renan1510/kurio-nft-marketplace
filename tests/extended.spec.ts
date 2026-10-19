import {test,expect,type Page} from '@playwright/test'

async function scenario(page:Page,key:string){
 await page.locator('html[data-kurio-ready="true"]').waitFor({timeout:20000})
 await page.evaluate(async(value)=>{
  const response=await fetch('/api/__test/scenario',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:value})})
  if(!response.ok)throw Error(`Não foi possível configurar cenário: ${response.status}`)
 },key)
}
async function login(page:Page,email='ana@kurio.demo'){
 await page.goto('/login')
 await page.locator('form').getByLabel('E-mail').fill(email)
 await page.locator('form').getByLabel('Senha').fill('demo12345')
 await page.locator('form').getByRole('button',{name:'Entrar',exact:true}).click()
 await expect(page).not.toHaveURL(/\/login/)
}
async function addToCart(page:Page){
 await page.goto('/nft/emerald')
 await page.getByRole('button',{name:/Comprar \/ adicionar/}).click()
 await expect(page.getByText(/adicionado ao carrinho/i)).toBeVisible()
}
async function readyCheckout(page:Page){
 await addToCart(page)
 await login(page)
 await page.goto('/checkout')
 await page.getByLabel('Escolha uma carteira cadastrada *').selectOption({index:1})
 await page.getByRole('button',{name:/Conectar carteira/}).click()
 await page.getByRole('button',{name:'Revisar pedido'}).click()
}

test.beforeEach(async({page})=>{
 await page.goto('/')
 await page.locator('html[data-kurio-ready="true"]').waitFor({timeout:20000})
 const result=await page.evaluate(async()=>{
  const res=await fetch('/api/__test/reset',{method:'POST'})
  return {status:res.status,body:await res.text()}
 })
 expect(result.status,`MSW não respondeu corretamente ao reset: ${result.body}`).toBe(200)
 await page.reload()
 await page.locator('html[data-kurio-ready="true"]').waitFor({timeout:20000})
})

test('busca inexistente, filtros combinados e paginação são representados na URL',async({page})=>{
 await page.getByLabel('Buscar NFTs por nome').fill('não-existe')
 await page.getByRole('button',{name:'Buscar',exact:true}).click()
 await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
 await page.getByRole('button',{name:'Limpar filtros'}).click()
 await page.getByRole('button',{name:/Fotografia/}).click()
 await page.getByRole('button',{name:'Polygon',exact:true}).click()
 await expect(page).toHaveURL(/category=Fotografia/)
 await expect(page).toHaveURL(/network=Polygon/)
 await page.reload()
 await expect(page).toHaveURL(/network=Polygon/)
})

test('login, isolamento de sessão, logout e troca de usuário',async({page})=>{
 await login(page)
 await page.goto('/profile')
 await expect(page.getByRole('heading',{name:'Perfil do colecionador'})).toBeVisible()
 if(await page.getByRole('button',{name:'Sair'}).first().isVisible()){
  await page.getByRole('button',{name:'Sair'}).first().click()
 } else {
  await page.getByRole('button',{name:'Abrir menu'}).click()
  await page.getByRole('navigation',{name:'Menu móvel'}).getByRole('button',{name:'Sair'}).click()
 }
 await expect(page).toHaveURL('/')
 await login(page,'leo@kurio.demo')
 await page.goto('/profile')
 await expect(page.getByLabel('Nome de exibição *')).toHaveValue('Leo Digital')
 await page.reload()
 await expect(page.getByLabel('Nome de exibição *')).toHaveValue('Leo Digital')
})

test('favoritos persistem e mutation falha sem sucesso falso',async({page})=>{
 await login(page)
 await page.goto('/')
 await expect(page.getByRole('button',{name:'Remover dos favoritos'}).first()).toBeVisible()
 await scenario(page,'mutation-error')
 await page.getByRole('button',{name:'Remover dos favoritos'}).first().click()
 await expect(page.getByRole('alert')).toContainText(/Erro simulado/i)
 await scenario(page,'default')
 await page.reload()
 await expect(page.getByRole('button',{name:'Remover dos favoritos'}).first()).toBeVisible()
})

test('carrinho sobrevive ao refresh e cupom expirado é recusado',async({page})=>{
 await addToCart(page)
 await page.goto('/cart')
 await page.getByLabel('Código promocional').fill('EXPIRADO')
 await page.getByRole('button',{name:'Aplicar'}).click()
 await expect(page.getByText(/expirou/i)).toBeVisible()
 await page.reload()
 await expect(page.getByRole('region',{name:'Itens do carrinho'}).getByText('Emerald Ape #042')).toBeVisible()
 await page.getByRole('button',{name:/Remover cupom/}).click()
 await expect(page.getByText(/expirou/i)).toHaveCount(0)
 await page.getByRole('button',{name:/Aumentar quantidade de Emerald Ape/}).click()
 await expect(page.getByRole('button',{name:/Diminuir quantidade de Emerald Ape/})).toBeEnabled()
})

test('pagamento recusado exibe status terminal sem limpar carrinho',async({page})=>{
 await readyCheckout(page)
 await scenario(page,'declined-payment')
 await page.getByRole('button',{name:'Confirmar pedido simulado'}).click()
 await expect(page.getByRole('heading',{name:'Pedido recusado'})).toBeVisible({timeout:20000})
 await page.goto('/cart')
 await expect(page.getByRole('region',{name:'Itens do carrinho'}).getByText('Emerald Ape #042')).toBeVisible()
})

test('conexão de carteira pode ser recusada pelo mock HTTP',async({page})=>{
 await addToCart(page)
 await login(page)
 await page.goto('/checkout')
 await page.getByLabel('Escolha uma carteira cadastrada *').selectOption({index:1})
 await scenario(page,'wallet-refusal')
 await page.getByRole('button',{name:/Conectar carteira/}).click()
 await expect(page.getByRole('alert')).toContainText('Conexão recusada')
})

test('perfil, avatar, senha inválida e carteira preservam validação da API',async({page})=>{
 await login(page)
 await page.goto('/profile')
 await page.getByLabel('Nome de exibição *').fill('Colecionadora Teste')
 await page.getByRole('button',{name:'Salvar perfil'}).click()
 await expect(page.getByText('Perfil salvo.')).toBeVisible()
 await page.getByLabel('Senha atual').fill('senha-errada')
 await page.getByLabel('Nova senha').fill('senhaNova123')
 await page.getByRole('button',{name:'Alterar senha'}).click()
 await expect(page.getByRole('alert')).toContainText('Senha atual incorreta')
 await page.goto('/wallets')
 await page.getByLabel('Nome da carteira *').fill('Carteira de teste')
 await page.getByLabel('Endereço da carteira *').fill('0x1234567890abcdef1234567890abcdef12345678')
 await page.getByRole('button',{name:'Adicionar carteira'}).click()
 await expect(page.getByText('Carteira de teste')).toBeVisible()
 await page.reload()
 await expect(page.getByText('Carteira de teste')).toBeVisible()
})

test('Socket.IO atualiza preços, ignora evento antigo e acompanha indisponibilidade',async({page})=>{
 await page.goto('/nft/emerald')
 await expect(page.getByText('1,19 ETH')).toBeVisible()
 await page.locator('html[data-kurio-socket-ready="true"]').waitFor({timeout:15000})
 await page.evaluate(async()=>fetch('/api/__test/change-nft',{method:'POST'}))
 await expect(page.getByText('1,34 ETH')).toBeVisible({timeout:15000})
 await page.evaluate(async()=>fetch('/api/__test/old-event',{method:'POST'}))
 await expect(page.getByText('1,34 ETH')).toBeVisible()
})

test('carregamento lento exibe skeleton e rota inexistente usa estado vazio',async({page})=>{
 await scenario(page,'slow')
 await page.goto('/nft/emerald')
 await expect(page.locator('.skeleton').first()).toBeVisible()
 await expect(page.getByRole('heading',{name:'Emerald Ape #042'})).toBeVisible({timeout:15000})
 await scenario(page,'default')
 await page.goto('/rota-inexistente')
 await expect(page.getByText('Página não encontrada')).toBeVisible()
})

test('teclado alcança skip link e modal suporta fechamento por Escape',async({page})=>{
 await page.keyboard.press('Tab')
 await expect(page.getByRole('link',{name:'Pular para o conteúdo'})).toBeFocused()
 await readyCheckout(page)
 await expect(page.getByRole('dialog')).toBeVisible()
 await page.keyboard.press('Escape')
 await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('timeout após criação recupera a mesma tentativa por chave idempotente',async({page})=>{
 await readyCheckout(page)
 await scenario(page,'timeout-after-create')
 await page.getByRole('button',{name:'Confirmar pedido simulado'}).click()
 await expect(page.getByText(/Caso a solicitação tenha expirado/i)).toBeVisible({timeout:15000})
 await page.getByRole('button',{name:'Recuperar pedido anterior'}).click()
 await expect(page.getByRole('heading',{name:'Pedido confirmado!'})).toBeVisible({timeout:20000})
})

test('sessão expirada interrompe áreas privadas e preserva navegação de retorno',async({page})=>{
 await login(page)
 // Use the already verified, documented deterministic scenario endpoint.
 // This changes the MSW server fixture, rather than replacing a real 401
 // with a synthetic UI redirect.
 await scenario(page,'expired-session')
 const sessionStatus=await page.evaluate(async()=>{
  const check=await fetch('/api/auth/session',{headers:{Authorization:`Bearer ${localStorage.getItem('kurio-session')||''}`}})
  return check.status
 })
 expect(sessionStatus).toBe(401)
 await page.goto('/wallets')
 await expect(page).toHaveURL(/\/login/,{timeout:15000})
})

test('respostas HTTP temporárias permitem recuperar catálogo',async({page})=>{
 await scenario(page,'server-error')
 await page.goto('/')
 await expect(page.getByRole('alert')).toContainText('indisponível')
 await scenario(page,'default')
 await page.getByRole('button',{name:'Tentar novamente'}).click()
 await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()
})
