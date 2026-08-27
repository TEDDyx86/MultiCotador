import { Cabecalho } from './componentes/Cabecalho'
import { Painel } from './componentes/Painel'

export default function Pagina() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-cofre-texto sm:text-2xl">
              Análise Whole Life
            </h1>
            <p className="mt-0.5 text-xs text-cofre-suave">
              Comparativo de aporte, valor de resgate e eficiência patrimonial entre seguradoras
            </p>
          </div>
          {/* "Decenal" e jargao de seguradora: o cliente le esta tela junto com
              o assessor. Duas linhas separam a vigencia do prazo de aporte, que
              sao dois fatos distintos e vinham colados por um bullet. */}
          <span className="hidden text-right text-xs font-semibold uppercase tracking-wider text-cofre-suave sm:block">
            Vigência Vitalícia
            <br />
            Aporte em 10 Anos
          </span>
        </div>
        <Painel />
      </main>
    </>
  )
}
