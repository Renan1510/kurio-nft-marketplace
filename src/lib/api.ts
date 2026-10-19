import axios from 'axios'
import {mockReady} from './mockReady'
import type {CartResponse, NFT, Order, PagedNFTs, Quote, User, Wallet, CatalogSearch, Network} from '../types'
export const tokenStore = {
  get:()=>localStorage.getItem('kurio-session'),
  set:(value:string)=>localStorage.setItem('kurio-session',value),
  clear:()=>localStorage.removeItem('kurio-session')
}
function guestId() {
  let value=localStorage.getItem('kurio-guest')
  if(!value){ value=crypto.randomUUID(); localStorage.setItem('kurio-guest',value) }
  return value
}
export const AUTH_EXPIRED_EVENT='kurio:auth-expired'
export const api=axios.create({baseURL:'/api',timeout:10000})
api.interceptors.request.use(async config=>{
  await mockReady
  const token=tokenStore.get()
  if(token)config.headers.Authorization=`Bearer ${token}`
  config.headers['X-Guest-Id']=guestId()
  return config
})
api.interceptors.response.use(response=>response,error=>{
  if(axios.isAxiosError(error) && error.response?.status===401 && tokenStore.get() && !/\/auth\/(login|register)/.test(error.config?.url||'')) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
  }
  return Promise.reject(error)
})
export const svc={
  session:async()=> (await api.get<User>('/auth/session')).data,
  login:async(payload:{email:string;password:string})=>(await api.post<{token:string;user:User}>('/auth/login',payload)).data,
  register:async(payload:{name:string;email:string;password:string})=>(await api.post<{token:string;user:User}>('/auth/register',payload)).data,
  logout:async()=> (await api.post('/auth/logout')).data,
  nfts:async(params:CatalogSearch,signal?:AbortSignal)=> (await api.get<PagedNFTs>('/nfts',{params,signal})).data,
  nft:async(id:string,signal?:AbortSignal)=> (await api.get<NFT>(`/nfts/${id}`,{signal})).data,
  favorites:async()=> (await api.get<string[]>('/favorites')).data,
  favorite:async(id:string,add:boolean)=> (await api({url:`/favorites/${id}`,method:add?'post':'delete'})).data,
  cart:async()=> (await api.get<CartResponse>('/cart')).data,
  addCart:async(nftId:string,quantity:number)=>(await api.post<CartResponse>('/cart/items',{nftId,quantity})).data,
  setCart:async(nftId:string,quantity:number)=>(await api.put<CartResponse>(`/cart/items/${nftId}`,{quantity})).data,
  deleteCart:async(nftId:string)=>(await api.delete<CartResponse>(`/cart/items/${nftId}`)).data,
  quote:async(coupon:string,network:Network)=>(await api.post<Quote>('/quote',{coupon,network})).data,
  placeOrder:async(quote:Quote,walletId:string,key:string,collector:{name:string;email:string})=>(await api.post<Order>('/orders',{quoteFingerprint:quote.fingerprint,coupon:quote.coupon,network:quote.network,walletId,collector},{headers:{'Idempotency-Key':key},timeout:4500})).data,
  order:async(id:string)=>(await api.get<Order>(`/orders/${id}`)).data,
  orderByKey:async(key:string)=>(await api.get<Order>(`/orders/by-key/${encodeURIComponent(key)}`)).data,
  profile:async()=> (await api.get<User>('/profile')).data,
  editProfile:async(payload:Partial<User>)=>(await api.put<User>('/profile',payload)).data,
  changePassword:async(payload:{oldPassword:string;newPassword:string})=>(await api.patch('/profile/password',payload)).data,
  connectWallet:async(walletId:string,network:Network)=>(await api.post<{connected:boolean;walletId:string;network:Network}>('/wallets/connect',{walletId,network})).data,
  wallets:async()=> (await api.get<Wallet[]>('/wallets')).data,
  addWallet:async(payload:{label:string;address:string;network:Network})=>(await api.post<Wallet>('/wallets',payload)).data,
  editWallet:async(id:string,payload:Partial<Wallet>)=>(await api.patch<Wallet>(`/wallets/${id}`,payload)).data,
  scenario:async(key:string)=>(await api.post('/__test/scenario',{key})).data,
  reset:async()=> (await api.post('/__test/reset')).data,
  changeNFT:async()=>(await api.post('/__test/change-nft')).data,
  replay:async()=>(await api.post('/__test/old-event')).data
}
export function errorMessage(error:unknown):string {
  if(axios.isAxiosError(error)) return (error.response?.data as {message?:string}|undefined)?.message || (error.code==='ECONNABORTED'?'A solicitação expirou. Tente novamente.':'Falha de conexão. Tente novamente.')
  return error instanceof Error?error.message:'Ocorreu um erro inesperado.'
}
