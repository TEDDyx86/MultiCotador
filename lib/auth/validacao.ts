/**
 * Validacao e sanitizacao de entradas para autenticacao.
 *
 * Segue diretrizes OWASP (OWASP ASVS e OWASP Testing Guide):
 * 1. Anti-Enumeration (WSTG-ATHN-02): Mensagens genericas que nao revelam se o email existe.
 * 2. Input Validation (A03:2021 - Injection): Regex estrito de email e limites de tamanho.
 * 3. DoS Prevention: Limite maximo de tamanho de senha (128 caracteres) para evitar
 *    ataques de esgotamento de CPU em algoritmos de derivacao de chave (bcrypt/argon2/scrypt).
 */

export const MENSAGEM_ERRO_LOGIN_GENERICA = 'E-mail ou senha incorretos.'

/** Limite maximo de caracteres para email conforme RFC 5321 (Path length). */
const TAMANHO_MAXIMO_EMAIL = 254

/** Limite minimo e maximo recomendados pela OWASP para senhas. */
export const TAMANHO_MINIMO_SENHA = 8
export const TAMANHO_MAXIMO_SENHA = 128

/**
 * Regex compativel com padrao HTML5 / RFC 5322 simplificado:
 * Exige usuario valido, arroba, dominio com pelo menos um ponto e TLD valido.
 */
const REGEX_EMAIL =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

/**
 * Sanitiza e valida o formato do e-mail.
 * Devolve o e-mail em minusculo e sem espacos externos, ou null se invalido.
 */
export function sanitizarEmail(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const limpo = valor.trim().toLowerCase()

  if (limpo.length === 0 || limpo.length > TAMANHO_MAXIMO_EMAIL) {
    return null
  }

  if (!REGEX_EMAIL.test(limpo)) {
    return null
  }

  return limpo
}

export interface ResultadoValidacaoSenha {
  valido: boolean
  motivo?: string
}

/**
 * Valida os requisitos de seguranca da senha.
 */
export function validarSenha(valor: unknown): ResultadoValidacaoSenha {
  if (typeof valor !== 'string') {
    return { valido: false, motivo: 'Senha deve ser uma cadeia de texto.' }
  }

  if (valor.length < TAMANHO_MINIMO_SENHA) {
    return {
      valido: false,
      motivo: `A senha deve ter no mínimo ${TAMANHO_MINIMO_SENHA} caracteres.`,
    }
  }

  if (valor.length > TAMANHO_MAXIMO_SENHA) {
    return {
      valido: false,
      motivo: `A senha não pode exceder ${TAMANHO_MAXIMO_SENHA} caracteres.`,
    }
  }

  return { valido: true }
}
