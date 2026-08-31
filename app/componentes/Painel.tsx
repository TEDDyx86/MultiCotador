'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FormularioCotacao } from './FormularioCotacao'
import { Resultado } from './Resultado'
import { ApoioResultado } from './ApoioResultado'
import { cotarComparativo, type Resultado as TipoResultado } from '@/app/acoes'
import { TAXA_INICIAL, taxaDePercentual } from '@/lib/dominio/indexacao'
import type { DadosFormulario, Modalidade, Visao } from '@/lib/dominio/tipos'

export function Painel() {
  const [resultado, setResultado] = useState<TipoResultado | null>(null)
  const [dados, setDados] = useState<DadosFormulario | null>(null)
  /*
   * A visao, a taxa e a modalidade moram aqui, e nao dentro do resultado, para
   * sobreviverem a troca de resultado: o recalculo por mudanca de taxa devolve
   * um objeto novo, e um estado guardado dentro dele voltaria ao padrao a cada
   * tecla digitada.
   *
   * Ate a retirada do bloco de observacoes tecnicas, a coluna da esquerda
   * tambem dependia da visao — as ressalvas mudavam conforme o resgate
   * alcancasse ou nao o aportado na moeda escolhida. Hoje so o quadro
   * comparativo, a direita, consome as tres.
   */
  const [visao, setVisao] = useState<Visao>('nominal')
  const [modalidade, setModalidade] = useState<Modalidade>('com-resgate')
  const [taxa, setTaxa] = useState(TAXA_INICIAL)
  const [recalculando, iniciarRecalculo] = useTransition()

  /*
   * A aba escolhida so vale para o cliente que estava na tela. Sem voltar para
   * a principal, um cliente de 72 anos cotado logo depois de um de 40 cairia
   * numa aba "sem resgate" que nao existe na idade dele — o Legado da MetLife
   * para aos 70 — e a tela apresentaria o comparativo principal sob um rotulo
   * errado.
   */
  const grupo =
    resultado?.ok && modalidade === 'sem-resgate' && resultado.semResgate
      ? resultado.semResgate
      : resultado?.ok
        ? resultado.comResgate
        : null

  /*
   * Trocar a taxa refaz a conta no servidor, onde a tabela de tarifas vive.
   * Espera meio segundo depois da ultima tecla: sem isso, digitar "12" dispara
   * uma cotacao para "1" e outra para "12", e a primeira pode chegar depois.
   */
  useEffect(() => {
    if (!dados || taxa === dados.taxaIpca || taxaDePercentual(taxa) === null) return
    const relogio = setTimeout(() => {
      iniciarRecalculo(async () => {
        setResultado(
          await cotarComparativo({
            sexo: dados.sexo,
            idade: dados.idade,
            capital: dados.capital,
            taxaIpca: taxa,
          }),
        )
        setDados({ ...dados, taxaIpca: taxa })
      })
    }, 500)
    return () => clearTimeout(relogio)
  }, [taxa, dados])

  // O min-w-0 nos dois itens do grid e o que mantem a tela dentro da largura do
  // aparelho. Item de grid nasce com min-width:auto, que respeita o min-content
  // do conteudo: a largura minima da tabela comparativa inflava a coluna e
  // empurrava o formulario junto, dando 306px de rolagem lateral num telefone de
  // 360px. O overflow-x da tabela nao resolvia sozinho, porque o problema estava
  // um nivel acima — o item do grid nao conseguia encolher.
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      {/*
       * O material de apoio ao corretor desce para esta coluna, abaixo do
       * formulario: ele ocupa 489px de uma coluna tao alta quanto o resultado,
       * e o espaco vago ja existia. Sem isso a pagina rolava em qualquer tela.
       */}
      <motion.div
        className="min-w-0 space-y-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <FormularioCotacao
          aoResultado={(r, d) => {
            setResultado(r)
            setDados(d)
            setModalidade('com-resgate')
          }}
        />
        {resultado?.ok && <ApoioResultado todos={resultado.todos} />}
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
              <Resultado
                resultado={resultado}
                grupo={grupo}
                dados={dados}
                visao={visao}
                aoTrocarVisao={setVisao}
                modalidade={modalidade}
                aoTrocarModalidade={setModalidade}
                temSemResgate={resultado.ok && resultado.semResgate !== null}
                taxa={taxa}
                aoTrocarTaxa={setTaxa}
                recalculando={recalculando}
              />
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
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-cofre-borda bg-cofre-placa-clara text-cofre-suave shadow-inner">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                </div>
                {/* h2 e nao h3: este bloco ocupa o lugar do resultado, que
                    tambem abre em h2. Com h3, a leitura pulava de h1 direto
                    para h3 e o nivel sumia para quem navega por cabecalhos. */}
                <h2 className="text-base font-bold text-cofre-texto">
                  Simulação Comparativa Whole Life
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-cofre-suave">
                  Preencha os dados do cliente no formulário ao lado para calcular o ranking entre as 4 seguradoras e visualizar as métricas de quitação em 10 anos.
                </p>
                <div className="mt-5 flex items-center gap-3 text-xs text-cofre-suave/80">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cofre-suave/60" />
                    MAG
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cofre-suave/60" />
                    Icatu
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cofre-suave/60" />
                    MetLife
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cofre-suave/60" />
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
