import Image from 'next/image'

export function Cabecalho() {
  return (
    <header className="relative overflow-hidden border-b border-cofre-borda bg-cofre-placa">
      {/* Textura de aco, discreta: da peso de metal sem competir com o conteudo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'url(/marcas/textura-cabecalho.png)',
          backgroundSize: '360px',
        }}
      />
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Image
          src="/marcas/rt-horizontal-branca.png"
          alt="Robson Tavernard"
          width={1558}
          height={400}
          priority
          className="h-8 w-auto"
        />
        <p className="hidden text-right text-xs uppercase tracking-[0.18em] text-cofre-suave sm:block">
          Planejamento patrimonial
          <br />e sucessório
        </p>
      </div>
    </header>
  )
}
