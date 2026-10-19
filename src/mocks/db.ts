import type { CartItem, NFT, Order, Scenario, User, Wallet } from '../types'
import { fromWei, toWei } from '../lib/money'

export type Account = User & { passwordHash: string; passwordSalt?:string; wallets: Wallet[]; favorites: string[]; cart: CartItem[] }
export type DB = { users: Account[]; nfts: NFT[]; guestCarts: Record<string, CartItem[]>; tokens: Record<string,{userId:string;until:number}>; orders: Order[]; orderKeys: Record<string,{id:string;body:string}>; scenario: Scenario; version:number; couponByOwner:Record<string,string> }
const KEY='kurio_mock_database_v2'
const examples:[string,string,string,string][]=[
 ['emerald','Emerald Ape #042','1.19','/art/emerald.webp'],
 ['violet','Violet Nomad #314','1.39','/art/violet.webp'],
 ['ivory','Ivory Baron #088','1.79','/art/ivory.webp'],
 ['cosmic','Cosmic Bloom #118','1.29','/art/violet-alt.webp'],
 ['golden','Golden Beat #207','0.99','/art/gold.webp'],
 ['signal','Golden Signal #160','0.39','/art/gold-alt.webp'],
 ['frequencies','Golden Frequency #071','0.49','/art/gold.webp'],
 ['emerald2','Emerald Echo #221','2.19','/art/emerald-alt.webp'],
 ['violet2','Violet Night #902','0.79','/art/violet.webp'],
 ['ivory2','Midnight Baron #610','1.59','/art/ivory.webp'],
 ['cosmic2','Nomad Dreams #510','0.89','/art/violet-alt.webp'],
 ['golden2','Sunset Groove #120','1.09','/art/gold-alt.webp'],
 ['emerald3','Emerald Roots #043','2.49','/art/emerald.webp'],
 ['violet3','Cosmic Traveler #732','1.05','/art/violet-alt.webp'],
 ['ivory3','Baron Legacy #321','1.75','/art/ivory-alt.webp'],
 ['golden3','Golden Horizon #508','0.69','/art/gold.webp'],
 ['emerald4','Emerald Explorer #016','1.99','/art/emerald-alt.webp'],
 ['violet4','Purple Verse #899','0.95','/art/violet.webp'],
]
const cats=['Arte','Fotografia','3D','Música'] as const
const nets=['Ethereum','Polygon','Base'] as const
function addEditions(nfts:NFT[]){
 for(const nft of [...nfts]){
  if(nft.id.endsWith('--signed'))continue
  nft.editionGroup=nft.id;nft.editionName='Padrão'
  if(!nfts.some(n=>n.id===nft.id+'--signed'))nfts.push({...nft,id:nft.id+'--signed',title:nft.title+' · Assinada',editionName:'Assinada',price:fromWei(toWei(nft.price)+toWei('0.1')),available:3,total:3,featured:false})
 }
}
function initial():DB {
 const nfts:NFT[]=examples.map(([id,title,price,image],i)=>({id,title,price,image,creator:['Kurio Studio','Neo Genesis','Pixel Society'][i%3],collection:['Genesis Apes','Nomad Club','Digital Icons'][i%3],category:cats[i%4],network:nets[i%3],available:i===13?0:16+i,total:24+i,version:1,featured:i<6,description:'Uma obra digital da coleção KURIO. Cada edição combina arte, identidade e criatividade em um universo de colecionáveis digitais. Esta experiência é inteiramente simulada.'}))
 addEditions(nfts)
 return {nfts,users:[
  {id:'user-1',name:'Ana Colecionadora',email:'ana@kurio.demo',bio:'Apaixonada por arte digital.',avatar:'/art/violet.webp',version:1,passwordHash:'6468168250f1887cee3860f27c72ee79fbce62598a6feeb8607ea50962bb2521',favorites:['emerald'],cart:[],wallets:[{id:'wallet-1',label:'Carteira principal',address:'0x1234567890abcdef1234567890abcdef12345678',network:'Ethereum',primary:true}]},
  {id:'user-2',name:'Leo Digital',email:'leo@kurio.demo',bio:'Explorando o futuro da arte.',avatar:'/art/emerald.webp',version:1,passwordHash:'6468168250f1887cee3860f27c72ee79fbce62598a6feeb8607ea50962bb2521',favorites:['golden'],cart:[],wallets:[{id:'wallet-2',label:'Carteira principal',address:'0xabcdef1234567890abcdef1234567890abcdef12',network:'Polygon',primary:true}]}],guestCarts:{},tokens:{},orders:[],orderKeys:{},scenario:'default',version:1,couponByOwner:{}}
}
// Demo hashes use the legacy fixture salt; newly registered/changed passwords use random per-account salts.
export const DEMO_PASSWORD='demo12345'
let db:DB
try {const raw=localStorage.getItem(KEY);const restored=raw?JSON.parse(raw) as DB:null;db=restored&&Array.isArray(restored.nfts)&&Array.isArray(restored.users)&&Array.isArray(restored.orders)&&restored.guestCarts&&restored.tokens&&restored.orderKeys?restored:initial()} catch {db=initial()}
addEditions(db.nfts)
export function state(){return db}
export function save(){localStorage.setItem(KEY,JSON.stringify(db))}
export function reset(){db=initial(); save(); return db}
export async function hashed(value:string,salt='kurio-demo-fixed') {
 const bytes=new TextEncoder().encode(`${salt}:${value}`)
 const hash=await crypto.subtle.digest('SHA-256',bytes)
 return Array.from(new Uint8Array(hash)).map(n=>n.toString(16).padStart(2,'0')).join('')
}
export function changeNFT(id='emerald') {
 const nft=db.nfts.find(n=>n.id===id)
 if(!nft)return null
 nft.price=fromWei(toWei(nft.price)+toWei('0.15'))
 nft.available=Math.max(0,nft.available-1);nft.version++;db.version++;save();return nft
}
