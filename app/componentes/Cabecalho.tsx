import Image from 'next/image'
import { BotaoSair } from './BotaoSair'
import { BotaoFeedback } from './BotaoFeedback'

interface CabecalhoProps {
  usuarioEmail?: string | null
}

export function Cabecalho({ usuarioEmail }: CabecalhoProps) {
  return (
    <header className="relative overflow-hidden border-b border-cofre-borda bg-gradient-to-r from-[#061224] via-[#0B1B38] to-[#061224]">
      {/*
       * Textura de monograma RT.
       *
       * Ladrilhada de ponta a ponta, ela emoldurava a propria logo: o monograma
       * aparecia repetido bem atras da marca, e o topo inteiro virava padrao. A
       * mascara segura a textura ate a metade e so a revela em direcao a borda
       * direita, onde ela funciona como acabamento — a logo, a esquerda, volta a
       * ficar sozinha no seu campo.
       *
       * A parada em 50% e o ponto onde a textura ainda esta totalmente
       * transparente, entao o lado da logo fica limpo por construcao, e nao por
       * sorte de onde caiu o ladrilho.
       */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-screen"
        style={{
          backgroundImage: 'url(/marcas/textura-cabecalho.png)',
          backgroundSize: '280px',
          maskImage:
            'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.45) 72%, #000 100%)',
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.45) 72%, #000 100%)',
        }}
      />
      {/* Filete de luz superior. Neutro: o dourado fica reservado para a opcao
          recomendada e a acao principal. */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cofre-suave/25 to-transparent" />

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
        <div className="flex items-center gap-4">
          {/* A assinatura some no celular para o botao de sair nao competir com ela */}
          <div className="hidden text-right sm:block">
            {usuarioEmail ? (
              <p className="text-[11px] font-medium tracking-wide text-cofre-acento truncate max-w-[220px]">
                {usuarioEmail}
              </p>
            ) : null}
            <p className="text-xs font-semibold uppercase tracking-wider text-cofre-texto">
              Planejamento Patrimonial
            </p>
            <p className="text-xs uppercase tracking-wider text-cofre-suave">
              e Sucessório
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BotaoFeedback />
            <BotaoSair />
          </div>
        </div>
      </div>
    </header>
  )
}
