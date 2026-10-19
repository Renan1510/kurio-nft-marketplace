import {ws} from 'msw'
import {toSocketIo} from '@mswjs/socket.io-binding'
import {state} from './db'
import type {NFT,Order,RealtimeEvent} from '../types'

// IMPORTANT: MSW 2.x normalizes Socket.IO WebSocket URLs before matching
// handlers. It strips the `/socket.io/` prefix from the *client* URL, so a
// real connection to ws://host/socket.io/?EIO=4&transport=websocket is matched
// as ws://host/. `matchRequestUrl` also ignores query parameters.
// See msw's WebSocketHandler.parse() (v2.15.0).
// Matching `/socket.io/` here prevents the handler from ever running and
// Socket.IO's Engine.IO handshake never completes.
// This project exposes a single WebSocket endpoint (its Socket.IO transport).
const endpoint=ws.link(/^wss?:\/\/[^/]+\/?$/)
type Peer={emit:(name:string,payload:unknown)=>void}
const clients=new Map<Peer,{userId:string|null;token:string;close:()=>void}>()
export const socketHandler=endpoint.addEventListener('connection',connection=>{
  const {client}=toSocketIo(connection)
  const token=new URL(connection.client.url).searchParams.get('auth_token') || ''
  const session=state().tokens[token]
  const userId=session && session.until>Date.now() && state().scenario!=='expired-session'?session.userId:null
  clients.set(client,{userId,token,close:()=>connection.client.close(1012,'Simulated reconnect')})
  // This is a real Socket.IO event from socket.io-client through the binding.
  // Never fake a connection by directly mutating React/query state.
  client.on('kurio.hello',()=>{
    client.emit('kurio.ready',{transport:'msw-socket.io',sessionUserId:userId})
  })
  connection.client.addEventListener('close',()=>clients.delete(client))
})
function send<T>(name:string,event:RealtimeEvent<T>,owner?:string){
  for(const [client,peer] of clients){
    const {userId,token}=peer
    const session=state().tokens[token]
    if(owner && (userId!==owner || !session || session.until<=Date.now() || state().scenario==='expired-session'))continue
    try{client.emit(name,event)}catch{clients.delete(client)}
  }
}
export const socketBus={
  nft(nft:NFT){send('nft.updated',{eventId:`nft:${nft.id}:${nft.version}`,resourceId:nft.id,version:nft.version,data:structuredClone(nft)})},
  order(order:Order){send('order.updated',{eventId:`order:${order.id}:${order.version}`,resourceId:order.id,version:order.version,data:structuredClone(order),userId:order.userId},order.userId)},
  old(nft:NFT){send('nft.updated',{eventId:`nft:${nft.id}:0`,resourceId:nft.id,version:0,data:{...nft,price:'0.01',version:0}})},
  closeAll(){for(const peer of clients.values())peer.close();clients.clear()}
}
