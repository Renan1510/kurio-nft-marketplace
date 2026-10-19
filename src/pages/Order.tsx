import {Link,useNavigate,useParams} from '@tanstack/react-router'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {useEffect} from 'react'
import {CheckCircle2,Clock3,XCircle} from 'lucide-react'
import {useAuth} from '../contexts'
import {svc,errorMessage} from '../lib/api'
import {eth} from '../lib/money'
import {Button} from '../components/ui/button'
import {Notice,Skeleton} from '../components/atoms'
export function OrderPage(){const {id}=useParams({from:'/order/$id'}),nav=useNavigate(),client=useQueryClient(),{user,loading}=useAuth()
 const order=useQuery({queryKey:['order',user?.id,id],queryFn:()=>svc.order(id),enabled:!!user,refetchInterval:q=>q.state.data?.status==='pending'?1700:false})
 useEffect(()=>{if(!loading&&!user)void nav({to:'/login',search:{redirect:`/order/${id}`},replace:true})},[loading,user,nav,id])
 useEffect(()=>{if(order.data?.status==='confirmed')void client.invalidateQueries({queryKey:['cart']})},[order.data?.status,client])
 if(!user||order.isLoading)return <Skeleton className="h-96 max-w-2xl mx-auto mt-16"/>
 if(order.isError)return <div className="max-w-xl mx-auto py-20"><Notice type="error">{errorMessage(order.error)}</Notice></div>
 const o=order.data!
 return <div className="max-w-2xl mx-auto mt-16 panel text-center"><div className="flex justify-center mb-4">{o.status==='pending'?<Clock3 size={49} className="text-accent"/>:o.status==='confirmed'?<CheckCircle2 size={49} className="text-green-300"/>:<XCircle size={49} className="text-red-300"/>}</div><h1 aria-live="polite" className="page-title">{o.status==='pending'?'Pedido em processamento':o.status==='confirmed'?'Pedido confirmado!':'Pedido recusado'}</h1><p className="text-soft mt-3 mb-7">{o.status==='pending'?'Aguarde a confirmação simulada. Você pode atualizar a página sem perder o pedido.':o.status==='confirmed'?'Seu pedido fictício foi concluído com sucesso. Nenhuma cobrança foi realizada.':'Nenhum pagamento ocorreu. Os itens permanecem no carrinho.'}</p><div className="text-left border-y border-stroke py-5 space-y-2"><p>Pedido: <strong>{o.id.slice(0,12).toUpperCase()}</strong></p><p>Referência fictícia: <strong>{o.reference}</strong></p><p>Colecionador: <strong>{o.collector?.name}</strong></p><p>Rede: <strong>{o.quote.network}</strong></p><p>Data: <strong>{new Date(o.createdAt).toLocaleString('pt-BR')}</strong></p></div><div className="my-6">{o.quote.items.map(i=><div key={i.nft.id} className="flex items-center gap-3 py-3 text-left"><img src={i.nft.image} className="h-12 w-12 object-cover" alt=""/><div className="flex-1"><p>{i.nft.title}</p><p className="text-soft text-xs">{i.quantity} edição(ões)</p></div><b>{eth(i.lineTotal)}</b></div>)}</div><div className="flex justify-between mb-2"><span>Subtotal</span><span>{eth(o.quote.subtotal)}</span></div><div className="flex justify-between mb-2"><span>Desconto</span><span>{eth(o.quote.discount)}</span></div><div className="flex justify-between mb-2"><span>Taxas</span><span>{eth(o.quote.networkFee)}</span></div><div className="divider"/><div className="flex justify-between text-xl font-bold mb-7"><span>Total</span><span className="text-accent">{eth(o.quote.total)}</span></div><div className="flex gap-3 justify-center flex-wrap">{o.status==='declined'&&<Button asChild><Link to="/cart">Voltar ao carrinho</Link></Button>}{o.status==='pending'&&<Button onClick={()=>void order.refetch()}>Atualizar status</Button>}<Button asChild variant="outline"><Link to="/">Voltar ao mercado</Link></Button></div></div>
}
