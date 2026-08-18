'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import type { Resultado as TipoResultado } from '@/app/acoes'
import { ValorAnimado } from './ValorAnimado'

const entrada = {
  oculto: { opacity: 0, y: 12 },
  visivel: (indice: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: indice * 0.07, duration: 0.35, ease: 'easeOut' as const },
  }),
}

export function Resultado({ resultado, nome }: { resultado: TipoResultado; nome: string }) {
  if (!resultado.ok) {
    return (
      <div role="alert" className="rounded-xl border border-cofre-alerta/40 bg-cofre-alerta/10 p-6">
        <p className="text-cofre-alerta">{resultado.erro}</p>
      </div>
    )
  }

  const { comparativo, todos, indisponiveis, valorPreservado } = resultado
  const algumEstimado = comparativo.some((l) => l.estimada)
  const algumAbaixo = comparativo.some((l) => l.resgateAbaixoDoAportado)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-cofre-acento">
          Ranking por aporte anual
        </h2>
        {nome && <p className="mt-1 text-sm text-cofre-suave">Estudo para {nome}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {comparativo.map((linha, indice) => (
          <motion.article
            key={linha.produtoId}
            custom={indice}
            initial="oculto"
            animate="visivel"
            variants={entrada}
            className={`rounded-xl border p-4 ${
              indice === 0
                ? 'border-cofre-acento bg-cofre-acento/[0.07] shadow-[0_0_28px_-8px_#22A7F0]'
                : 'border-cofre-borda bg-cofre-placa'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-cofre-suave">
                {indice + 1}º{indice === 0 && ' • recomendada'}
              </span>
              <Image
                src={linha.logo}
                alt={linha.seguradora}
                width={60}
                height={20}
                className="h-4 w-auto object-contain opacity-80"
              />
            </div>
            <p className="text-lg font-semibold">
              <ValorAnimado texto={linha.aporteAnual} />
            </p>
            <p className="mt-0.5 text-xs text-cofre-suave">{linha.aporteMensal} por mês</p>
          </motion.article>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="overflow-x-auto rounded-xl border border-cofre-borda bg-cofre-placa"
      >
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-cofre-borda text-left text-xs uppercase tracking-wider text-cofre-suave">
              <th className="px-4 py-3 font-medium">Critério</th>
              {comparativo.map((l) => (
                <th key={l.produtoId} className="px-4 py-3 font-medium text-cofre-texto">
                  {l.seguradora}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-cofre-borda/60">
            <Linha titulo="Aporte anual" valores={comparativo.map((l) => l.aporteAnual)} />
            <Linha
              titulo="Acumulado em 10 anos"
              valores={comparativo.map((l) => l.aporteAcumulado10a)}
            />
            <Linha
              titulo="Custo vs capital segurado"
              valores={comparativo.map((l) => l.custoSobreCapital)}
            />
            <Linha titulo="Resgate no 10º ano" valores={comparativo.map((l) => l.resgate10a)} />
            <tr>
              <th scope="row" className="px-4 py-3 text-left font-normal text-cofre-suave">
                Break-even real
              </th>
              {comparativo.map((l) => (
                <td key={l.produtoId} className="px-4 py-3">
                  {l.breakevenReal === null ? (
                    <span className="text-cofre-alerta">não atinge</span>
                  ) : (
                    `${l.breakevenReal}º ano`
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
        className="rounded-xl border border-cofre-acento/30 bg-gradient-to-r from-cofre-placa to-cofre-placa-clara p-5"
      >
        <p className="text-xs uppercase tracking-[0.18em] text-cofre-suave">
          Valor preservado em 10 anos
        </p>
        <p className="mt-1 text-2xl font-semibold text-cofre-acento">
          <ValorAnimado texto={valorPreservado} duracao={900} />
        </p>
      </motion.div>

      {(algumAbaixo || algumEstimado || indisponiveis.length > 0) && (
        <div className="space-y-2 rounded-xl border border-cofre-alerta/30 bg-cofre-alerta/[0.06] p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-cofre-alerta">
            Atenção do corretor
          </p>
          {algumAbaixo && (
            <p className="text-cofre-suave">
              Em uma ou mais seguradoras o resgate no 10º ano não alcança o total aportado. O
              documento apresenta o 10º ano como break-even.
            </p>
          )}
          {algumEstimado && (
            <p className="text-cofre-suave">
              Uma das tarifas é estimada por interpolação, não veio de estudo oficial.
            </p>
          )}
          {indisponiveis.map((i) => (
            <p key={i.produtoId} className="text-cofre-suave">
              {i.motivo}
            </p>
          ))}
        </div>
      )}

      <details className="rounded-xl border border-cofre-borda bg-cofre-placa p-4">
        <summary className="cursor-pointer text-sm text-cofre-suave">
          Ver os {todos.length} produtos cotados
        </summary>
        <ul className="mt-3 space-y-2 text-sm">
          {todos.map((p) => (
            <li
              key={p.produtoId}
              className="flex justify-between gap-4 border-t border-cofre-borda/60 pt-2"
            >
              <span className="text-cofre-suave">
                {p.seguradora} — {p.nome}
              </span>
              <span className="whitespace-nowrap font-medium">{p.aporteAnual}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

function Linha({ titulo, valores }: { titulo: string; valores: string[] }) {
  return (
    <tr>
      <th scope="row" className="px-4 py-3 text-left font-normal text-cofre-suave">
        {titulo}
      </th>
      {valores.map((valor, indice) => (
        <td key={indice} className={`px-4 py-3 ${indice === 0 ? 'font-semibold' : ''}`}>
          {valor}
        </td>
      ))}
    </tr>
  )
}
