import {tokenStore} from './api'

// Coupon/network belong to the session, with a separate namespace for visitors.
export function preferenceKey(name:string){return `kurio-${name}:${tokenStore.get()||'guest'}`}
export function preference(name:string,fallback=''){return localStorage.getItem(preferenceKey(name))||fallback}
export function savePreference(name:string,value:string){localStorage.setItem(preferenceKey(name),value)}
