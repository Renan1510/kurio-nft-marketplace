// Fixed point ETH math: all API and storage values are decimal strings, never float prices.
const FACTOR = 10n ** 18n
export function toWei(value:string):bigint {
  if (!/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(value)) throw new Error('ETH inválido')
  const [i,f=''] = value.split('.')
  return BigInt(i)*FACTOR + BigInt((f+'0'.repeat(18)).slice(0,18))
}
export function fromWei(wei:bigint):string {
  const neg = wei<0n; const v = neg?-wei:wei
  const frac=(v%FACTOR).toString().padStart(18,'0').replace(/0+$/,'')
  return `${neg?'-':''}${v/FACTOR}${frac?'.'+frac:''}`
}
export function eth(value:string):string { const [whole,fraction]=value.split('.'); const thousands=whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.');return `${thousands}${fraction?','+fraction:''} ETH` }
