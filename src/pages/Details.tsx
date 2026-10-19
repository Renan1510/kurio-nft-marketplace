import axios from 'axios'
import {Link,useNavigate,useParams} from '@tanstack/react-router'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {Heart,ShoppingCart,Minus,Plus} from 'lucide-react'
import {useEffect,useState} from 'react'
import {svc,errorMessage} from '../lib/api'
import {eth} from '../lib/money'
import {useAuth} from '../contexts'
import {Button} from '../components/ui/button'
import {Notice,EmptyState,NFTCard,Skeleton} from '../components/atoms'


function NFTArtwork({source,title,gallery,onGallery,loading}:{source?:string;title:string;gallery:number;onGallery:(index:number)=>void;loading:boolean}) {
 const alternative=source?.endsWith('-alt.webp')?source.replace('-alt.webp','.webp'):source?.replace('.webp','-alt.webp')
 const images=source?[source,alternative||source,source,alternative||source]:[]
 const active=images[gallery]||source
 const optimized=(image:string,folder:string)=>image.startsWith('/art/')?image.replace('/art/',`/art/${folder}/`):image
 return <div className="grid grid-cols-[58px,1fr] sm:grid-cols-[75px,1fr] gap-3">
  <div className="flex flex-col gap-2">
   {loading?Array.from({length:4},(_,i)=><Skeleton key={i} className="aspect-square w-full"/>):images.map((image,i)=><button key={i} onClick={()=>onGallery(i)} className={`border-2 ${gallery===i?'border-accent':'border-transparent'}`} aria-label={`Ver imagem ${i+1}`} aria-current={gallery===i}><img src={optimized(image,'gallery')} width={104} height={104} loading="lazy" decoding="async" alt="" className="w-full aspect-square object-cover"/></button>)}
  </div>
  {active?<img className="w-full aspect-square object-cover rounded-lg" src={active} srcSet={`${optimized(active,'thumbs')} 360w, ${optimized(active,'responsive')} 480w, ${active} 600w`} sizes="(max-width: 620px) calc(100vw - 30px), (max-width: 900px) 40vw, 390px" width={600} height={600} fetchPriority="high" decoding="async" alt={loading?'Prévia da obra digital':`Imagem ${gallery+1} de ${title}`}/>:<Skeleton className="aspect-square w-full"/>}
 </div>
}
export function Details(){const {id}=useParams({from:'/nft/$id'}),nav=useNavigate();const client=useQueryClient();const {user}=useAuth();const [quantity,setQuantity]=useState(1),[gallery,setGallery]=useState(0),[message,setMessage]=useState('')
 const nft=useQuery({queryKey:['nft',id],queryFn:({signal})=>svc.nft(id,signal)});const fav=useQuery({queryKey:['favorites',user?.id],queryFn:svc.favorites,enabled:!!user})
 const cart=useMutation({mutationFn:()=>svc.addCart(id,quantity),onSuccess:()=>{void client.invalidateQueries({queryKey:['cart']});setMessage('NFT adicionado ao carrinho!')},onError:e=>setMessage(errorMessage(e))})
 const favorite=useMutation({mutationFn:()=>svc.favorite(id,!fav.data?.includes(id)),onSuccess:()=>void client.invalidateQueries({queryKey:['favorites']}),onError:e=>setMessage(errorMessage(e))})
 useEffect(()=>{setQuantity(1);setGallery(0);setMessage('')},[id])
 if(nft.isLoading)return <>
  {/* Reserva a mesma estrutura visual da tela carregada para evitar CLS. */}
  <div className="breadcrumb"><Link to="/">Início</Link> / Mercado / Carregando NFT...</div>
  <div className="grid md:grid-cols-[1.05fr,1fr] gap-10 md:gap-16">
   <NFTArtwork source={undefined} title="" gallery={0} onGallery={()=>{}} loading/>
   <div><Skeleton className="h-4 w-1/2 mb-4"/><Skeleton className="h-8 w-4/5 mb-3"/><Skeleton className="h-8 w-1/2 mb-4"/>
    <Skeleton className="h-20 mb-6"/><Skeleton className="h-8 mb-6"/><Skeleton className="h-5 mb-5"/><Skeleton className="h-12 w-2/3 mb-6"/><Skeleton className="h-10"/>
   </div>
  </div>
  <div className="section-space"><Skeleton className="h-10"/><Skeleton className="h-24 mt-5"/></div>
  <div className="section-space"><Skeleton className="h-8 mb-6"/><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({length:3},(_,i)=><Skeleton key={i} className="aspect-square"/>)}</div></div>
 </>
 if(nft.isError&&!(axios.isAxiosError(nft.error)&&nft.error.response?.status===404))return <Notice type="error">{errorMessage(nft.error)} <button className="btn-link" onClick={()=>void nft.refetch()}>Tentar novamente</button></Notice>
 if(nft.isError)return <div className="py-24"><EmptyState title="NFT não encontrado" body={errorMessage(nft.error)}/></div>
 const n=nft.data!
 return <><div className="breadcrumb"><Link to="/">Início</Link> / Mercado / {n.title}</div><div className="grid md:grid-cols-[1.05fr,1fr] gap-10 md:gap-16"><NFTArtwork source={n.image} title={n.title} gallery={gallery} onGallery={setGallery} loading={false}/><div><p className="text-accent text-xs mb-4">{n.collection}</p><h1 className="text-2xl font-bold mb-3">{n.title}</h1><p className="text-accent text-2xl font-bold mb-4">{eth(n.price)}</p><p className="text-soft text-xs leading-7 mb-5">Uma obra digital de {n.creator}. Edição exclusiva e limitada, criada para quem acredita no futuro da expressão digital.</p><div className="divider"/><p className="font-bold mb-3">Edição disponível: <span className="text-accent">{n.available} de {n.total}</span></p><p className="text-soft text-xs mb-5">Rede: {n.network} · Categoria: {n.category}</p><label className="label" htmlFor="edition">Selecione a edição</label><select id="edition" className="field mb-5" value={id} onChange={e=>void nav({to:'/nft/$id',params:{id:e.target.value}})}>{(n.editions||[{id:n.id,label:n.editionName||'Padrão',available:n.available}]).map(edition=><option key={edition.id} value={edition.id}>{edition.label} — {edition.available} disponíveis</option>)}</select><div className="flex items-center gap-4 mb-6"><label htmlFor="quantity" className="font-bold">Quantidade</label><div className="qty"><button aria-label="Diminuir quantidade" disabled={quantity<=1} onClick={()=>setQuantity(q=>q-1)}><Minus size={14} className="mx-auto"/></button><input id="quantity" type="number" className="field w-16 text-center" min={1} max={n.available} value={quantity} onChange={e=>setQuantity(Math.min(n.available,Math.max(1,Math.floor(Number(e.target.value))||1)))}/><button aria-label="Aumentar quantidade" disabled={quantity>=n.available} onClick={()=>setQuantity(q=>q+1)}><Plus size={14} className="mx-auto"/></button></div></div><div className="flex gap-3 flex-wrap"><Button disabled={!n.available||cart.isPending} onClick={()=>cart.mutate()}><ShoppingCart size={16}/> {n.available?'Comprar / adicionar ao carrinho':'Edição esgotada'}</Button><Button variant="outline" disabled={favorite.isPending} onClick={()=>user?favorite.mutate():void nav({to:'/login',search:{redirect:`/nft/${id}`}})}><Heart size={16} fill={fav.data?.includes(id)?'currentColor':'none'}/> {fav.data?.includes(id)?'Favoritado':'Favoritar'}</Button></div>{message&&<Notice type={cart.isError||favorite.isError?'error':'success'}>{message} {!cart.isError&&!favorite.isError&&<Link className="btn-link" to="/cart">Ver carrinho</Link>}</Notice>}<p className="text-xs text-soft mt-7">Identificador: #{n.id.toUpperCase()} · Coleção {n.collection}</p></div></div><div className="section-space"><div className="flex gap-6 border-b border-stroke"><span className="tab active">Detalhes do NFT</span></div><p className="text-soft leading-7 text-sm py-5">{n.description}</p></div><div className="section-space"><h2 className="font-bold text-xl mb-6">Mais desta coleção</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{['emerald','violet','ivory','golden'].filter(x=>x!==id).map((x,i)=><Related key={x} id={x} i={i}/>)}</div></div></>
}
function Related({id}:{id:string;i:number}){const q=useQuery({queryKey:['nft',id],queryFn:({signal})=>svc.nft(id,signal)});return q.data?<NFTCard nft={q.data}/>:<Skeleton className="aspect-square"/>}


