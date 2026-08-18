import { Cabecalho } from './componentes/Cabecalho'
import { Painel } from './componentes/Painel'

export default function Pagina() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <h1 className="mb-6 text-xl font-semibold">Análise Whole Life 10 anos</h1>
        <Painel />
      </main>
    </>
  )
}
