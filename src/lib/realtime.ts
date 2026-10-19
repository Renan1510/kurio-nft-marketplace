import type {QueryClient} from '@tanstack/react-query'
import type {NFT,Order,RealtimeEvent} from '../types'
import {svc,tokenStore} from './api'
import {mockReady} from './mockReady'
export function connectRealtime(queryClient:QueryClient,userId:string|null){
 let cancelled=false
 let disconnect:(()=>void)|undefined
 // Socket.IO must only be IMPORTED after worker.start(): the client transport
 // may capture native WebSocket while its module is evaluated.
 // A cancelled effect must not open a socket after logout/account switch.
 void mockReady.then(()=>import('socket.io-client')).then(({io})=>{
  if(cancelled)return
  const socket=io(location.origin,{path:'/socket.io/',transports:['websocket'],autoConnect:true,reconnection:true,forceNew:true,query:{auth_token:tokenStore.get()||''}})
  const newer=new Map<string,number>()
  const nftEvent=(ev:RealtimeEvent<NFT>)=>{
   if(cancelled||!ev.eventId||ev.data.id!==ev.resourceId||ev.data.version!==ev.version)return
   if(ev.version<=(newer.get(`n:${ev.resourceId}`)||0))return
   const cached=queryClient.getQueryData<NFT>(['nft',ev.resourceId])
   if(cached&&cached.version>=ev.version)return
   newer.set(`n:${ev.resourceId}`,ev.version)
   queryClient.setQueryData<NFT>(['nft',ev.resourceId],old=>!old||old.version<=ev.version?{...ev.data,editions:old?.editions?.map(edition=>edition.id===ev.data.id?{...edition,available:ev.data.available}:edition)}:old)
   void queryClient.invalidateQueries({queryKey:['nfts']})
   void queryClient.invalidateQueries({queryKey:['quote']})
  }
  const orderEvent=(ev:RealtimeEvent<Order>)=>{
   if(cancelled||!ev.eventId||ev.data.id!==ev.resourceId||ev.data.version!==ev.version)return
   if(!userId||ev.userId!==userId||ev.version<=(newer.get(`o:${ev.resourceId}`)||0))return
   const old=queryClient.getQueryData<Order>(['order',userId,ev.resourceId])
   if(old&&old.version>=ev.version)return
   newer.set(`o:${ev.resourceId}`,ev.version)
   queryClient.setQueryData(['order',userId,ev.resourceId],ev.data)
   void queryClient.invalidateQueries({queryKey:['cart',userId]})
   void queryClient.invalidateQueries({queryKey:['quote',userId]})
  }
  socket.on('nft.updated',nftEvent);socket.on('order.updated',orderEvent)
  socket.on('kurio.ready',()=>{
   // Acknowledge the mocked server's response, not just the opening of a raw WS.
   document.documentElement.dataset.kurioSocketReady='true'
   delete document.documentElement.dataset.kurioSocketError
  })
  socket.on('disconnect',()=>{document.documentElement.dataset.kurioSocketReady='false'})
  socket.on('connect_error',error=>{
   document.documentElement.dataset.kurioSocketReady='error'
   document.documentElement.dataset.kurioSocketError=error.message
   console.error('Falha na conexão Socket.IO simulada:',error)
  })
  socket.on('connect',()=>{
   document.documentElement.dataset.kurioSocketTransport='socket.io'
   socket.emit('kurio.hello')
   void queryClient.invalidateQueries({queryKey:['nfts']})
   void queryClient.invalidateQueries({queryKey:['nft']})
   void queryClient.invalidateQueries({queryKey:['cart']})
   void queryClient.invalidateQueries({queryKey:['quote']})
   if(userId)void queryClient.invalidateQueries({queryKey:['order',userId]})
  })
  disconnect=()=>{
   delete document.documentElement.dataset.kurioSocketReady
   delete document.documentElement.dataset.kurioSocketTransport
   delete document.documentElement.dataset.kurioSocketError
   socket.removeAllListeners();socket.disconnect();newer.clear()
  }
  if(cancelled)disconnect()
 }).catch(error=>{if(!cancelled)console.error('Falha ao iniciar Socket.IO:',error)})
 return()=>{cancelled=true;disconnect?.()}
}
export function openSocket(){return svc.changeNFT()}
