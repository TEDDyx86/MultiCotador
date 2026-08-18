/**
 * Sessao em cookie assinado por HMAC-SHA256.
 *
 * Usa Web Crypto (crypto.subtle) em vez de node:crypto porque precisa rodar
 * no middleware, que executa no Edge Runtime. Web Crypto existe nos dois.
 *
 * O cookie nao guarda segredo nenhum — so a data de expiracao e a assinatura.
 * Nao ha o que extrair dele; adulterar invalida a assinatura.
 */

const codificador = new TextEncoder()

function paraBase64Url(bytes: Uint8Array): string {
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function deBase64Url(texto: string): Uint8Array {
  const base64 = texto.replace(/-/g, '+').replace(/_/g, '/')
  const binario = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binario, (c) => c.charCodeAt(0))
}

async function importarChave(segredo: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    codificador.encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

/** Compara em tempo constante. Sair no primeiro byte diferente vaza informacao. */
function iguaisEmTempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferenca = 0
  for (let i = 0; i < a.length; i++) {
    diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diferenca === 0
}

async function assinar(segredo: string, payload: string): Promise<string> {
  const chave = await importarChave(segredo)
  const assinatura = await crypto.subtle.sign('HMAC', chave, codificador.encode(payload))
  return paraBase64Url(new Uint8Array(assinatura))
}

/** Emite um token valido por `duracaoSegundos`. */
export async function assinarSessao(segredo: string, duracaoSegundos: number): Promise<string> {
  const expiraEm = Math.floor(Date.now() / 1000) + duracaoSegundos
  const payload = paraBase64Url(codificador.encode(JSON.stringify({ exp: expiraEm })))
  return `${payload}.${await assinar(segredo, payload)}`
}

export async function verificarSessao(segredo: string, token: string): Promise<boolean> {
  if (!token) return false
  const partes = token.split('.')
  if (partes.length !== 2) return false

  const [payload, assinaturaRecebida] = partes

  let esperada: string
  try {
    esperada = await assinar(segredo, payload)
  } catch {
    return false
  }
  if (!iguaisEmTempoConstante(assinaturaRecebida, esperada)) return false

  // So le o conteudo depois de confirmar a assinatura: nunca confie em dado
  // que ainda nao foi autenticado.
  try {
    const dados = JSON.parse(new TextDecoder().decode(deBase64Url(payload)))
    return typeof dados.exp === 'number' && dados.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}
