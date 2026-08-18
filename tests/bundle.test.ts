import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function arquivos(raiz: string, extensoes: string[]): string[] {
  const encontrados: string[] = []
  function percorrer(caminho: string) {
    for (const entrada of readdirSync(caminho)) {
      const completo = join(caminho, entrada)
      if (statSync(completo).isDirectory()) percorrer(completo)
      else if (extensoes.some((e) => completo.endsWith(e))) encontrados.push(completo)
    }
  }
  percorrer(raiz)
  return encontrados
}

function componentesCliente(): string[] {
  return arquivos('app', ['.tsx', '.ts']).filter((arquivo) =>
    readFileSync(arquivo, 'utf8').includes("'use client'"),
  )
}

describe('as tabelas de tarifa ficam no servidor', () => {
  it('nenhum componente cliente importa o repositorio ou o motor', () => {
    // As tarifas sao o ativo do negocio: 722 precos extraidos de 785 estudos.
    // Um import destes num arquivo 'use client' embute os ~300 KB de
    // dados/tarifas.json no bundle, e qualquer visitante baixa a base inteira.
    const vazando = componentesCliente().filter((arquivo) => {
      const conteudo = readFileSync(arquivo, 'utf8')
      return (
        /from ['"]@\/lib\/repositorio/.test(conteudo) ||
        /from ['"]@\/lib\/motor/.test(conteudo) ||
        /from ['"]@\/dados/.test(conteudo)
      )
    })

    expect(vazando).toEqual([])
  })

  it('a acao de cotacao esta marcada como codigo de servidor', () => {
    const conteudo = readFileSync('app/acoes.ts', 'utf8')
    expect(conteudo.startsWith("'use server'")).toBe(true)
  })

  it('ha componentes cliente sendo verificados', () => {
    // Se a lista ficar vazia, o teste acima passa sem provar nada.
    expect(componentesCliente().length).toBeGreaterThanOrEqual(4)
  })
})
