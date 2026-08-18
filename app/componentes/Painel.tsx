'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { FormularioCotacao } from './FormularioCotacao'
import { Resultado } from './Resultado'
import type { Resultado as TipoResultado } from '@/app/acoes'

export function Painel() {
  const [resultado, setResultado] = useState<TipoResultado | null>(null)
  const [nome, setNome] = useState('')

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <FormularioCotacao
          aoResultado={(r, n) => {
            setResultado(r)
            setNome(n)
          }}
        />
      </motion.div>

      <div>
        {resultado ? (
          <Resultado resultado={resultado} nome={nome} />
        ) : (
          <div
            className="flex h-full min-h-[320px] items-center justify-center rounded-xl
                       border border-dashed border-cofre-borda p-8 text-center"
          >
            <p className="max-w-xs text-sm text-cofre-suave">
              Preencha os dados do cliente para comparar as seguradoras.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
