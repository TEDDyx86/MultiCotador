import { Cabecalho } from './componentes/Cabecalho'
import { Painel } from './componentes/Painel'
import { obterUsuarioAtual } from '@/lib/supabase/servidor'

export default async function Pagina() {
  const usuario = await obterUsuarioAtual()

  return (
    <>
      <Cabecalho usuarioEmail={usuario?.email} />
      {/* py-5 e nao py-8: sao 24px de respiro que decidiam se a tela rola ou
          nao num MacBook Air, e a moldura ja e generosa sem eles. */}
      <main className="mx-auto w-full max-w-6xl px-6 pt-5 pb-4">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
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
