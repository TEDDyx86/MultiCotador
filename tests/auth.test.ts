import { describe, it, expect } from 'vitest'
import { gerarHash, verificarSenha } from '@/lib/auth/senha'

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
