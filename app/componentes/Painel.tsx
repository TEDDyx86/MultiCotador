'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FormularioCotacao } from './FormularioCotacao'
import { Resultado } from './Resultado'
import type { Resultado as TipoResultado } from '@/app/acoes'
import type { DadosFormulario } from '@/lib/dominio/tipos'

export function Painel() {
  const [resultado, setResultado] = useState<TipoResultado | null>(null)
  const [dados, setDados] = useState<DadosFormulario | null>(null)

  // O min-w-0 nos dois itens do grid e o que mantem a tela dentro da largura do
  // aparelho. Item de grid nasce com min-width:auto, que respeita o min-content
  // do conteudo: a largura minima da tabela comparativa inflava a coluna e
  // empurrava o formulario junto, dando 306px de rolagem lateral num telefone de
  // 360px. O overflow-x da tabela nao resolvia sozinho, porque o problema estava
  // um nivel acima — o item do grid nao conseguia encolher.
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <motion.div
        className="min-w-0"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <FormularioCotacao
          aoResultado={(r, d) => {
            setResultado(r)
            setDados(d)
          }}
        />
      </motion.div>

      <div className="min-w-0">
        <AnimatePresence mode="wait">
          {resultado ? (
            <motion.div
              key="resultado"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <Resultado resultado={resultado} dados={dados} />
            </motion.div>
          ) : (
            <motion.div
              key="vazio"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex h-full min-h-[380px] flex-col items-center justify-center overflow-hidden rounded-xl
                         border border-cofre-borda/80 bg-gradient-to-b from-cofre-placa/60 to-cofre-placa/30 p-8 text-center shadow-lg"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-screen"
                style={{
                  backgroundImage: 'url(/marcas/textura-cabecalho.png)',
                  backgroundSize: '220px',
                }}
              />
              <div className="relative z-10 flex flex-col items-center max-w-sm">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-cofre-acento/30 bg-cofre-acento/10 text-cofre-acento shadow-inner">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-cofre-texto">
                  Simulação Comparativa Whole Life
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-cofre-suave">
                  Preencha os dados do cliente no formulário ao lado para calcular o ranking entre as 4 seguradoras e visualizar as métricas de quitação em 10 anos.
                </p>
                <div className="mt-5 flex items-center gap-3 text-xs text-cofre-suave/80">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cofre-acento" />
                    MAG
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cofre-acento" />
                    Icatu
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cofre-acento" />
                    MetLife
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cofre-acento" />
                    Prudential
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
