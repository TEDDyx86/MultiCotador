import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Expor um segredo no bundle e o erro mais facil de cometer em Next.js e o
 * mais dificil de perceber: nada quebra, o site funciona, e o segredo fica
 * publico. Estes testes falham alto quando isso acontece.
 */

function arquivos(raiz: string, extensao: string): string[] {
  const encontrados: string[] = []
  function percorrer(caminho: string) {
    for (const entrada of readdirSync(caminho)) {
      const completo = join(caminho, entrada)
      if (statSync(completo).isDirectory()) percorrer(completo)
      else if (completo.endsWith(extensao)) encontrados.push(completo)
    }
  }
  percorrer(raiz)
  return encontrados
}

describe('segredos nao vazam para o cliente', () => {
  it('nenhuma variavel de segredo usa o prefixo NEXT_PUBLIC_', () => {
    // Uma variavel NEXT_PUBLIC_* e embutida no JavaScript servido ao navegador.
    const fontes = [
      ...arquivos('lib', '.ts'),
      ...arquivos('app', '.tsx'),
      ...arquivos('app', '.ts'),
      'proxy.ts',
      'scripts/gerar-hash.ts',
    ]
    const suspeitos: string[] = []
    for (const arquivo of fontes) {
      const conteudo = readFileSync(arquivo, 'utf8')
      if (/NEXT_PUBLIC_[A-Z_]*(SENHA|SEGREDO|SECRET|TOKEN|HASH)/.test(conteudo)) {
        suspeitos.push(arquivo)
      }
    }
    expect(suspeitos).toEqual([])
  })

  it('o .env.example nao tem valores preenchidos', () => {
    const conteudo = readFileSync('.env.example', 'utf8')
    const preenchidas = conteudo
      .split('\n')
      .filter((linha) => /^[A-Z_]+=.+/.test(linha.trim()))
    expect(preenchidas).toEqual([])
  })

  it('o .gitignore bloqueia os arquivos .env', () => {
    const conteudo = readFileSync('.gitignore', 'utf8')
    expect(conteudo).toMatch(/^\.env$/m)
    expect(conteudo).toMatch(/^\.env\.local$/m)
  })

  it('o segredo so e lido em codigo de servidor', () => {
    // Um arquivo com "use client" que leia o segredo o entregaria ao navegador.
    const clientes = arquivos('app', '.tsx').filter((arquivo) =>
      readFileSync(arquivo, 'utf8').includes("'use client'"),
    )
    const vazando = clientes.filter((arquivo) => {
      const conteudo = readFileSync(arquivo, 'utf8')
      return conteudo.includes('APP_SESSAO_SEGREDO') || conteudo.includes('APP_SENHA_HASH')
    })
    expect(vazando).toEqual([])
  })
})
