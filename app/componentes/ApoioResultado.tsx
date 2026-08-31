'use client'

import type { LinhaProduto, LinhaResultado } from '@/app/acoes'

/**
 * Os blocos de apoio ao corretor, na coluna do formulario.
 *
 * Observacoes tecnicas e lista completa de produtos nao sao material de
 * apresentacao: o assessor consulta, o cliente nao precisa ler. Ficavam
 * empilhados abaixo do quadro comparativo, empurrando a pagina para a rolagem
 * justamente quando havia mais a explicar — o bloco de alertas sozinho chega a
 * 239px. Aqui embaixo eles ocupam espaco que ja estava vazio.
 */
export function ApoioResultado({
  comparativo,
  todos,
  indisponiveis,
}: {
  comparativo: LinhaResultado[]
  todos: LinhaProduto[]
  indisponiveis: Array<{ produtoId: string; motivo: string }>
}) {
  const algumEstimado = comparativo.some((l) => l.estimada)
  const algumAbaixo = comparativo.some((l) => l.resgateAbaixoDoAportado)

  return (
    <div className="space-y-4">
      {(algumAbaixo || algumEstimado || indisponiveis.length > 0) && (
        <div className="space-y-2 rounded-xl border border-cofre-alerta/35 bg-cofre-alerta/10 p-4 text-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cofre-alerta">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            Observações Técnicas para o Assessor
          </div>
          {algumAbaixo && (
            <p className="text-xs leading-snug text-cofre-suave">
              • Em uma ou mais seguradoras o resgate no 10º ano não alcança o total aportado. O
              documento apresenta o 10º ano como referência comercial de quitação.
            </p>
          )}
          {algumEstimado && (
            <p className="text-xs leading-snug text-cofre-suave">
              • Uma das tarifas foi estimada por interpolação matemática, não provinda de estudo
              oficial arquivado.
            </p>
          )}
          {indisponiveis.map((i) => (
            <p key={i.produtoId} className="text-xs leading-snug text-cofre-suave">
              • {i.motivo}
            </p>
          ))}
        </div>
      )}

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
