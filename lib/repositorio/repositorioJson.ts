import Decimal from 'decimal.js'
import produtosJson from '@/dados/produtos.json'
import tarifasJson from '@/dados/tarifas.json'
import resgatesJson from '@/dados/resgates.json'
import type { Produto, Resgate, Sexo, Tarifa, FonteTarifa } from '@/lib/dominio/tipos'
import type { Repositorio } from './repositorio'

const PRODUTOS = produtosJson as Produto[]

const PRODUTOS_POR_ID = new Map(PRODUTOS.map((p) => [p.id, p]))

function chave(produtoId: string, sexo: Sexo, idade: number): string {
  return `${produtoId}|${sexo}|${idade}`
}

const TARIFAS = new Map<string, Tarifa>(
  (tarifasJson as Array<Record<string, string | number | null>>).map((t) => {
    const tarifa: Tarifa = {
      produtoId: t.produtoId as string,
      sexo: t.sexo as Sexo,
      idade: t.idade as number,
      taxaAnualPor1mm: new Decimal(t.taxaAnualPor1mm as string),
      capitalMax: t.capitalMax ? new Decimal(t.capitalMax as string) : null,
      fonte: t.fonte as FonteTarifa,
    }
    return [chave(tarifa.produtoId, tarifa.sexo, tarifa.idade), tarifa]
  }),
)

const RESGATES = new Map<string, Resgate>(
  (resgatesJson as Array<Record<string, string | number | null>>).map((r) => {
    const resgate: Resgate = {
      produtoId: r.produtoId as string,
      sexo: r.sexo as Sexo,
      idadeEntrada: r.idadeEntrada as number,
      breakevenReal: (r.breakevenReal as number | null) ?? null,
      resgate10aPor1mm: new Decimal(r.resgate10aPor1mm as string),
    }
    return [chave(resgate.produtoId, resgate.sexo, resgate.idadeEntrada), resgate]
  }),
)

export const repositorioJson: Repositorio = {
  produtos: () => PRODUTOS,
  produto: (id) => PRODUTOS_POR_ID.get(id),
  tarifa: (produtoId, sexo, idade) => TARIFAS.get(chave(produtoId, sexo, idade)),
  resgate: (produtoId, sexo, idade) => RESGATES.get(chave(produtoId, sexo, idade)),
}
