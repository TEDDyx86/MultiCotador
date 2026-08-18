import Image from 'next/image'

export function Cabecalho() {
  return (
    <header className="relative overflow-hidden border-b border-cofre-borda bg-gradient-to-r from-[#061224] via-[#0B1B38] to-[#061224]">
      {/* Textura monograma RT */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-screen"
        style={{
          backgroundImage: 'url(/marcas/textura-cabecalho.png)',
          backgroundSize: '280px',
        }}
      />
      {/* Filete de luz superior dourado */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cofre-acento/30 to-transparent" />

      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:py-5">
        <div className="flex items-center gap-4">
          <Image
            src="/marcas/rt-horizontal-branca.png"
            alt="Robson Tavernard"
            width={1558}
            height={400}
            priority
            className="h-7 w-auto sm:h-8"
          />
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-cofre-acento">
            Planejamento Patrimonial
          </p>
          <p className="text-xs uppercase tracking-wider text-cofre-suave">
            e Sucessório
          </p>
        </div>
      </div>
    </header>
  )
}
