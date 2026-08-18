import type { Produto, Resgate, Sexo, Tarifa } from '@/lib/dominio/tipos'

export interface Repositorio {
  produtos(): Produto[]
  produto(id: string): Produto | undefined
  tarifa(produtoId: string, sexo: Sexo, idade: number): Tarifa | undefined
  resgate(produtoId: string, sexo: Sexo, idadeEntrada: number): Resgate | undefined
}
