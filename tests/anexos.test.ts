import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  MAXIMO_ANEXOS,
  TAMANHO_MAXIMO_ANEXO,
  TAMANHO_MAXIMO_TOTAL,
  formatarTamanho,
  reconhecerTipo,
  sanitizarNomeArquivo,
  validarLoteAnexos,
} from '@/lib/feedback/anexos'

const png = (extra = 0) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(extra).fill(0)])
const jpeg = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const pdf = () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])
const webp = () =>
  new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])

describe('reconhecimento de tipo pelos bytes', () => {
  it('identifica os formatos aceitos', () => {
    expect(reconhecerTipo(png())?.extensao).toBe('png')
    expect(reconhecerTipo(jpeg())?.extensao).toBe('jpg')
    expect(reconhecerTipo(pdf())?.extensao).toBe('pdf')
    expect(reconhecerTipo(webp())?.extensao).toBe('webp')
  })

  /*
   * O motivo de existir esta funcao: o campo `type` do arquivo vem do
   * navegador e e escolhido por quem envia. Um executavel renomeado chega
   * anunciando image/png e passaria por qualquer conferencia que confie nele.
   */
  it('recusa conteudo que nao e nenhum dos formatos, ainda que se anuncie assim', () => {
    const executavel = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]) // "MZ", cabecalho de .exe
    expect(reconhecerTipo(executavel)).toBeNull()
  })

  it('recusa arquivo curto demais para ter assinatura', () => {
    expect(reconhecerTipo(new Uint8Array([0x89, 0x50]))).toBeNull()
    expect(reconhecerTipo(new Uint8Array([]))).toBeNull()
  })

  it('nao confunde RIFF de outro formato com WEBP', () => {
    // RIFF sem "WEBP" no oitavo byte e um .wav, por exemplo.
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x41, 0x56, 0x45])
    expect(reconhecerTipo(wav)).toBeNull()
  })

  it('reconhece o PDF que a propria ferramenta gera', () => {
    // Um caso real, e nao um cabecalho montado a mao.
    const real = new Uint8Array(readFileSync('Comparativo-WholeLife-JohnDaniel.pdf').subarray(0, 16))
    expect(reconhecerTipo(real)?.mime).toBe('application/pdf')
  })
})

describe('nome do arquivo', () => {
  it('mantem um nome comum legivel', () => {
    expect(sanitizarNomeArquivo('captura de tela.png', 'png')).toBe('captura-de-tela.png')
  })

  it('tira acento em vez de trocar por traco', () => {
    expect(sanitizarNomeArquivo('análise cotação.pdf', 'pdf')).toBe('analise-cotacao.pdf')
  })

  /*
   * O caminho no bucket comeca pelo id de quem enviou, e e isso que separa uma
   * pessoa da outra. Um nome que escape da pasta derrubaria essa separacao.
   */
  it('nao deixa o nome escapar da pasta', () => {
    expect(sanitizarNomeArquivo('../../outro/segredo.png', 'png')).toBe('segredo.png')
    expect(sanitizarNomeArquivo('..\\..\\windows\\system.png', 'png')).toBe('system.png')
    expect(sanitizarNomeArquivo('/etc/passwd', 'png')).toBe('passwd.png')
  })

  it('sempre devolve algo utilizavel', () => {
    expect(sanitizarNomeArquivo('', 'png')).toBe('arquivo.png')
    expect(sanitizarNomeArquivo('...', 'png')).toBe('arquivo.png')
    expect(sanitizarNomeArquivo('###', 'png')).toBe('arquivo.png')
  })

  it('usa a extensao do conteudo, e nao a do nome', () => {
    expect(sanitizarNomeArquivo('mentira.exe', 'png')).toBe('mentira.png')
  })

  it('limita o comprimento', () => {
    const nome = sanitizarNomeArquivo('a'.repeat(300) + '.png', 'png')
    expect(nome.length).toBeLessThanOrEqual(64)
  })
})

describe('limites do lote', () => {
  it('aceita um lote comum', () => {
    expect(validarLoteAnexos([100_000, 250_000])).toEqual({ ok: true })
  })

  it('aceita nenhum anexo, que e o caso normal', () => {
    expect(validarLoteAnexos([])).toEqual({ ok: true })
  })

  it('recusa acima da quantidade', () => {
    const r = validarLoteAnexos(Array(MAXIMO_ANEXOS + 1).fill(1000))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.motivo).toMatch(/no máximo/i)
  })

  it('recusa arquivo vazio', () => {
    const r = validarLoteAnexos([0])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.motivo).toMatch(/vazio/i)
  })

  it('recusa arquivo acima do limite individual', () => {
    expect(validarLoteAnexos([TAMANHO_MAXIMO_ANEXO]).ok).toBe(true)
    expect(validarLoteAnexos([TAMANHO_MAXIMO_ANEXO + 1]).ok).toBe(false)
  })

  it('recusa o total acima do limite, mesmo com cada um dentro', () => {
    const tres = Array(3).fill(TAMANHO_MAXIMO_ANEXO)
    expect(tres.reduce((a, b) => a + b, 0)).toBeGreaterThan(TAMANHO_MAXIMO_TOTAL)
    const r = validarLoteAnexos(tres)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.motivo).toMatch(/somam/i)
  })
})

describe('tamanho legivel', () => {
  it('escolhe a unidade e usa virgula', () => {
    expect(formatarTamanho(512)).toBe('512 B')
    expect(formatarTamanho(2048)).toBe('2 KB')
    expect(formatarTamanho(4 * 1024 * 1024)).toBe('4,0 MB')
  })
})

/*
 * O SQL e a aplicacao precisam concordar sobre o nome do bucket e da coluna:
 * divergir aqui produz um erro so na hora de anexar, e nao no build.
 */
describe('acordo com o SQL dos anexos', () => {
  const sql = readFileSync('docs/supabase-anexos.sql', 'utf8')

  it('cria o bucket que a aplicacao usa', () => {
    expect(sql).toMatch(/'feedback-anexos'/)
    expect(sql).toMatch(/public\)\s*\n?values \('feedback-anexos', 'feedback-anexos', false\)/)
  })

  it('acrescenta a coluna de anexos na tabela', () => {
    expect(sql).toMatch(/alter table public\.feedbacks/i)
    expect(sql).toMatch(/add column if not exists anexos text\[\]/i)
  })

  it('separa as pastas pelo id de quem enviou', () => {
    expect(sql).toMatch(/\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/)
  })
})
