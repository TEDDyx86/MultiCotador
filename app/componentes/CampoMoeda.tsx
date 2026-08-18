'use client'

import { numeroParaMascara } from '@/lib/formato'

interface Props {
  id: string
  valor: string
  aoMudar: (digitos: string) => void
}

export function CampoMoeda({ id, valor, aoMudar }: Props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cofre-suave">
        R$
      </span>
      <input
        id={id}
        inputMode="numeric"
        value={numeroParaMascara(valor)}
        onChange={(e) => aoMudar(e.target.value.replace(/\D/g, ''))}
        placeholder="0,00"
        className="w-full rounded-md border border-cofre-borda bg-cofre-fundo py-2.5 pl-10 pr-3
                   text-right font-medium text-cofre-texto shadow-inner outline-none
                   transition-colors focus:border-cofre-acento"
      />
    </div>
  )
}
