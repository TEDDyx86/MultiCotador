import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import {
  moeda,
  moedaCurta,
  percentual,
  dataExtenso,
  moedaParaNumero,
  numeroParaMascara,
} from '@/lib/formato'

describe('moeda', () => {
  it('formata em reais com separador de milhar', () => {
    expect(moeda(new Decimal('57248.94'))).toBe('R$ 57.248,94')
  })

  it('mantem duas casas em valores redondos', () => {
    expect(moeda(new Decimal('1000000'))).toBe('R$ 1.000.000,00')
  })

  it('formata zero', () => {
    expect(moeda(new Decimal('0'))).toBe('R$ 0,00')
  })
})

describe('moedaCurta', () => {
  it('abrevia milhoes', () => {
    expect(moedaCurta(new Decimal('1000000'))).toBe('R$ 1,0 mi')
    expect(moedaCurta(new Decimal('2500000'))).toBe('R$ 2,5 mi')
  })

  it('abrevia milhares', () => {
    expect(moedaCurta(new Decimal('700000'))).toBe('R$ 700 mil')
  })

  it('mantem valores pequenos por extenso', () => {
    expect(moedaCurta(new Decimal('850'))).toBe('R$ 850,00')
  })
})

describe('percentual', () => {
  it('usa virgula decimal', () => {
    expect(percentual(new Decimal('57.2'))).toBe('57,2%')
  })
})

describe('dataExtenso', () => {
  it('escreve a data por extenso em portugues', () => {
    expect(dataExtenso(new Date(2026, 7, 18))).toBe('18 de agosto de 2026')
  })
})

describe('entrada de moeda', () => {
  it('extrai o numero de um texto formatado', () => {
    expect(moedaParaNumero('R$ 1.000.000,00')).toBe('1000000.00')
    expect(moedaParaNumero('2.500.000,55')).toBe('2500000.55')
  })

  it('devolve string vazia quando nao ha digito', () => {
    expect(moedaParaNumero('R$ ')).toBe('')
    expect(moedaParaNumero('abc')).toBe('')
  })

  it('monta a mascara a partir dos digitos', () => {
    // O usuario digita so numeros; os centavos entram da direita para a esquerda
    expect(numeroParaMascara('100000000')).toBe('1.000.000,00')
    expect(numeroParaMascara('5')).toBe('0,05')
    expect(numeroParaMascara('')).toBe('')
  })
})
