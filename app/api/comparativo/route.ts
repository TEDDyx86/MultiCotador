import { NextResponse } from 'next/server'
import Decimal from 'decimal.js'
import { montarComparativo } from '@/lib/motor/comparativo'
import { repositorioJson } from '@/lib/repositorio/repositorioJson'
import { moeda, percentual } from '@/lib/formato'
import { montarHtml } from '@/lib/pdf/template'
import { gerarPdf } from '@/lib/pdf/navegador'
import type { Sexo } from '@/lib/dominio/tipos'

// Puppeteer e o acesso ao filesystem (fontes e logos) exigem Node.
export const runtime = 'nodejs'
// Gerar o PDF leva alguns segundos, e o cold start do Chromium soma a isso.
export const maxDuration = 60

interface Corpo {
  nome?: unknown
  sexo?: unknown
  idade?: unknown
  capital?: unknown
  estadoCivil?: unknown
  regimeBens?: unknown
  profissao?: unknown
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

  const comparativo = montarComparativo(repositorioJson, sexo, idade, capital)
  if (comparativo.linhas.length === 0) {
    return NextResponse.json(
      { erro: `Nenhuma seguradora cota aos ${idade} anos com esse capital.` },
      { status: 422 },
    )
  }

  const html = montarHtml({
    nome,
    idade,
    sexo,
    capitalFormatado: moeda(capital),
    estadoCivil: texto(corpo.estadoCivil),
    regimeBens: texto(corpo.regimeBens) ?? null,
    profissao: texto(corpo.profissao),
    valorPreservado: moeda(comparativo.valorPreservado),
    comparativo: comparativo.linhas.map((l) => ({
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
      resgateAbaixoDoAportado: l.resgate10a.lessThan(l.aporteAcumulado10a),
      estimada: l.fonteTarifa === 'ESTIMADO',
    })),
  })

  let pdf: Uint8Array
  try {
    pdf = await gerarPdf(html)
  } catch (erro) {
    console.error('[comparativo] falha ao gerar o PDF', erro)
    return NextResponse.json(
      { erro: 'Nao foi possivel gerar o documento. Tente novamente.' },
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
