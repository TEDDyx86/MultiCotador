'use client'

import type { LinhaProduto } from '@/app/acoes'

/**
 * A lista completa de produtos cotados, na coluna do formulario.
 *
 * Nao e material de apresentacao: o assessor consulta, o cliente nao precisa
 * ler. Ficava empilhada abaixo do quadro comparativo, empurrando a pagina para
 * a rolagem justamente quando havia mais a explicar. Aqui embaixo ocupa espaco
 * que ja estava vazio.
 *
 * Acompanhava-a um bloco de observacoes tecnicas em faixa de alerta, com as
 * ressalvas de resgate abaixo do aportado, tarifa estimada e produtos fora de
 * faixa etaria. Retirado por decisao de produto. As duas primeiras ressalvas
 * continuam no documento em PDF, no bloco de observacoes metodologicas; a
 * tarifa estimada segue marcada produto a produto na lista abaixo. O que deixa
 * de aparecer na tela e o motivo de um produto nao ter sido cotado — a acao
 * ainda o devolve em `indisponiveis`, caso um dia volte a ter onde aparecer.
 */
export function ApoioResultado({ todos }: { todos: LinhaProduto[] }) {
  return (
    <div className="space-y-4">
      <details className="group rounded-xl border border-cofre-borda bg-cofre-placa p-4 transition-all">
        <summary className="-my-1.5 flex cursor-pointer items-center justify-between gap-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-cofre-suave hover:text-cofre-texto">
          <span>
            {todos.length === 1
              ? 'Ver o único produto cotado'
              : `Ver todos os ${todos.length} produtos cotados`}
          </span>
          <span className="text-xs transition-transform group-open:rotate-180">▼</span>
        </summary>
        <ul className="mt-3.5 divide-y divide-cofre-borda/40 text-sm">
          {todos.map((p) => (
            <li key={p.produtoId} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <span className="font-medium text-cofre-texto">{p.seguradora}</span>
                <span className="ml-1.5 text-xs text-cofre-suave">{p.nome}</span>
                {p.estimada && (
                  <span className="ml-1.5 rounded bg-cofre-alerta/15 px-1.5 py-0.5 text-xs font-medium text-cofre-alerta">
                    estimada
                  </span>
                )}
                {/*
                 * Contorno em vez de fundo chapado, e nao na cor de alerta: o
                 * selo "estimada" ao lado sinaliza um dado de qualidade
                 * inferior, e este nao — nao ter resgate e caracteristica do
                 * produto, nao defeito da cotacao. Iguais na cor, os dois se
                 * leriam como o mesmo tipo de ressalva.
                 */}
                {!p.temResgate && (
                  <span className="ml-1.5 whitespace-nowrap rounded border border-cofre-suave/40 px-1.5 py-0.5 text-xs font-medium text-cofre-suave">
                    sem resgate
                  </span>
                )}
              </div>
              <span className="whitespace-nowrap font-bold tabular-nums text-cofre-texto">
                {p.aporteAnual}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
