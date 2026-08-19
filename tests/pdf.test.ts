import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { montarComparativo } from '@/lib/motor/comparativo'
import { repositorioJson as repo } from '@/lib/repositorio/repositorioJson'
import { moeda, percentual } from '@/lib/formato'
import { montarHtml } from '@/lib/pdf/template'

/**
 * Testa o HTML do documento, nao o PDF renderizado: abrir o Chromium levaria
 * segundos por caso e nao acrescentaria garantia sobre o conteudo. O que importa
 * aqui e que os numeros certos chegam ao papel — o layout foi conferido contra o
 * PDF de referencia medindo a grade dos dois.
 */
function htmlDoCaso(sexo: 'M' | 'F', idade: number, capital: string, extras = {}) {
  const valor = new Decimal(capital)
  const comp = montarComparativo(repo, sexo, idade, valor)
  return montarHtml({
    nome: 'John Daniel',
    idade,
    sexo,
    capitalFormatado: moeda(valor),
    valorPreservado: moeda(comp.valorPreservado),
    ...extras,
    comparativo: comp.linhas.map((l) => ({
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
}

describe('documento — caso de referencia John Daniel', () => {
  const html = htmlDoCaso('M', 50, '1000000')

  it('traz os quatro aportes anuais do estudo original', () => {
    for (const valor of ['R$ 57.248,94', 'R$ 59.922,68', 'R$ 60.542,49', 'R$ 63.053,16']) {
      expect(html).toContain(valor)
    }
  })

  it('traz os aportes acumulados', () => {
    for (const valor of ['R$ 572.489,40', 'R$ 599.226,80', 'R$ 605.424,90', 'R$ 630.531,60']) {
      expect(html).toContain(valor)
    }
  })

  it('traz os valores de resgate no decimo ano', () => {
    for (const valor of ['R$ 574.354,16', 'R$ 606.160,60', 'R$ 613.200,00', 'R$ 630.531,65']) {
      expect(html).toContain(valor)
    }
  })

  it('traz o valor preservado', () => {
    expect(html).toContain('R$ 58.042,20')
  })

  it('traz o custo sobre o capital', () => {
    for (const pct of ['57,2%', '59,9%', '60,5%', '63,1%']) {
      expect(html).toContain(pct)
    }
  })

  it('apresenta o decimo ano como break-even, como o modelo', () => {
    expect(html.match(/10º ano/g)?.length).toBe(4)
  })

  it('identifica o cliente e o perfil', () => {
    expect(html).toContain('John Daniel')
    expect(html).toContain('Masculino, 50 anos')
  })

  it('calcula a diferenca para a recomendada como no modelo', () => {
    expect(html).toContain('+ R$ 2.673,74 (+4,7%)')
    expect(html).toContain('+ R$ 5.804,22 (+10,1%)')
  })
})

describe('documento — estrutura', () => {
  const html = htmlDoCaso('M', 50, '1000000')

  it('embute fontes e logos, sem depender da rede', () => {
    // A pagina e injetada por setContent e nao tem origem: qualquer referencia
    // externa viria quebrada no PDF.
    expect(html).toContain('data:font/otf;base64,')
    expect(html).toContain('data:image/png;base64,')
    expect(html).not.toMatch(/src="\/(?!\/)/)
    expect(html).not.toContain('http://')
  })

  it('define a pagina como A4 sem margem', () => {
    expect(html).toContain('@page { size: A4; margin: 0; }')
  })

  it('mantem as cores exatas extraidas do modelo', () => {
    for (const cor of ['#002060', '#0092FF', '#E6F2FF']) {
      expect(html).toContain(cor)
    }
  })
})

describe('documento — dados do cliente', () => {
  it('inclui estado civil, regime de bens e profissao quando informados', () => {
    const html = htmlDoCaso('F', 40, '2500000', {
      estadoCivil: 'Casado(a)',
      regimeBens: 'Comunhão parcial de bens',
      profissao: 'Empresária',
    })
    expect(html).toContain('Casado(a) • Comunhão parcial de bens • Empresária')
    expect(html).toContain('Feminino, 40 anos')
  })

  it('omite a linha de contexto quando nada foi informado', () => {
    const html = htmlDoCaso('M', 40, '1000000')
    expect(html).not.toContain('Casado(a)')
  })

  it('escapa conteudo do usuario', () => {
    const html = htmlDoCaso('M', 40, '1000000', { nome: '<script>alert(1)</script>' })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('documento — capital variavel', () => {
  it('reflete o capital escolhido em todo o texto', () => {
    const html = htmlDoCaso('M', 50, '2500000')
    expect(html).toContain('R$ 2.500.000,00')
    // O bloco de metodologia tambem cita o capital; nao pode ficar fixo em 1 milhao
    expect(html).not.toContain('capital segurado de R$ 1.000.000,00 aplicado')
  })
})
