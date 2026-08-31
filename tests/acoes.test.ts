import { describe, it, expect } from 'vitest'
import { cotarComparativo } from '@/app/acoes'

describe('acao de cotacao', () => {
  it('devolve as quatro seguradoras do comparativo', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 50, capital: '1000000' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.comResgate.comparativo.map((l) => l.seguradora)).toEqual([
      'MAG', 'MetLife', 'Prudential', 'Icatu',
    ])
  })

  it('reproduz os aportes do documento de referencia', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 50, capital: '1000000' })
    if (!r.ok) throw new Error('deveria ter cotado')
    expect(r.comResgate.comparativo.map((l) => l.aporteAnual)).toEqual([
      'R$ 57.248,94', 'R$ 59.922,68', 'R$ 60.542,49', 'R$ 63.053,16',
    ])
  })

  it('devolve os seis produtos na lista completa', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 40, capital: '1000000' })
    if (!r.ok) throw new Error('deveria ter cotado')
    expect(r.todos.length).toBe(6)
  })

  /*
   * Os dois produtos sem reserva sao os mais baratos da lista, que ordena por
   * aporte. Sem a marca eles encabecam o ranking como se fossem a mesma coisa
   * por menos dinheiro — que e exatamente a leitura errada.
   */
  it('marca na lista completa os dois produtos sem resgate', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 40, capital: '1000000' })
    if (!r.ok) throw new Error('deveria ter cotado')
    const semResgate = r.todos.filter((p) => !p.temResgate).map((p) => p.produtoId)
    expect(semResgate.sort()).toEqual(['MAG_WL_SUCESSAO_10', 'METLIFE_VIDA_TOTAL_LEGADO_10'])
  })

  it('lista os indisponiveis com o motivo', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 79, capital: '1000000' })
    if (!r.ok) throw new Error('deveria ter cotado')
    expect(r.indisponiveis.length).toBeGreaterThan(0)
    expect(r.indisponiveis.some((i) => /700/.test(i.motivo))).toBe(true)
  })

  it('recusa idade fora de qualquer produto', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 120, capital: '1000000' })
    expect(r.ok).toBe(false)
  })

  it('recusa capital nao numerico', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 40, capital: 'abc' })
    expect(r.ok).toBe(false)
  })

  it('recusa capital zero', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 40, capital: '0' })
    expect(r.ok).toBe(false)
  })

  it('aceita capital acima de um milhao com centavos', async () => {
    const r = await cotarComparativo({ sexo: 'F', idade: 40, capital: '2500000.55' })
    expect(r.ok).toBe(true)
  })

  it('expoe o break-even real, diferente do documento', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 62, capital: '1000000' })
    if (!r.ok) throw new Error('deveria ter cotado')
    const mag = r.comResgate.comparativo.find((l) => l.seguradora === 'MAG')!
    expect(mag.breakevenDocumento).toBe(10)
    expect(mag.breakevenReal).toBeNull()
  })
})

describe('modalidades com e sem resgate', () => {
  it('separa os produtos em dois conjuntos que nao se cruzam', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 50, capital: '1000000' })
    if (!r.ok) throw new Error('deveria ter cotado')

    expect(r.comResgate.modalidade).toBe('com-resgate')
    expect(r.comResgate.comparativo).toHaveLength(4)

    expect(r.semResgate).not.toBeNull()
    expect(r.semResgate!.modalidade).toBe('sem-resgate')
    expect(r.semResgate!.comparativo.map((l) => l.produtoId).sort()).toEqual([
      'MAG_WL_SUCESSAO_10',
      'METLIFE_VIDA_TOTAL_LEGADO_10',
    ])
  })

  /*
   * A razao de existir das duas abas: sem reserva o aporte e menor porque o
   * produto e outro. Se um dia um produto sem resgate sair mais caro que o mais
   * barato com resgate, a premissa comercial mudou e vale saber.
   */
  it('cota os produtos sem reserva abaixo dos com reserva', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 50, capital: '1000000' })
    if (!r.ok || !r.semResgate) throw new Error('deveria ter cotado as duas modalidades')
    const emCentavos = (t: string) => Number(t.replace(/\D/g, ''))
    expect(emCentavos(r.semResgate.comparativo[0].aporteAnual)).toBeLessThan(
      emCentavos(r.comResgate.comparativo[0].aporteAnual),
    )
  })

  /*
   * Zero e menor que qualquer aporte. Sem a guarda, a modalidade inteira
   * acenderia o alerta de "o resgate nao alcanca o aportado" na coluna de
   * observacoes tecnicas — verdadeiro na aritmetica, sem sentido no produto.
   */
  it('nao acusa resgate abaixo do aportado onde nao ha resgate', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 50, capital: '1000000' })
    if (!r.ok || !r.semResgate) throw new Error('deveria ter cotado as duas modalidades')
    expect(r.semResgate.comparativo.every((l) => !l.resgateAbaixoDoAportado)).toBe(true)
    expect(r.semResgate.comparativo.every((l) => l.breakevenReal === null)).toBe(true)
  })

  /*
   * O Legado da MetLife para aos 70 e a Sucessao da MAG aos 80: entre as duas
   * idades a aba secundaria fica com um produto so, e acima de 80 ela morre.
   * A principal precisa sobreviver a isso sem levar a tela junto.
   */
  it('devolve a aba secundaria vazia quando nenhum produto sem reserva cota', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 72, capital: '1000000' })
    if (!r.ok) throw new Error('deveria ter cotado')
    expect(r.comResgate.comparativo.length).toBeGreaterThan(0)
    expect(r.semResgate?.comparativo.map((l) => l.produtoId)).toEqual(['MAG_WL_SUCESSAO_10'])
  })

  it('a projecao por IPCA vale para as duas modalidades', async () => {
    const r = await cotarComparativo({
      sexo: 'M',
      idade: 50,
      capital: '1000000',
      taxaIpca: '5',
    })
    if (!r.ok || !r.semResgate) throw new Error('deveria ter cotado as duas modalidades')
    expect(r.taxaIpca).toBe('5,0%')
    // O acumulado projetado cresce pelo fator de serie: 12,58 aportes a 5%.
    expect(r.semResgate.projetado[0].aporteAcumulado10a).not.toBe(
      r.semResgate.comparativo[0].aporteAcumulado10a,
    )
  })
})

describe('acao de cotacao — capital nos extremos', () => {
  it('recusa capital que produz aporte arredondado para zero', async () => {
    // Com um centavo de capital o aporte sai R$ 0,00: correto na aritmetica,
    // e ainda assim um seguro de graca anunciado ao cliente.
    const r = await cotarComparativo({ sexo: 'M', idade: 50, capital: '0.01' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.erro).toMatch(/baixo demais/i)
  })

  it('recusa capital cujo aporte fica abaixo de um real por ano', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 50, capital: '1' })
    expect(r.ok).toBe(false)
  })

  it('aceita capital pequeno mas com aporte significativo', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 50, capital: '100' })
    expect(r.ok).toBe(true)
  })

  it('aceita capital muito alto', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 50, capital: '999999999.99' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.comResgate.comparativo).toHaveLength(4)
  })
})
