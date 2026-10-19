import {createRootRoute,createRoute,createRouter,lazyRouteComponent,redirect} from '@tanstack/react-router'
import axios from 'axios'
import {svc,tokenStore} from './lib/api'
import {Shell} from './components/Shell'
import {Home} from './pages/Home'
import {Details} from './pages/Details'
import {EmptyState} from './components/atoms'
import type {CatalogSearch} from './types'
const rootRoute=createRootRoute({component:Shell,notFoundComponent:()=> <div className="py-24"><EmptyState title="Página não encontrada" body="Este caminho não existe no marketplace."/></div>})
const home=createRoute({getParentRoute:()=>rootRoute,path:'/',validateSearch:(s:Record<string,unknown>):Partial<CatalogSearch>=>({q:typeof s.q==='string'?s.q:undefined,category:typeof s.category==='string'?s.category:undefined,network:typeof s.network==='string'?s.network:undefined,sort:typeof s.sort==='string'?s.sort:undefined,page:Number.isSafeInteger(Number(s.page))&&Number(s.page)>0&&Number(s.page)<1000?Number(s.page):undefined}),component:Home})
const details=createRoute({getParentRoute:()=>rootRoute,path:'/nft/$id',component:Details})
const cart=createRoute({getParentRoute:()=>rootRoute,path:'/cart',component:lazyRouteComponent(()=>import('./pages/Cart').then(m=>({default:m.Cart})))})
async function requireSession({location}:{location:{href:string}}){
 if(!tokenStore.get())throw redirect({to:'/login',search:{redirect:location.href}})
 try{await svc.session()}catch(error){if(axios.isAxiosError(error)&&error.response?.status===401)throw redirect({to:'/login',search:{redirect:location.href}});throw error}
}
const checkout=createRoute({getParentRoute:()=>rootRoute,path:'/checkout',beforeLoad:requireSession,component:lazyRouteComponent(()=>import('./pages/Checkout').then(m=>({default:m.Checkout})))})
const order=createRoute({getParentRoute:()=>rootRoute,path:'/order/$id',beforeLoad:requireSession,component:lazyRouteComponent(()=>import('./pages/Order').then(m=>({default:m.OrderPage})))})
const authSearch=(s:Record<string,unknown>)=>({redirect:typeof s.redirect==='string'&&s.redirect.startsWith('/')&&!s.redirect.startsWith('//')&&![...s.redirect].some(char=>char==='\\'||char.charCodeAt(0)<32)?s.redirect:'/'})
const login=createRoute({getParentRoute:()=>rootRoute,path:'/login',validateSearch:authSearch,component:lazyRouteComponent(()=>import('./pages/Auth').then(m=>({default:m.Login})))})
const register=createRoute({getParentRoute:()=>rootRoute,path:'/register',validateSearch:authSearch,component:lazyRouteComponent(()=>import('./pages/Auth').then(m=>({default:m.Register})))})
const profile=createRoute({getParentRoute:()=>rootRoute,path:'/profile',beforeLoad:requireSession,component:lazyRouteComponent(()=>import('./pages/Account').then(m=>({default:m.Profile})))})
const wallets=createRoute({getParentRoute:()=>rootRoute,path:'/wallets',beforeLoad:requireSession,component:lazyRouteComponent(()=>import('./pages/Account').then(m=>({default:m.Wallets})))})
const routeTree=rootRoute.addChildren([home,details,cart,checkout,order,login,register,profile,wallets])
export const router=createRouter({routeTree,defaultPreload:'intent',defaultPreloadStaleTime:0,defaultNotFoundComponent:()=> <EmptyState title="Página não encontrada" body="Volte para explorar NFTs."/>})
declare module '@tanstack/react-router'{interface Register{router:typeof router}}
