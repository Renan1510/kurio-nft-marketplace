import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {svc,tokenStore,AUTH_EXPIRED_EVENT} from './lib/api'
import {preference,savePreference} from './lib/preferences'
import {connectRealtime} from './lib/realtime'
import type {User} from './types'
import {useRouter} from '@tanstack/react-router'
import axios from 'axios'
const AuthContext=createContext<{user:User|null;loading:boolean;accept:(token:string)=>void;signout:()=>Promise<void>}>({user:null,loading:true,accept:()=>{},signout:async()=>{}})
export function AuthProvider({children}:{children:ReactNode}){
 const client=useQueryClient(),router=useRouter()
 const [token,setToken]=useState(tokenStore.get())
 const q=useQuery({queryKey:['session',token],queryFn:svc.session,enabled:!!token,retry:false,staleTime:60000})
 const user=token?q.data||null:null
 useEffect(()=>connectRealtime(client,user?.id||null),[client,user?.id])
 useEffect(()=>{
   const expire=()=>{
     const pathname=window.location.pathname
     tokenStore.clear();setToken(null);client.clear()
     if(/^\/(checkout|profile|wallets|order)(\/|$)/.test(pathname)){
       void router.navigate({to:'/login',search:{redirect:pathname},replace:true})
     }
   }
   window.addEventListener(AUTH_EXPIRED_EVENT,expire)
   return()=>window.removeEventListener(AUTH_EXPIRED_EVENT,expire)
 },[client,router])
 useEffect(()=>{if(token&&q.isError&&axios.isAxiosError(q.error)&&q.error.response?.status===401){
   tokenStore.clear();setToken(null);client.clear()
   const pathname=window.location.pathname
   if(/^\/(checkout|profile|wallets|order)(\/|$)/.test(pathname))void router.navigate({to:'/login',search:{redirect:pathname},replace:true})
  }},[token,q.isError,q.error,client,router])
 const value=useMemo(()=>({user,loading:!!token&&q.isLoading,accept:(value:string)=>{const coupon=preference('coupon'),network=preference('network');client.clear();tokenStore.set(value);savePreference('coupon',coupon);savePreference('network',network);setToken(value)},signout:async()=>{try{await svc.logout()}catch{/* clearing local credentials regardless */}await router.navigate({to:'/',replace:true});tokenStore.clear();client.clear();setToken(null)}}),[user,token,q.isLoading,client,router])
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuth=()=>useContext(AuthContext)
