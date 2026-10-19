import * as React from 'react'
import {Slot} from '@radix-ui/react-slot'
import {cva,type VariantProps} from 'class-variance-authority'
import {cn} from '../../lib/utils'
const variants=cva('inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#da935b] disabled:opacity-50 disabled:pointer-events-none', {variants:{variant:{default:'bg-accent text-[#1c110c] hover:bg-[#efaa70]',secondary:'border border-[#72402d] bg-[#241714] text-[#f2d1b2] hover:bg-[#42251d]',ghost:'text-[#e9cbb5] hover:bg-[#2b1c17]',outline:'border border-[#6b3a2b] text-[#dfb08c] hover:bg-[#281814]',danger:'bg-[#592b29] text-white hover:bg-[#7a3b38]'},size:{default:'h-10 px-5 py-2',sm:'h-8 px-3',lg:'h-11 px-7',icon:'h-10 w-10'}},defaultVariants:{variant:'default',size:'default'}})
export type ButtonProps=React.ButtonHTMLAttributes<HTMLButtonElement>&VariantProps<typeof variants>&{asChild?:boolean}
export function Button({className,variant,size,asChild=false,...props}:ButtonProps){const Comp=asChild?Slot:'button';return <Comp className={cn(variants({variant,size,className}))}{...props}/>}
