import {http,HttpResponse,delay} from 'msw'
import {state,save,reset,changeNFT,hashed} from './db'
import {socketBus,socketHandler} from './socket'
import {fromWei,toWei} from '../lib/money'
import type {Account} from './db'
import type {CartItem,Network,Order,Quote,QuoteItem} from '../types'

const NETWORKS:Network[]=['Ethereum','Polygon','Base']
const validNetwork=(network:Network)=>NETWORKS.includes(network)
const err=(message:string,status=400)=>HttpResponse.json({message},{status})
// As respostas dos mocks usam apenas dados serializáveis em JSON.
// A assinatura do MSW espera JsonBodyType, não um genérico irrestrito.
const ok=(value: unknown,status=200)=>
  HttpResponse.json(value as Parameters<typeof HttpResponse.json>[0],{status})
function userOf(request:Request):Account|null {
 const token=request.headers.get('authorization')?.replace(/^Bearer /,'')
 if(!token)return null
 const entry=state().tokens[token]
 if(!entry||entry.until<Date.now()||state().scenario==='expired-session')return null
 return state().users.find(u=>u.id===entry.userId)||null
}
function owner(request:Request){return userOf(request)?.id||`guest:${request.headers.get('X-Guest-Id')||'anonymous'}`}
function cartOf(request:Request):CartItem[]{const u=userOf(request); if(u)return u.cart;const key=owner(request);return state().guestCarts[key]??(state().guestCarts[key]=[])}
const publicUser=(u:Account)=>({id:u.id,name:u.name,email:u.email,bio:u.bio,avatar:u.avatar,version:u.version})
let latencyIndex=0
async function conditions(){
 const s=state().scenario
 if(s==='slow')await delay(1250)
 if(s==='variable-latency')await delay([80,600,150][latencyIndex++%3])
 if(s==='client-error')return err('Solicitação recusada pelo cenário.',422)
 if(s==='server-error')return err('Serviço temporariamente indisponível.',503)
 if(s==='offline')return HttpResponse.error()
 return null
}
function quoteItems(items:CartItem[]):QuoteItem[]{return items.flatMap(item=>{
 const nft=state().nfts.find(n=>n.id===item.nftId);if(!nft)return[]
 return [{nft,quantity:item.quantity,unitPrice:nft.price,lineTotal:fromWei(toWei(nft.price)*BigInt(item.quantity))}]
})}
function calc(items:CartItem[],coupon:string,network:Network):Quote {
 const rows=quoteItems(items)
 const reasons:string[]=[]
 if(!rows.length)reasons.push('Sua carteira está vazia.')
 if(rows.length!==items.length)reasons.push('O carrinho contém um item não encontrado. Atualize-o.')
 for(const {nft,quantity} of rows)if(nft.available<quantity)reasons.push(`${nft.title}: disponíveis apenas ${nft.available}.`)
 if(coupon&&coupon!=='KURIO10')reasons.push(coupon==='EXPIRADO'?'Este cupom expirou.':'Cupom não encontrado.')
 const subtotalWei=rows.reduce((s,i)=>s+toWei(i.lineTotal),0n)
 const discountWei=coupon==='KURIO10'?subtotalWei/10n:0n
 const feeWei=network==='Ethereum'?toWei('0.016'):network==='Polygon'?toWei('0.004'):toWei('0.007')
 const fingerprint=JSON.stringify({items:rows.map(r=>[r.nft.id,r.nft.version,r.quantity,r.unitPrice]),coupon,network})
 return {items:rows,subtotal:fromWei(subtotalWei),discount:fromWei(discountWei),networkFee:fromWei(feeWei),total:fromWei(subtotalWei-discountWei+feeWei),coupon,network,fingerprint,valid:reasons.length===0,reasons}
}
function orderResolve(order:Order){
 if(!state().orders.some(o=>o.id===order.id))return order // ignore timers left from a prior reset
 if(order.status!=='pending'||Date.now()<order.resolveAt)return order
 order.status=order.outcome
 if(order.status==='confirmed'&&order.quote.items.some(r=>(state().nfts.find(n=>n.id===r.nft.id)?.available||0)<r.quantity))order.status='declined'
 order.version++
 if(order.status==='confirmed'){
  const u=state().users.find(u=>u.id===order.userId)
  if(u)for(const r of order.quote.items){const item=u.cart.find(i=>i.nftId===r.nft.id);if(item){item.quantity=Math.max(0,item.quantity-r.quantity);if(!item.quantity)u.cart=u.cart.filter(c=>c!==item)}}
  for(const r of order.quote.items){const nft=state().nfts.find(n=>n.id===r.nft.id);if(nft){nft.available=Math.max(0,nft.available-r.quantity);nft.version++;socketBus.nft(nft)}}
 }
 save();socketBus.order(order);return order
}
export const handlers=[
 socketHandler,
 http.all('/api/*',({request})=>{
  const path=new URL(request.url).pathname
  if(request.headers.has('authorization')&&!userOf(request)&&!/^\/api\/(auth\/(login|register|logout)|__test\/|nfts)/.test(path))return err('Sessão inexistente ou expirada.',401)
 }),
 http.get('/api/auth/session',({request})=>{const u=userOf(request);return u?ok(publicUser(u)):err('Sessão inexistente ou expirada.',401)}),
 http.post('/api/auth/login',async({request})=>{
  const {email,password}=await request.json() as {email:string;password:string}
  const u=state().users.find(x=>x.email.toLowerCase()===email?.toLowerCase())
  if(!u||u.passwordHash!==await hashed(password||'',u.passwordSalt))return err('E-mail ou senha inválidos.',401)
  const token=crypto.randomUUID();state().tokens[token]={userId:u.id,until:Date.now()+86400000}
  const guest=state().guestCarts[`guest:${request.headers.get('X-Guest-Id')}`]||[]
  for(const item of guest){const prev=u.cart.find(x=>x.nftId===item.nftId);if(prev)prev.quantity=Math.min((state().nfts.find(n=>n.id===item.nftId)?.available||0),prev.quantity+item.quantity);else u.cart.push({...item})}
  delete state().guestCarts[`guest:${request.headers.get('X-Guest-Id')}`]
  save();return ok({token,user:publicUser(u)})
 }),
 http.post('/api/auth/register',async({request})=>{
  const {name,email,password}=await request.json() as {name:string;email:string;password:string}
  if(!name?.trim()||!/^\S+@\S+\.\S+$/.test(email||'')||!password||password.length<8)return err('Informe nome, e-mail válido e senha com ao menos 8 caracteres.',422)
  if(state().users.some(u=>u.email.toLowerCase()===email.toLowerCase()))return err('Este e-mail já está cadastrado.',409)
  const passwordSalt=crypto.randomUUID()
  const user:Account={id:crypto.randomUUID(),name:name.trim(),email:email.toLowerCase(),bio:'',avatar:'/art/emerald.webp',version:1,passwordSalt,passwordHash:await hashed(password,passwordSalt),favorites:[],cart:[],wallets:[]}
  state().users.push(user)
  const token=crypto.randomUUID();state().tokens[token]={userId:user.id,until:Date.now()+86400000}
  const guest=state().guestCarts[`guest:${request.headers.get('X-Guest-Id')}`]||[]
  user.cart=[...guest];delete state().guestCarts[`guest:${request.headers.get('X-Guest-Id')}`]
  save();return ok({token,user:publicUser(user)},201)
 }),
 http.post('/api/auth/logout',({request})=>{const token=request.headers.get('authorization')?.replace('Bearer ','');if(token)delete state().tokens[token];save();return ok({success:true})}),
 http.get('/api/nfts',async({request})=>{
  const failure=await conditions();if(failure)return failure
  const url=new URL(request.url);if(state().scenario==='out-of-order')await delay(url.searchParams.get('q')?.toLowerCase().includes('emerald')?1400:75);const q=(url.searchParams.get('q')||'').toLowerCase();const category=url.searchParams.get('category')||'';const network=url.searchParams.get('network')||'';const sort=url.searchParams.get('sort')||'recent';const page=Math.max(1,parseInt(url.searchParams.get('page')||'1')||1)
  const items=(state().scenario==='empty'?[]:state().nfts).filter(n=>!n.id.endsWith('--signed')&&(!q||`${n.title} ${n.creator} ${n.collection}`.toLowerCase().includes(q))&&(!category||n.category===category)&&(!network||n.network===network))
  if(sort==='cheap')items.sort((a,b)=>toWei(a.price)<toWei(b.price)?-1:1)
  if(sort==='expensive')items.sort((a,b)=>toWei(a.price)>toWei(b.price)?-1:1)
  if(sort==='popular')items.sort((a,b)=>Number(Boolean(b.featured))-Number(Boolean(a.featured)))
  const total=items.length;const size=6;const pages=Math.max(1,Math.ceil(total/size))
  return ok({items:items.slice((page-1)*size,page*size),page,pages,total})
 }),
 http.get('/api/nfts/:id',async({params})=>{const failure=await conditions();if(failure)return failure;const nft=state().nfts.find(x=>x.id===params.id);return nft?ok({...nft,editions:state().nfts.filter(n=>n.editionGroup===nft.editionGroup).map(n=>({id:n.id,label:n.editionName||'Padrão',available:n.available}))}):err('NFT não encontrado.',404)}),
 http.get('/api/favorites',({request})=>{const u=userOf(request);return u?ok(u.favorites):err('Entre para ver seus favoritos.',401)}),
 http.post('/api/favorites/:id',({request,params})=>{if(state().scenario==='mutation-error')return err('Erro simulado ao favoritar.',503);const u=userOf(request);if(!u)return err('Entre para salvar favoritos.',401);if(!u.favorites.includes(String(params.id)))u.favorites.push(String(params.id));save();return ok(u.favorites)}),
 http.delete('/api/favorites/:id',({request,params})=>{if(state().scenario==='mutation-error')return err('Erro simulado ao remover favorito.',503);const u=userOf(request);if(!u)return err('Entre para salvar favoritos.',401);u.favorites=u.favorites.filter(x=>x!==params.id);save();return ok(u.favorites)}),
 http.get('/api/cart',async({request})=>{const failure=await conditions();if(failure)return failure;return ok({items:cartOf(request)})}),
 http.post('/api/cart/items',async({request})=>{
  if(state().scenario==='mutation-error')return err('Falha simulada ao atualizar carrinho.',503)
  const {nftId,quantity}=await request.json() as CartItem
  const nft=state().nfts.find(n=>n.id===nftId)
  if(!nft)return err('NFT não encontrado.',404)
  if(state().scenario==='sold-out')return err('Edição esgotada.',409)
  const cart=cartOf(request);const old=cart.find(i=>i.nftId===nftId);const next=(old?.quantity||0)+quantity
  if(!Number.isInteger(quantity)||quantity<1||next>nft.available)return err('Quantidade maior que a disponibilidade.',409)
  if(old)old.quantity=next;else cart.push({nftId,quantity});save();return ok({items:cart})
 }),
 http.put('/api/cart/items/:id',async({request,params})=>{
  const {quantity}=await request.json() as {quantity:number};const cart=cartOf(request);const item=cart.find(i=>i.nftId===params.id)
  if(!item)return err('Item não encontrado.',404)
  const nft=state().nfts.find(n=>n.id===params.id)
  if(!Number.isInteger(quantity)||quantity<0||quantity>(nft?.available||0))return err('Quantidade indisponível.',409)
  if(!quantity)cart.splice(cart.indexOf(item),1);else item.quantity=quantity
  save();return ok({items:cart})
 }),
 http.delete('/api/cart/items/:id',({request,params})=>{const c=cartOf(request);const i=c.findIndex(x=>x.nftId===params.id);if(i>=0)c.splice(i,1);save();return ok({items:c})}),
 http.post('/api/quote',async({request})=>{const failure=await conditions();if(failure)return failure;const {coupon='',network='Ethereum'}=await request.json() as {coupon:string;network:Network};if(!validNetwork(network))return err('Rede não suportada.',422);return ok(calc(cartOf(request),coupon,network))}),
 http.post('/api/orders',async({request})=>{
  const u=userOf(request);if(!u)return err('Faça login antes de finalizar.',401)
  if(state().scenario==='server-error'||state().scenario==='offline')return state().scenario==='offline'?HttpResponse.error():err('Serviço indisponível.',503)
  const key=request.headers.get('Idempotency-Key');if(!key)return err('Chave de idempotência obrigatória.',400)
  const {quoteFingerprint,coupon,network,walletId,collector}=await request.json() as {quoteFingerprint:string;coupon:string;network:Network;walletId:string;collector?:{name:string;email:string}}
  const body=JSON.stringify({quoteFingerprint,coupon,network,walletId,collector});const used=state().orderKeys[`${u.id}:${key}`]
  if(used){if(used.body!==body)return err('Chave já usada com conteúdo diferente.',409);const existing=state().orders.find(o=>o.id===used.id);return existing?ok(orderResolve(existing)):err('Pedido indisponível.',404)}
  if(!validNetwork(network))return err('Rede não suportada.',422)
  if(!u.wallets.some(w=>w.id===walletId&&w.network===network))return err('Selecione uma carteira compatível com a rede.',422)
  if(collector&&(!collector.name?.trim()||!/^\S+@\S+\.\S+$/.test(collector.email)))return err('Dados do colecionador inválidos.',422)
  const pending=state().orders.find(o=>o.userId===u.id&&orderResolve(o).status==='pending')
  if(pending)return err('Há um pedido pendente. Aguarde a confirmação.',409)
  const quote=calc(u.cart,coupon,network)
  if(!quote.valid)return err(quote.reasons.join(' '),409)
  if(quote.fingerprint!==quoteFingerprint)return err('Preço, estoque ou taxas mudaram. Revise o pedido novamente.',409)
  const order:Order={id:crypto.randomUUID(),userId:u.id,status:'pending',quote:structuredClone(quote),walletId,collector:collector?{name:collector.name.trim(),email:collector.email.trim()}:{name:u.name,email:u.email},reference:`SIM-${crypto.randomUUID().slice(0,12).toUpperCase()}`,createdAt:new Date().toISOString(),version:1,resolveAt:Date.now()+1800,outcome:state().scenario==='declined-payment'?'declined':'confirmed'}
  state().orders.push(order);state().orderKeys[`${u.id}:${key}`]={id:order.id,body};save()
  setTimeout(()=>orderResolve(order),1850)
  if(state().scenario==='timeout-after-create'){await delay(5500)}
  return ok(order,201)
 }),
 http.get('/api/orders/by-key/:key',({request,params})=>{const u=userOf(request);if(!u)return err('Faça login.',401);const used=state().orderKeys[`${u.id}:${params.key}`];const order=used&&state().orders.find(o=>o.id===used.id&&o.userId===u.id);return order?ok(orderResolve(order)):err('Tentativa não encontrada.',404)}),
 http.get('/api/orders/:id',({request,params})=>{const u=userOf(request);if(!u)return err('Faça login.',401);const o=state().orders.find(o=>o.id===params.id&&o.userId===u.id);return o?ok(orderResolve(o)):err('Pedido não encontrado.',404)}),
 http.get('/api/profile',({request})=>{const u=userOf(request);return u?ok(publicUser(u)):err('Faça login.',401)}),
 http.put('/api/profile',async({request})=>{const u=userOf(request);if(!u)return err('Faça login.',401);const p=await request.json() as {name?:string;bio?:string;avatar?:string;email?:string};if(!p.name?.trim())return err('Nome obrigatório.',422);if(p.email&&!/^\S+@\S+\.\S+$/.test(p.email))return err('E-mail inválido.',422);if(p.email&&state().users.some(x=>x.id!==u.id&&x.email.toLowerCase()===p.email?.trim().toLowerCase()))return err('E-mail já cadastrado.',409);Object.assign(u,{name:p.name,bio:p.bio||'',email:p.email?.trim().toLowerCase()||u.email,avatar:p.avatar||u.avatar,version:u.version+1});save();return ok(publicUser(u))}),
 http.patch('/api/profile/password',async({request})=>{const u=userOf(request);if(!u)return err('Faça login.',401);const {oldPassword,newPassword}=await request.json() as {oldPassword:string;newPassword:string};if(u.passwordHash!==await hashed(oldPassword,u.passwordSalt))return err('Senha atual incorreta.',422);if((newPassword||'').length<8)return err('A senha deve ter pelo menos 8 caracteres.',422);u.passwordSalt=crypto.randomUUID();u.passwordHash=await hashed(newPassword,u.passwordSalt);save();return ok({success:true})}),
 http.post('/api/wallets/connect',async({request})=>{
  const u=userOf(request);if(!u)return err('Faça login para conectar sua carteira.',401)
  const {walletId,network}=await request.json() as {walletId:string;network:Network}
  if(!u.wallets.some(w=>w.id===walletId&&w.network===network))return err('Carteira incompatível com a rede escolhida.',422)
  if(state().scenario==='wallet-refusal')return err('Conexão recusada pela carteira simulada.',409)
  if(state().scenario==='offline')return HttpResponse.error()
  return ok({connected:true,walletId,network})
 }),
 http.get('/api/wallets',({request})=>{const u=userOf(request);return u?ok(u.wallets):err('Faça login.',401)}),
 http.post('/api/wallets',async({request})=>{const u=userOf(request);if(!u)return err('Faça login.',401);const p=await request.json() as {label:string;address:string;network:Network};if(!p.label?.trim()||!validNetwork(p.network)||!/^0x[a-fA-F0-9]{40}$/.test(p.address))return err('Informe nome e endereço no formato 0x + 40 caracteres hexadecimais.',422);const w={id:crypto.randomUUID(),label:p.label,address:p.address,network:p.network,primary:u.wallets.length===0};u.wallets.push(w);save();return ok(w,201)}),
 http.patch('/api/wallets/:id',async({request,params})=>{const u=userOf(request);if(!u)return err('Faça login.',401);const w=u.wallets.find(w=>w.id===params.id);if(!w)return err('Carteira não encontrada.',404);const p=await request.json() as Partial<typeof w>;if((p.label!==undefined&&!p.label.trim())||(p.network!==undefined&&!validNetwork(p.network))||(p.address!==undefined&&!/^0x[a-fA-F0-9]{40}$/.test(p.address)))return err('Nome, rede ou endereço inválido.',422);if(p.primary===true)u.wallets.forEach(x=>x.primary=false);if(p.label!==undefined)w.label=p.label.trim();if(p.address!==undefined)w.address=p.address;if(p.network!==undefined)w.network=p.network;if(p.primary===true)w.primary=true;save();return ok(w)}),
 http.post('/api/__test/scenario',async({request})=>{const {key}=await request.json() as {key:string};const valid=['default','slow','server-error','offline','expired-session','price-change','declined-payment','timeout-after-create','duplicate-events','out-of-order','mutation-error','wallet-refusal','empty','client-error','variable-latency','sold-out'];if(!valid.includes(key))return err('Cenário desconhecido.',422);state().scenario=key as import('../types').Scenario;if(key==='price-change'){const nft=changeNFT();if(nft)socketBus.nft(nft)}if(key==='sold-out'){const nft=state().nfts[0];nft.available=0;nft.version++;socketBus.nft(nft)}save();return ok({scenario:key})}),
 http.post('/api/__test/disconnect',()=>{socketBus.closeAll();return ok({success:true})}),
 http.post('/api/__test/reset',()=>{latencyIndex=0;reset();socketBus.closeAll();return ok({success:true})}),
 http.post('/api/__test/change-nft',()=>{const nft=changeNFT();if(!nft)return err('Não encontrado',404);socketBus.nft(nft);if(state().scenario==='duplicate-events'){socketBus.nft(nft);socketBus.old(nft)}return ok(nft)}),
 http.post('/api/__test/expire-session',()=>{state().scenario='expired-session';save();return ok({success:true})}),
 http.post('/api/__test/old-event',()=>{const nft=state().nfts[0];socketBus.old(nft);return ok({success:true})}),
]
