'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'motion/react'
import { cotarComparativo, type Resultado as TipoResultado } from '@/app/acoes'
import { TAXA_INICIAL, taxaDePercentual } from '@/lib/dominio/indexacao'
import type { DadosFormulario, Visao } from '@/lib/dominio/tipos'
import { ValorAnimado } from './ValorAnimado'

/*
 * Cada marca chega num PNG de proporcao muito diferente: a MetLife e uma faixa
 * (4096x880), a Prudential e quase quadrada (300x231). Com uma altura unica para
 * todas, a MetLife ocupava o triplo da largura das outras e a Prudential
 * encolhia ate o nome ficar ilegivel. A caixa e fixa e a altura de cada logo e
 * calibrada para que as quatro pesem o mesmo aos olhos.
 */
const ALTURA_LOGO: Record<string, string> = {
  MetLife: 'max-h-3',
  Prudential: 'max-h-6',
}
const ALTURA_LOGO_PADRAO = 'max-h-5'

const entrada = {
  oculto: { opacity: 0, y: 12 },
  visivel: (indice: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: indice * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

export function Resultado({
  resultado,
  dados,
  aoRecalcular,
}: {
  resultado: TipoResultado
  dados: DadosFormulario | null
  aoRecalcular?: (resultado: TipoResultado, dados: DadosFormulario) => void
}) {
  const [gerando, setGerando] = useState(false)
  const [erroPdf, setErroPdf] = useState('')
  const [visao, setVisao] = useState<Visao>('nominal')
  const [taxa, setTaxa] = useState(dados?.taxaIpca ?? TAXA_INICIAL)
  const [recalculando, iniciarRecalculo] = useTransition()

  /*
   * Trocar a taxa refaz a conta no servidor, onde a tabela de tarifas vive.
   * Espera meio segundo depois da ultima tecla: sem isso, digitar "12" dispara
   * uma cotacao para "1" e outra para "12", e a primeira pode chegar depois.
   */
  useEffect(() => {
    if (!dados || !aoRecalcular) return
    if (taxa === dados.taxaIpca) return
    if (taxaDePercentual(taxa) === null) return
    const relogio = setTimeout(() => {
      iniciarRecalculo(async () => {
        const atualizado = { ...dados, taxaIpca: taxa }
        aoRecalcular(
          await cotarComparativo({
            sexo: dados.sexo,
            idade: dados.idade,
            capital: dados.capital,
            taxaIpca: taxa,
          }),
          atualizado,
        )
      })
    }, 500)
    return () => clearTimeout(relogio)
  }, [taxa, dados, aoRecalcular])
  const router = useRouter()
  const nome = dados?.nome ?? ''
  if (!resultado.ok) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-cofre-perigo/40 bg-cofre-perigo/10 p-6 text-sm"
      >
        <div className="flex items-center gap-2 text-cofre-perigo font-semibold mb-1">
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
          Não foi possível simular
        </div>
        <p className="text-cofre-suave">{resultado.erro}</p>
      </div>
    )
  }

  const { todos, indisponiveis, taxaIpca } = resultado
  const projetada = visao === 'ipca'

  /*
   * As duas visoes chegaram juntas do servidor, entao alternar e so trocar de
   * lista — sem espera e sem nova ida ao servidor no meio de uma reuniao.
   */
  const comparativo = projetada ? resultado.projetado : resultado.comparativo
  const valorPreservado = projetada
    ? resultado.valorPreservadoProjetado
    : resultado.valorPreservado

  const algumEstimado = comparativo.some((l) => l.estimada)
  const algumAbaixo = comparativo.some((l) => l.resgateAbaixoDoAportado)

  // Uma unica fonte para a tabela do desktop e a lista do telefone: sao duas
  // apresentacoes do mesmo quadro, e nao podem divergir quando um criterio mudar.
  const criterios = [
    {
      // O aporte anual e sempre o do primeiro ano: e o valor contratado hoje,
      // e o que muda com a correcao e o acumulado, nao a primeira parcela.
      titulo: projetada ? 'Aporte anual (1º ano)' : 'Aporte anual',
      valores: comparativo.map((l) => l.aporteAnual),
    },
    { titulo: 'Acumulado em 10 anos', valores: comparativo.map((l) => l.aporteAcumulado10a) },
    { titulo: 'Custo vs capital segurado', valores: comparativo.map((l) => l.custoSobreCapital) },
    { titulo: 'Resgate no 10º ano', valores: comparativo.map((l) => l.resgate10a) },
    {
      titulo: 'Break-even real',
      valores: comparativo.map((l) =>
        l.breakevenReal === null ? 'não atinge' : `${l.breakevenReal}º ano`,
      ),
    },
  ]

  async function emitirPdf() {
    if (!dados || gerando) return
    setGerando(true)
    setErroPdf('')
    try {
      const resposta = await fetch('/api/comparativo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // O documento sai na visao que esta na tela: o corretor imprime o que
        // acabou de mostrar ao cliente, e nao uma terceira versao.
        body: JSON.stringify({ ...dados, visao }),
      })
      // A sessao dura oito horas e pode vencer com a tela aberta. Mostrar
      // "sessao expirada" ao lado de um resultado que continua na tela deixaria
      // o corretor sem saber o que fazer; levar para o login resolve.
      if (resposta.status === 401) {
        router.replace('/login')
        router.refresh()
        return
      }
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}))
        setErroPdf(corpo.erro ?? 'Não foi possível gerar o documento.')
        return
      }
      // O PDF vem como binario; o download e disparado por um link temporario.
      const blob = await resposta.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Comparativo-WholeLife-${nome.replace(/[^\p{L}\p{N}]+/gu, '-')}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setErroPdf('Falha de conexão ao gerar o documento. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header do Estudo com Botão de Ação */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-cofre-borda/60 pb-3.5">
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-cofre-suave">
            Resultado Comparativo
          </span>
          {/* Uma linha so: com o nome quebrando, o titulo empurrava o botao de
              exportar para baixo e o cabecalho do estudo mudava de altura a cada
              cliente. O `title` guarda o nome inteiro quando ele nao couber. */}
          <h2
            className="truncate text-lg font-bold text-cofre-texto"
            title={nome || undefined}
          >
            {nome ? `Estudo para ${nome}` : 'Ranking por aporte anual'}
          </h2>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={emitirPdf}
            disabled={!dados || gerando}
            /* O hover so amplia. Antes ele trocava fundo e texto de cor, e o
               botao mudava de identidade a cada passagem do mouse. */
            className="realce-hover inline-flex shrink-0 items-center gap-2 rounded-md border border-cofre-acento/50 bg-cofre-acento/10 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-cofre-acento shadow-sm disabled:opacity-40"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            {gerando ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {erroPdf && (
        <p role="alert" className="rounded-md border border-cofre-perigo/40 bg-cofre-perigo/10 px-3 py-2 text-xs text-cofre-perigo">
          {erroPdf}
        </p>
      )}

      {/*
       * Interruptor de correcao pelo IPCA.
       *
       * `role="switch"` e nao dois botoes: e uma chave de liga e desliga, e quem
       * navega por teclado precisa ouvir isso. A ressalva ao lado nao e enfeite
       * — sem ela o cliente le "R$ 891 mil de resgate" sem saber que e moeda de
       * dez anos a frente.
       */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          role="switch"
          aria-checked={projetada}
          onClick={() => setVisao(projetada ? 'nominal' : 'ipca')}
          className="inline-flex shrink-0 items-center gap-3 rounded-lg border border-cofre-borda bg-cofre-placa px-3.5 py-2 text-left transition-colors hover:border-cofre-borda/70"
        >
          <span
            aria-hidden
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
              projetada ? 'bg-cofre-acento' : 'bg-cofre-borda'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-cofre-texto shadow transition-transform duration-200 ${
                projetada ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </span>
          <span className="text-xs font-semibold text-cofre-texto">Corrigir por IPCA</span>
        </button>

        {/*
         * A taxa so existe quando o interruptor esta ligado: desligada ela nao
         * governa nada, e um campo sem efeito ao lado de uma chave desligada e
         * convite a duvida sobre o que a tela esta mostrando.
         */}
        {projetada && (
          <div className="flex items-center gap-2">
            <label htmlFor="ipca" className="text-xs text-cofre-suave">
              Taxa
            </label>
            <div className="relative">
              <input
                id="ipca"
                type="text"
                inputMode="decimal"
                maxLength={5}
                value={taxa}
                onChange={(e) => setTaxa(e.target.value)}
                aria-invalid={taxaDePercentual(taxa) === null}
                className="w-24 rounded-md border border-cofre-borda bg-[#061224] py-1.5 pl-2.5 pr-12 text-xs text-cofre-texto shadow-inner outline-none focus:border-cofre-acento focus:ring-1 focus:ring-cofre-acento/40"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-cofre-suave">
                % a.a.
              </span>
            </div>
            {recalculando && <span className="text-xs text-cofre-suave">recalculando…</span>}
            {taxaDePercentual(taxa) === null && (
              <span className="text-xs text-cofre-perigo">0 a 20%</span>
            )}
          </div>
        )}

        <p className="text-xs leading-relaxed text-cofre-suave sm:ml-auto sm:max-w-xs sm:text-right">
          {projetada
            ? `Valores em moeda futura a ${taxaIpca} a.a., não em poder de compra de hoje. Corrigir aporte, resgate e capital pelo mesmo índice não altera o ranking.`
            : 'Valores do estudo oficial de cada seguradora, sem projeção de inflação.'}
        </p>
      </div>

      {/* Cards de Ranking com Backlight no 1º lugar */}
      {/*
       * Duas colunas ja no telefone. Empilhados, os quatro cards consumiam uma
       * tela inteira de rolagem so para responder "quem e mais barato" — que e a
       * primeira pergunta do corretor. Lado a lado, a comparacao acontece sem
       * rolar.
       */}
      <div className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-4">
        {comparativo.map((linha, indice) => {
          const ehPrimeiro = indice === 0
          return (
            <motion.article
              key={linha.produtoId}
              custom={indice}
              initial="oculto"
              animate="visivel"
              variants={entrada}
              whileHover={{ scale: 1.05 }}
              className={`relative overflow-hidden rounded-xl border p-4.5 transition-colors ${
                ehPrimeiro
                  ? 'border-cofre-acento bg-gradient-to-b from-cofre-placa-clara to-cofre-placa shadow-[0_4px_30px_-4px_rgba(212,162,78,0.3)]'
                  : 'border-cofre-borda bg-gradient-to-b from-cofre-placa to-[#08152B] hover:border-cofre-borda/80'
              }`}
            >
              {ehPrimeiro && (
                <>
                  <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-cofre-acento to-transparent" />
                  <div className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-cofre-acento/10 blur-xl" />
                </>
              )}
              {/*
               * A posicao e o selo ficam em linhas separadas de proposito.
               * Juntos, "1º • Recomendada" ocupava 117px de um card de 165px e
               * empurrava a logo para fora do overflow-hidden — a marca da
               * seguradora recomendada aparecia cortada, justo no card de maior
               * destaque. Separados, o layout aguenta qualquer largura.
               */}
              <div className="mb-2 flex items-start justify-between gap-2">
                <span
                  className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                    ehPrimeiro
                      ? 'bg-cofre-acento/20 text-cofre-acento'
                      : 'bg-cofre-fundo text-cofre-suave'
                  }`}
                >
                  {indice + 1}º
                </span>
                <span className="flex h-9 w-[76px] shrink-0 items-center justify-center rounded-md bg-white/95 px-2 shadow-sm">
                  <Image
                    src={linha.logo}
                    alt={linha.seguradora}
                    width={160}
                    height={56}
                    className={`w-auto max-w-full object-contain ${
                      ALTURA_LOGO[linha.seguradora] ?? ALTURA_LOGO_PADRAO
                    }`}
                  />
                </span>
              </div>
              {ehPrimeiro && (
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-cofre-acento">
                  Recomendada
                </p>
              )}
              {/* O valor nunca parte: "R$ 57.248,94" quebrado em duas linhas se
                  le como dois numeros. Em duas colunas no telefone o corpo cede
                  um passo para o numero caber inteiro. */}
              <p className="whitespace-nowrap text-lg font-bold tracking-tight text-cofre-texto sm:text-xl">
                <ValorAnimado texto={linha.aporteAnual} />
              </p>
              <p className="mt-1 text-xs text-cofre-suave font-medium">
                {linha.aporteMensal} <span className="text-xs opacity-75">/ mês</span>
              </p>
            </motion.article>
          )
        })}
      </div>

      {/*
       * No telefone a tabela vira uma lista por criterio.
       * Com cinco colunas em 360px sobrava espaco para uma seguradora e meia:
       * comparar exigia rolar de lado a cada linha e guardar o numero anterior
       * de cabeca — que e justamente o trabalho que este quadro deveria poupar.
       * Um criterio por bloco mostra as quatro lado a lado sem rolagem lateral.
       */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="space-y-2.5 md:hidden"
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-cofre-acento">
          Quadro Comparativo de Métricas
        </h3>
        {criterios.map((criterio) => (
          <div
            key={criterio.titulo}
            className="overflow-hidden rounded-xl border border-cofre-borda bg-cofre-placa"
          >
            <p className="border-b border-cofre-borda/70 bg-cofre-placa-clara px-3.5 py-2 text-xs font-semibold text-cofre-suave">
              {criterio.titulo}
            </p>
            <dl className="divide-y divide-cofre-borda/50">
              {comparativo.map((linha, indice) => (
                <div key={linha.produtoId} className="flex items-center justify-between px-3.5 py-2.5">
                  <dt
                    className={`text-sm ${
                      indice === 0 ? 'font-semibold text-cofre-acento' : 'text-cofre-texto'
                    }`}
                  >
                    {linha.seguradora}
                    {indice === 0 && <span className="ml-1.5 text-xs">• recomendada</span>}
                  </dt>
                  <dd
                    className={`whitespace-nowrap tabular-nums ${
                      criterio.valores[indice] === 'não atinge'
                        ? 'font-semibold text-cofre-alerta'
                        : indice === 0
                          ? 'font-bold text-cofre-texto'
                          : 'font-medium text-cofre-texto'
                    }`}
                  >
                    {criterio.valores[indice]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </motion.div>

      {/* Tabela Comparativa Detalhada com Coluna Fixa */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="hidden overflow-hidden rounded-xl border border-cofre-borda bg-cofre-placa shadow-2xl md:block"
      >
        <div className="border-b border-cofre-borda bg-cofre-placa-clara px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cofre-texto">
            Quadro Comparativo de Métricas
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-cofre-borda/80 text-left text-xs uppercase tracking-wider text-cofre-suave">
                <th className="sticky left-0 z-10 bg-cofre-placa-clara px-4 py-3.5 font-semibold shadow-[2px_0_8px_rgba(0,0,0,0.3)]">
                  Critério
                </th>
                {comparativo.map((l, idx) => (
                  <th
                    key={l.produtoId}
                    className={`px-4 py-3.5 font-bold normal-case tracking-normal ${
                      idx === 0 ? 'text-cofre-acento' : 'text-cofre-texto'
                    }`}
                  >
                    {l.seguradora}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cofre-borda/50">
              {criterios.map((criterio) => (
                <Linha
                  key={criterio.titulo}
                  titulo={criterio.titulo}
                  valores={criterio.valores}
                />
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Destaque de Valor Preservado com Backlight Nobre */}
      {comparativo.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="relative overflow-hidden rounded-xl border border-cofre-acento/40 bg-gradient-to-r from-[#0C1F3F] via-[#122A54] to-[#0C1F3F] p-6 shadow-[0_8px_32px_-8px_rgba(212,162,78,0.25)]"
        >
          {/* Backlight sutil no centro do banner */}
          <div className="pointer-events-none absolute right-1/4 top-0 h-32 w-48 rounded-full bg-cofre-acento/15 blur-3xl" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-screen"
            style={{
              backgroundImage: 'url(/marcas/textura-cabecalho.png)',
              backgroundSize: '240px',
            }}
          />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cofre-suave">
                Diferença total de aporte em 10 anos
              </p>
              <p className="mt-1 text-xs text-cofre-suave/90">
                Economia acumulada da melhor opção frente à alternativa de maior custo:
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs uppercase tracking-wider text-cofre-suave font-semibold">
                Valor Preservado
              </p>
              <p className="text-3xl font-extrabold tracking-tight text-cofre-acento drop-shadow-sm">
                <ValorAnimado texto={valorPreservado} duracao={900} />
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Alertas do Corretor */}
      {(algumAbaixo || algumEstimado || indisponiveis.length > 0) && (
        <div className="space-y-2 rounded-xl border border-cofre-alerta/35 bg-cofre-alerta/10 p-4.5 text-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cofre-alerta">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            Observações Técnicas para o Assessor
          </div>
          {algumAbaixo && (
            <p className="text-xs text-cofre-suave leading-relaxed">
              • Em uma ou mais seguradoras o resgate no 10º ano não alcança o total aportado. O documento apresenta o 10º ano como referência comercial de quitação.
            </p>
          )}
          {algumEstimado && (
            <p className="text-xs text-cofre-suave leading-relaxed">
              • Uma das tarifas foi estimada por interpolação matemática, não provinda de estudo oficial arquivado.
            </p>
          )}
          {indisponiveis.map((i) => (
            <p key={i.produtoId} className="text-xs text-cofre-suave leading-relaxed">
              • {i.motivo}
            </p>
          ))}
        </div>
      )}

      {/* Lista completa de produtos cotados */}
      <details className="group rounded-xl border border-cofre-borda bg-cofre-placa p-4 transition-all">
        <summary className="-my-1.5 flex cursor-pointer items-center justify-between py-1.5 text-xs font-semibold uppercase tracking-wider text-cofre-suave hover:text-cofre-texto">
          <span>
            {todos.length === 1
              ? 'Ver o único produto cotado'
              : `Ver todos os ${todos.length} produtos cotados (incluindo sucessórios)`}
          </span>
          <span className="text-xs transition-transform group-open:rotate-180">▼</span>
        </summary>
        <ul className="mt-3.5 space-y-2 text-sm divide-y divide-cofre-borda/40">
          {todos.map((p) => (
            <li
              key={p.produtoId}
              className="flex items-center justify-between gap-4 pt-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-cofre-texto">{p.seguradora}</span>
                <span className="text-xs text-cofre-suave">— {p.nome}</span>
                {p.estimada && (
                  <span className="rounded bg-cofre-alerta/15 px-1.5 py-0.5 text-xs text-cofre-alerta font-medium">
                    estimada
                  </span>
                )}
              </div>
              <span className="whitespace-nowrap font-bold text-cofre-texto tabular-nums">
                {p.aporteAnual}
              </span>
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
      <th scope="row" className="sticky left-0 z-10 bg-cofre-placa px-4 py-3.5 text-left font-medium text-cofre-suave shadow-[2px_0_8px_rgba(0,0,0,0.3)]">
        {titulo}
      </th>
      {valores.map((valor, indice) => (
        <td
          key={indice}
          className={`whitespace-nowrap px-4 py-3.5 tabular-nums ${
            valor === 'não atinge'
              ? 'font-semibold text-cofre-alerta'
              : indice === 0
                ? 'font-bold text-cofre-texto'
                : 'font-medium text-cofre-texto'
          }`}
        >
          {valor}
        </td>
      ))}
    </tr>
  )
}
