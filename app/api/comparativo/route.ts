import { NextResponse } from 'next/server'
import Decimal from 'decimal.js'
import { montarComparativo } from '@/lib/motor/comparativo'
import { projetarPorIpca } from '@/lib/motor/projecao'
import { IPCA_PADRAO, taxaDePercentual } from '@/lib/dominio/indexacao'
import { repositorioJson } from '@/lib/repositorio/repositorioJson'
import { moeda, percentual } from '@/lib/formato'
import { montarHtml } from '@/lib/pdf/template'
import { gerarPdf } from '@/lib/pdf/navegador'
import type { Modalidade, Sexo } from '@/lib/dominio/tipos'

// Puppeteer e o acesso ao filesystem (fontes e logos) exigem Node.
export const runtime = 'nodejs'
// Gerar o PDF leva alguns segundos, e o cold start do Chromium soma a isso.
export const maxDuration = 60

interface Corpo {
  nome?: unknown
  sexo?: unknown
  idade?: unknown
  capital?: unknown
  visao?: unknown
  taxaIpca?: unknown
  modalidade?: unknown
}

function texto(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : undefined
}

export async function POST(requisicao: Request) {
  let corpo: Corpo
  try {
    corpo = await requisicao.json()
  } catch {
    return NextResponse.json({ erro: 'Requisicao invalida.' }, { status: 400 })
  }

  const nome = texto(corpo.nome)
  const sexo = corpo.sexo === 'M' || corpo.sexo === 'F' ? (corpo.sexo as Sexo) : null
  const idade = typeof corpo.idade === 'number' && Number.isInteger(corpo.idade) ? corpo.idade : null

  if (!nome || !sexo || idade === null) {
    return NextResponse.json({ erro: 'Informe nome, sexo e data de nascimento.' }, { status: 400 })
  }

  let capital: Decimal
  try {
    capital = new Decimal(String(corpo.capital))
  } catch {
    return NextResponse.json({ erro: 'Capital segurado invalido.' }, { status: 400 })
  }
  if (!capital.isFinite() || capital.lessThanOrEqualTo(0)) {
    return NextResponse.json({ erro: 'O capital segurado deve ser maior que zero.' }, { status: 400 })
  }

  /*
   * A modalidade e revalidada aqui pelo mesmo motivo da visao: nada garante que
   * a chamada partiu da tela. Qualquer coisa fora de "sem-resgate" cai na
   * modalidade principal, que e a que o documento sempre soube imprimir.
   */
  const modalidade: Modalidade =
    corpo.modalidade === 'sem-resgate' ? 'sem-resgate' : 'com-resgate'

  const comparativo = montarComparativo(repositorioJson, sexo, idade, capital, modalidade)
  if (comparativo.linhas.length === 0) {
    return NextResponse.json(
      { erro: `Nenhuma seguradora cota aos ${idade} anos com esse capital.` },
      { status: 422 },
    )
  }

  // Mesmo piso da tela: um aporte que arredonda para R$ 0,00 viraria um seguro
  // de graca impresso num documento assinado. A rota valida por conta propria
  // porque nada garante que a chamada veio da tela.
  if (comparativo.linhas.every((l) => l.aporteAnual.lessThan(1))) {
    return NextResponse.json(
      { erro: 'Capital baixo demais para gerar o comparativo.' },
      { status: 422 },
    )
  }

  /*
   * A visao vem da tela, mas e revalidada aqui: nada garante que a chamada
   * partiu dali, e um documento assinado nao pode sair numa moeda que ninguem
   * escolheu. Qualquer coisa fora de "ipca" cai no nominal.
   */
  const projetada = corpo.visao === 'ipca'
  const taxa =
    (typeof corpo.taxaIpca === 'string' ? taxaDePercentual(corpo.taxaIpca) : null) ?? IPCA_PADRAO
  const escolhido = projetada ? projetarPorIpca(comparativo, taxa) : comparativo

  const html = montarHtml({
    nome,
    idade,
    sexo,
    capitalFormatado: moeda(capital),
    valorPreservado: moeda(escolhido.valorPreservado),
    projetada,
    modalidade,
    taxaIpca: percentual(taxa.times(100)),
    comparativo: escolhido.linhas.map((l) => ({
      produtoId: l.produtoId,
      seguradora: l.seguradora,
      logo: l.logo,
      aporteAnual: moeda(l.aporteAnual),
      aporteMensal: moeda(l.aporteAnual.dividedBy(12)),
      aporteAcumulado10a: moeda(l.aporteAcumulado10a),
      custoSobreCapital: percentual(l.custoSobreCapital),
      breakevenDocumento: l.breakevenDocumento,
      breakevenReal: l.breakevenReal,
      resgate10a: moeda(l.resgate10a),
      // Sem reserva o resgate e zero, e zero e menor que qualquer aporte: a
      // comparacao daria "abaixo do aportado" para todo produto da modalidade.
      resgateAbaixoDoAportado:
        modalidade === 'com-resgate' && l.resgate10a.lessThan(l.aporteAcumulado10a),
      estimada: l.fonteTarifa === 'ESTIMADO',
    })),
  })

  let pdf: Uint8Array
  try {
    pdf = await gerarPdf(html)
  } catch (erro) {
    /*
     * O log carrega a causa real; a resposta ao cliente nao. Stack trace na tela
     * expoe caminhos do servidor sem ajudar o corretor.
     *
     * A mensagem curta identifica as duas falhas que so acontecem em producao e
     * antes chegavam como "tente novamente", sem pista nenhuma: navegador que
     * nao abre (binario ausente do bundle) e arquivo que nao existe no
     * filesystem da funcao.
     */
    const causa = erro instanceof Error ? erro.message : String(erro)
    console.error('[comparativo] falha ao gerar o PDF:', causa, erro)

    const naoAbriuNavegador = /Failed to launch|executablePath|spawn|ENOENT.*chromium/i.test(causa)
    const arquivoAusente = /ENOENT/i.test(causa)

    return NextResponse.json(
      {
        erro: naoAbriuNavegador
          ? 'O gerador de documentos não iniciou no servidor. Avise o suporte técnico.'
          : arquivoAusente
            ? 'Um recurso do documento não foi encontrado no servidor. Avise o suporte técnico.'
            : 'Não foi possível gerar o documento. Tente novamente.',
      },
      { status: 500 },
    )
  }

  const arquivo = `Comparativo-WholeLife-${nome.replace(/[^\p{L}\p{N}]+/gu, '-')}.pdf`

  return new NextResponse(pdf as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${arquivo}"`,
      'Cache-Control': 'no-store',
    },
  })
}
