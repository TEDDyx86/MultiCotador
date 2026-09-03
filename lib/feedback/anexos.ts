/**
 * Regras dos arquivos anexados ao feedback.
 *
 * O tipo e decidido pelos primeiros bytes do arquivo, e nao pelo campo `type`
 * que o navegador manda junto: esse campo e escolhido por quem envia e vale o
 * que vale. Um executavel renomeado para .png chega com `image/png` e passaria
 * por qualquer conferencia baseada nele.
 *
 * Os limites sao pequenos de proposito. O que se espera aqui e uma captura de
 * tela, as vezes o PDF gerado pela propria ferramenta — nao um acervo.
 */

/** Precisa casar com o bucket criado em docs/supabase-anexos.sql. */
export const BUCKET_ANEXOS = 'feedback-anexos'

export const MAXIMO_ANEXOS = 3
export const TAMANHO_MAXIMO_ANEXO = 4 * 1024 * 1024
export const TAMANHO_MAXIMO_TOTAL = 8 * 1024 * 1024

/** Assinaturas dos formatos aceitos, lidas do inicio do arquivo. */
const ASSINATURAS: Array<{ mime: string; extensao: string; bytes: number[]; deslocamento?: number }> = [
  { mime: 'image/png', extensao: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/jpeg', extensao: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'application/pdf', extensao: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  // WEBP: "RIFF" nos primeiros bytes e "WEBP" a partir do oitavo.
  { mime: 'image/webp', extensao: 'webp', bytes: [0x57, 0x45, 0x42, 0x50], deslocamento: 8 },
]

/** Como a lista aparece no seletor de arquivos da tela. */
export const TIPOS_ACEITOS = '.png,.jpg,.jpeg,.webp,.pdf'

export interface TipoReconhecido {
  mime: string
  extensao: string
}

/**
 * Descobre o formato pelo conteudo. Devolve null quando nao reconhece — e a
 * recusa e proposital: aceitar o desconhecido e o que transforma um campo de
 * anexo em porta de entrada.
 */
export function reconhecerTipo(bytes: Uint8Array): TipoReconhecido | null {
  for (const { mime, extensao, bytes: assinatura, deslocamento = 0 } of ASSINATURAS) {
    if (bytes.length < deslocamento + assinatura.length) continue
    if (assinatura.every((b, i) => bytes[deslocamento + i] === b)) {
      return { mime, extensao }
    }
  }
  return null
}

/**
 * Reduz o nome a algo seguro para virar caminho no bucket.
 *
 * Barra e ".." sao o que interessa remover: um nome como "../outro/arquivo.png"
 * escaparia da pasta do usuario, que e justamente o que a regra de acesso do
 * Storage usa para separar uma pessoa da outra.
 */
export function sanitizarNomeArquivo(nome: string, extensao: string): string {
  const base = nome
    .replace(/\\/g, '/')
    .split('/')
    .pop()!
    .replace(/\.[^.]*$/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 60)

  return `${base || 'arquivo'}.${extensao}`
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export type ResultadoAnexos = { ok: true } | { ok: false; motivo: string }

/** Confere quantidade e tamanho antes de qualquer leitura de conteudo. */
export function validarLoteAnexos(tamanhos: number[]): ResultadoAnexos {
  if (tamanhos.length > MAXIMO_ANEXOS) {
    return { ok: false, motivo: `Anexe no máximo ${MAXIMO_ANEXOS} arquivos.` }
  }
  for (const tamanho of tamanhos) {
    if (tamanho === 0) {
      return { ok: false, motivo: 'Um dos arquivos está vazio.' }
    }
    if (tamanho > TAMANHO_MAXIMO_ANEXO) {
      return {
        ok: false,
        motivo: `Cada arquivo deve ter até ${formatarTamanho(TAMANHO_MAXIMO_ANEXO)}.`,
      }
    }
  }
  const total = tamanhos.reduce((soma, t) => soma + t, 0)
  if (total > TAMANHO_MAXIMO_TOTAL) {
    return { ok: false, motivo: `Os anexos somam mais de ${formatarTamanho(TAMANHO_MAXIMO_TOTAL)}.` }
  }
  return { ok: true }
}
