import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

const TAMANHO_SAL = 16
const TAMANHO_CHAVE = 64

/**
 * Deriva o hash de uma senha. Formato: "<sal em hex>:<chave em hex>".
 * scrypt e deliberadamente lento e usa memoria, o que encarece ataque por
 * forca bruta em hardware dedicado.
 * So roda em Node — o Edge Runtime nao tem node:crypto.
 */
export async function gerarHash(senha: string): Promise<string> {
  const sal = randomBytes(TAMANHO_SAL)
  const chave = (await scryptAsync(senha, sal, TAMANHO_CHAVE)) as Buffer
  return `${sal.toString('hex')}:${chave.toString('hex')}`
}

export async function verificarSenha(senha: string, hashArmazenado: string): Promise<boolean> {
  const [salHex, chaveHex] = hashArmazenado.split(':')
  if (!salHex || !chaveHex) return false

  let sal: Buffer
  let chaveEsperada: Buffer
  try {
    sal = Buffer.from(salHex, 'hex')
    chaveEsperada = Buffer.from(chaveHex, 'hex')
  } catch {
    return false
  }
  if (sal.length !== TAMANHO_SAL || chaveEsperada.length !== TAMANHO_CHAVE) return false

  const chave = (await scryptAsync(senha, sal, TAMANHO_CHAVE)) as Buffer
  // Comparacao de tempo constante: com "===" o tempo de resposta revela
  // quantos bytes iniciais estao corretos.
  return timingSafeEqual(chave, chaveEsperada)
}
