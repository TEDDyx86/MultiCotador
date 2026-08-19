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
          <span className="hidden text-xs font-semibold uppercase tracking-wider text-cofre-acento/80 sm:block">
            Vigência Vitalícia • Aporte Decenal
          </span>
        </div>
        <Painel />
      </main>
    </>
  )
}
