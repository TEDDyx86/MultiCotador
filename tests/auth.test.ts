import { describe, it, expect } from 'vitest'
import { gerarHash, verificarSenha } from '@/lib/auth/senha'
import { assinarSessao, verificarSessao } from '@/lib/auth/sessao'

describe('hash de senha', () => {
  it('aceita a senha correta', async () => {
    const hash = await gerarHash('senha-de-teste')
    expect(await verificarSenha('senha-de-teste', hash)).toBe(true)
  })

  it('rejeita a senha errada', async () => {
    const hash = await gerarHash('senha-de-teste')
    expect(await verificarSenha('senha-errada', hash)).toBe(false)
  })

  it('gera hashes diferentes para a mesma senha', async () => {
    // Sal aleatorio: dois hashes iguais denunciariam senhas iguais.
    const a = await gerarHash('mesma-senha')
    const b = await gerarHash('mesma-senha')
    expect(a).not.toBe(b)
  })

  it('nao contem a senha em claro', async () => {
    const hash = await gerarHash('abracadabra')
    expect(hash).not.toContain('abracadabra')
  })

  it('rejeita hash malformado sem lancar excecao', async () => {
    expect(await verificarSenha('qualquer', 'lixo')).toBe(false)
    expect(await verificarSenha('qualquer', '')).toBe(false)
  })
})

const SEGREDO = 'a'.repeat(64)

describe('cookie de sessao', () => {
  it('aceita um cookie que ele mesmo assinou', async () => {
    const token = await assinarSessao(SEGREDO, 3600)
    expect(await verificarSessao(SEGREDO, token)).toBe(true)
  })

  it('rejeita cookie assinado com outro segredo', async () => {
    const token = await assinarSessao(SEGREDO, 3600)
    expect(await verificarSessao('b'.repeat(64), token)).toBe(false)
  })

  it('rejeita cookie adulterado', async () => {
    const token = await assinarSessao(SEGREDO, 3600)
    const [payload, assinatura] = token.split('.')
    const adulterado = `${payload}x.${assinatura}`
    expect(await verificarSessao(SEGREDO, adulterado)).toBe(false)
  })

  it('rejeita cookie expirado', async () => {
    const token = await assinarSessao(SEGREDO, -1)
    expect(await verificarSessao(SEGREDO, token)).toBe(false)
  })

  it('rejeita lixo sem lancar excecao', async () => {
    expect(await verificarSessao(SEGREDO, 'lixo')).toBe(false)
    expect(await verificarSessao(SEGREDO, '')).toBe(false)
    expect(await verificarSessao(SEGREDO, 'a.b.c')).toBe(false)
  })
})
