import type Decimal from 'decimal.js'
import { brl } from '@/lib/dominio/regras'
import {
  ANOS_PROJECAO,
  fatorCustoSobreCapital,
  fatorSerieAportes,
  fatorValorFuturo,
} from '@/lib/dominio/indexacao'
import type { Comparativo, LinhaComparativo } from './comparativo'

/**
 * Reexpressa um comparativo nominal em moeda futura, corrigido por IPCA.
 *
 * Recebe o comparativo pronto em vez de refazer as cotacoes: a projecao e uma
 * transformacao dos numeros ja apurados, e mante-la separada do motor deixa a
 * regressao contra os 719 estudos oficiais intocada — ela continua conferindo o
 * nominal, que e o que as seguradoras assinam.
 *
 * Cada linha muda por um motivo diferente:
 *
 *  - o aporte anual fica onde esta, porque e o do primeiro ano, o valor que o
 *    cliente contrata hoje;
 *  - o acumulado usa o fator de serie, ja que os dez aportes sao corrigidos
 *    cada um a partir do proprio aniversario;
 *  - o resgate usa o fator de valor unico;
 *  - o custo sobre o capital cai, porque o capital tambem e corrigido e cresce
 *    mais rapido que a serie de aportes;
 *  - o break-even nao se move: por decisao, a linha continua sendo a do estudo
 *    oficial da seguradora. Sob correcao ele antecipa, mas dizer em que ano
 *    exige a curva de resgate ano a ano, que ainda nao esta versionada.
 */
export function projetarPorIpca(
  comparativo: Comparativo,
  taxa: Decimal,
  anos: number = ANOS_PROJECAO,
): Comparativo {
  const fatorSerie = fatorSerieAportes(taxa, anos)
  const fatorUnico = fatorValorFuturo(taxa, anos)
  const fatorCusto = fatorCustoSobreCapital(taxa, anos)

  const linhas: LinhaComparativo[] = comparativo.linhas.map((l) => ({
    ...l,
    aporteAcumulado10a: brl(l.aporteAnual.times(fatorSerie)),
    custoSobreCapital: l.custoSobreCapital.times(fatorCusto).toDecimalPlaces(1),
    resgate10a: brl(l.resgate10a.times(fatorUnico)),
  }))

  /*
   * Recalculado sobre as linhas ja projetadas, e nao escalado a partir do
   * nominal: a ordem por aporte anual nao muda com a correcao, mas derivar o
   * valor das proprias linhas mantem a conta valida caso um dia mude.
   */
  const valorPreservado =
    linhas.length > 1
      ? brl(linhas[linhas.length - 1].aporteAcumulado10a.minus(linhas[0].aporteAcumulado10a))
      : comparativo.valorPreservado

  return { ...comparativo, linhas, valorPreservado }
}
