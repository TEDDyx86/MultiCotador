import { describe, it, expect, afterEach, vi } from 'vitest'
import { ipDoCliente, segredoObrigatorio } from '@/lib/auth/config'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('segredoObrigatorio', () => {
  it('lanca quando a variavel nao esta configurada', () => {
    vi.stubEnv('APP_SENHA_HASH', '')
    expect(() => segredoObrigatorio('APP_SENHA_HASH')).toThrow(/APP_SENHA_HASH/)
  })

  it('lanca quando APP_SESSAO_SEGREDO nao esta configurado', () => {
    vi.stubEnv('APP_SESSAO_SEGREDO', '')
    expect(() => segredoObrigatorio('APP_SESSAO_SEGREDO')).toThrow(/nao configurada/)
  })

  it('lanca quando APP_SESSAO_SEGREDO tem menos de 32 caracteres', () => {
    // Chave curta e nao vazia e o caso perigoso: assina sem erro, mas e
    // forjavel por forca bruta.
    vi.stubEnv('APP_SESSAO_SEGREDO', 'a'.repeat(31))
    expect(() => segredoObrigatorio('APP_SESSAO_SEGREDO')).toThrow(/32/)
  })

  it('menciona o tamanho recebido e o minimo exigido na mensagem', () => {
    vi.stubEnv('APP_SESSAO_SEGREDO', 'curto')
    expect(() => segredoObrigatorio('APP_SESSAO_SEGREDO')).toThrow(
      /5 caracteres; o minimo e 32/,
    )
  })

  it('aceita um segredo de 64 caracteres', () => {
    const segredo = 'a'.repeat(64)
    vi.stubEnv('APP_SESSAO_SEGREDO', segredo)
    expect(segredoObrigatorio('APP_SESSAO_SEGREDO')).toBe(segredo)
  })

  it('nao exige tamanho minimo de APP_SENHA_HASH', () => {
    // O hash tem formato proprio, validado por verificarSenha; o minimo de 32
    // e regra da chave HMAC, nao do hash.
    vi.stubEnv('APP_SENHA_HASH', 'abc')
    expect(segredoObrigatorio('APP_SENHA_HASH')).toBe('abc')
  })
})

function requisicaoCom(headers: Record<string, string>): Request {
  return new Request('https://exemplo.test/api/login', { method: 'POST', headers })
}

describe('ipDoCliente', () => {
  it('prefere x-real-ip quando os dois headers estao presentes', () => {
    // x-forwarded-for pode vir do cliente; x-real-ip vem da borda da Vercel.
    const requisicao = requisicaoCom({
      'x-real-ip': '203.0.113.7',
      'x-forwarded-for': '198.51.100.1, 203.0.113.7',
    })
    expect(ipDoCliente(requisicao)).toBe('203.0.113.7')
  })

  it('usa o primeiro valor de x-forwarded-for quando so ele existe', () => {
    const requisicao = requisicaoCom({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' })
    expect(ipDoCliente(requisicao)).toBe('198.51.100.1')
  })

  it('remove espacos ao redor do valor', () => {
    expect(ipDoCliente(requisicaoCom({ 'x-real-ip': '  203.0.113.7  ' }))).toBe('203.0.113.7')
  })

  it('devolve "desconhecido" sem headers', () => {
    // Um balde unico para quem nao tem IP identificavel e mais seguro que
    // liberar: no pior caso o limite fica mais restritivo.
    expect(ipDoCliente(requisicaoCom({}))).toBe('desconhecido')
  })
})
