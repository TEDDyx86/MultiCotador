import { randomBytes } from 'node:crypto'
import { sanitizarEmail, validarSenha, TAMANHO_MINIMO_SENHA } from '../lib/auth/validacao'
import { criarClienteAdmin } from '../lib/supabase/admin'
import { carregarEnvLocal } from './carregar-env'

/**
 * Cadastra os avaliadores no Supabase.
 *
 * Uso:
 *   npm run usuario:criar -- ana@blue3.com.br
 *   npm run usuario:criar -- ana@blue3.com.br=SenhaDela123
 *   npm run usuario:criar -- ana@blue3.com.br bruno@blue3.com.br carlos@blue3.com.br
 *
 * Cada argumento e um e-mail, opcionalmente com a senha depois de `=`. Sem
 * senha, o script gera uma e imprime — e a unica vez que ela aparece, entao e
 * essa que vai para a pessoa.
 *
 * A lista inteira e validada antes de qualquer chamada ao Supabase: com dez
 * e-mails e um errado no meio, cadastrar os cinco primeiros e parar deixaria a
 * turma pela metade e sem um estado claro para retomar.
 */

carregarEnvLocal()

interface Entrada {
  email: string
  senha: string
  gerada: boolean
}

/** Senha aleatoria legivel o bastante para ser passada por mensagem. */
function gerarSenha(): string {
  return randomBytes(12).toString('base64url').slice(0, 16)
}

function analisar(argumentos: string[]): { entradas: Entrada[]; erros: string[] } {
  const entradas: Entrada[] = []
  const erros: string[] = []
  const vistos = new Set<string>()

  for (const bruto of argumentos) {
    const separador = bruto.indexOf('=')
    const parteEmail = separador === -1 ? bruto : bruto.slice(0, separador)
    const parteSenha = separador === -1 ? '' : bruto.slice(separador + 1)

    const email = sanitizarEmail(parteEmail)
    if (!email) {
      erros.push(`"${parteEmail}" não é um e-mail válido.`)
      continue
    }
    if (vistos.has(email)) {
      erros.push(`"${email}" aparece mais de uma vez na lista.`)
      continue
    }
    vistos.add(email)

    const gerada = parteSenha.length === 0
    const senha = gerada ? gerarSenha() : parteSenha

    const validacao = validarSenha(senha)
    if (!validacao.valido) {
      erros.push(`${email}: ${validacao.motivo}`)
      continue
    }

    entradas.push({ email, senha, gerada })
  }

  return { entradas, erros }
}

async function executar() {
  const argumentos = process.argv.slice(2)

  if (argumentos.length === 0) {
    console.error('\nUso: npm run usuario:criar -- <email>[=<senha>] [...]')
    console.error('Exemplos:')
    console.error('  npm run usuario:criar -- ana@blue3.com.br')
    console.error('  npm run usuario:criar -- ana@blue3.com.br=SenhaDela123')
    console.error('  npm run usuario:criar -- ana@blue3.com.br bruno@blue3.com.br\n')
    console.error(`Sem senha, o script gera uma (mínimo de ${TAMANHO_MINIMO_SENHA} caracteres).\n`)
    process.exit(1)
  }

  const { entradas, erros } = analisar(argumentos)

  if (erros.length > 0) {
    console.error('\nNada foi cadastrado. Corrija e rode de novo:\n')
    for (const e of erros) console.error(`  • ${e}`)
    console.error('')
    process.exit(1)
  }

  let supabase: ReturnType<typeof criarClienteAdmin>
  try {
    supabase = criarClienteAdmin()
  } catch (erro) {
    console.error(`\n${erro instanceof Error ? erro.message : erro}\n`)
    process.exit(1)
  }

  console.log(`\nCadastrando ${entradas.length} pessoa(s)...\n`)

  const criados: Entrada[] = []
  const falhas: string[] = []

  for (const entrada of entradas) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: entrada.email,
      password: entrada.senha,
      email_confirm: true, // Sem confirmacao por e-mail: o acesso e imediato.
    })

    if (error || !data?.user) {
      falhas.push(`${entrada.email}: ${error?.message ?? 'motivo desconhecido'}`)
      continue
    }
    criados.push(entrada)
  }

  if (criados.length > 0) {
    console.log('Cadastrados:\n')
    for (const c of criados) {
      console.log(`  ${c.email}`)
      console.log(`    senha: ${c.senha}${c.gerada ? '   (gerada agora — anote, não se repete)' : ''}`)
    }
    console.log('')
  }

  if (falhas.length > 0) {
    console.error('Não cadastrados:\n')
    for (const f of falhas) console.error(`  • ${f}`)
    console.error('')
  }

  /*
   * Sucesso parcial tambem e falha: um script que sai com 0 tendo deixado
   * alguem de fora passa despercebido num terminal cheio.
   *
   * `exitCode` e nao `exit()`: o cliente do Supabase ainda tem conexao aberta, e
   * derrubar o processo por cima dela faz o libuv abortar com "Assertion failed"
   * no Windows — um susto no fim de um comando que deu certo.
   */
  process.exitCode = falhas.length > 0 ? 1 : 0
}

executar()
