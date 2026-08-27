import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { montarComparativo } from '@/lib/motor/comparativo'
import { projetarPorIpca } from '@/lib/motor/projecao'
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
    expect(html).toContain('data:font/ttf;base64,')
    expect(html).toContain('data:image/png;base64,')
    expect(html).not.toMatch(/src="\/(?!\/)/)
    expect(html).not.toContain('http://')
  })

  /*
   * O Chromium nao embute contornos CFF: entregue um OTF, ele converte a fonte
   * em Type3, um formato de glifos procedurais com metricas proprias — negrito
   * e regular deixavam de assentar na mesma altura dentro da linha da tabela.
   * Em TrueType ele embute como Type0, que e o que o modelo usa.
   */
  it('usa as fontes em TrueType, e nao em OpenType', () => {
    expect(html).toContain("format('truetype')")
    expect(html).not.toContain("format('opentype')")
    expect(html).not.toContain('data:font/otf')
  })

  it('define a pagina como A4 sem margem', () => {
    expect(html).toContain('@page { size: A4; margin: 0; }')
  })

  it('mantem as cores exatas extraidas do modelo', () => {
    for (const cor of ['#002060', '#0092FF', '#E6F2FF', '#000C38', '#00FFFF']) {
      expect(html).toContain(cor)
    }
  })

  /*
   * A faixa e uma superficie so. O cartao branco que existia aqui produzia dois
   * defeitos ao mesmo tempo: paragrafo em tinta preta onde o modelo pede branco,
   * e o gradiente coberto deixando uma tira azul solta na margem.
   */
  it('desenha a faixa de valor preservado como gradiente horizontal', () => {
    // Nove paradas amostradas do modelo: a curva dele nao e linear, e com duas
    // paradas so as pontas batiam enquanto o miolo saia claro demais.
    expect(html).toContain('linear-gradient(90deg,#000C38 0%,')
    expect(html).toContain('#00318A 50%,')
    expect(html).toContain('#0091FE 100%)')
  })

  it('nao poe cartao branco sobre a faixa de valor preservado', () => {
    const faixa = html.slice(
      html.indexOf('.preservado {'),
      html.indexOf('.caracteristicas {'),
    )
    expect(faixa).not.toContain('background:#FFFFFF')
  })

  it('separa as seguradoras com grade vertical', () => {
    expect(html).toContain('tbody th, tbody td { border-right:.75pt solid #E5E5E5; }')
  })

  it('destaca o card recomendado com gradiente, nao com cor chapada', () => {
    expect(html).toContain('linear-gradient(180deg,#FFFFFF 0%,#E6F2FF 100%)')
  })
})

describe('documento — dados do cliente', () => {
  it('nao imprime estado civil, regime de bens nem profissao', () => {
    // Passados de proposito: mesmo que uma chamada antiga ainda os envie, eles
    // nao podem reaparecer no papel.
    const html = htmlDoCaso('F', 40, '2500000', {
      estadoCivil: 'Casado(a)',
      regimeBens: 'Comunhão parcial de bens',
      profissao: 'Empresária',
    })
    expect(html).not.toContain('Casado(a)')
    expect(html).not.toContain('Comunhão parcial de bens')
    expect(html).not.toContain('Empresária')
    expect(html).toContain('Feminino, 40 anos')
  })

  it('nao quebra o nome do cliente entre linhas', () => {
    const html = htmlDoCaso('M', 50, '1000000', {
      nome: 'Maria Fernanda de Albuquerque Nascimento',
    })
    expect(html).toContain('<b class="nome">Maria Fernanda de Albuquerque Nascimento</b>')
    expect(html).toContain('.chamada .nome { white-space:nowrap; }')
  })

  it('escapa conteudo do usuario', () => {
    const html = htmlDoCaso('M', 40, '1000000', { nome: '<script>alert(1)</script>' })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('documento — visao corrigida por IPCA', () => {
  const projetado = htmlDoCaso('M', 50, '1000000', {
    projetada: true,
    taxaIpca: '4,5%',
  })

  /*
   * O documento nao projeta por conta propria: ele recebe as linhas ja
   * transformadas. Estes numeros vem de projetarPorIpca a 4,5% e conferem na
   * HP-12C — 57.248,94 PMT, 4,5 i, 10 n, FV.
   */
  it('imprime os valores que recebeu, sem recalcular', () => {
    const linhas = montarComparativo(repo, 'M', 50, new Decimal('1000000'))
    const p = projetarPorIpca(linhas, new Decimal('0.045'))
    const html = montarHtml({
      nome: 'John Daniel',
      idade: 50,
      sexo: 'M',
      capitalFormatado: moeda(new Decimal('1000000')),
      valorPreservado: moeda(p.valorPreservado),
      projetada: true,
      taxaIpca: '4,5%',
      comparativo: p.linhas.map((l) => ({
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
    expect(html).toContain('R$ 703.486,96') // acumulado pela serie
    expect(html).toContain('R$ 891.954,45') // resgate pelo valor unico
    expect(html).toContain('45,3%') // custo, que cai porque o capital acompanha
    expect(html).toContain('R$ 57.248,94') // primeira parcela, intocada
  })

  it('diz de que ano e o aporte da primeira linha', () => {
    expect(projetado).toContain('Aporte Anual (1º ano)')
    expect(htmlDoCaso('M', 50, '1000000')).toContain('>Aporte Anual<')
  })

  /*
   * A ressalva ocupa o lugar do marcador "Valores nominais" em vez de virar uma
   * quarta observacao: a folha e calibrada linha a linha e um item novo
   * empurraria a assinatura para fora dela.
   */
  it('troca a observacao de moeda, sem acrescentar item', () => {
    expect(projetado).toContain('Valores projetados')
    expect(projetado).toContain('4,5%')
    expect(projetado).toContain('Moeda futura, não poder de compra de hoje')
    expect(projetado).not.toContain('Valores nominais')
    expect(projetado.match(/<li>/g)?.length).toBe(4)
  })

  it('mantem a observacao nominal quando a visao nao foi pedida', () => {
    const html = htmlDoCaso('M', 50, '1000000')
    expect(html).toContain('Valores nominais')
    expect(html).not.toContain('Valores projetados')
    expect(html.match(/<li>/g)?.length).toBe(4)
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
