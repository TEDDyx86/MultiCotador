import { describe, it, expect } from 'vitest'
import {
  sanitizarEmail,
  validarSenha,
  MENSAGEM_ERRO_LOGIN_GENERICA,
  TAMANHO_MINIMO_SENHA,
  TAMANHO_MAXIMO_SENHA,
} from '@/lib/auth/validacao'

describe('OWASP: Sanitizacao e Validacao de E-mail', () => {
  it('normaliza email valido removendo espacos e convertendo para minusculo', () => {
    expect(sanitizarEmail('  Consultor@Blue3.com.br  ')).toBe('consultor@blue3.com.br')
    expect(sanitizarEmail('ROBSON.TAVERNARD@XP.COM.BR')).toBe('robson.tavernard@xp.com.br')
  })

  it('aceita formatos validos de email com caracteres permitidos', () => {
    expect(sanitizarEmail('user+tag@domain.co')).toBe('user+tag@domain.co')
    expect(sanitizarEmail('primeiro.segundo@empresa.com.br')).toBe(
      'primeiro.segundo@empresa.com.br',
    )
  })

  it('rejeita emails malformados', () => {
    expect(sanitizarEmail('sem-arroba')).toBeNull()
    expect(sanitizarEmail('@sem-usuario.com')).toBeNull()
    expect(sanitizarEmail('usuario@')).toBeNull()
    expect(sanitizarEmail('usuario@sem-tld')).toBeNull()
    expect(sanitizarEmail('usuario@.com')).toBeNull()
    expect(sanitizarEmail('usuario com espaco@domain.com')).toBeNull()
  })

  it('rejeita tipos nao-texto ou strings vazias', () => {
    expect(sanitizarEmail('')).toBeNull()
    expect(sanitizarEmail('   ')).toBeNull()
    expect(sanitizarEmail(null)).toBeNull()
    expect(sanitizarEmail(undefined)).toBeNull()
    expect(sanitizarEmail(12345)).toBeNull()
    expect(sanitizarEmail({})).toBeNull()
  })

  it('rejeita emails que excedem o limite de tamanho da RFC 5321 (254 caracteres)', () => {
    const longo = 'a'.repeat(245) + '@domain.com'
    expect(longo.length).toBeGreaterThan(254)
    expect(sanitizarEmail(longo)).toBeNull()
  })
})

describe('OWASP: Validacao de Senha e Mitigacao de DoS', () => {
  it('aceita senhas dentro da faixa segura recomendada (8 a 128 caracteres)', () => {
    expect(validarSenha('SenhaForte123!').valido).toBe(true)
    expect(validarSenha('a'.repeat(TAMANHO_MINIMO_SENHA)).valido).toBe(true)
    expect(validarSenha('a'.repeat(TAMANHO_MAXIMO_SENHA)).valido).toBe(true)
  })

  it('rejeita senhas menores que o minimo da politica (8 caracteres)', () => {
    const res = validarSenha('curta')
    expect(res.valido).toBe(false)
    expect(res.motivo).toMatch(/8 caracteres/)
  })

  it('rejeita senhas com mais de 128 caracteres para evitar DoS por exaustao de CPU', () => {
    const res = validarSenha('a'.repeat(129))
    expect(res.valido).toBe(false)
    expect(res.motivo).toMatch(/128 caracteres/)
  })

  it('rejeita tipos nao-string', () => {
    expect(validarSenha(null).valido).toBe(false)
    expect(validarSenha(undefined).valido).toBe(false)
    expect(validarSenha(12345678).valido).toBe(false)
  })
})

describe('OWASP Anti-Enumeration (WSTG-ATHN-02)', () => {
  it('mantem mensagem generica de erro para credenciais invalidas', () => {
    expect(MENSAGEM_ERRO_LOGIN_GENERICA).toBe('E-mail ou senha incorretos.')
  })
})
